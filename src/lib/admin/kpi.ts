/**
 * LES INDICATEURS — tout le calcul metier vit ici, et nulle part ailleurs.
 *
 * Le navigateur ne recoit que des nombres deja calcules. Deux raisons :
 * une regle de comptage ne doit exister qu'a un seul endroit, et un
 * calcul fait au serveur ne peut pas etre fausse depuis la console.
 *
 * ── LES STATUTS SONT DU TEXTE LIBRE ─────────────────────────────────
 * La colonne STATUT est remplie a la main. « Signé », « SIGNE »,
 * « Signé le 12/03 » designent la meme chose. On normalise donc —
 * accents retires, majuscules, espaces reduits — et on cherche par
 * INCLUSION, pas par egalite. « Refusé » doit compter comme un refus,
 * « Devis envoyé » comme un devis.
 *
 * ── LA CASE VIDE ────────────────────────────────────────────────────
 * Un statut vide vaut « À appeler » : il compte dans les prospects
 * ACTIFS, mais pas dans les CONTACTES. Pris a la lettre, « different de
 * À appeler » aurait fait entrer toutes les cases vides dans le compteur
 * des contactes et annonce des appels qui n'ont jamais eu lieu.
 */

import type { Ligne } from './sheets';

/* ── Normalisation ───────────────────────────────────────────────── */

