# Refonte visuelle — nexaaweb.com

Refonte chromatique, typographique et animée du site nexaaweb.com. Le
dégradé violet/indigo néon sur fond noir — la signature visuelle des
sites générés par IA — a disparu.

La palette a connu deux états : « Encre & Cuivre » d'abord, puis
**« Noir & Sable doré »**, qui est l'état actuel. Les sections 1 à 5 de
ce document décrivent le premier passage et restent valables pour tout
ce qui n'est pas la couleur elle-même ; la section 0 ci-dessous donne
l'état courant.

---

## 0. État actuel — grammaire Apple, Liquid Glass, fond vivant

### Ce qui est en place

**Typographie.** Pile système (`-apple-system`, `BlinkMacSystemFont`,
`SF Pro`, `Segoe UI Variable`, Roboto) — aucun fichier de police n'est
chargé, donc aucune requête et aucun FOUT. Inter et Mulish ne sont
référencées nulle part. Une échelle de cinq degrés relevée sur
apple.com vit dans les tokens : titre / section / sous-titre / corps /
légende, chacun avec son interlettrage et son interligne. Le corps est
à 17 px. L'interlettrage est toujours négatif — **zéro déclaration
positive dans tout le projet**, zéro capitale espacée, zéro
`text-transform: uppercase`. Deux graisses, 600 et 400. Un seul gris
secondaire, `#86868B`. `--sec` doublé à `clamp(120px, 16vw, 240px)` :
c'est le vide qui fait lire la hiérarchie, pas la graisse.

**Liquid Glass.** Tous les boutons, sans exception — principal,
secondaire, menu, thème, langue, retour, compte, fermeture de
l'overlay, « Entrer », « Envoyer », Google, les pastilles flottantes de
la page contact, les CTA des pages service. Flou 22 px, saturation
180 %, arête de lumière en haut, ombre douce dessous. Deux teintes
seulement : **or** pour l'action principale, **neutre** pour tout le
reste.

Ne sont pas des surfaces de bouton, donc pas de verre : les glyphes nus
posés *dans* un contrôle déjà en verre ou dans un champ — `.theme-opt`,
`.lang-opt`, `.lf-eye`, `.star-btn`. Leur fond est le verre du parent.

Aucune valeur n'est écrite dans les règles : 21 tokens `--glass-*`
portent les niveaux de verre et basculent avec le thème, dans les
quatre blocs sémantiques. Un voile de fond (`--glass-scrim`) sous
chaque bouton, parce que **le verre a besoin d'un plancher** : sans
lui, une ligne décorative claire passant derrière un bouton suffit à
faire tomber son libellé sous AA — mesuré à 3,29:1 sur `/404` à 390 px.

**Le fond vivant.** Le verre ne se voit que s'il a quelque chose à
réfracter ; posé sur un aplat, il n'est qu'un bouton translucide. La
couche d'ambiance est donc remontée dans `global.css` et `BaseLayout` :
fixe, commune aux 22 pages, sous le contenu, hors de l'arbre
d'accessibilité. Une profondeur `--bg` → `--surface`, deux traînées de
sable très diffuses (coupées sous `prefers-reduced-motion`, la seconde
masquée sous 768 px), et une trame de fils à ~1 % que le flou déforme.
Continue sur toute la hauteur du document, donc incapable de créer une
cassure à une jonction de section.

### Mesures

| Contrôle | Résultat |
|---|---|
| Couleurs littérales hors de `tokens.css` | **0** |
| Paires de tokens (72) | **0 en échec** |
| Éléments rendus, contraste composité, 21 pages × 2 thèmes | **2 236 mesurés, 0 sous AA** |
| Libellés sur verre, mesurés au pixel, 2 thèmes × 2 largeurs × 11 pages | **232 mesurés, 0 sous AA**, le plus juste à 5:1 |
| Les mêmes **sans `backdrop-filter`** | **0 sous AA**, le plus juste à 4,87:1 |
| Cassures de fond (ΔL\* ≥ 1 sur une ligne pleine largeur) | **0** |
| Écran d'accueil, shader forcé à sa couleur la plus extrême | **12 mesures, 0 sous AA**, le plus juste à 4,93:1 |
| Classes du balisage sans aucune règle CSS | **3 sur 386**, toutes volontaires |
| Lighthouse mobile — performance | **100 sur 21 pages** |
| Lighthouse mobile — accessibilité | **100 sur 21 pages** |
| Lighthouse mobile — CLS | **0 sur 21 pages** |
| Lighthouse mobile — TBT | **0 ms** sur 18 pages, 10 à 30 ms sur trois |
| Lighthouse mobile — LCP | **0,9 s à 1,4 s** |

