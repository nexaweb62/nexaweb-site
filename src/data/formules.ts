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
 *  budget sur la page Devis.
 *  L'ordre du tableau est l'ordre d'affichage : c'est lui qui fait foi,
 *  pas le markup. */
export const FORMULES = [
  { cle: 'refonte',    budget: `Refonte — dès ${REFONTE_PRIX}` },
  { cle: 'vitrine',    budget: `Vitrine Pro — ${VITRINE_PRIX}` },
  { cle: 'entreprise', budget: `Entreprise — à partir de ${ENTREPRISE_PRIX}` },
] as const;

/** Depuis une carte tarif vers la page Devis : quel type de site
 *  pré-sélectionner. « entreprise » retombe sur le type vitrine :
 *  aucun type de la liste ne lui correspond exactement. */
export const TYPE_PAR_FORMULE: Record<string, string> = {
  refonte:    'refonte',
  vitrine:    'vitrine',
  entreprise: 'vitrine',
};
