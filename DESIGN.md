---
version: alpha
name: Nexa Web
description: Site de l'agence web Nexa Web (Carvin, Hauts-de-France) — noir et or, titres en Bluu Next, texte en Schibsted Grotesk, contrôles en plaques à angles coupés.
colors:
  bg: "#0A0A0B"
  surface: "#121214"
  surface-2: "#1A1A1D"
  border: "#26262A"
  border-strong: "#3A3A40"
  text: "#F4F2EE"
  text-muted: "#86868B"
  text-subtle: "#86868B"
  accent: "#D4B36A"
  accent-text: "#D4B36A"
  accent-hover: "#E3C684"
  accent-active: "#B8974F"
  on-accent: "#0A0A0B"
  focus: "#E3C684"
  gold-low: "#5C4C24"
  plq-or: "#D4B36A"
  plq-or-haut: "#E3C684"
  plq-or-bas: "#B8974F"
  plq-or-encre: "#0A0A0B"
typography:
  title:
    fontFamily: Bluu Next
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.012em
  section:
    fontFamily: Bluu Next
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.008em
  sub:
    fontFamily: Bluu Next
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: -0.004em
  body:
    fontFamily: Schibsted Grotesk
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0.002em
  caption:
    fontFamily: Schibsted Grotesk
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0.01em
rounded:
  radius-block: 2px
  radius-tag: 2px
spacing:
  sp-1: 4px
  sp-2: 8px
  sp-3: 12px
  sp-4: 16px
  sp-5: 24px
  sp-6: 32px
  sp-7: 48px
  sp-8: 64px
  sp-9: 96px
  sp-10: 128px
  max-w: 1280px
  cut-sm: 5px
  cut-md: 7px
  cut-lg: 9px
components:
  button-primary:
    backgroundColor: "{colors.plq-or}"
    textColor: "{colors.plq-or-encre}"
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.plq-or-haut}"
  button-primary-active:
    backgroundColor: "{colors.plq-or-bas}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    height: 48px
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
---

# Nexa Web

## Overview

Site vitrine d'une agence web de deux personnes, à Carvin, qui fait des sites pour les commerçants et les artisans des Hauts-de-France. Le parti est celui de l'enseigne de boutique et de la plaque de laiton : un noir profond, un or sable mat, des titres à empattements francs, et des contrôles en forme de plaque. Le thème sombre est le défaut ; un thème clair existe et suit la préférence du système ou le choix du visiteur.

## Colors

Une seule couleur d'accent, l'or. Les valeurs ci-dessus sont celles du thème sombre ; le thème clair est donné plus bas.

- **Fonds (`bg`, `surface`, `surface-2`)** : trois paliers de noir, jamais le noir pur. Un bloc se distingue par un palier de fond, pas par une bordure.
- **Texte (`text`, `text-muted`, `text-subtle`)** : blanc chaud pour le texte, un seul gris pour tout le secondaire.
- **Or (`accent` et ses variantes)** : action principale, état actif, sélection. En thème clair, `accent` ne porte jamais de texte : c'est `accent-text` qui le fait.
- **Or de plaque (`plq-or`, `plq-or-haut`, `plq-or-bas`, `plq-or-encre`)** : la matière du bouton principal. Elle ne change pas avec le thème — le laiton est le même sur papier et sur noir.
- **`gold-low`** : le filet des plaques neutres.

Toute couleur littérale vit dans `src/styles/tokens.css` et nulle part ailleurs ; `npm run check:colors` le vérifie.

## Themes

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| bg | #0A0A0B | #FAF8F4 |
| surface | #121214 | #FFFFFF |
| surface-2 | #1A1A1D | #F1EDE5 |
| border | #26262A | #E3DDD0 |
| border-strong | #3A3A40 | #CFC7B5 |
| text | #F4F2EE | #141416 |
| text-muted | #86868B | #55514A |
| text-subtle | #86868B | #6E6960 |
| accent | #D4B36A | #A6822E |
| accent-text | #D4B36A | #7D6320 |
| accent-hover | #E3C684 | #8E6F26 |
| accent-active | #B8974F | #6B541B |
| on-accent | #0A0A0B | #141416 |
| focus | #E3C684 | #7D6320 |
| gold-low | #5C4C24 | #C6AE74 |
| plq-or, plq-or-haut, plq-or-bas, plq-or-encre | identiques | identiques |

