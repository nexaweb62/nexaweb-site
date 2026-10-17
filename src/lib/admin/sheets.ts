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
 *
 * ── AUCUN NUMERO DE LIGNE, AUCUNE LETTRE DE COLONNE ─────────────────
 * Premiere version : en-tetes en ligne 7, colonnes lues de A a Q. La
 * feuille reelle a ses en-tetes en ligne 6 et sa colonne A vide — le
 * tableau de bord affichait 0 prospect sur 16. Une position ecrite en
 * dur est une supposition sur un document que quelqu'un d'autre edite,
 * et elle casse au premier ajout de ligne.
 *
 * On lit donc l'onglet ENTIER, on CHERCHE la ligne qui porte une
 * colonne connue (« ENTREPRISE » pour Prospects), et on prend celle-la
 * pour en-tetes. Chaque colonne est ensuite reperee par son NOM
 * normalise — accents retires, majuscules, ponctuation reduite — et
 * jamais par sa lettre. Deplacer une colonne, en inserer une, ajouter
 * des lignes de titre au-dessus : rien de tout cela ne casse plus.
 *
 * Et si l'onglet existe sans ligne d'en-tetes reconnaissable, on le DIT
 * (ongletsSansEntete). Le defaut de la version precedente n'etait pas
 * seulement de se tromper : c'etait de se tromper EN SILENCE, en
 * affichant un zero qui ressemblait a une feuille vide.
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

/* On demande l'onglet ENTIER, pas une plage : c'est l'API qui dit ou
   commencent les donnees, pas nous. */
const ONGLETS: { titre: string; ancres: string[] }[] = [
  /* « ancres » : les noms de colonne qui identifient la ligne d'en-tetes.
     Il suffit qu'UN d'entre eux soit present — une feuille de travail se
     fait renommer des colonnes, rarement toutes a la fois. */
  { titre: 'Prospects', ancres: ['ENTREPRISE'] },
  { titre: 'Ventes', ancres: ['FACTURE', 'MONTANT HT', 'PRESTATION'] },
  { titre: 'Projets', ancres: ['PROJET'] },
];

/**
 * Le nom d'une colonne, ramene a une forme stable.
 *
 * « PRÉSENCE WEB », « Presence web », « presence_web » designent la meme
 * colonne. On retire les accents, on passe en majuscules, et on reduit
 * toute suite de caracteres non alphanumeriques a une seule espace —
 * ce qui met « montant_ht », « MONTANT HT » et « Montant-HT » sur le
 * meme nom. Une colonne « # » se reduit a rien : elle est ignoree.
 */
export function clefColonne(texte: string | undefined): string {
  return (texte ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

export type Tableau = {
  lignes: Ligne[];
  /** Le libelle d'origine de chaque colonne, pour l'afficher tel qu'ecrit. */
  etiquettes: Record<string, string>;
  /** Vrai si l'onglet contient des valeurs mais aucune ligne d'en-tetes. */
  sansEntete: boolean;
};

const VIDE: Tableau = { lignes: [], etiquettes: {}, sansEntete: false };

/**
 * Trouve la ligne d'en-tetes et lit tout ce qui suit.
 *
 * Les lignes renvoyees par l'API n'ont pas toutes la meme longueur : les
 * cellules vides de fin sont tronquees. On indexe donc par POSITION dans
 * la ligne, et une cellule absente vaut la chaine vide — jamais undefined.
 */
export function tableau(valeurs: string[][] | undefined, ancres: string[]): Tableau {
  if (!valeurs || !valeurs.length) return VIDE;

  const cherchees = new Set(ancres.map(clefColonne));
  const iEntete = valeurs.findIndex(
    rangee => (rangee ?? []).some(cellule => cherchees.has(clefColonne(cellule))),
  );
  if (iEntete < 0) return { lignes: [], etiquettes: {}, sansEntete: true };

  /* Position dans la ligne → nom normalise. Les cellules d'en-tete vides
     (la colonne A de la feuille reelle, par exemple) n'entrent pas dans
     la table : elles n'ont pas de nom, donc rien a designer. */
  const parPosition = new Map<number, string>();
  const etiquettes: Record<string, string> = {};
  valeurs[iEntete].forEach((cellule, i) => {
    const clef = clefColonne(cellule);
    if (!clef) return;
    parPosition.set(i, clef);
    /* Le libelle d'origine, accents compris, pour l'en-tete du tableau. */
    if (!etiquettes[clef]) etiquettes[clef] = (cellule || '').trim();
  });

  const lignes = valeurs.slice(iEntete + 1).map(rangee => {
    const l: Ligne = {};
    for (const [i, clef] of parPosition) l[clef] = (rangee?.[i] ?? '').trim();
    return l;
  });

  return { lignes, etiquettes, sansEntete: false };
}

export type Donnees = {
  prospects: Ligne[];
  ventes: Ligne[];
  projets: Ligne[];
  /** Libelles d'origine des colonnes de Prospects. */
  etiquettes: Record<string, string>;
  /** Onglets absents de la feuille, pour l'afficher honnetement. */
  ongletsManquants: string[];
  /** Onglets presents mais sans ligne d'en-tetes reconnaissable. */
  ongletsSansEntete: string[];
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

  const presents = ONGLETS.filter(o => titres.has(o.titre));
  const ongletsManquants = ONGLETS.filter(o => !titres.has(o.titre)).map(o => o.titre);

  /* 2. Un seul aller-retour pour tous les onglets existants. La plage
        est le NOM de l'onglet : l'API renvoie alors sa zone utilisee,
        et c'est elle qui nous dit ou commencent les donnees. */
  const parOnglet = new Map<string, string[][]>();
  if (presents.length) {
    const p = new URLSearchParams();
    for (const o of presents) p.append('ranges', o.titre);
    p.set('majorDimension', 'ROWS');
    const rVal = await fetch(
      `${SHEETS}/${env.SHEET_ID}/values:batchGet?${p}`, { headers: entetes },
    );
    if (!rVal.ok) throw new Error('Lecture des plages refusee (' + rVal.status + ')');
    const corps = await rVal.json() as { valueRanges?: { values?: string[][] }[] };
    (corps.valueRanges ?? []).forEach((v, i) => {
      parOnglet.set(presents[i].titre, v.values ?? []);
    });
  }

  const lu = new Map<string, Tableau>();
  for (const o of presents) lu.set(o.titre, tableau(parOnglet.get(o.titre), o.ancres));
  const t = (titre: string) => lu.get(titre) ?? VIDE;

  const ongletsSansEntete = presents
    .filter(o => t(o.titre).sansEntete)
    .map(o => o.titre);

  return {
    /* Une ligne sans ENTREPRISE est une separation ou un reste de mise
       en forme, pas un prospect. */
    prospects: t('Prospects').lignes.filter(l => (l['ENTREPRISE'] || '') !== ''),
    ventes: t('Ventes').lignes.filter(l => Object.values(l).some(v => v !== '')),
    projets: t('Projets').lignes.filter(l => (l['CLIENT'] || l['PROJET'] || '') !== ''),
    etiquettes: t('Prospects').etiquettes,
    ongletsManquants,
    ongletsSansEntete,
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
