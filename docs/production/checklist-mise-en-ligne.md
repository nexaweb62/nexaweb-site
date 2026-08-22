# Checklist de mise en ligne

> À dérouler dans l'ordre pour chaque site client. Rien ne se coche de mémoire :
> chaque ligne se vérifie sur le site en ligne, pas en local.

## Avant le développement

- [ ] Questionnaire de démarrage complet, sections 1 à 5 (voir
      `questionnaire-client.md`)
- [ ] Photos reçues et triées
- [ ] Nom de domaine choisi et **disponible** — vérifier avant de le promettre
- [ ] Accès à la fiche Google Business obtenu, ou fiche à créer
- [ ] Devis signé, acompte encaissé

## Contenu

- [ ] Textes relus à voix haute — un mot qu'on ne dirait pas au téléphone n'a
      rien à faire sur la page
- [ ] Aucun mot d'agence : « expérience digitale », « solution sur-mesure »,
      « accompagnement à 360° »
- [ ] Horaires vérifiés **auprès du client**, pas recopiés d'un ancien site
- [ ] Prix affichés validés par écrit
- [ ] Mentions légales : SIRET, forme juridique, dirigeant, hébergeur
- [ ] Politique de confidentialité en accord avec ce que le site fait vraiment

## Technique

- [ ] `npm run build` passe, y compris le garde-fou de production
- [ ] `npm run audit` : aucun point à corriger
- [ ] `npm run test:contact` : cinq vérifications passées
- [ ] Un seul `h1` par page, titres dans l'ordre
- [ ] Toutes les images en `alt` utile — pas « image1 »
- [ ] Poids du premier écran sous 150 Ko sur mobile
- [ ] Vidéo ou animation : désactivée sous 720 px et en `prefers-reduced-motion`
- [ ] Aucune requête vers un domaine tiers (onglet Réseau, filtre par domaine)
- [ ] Test au clavier seul : on atteint le formulaire et on l'envoie

## Déploiement

- [ ] Projet Cloudflare Pages créé, branche de production choisie
- [ ] `RESEND_API_KEY` en **secret chiffré**
- [ ] Domaine vérifié chez Resend — sans quoi le formulaire n'envoie qu'à
      l'adresse du compte, et le client ne reçoit rien
- [ ] `CONTACT_TO` pointé sur l'adresse du client
- [ ] Domaine personnalisé rattaché, DNS mis à jour chez le registraire
- [ ] Redirection `www` → apex créée (règle de redirection, pas `_redirects`)
- [ ] HTTPS actif, certificat émis
- [ ] Anciennes URLs redirigées en 301 si un site existait

## Après la mise en ligne — le jour même

- [ ] **Formulaire testé en conditions réelles**, depuis un téléphone, sur le
      domaine final. L'e-mail arrive-t-il chez le client, dans la boîte
      principale et non en indésirable ?
- [ ] Numéro de téléphone testé : le lien lance bien l'appel
- [ ] Itinéraire testé : le lien ouvre bien l'application de navigation
- [ ] Fiche Google : horaires, catégorie, photos, lien vers le site
- [ ] Site soumis dans la Search Console, sitemap déclaré
- [ ] Partage testé sur WhatsApp et sur Facebook : la vignette s'affiche
- [ ] Mesure d'audience activée

## Formation et remise — sous sept jours

- [ ] Session d'une heure : changer une photo, un prix, un horaire
- [ ] Le client fait la manipulation lui-même pendant la session
- [ ] Identifiants remis par écrit, dans un document qu'il conserve
- [ ] Rappel écrit : le domaine est à son nom, le site lui appartient
- [ ] Date du premier point de suivi fixée — un mois plus tard, dans l'agenda

## Un mois après

- [ ] Point de quinze minutes : combien de demandes reçues, lesquelles ont
      abouti ?
- [ ] Ce chiffre est noté quelque part. **C'est la matière de l'étude de cas**,
      et l'étude de cas vaut plus que dix pages de site
- [ ] Demander l'avis Google si le client est content — c'est le moment, pas
      six mois plus tard
