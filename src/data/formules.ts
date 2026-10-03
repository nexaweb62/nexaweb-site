/**
 * LES FORMULES — une seule source.
 *
 * Le prix et le délai de la Refonte sont une PROPOSITION, à confirmer par
 * le fondateur. Ils sont ici et nulle part ailleurs : la page Tarifs, la
 * page Devis et les traductions les lisent depuis ce fichier. Changer
 * 490 ci-dessous change les trois.
 *
 * Les espaces sont insécables à dessein. Sans eux « 1 200 € » se coupe en
 * « 1 » / « 200 € » en fin de ligne, et « dès 490 € » sépare le montant
 * de son unité.
 *      espace fine insécable — entre les milliers
 *      espace insécable — avant le symbole €
 */

/** Espace fine insécable entre les milliers, insécable avant l'unité. */
export function prix(montant: number): string {
  return String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
}

export const REFONTE = {
  /** À confirmer par le fondateur. */
  prixDepart: 490,
  /** À confirmer par le fondateur. */
  delaiSemaines: 2,
} as const;

export const REFONTE_PRIX = prix(REFONTE.prixDepart);          // « 490 € »
export const REFONTE_DELAI = `${REFONTE.delaiSemaines} semaines`;

export const VITRINE = {
  /** Prix de lancement, les 3 premiers clients. */
  prix: 999,
} as const;
export const VITRINE_PRIX = prix(VITRINE.prix);                // « 999 € »

export const ENTREPRISE = {
  /** Le seul montant affiché : la page annonce « à partir de ». */
  prixDepart: 1200,
  /** Haut de fourchette, gardé pour la pastille de budget du Devis et
   *  abaissé de 3 100 à 2 400. Il n'est plus montré sur la page
   *  Tarifs : c'est lui qui faisait paraître la formule hors de prix. */
  prixHaut: 2400,
} as const;
export const ENTREPRISE_PRIX = prix(ENTREPRISE.prixDepart);    // « 1 200 € »

/* ── Le paiement en plusieurs fois ──────────────────────────────────
   Deux échéanciers, sans majoration : le total payé est exactement le
   prix comptant. Les montants sont arrondis au SUPÉRIEUR, donc la
   dernière mensualité absorbe la différence — 490 € en trois fois donne
   164 + 164 + 162, et non 163,33 trois fois. La page affiche toujours
   le total à côté, pour qu'aucun chiffre ne puisse tromper. */
export const PLANS = [3, 4] as const;
export function parMois(total: number, n: number): string {
  return prix(Math.ceil(total / n));
}
export const REFONTE_M3    = parMois(REFONTE.prixDepart, 3);    // « 164 € »
export const REFONTE_M4    = parMois(REFONTE.prixDepart, 4);    // « 123 € »
export const VITRINE_M3    = parMois(VITRINE.prix, 3);          // « 333 € »
export const VITRINE_M4    = parMois(VITRINE.prix, 4);          // « 250 € »
export const ENTREPRISE_M3 = parMois(ENTREPRISE.prixDepart, 3); // « 400 € »
export const ENTREPRISE_M4 = parMois(ENTREPRISE.prixDepart, 4); // « 300 € »

/** Les trois formules, par prix croissant. Chacune a sa pastille de
 *  budget sur la page Devis, et chaque pastille porte ses deux
 *  mensualités : c'est la page Devis qui les affiche, selon l'échéancier
 *  choisi ici ou rapporté de la page Tarifs par l'adresse.
 *
 *  L'ordre du tableau est l'ordre d'affichage : c'est lui qui fait foi,
 *  pas le markup. Les prix écrits en dur dans devis.astro — « 1 000 € »
 *  pour la Vitrine, « 1 200 à 3 100 € » pour l'Entreprise — avaient
 *  dérivé de ceux de la page Tarifs ; ils viennent d'ici désormais. */
export const FORMULES = [
  { cle: 'refonte',    nom: 'Refonte',     pre: 'dès',         preCle: 'trf-p4-pre',
    total: REFONTE_PRIX,    m3: REFONTE_M3,    m4: REFONTE_M4 },
  { cle: 'vitrine',    nom: 'Vitrine Pro', pre: '',            preCle: '',
    total: VITRINE_PRIX,    m3: VITRINE_M3,    m4: VITRINE_M4 },
  { cle: 'entreprise', nom: 'Entreprise',  pre: 'à partir de', preCle: 'trf-pre-apd',
    total: ENTREPRISE_PRIX, m3: ENTREPRISE_M3, m4: ENTREPRISE_M4 },
] as const;

/** Les trois échéanciers, du comptant au plus étalé. La valeur est
 *  celle qui voyage dans l'adresse (/devis?paiement=4) et celle qui
 *  part avec la demande. */
export const PAIEMENTS = [
  { cle: 'comptant', n: 1 },
  { cle: '3',        n: 3 },
  { cle: '4',        n: 4 },
] as const;

/** Depuis une carte tarif vers la page Devis : quel type de site
 *  pré-sélectionner. « entreprise » retombe sur le type vitrine :
 *  aucun type de la liste ne lui correspond exactement. */
export const TYPE_PAR_FORMULE: Record<string, string> = {
  refonte:    'refonte',
  vitrine:    'vitrine',
  entreprise: 'vitrine',
};
