# Nexa Web — analyse économique et analyse du site

> Document de travail, mis à jour au fil des cycles.
> Dernière mise à jour : 22 août 2026.
> Les chiffres chiffrés proviennent de `docs/modele-economique.mjs`, ré-exécutable
> par `node docs/modele-economique.mjs`. Toute hypothèse y est nommée en tête de
> fichier : si une hypothèse est fausse, corrigez-la là et relancez, le document
> se recalcule.

---

## 0. Statut et méthode

Ce document sépare volontairement trois natures d'information :

- **Mesuré** — relevé sur le dépôt ou sur une source publique, avec la date.
- **Modélisé** — calculé à partir d'hypothèses explicites.
- **Hypothèse** — une valeur choisie faute de donnée. À remplacer par du mesuré
  dès que possible.

Aucune donnée client, aucun chiffre de vente et aucune référence n'existe à ce
jour : tout ce qui touche à l'acquisition et au churn est donc de l'hypothèse.
C'est la principale faiblesse de cette analyse, et il faut la traiter comme
telle plutôt que comme une prévision.

---

## 1. Coût de production d'un site

### 1.1 Coût API — Claude Code

**Tarifs relevés le 22 août 2026** (API Anthropic, $/million de tokens) :

| Modèle | Entrée | Sortie |
|---|---:|---:|
| Claude Opus 5 | 5,00 $ | 25,00 $ |
| Claude Sonnet 5 | 3,00 $ (2,00 $ en tarif introductif jusqu'au 31/08/2026) | 15,00 $ (10,00 $ intro) |
| Claude Haiku 4.5 | 1,00 $ | 5,00 $ |

Deux mécanismes changent tout sur le coût réel :

- **Lecture de cache : 10 % du prix d'entrée.** Claude Code met le préfixe de
  conversation en cache. Sur une session longue, l'écrasante majorité des tokens
  d'entrée sont des relectures de cache, pas de l'entrée neuve.
- **Écriture de cache : 125 % du prix d'entrée**, une seule fois par bloc.
- L'API Batch est à −50 %, mais elle est asynchrone : inutilisable pour du
  développement interactif.

**Coût modélisé par site** (420/150/70 tours d'assistant, contexte moyen
85K/60K/45K tokens, 86–90 % servis par le cache) :

| Session | Opus 5 | Sonnet 5 |
|---|---:|---:|
| Premier site, design system compris | 75,0 $ · **69 €** | 45,0 $ · **41 €** |
| Site client, process rodé | 18,4 $ · **17 €** | 11,0 $ · **10 €** |
| Site client, industrialisé | 6,2 $ · **6 €** | 3,7 $ · **3 €** |

**Conclusion, et c'est la plus importante de cette section : le coût API est
négligeable.** À 10–17 € par site contre 810–1 125 € de temps humain, l'IA pèse
**1 à 2 % du coût de production**. Optimiser ce poste est une perte de temps.
Le seul arbitrage qui compte est de savoir si l'IA fait gagner des heures — et
la réponse est oui, massivement (section 2).

**Abonnement contre API.** Claude Max 5× coûte 100 $/mois (≈ 92 €). Au coût
Sonnet 5 « process rodé », la bascule se fait à **10 sites par mois** : en
dessous, l'API à l'usage est moins chère ; au-dessus, l'abonnement. En pratique,
prenez l'abonnement dès le départ pour la prévisibilité, et gardez une clé API
uniquement pour les automatisations.

### 1.2 Coût infrastructure

| Poste | Coût | Note |
|---|---:|---|
| Hébergement Netlify | 0 € | Le palier gratuit (100 Go/mois) suffit très largement pour un site vitrine de commerce local |
| Nom de domaine `.com` | ~12 €/an | OVH, renouvellement |
| Certificat TLS | 0 € | Let's Encrypt via Netlify |
| Supabase | 0 € | Palier gratuit, et l'espace client n'est pas dans le périmètre actuel |
| E-mail transactionnel | 0 € | Resend, 3 000 envois/mois gratuits |
| Calendly | 0 € | Palier gratuit suffisant pour un créneau de 30 min |

**Total infrastructure : environ 1 €/mois par site**, dominé par le domaine.

Coûts fixes de structure, indépendants du nombre de sites, à ne pas oublier :
abonnement Claude (92 €/mois), Google Workspace (~6 €/utilisateur/mois),
assurance RC professionnelle (~20 €/mois), comptabilité. Comptez **200 à
400 €/mois** de frais fixes pour trois personnes.

### 1.3 Coût humain

C'est 98 % du coût. Hypothèse retenue : **45 €/h chargé** — rémunération nette
visée, cotisations, et frais fixes répartis. *À faire confirmer par un
comptable : le taux de cotisations dépend du statut (micro-entreprise BIC/BNC,
SASU, EURL) et ce choix a plus d'impact sur la rentabilité que n'importe quelle
optimisation technique.*

### 1.4 Coût total par site

| Scénario | Production | Acquisition | IA | **Total** |
|---|---:|---:|---:|---:|
| Prudent (25 h) | 1 125 € | 297 € | 10 € | **1 432 €** |
| Réaliste (18 h) | 810 € | 297 € | 10 € | **1 117 €** |
| Optimisé (10 h) | 450 € | 297 € | 3 € | **750 €** |

L'acquisition est modélisée à 33 contacts pour 1 client signé et 12 min par
contact, soit 6,6 h de prospection par client. **Hypothèse — à mesurer dès les
30 premiers appels.** C'est le chiffre le plus incertain et le plus structurant
de tout le modèle.

---

## 2. Temps de création

Décomposition en heures, pour un site équivalent à celui-ci :

| Phase | Dev expérimenté, sans IA | Dev expérimenté + Claude Code | Débutant + Claude Code | Process industrialisé |
|---|---:|---:|---:|---:|
| Cadrage client | 1,5 | 1,5 | 2,5 | 1,0 |
| Collecte du contenu | 2,0 | 2,0 | 3,0 | 1,5 |
| Conception | 6,0 | 2,0 | 5,0 | 0,5 |
| Développement | 12,0 | 3,0 | 9,0 | 1,5 |
| Intégration contenu | 3,0 | 1,5 | 3,0 | 1,0 |
| Responsive | 3,0 | 1,0 | 3,5 | 0,5 |
| SEO initial | 2,5 | 1,5 | 3,0 | 1,0 |
| Performance | 1,5 | 0,5 | 1,5 | 0,3 |
| Tests | 2,0 | 1,0 | 3,0 | 0,7 |
| Corrections | 3,0 | 2,0 | 5,0 | 1,0 |
| Déploiement + DNS | 1,5 | 1,0 | 2,5 | 0,5 |
| Formation client | 1,0 | 1,0 | 1,5 | 0,8 |
| **Total** | **39,0** | **18,0** | **42,5** | **10,3** |

Trois observations qui comptent plus que les totaux :

1. **Claude Code divise par deux le temps total, pas par dix.** Le gain est
   concentré sur conception, développement et responsive — de 21 h à 6 h. Tout
   le reste (cadrage, collecte de contenu, corrections, formation) est du temps
   humain incompressible, et il représente **plus de la moitié** du travail une
   fois le processus rodé.

2. **Un débutant assisté par Claude Code est plus lent qu'un expérimenté sans
   IA** (42,5 h contre 39 h). L'IA amplifie une compétence, elle ne la remplace
   pas : sans le jugement pour repérer une mauvaise sortie, le temps part en
   corrections. C'est directement pertinent pour le recrutement du troisième
   associé.

3. **Le vrai levier d'industrialisation, c'est la collecte de contenu.** Passer
   de 18 h à 10 h ne vient pas d'écrire du code plus vite, mais d'un
   questionnaire client structuré, d'une bibliothèque de composants et d'une
   checklist de mise en ligne. Ce sont des tâches d'organisation, pas de
   développement.

**Ce premier site est hors barème** : environ 50 à 70 h, parce qu'il inclut la
création du système visuel, le choix des polices, la structure Astro et les
redirections. Cet investissement ne se refait pas.

---

## 3. Modèle à trois personnes

### 3.1 Répartition proposée

| Rôle | Responsabilités | Heures par client |
|---|---|---:|
| **A — Acquisition et relation client** | Prospection, appels découverte, closing, cadrage, collecte du contenu, formation, suivi | ~10 h (dont 6,6 h de prospection amortie) |
| **B — Production** | Développement, intégration, responsive, performance, déploiement, DNS | ~8 h |
| **C — Contenu, SEO et support** | Rédaction, photos, SEO local, fiche Google, tests, corrections, support de l'abonnement | ~6 h |

Le rôle A est le poste critique et le plus difficile à tenir : c'est celui qui
détermine le chiffre d'affaires.

### 3.2 Capacité

Capacité théorique : 3 personnes × 110 h productives/mois = **330 h/mois**
(110 h et non 151 h : réunions, administratif, formation, temps mort).

À 18 h par client, la capacité de production maximale serait de **18 sites par
mois**. Elle ne sera jamais atteinte, et c'est le résultat central de cette
analyse.

### 3.3 Les trois scénarios, au 12e mois

| | Prudent | Réaliste | Optimisé |
|---|---:|---:|---:|
| Sites par mois | 2 | 5 | 9 |
| Heures par site | 25 | 18 | 10 |
| Frais de lancement | 890 € | 1 190 € | 1 490 € |
| Abonnement | 79 €/mois | 99 €/mois | 129 €/mois |
| Parc au 12e mois | 20 clients | 51 clients | 92 clients |
| Revenu récurrent (MRR) | 1 612 € | 5 052 € | 11 848 € |
| CA mensuel total | 3 392 € | 11 002 € | 25 258 € |
| Marge brute | 508 € (15 %) | 5 365 € (49 %) | 18 413 € (73 %) |
| **Par personne, avant charges et impôts** | **1 117 €** | **3 633 €** | **8 379 €** |
| Charge de travail | 68 h (21 % de la capacité) | 136 h (41 %) | 172 h (52 %) |
| **Prospection à soutenir** | **66 contacts/mois** | **165 contacts/mois** | **297 contacts/mois** |

### 3.4 Ce que ces chiffres disent réellement

**Le goulot d'étranglement n'est pas la production, c'est l'acquisition.** Même
dans le scénario optimisé, l'équipe n'utilise que 52 % de sa capacité de
production. Personne n'est saturé par le développement. Ce qui limite le
chiffre d'affaires, c'est le nombre d'entreprises que l'on arrive à contacter,
qualifier et convertir — 14 contacts qualifiés par jour ouvré dans le scénario
optimisé, ce qui est un vrai métier à plein temps.

**Le scénario prudent n'est pas viable à trois à plein temps.** 1 117 € par
personne et par mois avant charges, c'est sous le SMIC. À ce niveau d'activité,
soit c'est une activité secondaire, soit c'est une personne seule, pas trois.

**Le scénario réaliste est le seuil de survie**, pas le confort : 3 633 € par
personne avant cotisations et impôt, soit environ 2 300–2 700 € net selon le
statut. Correct, sans plus, pour un an de travail à trois.

**La valeur est dans le parc, pas dans les lancements.** Au 12e mois du
scénario réaliste, le récurrent (5 052 €) est déjà au niveau des lancements
(5 950 €), et il continue de croître sans travail supplémentaire. Au 24e mois,
il domine largement. Le modèle d'abonnement est le bon choix — c'est ce qui
transforme une agence en actif.

**Corollaire : le churn est l'ennemi numéro un.** Le modèle suppose 3 %/mois,
soit une durée de vie de 33 mois. À 6 %/mois, la durée de vie tombe à 16 mois
et le parc au 12e mois passe de 51 à 43 clients — la marge brute du scénario
réaliste chute d'environ un tiers. Chaque euro dépensé à réduire le churn vaut
plus qu'un euro dépensé à acquérir.

### 3.5 Valeur client

| Scénario | Durée de vie | Valeur client | Coût | Ratio | Rentabilité |
|---|---:|---:|---:|---:|---|
| Prudent | 33 mois | 3 523 € | 1 432 € | 2,5× | après 7 mois d'abonnement |
| Réaliste | 33 mois | 4 490 € | 1 117 € | 4,0× | dès la mise en ligne |
| Optimisé | 33 mois | 5 790 € | 750 € | 7,7× | dès la mise en ligne |

Un ratio valeur/coût de 3× est généralement considéré comme le minimum sain.
Le scénario prudent à 2,5× est structurellement fragile : les frais de
lancement n'y couvrent même pas le coût d'acquisition et de production, et il
faut sept mois d'abonnement pour rentrer dans ses frais. **Si un client part au
bout de six mois, il a coûté de l'argent.**

---

## 4. Tarification recommandée

### 4.1 Ce que le modèle impose

Le prix plancher est fixé par le coût total par client et par le ratio
valeur/coût visé. Pour tenir un ratio de 3× minimum avec 18 h de production et
6,6 h de prospection :

- **Frais de lancement : 990 € à 1 490 €.** En dessous de 890 €, les frais de
  lancement ne couvrent pas le coût réel et chaque nouveau client creuse la
  trésorerie avant de la remplir. Recommandation : **1 190 €**, avec une
  version à 890 € réservée aux tout premiers clients en échange du droit de
  publier l'étude de cas.
- **Abonnement : 89 € à 149 €/mois.** Recommandation : **99 €/mois**, engagement
  12 mois. En dessous de 79 €, le récurrent ne compense pas le coût de support
  et la promesse « on s'en occupe » devient un centre de perte.

### 4.2 Ce que le marché supporte

Un restaurant de quartier réalise typiquement 200 000 à 500 000 € de chiffre
d'affaires annuel. 1 190 € de lancement + 99 €/mois représente environ
**2 400 € la première année**, soit 0,5 à 1 % du chiffre d'affaires. C'est
défendable si — et seulement si — la conversation porte sur le retour attendu :
« deux couverts supplémentaires par semaine remboursent l'abonnement ». Vendu
comme un coût technique, c'est trop cher ; vendu comme un investissement
commercial mesuré, c'est bon marché.

### 4.3 Prestations facturées à part

Conformément au plan : le budget publicitaire est payé **directement par le
client** à Google ou Meta, sans marge. Les prestations supplémentaires sont
devisées séparément — reportage photo (250–450 €), rédaction longue
(80 €/page), page additionnelle (150–250 €), campagne publicitaire pilotée
(300 €/mois de gestion).

### 4.4 Ce qu'il ne faut pas faire

- **Ne pas descendre sous 890 € de frais de lancement** pour décrocher un
  premier client. Le prix de lancement bas s'échange contre quelque chose — un
  témoignage, une étude de cas, une recommandation — jamais contre rien.
- **Ne pas proposer de site sans abonnement.** C'est exactement l'erreur de
  l'ancien site (« paiement unique, pas d'abonnement caché ») : elle produit un
  chiffre d'affaires non répétable et oblige à repartir de zéro chaque mois.
