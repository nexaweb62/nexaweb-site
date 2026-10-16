/**
 * CONNEXION GOOGLE — flux « authorization code » avec PKCE.
 *
 * Un client OAuth DEDIE a l'admin, distinct de celui que Supabase
 * utilise pour le site public. L'isolement est voulu : une faille dans
 * l'authentification du site, ou une RLS mal posee, ne peut pas ouvrir
 * le tableau de bord. Les deux systemes ne partagent rien.
 *
 * Le secret client ne quitte jamais le serveur, et le code recu dans
 * l'URL de retour est echange de serveur a serveur. Le navigateur ne
 * voit jamais de jeton Google.
 */

import { alea } from './session';

const AUTORISATION = 'https://accounts.google.com/o/oauth2/v2/auth';
const JETON = 'https://oauth2.googleapis.com/token';
const CERTIFICATS = 'https://www.googleapis.com/oauth2/v3/certs';
const EMETTEURS = ['accounts.google.com', 'https://accounts.google.com'];

const encodeur = new TextEncoder();

function versB64url(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** L'adresse de retour, deduite de la requete. Elle doit correspondre au
 *  centime pres a celle declaree dans la console Google. */
export function adresseRetour(url: URL): string {
  return `${url.origin}/admin/callback`;
}

export async function departAutorisation(clientId: string, retour: string) {
  const etat = alea();
  const verifieur = alea(48);
  /* PKCE : on n'envoie que l'empreinte du verifieur a Google, et le
     verifieur lui-meme au moment de l'echange. Un code intercepte dans
     l'URL de retour ne sert donc a rien sans le cookie. */
  const empreinte = versB64url(new Uint8Array(
    await crypto.subtle.digest('SHA-256', encodeur.encode(verifieur)),
  ));

  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: retour,
    response_type: 'code',
    scope: 'openid email',
    state: etat,
    code_challenge: empreinte,
    code_challenge_method: 'S256',
    /* On ne demande jamais de jeton de rafraichissement : la session de
       l'admin dure huit heures, et c'est tout ce dont on a besoin. */
    access_type: 'online',
    /* Le compte precedent n'est pas repris en silence : sur un poste
       partage, on doit pouvoir choisir. */
    prompt: 'select_account',
  });
  return { url: `${AUTORISATION}?${p}`, etat, verifieur };
}

/* ── Verification de l'id_token ──────────────────────────────────── */

type Cles = { cles: JsonWebKey[]; peremption: number };
let cache: Cles | null = null;

async function certificats(): Promise<JsonWebKey[]> {
  if (cache && cache.peremption > Date.now()) return cache.cles;
  const r = await fetch(CERTIFICATS);
  if (!r.ok) throw new Error('certificats Google injoignables');
  const corps = await r.json() as { keys: JsonWebKey[] };
  /* Une heure : Google fait tourner ses cles, un cache eternel finirait
     par rejeter des jetons parfaitement valides. */
  cache = { cles: corps.keys, peremption: Date.now() + 3600_000 };
  return corps.keys;
}

function partiesJwt(jwt: string) {
  const [entete, charge, signature] = jwt.split('.');
  if (!entete || !charge || !signature) throw new Error('id_token malforme');
  const lire = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
  return { entete: lire(entete), charge: lire(charge), signe: `${entete}.${charge}`, signature };
}

/**
 * Rend l'e-mail du jeton, ou leve.
 *
 * Google indique qu'un id_token obtenu par un echange direct de serveur
 * a serveur, en HTTPS, peut etre lu sans verifier sa signature. On la
 * verifie quand meme : c'est une dizaine de lignes, et la seule chose
 * qui se trouve derriere est l'acces a tout le tableau de bord. En cas
 * de doute on ferme, on n'ouvre pas.
 */
export async function emailDuJeton(idToken: string, clientId: string): Promise<string> {
  const { entete, charge, signe, signature } = partiesJwt(idToken);

  const cles = await certificats();
  const jwk = cles.find((k: any) => k.kid === entete.kid);
  if (!jwk) throw new Error('cle de signature inconnue');

  const cle = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  const octets = Uint8Array.from(
    atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0),
  );
  const valide = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', cle, octets as BufferSource, encodeur.encode(signe),
  );
  if (!valide) throw new Error('signature invalide');

  const maintenant = Math.floor(Date.now() / 1000);
  if (!EMETTEURS.includes(charge.iss)) throw new Error('emetteur inattendu');
  if (charge.aud !== clientId) throw new Error('jeton destine a une autre application');
  if (typeof charge.exp !== 'number' || charge.exp <= maintenant) throw new Error('jeton expire');
  /* Un compte dont l'adresse n'est pas verifiee peut porter l'e-mail de
     quelqu'un d'autre. La liste blanche serait alors contournable. */
  if (charge.email_verified !== true) throw new Error('adresse non verifiee');
  if (typeof charge.email !== 'string' || !charge.email) throw new Error('jeton sans e-mail');

  return charge.email;
}

/* ── Echange du code ─────────────────────────────────────────────── */

export async function echangerCode(opts: {
  code: string; verifieur: string; retour: string;
  clientId: string; clientSecret: string;
}): Promise<string> {
  const r = await fetch(JETON, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.retour,
      grant_type: 'authorization_code',
      code_verifier: opts.verifieur,
    }),
  });
  if (!r.ok) {
    /* Le corps d'erreur de Google peut contenir le code d'autorisation.
       On ne le propage pas jusqu'a la page. */
    throw new Error('echange du code refuse par Google');
  }
  const corps = await r.json() as { id_token?: string };
  if (!corps.id_token) throw new Error('reponse sans id_token');
  return corps.id_token;
}
