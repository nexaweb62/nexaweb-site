/**
 * LE LIEN DE CONFIRMATION — la demande voyage DANS le jeton.
 *
 * ── POURQUOI AUCUNE TABLE ───────────────────────────────────────────
 * Un stockage de demandes en attente demanderait une table, une cle de
 * service, une migration, et une tache de menage pour effacer ce qui
 * expire. Le jeton porte la demande lui-meme : il n'y a rien a ranger,
 * rien a nettoyer, et rien a perdre si un service tombe.
 *
 * ── POURQUOI CHIFFRE, ET PAS SEULEMENT SIGNE ────────────────────────
 * Une signature empecherait de modifier la demande, mais pas de la
 * LIRE : le lien contient un nom, un e-mail, un telephone, parfois un
 * SIRET. Ce lien transite par des serveurs de messagerie et finit dans
 * des journaux. On chiffre donc en AES-GCM, qui authentifie en plus de
 * chiffrer : un jeton retouche d'un seul octet est rejete.
 *
 * ── CE QUE CE CHOIX NE FAIT PAS ─────────────────────────────────────
 * Sans stockage, rien ne retient qu'un jeton a deja servi : cliquer
 * deux fois sur le lien envoie deux notifications. C'est le prix assume
 * de l'absence de table, et c'est sans gravite — seul le destinataire
 * du courriel detient le lien, et il n'a aucune raison d'en abuser.
 */

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();

/** Vingt-quatre heures, comme annonce dans le courriel. */
export const DUREE_JETON = 24 * 60 * 60;

export type Demande = {
  prenom: string; nom: string; email: string;
  telephone: string; entreprise: string; siret: string;
  formule: string; type_site: string; delai_souhaite: string;
  budget_estime: string; paiement: string;
  description: string; site_existant: string;
  /** Nom officiel et activite, releves aupres de l'annuaire de l'Etat. */
  ent_nom: string; ent_activite: string; ent_commune: string;
  /** Expiration, en secondes depuis l'epoque. */
  exp: number;
};

function versB64url(o: Uint8Array): string {
  let b = '';
  for (const x of o) b += String.fromCharCode(x);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisB64url(t: string): Uint8Array {
  const rempli = t.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (t.length % 4)) % 4);
  const b = atob(rempli);
  const o = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
  return o;
}

/**
 * La cle AES, derivee du secret.
 *
 * AES-GCM exige exactement 128, 192 ou 256 bits. Un secret saisi a la
 * main n'a aucune de ces longueurs : on le passe donc par SHA-256, qui
 * en rend toujours 256.
 */
async function cle(secret: string): Promise<CryptoKey> {
  const brut = await crypto.subtle.digest('SHA-256', encodeur.encode(secret));
  return crypto.subtle.importKey('raw', brut, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function fabriquerJeton(d: Omit<Demande, 'exp'>, secret: string): Promise<string> {
  const charge: Demande = { ...d, exp: Math.floor(Date.now() / 1000) + DUREE_JETON };
  /* Un vecteur d'initialisation neuf a chaque fois. Le reutiliser avec
     la meme cle casse entierement GCM — ce n'est pas une precaution de
     style, c'est la condition de sa securite. */
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, await cle(secret),
    encodeur.encode(JSON.stringify(charge)),
  );
  const tout = new Uint8Array(iv.length + chiffre.byteLength);
  tout.set(iv, 0);
  tout.set(new Uint8Array(chiffre), iv.length);
  return versB64url(tout);
}

export type LectureJeton =
  | { etat: 'ok'; demande: Demande }
  | { etat: 'expire' }
  | { etat: 'invalide' };

export async function lireJeton(jeton: string | undefined, secret: string): Promise<LectureJeton> {
  if (!jeton) return { etat: 'invalide' };
  let clair: string;
  try {
    const tout = depuisB64url(jeton);
    if (tout.length < 13) return { etat: 'invalide' };
    const iv = tout.slice(0, 12);
    const chiffre = tout.slice(12);
    const ouvert = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, await cle(secret), chiffre as BufferSource,
    );
    clair = decodeur.decode(ouvert);
  } catch {
    /* Signature fausse, cle differente, jeton tronque : indistinguables
       et sans importance — dans les trois cas, on n'ouvre pas. */
    return { etat: 'invalide' };
  }

  let d: Demande;
  try { d = JSON.parse(clair); } catch { return { etat: 'invalide' }; }
  if (!d || typeof d.exp !== 'number' || !d.email) return { etat: 'invalide' };
  if (d.exp <= Math.floor(Date.now() / 1000)) return { etat: 'expire' };
  return { etat: 'ok', demande: d };
}
