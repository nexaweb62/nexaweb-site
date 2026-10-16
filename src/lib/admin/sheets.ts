/**
 * LECTURE DE LA FEUILLE — compte de service, en lecture seule.
 *
 * ── POURQUOI PAS « googleapis » ─────────────────────────────────────
 * Le paquet officiel s'appuie sur des modules Node (crypto, fs, http)
 * qui n'existent pas dans un Worker. On signe donc le jeton a la main
 * avec WebCrypto : une cinquantaine de lignes, aucune dependance, et
 * rien a mettre a jour.
 *
 * ── LA FEUILLE RESTE PRIVEE ─────────────────────────────────────────
 * Elle n'est jamais publiee. Elle est partagee en LECTURE avec l'adresse
 * du compte de service, et le jeton demande le scope
 * « spreadsheets.readonly » : meme si la cle fuyait, elle ne pourrait
 * rien ecrire.
 *
 * ── LES DEUX ONGLETS QUI N'EXISTENT PAS ENCORE ──────────────────────
 * « Ventes » et « Projets » sont a creer. Demander une plage sur un
 * onglet absent fait repondre 400 a l'API, et un batchGet entier echoue
 * pour un seul mauvais nom. On demande donc d'abord la LISTE des
 * onglets, et on ne lit que ceux qui existent : un onglet manquant
 * donne un tableau vide, jamais une erreur.
 */

const TOKEN = 'https://oauth2.googleapis.com/token';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

const encodeur = new TextEncoder();

function versB64url(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const texteB64url = (t: string) => versB64url(encodeur.encode(t));

/* ── La cle privee ───────────────────────────────────────────────── */

/**
 * Une cle PEM vers une cle WebCrypto.
 *
 * Les variables d'environnement passent mal les sauts de ligne : selon
 * l'interface par laquelle on les saisit, la cle arrive avec de vrais
 * retours a la ligne, avec des « \n » litteraux, ou entouree de
 * guillemets. Les trois cas sont normalises ici — sans quoi l'import
 * echoue avec un message qui ne dit rien de la cause.
 */
async function clePrivee(pem: string): Promise<CryptoKey> {
  const propre = pem
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const octets = Uint8Array.from(atob(propre), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8', octets as BufferSource,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
}

/* ── Le jeton d'acces ────────────────────────────────────────────── */

let jetonCache: { valeur: string; peremption: number } | null = null;

async function jetonAcces(email: string, pem: string): Promise<string> {
  if (jetonCache && jetonCache.peremption > Date.now()) return jetonCache.valeur;

  const maintenant = Math.floor(Date.now() / 1000);
  const entete = texteB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const charge = texteB64url(JSON.stringify({
    iss: email, scope: SCOPE, aud: TOKEN,
    iat: maintenant, exp: maintenant + 3600,
  }));
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', await clePrivee(pem), encodeur.encode(`${entete}.${charge}`),
  );
  const assertion = `${entete}.${charge}.${versB64url(new Uint8Array(signature))}`;

  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!r.ok) throw new Error('jeton du compte de service refuse (' + r.status + ')');
  const corps = await r.json() as { access_token: string; expires_in: number };
  /* Une minute de marge : un jeton qui expire pendant l'appel suivant
     couterait une erreur 401 visible a l'ecran. */
  jetonCache = {
    valeur: corps.access_token,
    peremption: Date.now() + (corps.expires_in - 60) * 1000,
  };
  return corps.access_token;
}

/* ── Lecture ─────────────────────────────────────────────────────── */

export type Ligne = Record<string, string>;

/** Les en-tetes de « Prospects » vivent en ligne 7, pas en ligne 1. */
const PLAGE_PROSPECTS = 'Prospects!A7:Q';
const PLAGE_VENTES = 'Ventes!A1:F';
const PLAGE_PROJETS = 'Projets!A1:F';

function enLignes(valeurs: string[][] | undefined): Ligne[] {
  if (!valeurs || valeurs.length < 2) return [];
  const entetes = valeurs[0].map(e => (e || '').trim());
  return valeurs.slice(1).map(rangee => {
    const l: Ligne = {};
    entetes.forEach((e, i) => { if (e) l[e] = (rangee[i] ?? '').trim(); });
    return l;
  });
}

