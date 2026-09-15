# Refonte « Encre & Cuivre »

Refonte chromatique, système d'animations au scroll et visuels du site
nexaaweb.com. Le dégradé violet/indigo néon sur fond noir — la signature
visuelle des sites générés par IA — est remplacé par une encre bleu-nuit
et un accent cuivre, sobres et lisibles en mode clair comme en sombre.

---

## 1. Ce qui a changé, fichier par fichier

### Nouveaux

| Fichier | Rôle |
|---|---|
| `src/styles/tokens.css` | **Le seul fichier écrit à la main qui contient une couleur littérale.** Palette brute écrite une fois, puis 4 blocs sémantiques qui ne font qu'y pointer. |
| `public/motion.js` | Système de mouvement : un IntersectionObserver, un seul `requestAnimationFrame`, découpage des titres en lignes, compteurs, typographie française, pont tokens → JS. |
| `src/components/Picture.astro` | Image responsive AVIF/WebP/JPEG, dimensions lues sur le fichier réel (CLS = 0). |
| `scripts/check-colors.mjs` | Interdit toute couleur littérale hors du fichier de tokens. |
| `scripts/check-contrast.mjs` | Contraste des 72 paires texte/fond des deux thèmes. |
| `scripts/check-contrast-rendered.mjs` | Contraste **réellement rendu** : 2 352 éléments sur 21 pages × 2 thèmes. |
| `scripts/build-assets.mjs` | Favicon, icônes PWA, images OG et textures, générés **depuis les tokens**. |
| `scripts/build-images.mjs` | Chaîne d'images : 3 largeurs × 3 formats, budgets vérifiés par fichier servi. |

### Modifiés en profondeur