export function normaliser(texte: string | undefined): string {
  return (texte ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

/* Les clefs de colonne sont deja normalisees par sheets.ts, qui repere
   chaque colonne par son nom et non par sa lettre. On les lit donc
   telles quelles : « PRESENCE WEB », « MONTANT HT », « ANGLE D APPROCHE ».
   Une seule normalisation, a un seul endroit. */

const contient = (statut: string, ...mots: string[]) => mots.some(m => statut.includes(m));

/* ── Classement d'un statut ──────────────────────────────────────── */

export type Classe = 'a-appeler' | 'en-cours' | 'rdv' | 'signe' | 'perdu';

export function classer(statutBrut: string | undefined): Classe {
  const s = normaliser(statutBrut);
  if (contient(s, 'ECARTE', 'REFUS', 'PERDU')) return 'perdu';
  if (contient(s, 'SIGNE', 'GAGNE')) return 'signe';
  if (contient(s, 'RDV', 'DEVIS')) return 'rdv';
  if (s === '' || contient(s, 'A APPELER')) return 'a-appeler';
  return 'en-cours';
}

export const estActif = (s: string | undefined) => classer(s) !== 'perdu';
export const estContacte = (s: string | undefined) => {
  const c = classer(s);
  return c !== 'perdu' && c !== 'a-appeler';
};
export const estRdv = (s: string | undefined) => {
  const n = normaliser(s);
  return contient(n, 'RDV', 'DEVIS', 'SIGNE');
};
export const estSigne = (s: string | undefined) => contient(normaliser(s), 'SIGNE', 'GAGNE');

/* ── Montants et dates ───────────────────────────────────────────── */

/**
 * « 1 200,50 € », « 1200.5 », « 1 200 € » — tout cela vaut 1200,5.
 * Les espaces insecables (U+00A0) et fins (U+202F) viennent de la mise
 * en forme automatique des feuilles : les oublier donne NaN.
 */
export function montant(brut: string | undefined): number {
  if (!brut) return 0;
  const propre = brut
    .replace(/[\s  ]/g, '')
    .replace(/[€$£]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  const n = parseFloat(propre);
  return Number.isFinite(n) ? n : 0;
}

/** Rend « AAAA-MM » ou null. Accepte 15/03/2026, 2026-03-15, 15-03-2026. */
export function mois(brut: string | undefined): string | null {
  const t = (brut ?? '').trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}`;
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

/** Pour trier des echeances : une date comparable, ou null si illisible. */
export function horodatage(brut: string | undefined): number | null {
  const t = (brut ?? '').trim();
  if (!t) return null;
  let m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.getTime();
}

/* ── Le tableau de bord ──────────────────────────────────────────── */

export type Jauge = { cle: string; titre: string; valeur: number; objectif: number };
export type ProjetAffiche = {
  client: string; projet: string; statut: string; assigne: string;
  echeance: string; montant: number; livre: boolean;
};

export type ParAssocie = {
  nom: string; actifs: number; contactes: number; rdv: number; signes: number;
};

export type Tableau = {
  resume: string;
  jauges: Jauge[];
  repartition: { classe: Classe; libelle: string; nombre: number }[];
  associes: ParAssocie[];
  pipeline: Ligne[];
  colonnes: string[];
  ca: {
    encaisse: number; duMois: number; enAttente: number; nombre: number;
    parMois: { mois: string; total: number }[];
  };
  projets: {
    enCours: number; livres: number; montantEnCours: number;
    /* Chaque projet arrive PRET A AFFICHER : le montant deja converti en
       nombre, l'etat deja decide. Le navigateur n'a plus a interpreter
       « 1 490 € » ni a deviner ce que « Livré » veut dire — c'etait une
       deuxieme implementation de la meme regle, et les deux avaient
       deja diverge une fois. Une regle, un proprietaire. */
    lignes: ProjetAffiche[];
  };
  ongletsManquants: string[];
  ongletsSansEntete: string[];
  /** Libelles d'origine des colonnes, pour les en-tetes du tableau. */
  etiquettes: Record<string, string>;
  majLe: string;
};

const LIBELLES: Record<Classe, string> = {
  'a-appeler': 'À appeler',
  'en-cours': 'En cours',
  'rdv': 'RDV / Devis',
  'signe': 'Signé',
  'perdu': 'Écarté / Perdu',
};

/** Les colonnes du pipeline, dans l'ordre d'affichage demande. */
const COLONNES = [
  'ENTREPRISE', 'SECTEUR', 'PRESENCE WEB', 'PRIORITE',
  'ASSIGNE', 'JOUR', 'STATUT', 'RELANCE',
];

export function construire(src: {
  prospects: Ligne[]; ventes: Ligne[]; projets: Ligne[];
  etiquettes?: Record<string, string>;
  ongletsManquants: string[]; ongletsSansEntete?: string[]; majLe: string;
}): Tableau {
  const p = src.prospects;

  const actifs = p.filter(l => estActif(l['STATUT'])).length;
  const contactes = p.filter(l => estContacte(l['STATUT'])).length;
  const rdv = p.filter(l => estRdv(l['STATUT'])).length;
  const signes = p.filter(l => estSigne(l['STATUT'])).length;

  /* ── Repartition ── */
  const compte = new Map<Classe, number>();
  for (const l of p) {
    const c = classer(l['STATUT']);
    compte.set(c, (compte.get(c) ?? 0) + 1);
  }
  const ordre: Classe[] = ['a-appeler', 'en-cours', 'rdv', 'signe', 'perdu'];
  const repartition = ordre
    .map(c => ({ classe: c, libelle: LIBELLES[c], nombre: compte.get(c) ?? 0 }))
    .filter(r => r.nombre > 0);

  /* ── Par associe ── */
  const parNom = new Map<string, ParAssocie>();
  for (const l of p) {
    const nom = (l['ASSIGNE'] || '').trim() || 'Non assigné';
    const a = parNom.get(nom) ?? { nom, actifs: 0, contactes: 0, rdv: 0, signes: 0 };
    if (estActif(l['STATUT'])) a.actifs++;
    if (estContacte(l['STATUT'])) a.contactes++;
    if (estRdv(l['STATUT'])) a.rdv++;
    if (estSigne(l['STATUT'])) a.signes++;
    parNom.set(nom, a);
  }
  const associes = [...parNom.values()].sort((x, y) => y.actifs - x.actifs);

  /* ── Chiffre d'affaires ── */
  const v = src.ventes;
  const paye = (l: Ligne) => normaliser(l['STATUT']).includes('PAYE');
  const moisCourant = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const sommeMois = new Map<string, number>();
  for (const l of v) {
    if (!paye(l)) continue;
    const m = mois(l['DATE']);
    if (!m) continue;
    sommeMois.set(m, (sommeMois.get(m) ?? 0) + montant(l['MONTANT HT']));
  }

  const ca = {
    encaisse: v.filter(paye).reduce((s, l) => s + montant(l['MONTANT HT']), 0),
    duMois: v.filter(l => paye(l) && mois(l['DATE']) === moisCourant)
      .reduce((s, l) => s + montant(l['MONTANT HT']), 0),
    enAttente: v.filter(l => !paye(l)).reduce((s, l) => s + montant(l['MONTANT HT']), 0),
    nombre: v.length,
    parMois: [...sommeMois.entries()]
      .map(([m, total]) => ({ mois: m, total }))
      .sort((a, b) => a.mois.localeCompare(b.mois)),
  };

  /* ── Projets ── */
  const pr = src.projets;
  const livre = (l: Ligne) => {
    const s = normaliser(l['STATUT']);
    return contient(s, 'LIVRE', 'TERMINE', 'FINI', 'EN LIGNE');
  };
  const projets = {
    enCours: pr.filter(l => !livre(l)).length,
    livres: pr.filter(livre).length,
    montantEnCours: pr.filter(l => !livre(l)).reduce((s, l) => s + montant(l['MONTANT HT']), 0),
    lignes: [...pr]
      .sort((a, b) => {
        /* Une echeance illisible ou absente part en fin de liste : elle
           ne doit pas se glisser en tete comme si elle etait imminente. */
        const x = horodatage(a['ECHEANCE']), y = horodatage(b['ECHEANCE']);
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return x - y;
      })
      .map((l): ProjetAffiche => ({
        client: l['CLIENT'] ?? '',
        projet: l['PROJET'] ?? '',
        statut: l['STATUT'] ?? '',
        assigne: l['ASSIGNE'] ?? '',
        echeance: l['ECHEANCE'] ?? '',
        montant: montant(l['MONTANT HT']),
        livre: livre(l),
      })),
  };

  return {
    resume: resumer({ actifs, contactes, rdv, signes }),
    jauges: [
      { cle: 'actifs', titre: 'Prospects actifs', valeur: actifs, objectif: 40 },
      { cle: 'contactes', titre: 'Contactés', valeur: contactes, objectif: 30 },
      { cle: 'rdv', titre: 'RDV obtenus', valeur: rdv, objectif: 5 },
      { cle: 'signes', titre: 'Clients signés', valeur: signes, objectif: 1 },
    ],
    repartition,
    associes,
    pipeline: p,
    colonnes: COLONNES,
    ca,
    projets,
    ongletsManquants: src.ongletsManquants,
    ongletsSansEntete: src.ongletsSansEntete ?? [],
    etiquettes: src.etiquettes ?? {},
    majLe: src.majLe,
  };
}

/** Une phrase, pas un tableau. Elle dit ou on en est et quoi faire ensuite. */
function resumer(n: { actifs: number; contactes: number; rdv: number; signes: number }): string {
  const pluriel = (v: number, mot: string) => `${v} ${mot}${v > 1 ? 's' : ''}`;
  const etat = [
    pluriel(n.actifs, 'actif'),
    pluriel(n.contactes, 'contacté'),
    pluriel(n.rdv, 'RDV').replace('RDVs', 'RDV'),
    pluriel(n.signes, 'signé'),
  ].join(', ');

  let suite: string;
  if (n.actifs === 0) suite = 'remplir la feuille de prospection';
  else if (n.contactes === 0) suite = 'lancer les appels';
  else if (n.rdv === 0) suite = 'transformer les appels en rendez-vous';
  else if (n.signes === 0) suite = 'convertir les devis en signature';
  else suite = 'entretenir le pipeline et relancer les devis en attente';

  return `${etat} — prochaine étape : ${suite}.`;
}