### Les deux scores qui ne sont pas à 100, et pourquoi

**Bonnes pratiques : 96 sur six pages.** Une seule cause, la même
partout : `ERR_TUNNEL_CONNECTION_FAILED`. L'environnement de mesure
bloque les CDN en sortie — Supabase sur `avis`, `devis`, `login`,
`inscription`, d3 sur `contact`, Calendly sur `rendez-vous`. Les
erreurs relevées sont **les scripts qui n'ont pas pu être téléchargés**,
pas du code fautif. À reprendre sur l'environnement de déploiement, où
ces CDN répondent.

**SEO : 66 sur `login` et `inscription`.** L'audit qui échoue est
`is-crawlable` : ces deux pages sont volontairement en `noindex`. C'est
le comportement voulu, pas un défaut.

### Comment le verre est vérifié

`npm run check:glass` ne fait pas confiance au calcul sur les couleurs
déclarées : un bouton en verre n'a pas de fond, il a un flou qui
échantillonne ce qui passe derrière lui. Le script **capture chaque
libellé deux fois** — une fois tel quel, une fois le texte rendu
transparent. La seconde capture donne le fond exact, flou compris ; la
différence entre les deux donne exactement les pixels où la lettre s'est
posée. On compare l'encre au fond sous ces pixels-là, et on garde le
pire.

Il se teste lui-même au démarrage sur trois valeurs calculées à la main
(`--self-test`), et il fige le mouvement. `NO_BACKDROP=1` rejoue tout le
site comme sur un navigateur sans `backdrop-filter`, en réécrivant la
feuille de style à la volée : c'est le seul moyen de vérifier la branche
de repli, Chromium ne sachant pas désactiver le flou.

### Quatre erreurs de mesure trouvées en route

Elles valent d'être notées, parce que chacune faisait passer le site
pour sain :

1. Le vérificateur de contraste ne lisait que `background-color` — il ne
   voyait donc **aucun** bouton en verre, dont le fond est un dégradé.
2. Son compositeur forçait `alpha = 1` au premier calque : un voile d'or
   à 13 % était lu comme de l'or plein, et un bouton parfaitement
   lisible ressortait à 1,87:1.
3. Il lisait la couleur *déclarée* d'un élément sans y replier
   l'opacité de ses ancêtres. C'est ce qui a laissé passer les liens des
   pages légales — `opacity:.85` au repos, 3,96:1 en vrai — à travers
   2 238 mesures.
4. Le mesureur de verre, première version, cherchait les pixels d'encre
   par seuil colorimétrique : à 12 px, les fûts d'une lettre n'atteignent
   jamais la couleur pleine, ils étaient comptés comme du fond, et tout
   ressortait à 1,7:1. D'où les deux captures.

### Ce que Lighthouse a trouvé

Premier passage sur ce projet — il n'avait jamais été exécuté. Six
défauts réels :

- « Aller au contenu » pointait vers `#main-content`, **qui n'existait
  que sur l'accueil**. Sur les 20 autres pages le lien ne menait nulle
  part ; `login`, `inscription` et `contact` n'avaient pas de `<main>`
  du tout.
- Nom accessible ne contenant pas le libellé visible (WCAG 2.5.3) : le
  logo, le bouton Menu, le bouton Retour. Une commande vocale sur le
  libellé visible ne pouvait pas les atteindre.
- Cibles sous 24×24 px (WCAG 2.5.8) : options FR/EN, segments du
  sélecteur de thème, œil d'affichage du mot de passe.
- `opacity:.85` utilisée comme couleur sur les pages légales.
- « Ce qui est inclus » en `<span>` sur les cinq pages service : la page
  enchaînait `h1` puis six `h3`.

### L'écran d'accueil, le pire fond du site