| Fichier | Ce qui a changé |
|---|---|
| `src/styles/global.css` | Réécrit. Échelle typographique 1,25, échelle d'espacement unique, boutons cuivre, en-tête intelligent, overlay opaque, système d'animations, et la liste des oubliés : `::selection`, scrollbar, placeholders, `:disabled`, autofill, `<hr>`, `:focus-visible`, lien d'évitement, `forced-colors`, `prefers-reduced-transparency`. |
| `src/components/Header.astro` | Sélecteur de thème 3 états en `radiogroup`, navigation plein écran avec piège de focus, `inert`, verrouillage du scroll sans saut de page. |
| `src/layouts/BaseLayout.astro` | Script bloquant avant rendu (thème + `js-enabled`), `meta color-scheme`, `theme-color` lu dans les tokens, manifeste PWA, OG par thème, lien d'évitement, barre de lecture. |
| `src/pages/index.astro` | Dégradé néon → ambiance encre & cuivre. Titres en reveal ligne par ligne, survol de la liste des services, tuiles de chiffres avec compteurs, section épinglée, filets tracés, textures de section. |
| `src/pages/tarifs.astro` | Shader WebGL plein écran (violet/rose/jaune à 72 % d'opacité) retiré : il écrasait la page et coûtait un `requestAnimationFrame` permanent. |
| `src/pages/equipe.astro` | Voiles photographiques unifiés (les 3 cartes avaient chacune sa teinte). Photos ré-encodées : 461 Ko → 13 Ko, 583 Ko → 14 Ko. |
| `src/pages/devis.astro`, `login`, `inscription`, `contact`, `404`, `avis`, `rendez-vous` | Toutes les couleurs en dur migrées. Canvas, WebGL et widget Calendly lisent les tokens et suivent la bascule de thème. |
| Les 5 pages service | Perdent leur accent propre (bleu, vert, orange, cyan, fuchsia) : le cuivre est l'accent unique du site. |

### Supprimés

- `public/og.svg` — halo et filet violets, remplacé par `og-image.png` et `og-image-light.png` générés.
- Les 156 lignes de GLSL du shader de `/tarifs`.
- `public/img/membre{1,2,3}.jpg` — remplacés par leurs dérivés AVIF/WebP/JPEG.

---

## 2. Table des tokens (ratios mesurés)

Chaque ratio est calculé sur la surface la plus défavorable où le token
peut atterrir, et vérifié par `npm run check:contrast`.

| Rôle | Token | Sombre | Ratio | Clair | Ratio |
|---|---|---|---|---|---|
| Fond global | `--bg` | `#0B0F14` | — | `#FBF9F6` | — |
| Surface élevée (cartes) | `--surface` | `#111720` | — | `#FFFFFF` | — |
| Surface 2 (survol, champs) | `--surface-2` | `#18202B` | — | `#F2EEE8` | — |
| Filet de séparation | `--border` | `#232C38` | — | `#E4DDD3` | — |
| Filet accentué | `--border-strong` | `#33404F` | — | `#CFC5B7` | — |
| Bordure de champ | `--field-border` | `#606D7C` | 3.64:1 <sub>/ --bg</sub> | `#8A8378` | 3.57:1 <sub>/ --bg</sub> |
| Texte principal | `--text` | `#EDF1F5` | 16.93:1 <sub>/ --bg</sub> | `#14191F` | 16.81:1 <sub>/ --bg</sub> |
| Texte secondaire | `--text-muted` | `#9AA7B4` | 6.69:1 <sub>/ --surface-2</sub> | `#4A5563` | 6.56:1 <sub>/ --surface-2</sub> |
| Texte tertiaire / labels | `--text-subtle` | `#7C8A99` | 4.65:1 <sub>/ --surface-2</sub> | `#626C7A` | 4.61:1 <sub>/ --surface-2</sub> |
| Accent cuivre (fonds, filets, icônes) | `--accent` | `#C8834A` | 6.22:1 <sub>/ --bg</sub> | `#A95F2C` | 4.58:1 <sub>/ --bg</sub> |
| Accent pour texte et liens | `--accent-text` | `#C8834A` | 5.31:1 <sub>/ --surface-2</sub> | `#8E4E22` | 5.57:1 <sub>/ --surface-2</sub> |
| Accent survol | `--accent-hover` | `#DB9A63` | — | `#8E4E22` | — |
| Accent pressé | `--accent-active` | `#AE6C38` | — | `#7A4219` | — |
| Texte sur accent | `--on-accent` | `#0B0F14` | 6.22:1 <sub>/ --accent</sub> | `#FFFFFF` | 4.82:1 <sub>/ --accent</sub> |
| Succès | `--success` | `#4C9A78` | 4.84:1 <sub>/ --surface-2</sub> | `#256345` | 6.16:1 <sub>/ --surface-2</sub> |
| Alerte | `--warning` | `#D6A24B` | 7.13:1 <sub>/ --surface-2</sub> | `#8A5E12` | 4.92:1 <sub>/ --surface-2</sub> |
| Erreur | `--danger` | `#D46A5C` | 4.70:1 <sub>/ --surface-2</sub> | `#B4453A` | 4.72:1 <sub>/ --surface-2</sub> |
| Anneau de focus | `--focus` | `#DB9A63` | 8.07:1 <sub>/ --bg</sub> | `#8E4E22` | 6.12:1 <sub>/ --bg</sub> |

### Trois corrections apportées à la palette fournie

| Token | Fourni | Retenu | Pourquoi |
|---|---|---|---|
| `--text-subtle` clair | `#66707E` | `#626C7A` | 4,34:1 sur `--surface-2` — sous le AA. |
| `--success` clair | `#2F7A58` | `#256345` | 4,49:1 sur `--surface-2`, puis 4,02:1 mesuré sur son propre panneau teinté. |
| `--field-border` | *absent* | `#606D7C` / `#8A8378` | WCAG 1.4.11 exige 3:1 pour la limite d'un champ ; `--border-strong` (filet décoratif, 1,5–1,8:1) n'a pas à tenir ce seuil et ne le tenait pas. |

### La règle qui compte

En mode clair, `--accent` (`#A95F2C`) plafonne à **4,17:1** sur
`--surface-2`. Il est réservé aux **fonds, bordures, filets et icônes
décoratives**. Tout **texte ou lien** en cuivre passe par `--accent-text`
(`#8E4E22`), qui tient sur les trois surfaces. 44 usages ont été basculés.
En mode sombre les deux tokens ont la même valeur : le composant s'écrit
une seule fois.

---

## 3. Garde-fous exécutables

```bash
npm run check                      # couleurs littérales + 72 paires de tokens
npm run check:contrast:rendered    # 2 352 éléments réellement rendus (site lancé)
npm run build:assets               # favicon, icônes, OG, textures — depuis les tokens
npm run build:images               # AVIF/WebP/JPEG + srcset + budgets
```

`check:colors` neutralise les commentaires avant de scanner : une couleur
n'est une faute que si c'est une **valeur**.

---

## 4. Critères d'acceptation

| Critère | État |
|---|---|
| 0 couleur en dur hors du fichier de tokens | ✅ vérifié par script |
| 0 violet / indigo / fuchsia (CSS, SVG, images, favicon, `theme-color`) | ✅ |
| Contraste : aucune paire sous 4,5:1 pour du texte courant | ✅ 72 paires + 2 352 éléments rendus |
| Aucun lien cuivre sur `--accent` en mode clair | ✅ garde-fou dans le script |
| Screenshots de chaque section, clair et sombre, desktop et mobile | ✅ 21 pages × 2 thèmes × 5 largeurs |
| Aucun flash au rechargement dans les deux thèmes | ✅ `data-theme` posé avant rendu |
| Bascule sur menu ouvert, FAQ ouverte, formulaire rempli | ✅ |
| Préférence système modifiée page ouverte, en mode « système » | ✅ suit en direct |
| Animations : une seule fois, dans le bon ordre, sans saut de layout | ✅ 0 rejeu mesuré |
| `prefers-reduced-motion` : tout visible et statique | ✅ 46/46 éléments |
| JS désactivé : tout le contenu reste visible | ✅ 0 élément masqué |
| Aucun scroll horizontal, gouttière ≥ 20 px | ✅ 0 px sur 5 largeurs |
| Version EN testée au même niveau que la FR | ✅ |
| **Lighthouse mobile ≥ 90 / 95 / 95 / 95, CLS = 0** | ⚠️ **non exécuté** — voir §5 |

---

## 5. Ce que je n'ai volontairement pas fait

**Les visuels photographiques (hero, 5 vignettes de services).**
La génération d'images requiert un abonnement payant : le compte est sur
l'offre gratuite avec 0 crédit, et l'API répond
*« Requires basic plan or higher »*. Je n'ai pas engagé de dépense.
Tout le reste de la section visuels est livré : favicon, icônes PWA,
images OG des deux thèmes, quatre textures de section — tous **générés
depuis les tokens**, donc impossibles à désynchroniser de la palette.
La chaîne d'accueil est prête : déposer les sources dans
`assets/sources/` avec le préfixe `hero-` ou `vignette-` puis lancer
`npm run build:images` produit les AVIF/WebP/JPEG, les `srcset`, les
dimensions et applique les budgets. `Picture.astro` n'attend plus qu'un
nom.

**Lighthouse.** L'environnement n'a pas accès au réseau sortant : les CDN
(Supabase, Calendly, d3, threejs-components) sont bloqués, ce qui fausse
tout score de performance. Les mesures que je pouvais faire honnêtement
sont faites : 0 scroll horizontal, 0 écouteur de scroll non throttlé, un
seul `requestAnimationFrame` global, `width`/`height` sur les images,
`content-visibility` instable retiré, shader plein écran supprimé,
962 Ko d'images économisés. À relancer sur l'environnement de
déploiement.

**`public/img/fondateur1.jpg` et `fondateur2.jpg`** (962 Ko) ne sont
référencés nulle part dans le code. Je ne les ai pas supprimés : ce sont
des photos de personnes, la décision vous revient. S'ils sont inutiles,
les retirer allège le déploiement d'autant.

**La branche.** Vous demandiez `refonte/encre-cuivre` ; les consignes de
cette session imposent de développer et pousser sur `astro-migration`,
qui n'est pas `main`. Le travail est donc sur `astro-migration`, en
4 commits atomiques. Dites-moi si vous voulez que je le rebase ailleurs.

**Le texte du site n'a pas été retouché**, hors ponctuation française
appliquée automatiquement (espaces fines insécables avant `? ! ; :`,
insécable avant `€`, apostrophes typographiques). La refonte était
chromatique et animée, pas éditoriale.
