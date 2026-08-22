# Nexa Web — notes du projet

Site vitrine d'une seule page, construit avec **Astro 7** (sortie statique, aucun
JavaScript de framework). Cible : restaurants et commerces de proximité des
Hauts-de-France. Offre unique « Lancement digital ».

Dernière mise à jour : 22 août 2026.

---

## Démarrer

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build + garde-fou de production
npm run check    # garde-fou seul
npx astro check  # typage
```

`npm run build` **échoue** si `CONTEXT=production` et que les montants ne sont
pas renseignés dans `src/config/site.ts`. C'est volontaire : la page tarifs ne
doit jamais partir en ligne avec un placeholder.

## Structure

| Chemin | Rôle |
|---|---|
| `src/pages/index.astro` | La page d'accueil : hero vidéo, constat, offre, premiers projets, tarifs, questions, contact |
| `src/pages/[metier].astro` | Les trois pages d'entrée par métier, générées depuis `src/config/metiers.ts` |
| `src/pages/equipe.astro` | Qui est derrière Nexa Web : les trois associés, photos et rôles |
| `src/pages/{mentions-legales,politique-confidentialite,merci,404}.astro` | Pages annexes |
| `src/config/site.ts` | **Tout le contenu et les coordonnées.** Un seul fichier à dupliquer le jour où l'anglais arrive |
| `src/components/{Header,Footer}.astro` | Navigation, menu mobile, pied de page |
| `src/components/{ContactForm,ActionBar,Breadcrumb}.astro` | Formulaire mutualisé, barre d'action mobile, fil d'Ariane |
| `src/styles/global.css` | Feuille unique. Premier écran repris d'un spec fourni, sections suivantes en extension |
| `src/layouts/Base.astro` | `<head>`, métadonnées, polices |
| `public/assets/` | Vidéo de fond, affiche, image de partage, logo, portraits de l'équipe |
| `public/fonts/` | Archivo et Cormorant, auto-hébergées. Régénérées à la main, voir `src/styles/fonts.css` |
| `scripts/build-sitemap.mjs` | Sitemap déduit de `dist/` après le build |
| `scripts/make-og.mjs`, `scripts/make-portraits.mjs` | Génération des images (`npm run og`) |
| `public/demo-*.html` | Deux maquettes de démonstration, en `noindex`, autonomes |
| `public/_redirects` | 30 redirections 301 des anciennes URLs. **Ne pas y toucher** |
| `public/_headers` | En-têtes de sécurité et cache des médias |
| `functions/api/contact.js` | Réception du formulaire, envoi via Resend |
| `scripts/check-build.mjs` | Garde-fou de mise en production |
| `docs/conclusions.md` | **Point d'entrée** : la synthèse en une page, les chiffres et ce qu'il faut faire |
| `docs/analysis.md` | Analyse économique, audit conversion, journal des cycles |
| `docs/production/` | Questionnaire de démarrage et checklist de mise en ligne, pour les sites clients |
| `docs/design-system.md` | Couleurs, typographie, gabarits disponibles et ce qu'on s'interdit |
| `docs/modele-economique.mjs` | Le calcul derrière les chiffres du document |

## Choix techniques

- **Polices** : Cormorant (affichage) et Archivo (interface), via Google Fonts.
  Cormorant a une hauteur d'x très basse — 0,386 em contre 0,482 pour Fraunces,
  qu'elle remplace : tous les corps d'affichage sont majorés d'environ 12 %,
  facteur mesuré sur la hauteur de capitale. Si vous changez encore de serif,
  refaites ce calcul plutôt que de garder les corps en l'état.
- **Vidéo de fond** : ré-encodée de 13,86 Mo à 1,24 Mo, auto-hébergée. Chargée
  par JavaScript uniquement au-dessus de 720 px et hors `prefers-reduced-motion` :
  sur mobile, seule l'affiche de 95 Ko est téléchargée.
- **Formulaire** : fonction Cloudflare Pages `functions/api/contact.js`, qui
  envoie un e-mail via Resend. Aucun service de formulaire tiers. Le POST est du
  HTML classique : il fonctionne sans JavaScript côté client. Honeypot
  `bot-field`, succès sur `/merci`, échec sur `/probleme`.
- **Redirections** : 30 redirections 301 dans `public/_redirects` couvrent toutes
  les anciennes URLs `.html` indexées. **Ne pas les supprimer.** En-têtes de
  sécurité dans `public/_headers`.

---

## Services encore actifs

| Service | Usage | Identifiant |
|---|---|---|
| **Cloudflare Pages** | Hébergement + fonction du formulaire | Projet à créer, voir « Déploiement » |
| **Resend** | Envoi de l'e-mail du formulaire | Clé `RESEND_API_KEY` en secret chiffré |
| **OVH** | Nom de domaine | `nexaaweb.com` (deux « a » — confirmé, ce n'est pas une coquille) |
| **Calendly** | Prise de rendez-vous, lié depuis le site | `calendly.com/contact-nexaweb62/30min` |
| **Google Business Profile** | Fiche établissement — décisif pour le SEO local | Compte `contact.nexaweb62@gmail.com` |
| **PayPal Business** | Facturation | `contact.nexaweb62@gmail.com` |

Contact : `contact.nexaweb62@gmail.com` · 06 98 84 01 94 · 06 41 46 78 98

---

## Services à résilier

Ces intégrations appartenaient à l'ancien site et ne sont plus appelées par
aucune ligne de code. Elles continuent pourtant d'exister côté fournisseur :
il faut les fermer, pas seulement les oublier.

| Service | Ce qu'il reste à faire | Priorité |
|---|---|---|
| **Cloudflare Workers** | Supprimer le worker `shy-art-5483.contact-nexaweb62.workers.dev`, qui servait de proxy au chatbot. **Il détient une variable d'environnement `ANTHROPIC_API_KEY`. Révoquer cette clé dans la console Anthropic, que le worker soit supprimé ou non.** | **Sécurité — à faire en premier** |
| **Supabase** | Projet `abbplzlczwpqmyelopxo` : Edge Functions `chat` et `send-devis-email`, plus la base de l'espace client. Rien n'y accède. À archiver ou supprimer | Moyenne |
| **EmailJS** | Service `service_nexaweb`, template `template_x66s6ig`. Remplacé par la fonction Cloudflare | Faible |
| **Formspree** | Endpoint `xgojwqyo`, qui recevait les avis clients | Faible |
| **Google reCAPTCHA** | Clé de site de l'ancien formulaire de devis | Faible |
| **Google Analytics** | Propriété `G-8TPVX3PQ1S`. Le nouveau site ne charge aucun outil de mesure — c'est un choix, à revoir si vous voulez mesurer les conversions | Faible |

---

## Ce qui a été supprimé, et comment le récupérer

Le nettoyage du 22 août 2026 a retiré l'intégralité de l'ancien site statique
de cette branche : 31 pages `.html`, 15 fichiers JavaScript (shaders, transitions
de vue, widgets), `style.css`, les fichiers `locales/`, les photos de l'ancienne
page Équipe, les Edge Functions Deno et le cache Graphify.

**Rien n'est perdu.** La branche `main` porte toujours l'ancien site complet,
c'est elle qui est en production. Pour récupérer un fichier :

```bash
git show main:script.js > script.js
git show main:locales/fr.json > locales/fr.json
git show main:img/fondateur1.jpg > public/img/fondateur1.jpg
```

Les photos des fondateurs et des membres serviront probablement le jour où une
page « qui sommes-nous » sera ajoutée — c'est la recommandation P7 de
`docs/analysis.md`. La commande ci-dessus les ramène.

---

## À faire

1. **Renseigner `LEGAL` dans `src/config/site.ts`** — forme juridique, adresse
   du siège, SIRET, directeur de la publication, et la TVA intracommunautaire
   si vous y êtes assujettis. **La mise en production est bloquée tant que
   c'est vide** : un site professionnel sans ces mentions est en infraction
   (LCEN art. 6 III), et personne d'autre que vous ne peut les fournir. Deux
   minutes, à faire en premier. Si vous êtes en franchise en base de TVA,
   laissez `tva` à `null` : la page affiche alors la mention de l'article 293 B.
2. **Révoquer la clé Anthropic** du worker Cloudflare de l'ancien site
   (voir « Services à résilier »). C'est une clé active dans un service que
   plus personne ne surveille.
3. **Créer le projet Cloudflare Pages.** `Workers & Pages → Create → Pages →
   Connect to Git`, dépôt `nexaweb62/nexaweb-site`, branche `redesign/nexa-2026`.
   Commande de build : `npm run build`. Dossier de sortie : `dist`. Le dossier
   `functions/` est repris automatiquement, rien à configurer pour lui.
4. **Déclarer les variables d'environnement** (`Settings → Environment variables`) :
   `RESEND_API_KEY` **en secret chiffré**, obligatoire. Optionnellement
   `RESEND_FROM` et `CONTACT_TO`. Tant que `nexaaweb.com` n'est pas vérifié chez
   Resend, laisser `RESEND_FROM` vide : la fonction utilise alors l'expéditeur de
   test `onboarding@resend.dev`, qui n'envoie qu'à l'adresse du compte Resend.
   **Le formulaire ne marchera vraiment qu'une fois le domaine vérifié.**
5. **Ajouter la redirection www → apex.** Elle n'est pas dans `_redirects` :
   Cloudflare Pages fait correspondre les sources sur le chemin, pas sur le nom
   d'hôte. À créer en `Rules → Redirect Rules` : `www.nexaaweb.com/*` vers
   `https://nexaaweb.com/$1`, code 301.
6. **Pointer le domaine.** `Custom domains` sur le projet Pages, puis mettre à
   jour les enregistrements chez OVH. À faire en dernier, une fois le site
   vérifié sur l'URL `*.pages.dev`.
7. **Activer une mesure d'audience.** Cloudflare Web Analytics, dans le tableau
   de bord du projet : sans cookie, sans script à ajouter au dépôt, sans
   bannière de consentement. Sans elle, on sait de quelle page vient une demande
   mais pas combien de visiteurs il a fallu — voir P9 dans `docs/analysis.md`.
8. **Vérifier le raccourci Calendly.** Le champ « jour souhaité » construit une
   URL `?month=…&date=…`. Ces paramètres sont réputés supportés par Calendly
   mais je n'ai pas pu le confirmer depuis leur documentation : cliquez une fois
   avec une date pour vérifier que la page s'ouvre bien sur ce jour. Si elle
   l'ignore, le lien reste fonctionnel, il ouvre la page normale.
9. **Faire relire `/equipe` par les trois intéressés.** Noms, rôles et photos
   viennent de l'ancien site — donc déjà publics — mais chacun doit valider la
   description de ce qu'il fait, et le principe d'afficher sa photo.

### Fait depuis

- ~~Renseigner les montants~~ — `v1.8` : 1 190 € et 99 €/mois.
- ~~Ajouter une page « qui sommes-nous »~~ — `v2.2` : `/equipe`.
- ~~Décider du sort des maquettes~~ — `v2.7` : conservées, corrigées, et liées
  depuis les pages métier avec la mention « établissement fictif ».
- ~~Corriger les champs de `demo-le-grenier.html`~~ — `v2.7`.