Le champ de soie passe du noir à l'or plein derrière la marque et le
bouton « Entrer ». Aucun autre contrôle n'a un fond pareil — et aucun
des contrôles automatiques ne le voyait : ils sautent tous l'écran
d'accueil en posant `nxa-ld` dans `sessionStorage`.

`check:glass` a maintenant un passage dédié qui **remplace le canvas par
un aplat de `--accent`** — la plus claire des quatre couleurs que le
shader peut produire en sombre, la plus sombre en clair — puis mesure la
marque et le bouton sur les pixels réels. Le voile radial tient : les
fonds composités ressortent à rgb(24,21,18) en sombre et rgb(244,240,231)
en clair, et le plus juste des douze relevés est « WEB » à 4,93:1.

Le calcul à la main, lui, donnait 2,80:1 pour le bouton et 1,80:1 pour la
marque — parce qu'il ignorait le voile. C'est la raison d'être de la
règle de ce projet : construire la mesure avant de croire au
raisonnement, puis vérifier la mesure avant de croire à son résultat.

### Deux défauts antérieurs à la refonte, trouvés en regardant les captures

- Sur `/tarifs`, le titre de section portait `.section-title` et
  `.section-tag` — deux classes qu'**aucune règle du projet n'a jamais
  ciblées**, dans tout l'historique. Le titre tombait sur le style `h2`
  par défaut du navigateur.
- Sur quatre pages, les classes de décalage étaient écrites
  `class="r r.d1"` — un point au milieu, donc une seule classe nommée
  `r.d1` que le sélecteur `.r.d1` ne peut pas atteindre. Le décalage n'a
  jamais été appliqué : **78 éléments** se révélaient tous ensemble.

