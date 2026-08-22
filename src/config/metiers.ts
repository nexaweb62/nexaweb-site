/* Pages d'entree par metier.

   Raison d'etre : l'analyse economique designe l'acquisition comme le seul vrai
   goulot du modele — la capacite de production n'est utilisee qu'a moitie meme
   dans le scenario optimiste. Une page unique se positionne sur « site internet
   Carvin » et rien d'autre. Ces pages visent les requetes que tapent vraiment
   les interesses : « site internet restaurant », « creation site plombier ».

   Regle de contenu : chaque page doit dire des choses vraies de ce metier-la et
   d'aucun autre. Une page metier qui se contente de remplacer « commerce » par
   « restaurant » est du remplissage, Google la traite comme telle, et un
   restaurateur qui la lit voit tout de suite que personne ne connait son metier.
   Si vous en ajoutez une, tenez la meme exigence ou ne l'ajoutez pas. */

export type Metier = {
  slug: string;
  /** Libelle court, pour la liste de bas de page. */
  nav: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string[];
  /** Ce que le metier perd aujourd'hui, en trois points concrets. */
  constat: { title: string; text: string }[];
  /** Ce que contient le site livre, formule dans le vocabulaire du metier. */
  contenu: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  /** Maquette de demonstration a montrer, si elle existe pour ce metier.
      Etablissement fictif, annonce comme tel sur la maquette et ici : on ne
      fait pas passer une demonstration pour une reference. */
  demo?: { href: string; nom: string; texte: string };
};