- **Ne pas facturer à l'heure.** Le client achète un résultat, et le modèle
  perd tout son intérêt dès que l'efficacité gagnée par l'IA réduit la facture.

---

## 5. Analyse du site — conversion, crédibilité, SEO

État analysé : commit `v1`.

### 5.0 Accessibilité — état vérifié

Contrôle automatisé sur les 7 pages générées : un seul `h1` par page,
hiérarchie de titres sans saut, toutes les images pourvues d'un `alt`, tous les
champs associés à un `label`, `lang="fr"` et `<title>` présents partout.

Contrastes mesurés sur fond noir : texte courant `#8e8e8e` à 6,41:1, chapeaux à
8,63:1, pilule de confiance à 8,30:1 — tous conformes AA. Deux échecs ont été
relevés et corrigés en `v1.3` : mentions du pied de page (2,69:1) et texte
indicatif des champs (2,26:1).

### 5.1 Ce qui fonctionne

- **Proposition de valeur lisible en cinq secondes.** « Votre commerce mérite
  d'être vu », suivi d'une phrase qui nomme la cible et les livrables. Le
  visiteur sait où il est.
- **Offre unique, clairement décomposée en cinq lignes.** Aucune formule à
  comparer, aucune paralysie du choix. C'est le principal progrès sur l'ancien
  site et ses trois formules.
