/**
 * LA SESSION DE L'ADMIN — un cookie signe, rien d'autre.
 *
 * Pas de table, pas de store : le cookie PORTE l'e-mail et sa date
 * d'expiration, et une signature HMAC-SHA256 empeche de le fabriquer.
 * A chaque requete le serveur verifie la signature, la date, PUIS la
 * liste blanche. Ce dernier point n'est pas decoratif : retirer un
 * e-mail de ADMIN_EMAILS revoque l'acces a la requete suivante, sans
 * attendre l'expiration du cookie.
 *
 * ── POURQUOI « __Host- » ────────────────────────────────────────────
 * Ce prefixe est refuse par le navigateur si le cookie n'est pas en
 * Secure, s'il porte un Domain, ou si son Path n'est pas « / ». Il rend
 * donc impossible qu'un sous-domaine — ou un site en clair partageant
 * le domaine — pose un cookie qui serait pris pour le notre.
 *
 * ── POURQUOI SameSite=Lax ET NON Strict ─────────────────────────────
 * Le retour de Google vers /admin/callback est une navigation venue d'un
 * autre site. En Strict, le cookie d'etat ne serait pas envoye et la
 * connexion echouerait a tous les coups. Lax envoie le cookie sur une
 * navigation de premier niveau en GET, ce qui est exactement ce cas, et
 * le retient sur les requetes croisees de type POST ou sous-ressource.
 */

const encodeur = new TextEncoder();

/** Nom du cookie de session. Voir « __Host- » ci-dessus. */
export const COOKIE_SESSION = '__Host-nw_admin';
/** Nom du cookie qui transporte l'etat OAuth entre le depart et le retour. */
export const COOKIE_OAUTH = '__Host-nw_oauth';

/** Duree de vie d'une session, en secondes. Huit heures : une journee de
 *  travail, pas davantage. */
export const DUREE_SESSION = 8 * 60 * 60;

/* ── Base64 URL, sans dependance ─────────────────────────────────── */

function versB64url(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisB64url(texte: string): Uint8Array {
  const rempli = texte.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (texte.length % 4)) % 4);
  const binaire = atob(rempli);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return octets;
}

export function b64url(texte: string): string {
  return versB64url(encodeur.encode(texte));
}

/** Une valeur aleatoire imprevisible, pour l'etat OAuth et le verifieur. */
export function alea(octets = 32): string {
  return versB64url(crypto.getRandomValues(new Uint8Array(octets)));
}

/* ── Signature ───────────────────────────────────────────────────── */

async function cleHmac(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', encodeur.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

type Charge = { e: string; exp: number };

export async function signerSession(email: string, secret: string): Promise<string> {
  const charge: Charge = {
    e: email,
    exp: Math.floor(Date.now() / 1000) + DUREE_SESSION,
  };
  const corps = b64url(JSON.stringify(charge));
  const signature = await crypto.subtle.sign(
    'HMAC', await cleHmac(secret), encodeur.encode(corps),
  );
  return corps + '.' + versB64url(new Uint8Array(signature));
}

/**
 * Rend l'e-mail porte par un jeton valide, ou null.
 *
 * La comparaison de signature passe par crypto.subtle.verify et non par
 * un « === » sur deux chaines : une comparaison naive s'arrete au
 * premier octet qui differe, et le temps qu'elle met renseigne sur le
 * nombre d'octets corrects. C'est exactement ce qui permet de
 * reconstituer une signature octet par octet.
 */
export async function lireSession(jeton: string, secret: string): Promise<string | null> {
  const coupe = jeton.lastIndexOf('.');
  if (coupe <= 0) return null;
  const corps = jeton.slice(0, coupe);
  let signature: Uint8Array;
  try { signature = depuisB64url(jeton.slice(coupe + 1)); } catch { return null; }

  let valide = false;
  try {
    valide = await crypto.subtle.verify(
      'HMAC', await cleHmac(secret), signature as BufferSource, encodeur.encode(corps),
    );
  } catch { return null; }
  if (!valide) return null;

  let charge: Charge;
  try {
    charge = JSON.parse(new TextDecoder().decode(depuisB64url(corps)));
  } catch { return null; }

  if (typeof charge?.e !== 'string' || typeof charge?.exp !== 'number') return null;
  if (charge.exp <= Math.floor(Date.now() / 1000)) return null;
  return charge.e;
}

/* ── Liste blanche ───────────────────────────────────────────────── */

/**
 * LA SEULE SOURCE DE VERITE DE QUI PEUT ENTRER.
 *
 * Elle est relue a CHAQUE requete, jamais mise en cache dans un module :
 * une liste figee au demarrage de l'isolat survivrait a la modification
 * de la variable, et un compte retire garderait l'acces.
 */
export function listeBlanche(brut: string | undefined): string[] {
  if (!brut) return [];
  return brut.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export function estAutorise(email: string | null | undefined, brut: string | undefined): boolean {
  if (!email) return false;
  const liste = listeBlanche(brut);
  /* Une liste vide n'autorise PERSONNE. Si la variable manque en
     production, le tableau de bord se ferme — il ne s'ouvre pas. */
  if (liste.length === 0) return false;
  return liste.includes(email.trim().toLowerCase());
}

/* ── Fabrication des en-tetes ────────────────────────────────────── */

export function poserCookie(nom: string, valeur: string, maxAge: number): string {
  return `${nom}=${valeur}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function effacerCookie(nom: string): string {
  return `${nom}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
