/* Contenu et coordonnees du site, centralises ici.
   Objectif : quand la version anglaise arrivera, seul ce fichier sera duplique. */

export const SITE = {
  name: 'Nexa Web',
  domain: 'nexaaweb.com',
  city: 'Carvin',
  region: 'Hauts-de-France',
  email: 'contact.nexaweb62@gmail.com',
  phone: '06 98 84 01 94',
  phoneHref: 'tel:+33698840194',
  whatsapp: 'https://wa.me/33698840194',
} as const;

/* Zone d'intervention. Toutes ces communes sont a moins de 40 km de Carvin :
   c'est la zone ou un deplacement sur place reste possible dans la journee.
   Sert au balisage `areaServed` et a la mention du pied de page — Google
   accorde peu de credit a une zone declaree qui n'apparait nulle part dans
   la page. Ajouter une ville ici l'ajoute aux deux endroits. */
export const AREA = [
  'Carvin',
  'Lens',
  'Hénin-Beaumont',
  'Liévin',
  'Douai',
  'Seclin',
  'Lille',
] as const;

export const CALENDLY = 'https://calendly.com/contact-nexaweb62/30min';

export const NAV = [
  { href: '/', label: 'Accueil' },
  { href: '/#offre', label: "L'offre" },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/#contact', label: 'Contact' },
] as const;

/* Premier ecran ------------------------------------------------------------ */

export const HERO = {
  trustPill: 'Carvin · Hauts-de-France',
  headline: ['Votre commerce', "mérite d'être vu"],
  subhead:
    "Site, nom de domaine, réservations, suivi. Nexa Web met les commerces de Carvin et des Hauts-de-France en ligne — et s'en occupe ensuite.",
  ctaLabel: "Voir l'offre",
  ctaHref: '#offre',
} as const;

/* Chiffres du bas d'ecran.
   Ce sont des engagements de l'offre, pas un historique de resultats :
   rien ici ne doit etre invente. */
export const STATS = [
  { value: 7, decimals: 0, suffix: ' j', label: 'Mise en ligne' },
  { value: 24, decimals: 0, suffix: ' h', label: 'Délai de réponse' },
  { value: 5, decimals: 0, suffix: '', label: 'Prestations incluses' },
  { value: 100, decimals: 0, suffix: ' %', label: 'Le site vous appartient' },
] as const;

/* Sections ----------------------------------------------------------------- */

export const PROBLEMS = [
  {
    num: '01',
    title: 'Introuvable sur Google',
    text: "Votre fiche est incomplète, votre site date de 2019, ou il n'existe pas. Le client ouvre Maps, ne vous voit pas, et va chez le voisin.",
  },
  {
    num: '02',
    title: 'Le téléphone en plein service',
    text: 'Les réservations et les commandes tombent au pire moment. Une partie se perd, et personne ne les compte.',
  },
  {
    num: '03',
    title: 'Aucune idée de ce qui marche',
    text: "Vous payez peut-être de la publicité sans savoir ce qu'elle rapporte. Sans mesure, chaque euro dépensé est un pari.",
  },
] as const;

export const OFFER = [
  {
    num: '01',
    title: 'Site vitrine ou e-commerce',
    text: "Un site clair et rapide, qui donne envie de pousser la porte : la carte, les horaires, les photos, l'adresse. Ou une vraie boutique en ligne si vous vendez à distance.",
  },
  {
    num: '02',
    title: 'Nom de domaine et mise en ligne',
    text: "Le nom, l'hébergement, le certificat de sécurité, la configuration. Vous n'avez rien à gérer, et le domaine est déposé à votre nom.",
  },
  {
    num: '03',
    title: 'Formulaire ou prise de rendez-vous',
    text: 'Réserver une table, demander un devis, passer commande. Les demandes arrivent par e-mail, pas au milieu du coup de feu.',
  },
  {
    num: '04',
    title: 'Configuration des outils de suivi',
    text: "Fiche Google Business, statistiques de visite, suivi des demandes. Vous voyez enfin d'où viennent vos clients.",
  },
  {
    num: '05',
    title: 'Formation à la prise en main',
    text: 'Une session pour apprendre à changer une photo, un prix, un horaire. En autonomie, sans avoir à nous rappeler pour une virgule.',
  },
] as const;

/* Aucune realisation client a ce jour. Le site l'assume et l'explique plutot
   que d'exposer des maquettes fictives en guise de references. */
