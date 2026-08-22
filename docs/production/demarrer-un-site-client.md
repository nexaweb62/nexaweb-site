# Démarrer un site client depuis ce dépôt

> Ce dépôt est le gabarit. Il n'y a pas de générateur : à trois sites au
> compteur, un script qui automatiserait la copie coûterait plus de temps à
> écrire et à corriger qu'il n'en ferait gagner — voir `analysis.md` § 6.3.
> Cette page décrit la manœuvre à la main. Comptez vingt minutes.

## 1. Copier le dépôt

```bash
git clone https://github.com/nexaweb62/nexaweb-site.git site-<client>
cd site-<client>
rm -rf .git && git init
npm install
```

## 2. Retirer ce qui appartient à Nexa Web

| À supprimer | Pourquoi |
|---|---|
| `src/pages/[metier].astro`, `src/config/metiers.ts` | Pages d'acquisition de l'agence |
| `src/pages/equipe.astro` | Sauf si le client a une équipe à présenter — dans ce cas, garder et réécrire `TEAM` |
| `src/pages/fiche-google-business.astro`, `src/config/guide.ts` | Contenu éditorial de l'agence |
| `public/demo-*.html` | Maquettes de démonstration |
| `public/_redirects` | **Sauf** si le client avait un site : y mettre alors ses anciennes URLs |
| `docs/` | Analyse économique de l'agence |
| `public/assets/equipe/`, `public/assets/hero.mp4`, `hero-poster.webp`, `og.jpg` | Médias de Nexa Web |
| `scripts/make-portraits.mjs` | Sauf si le client fournit des portraits |

Puis retirer de `src/pages/index.astro` les imports et les sections
correspondants (`METIERS`, le renvoi vers `/equipe`, le lien vers le guide), et
de `src/components/Footer.astro` la liste des métiers.

## 3. Ce qui reste, et qui fait tout le travail

| Fichier | Rôle |
|---|---|
| `src/config/site.ts` | **Le seul fichier à remplir.** Coordonnées, `LEGAL`, contenu des sections, FAQ |
| `src/styles/global.css` + `fonts.css` | Le système visuel, documenté dans `design-system.md` |
| `src/layouts/Base.astro` | Métadonnées, canonical, Open Graph |
| `src/components/` | En-tête, pied de page, formulaire, barre mobile, fil d'Ariane |
| `functions/api/contact.js` | Réception du formulaire. Reproductible tel quel, aucune dépendance |
| `scripts/` | Garde-fous : build, sitemap, audit, test du formulaire, images |

## 4. Remplir, dans cet ordre

1. `SITE` — nom, domaine, ville, e-mail, téléphone.
2. `LEGAL` — forme juridique, adresse, SIRET, directeur. **Le build reste
   bloqué tant que c'est vide** : c'est fait exprès.
3. `PRICING` — sans objet pour la plupart des sites clients : si le client
   n'affiche pas de prix, retirer la section tarifs de `index.astro` **et** le
   contrôle correspondant dans `scripts/check-build.mjs`.
4. `HERO`, `PROBLEMS`, `OFFER`, `FAQ` — le contenu, depuis les réponses du
   [questionnaire de démarrage](questionnaire-client.md).
5. `AREA` — les communes desservies, qui alimentent le balisage et le pied de
   page.
6. Médias : logo, affiche du premier écran (`npm run poster`), image de partage
   (`npm run og`).
7. `public/robots.txt` et `astro.config.mjs` — remplacer le domaine.

## 5. Vérifier avant de livrer

```bash
npm run build          # échoue si une mention légale ou un prix manque
npm run audit          # titres, alt, labels, liens et ancres morts, contrastes, vocabulaire
npm run test:contact   # le formulaire, sans navigateur
npx astro check        # typage
```

Puis dérouler la [checklist de mise en ligne](checklist-mise-en-ligne.md).

## 6. Ce qu'il ne faut pas faire

- **Ne pas modifier `global.css` pour un cas particulier.** Vérifier d'abord
  qu'un des dix gabarits existants ne convient pas (`design-system.md`). Un
  site client qui dérive du système est un site qu'on ne saura plus maintenir
  en série.
- **Ne pas retirer les scripts de garde-fou** pour aller plus vite. Ce sont eux
  qui rendent la relecture inutile, donc le projet rentable.
- **Ne pas réutiliser la vidéo de fond de Nexa Web.** Elle appartient à
  l'identité de l'agence, et son motif de code numérique n'a de sens pour
  aucun commerce.
