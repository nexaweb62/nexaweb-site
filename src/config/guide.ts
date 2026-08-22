/* Guide « fiche Google Business ».

   Pourquoi cette page existe : l'offre inclut la configuration de la fiche
   Google, mais rien sur le site ne montrait qu'on sait de quoi on parle. Un
   commercant qui cherche « comment ameliorer ma fiche Google » tape cette
   requete bien avant de chercher une agence — cette page le rencontre a ce
   moment-la, et lui donne quelque chose d'utilisable meme s'il ne nous appelle
   jamais. C'est aussi un support de prospection : un lien a envoyer apres un
   appel, plutot qu'un discours a repeter.

   Regle : le guide doit rester utilisable seul. Un guide qui s'arrete au moment
   ou ca devient interessant pour forcer l'appel se retourne contre celui qui
   l'ecrit. */

export const GUIDE = {
  slug: 'fiche-google-business',
  title: 'Fiche Google Business : le guide pour un commerce — Nexa Web',
  description:
    "Comment configurer et tenir sa fiche Google Business quand on tient un commerce : catégorie, horaires, photos, avis, publications. Guide pratique, sans jargon, par Nexa Web (Carvin, Hauts-de-France).",
  h1: 'Votre fiche Google vaut plus que votre site',
  intro: [
    "Pour un commerce de proximité, la fiche Google Business — l'encadré qui apparaît à droite des résultats, et la punaise sur Maps — décide de plus de visites que le site lui-même. C'est elle qui s'affiche quand quelqu'un cherche « boulangerie ouverte maintenant », et c'est souvent la seule chose que le client regarde avant de se déplacer.",
    "Elle est gratuite, elle se tient en une heure par mois, et la plupart des commerces la laissent en friche. Voici ce qu'il faut faire, dans l'ordre où ça compte. Tout est faisable seul : ce guide n'a pas de deuxième partie payante.",
  ],
  etapes: [
    {
      titre: 'Revendiquez la fiche, même si vous ne l’avez pas créée',
      texte:
        "Google crée des fiches tout seul, à partir des annuaires et des contributions des utilisateurs. Il en existe peut-être déjà une pour vous, avec de mauvais horaires. Cherchez le nom de votre commerce sur Google, et si une fiche apparaît sans que vous en ayez le contrôle, cliquez sur « Vous êtes propriétaire de cet établissement ? ». La vérification se fait par courrier postal, par téléphone ou par vidéo selon les cas — comptez une à deux semaines pour le courrier.",
    },
    {
      titre: 'Choisissez la catégorie principale avec soin',
      texte:
        "C'est le réglage le plus important de toute la fiche, et il ne se rattrape pas avec du contenu. « Restaurant » et « Restaurant français » ne vous font pas apparaître sur les mêmes recherches. Prenez la catégorie la plus précise qui décrit vraiment votre activité principale, puis ajoutez deux ou trois catégories secondaires pour le reste. Regardez celles de vos concurrents les mieux classés : Google les affiche sous leur nom.",
    },
    {
      titre: 'Écrivez le nom exact, et rien de plus',
      texte:
        "Le nom de la fiche doit être celui de l'enseigne, tel qu'il est sur la devanture. Y ajouter des mots-clés — « Boulangerie Dupont Carvin pain artisanal » — est une infraction aux règles de Google : la fiche peut être suspendue, et un concurrent peut le signaler en deux clics. Le gain à court terme ne vaut pas ce risque-là.",
    },
    {
      titre: 'Les horaires, y compris les horaires spéciaux',
      texte:
        "Renseignez les horaires réels, service par service si vous fermez l'après-midi. Puis, deux fois par an, prenez dix minutes pour saisir les horaires spéciaux : jours fériés, congés annuels, fermeture exceptionnelle. Google met en avant les établissements ouverts au moment de la recherche — une fiche qui dit « ouvert » alors que le rideau est baissé produit un avis à une étoile, et ces avis-là restent.",
    },
    {
      titre: 'Photos : la façade d’abord, et régulièrement',
      texte:
        "La photo de couverture doit être la façade, prise de face, en journée, sans voiture devant : c'est ce que le client cherche à reconnaître en arrivant. Ajoutez ensuite l'intérieur, trois produits, et l'équipe. Le rythme compte autant que la quantité : deux photos par mois valent mieux que trente d'un coup, parce que Google traite une fiche alimentée comme une fiche active. Le téléphone suffit — la lumière compte cent fois plus que l'appareil.",
    },
    {
      titre: 'Les avis : demandez-les, et répondez à tous',
      texte:
        "Le nombre d'avis et leur fraîcheur pèsent lourd dans le classement local. Demandez-les au bon moment — juste après un service qui s'est bien passé, jamais par e-mail groupé une semaine plus tard. Google fournit un lien court pour ça, dans l'onglet « Demander des avis ». Répondez à tous, y compris et surtout aux mauvais : une réponse posée à un avis à deux étoiles convainc plus qu'une moyenne parfaite. N'achetez jamais d'avis, la détection est efficace et la sanction porte sur la fiche entière.",
    },
    {
      titre: 'Remplissez les attributs et les produits',
      texte:
        "Terrasse, accès en fauteuil roulant, paiement sans contact, produits sans gluten, wifi : ces attributs alimentent des filtres de recherche que les clients utilisent vraiment. La section « Produits » permet de nommer ce que vous vendez, avec un prix — c'est du texte que Google peut associer à des recherches de produit, ce que vos photos ne permettent pas.",
    },
    {
      titre: 'Publiez, même peu',
      texte:
        "Les publications de la fiche — une nouveauté, un plat du jour, une fermeture — apparaissent quelques jours puis s'effacent. Une par semaine suffit. Leur effet direct sur le classement est modeste ; leur effet sur le client qui hésite entre deux fiches, beaucoup moins.",
    },
    {
      titre: 'Vérifiez que vos coordonnées sont identiques partout',
      texte:
        "Nom, adresse et téléphone doivent être écrits exactement de la même façon sur la fiche, sur votre site, sur Facebook et dans les annuaires. « 8 pl. du Général Leclerc » et « 8 place du Gal Leclerc » sont deux adresses différentes pour un moteur de recherche, et cette incohérence coûte des places dans le classement local sans que rien ne le signale.",
    },
    {
      titre: 'Regardez les statistiques une fois par mois',
      texte:
        "La fiche indique combien de personnes l'ont vue, combien ont demandé l'itinéraire, combien ont appelé. Ce sont les seuls chiffres de fréquentation que la plupart des commerces auront jamais. Notez-les chaque mois dans un carnet : la tendance sur six mois vaut plus que le chiffre du jour.",
    },
  ],
  ferme: {
    titre: 'Ce que ce guide ne remplace pas',
    texte:
      "Une fiche bien tenue amène des visites ; elle ne dit pas ce que vous vendez, ne prend pas de réservation et ne vous appartient pas — Google peut la suspendre, et vous n'aurez aucun recours utile. C'est précisément pour ça qu'un site, avec un nom de domaine à votre nom, reste la seule vitrine que personne ne peut vous retirer. Les deux se complètent : la fiche fait venir, le site convainc et garde.",
  },
} as const;