export type Donnees = {
  prospects: Ligne[];
  ventes: Ligne[];
  projets: Ligne[];
  /** Onglets absents de la feuille, pour l'afficher honnetement. */
  ongletsManquants: string[];
  majLe: string;
};

async function lireFeuille(env: {
  GOOGLE_SA_EMAIL: string; GOOGLE_SA_PRIVATE_KEY: string; SHEET_ID: string;
}): Promise<Donnees> {
  const jeton = await jetonAcces(env.GOOGLE_SA_EMAIL, env.GOOGLE_SA_PRIVATE_KEY);
  const entetes = { authorization: `Bearer ${jeton}` };

  /* 1. Quels onglets existent ? « fields » limite la reponse aux seuls
        titres : inutile de rapatrier toute la structure du classeur. */
  const rMeta = await fetch(
    `${SHEETS}/${env.SHEET_ID}?fields=sheets.properties.title`, { headers: entetes },
  );
  if (!rMeta.ok) {
    if (rMeta.status === 403) {
      throw new Error('La feuille n\'est pas partagee avec le compte de service.');
    }
    if (rMeta.status === 404) throw new Error('Feuille introuvable : verifiez SHEET_ID.');
    throw new Error('Lecture de la feuille refusee (' + rMeta.status + ')');
  }
  const meta = await rMeta.json() as { sheets?: { properties?: { title?: string } }[] };
  const titres = new Set((meta.sheets ?? []).map(s => s.properties?.title).filter(Boolean) as string[]);

  const voulus: [string, string][] = [
    ['Prospects', PLAGE_PROSPECTS], ['Ventes', PLAGE_VENTES], ['Projets', PLAGE_PROJETS],
  ];
  const presents = voulus.filter(([titre]) => titres.has(titre));
  const ongletsManquants = voulus.filter(([titre]) => !titres.has(titre)).map(([t]) => t);

  /* 2. Un seul aller-retour pour toutes les plages existantes. */
  let parPlage = new Map<string, string[][]>();
  if (presents.length) {
    const p = new URLSearchParams();
    for (const [, plage] of presents) p.append('ranges', plage);
    p.set('majorDimension', 'ROWS');
    const rVal = await fetch(
      `${SHEETS}/${env.SHEET_ID}/values:batchGet?${p}`, { headers: entetes },
    );
    if (!rVal.ok) throw new Error('Lecture des plages refusee (' + rVal.status + ')');
    const corps = await rVal.json() as { valueRanges?: { values?: string[][] }[] };
    (corps.valueRanges ?? []).forEach((v, i) => {
      parPlage.set(presents[i][0], v.values ?? []);
    });
  }

  const prospects = enLignes(parPlage.get('Prospects'))
    /* Une ligne sans ENTREPRISE est une ligne de remplissage ou une
       separation : elle n'est pas un prospect. */
    .filter(l => (l['ENTREPRISE'] || '').trim() !== '');

  return {
    prospects,
    ventes: enLignes(parPlage.get('Ventes')),
    projets: enLignes(parPlage.get('Projets')),
    ongletsManquants,
    majLe: new Date().toISOString(),
  };
}

/* ── Cache serveur ───────────────────────────────────────────────── */

const DUREE_CACHE = 45_000;
let cache: { donnees: Donnees; peremption: number } | null = null;
/* Deux onglets ouverts qui se rafraichissent en meme temps ne doivent
   pas declencher deux lectures : la seconde attend la premiere. */
let enVol: Promise<Donnees> | null = null;

export async function donnees(env: {
  GOOGLE_SA_EMAIL?: string; GOOGLE_SA_PRIVATE_KEY?: string; SHEET_ID?: string;
}, forcer = false): Promise<Donnees> {
  if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY || !env.SHEET_ID) {
    throw new Error('Configuration incomplete : GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY ou SHEET_ID manque.');
  }
  if (!forcer && cache && cache.peremption > Date.now()) return cache.donnees;
  if (enVol) return enVol;

  enVol = lireFeuille(env as Required<typeof env>)
    .then(d => { cache = { donnees: d, peremption: Date.now() + DUREE_CACHE }; return d; })
    .finally(() => { enVol = null; });
  return enVol;
}