## Typography

Deux familles, servies depuis `/fonts` sous licence SIL OFL, chacune avec un repli calibré en métrique pour que l'arrivée de la police ne décale pas la page.

- **Bluu Next** (Velvetyne) porte tous les `h1` à `h3`, les classes `.h-xl`, `.h-lg`, `.h-md`, `.h-sm`, et les éléments qui font un travail de titre sans en avoir la balise : noms de services, prix, grands numéros d'étape. Elle n'existe qu'en gras ; `font-synthesis` est coupé, le navigateur ne fabrique ni faux gras ni faux italique.
- **Schibsted Grotesk** porte le texte, les boutons, les étiquettes et les petits mots qui accompagnent un prix (« dès », « /mois »).
- Les titres qui ne sont que des étiquettes (`.svc-section-label`) restent en Schibsted : un empattement gras à très petite taille bouche les lettres.
- Les tailles de `title`, `section` et `sub` sont fluides entre le mobile et le bureau ; seul leur rapport est fixé.
- Pas de capitales espacées, pas de chasse fixe en guise d'étiquette « technique ».

## Layout

Une seule échelle d'espacement (`sp-1` à `sp-10`), aucune valeur arbitraire. Le contenu tient dans `max-w`, avec une gouttière fluide d'au moins 20 px.

## Shapes

- **Ce qui se clique** est une plaque : un rectangle aux quatre angles coupés à 45°, la facette du N du logo. La coupe dépend de la hauteur du contrôle : `cut-sm` sous 40 px, `cut-md` pour le bouton courant, `cut-lg` au-delà.
- **Ce qui contient** (cartes, panneaux, encadrés) est droit, à `radius-block`.
- **Ce qui étiquette sans être cliquable** est droit, à `radius-tag`.
- Il n'y a ni pilule, ni cercle cliquable. Les seuls ronds sont décoratifs : points d'état, roue de chargement.
- Un segment posé dans une plaque (sélecteur de langue, de thème, d'échéancier) a une coupe réduite pour rester parallèle à celle du groupe.

## Components

- **Bouton** : composant `src/components/ui/InteractiveButton.astro`, deux variantes — `gold` (action principale, une par écran) et `dark` (tout le reste). Un libellé, rien d'autre : pas de flèche, pas de copie de survol, pas de reflet.
- **Plaque hors composant** : classe `.plq` sur l'élément ; `.plq-or` pour l'or ; `.plq-fixe` pour une plaque qui contient des contrôles sans en être un (elle ne réagit ni au survol ni à l'appui) ; `.plq-sm` / `.plq-lg` pour la coupe.
- **États** : le survol change la teinte, et seulement avec une souris ; l'appui enfonce d'un pixel par `translate` et fonce l'or ; le focus clavier est un contour d'or décalé de 3 px.
- **Couleurs d'une plaque** : une page ne règle que `--pl-fond` et `--pl-filet`. La forme est peinte dans le fond de l'élément par `global.css`.
- **Envoi en cours** : la classe `loading` fait courir un filet le long du bas de la plaque ; sans mouvement, le bouton pâlit.

## Do's and Don'ts

- Don't écrire de couleur littérale hors de `src/styles/tokens.css`.
- Don't utiliser de vert : le succès prend l'or.
- Don't poser `background` ou `border` sur une plaque dans un style scopé : il pèse plus lourd que la plaque et l'efface.
- Don't ajouter de flèche à un libellé de bouton, ni dans la prop `text`, ni dans le dictionnaire de `public/i18n.js` ; `npm run check:fleches` le vérifie.
- Don't revenir aux pilules ni aux boutons ronds.
- Do garder chaque libellé au-dessus de 4,5:1 sur sa plaque ; `npm run check:glass` et `npm run check:contrast:rendered` le mesurent.