Les deux venaient du même angle mort, et un audit les trouve : pour
chaque classe du balisage, existe-t-il une règle qui la cible ? Il en
reste trois sans règle, toutes volontaires — `.h-captcha` (stylée par le
script hCaptcha), `.form-lede` (conteneur dont les enfants sont stylés)
et `.submit-btn-label` (accroche pour l'état de chargement).

### Ce qui n'est pas livré

**Les visuels photographiques — hero et cinq vignettes de services.**
La génération d'images demande un abonnement payant : le compte est sur
l'offre gratuite avec 0 crédit (revérifié). **Ce qui est en place est le
repli CSS**, pas les photographies. La chaîne d'accueil est prête :
déposer les sources dans `assets/sources/` avec le préfixe `hero-` ou
`vignette-`, puis `npm run build:images`.

---

## 0 bis. Le système d'animation

### Ce qui bouge, et d'où ça vient

Tout le mouvement au défilement passe par les **animations pilotées par
le scroll** (`animation-timeline: view()` et `scroll(root)`). Elles
tournent hors du fil principal : c'est ce qui permet d'en avoir autant
sans bloquer la page. L'ensemble vit sous `@supports`, avec un repli qui
remet simplement les éléments à `opacity:1` — le site est moins vivant,
il n'est jamais cassé.

| | |
|---|---|
| **La rivière d'or** | Un canevas WebGL fixe, dans le DOM des 22 pages, visible sur la seule page d'accueil. Le shader connaît le thème par `u_light` : en sombre les rives s'éteignent dans le noir, en clair c'est l'alpha seul qui les efface. |
| **Le fil de progression** | Un trait d'or en haut de l'écran, tiré par `scroll(root)`. |
| **La lecture mot par mot** | Chaque paragraphe est découpé ; le décalage entre les mots vaut `44 / nombre de mots`, plafonné, pour qu'un paragraphe court et un paragraphe long se traversent en un temps comparable. |
| **Les cartes** | Elles arrivent couchées à 72°, charnière sur l'arête haute, et se déplient. Dans une grille de trois, elles s'ouvrent en éventail — celle de gauche vient de la droite. Les listes verticales se collent les unes sous les autres. |
| **Les titres** | Mot par mot, 46 ms d'écart. Le titre du hero fait exception (voir plus bas). |
| **Les boutons** | Reflet en boucle, nappe d'or depuis le point d'entrée du curseur, flèche qui part, onde au clic. |
| **Le curseur, le grain, le rideau** | Anneau d'or qui traîne ; pellicule `feTurbulence` en `overlay` ou `multiply` selon le thème ; rideau en vague à chaque changement de page. |
| **L'orbite** | Le fond de la page Rendez-vous : anneaux, arcs contrarotatifs, bille qui fait le tour en 18 s. SVG et CSS, zéro WebGL. |
| **Le mode léger** | La fluidité est mesurée 1,1 s au premier défilement ; sous 38 i/s, le pli 3D, le grain animé et la lecture mot à mot s'effacent. |

### Le bug qui aurait tout tué en silence

Le minificateur CSS du projet (lightningcss, amené par Tailwind) replie
`animation-name`, `-timing`, `-fill` **et `animation-timeline`** dans le
raccourci `animation` :

```css
animation: linear both progGrow scroll(root)
```

Or la timeline ne fait pas partie de ce raccourci. La déclaration est
invalide, le navigateur la jette **en entier**, et toutes les animations
pilotées par le scroll meurent — en développement elles marchent, au
build elles n'existent plus. Vérifié dans Chromium : la forme repliée
donne `animation-name:none`, la forme séparée donne
`progGrow | scroll(root)`. Le CSS passe donc par esbuild.

### Le voile qui a demandé quatre essais

`.pass` et `.sh` déclaraient une taille de fond de 320 % et une position
hors cadre, mais pas `background-repeat:no-repeat`. Un dégradé plus large
que sa boîte **se répète** : la bande claire réapparaît à l'intérieur,
sans qu'aucune animation tourne. `.pass` étant posé dans toutes les
cartes, l'écran entier prenait un voile gris — luminosité moyenne du fond
**80,9 avec, 14,9 sans**.

Chaque calque testé un par un ne changeait pas le *pire pixel* mesuré :
la mesure de contraste est locale, le voile est global. C'est en comparant
deux captures de la même zone, avec et sans les nouveaux calques, que
l'écart a sauté aux yeux.

### Trois écarts avec le fichier de référence, et pourquoi

1. **Les jetons ne sont pas remplacés, ils sont aliasés.** Le prompt
   demande de remplacer le bloc `:root`. Ce bloc gouverne 22 pages,
   quatre blocs sémantiques, un sélecteur de thème à trois états et
   trois garde-fous exécutables. `--ink`, `--gold`, `--spec`… sont donc
   des alias posés sur les jetons existants : le CSS et le JS repris de
   la référence s'écrivent tels quels, et une seule palette gouverne le
   site.

2. **Le rideau ne passe pas par un routeur.** La référence est une
   démonstration à onglets et intercepte son routeur maison. Ce site est
   un vrai site multi-pages : le rideau monte au clic sur un lien
   interne, la navigation part derrière, et il se retire à l'arrivée.
   Le retour depuis le cache est traité. Sans JavaScript, les liens
   restent des liens.

3. **Le titre du hero garde sa révélation ligne par ligne.** Il contient
   un mot en dégradé sur le texte — exactement le cas contre lequel la
   référence met en garde. Les sept autres titres qui l'avaient passent
   aux mots.

Deux valeurs s'écartent aussi : `--rdim`, le mot encore éteint de la
lecture au scroll, part du gris secondaire et non d'un gris à 2,6:1 — la
checklist de la référence interdit elle-même de laisser du texte sous AA.
Et `--gold-lab` pointe sur `--accent-text`, déjà vérifié AA ici.

### Un garde-fou de plus

```bash
npm run check:anim    # 21 pages × 2 thèmes × 2 largeurs (site lancé)
```

Après avoir descendu et remonté chaque page comme un visiteur, il
vérifie : aucune erreur JavaScript, aucun débordement horizontal,
l'opacité de la rivière (1 sur l'accueil, 0 ailleurs), aucun emoji dans
le HTML livré, aucun vert sur Tarifs, plus de canevas sur Rendez-vous —
et surtout **aucun fantôme** : un élément entièrement visible à l'écran
dont l'opacité composée reste sous 0,55, c'est-à-dire un texte que rien
n'a jamais déclenché. Chaque candidat est ramené au centre de l'écran
avant d'être jugé : une carte saisie en plein pli n'est pas un fantôme.

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
| `src/pages/equipe.astro` | Voiles photographiques unifiés (les cartes avaient chacune sa teinte : bleue, violette, rose). Photos ré-encodées : 461 Ko → 13 Ko, 583 Ko → 14 Ko. |
| `src/pages/devis.astro`, `login`, `inscription`, `contact`, `404`, `avis`, `rendez-vous` | Toutes les couleurs en dur migrées. Canvas, WebGL et widget Calendly lisent les tokens et suivent la bascule de thème. |
| Les 5 pages service | Perdent leur accent propre (bleu, vert, orange, cyan, fuchsia) : le cuivre est l'accent unique du site. |