export const LAUNCH = {
  eyebrow: 'Les premiers projets',
  notes: [
    "Nexa Web démarre. Plutôt que d'aligner un catalogue de références, nous prenons peu de projets à la fois et nous les menons de bout en bout : la personne qui prend votre appel est celle qui conçoit le site, et celle qui décroche ensuite.",
    "Les premiers commerces accompagnés bénéficient de conditions de lancement. En échange, nous publions le résultat — le site, ce qui a changé, et les chiffres constatés.",
  ],
  terms: [
    {
      title: 'Un interlocuteur unique',
      text: "Pas de chef de projet intermédiaire ni de sous-traitance. Le même interlocuteur du premier appel jusqu'aux modifications, six mois plus tard.",
    },
    {
      title: 'Des conditions de lancement',
      text: "Un tarif réduit pour les premiers projets, en échange de votre retour honnête et de l'autorisation de publier le résultat.",
    },
    {
      title: 'Une étude de cas publiée',
      text: "Avec les chiffres réels — visites, demandes reçues — et uniquement si vous donnez votre accord. Rien ne sera publié sans validation.",
    },
  ],
} as const;

/* Montants arretes par Elio le 22/08/2026, conformes a la recommandation de
   docs/analysis.md § 4 : plancher absolu a 890 / 79, en dessous duquel un
   nouveau client coute de l'argent avant d'en rapporter.
   Repasser l'une des deux valeurs a null rebloque la mise en production. */
export const PRICING: { setup: number | null; monthly: number | null } = {
  setup: 1190,
  monthly: 99,
};

/* Engagements affiches juste avant le prix (recommandation P6 de docs/analysis.md :
   aucune objection n'etait levee avant l'annonce des montants).
   Rien d'invente ici : chaque ligne reprend un engagement deja pris ailleurs sur
   la page — STATS, FAQ, PRICING_NOTES, LAUNCH.terms — regroupe au bon endroit. */
export const PLEDGES = [
  {
    title: 'Le site et le domaine sont à vous',
    text: "Le nom de domaine est déposé à votre nom dès le départ. Si vous arrêtez, vous partez avec le site.",
  },
  {
    title: 'Sans engagement de durée',
    text: "L'abonnement s'arrête quand vous le décidez, et nous vous aidons à transférer le site chez l'hébergeur de votre choix.",
  },
  {
    title: 'En ligne en 7 jours ouvrés',
    text: 'Une fois les textes et les photos validés. Le délai est annoncé à la commande, pas découvert en cours de route.',
  },
  {
    title: 'Un seul interlocuteur',
    text: "Celui qui prend votre appel est celui qui conçoit le site, et celui qui répond six mois plus tard. Réponse sous 24 h ouvrées.",
  },
] as const;

export const PRICING_NOTES = [
  "Le budget publicitaire est payé directement par vous à Google ou Meta. Nous ne prenons aucune marge dessus.",
  'Les prestations supplémentaires — photos, rédaction, campagne, page additionnelle — sont devisées à part.',
  "L'abonnement est sans engagement de durée : vous pouvez l'arrêter à tout moment.",
] as const;

export const FAQ = [
  {
    q: 'Le site m’appartient vraiment ?',
    a: "Oui. Le nom de domaine est déposé à votre nom et le site reste le vôtre. Ce n'est pas une location : si vous arrêtez, vous partez avec.",
  },
  {
    q: 'Que se passe-t-il si j’arrête l’abonnement ?',
    a: "Vous récupérez le site et le domaine, et nous vous accompagnons pour les transférer chez l'hébergeur de votre choix. Aucun contenu n'est retenu.",
  },
  {
    q: 'Combien de temps avant d’être en ligne ?',
    a: 'Comptez 7 jours ouvrés entre la validation du contenu et la mise en ligne, à condition que les textes et les photos soient prêts.',
  },
  {
    q: 'Je n’ai ni photos ni textes.',
    a: "C'est le cas le plus fréquent. On part de ce que vous avez, on écrit les textes ensemble, et on vous dit précisément quelles photos prendre.",
  },
  {
    q: 'Vous travaillez uniquement à Carvin ?',
    a: 'Surtout dans les Hauts-de-France, où nous pouvons nous déplacer et voir le commerce. À distance, c’est possible également.',
  },
] as const;
