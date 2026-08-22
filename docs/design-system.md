# Système visuel

> Relevé sur `src/styles/global.css` au 22 août 2026. Ce document ne propose
> rien : il décrit ce que la feuille fait déjà, pour que le prochain site ne
> reparte pas de zéro et que celui-ci ne dérive pas.

## Le principe, en une phrase

**Aucune carte, aucun aplat, aucune ombre.** Le rythme de la page vient des
filets d'un pixel et du blanc, jamais d'un conteneur. Le gabarit « trois cartes
côte à côte » a été retiré en `v1.1`, avec la règle `.card` elle-même — c'est le
motif le plus banal du web généré, et il fait paraître trois idées différentes
comme trois produits interchangeables.

Trois exceptions, assumées et limitées : les cartes de prix, l'encadré qui
renvoie vers une maquette, et le calcul de seuil sous les prix. Chacune est un
aparté, pas une section.

## Couleurs

| Rôle | Valeur | Où |
|---|---|---|
| Fond | `#000000` | Partout. Le site est noir, pas « sombre » |
| Texte | `#ffffff` | Titres, mots mis en avant |
| Texte courant | `#8e8e8e` (`--muted`) | Paragraphes, listes. **6,41:1** sur noir |
| Prose | `#d0d0d0` (`--dim`) | Pages légales, chapeaux |
| Filet | `rgba(255,255,255,.12)` (`--hair`) | Toutes les séparations |
| Filet appuyé | `rgba(255,255,255,.24)` | Bordures de champs |
| Surface | `rgba(255,255,255,.02)` | Les trois exceptions ci-dessus |
| Accent chaud | `#e8926a` (`--warm`) | Rôles de l'équipe, mentions à compléter. **Jamais un bouton** |
| Accent rose | `#f0a8b8` (`--glow`) | Puces de la prose, uniquement |

Les deux accents sont prélevés sur la vidéo de fond. Ils ne servent jamais à
signaler une action : le seul bouton primaire du site est blanc sur noir.

`npm run audit` recalcule les contrastes à chaque exécution et refuse tout ce
qui passe sous 4,5:1.

## Typographie

Deux familles, auto-hébergées depuis `v2.0` (voir `src/styles/fonts.css`).

- **Cormorant** — affichage. Serif à très haut contraste, hauteur d'x de
  0,386 em. Titres, chiffres, prix.
- **Archivo** — interface. Tout le reste : texte courant, navigation, champs.

> **Si vous changez de serif, refaites le calcul.** Cormorant a remplacé
> Fraunces en `v1.5` : sa hauteur d'x étant 20 % plus basse, tous les corps
> d'affichage ont été majorés d'environ 12 %, facteur mesuré sur la hauteur de
> capitale. Reprendre ces tailles telles quelles avec une autre serif donne une
> typographie rabougrie ou énorme.

Échelle réelle, en `clamp(minimum, fluide, maximum)` :

| Usage | Taille |
|---|---|
| Titre du premier écran | 34 → 100 px |
| Chiffre de prix | 42 → 74 px |
| Code 404 | 80 → 210 px |
| Titre de section | 30 → 50 px |
| Titre de personne (équipe) | 26 → 38 px |
| Chapeau (`.lede`, `.split-note`) | 15 → 17 px |
| Titre d'item (`.offer-item`) | 17 → 21 px |
| Texte courant | 14 à 15 px, interligne 1,6 à 1,68 |
| Surtitre (`.eyebrow`), rôles | 11 à 12 px, majuscules, interlettrage 0,14 em |

## Espacement

Une seule règle structurante : `.section { padding: clamp(72px, 10vh, 132px) 0 }`
avec un filet supérieur. Tout le reste suit trois paliers — `clamp(14px…20px)`
entre un titre et son chapeau, `clamp(32px…56px)` entre un chapeau et le bloc
qui suit, `clamp(28px…56px)` de gouttière entre colonnes.

`.container` : `min(1120px, 100% - clamp(28px, 6vw, 64px))`.

## Gabarits disponibles

Avant d'écrire une nouvelle mise en forme, vérifier que l'un de ceux-ci ne
convient pas — c'est ainsi que le site garde son unité malgré treize pages.

| Classe | Forme | Utilisé par |
|---|---|---|
| `.split` + `.points` | Propos à gauche, liste à filets à droite | Constat, pages métier |
| `.offer-list` / `.offer-item` | Liste numérotée, un filet par ligne | Offre, contenu métier, étapes du guide |
| `.pledges` | Deux colonnes de promesses courtes | Engagements avant le prix |
| `.faq` (`<details>`) | Accordéon natif, sans JavaScript | Questions |
| `.price-grid` / `.price-card` | Deux cartes, exception assumée | Tarifs |
| `.contact-panel` | Bloc centré de fin de page | Contact, toutes pages |
| `.team-member` | Portrait et texte, alternés gauche-droite | Équipe |
| `.demo-note`, `.seuil` | Encadré discret, aparté | Maquettes, seuil de rentabilité |
| `.prose` | Texte long, puces roses | Pages légales |
| `.metier-liens`, `.fil` | Liens secondaires, fil d'Ariane | Pages internes |

## Mouvement

Une seule courbe : `--ease: cubic-bezier(0.22, 1, 0.36, 1)`. Les entrées se
font par `.anim` avec un délai porté par `--d`, en cascade de 60 à 90 ms.
Tout est annulé sous `prefers-reduced-motion`, y compris la vidéo de fond, qui
laisse alors la place à l'affiche.

## Ce qu'on s'interdit

- Une carte pour présenter trois idées côte à côte.
- Un dégradé radial derrière un bloc (retiré en `v1.2`).
- Inter comme police d'interface — devenue la signature de tout site généré.
- Un interlettrage négatif marqué sur les grands titres.
- Une couleur d'accent sur un bouton.
- Un mot qu'on ne dirait pas au téléphone à un boulanger. `npm run audit`
  vérifie une liste de termes indéfendables sur les treize pages.