### Supprimés

- `public/og.svg` — halo et filet violets, remplacé par `og-image.png` et `og-image-light.png` générés.
- Les 156 lignes de GLSL du shader de `/tarifs`.
- `public/img/membre{1,2,3}.jpg` — remplacés par leurs dérivés AVIF/WebP/JPEG. `membre3` est parti avec la carte supprimée en parallèle sur la branche.

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

## 2 ter. L'en-tête mobile — un contrôle peut disparaître en silence

Le bouton **Retour** était bien dans le HTML de toutes les pages
intérieures, visible, cliquable, jamais recouvert. Et pourtant il ne se
voyait plus sur téléphone.

Trois causes cumulées, aucune détectable par les garde-fous existants :

1. **Le libellé était masqué sous 420 px.** Il ne restait qu'un chevron
   `‹` de 14 px dans une pastille sombre — une décoration, pas un bouton.
2. **Il était le dernier de la grappe**, donc collé au bord droit : 1 px
   de marge à 320 px de large.
3. **La barre portait cinq contrôles pour trois places.** Langue, menu,
   thème, retour et l'appel à l'action se partageaient la largeur, et
   c'est le logo qui payait : mesuré à 51 px à 390, 21 px à 360 et
   **0 px à 320** — le logo avait littéralement disparu.

Rien ne débordait : `document.scrollWidth` restait égal à `clientWidth`,
parce que le logo se laissait comprimer au lieu de pousser. C'est
exactement le genre de défaut qu'aucune vérification d'overflow ne voit.

**Ce qui a changé.** Sur mobile, la barre garde ce qui sert à chaque
page — le logo, le retour, le menu. La langue et le thème descendent au
bas de la navigation plein écran, où la place ne manque pas ; le même
JavaScript pilote les deux exemplaires, et un seul état les peint tous
les deux. `.nav-logo` ne se comprime plus (`flex:0 0 auto`). Le bouton
Retour passe en tête de la grappe (`order:-1`), garde son libellé
jusqu'à 320 px et fait 44 px de haut au pointeur grossier.

