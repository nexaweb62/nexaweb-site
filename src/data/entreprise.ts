/**
 * L'IDENTITÉ DE L'ÉDITEUR — une seule source.
 *
 * Les mentions légales, les conditions de vente, la politique de
 * confidentialité et la politique de l'entreprise lisent ce fichier.
 * Une information écrite ici apparaît partout à la fois ; une information
 * écrite à la main dans une page finit par contredire les autres.
 *
 * ── CE QUI VAUT null ────────────────────────────────────────────────
 * null veut dire « inconnu à ce jour ». Le composant Valeur.astro
 * l'affiche « à compléter », visiblement. Rien n'est deviné : un SIRET
 * ou un médiateur inventé serait pire qu'un champ vide, parce qu'il
 * aurait l'air vrai. Remplacer null par la valeur exacte suffit : toutes
 * les pages se mettent à jour au build suivant.
 *
 * ── LES TEXTES QUI L'EXIGENT ────────────────────────────────────────
 * Éditeur personne physique : loi n° 2004-575 du 21 juin 2004 (LCEN),
 *   art. 1-1, I, 1° (ancien art. 6 III, déplacé par la loi n° 2024-449
 *   du 21 mai 2024) : nom, prénoms, domicile, téléphone, numéro
 *   d'inscription au registre. Sanction : art. 1-2 (1 an, 75 000 €).
 * Mention « EI » : nom de l'entrepreneur précédé ou suivi de
 *   « entrepreneur individuel » ou « EI » (loi n° 2022-172 du
 *   14 février 2022, décret n° 2022-725 du 28 avril 2022).
 * Hébergeur : LCEN art. 1-1, I, 4° — nom, adresse, téléphone.
 * Médiateur : C. conso L612-1, L616-1, R616-1 — nom, adresse, site.
 * TVA : CGI art. 293 B (franchise en base) ou numéro de TVA.
 */

/** Une donnée inconnue vaut null, jamais une valeur plausible. */
export type Valeur = string | null;

/** Un pays d'adresse : le nom s'affiche par une clé de traduction. */
export type Pays = 'fr' | 'us' | 'sg';

export interface Adresse {
  /** Rue et numéro, tels qu'ils s'écrivent sur une enveloppe. */
  rue: string;
  /** Code postal et ville (ou État américain), sans le pays. */
  ville: string;
  pays: Pays;
}

export const EDITEUR = {
  /** Le nom sous lequel le site et l'activité se présentent. */
  nomCommercial: 'Nexa Web',
  /** Nom et prénoms de la personne qui détient l'entreprise
   *  individuelle. Le site présente deux cofondateurs (page Équipe) ;
   *  une entreprise individuelle n'a qu'un titulaire. Lequel : à
   *  confirmer par le fondateur, sur l'avis de situation SIRENE. */
  titulaire: null as Valeur,
  /** Le site écrivait « Auto-entrepreneur ». La forme juridique est
   *  l'entreprise individuelle ; la micro-entreprise est un régime
   *  fiscal et social. D'où le libellé de la clé lg-forme-ei. */
  forme: 'ei-micro' as const,
  /** Quatorze chiffres, tels qu'ils figurent sur l'avis de situation
   *  SIRENE (INSEE). */
  siret: null as Valeur,
  /** Le registre d'immatriculation : « Registre national des
   *  entreprises (RNE) », et en plus « RCS de … » pour une activité
   *  commerciale. */
  registre: null as Valeur,
  /** Adresse déjà publiée sur le site. La LCEN demande le domicile
   *  de l'entrepreneur, ou l'adresse de domiciliation de l'entreprise. */
  adresse: { rue: '3 rue d’Albi', ville: '62220 Carvin', pays: 'fr' } as Adresse,
  /** La LCEN exige un numéro de téléphone. Le pied de page publie un
   *  lien WhatsApp ; savoir s'il s'agit de la ligne de l'entreprise
   *  revient au fondateur. */
  telephone: null as Valeur,
  email: 'contact.nexaweb62@gmail.com',
  site: 'nexaaweb.com',
  /** Pour un éditeur personne physique, le directeur de la publication
   *  est cette personne (loi n° 82-652 du 29 juillet 1982, art. 93-2).
   *  Nom déjà publié sur le site. */
  directeurPublication: 'Ahmed Chteoui',
};

/**
 * La TVA.
 *   'franchise' : micro-entreprise sous le seuil — « TVA non applicable,
 *                 art. 293 B du CGI », les prix affichés sont les prix
 *                 à payer.
 *   'assujetti' : un numéro de TVA intracommunautaire, et des prix
 *                 affichés TTC pour les particuliers.
 *   null        : pas encore indiqué par le fondateur.
 */
export const TVA = {
  regime: null as null | 'franchise' | 'assujetti',
  /** FR + 11 caractères, seulement si regime === 'assujetti'. */
  numero: null as Valeur,
};

/**
 * Le médiateur de la consommation auquel l'entreprise a ADHÉRÉ.
 * Il n'est pas choisi ici : il faut une convention signée avec lui.
 * Le rapport juridique liste des médiateurs référencés à comparer.
 */
export const MEDIATEUR = {
  nom: null as Valeur,
  /** Adresse postale complète, sur une ligne. */
  adresse: null as Valeur,
  /** Adresse du site du médiateur, avec https://. */
  site: null as Valeur,
};

/**
 * L'hébergeur du site.
 * Source : Cloudflare, Inc., rapport annuel 10-K (exercice 2025) déposé
 * à la SEC, page de garde : « 101 Townsend Street, San Francisco,
 * California 94107 », « (888) 993-5273 ». Politique de confidentialité
 * de Cloudflare (4 novembre 2025) pour l'adresse postale.
 */
export const HEBERGEUR = {
  nom: 'Cloudflare, Inc.',
  adresse: { rue: '101 Townsend Street', ville: 'San Francisco, CA 94107', pays: 'us' } as Adresse,
  telephone: '+1 888 993 5273',
  site: 'https://www.cloudflare.com',
};

/**
 * La base de données (demandes confirmées, avis, comptes clients).
 * Source : conditions d'utilisation de Supabase, art. 1(j) — l'entité
 * qui contracte par défaut est Supabase Pte. Ltd. Supabase ne publie
 * aucun numéro de téléphone ; les notifications juridiques vont à
 * legal@supabase.io (art. 14(b)).
 */
export const BASE_DONNEES = {
  nom: 'Supabase Pte. Ltd.',
  adresse: { rue: '65 Chulia Street #38-02/03, OCBC Centre', ville: 'Singapore 049513', pays: 'sg' } as Adresse,
  telephone: null as Valeur,
  contact: 'legal@supabase.io',
  site: 'https://supabase.com',
  /** La région d'infrastructure choisie à la création du projet
   *  (par exemple « Union européenne — Francfort »). Visible dans le
   *  tableau de bord Supabase, réglages du projet. */
  region: null as Valeur,
};

/** Le jour de la dernière révision des pages juridiques, AAAA-MM-JJ. */
export const MISE_A_JOUR = '2026-11-03';

/** « 3 novembre 2026 » — la date telle que l'écrivent les pages. */
export function dateLongue(iso: string = MISE_A_JOUR): string {
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const [a, m, j] = iso.split('-').map(Number);
  return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
}
