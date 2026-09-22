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

/** Les trois formules, par prix croissant. Chacune a sa pastille de
 *  budget sur la page Devis.
 *  L'ordre du tableau est l'ordre d'affichage : c'est lui qui fait foi,
 *  pas le markup. */
export const FORMULES = [
  { cle: 'refonte',    budget: `Refonte — dès ${REFONTE_PRIX}` },
  { cle: 'vitrine',    budget: `Vitrine Pro — 1 000 €` },
  { cle: 'entreprise', budget: `Entreprise — 1 200 à 3 100 €` },
] as const;

/** Depuis une carte tarif vers la page Devis : quel type de site
 *  pré-sélectionner. « entreprise » retombe sur le type vitrine :
 *  aucun type de la liste ne lui correspond exactement. */
export const TYPE_PAR_FORMULE: Record<string, string> = {
  refonte:    'refonte',
  vitrine:    'vitrine',
  entreprise: 'vitrine',
};