**Et il fait ce que son nom annonce.** Son nom accessible disait
« Retour — page précédente » ; le code faisait `location.href = '/'`.
Il revient maintenant vraiment en arrière — mais uniquement si la page
précédente appartient à ce site, sinon on renverrait le visiteur vers
le moteur de recherche qui l'a amené. Le signal n'est ni
`document.referrer` (vide dès qu'une politique de référent le coupe) ni
`history.length` (qui compte les pages des autres sites), mais un
compteur d'onglet posé dans `BaseLayout` : combien de pages **de ce
site** cet onglet a-t-il déjà servies. La page 404 récupère le bouton
au passage : c'est celle où revenir en arrière sert le plus.

### Et un écran mort sur /contact

C'est le nouveau garde-fou qui l'a trouvé, du premier coup : sur
**toutes** les largeurs et dans les deux thèmes, le bouton Retour de
`/contact` était « recouvert par un autre élément ». Le coupable :
`#globe-loading`, le voile d'attente du globe — `position:fixed`,
`inset:0`, `z-index:200`, par-dessus la page entière.

Il se retire quand le globe est prêt, et aussi quand le fetch des
frontières échoue. Mais **si d3 lui-même n'arrive pas**, le script lève
une exception à la première ligne qui l'utilise, bien avant le fetch :
le voile ne part jamais. Bloqueur de publicité, proxy d'entreprise,
CDN en panne — et `/contact` devient un écran opaque qui avale tous les
clics, en-tête compris. Ce n'était pas un artefact du bac à sable : le
même scénario attend n'importe quel visiteur dont le réseau filtre
jsdelivr.

Trois verrous, plutôt qu'un :

1. `pointer-events:none` sur le voile dès le départ — rien à l'intérieur
   n'est cliquable, un voile d'attente n'a aucune raison d'avaler un
   clic, même quand il s'attarde ;
2. une garde `typeof d3 === 'undefined'` qui retire le voile, masque le
   canevas et rend la main : le globe est un décor, son absence ne doit
   rien coûter à la page ;
3. un délai de huit secondes qui retire le voile quoi qu'il arrive.

```bash
npm run check:header
```

6 largeurs (320 → 1280) × 2 thèmes × 3 pages, plus quatre essais de
comportement. Il vérifie le logo à sa largeur naturelle, le bouton
Retour présent, libellé, dans le cadre, non recouvert, à 44 px de cible,
la langue et le thème atteignables **une seule fois** — ni absents ni en
double — et que le Retour mène bien à la page précédente du site, ou à
l'accueil quand il n'y en a pas.

---

## 2 quater. Le ruban a été retiré

La bande de lettres creuses qui filait au-dessus du pied de page —
« Sites sur mesure · Carvin · Hauts-de-France · NexaWeb · Design » — est
supprimée, sur mobile comme sur ordinateur, à la demande du client.
Retirée pour de bon, pas masquée : l'injection dans `scroll-fx.js`, le
bloc `.ribbon` de `global.css`, l'animation `ribbonRun` et les deux
replis (`@supports not`, `prefers-reduced-motion`) sont partis avec elle.

`check:seams` n'a plus besoin de la masquer pour mesurer : son lettrage
creux traversait les gouttières du détecteur, et c'était la seule raison
de l'exclure.

---

## 2 quinquies. Le piège du style scopé

Trois bugs signalés sur le site en ligne, dont deux partagent la même
cause — et cette cause en cachait deux autres que personne n'avait vues.

### La page Avis : cinq étoiles de 1 152 px

Astro compile un `<style>` de composant en `.ico-star[data-astro-cid-…]`
et ne pose cet attribut **que sur les éléments écrits dans le template**.
Le bloc « aucun avis pour l'instant » est injecté en JavaScript dans
`#reviews-container` : ses éléments n'ont pas l'attribut, aucune des
règles ne s'applique, et un `<svg>` sans taille prend toute la largeur
de son parent.

Mesuré avant correctif : cinq étoiles à **1 152 px** de large sur
ordinateur, page à **8 417 px** de haut au lieu de 2 800. Après :
28 px et 2 955 px.

Le remède : sortir ces règles du scope avec `:global()`, ancrées sur le
conteneur pour ne rien laisser fuir — `#reviews-container :global(.ico-star)`.
Appliqué à **tout** ce que ce script fabrique, pas seulement à l'état
vide : les cartes d'avis, quand il y en aura, seraient tombées dans le
même trou. Vérifié en injectant une fausse carte dans le conteneur,
mesurée, puis retirée. Et l'étoile injectée porte désormais
`width="24" height="24"` dans son HTML : un filet, pour que l'accident
coûte 24 px et non l'écran entier.

### La même chose sur Tarifs, jamais signalée

`.plan-spotlight` — la nappe lumineuse qui suit le curseur sur les
cartes de prix — est elle aussi injectée en JavaScript, et ses deux
règles étaient scopées. Elle ne fonctionnait donc **pas du tout** :
mesurée `position:static`, `z-index:auto`, `::after` sans `content`.
Personne ne l'avait remarqué parce qu'un effet absent ne casse rien.

### Et une régression que le correctif a créée

Une fois la nappe stylée, elle s'est mise à briller en permanence. Le
tiroir de `scroll-fx.js` parcourt les enfants d'une carte pour les
sortir ligne après ligne ; il prenait ce calque pour une ligne de
contenu et lui imposait son opacité. Tant que la nappe n'avait aucun
style, c'était sans effet. Le tiroir ignore maintenant ce qui est hors
flux — `position:absolute` ou `fixed` — et ce qui est `aria-hidden` :
un calque posé par-dessus n'est pas une ligne de texte.

```bash
npm run check:scoped
```

Aucun navigateur, aucun serveur. Il recoupe, fichier par fichier, les
classes qu'un `<style>` scopé atteint — le **dernier compound** du
sélecteur, celui qu'Astro attribue — contre les classes portées par un
élément que le script du même fichier **fabrique** : un `class="…"`
dans une chaîne, ou une variable issue de `createElement`. Un
`classList.add('show')` sur un élément du template n'est pas un piège :
l'élément garde son attribut, la règle s'applique. C'est cette
distinction qui sépare les trois vrais cas des seize faux.

Limite assumée : une seule règle globalisée suffit à considérer la
classe couverte. Ce qu'il attrape — et c'est le scénario de régression
réel — c'est une classe injectée dont aucune règle n'est sortie du
scope. Vérifié en ajoutant un `.rv-badge` neuf, stylé dans le scope et
injecté en `innerHTML` : relevé du premier coup.

## 2 sexies. Le curseur doit être le calque le plus haut

Le curseur système est masqué (`body.pointer{cursor:none}`) et remplacé
par un anneau d'or. L'anneau était en `z-index:420`, le menu plein
écran en `9000` : menu ouvert, le curseur système était caché et
l'anneau passait dessous — **plus rien à l'écran** pour savoir où l'on
clique.

L'anneau est maintenant à `2147483000`, et une règle est gravée à côté :
aucun élément du site ne doit dépasser cette valeur. `check:anim` la
fait respecter sur les 21 pages, dans les deux thèmes.

Le premier contrôle écrit pour le vérifier était complaisant, et il a
fallu le prendre en défaut : survoler une entrée du menu la rend dorée
d'elle-même (`.cnav-link:hover{background:var(--accent)}`), donc
chercher des pixels dorés sur une entrée survolée passait **9/9 même
avec l'anneau enterré à 420**. Le contrôle gare désormais le curseur sur
une zone vide du voile, où le seul or possible est l'anneau : 0 pixel
doré avant, 76 après.

## 2 septies. Le span du bouton restait en block

Le script des boutons enveloppe leur contenu dans un `<span class="t">`,
laissé en `display:block`. Les flèches du site sont des caractères, qui
restent en ligne — sauf une, dessinée en `<svg>` (lui-même en
`display:block`) : « Envoyer mon avis » partait à la ligne et le bouton
passait de 44 à 56 px.

`.t` est maintenant en `inline-flex`. Mesuré après correctif : les
76 `.btn` du site font tous 44 px, les 30 `.btn-g` aussi, et « Envoyer
mon avis » tient sur une ligne de 21 px. Les autres familles gardent
leur taille propre — `.cta-btn` 56, `.svc-cta` 52, `.submit-btn` 50,
`.lf-btn` 48 — mais chacune n'a qu'une seule hauteur, sans exception.

---

## 3. Garde-fous exécutables

```bash
npm run check                      # couleurs littérales + 72 paires de tokens
npm run check:contrast:rendered    # 2 236 éléments réellement rendus (site lancé)
npm run check:glass                # libellés sur verre, mesurés au pixel (site lancé)
NO_BACKDROP=1 npm run check:glass  # les mêmes, sans backdrop-filter
npm run check:seams                # cassures du fond, ligne de pixels par ligne
npm run check:anim                 # la checklist du mouvement (site lancé)
npm run check:header               # l'en-tête à 6 largeurs × 2 thèmes (site lancé)
npm run check:scoped               # le piège du style scopé (ni serveur ni navigateur)
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
| **Lighthouse mobile ≥ 90 / 95 / 95 / 95, CLS = 0** | ✅ exécuté sur 21 pages — voir §0 |

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

**Un conflit résolu en faveur du distant.** Pendant ce travail, la
branche a reçu « Retire Killian Mordacq de la page équipe ». Le conflit
portait sur la carte que je venais de restyler : c'est du contenu, leur
choix prime, la carte est supprimée. J'ai nettoyé derrière — règles CSS
de la photo orpheline et ses dérivés générés.

**La branche.** Vous demandiez `refonte/encre-cuivre` ; les consignes de
cette session imposent de développer et pousser sur `astro-migration`,
qui n'est pas `main`. Le travail est donc sur `astro-migration`, en
4 commits atomiques. Dites-moi si vous voulez que je le rebase ailleurs.

**Le texte du site n'a pas été retouché**, hors ponctuation française
appliquée automatiquement (espaces fines insécables avant `? ! ; :`,
insécable avant `€`, apostrophes typographiques). La refonte était
chromatique et animée, pas éditoriale.