- **Aucune preuve sociale fabriquée.** Pas de faux témoignages, pas de logos
  clients inventés, pas de « 2 000 entreprises nous font confiance ». La
  section « premiers projets » transforme l'absence de références en
  positionnement.
- **Poids maîtrisé** : 128 Ko sur mobile, la vidéo n'étant chargée qu'au-dessus
  de 720 px.

### 5.2 Problèmes identifiés, par priorité

| # | Problème | Impact | Effort |
|---|---|---|---|
| ~~P1~~ | ~~**Aucun formulaire.**~~ Corrigé en `v1.2` : formulaire à trois champs (nom, commerce, téléphone) traité par Netlify Forms, avec honeypot et page de confirmation. | Conversion | Fait |
| P2 | **Les prix ne sont pas renseignés.** La section affiche un placeholder. Tant que les montants manquent, la page ne peut pas convertir et le garde-fou de build bloque la mise en production. | Conversion | Bloqué — décision d'Elio |
| ~~P3~~ | ~~**Aucun balisage structuré.**~~ Corrigé en `v1.1` : JSON-LD `ProfessionalService` avec ville, région et zone desservie. | SEO local | Fait |
| ~~P4~~ | ~~**La section « constat » est en trois cartes.**~~ Corrigé en `v1.1` : bloc deux colonnes, gabarit `.card` supprimé de la feuille de style. | Différenciation | Fait |
| ~~P5~~ | ~~**Le hero ne dit pas où l'on est.**~~ Corrigé en `v1.1` : l'accroche nomme « les commerces de Carvin et des Hauts-de-France ». | SEO local, confiance | Fait |
| P6 | **Aucune objection traitée avant la FAQ.** Le prix arrive sans que la question « et si je ne suis pas satisfait » ait été adressée. | Conversion | Faible |
| P7 | **Pas de `LocalBusiness` ni de page « à propos ».** On ne sait pas qui est derrière Nexa Web. Pour un artisan qui achète à un artisan, c'est un manque de confiance direct. | Crédibilité | Moyen |