export const METIERS: Metier[] = [
  {
    slug: 'site-internet-restaurant',
    nav: 'Restaurants et brasseries',
    title: 'Site internet pour restaurant — Carvin et Hauts-de-France · Nexa Web',
    description:
      "Site internet pour restaurant, brasserie ou pizzeria : carte à jour, horaires, réservation et fiche Google. Mise en ligne en 7 jours, 1 190 € puis 99 €/mois. Carvin, Lens, Douai, Lille.",
    eyebrow: 'Restaurants, brasseries, pizzerias',
    h1: 'Un site de restaurant se juge sur trois choses',
    intro: [
      "Un client qui cherche où déjeuner décide en moins d'une minute, sur son téléphone, souvent dans la rue. Il veut savoir trois choses : est-ce ouvert, qu'est-ce qu'on y mange, et combien ça coûte. Un site de restaurant qui répond à ces trois questions en dix secondes travaille ; les autres sont décoratifs.",
      "C'est aussi le métier où le site sert le plus au personnel : la carte à jour évite vingt appels par semaine, et un formulaire de réservation évite de décrocher pendant le coup de feu.",
    ],
    constat: [
      {
        title: 'La carte est une photo de la carte',
        text: "Une image de menu scannée ne se lit pas sur un téléphone, ne se traduit pas, et Google n'en tire rien. Vos plats n'existent pas pour le moteur de recherche, donc pas pour le client qui cherche « couscous à Carvin ».",
      },
      {
        title: 'Les horaires ne sont vrais nulle part',
        text: "Fermeture le lundi, congés d'août, service continu le samedi : si la fiche Google et le site se contredisent, c'est la fiche qui gagne — et si elle se trompe, le client trouve porte close et le dit dans un avis.",
      },
      {
        title: 'Le téléphone sonne pendant le service',
        text: "Une réservation prise à la volée entre deux plats se perd. Une demande de groupe ou de privatisation, encore plus : ce sont les couverts les plus rentables de l'année, et ils partent au premier qui répond.",
      },
    ],
    contenu: [
      {
        title: 'La carte en texte, pas en image',
        text: "Chaque plat écrit noir sur blanc, avec son prix, lisible sur un écran de téléphone et compris par Google. Les allergènes et les mentions « fait maison » se posent au même endroit.",
      },
      {
        title: 'Les horaires à un seul endroit',
        text: "Les horaires du site et ceux de votre fiche Google sont alignés le jour de la mise en ligne, et on vous montre comment les changer tous les deux en deux minutes avant les congés.",
      },
      {
        title: 'La réservation par formulaire',
        text: "Date, nombre de couverts, téléphone. La demande arrive par e-mail, vous rappelez quand la salle est calme. Si vous utilisez déjà un service de réservation, on le branche à la place.",
      },
      {
        title: 'Les photos qui donnent faim',
        text: "On vous dit précisément lesquelles prendre — la salle en lumière du soir, trois assiettes, la façade — et on les recadre. C'est le poste où un restaurant gagne le plus de visites pour le moins d'effort.",
      },
      {
        title: 'La fiche Google, tenue',
        text: "Photos, horaires, lien de réservation, catégorie exacte. C'est elle qui décide de votre place dans le classement local, bien avant le site lui-même.",
      },
    ],
    demo: {
      href: '/demo-le-grenier',
      nom: 'Le Grenier',
      texte:
        "Une maquette de restaurant, faite pour montrer le résultat : carte, horaires, réservation, photos. L'établissement est fictif — nous n'avons pas encore de client à montrer, et nous préférons le dire.",
    },
    faq: [
      {
        q: 'On change la carte toutes les semaines. Il faut vous appeler à chaque fois ?',
        a: "Non. La carte est faite pour que vous la modifiiez vous-même : la formation d'une heure porte d'abord là-dessus. Si vous préférez nous l'envoyer, c'est compris dans l'abonnement.",
      },
      {
        q: 'On est déjà sur les plateformes de livraison. Un site sert encore à quoi ?',
        a: "À ne pas dépendre d'elles. Une commande passée sur une plateforme vous coûte 20 à 30 % de commission ; la même commande passée depuis votre site ne coûte rien. Le site ne remplace pas les plateformes, il vous rend une part de vos clients directs.",
      },
      {
        q: 'On ne prend pas de réservation, on est en service continu.',
        a: "Alors on ne met pas de formulaire de réservation. On met en avant la carte, l'itinéraire et les horaires — c'est ce que vos clients cherchent — et le formulaire sert aux demandes de groupe.",
      },
    ],
  },
  {
    slug: 'site-internet-commerce',
    nav: 'Commerces de proximité',
    title: 'Site internet pour commerce de proximité — Hauts-de-France · Nexa Web',
    description:
      "Site internet pour boulangerie, boucherie, fleuriste, épicerie ou boutique : horaires, produits, itinéraire et fiche Google. 1 190 € puis 99 €/mois, mise en ligne en 7 jours.",
    eyebrow: 'Boulangeries, boucheries, fleuristes, boutiques',
    h1: 'Le client ne cherche pas votre boutique, il cherche un produit',
    intro: [
      "Personne ne tape le nom de votre commerce sur Google — sauf ceux qui vous connaissent déjà, et ceux-là poussent la porte. Ce qui se tape, c'est « boulangerie ouverte dimanche Carvin », « fleuriste près de chez moi », « boucherie halal Lens ». Si votre commerce n'apparaît pas sur ces recherches-là, il n'existe que pour les habitués.",
      "Un commerce de proximité n'a pas besoin d'un grand site. Il a besoin d'être trouvé à trois heures de l'après-midi par quelqu'un qui est à six cents mètres.",
    ],
    constat: [
      {
        title: 'Rien qui dise ce que vous vendez',
        text: "« Boulangerie Dupont » ne dit pas que vous faites du pain au levain, des galettes à la frangipane en janvier et des sandwichs le midi. Ce sont pourtant ces mots-là que les gens tapent.",
      },
      {
        title: 'Des horaires de fermeture invisibles',
        text: "Congés annuels, fermeture le lundi, ouverture exceptionnelle un jour férié : l'information n'existe nulle part, alors elle circule mal. Un client qui se déplace pour rien y pense la fois suivante.",
      },
      {
        title: 'Les commandes se prennent au comptoir',
        text: "Gâteau d'anniversaire, plateau de charcuterie, bouquet pour un enterrement : ce sont les commandes qui rapportent, et elles supposent que le client soit déjà passé vous voir.",
      },
    ],
    contenu: [
      {
        title: 'Vos produits, écrits',
        text: "Une page qui nomme ce que vous vendez vraiment, dans les mots des clients. C'est ce texte, et lui seul, qui vous fait apparaître sur les recherches de produit.",
      },
      {
        title: 'Horaires, congés et jours fériés',
        text: "Affichés sur le site et alignés sur la fiche Google, avec la manip pour les changer avant de partir en vacances.",
      },
      {
        title: "L'itinéraire en un geste",
        text: "Adresse cliquable qui ouvre l'application de navigation, place de parking la plus proche, arrêt de bus. Sur un téléphone, un client qui doit recopier une adresse abandonne.",
      },
      {
        title: 'La commande par formulaire',
        text: "Un formulaire simple pour les commandes à préparer : ce qu'il faut, pour quand, à quel nom. La demande arrive par e-mail, vous confirmez par téléphone.",
      },
      {
        title: 'La fiche Google, tenue',
        text: "Catégorie, photos, horaires spéciaux, produits. Pour un commerce de proximité, c'est la première vitrine — souvent avant même le site.",
      },
    ],
    demo: {
      href: '/demo-la-fournee-dor',
      nom: "La Fournée d'Or",
      texte:
        "Une maquette de boulangerie, faite pour montrer le résultat : produits, horaires, itinéraire. L'établissement est fictif — nous n'avons pas encore de client à montrer, et nous préférons le dire.",
    },
    faq: [
      {
        q: "Je n'ai pas de boutique en ligne et je n'en veux pas.",
        a: "C'est le cas le plus fréquent, et souvent le bon choix. Vendre en ligne suppose des stocks, des expéditions et du service après-vente. Le site sert alors à faire venir les gens dans la boutique, pas à vendre à leur place.",
      },
      {
        q: 'Ma clientèle est âgée, elle ne va pas sur internet.',
        a: "Vos clients actuels, peut-être. Ceux qui viennent d'emménager dans le quartier, non : ils cherchent une boulangerie sur leur téléphone le premier samedi. C'est ce renouvellement-là que le site protège.",
      },
      {
        q: 'Combien de temps ça me prend, à moi ?',
        a: "Comptez deux heures en tout : une pour répondre à nos questions sur le commerce, une pour la formation. Les photos, on vous dit quoi prendre et vous les faites au téléphone.",
      },
    ],
  },
  {
    slug: 'site-internet-artisan',
    nav: 'Artisans et services',
    title: 'Site internet pour artisan — plombier, électricien, garage · Nexa Web',
    description:
      "Site internet pour artisan et service à domicile : zone d'intervention, demandes de devis, avis clients et fiche Google. 1 190 € puis 99 €/mois, mise en ligne en 7 jours. Hauts-de-France.",
    eyebrow: 'Plombiers, électriciens, garages, dépannage',
    h1: "Votre concurrent n'est pas meilleur, il est trouvable",
    intro: [
      "Un particulier avec une fuite ne compare pas trois devis : il appelle les deux premiers numéros qui s'affichent, et il prend celui qui décroche. Pour un métier de dépannage, la place dans le classement local ne vaut pas quelques clients de plus — elle vaut la majorité des appels.",
      "Le site d'un artisan a un travail précis : prouver en trente secondes que vous êtes réel, proche, assuré, et joignable.",
    ],
    constat: [
      {
        title: 'On ne sait pas où vous intervenez',
        text: "Un client à quinze kilomètres ne sait pas s'il est dans votre zone, donc il appelle quelqu'un d'autre. C'est l'information la plus demandée et la plus souvent absente.",
      },
      {
        title: 'Rien ne prouve que vous existez',
        text: "Pas de SIRET affiché, pas d'assurance décennale mentionnée, pas de photo de chantier : sur un devis à quatre mille euros, le doute suffit à faire changer d'avis.",
      },
      {
        title: 'Les demandes arrivent par téléphone, ou pas du tout',
        text: "Vous êtes sur un chantier, les mains prises, vous ne décrochez pas. Le client appelle le suivant. Un formulaire ne remplace pas un appel, mais il rattrape ceux que vous auriez perdus.",
      },
    ],
    contenu: [
      {
        title: 'Votre zone, en toutes lettres',
        text: "Les communes où vous vous déplacez, nommées une par une. C'est ce qui vous fait apparaître sur « plombier + nom de la ville », la recherche la plus fréquente du métier.",
      },
      {
        title: 'Ce que vous faites, et ce que vous ne faites pas',
        text: "Dépannage, rénovation, installation, entretien annuel. Dire ce que vous ne prenez pas évite les appels qui vous font perdre un quart d'heure.",
      },
      {
        title: 'Vos preuves',
        text: "SIRET, assurance décennale, certifications, années d'activité, photos de chantiers terminés. Ce sont les éléments qui font la différence sur les gros devis.",
      },
      {
        title: 'La demande de devis',
        text: "Un formulaire court — quoi, où, quand, un numéro — avec la possibilité de joindre une photo du problème. Vous rappelez le soir en sachant déjà de quoi il s'agit.",
      },
      {
        title: 'La fiche Google et les avis',
        text: "La fiche est configurée, et on vous laisse un moyen simple de demander un avis à chaque chantier terminé. C'est le premier facteur de classement local, et le seul qui se construit avec le temps.",
      },
    ],
    faq: [
      {
        q: 'Je travaille déjà au bouche-à-oreille, mon carnet est plein.',
        a: "Tant mieux — et c'est le bon moment. Un site se construit quand l'activité va bien, pas dans le mois creux où il faudrait qu'il rapporte tout de suite. Il sert aussi à choisir : afficher clairement ses interventions filtre les demandes qui ne vous intéressent pas.",
      },
      {
        q: 'Les demandes de devis en ligne, ce sont surtout des curieux.',
        a: "En partie, oui. C'est pour ça que le formulaire demande la commune, la nature des travaux et un téléphone : les curieux ne le remplissent pas. Et vous restez libre de ne rappeler que ce qui vous intéresse.",
      },
      {
        q: "J'ai déjà payé pour un annuaire professionnel.",
        a: "Ce sont deux choses différentes : l'annuaire vous loue une visibilité qui s'arrête le jour où vous arrêtez de payer. Le site et le nom de domaine vous appartiennent, et ce que vous y construisez reste.",
      },
    ],
  },
];