### 5.3 Ce qui « sent le site généré par IA », et ce qui a déjà été corrigé

Corrigé en `v1` :

- ~~Police d'affichage dot-matrix rétro~~ → Fraunces. Le style « terminal
  rétro » est un signal fort de gabarit technologique recopié, et il n'avait
  aucun rapport avec des restaurants.
- ~~Inter en police d'interface~~ → Archivo. Inter est devenue la police par
  défaut de tout site généré.
- ~~« Trusted by 2000+ Enterprises » avec les logos Microsoft, Amazon,
  Google~~ → ancrage local réel. C'était une affirmation fausse.
- ~~Chiffres décoratifs `< % * #`~~ → supprimés. Des glyphes sans signification
  posés pour remplir une grille.
- ~~Interlettrage à −0,09 em~~ → valeurs adaptées au serif. Le titre
  hyper-resserré est un tic de maquette d'IA.

Restant à corriger :

- ~~Les trois cartes de la section « constat »~~ Supprimées en `v1.1`, ainsi
  que le gabarit `.card` lui-même : il n'y a plus une seule carte sur le site.
- ~~Les gradients radiaux du panneau de contact.~~ Supprimés en `v1.2`.
- **Le vocabulaire.** « Expériences digitales », « sur-mesure » et autres mots
  d'agence n'ont aucun sens pour un boulanger. Le texte actuel est déjà
  largement corrigé sur ce point, mais chaque nouvelle section doit être relue
  avec cette grille.

---

## 6. Recommandations, par ordre de valeur

1. **Mesurer l'acquisition avant tout.** Le modèle repose sur « 33 contacts
   pour 1 client ». Les 50 premiers appels donneront le vrai chiffre. Si c'est
   80 contacts, tout le modèle change. Tenez un simple tableau : contacté,
   réponse, rendez-vous, signé.
2. **Renseigner les prix.** La page ne peut pas convertir sans eux.
3. ~~Ajouter un formulaire court.~~ Fait en `v1.2`.
4. ~~Ajouter le balisage `LocalBusiness`.~~ Fait en `v1.1`.
5. **Choisir le statut juridique avec un comptable.** L'écart de cotisations
   entre micro-entreprise et société pèse plus lourd que n'importe quelle
   optimisation de production.
6. **Ne pas recruter la troisième personne avant d'avoir atteint le scénario
   réaliste.** À deux, le scénario réaliste donne 5 450 € par personne au lieu
   de 3 633 €.

---

## 7. Journal des cycles

| Version | Date | Contenu | Raison |
|---|---|---|---|
| `v1` | 22/08/2026 | Refonte Astro, suppression du portfolio, typographie Fraunces/Archivo | Aucune réalisation à montrer ; la fonte dot-matrix et Inter signalaient un gabarit générique |
| `v1.1` | 22/08/2026 | JSON-LD `ProfessionalService`, ville en toutes lettres, section « constat » sortie du gabarit de cartes | Le référencement local était invisible ; les trois cartes étaient le motif le plus banal de la page |
| `v1.3` | 22/08/2026 | Contrastes du pied de page et du texte indicatif portés au niveau AA | 2,69:1 et 2,26:1 mesurés, sous le seuil de 4,5:1 |
| `v1.2` | 22/08/2026 | Formulaire de rappel à trois champs, page `/merci`, dégradé radial supprimé, politique de confidentialité corrigée | Seul chemin de conversion : Calendly ou téléphone, inutilisable le soir. La politique affirmait « aucun formulaire » — devenu faux |
