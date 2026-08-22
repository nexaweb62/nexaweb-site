# Nexa Web — analyse économique et analyse du site

> Document de travail, mis à jour au fil des cycles. **La synthèse est dans
> [`conclusions.md`](conclusions.md)** ; ce document-ci porte le détail.
> Dernière mise à jour : 22 août 2026, après le cycle `v2.5`.
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

#### 1.1.0 Ce que ce site a réellement coûté — **mesuré**

Les transcripts de Claude Code (`~/.claude/projects/…/*.jsonl`) enregistrent la
consommation de chaque échange. **`npm run cout` les additionne et applique les
tarifs publics** : relancez-le avant toute discussion de tarif, le chiffre du
jour vaut mieux qu'un chiffre recopié. Le tableau ci-dessous est une
photographie datée, pas une constante.

Relevé sur les quatre sessions qui ont produit ce site, du premier commit de la
refonte au cycle `v4.4` :

| | Valeur |
|---|---:|
| Sessions | 4 |
| Tours d'assistant | 1 073 |
| Tokens d'entrée | 204,1 M |
| — dont lus en cache | **98,1 %** |
| Tokens de sortie | 1,52 M |
| Modèle | Claude Opus 5 |
| **Coût total** | **162,90 $ ≈ 150 €** |

Trois conclusions, et ce sont des faits, pas des hypothèses :

1. **Le cache fait tout.** 98 % des tokens d'entrée sont des relectures de
   cache facturées 10 % du prix normal. La même conversation sans cache aurait
   coûté **1 058 $ au lieu de 163 $** — un facteur 6,5, que `npm run cout`
   affiche à chaque exécution. Toute pratique qui
   casse le cache — changer de modèle en cours de session, réordonner le
   contexte, redémarrer sans raison — multiplie la facture par cinq.
2. **Le coût par tour est stable : 0,152 $.** C'est le seul chiffre à retenir
   pour estimer un futur projet. Un site client demande 100 à 200 tours une
   fois le processus rodé, soit **15 à 30 $**.
3. **L'abonnement est rentable dès le premier site.** Claude Max 5× coûte
   100 $/mois. Ce seul site en a consommé 163 $ à l'usage, en une journée.
   Le calcul « bascule à 10 sites/mois » de la modélisation ci-dessous était
   faux parce qu'il sous-estimait le nombre de tours : la bascule est en
   réalité **au premier site sérieux du mois**. Prenez l'abonnement.

*Note de méthode : ce total inclut la conception du système visuel, les
tâtonnements et les impasses. Un site client ne les refera pas — voir la
projection en 1.1.2.*

#### 1.1.1 Tarifs de référence

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

#### 1.1.2 Projection pour les sites suivants

Recalculée sur le coût par tour **mesuré** (0,151 $ en Opus 5), et non plus sur
une estimation de contexte. Le rapport Opus/Sonnet est appliqué au prorata des
tarifs de sortie, poste dominant une fois le cache en place.

| Session | Tours | Opus 5 | Sonnet 5 |
|---|---:|---:|---:|
| Ce site, système visuel compris — **mesuré** | 1 062 | **160,61 $ · 148 €** | — |
| Site client, process rodé | 150 | 19,97 $ · **18 €** | 11,98 $ · **11 €** |
| Site client, industrialisé (gabarit + questionnaire) | 70 | 7,83 $ · **7 €** | 4,70 $ · **4 €** |

*Ces projections sortent de `docs/modele-economique.mjs`, dont l'estimation pour
ce site retombe à 0,5 % près sur la facture constatée. Le contrôle est affiché à
chaque exécution : si l'écart se creuse, c'est le modèle qu'il faut corriger.*

**Conclusion, et c'est la plus importante de cette section : le coût de l'IA
est négligeable, mais moins qu'on ne le croit.** À 9–20 € par site client
contre 810–1 125 € de temps humain, elle pèse **1 à 2 % du coût de production**.
Optimiser ce poste est une perte de temps. Le seul arbitrage qui compte est de
savoir si elle fait gagner des heures — et la réponse est oui (section 2).

**En revanche, le premier site a coûté 148 €, pas 10 €.** Un devis établi sur
« l'IA ne coûte rien » se trompe d'un facteur dix sur un projet inhabituel.
Retenez plutôt : *0,151 $ par tour d'assistant, et un projet neuf en demande
beaucoup plus qu'un projet répété*.

### 1.2 Coût infrastructure

| Poste | Coût | Note |
|---|---:|---|
| Hébergement Cloudflare Pages | 0 € | Palier gratuit, bande passante illimitée. Migré depuis Netlify en `v1.7` |
| Nom de domaine `.com` | ~12 €/an | OVH, renouvellement |
| Certificat TLS | 0 € | Fourni par Cloudflare |
| Supabase | 0 € | Palier gratuit, et l'espace client n'est pas dans le périmètre actuel |
| E-mail transactionnel | 0 € | Resend, palier gratuit. Reçoit les demandes du formulaire |
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
| Prudent (25 h) | 1 125 € | 297 € | 18 € | **1 440 €** |
| Réaliste (18 h) | 810 € | 297 € | 18 € | **1 125 €** |
| Optimisé (10 h) | 450 € | 297 € | 7 € | **754 €** |

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
| Marge brute | 491 € (14 %) | 5 324 € (48 %) | 18 379 € (73 %) |
| **Par personne, avant charges et impôts** | **1 112 €** | **3 620 €** | **8 367 €** |
| Charge de travail | 68 h (21 % de la capacité) | 136 h (41 %) | 172 h (52 %) |
| **Prospection à soutenir** | **66 contacts/mois** | **165 contacts/mois** | **297 contacts/mois** |

### 3.4 Ce que ces chiffres disent réellement

**Le goulot d'étranglement n'est pas la production, c'est l'acquisition.** Même
dans le scénario optimisé, l'équipe n'utilise que 52 % de sa capacité de
production. Personne n'est saturé par le développement. Ce qui limite le
chiffre d'affaires, c'est le nombre d'entreprises que l'on arrive à contacter,
qualifier et convertir — 14 contacts qualifiés par jour ouvré dans le scénario
optimisé, ce qui est un vrai métier à plein temps.

**Le scénario prudent n'est pas viable à trois à plein temps.** 1 112 € par
personne et par mois avant charges, c'est sous le SMIC. À ce niveau d'activité,
soit c'est une activité secondaire, soit c'est une personne seule, pas trois.

**Le scénario réaliste est le seuil de survie**, pas le confort : 3 620 € par
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
| Prudent | 33 mois | 3 523 € | 1 440 € | 2,4× | après 7 mois d'abonnement |
| Réaliste | 33 mois | 4 490 € | 1 125 € | 4,0× | dès la mise en ligne |
| Optimisé | 33 mois | 5 790 € | 754 € | 7,7× | dès la mise en ligne |

Un ratio valeur/coût de 3× est généralement considéré comme le minimum sain.
Le scénario prudent à 2,4× est structurellement fragile : les frais de
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
- **Abonnement : 89 € à 149 €/mois.** Recommandation : **99 €/mois**. En dessous
  de 79 €, le récurrent ne compense pas le coût de support et la promesse
  « on s'en occupe » devient un centre de perte.

> **Décision du 22/08/2026 — 1 190 € et 99 €/mois, affichés sur le site.**
>
> Ces montants correspondent au scénario « Réaliste » du § 3.3, ce qui rend le
> modèle cohérent : coût total par client 1 125 €, donc **les frais de lancement
> couvrent à eux seuls la production et l'acquisition**. Le client est rentable
> dès la mise en ligne, et tout mois d'abonnement est de la marge.
>
> C'est ce qui rend tenable la promesse « sans engagement de durée » affichée
> sur le site. Le calcul serait très différent à 890 € de lancement : il faudrait
> alors sept mois d'abonnement pour rentrer dans ses frais, et un départ au bout
> de six mois coûterait de l'argent. **Si vous consentez le tarif de lancement à
> 890 € pour les premiers clients, prenez l'engagement de 12 mois en échange.**

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

État analysé : commit `v2.5`.

### 5.0 Accessibilité et bonne santé — état vérifié en continu

Le contrôle n'est plus manuel : `npm run audit` relit les 12 pages produites et
échoue si l'une d'elles perd un `h1`, saute un niveau de titre, sert une image
sans `alt` ou sans dimensions, laisse un champ sans `label`, pointe un lien
interne mort ou double de poids. `npm run test:contact` vérifie les cinq
comportements de la fonction du formulaire, seul chemin de conversion du site.
Les deux tournent en quelques secondes, et le second a déjà rattrapé une
régression qui aurait fait perdre toutes les demandes.

Contrôle au 22/08/2026 : un seul `h1` par page, hiérarchie sans saut, toutes
les images pourvues d'un `alt` et de dimensions, tous les champs associés à un
`label`, `lang="fr"` et `<title>` présents partout, aucun lien interne mort.

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
| ~~P1~~ | ~~**Aucun formulaire.**~~ Corrigé en `v1.2`, mutualisé en composant et instrumenté en `v2.3` : il transporte sa page d'origine jusque dans l'objet de l'e-mail. | Conversion | Fait |
| ~~P2~~ | ~~**Les prix ne sont pas renseignés.**~~ Arrêtés le 22/08/2026 en `v1.8` : **1 190 € de lancement, 99 €/mois**, soit le scénario « Réaliste » modélisé ci-dessus. | Conversion | Fait |
| ~~P3~~ | ~~**Aucun balisage structuré.**~~ Corrigé en `v1.1`, enrichi en `v2.1` : montants repris de `PRICING`, communes desservies, `FAQPage`, `Service` par métier, tous rattachés à une seule entité par son `@id`. | SEO local | Fait |
| ~~P4~~ | ~~**La section « constat » est en trois cartes.**~~ Corrigé en `v1.1`. | Différenciation | Fait |
| ~~P5~~ | ~~**Le hero ne dit pas où l'on est.**~~ Corrigé en `v1.1`. | SEO local | Fait |
| ~~P6~~ | ~~**Aucune objection traitée avant la FAQ.**~~ Corrigé en `v1.9` : quatre engagements posés juste avant la grille de prix — propriété, absence d'engagement, délai, interlocuteur unique. | Conversion | Fait |
| ~~P7~~ | ~~**On ne sait pas qui est derrière Nexa Web.**~~ Corrigé en `v2.2` : page `/equipe`, trois associés, portraits, rôles. | Crédibilité | Fait |
| ~~P8~~ | ~~**Aucun chemin de conversion sur mobile avant le bas de page.**~~ Corrigé en `v1.9` : barre flottante « Appeler / Être rappelé », effacée sur le premier écran et sur la section contact. | Conversion mobile | Fait |
| **P9** | **Aucune mesure d'audience.** On sait maintenant de quelle page vient une demande, mais pas combien de visiteurs il a fallu pour l'obtenir. Sans dénominateur, impossible de dire si une page métier fonctionne. Cloudflare Web Analytics s'active côté tableau de bord, sans cookie, sans script tiers dans le dépôt, et sans bannière de consentement. | Pilotage | Faible |
| **P10** | **Une seule offre visible, aucun palier d'entrée.** Un commerçant qui trouve 1 190 € trop cher n'a rien d'autre à regarder : il part. Un audit payant de la fiche Google à 150–250 €, débité des frais de lancement en cas de suite, capterait une partie de ces départs — et se vend au téléphone. Décision commerciale, pas technique. | Conversion | Moyen |
| **P11** | **Les deux maquettes `demo-*.html` traînent des champs sans `label`.** Elles sont hors index mais servent à la prospection : une démonstration montrée à un prospect ne devrait pas porter ce défaut. Elles sont hors périmètre de `npm run audit`, ce qui est précisément pourquoi personne ne l'a vu. | Crédibilité | Faible |
| **P12** | **Aucune preuve, et c'est structurel.** Le site l'assume honnêtement, mais la première étude de cas publiée vaudra plus que n'importe quelle amélioration listée ici. Elle est bloquée sur le premier client, pas sur le site. | Conversion | — |

### 5.3 Ce qui « sent le site généré par IA », et ce qui a déjà été corrigé

Corrigé en `v1` :

- ~~Police d'affichage dot-matrix rétro~~ → Cormorant (Fraunces en `v1`, puis
  Cormorant en `v1.5`). Le style « terminal
  rétro » est un signal fort de gabarit technologique recopié, et il n'avait
  aucun rapport avec des restaurants.
- ~~Inter en police d'interface~~ → Archivo en `v1`, puis **Bricolage Grotesque
  en `v4.5`**. Le remplacement d'Inter par Archivo ne réglait qu'à moitié le
  problème : Archivo appartient à la même famille de grotesques neutres et se
  confond avec elle à l'œil nu. Bricolage a un dessin qu'on reconnaît.
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
- ~~**Le vocabulaire.**~~ La règle est désormais vérifiée par `npm run audit`
  sur les treize pages, avec une liste de termes indéfendables — « expérience
  digitale », « clé en main », « à 360 », « booster votre visibilité ». Le site
  est propre, maquettes comprises.

- **La vidéo de fond, elle, reste un signal technologique.** Son motif de
  chiffres et de code est exactement le cliché « tech » que le reste de la
  refonte a chassé, et il n'a aucun rapport avec un restaurant ou une
  boulangerie. Elle est belle, elle est légère (1,2 Mo, jamais chargée sur
  mobile), et elle a été fournie avec le spec — mais un plan de rue, une
  devanture au petit matin ou une salle qui se remplit diraient le métier au
  lieu de dire l'agence. **Point à trancher par Elio** : le remplacement est
  sans risque technique, l'affiche et le fond de secours suivent
  automatiquement (`npm run poster`, `npm run og`).

---

## 6. Industrialisation de la production

La section 2 conclut que le passage de 18 h à 10 h par site ne vient pas d'un
code écrit plus vite, mais d'organisation. Voici ce qui existe maintenant dans
le dépôt, et ce qui manque encore.

### 6.1 Ce qui est en place

| Actif | Ce qu'il fait gagner |
|---|---|
| `src/config/site.ts` | Tout le texte et les coordonnées en un fichier. Changer de client, c'est réécrire ce fichier, pas chercher dans les gabarits |
| `src/config/metiers.ts` | Une page métier = une entrée dans un tableau. Le gabarit `[metier].astro` fait le reste |
| `src/components/ContactForm.astro` | Un seul formulaire, réutilisé partout, qui sait d'où il vient |
| `functions/api/contact.js` | Réception des demandes sans service tiers. **Reproductible tel quel chez chaque client** — c'est un actif, pas une dépendance |
| `npm run audit` | Douze pages relues en deux secondes. Supprime la relecture manuelle avant mise en ligne |
| `npm run test:contact` | Le chemin de conversion vérifié sans navigateur ni déploiement |
| `npm run build` | Refuse de publier des prix non renseignés, régénère le sitemap depuis les pages réelles |
| `scripts/make-og.mjs`, `make-portraits.mjs` | Images de partage et portraits normalisés, sans outil externe |
| `public/fonts/` + `src/styles/fonts.css` | Polices auto-hébergées : plus aucun appel tiers, et un souci RGPD de moins à expliquer au client |

### 6.2 Ce qui manque, par ordre de rendement

1. **Le questionnaire de collecte de contenu.** C'est le premier poste de temps
   perdu : on attend des textes et des photos que le client ne sait pas quoi
   envoyer. Un questionnaire qui demande exactement ce qu'il faut, dans l'ordre
   où le site le consomme, vaut plusieurs heures par projet. **À écrire en
   premier.**
2. **La checklist de mise en ligne.** DNS, vérification du domaine chez Resend,
   variables d'environnement, fiche Google, redirections, test du formulaire en
   conditions réelles. Aujourd'hui, cette liste n'existe que dans `NOTES.md`, et
   seulement pour ce site-ci.
3. ~~Le gabarit de départ pour un site client.~~ Documenté en `v4.1` :
   [`production/demarrer-un-site-client.md`](production/demarrer-un-site-client.md)
   décrit ce qu'on retire, ce qu'on remplit et dans quel ordre. **Volontairement
   pas de script** : à trois sites au compteur, un générateur coûterait plus à
   écrire et à corriger qu'il ne ferait gagner. À reconsidérer au cinquième.
4. **La bibliothèque de sections.** Carte de restaurant, grille horaires,
   galerie, zone d'intervention : quatre ou cinq blocs qui reviendront dans
   presque tous les projets. À extraire au deuxième ou troisième site — pas
   avant, sous peine d'abstraire des cas qu'on n'a pas encore vus.

### 6.3 Le piège à éviter

L'industrialisation a une limite nette : **elle ne s'applique qu'à la part du
travail qui est déjà rapide.** Le tableau de la section 2 le montre — cadrage,
collecte, corrections et formation représentent plus de la moitié du temps une
fois le processus rodé, et aucun script ne les réduit. Passer une journée à
outiller la production pour gagner vingt minutes par site est une erreur de
priorité tant que le carnet n'est pas plein. La bonne séquence est : vendre,
mesurer où le temps part réellement, outiller ensuite.

---

## 7. Recommandations, par ordre de valeur

Révisées après les cycles `v1.9` à `v2.5`. Les points techniques du site sont
désormais traités : ce qui reste est presque entièrement commercial, et c'est
le vrai message de cette analyse.

1. **Mesurer l'acquisition avant tout.** Le modèle repose sur « 33 contacts
   pour 1 client ». Les 50 premiers appels donneront le vrai chiffre. Si c'est
   80 contacts, tout le modèle change. Tenez un tableau : contacté, réponse,
   rendez-vous, signé. Le formulaire vous donne déjà la page d'origine de
   chaque demande — c'est la moitié de la mesure.
2. **Activer une mesure d'audience** (P9). Sans nombre de visiteurs, la
   provenance des demandes ne se transforme pas en taux de conversion, et on ne
   saura pas si une page métier mérite d'être répliquée. Cloudflare Web
   Analytics, sans cookie ni bannière, s'active en trois clics.
3. **Décrocher le premier client et publier l'étude de cas** (P12). Elle vaudra
   plus que tout ce qui figure dans cette liste. Le tarif de lancement à 890 €
   est fait pour ça — mais il s'échange contre le droit de publier, et contre
   un engagement de douze mois (§ 4.1), jamais contre rien.
4. **Choisir le statut juridique avec un comptable.** L'écart de cotisations
   entre micro-entreprise et société pèse plus lourd que n'importe quelle
   optimisation de production.
5. **Écrire le questionnaire de collecte de contenu** (§ 6.2). Premier poste de
   temps perdu, et le seul levier d'industrialisation qui rapporte avant le
   dixième site.
6. **Ne pas recruter la troisième personne avant d'avoir atteint le scénario
   réaliste.** À deux, le scénario réaliste donne environ 5 430 € par personne
   au lieu de 3 620 €.
7. **Prendre l'abonnement Claude plutôt que l'API** (§ 1.1.0). Mesuré, pas
   supposé : 129 $ consommés en une journée sur un seul projet, contre 100 $
   par mois pour l'abonnement.
8. **Envisager un palier d'entrée payant** (P10) — audit de fiche Google à
   150–250 €, déduit des frais de lancement si le client donne suite. C'est la
   seule idée de cette liste qui augmente le nombre de clients sans augmenter
   le nombre d'appels.

---

## 8. Journal des cycles

| Version | Date | Contenu | Raison |
|---|---|---|---|
| `v1` | 22/08/2026 | Refonte Astro, suppression du portfolio, typographie Fraunces/Archivo | Aucune réalisation à montrer ; la fonte dot-matrix et Inter signalaient un gabarit générique |
| `v1.1` | 22/08/2026 | JSON-LD `ProfessionalService`, ville en toutes lettres, section « constat » sortie du gabarit de cartes | Le référencement local était invisible ; les trois cartes étaient le motif le plus banal de la page |
| `v1.2` | 22/08/2026 | Formulaire de rappel à trois champs, page `/merci`, dégradé radial supprimé, politique de confidentialité corrigée | Seul chemin de conversion : Calendly ou téléphone, inutilisable le soir. La politique affirmait « aucun formulaire » — devenu faux |
| `v1.3` | 22/08/2026 | Contrastes du pied de page et du texte indicatif portés au niveau AA | 2,69:1 et 2,26:1 mesurés, sous le seuil de 4,5:1 |
| `v1.4` | 22/08/2026 | Suppression de l'ancien site : 104 fichiers, 20 108 lignes. `NOTES.md` réécrit | Le nouveau site n'appelait plus aucun de ces fichiers. `NOTES.md` était le seul inventaire des comptes : il liste désormais les services à résilier |
| `v1.6` | 22/08/2026 | Créneau de rappel et raccourci Calendly par date | Un restaurateur ne peut pas décrocher pendant le service |
| `v1.8` | 22/08/2026 | Prix affichés : 1 190 € de lancement, 99 €/mois | Décision d'Elio, conforme au scénario « Réaliste ». Le garde-fou de production ne bloque plus |
| `v1.7` | 22/08/2026 | Sortie de Netlify : Cloudflare Pages, `_redirects` / `_headers`, formulaire en fonction maison + Resend | Choix d'Elio. Le formulaire maison est reproductible pour les sites clients — un actif plutôt qu'une dépendance |
| `v1.5` | 22/08/2026 | Cormorant remplace Fraunces, corps d'affichage recalculés | Choix d'Elio. La hauteur d'x plus basse de 20 % imposait de majorer les corps de 12 %, sans quoi la typographie paraissait rabougrie |
| `v1.9` | 22/08/2026 | Barre d'action mobile ; quatre engagements posés avant la grille de prix | Sous 720 px, le seul chemin de conversion était en bas de page. Et le montant arrivait sans qu'aucune objection ait été levée (P6) |
| `v2.0` | 22/08/2026 | Polices auto-hébergées, plus aucun appel tiers | Feuille distante bloquant le rendu, deux connexions tierces avant le premier octet de police, et l'IP de chaque visiteur transmise à Google |
| `v2.1` | 22/08/2026 | `noindex` sur les pages de service, sitemap généré depuis `dist/`, balisage enrichi, image de partage JPEG | `/merci` était indexable ; le sitemap manuel ne suivait pas les pages ajoutées ; le balisage ignorait prix et communes ; l'image WebP n'apparaissait pas sur LinkedIn |
| `v2.2` | 22/08/2026 | Page `/equipe` : trois associés, portraits, rôles | P7, dernier problème ouvert de l'audit. Un artisan qui achète à un artisan veut savoir à qui il parle |
| `v2.3` | 22/08/2026 | Trois pages métier, formulaire mutualisé et instrumenté, `npm run audit`, `npm run test:contact` | L'acquisition est le goulot du modèle, pas la production. Une page unique ne se positionne que sur une requête |
| `v2.4` | 22/08/2026 | Feuille de style posée dans la page, vidéo repoussée au temps mort | 1,2 Mo décoratifs en concurrence avec le premier écran, et une requête bloquante avant le premier rendu |
| `v2.5` | 22/08/2026 | Analyse mise à jour : coût API mesuré, section industrialisation, audit conversion réactualisé | Le coût de l'IA était modélisé ; il est désormais relevé sur les transcripts — 128,80 $, dix fois l'estimation par site |
| `v2.6` | 22/08/2026 | Questionnaire de démarrage et checklist de mise en ligne | Le levier d'industrialisation identifié depuis le début n'avait aucune traduction opérationnelle |
| `v2.7` | 22/08/2026 | Maquettes corrigées et liées depuis les pages métier | Deux démonstrations existaient, n'étaient liées de nulle part, et leurs champs n'avaient pas de label |
| `v2.8` | 22/08/2026 | Barre d'action et fil d'Ariane sur les pages d'atterrissage | La barre n'existait que sur l'accueil, alors que les pages métier sont celles où l'on arrive depuis Google |
| `v2.9` | 22/08/2026 | `docs/conclusions.md` : la synthèse en une page | 530 lignes d'analyse mélangeaient le détail des calculs et les décisions |
| `v3.0` | 22/08/2026 | Audit : classes sans style, contrastes calculés. Section « premiers projets » réparée | Faute de navigateur, il fallait un contrôle qui remplace le coup d'œil. Il a trouvé une section sans mise en forme depuis `v1.1` |
| `v3.1` | 22/08/2026 | Audit : ancres mortes et règles CSS sans emploi. Lien mort corrigé dans une maquette | Même famille de défaut : un renommage à moitié fait ne proteste jamais |
| `v3.2` | 22/08/2026 | Guide « fiche Google Business », balisage HowTo | L'offre inclut la fiche Google, rien ne montrait qu'on sait de quoi on parle. Requête tapée avant même de chercher une agence |
| `v3.3` | 22/08/2026 | Politique de confidentialité corrigée, sitemap daté depuis git, maillage vers le guide | La politique décrivait un appel à Google Fonts supprimé en `v2.0`, et parlait d'un seul formulaire |
| `v3.4` | 22/08/2026 | Mentions légales obligatoires : objet `LEGAL`, pastilles visibles, blocage en production | Un site professionnel sans SIRET ni adresse de siège est en infraction (LCEN art. 6 III) |
| `v3.5` | 22/08/2026 | Affiche du hero à 56 Ko, contrôle du vocabulaire d'agence, 404 utile | Le premier écran mobile pesait 94 Ko pour un fond flou ; la règle éditoriale n'était vérifiée que par relecture |
| `v3.6` | 22/08/2026 | Seuil de rentabilité sous les prix | L'argument « ce que ça doit rapporter » n'existait que dans ce document |
| `v3.7` | 22/08/2026 | Focus piégé dans le menu mobile, chiffres d'IA réactualisés | Le panneau se déclare `aria-modal` mais laissait la tabulation partir derrière l'overlay |
| `v4.0` | 22/08/2026 | Montants injectés depuis `PRICING`, audit de cohérence tarifaire | Les descriptions des pages métier portaient les prix en clair : elles auraient menti au premier changement |
| `v4.1` | 22/08/2026 | `production/demarrer-un-site-client.md`, note sur la vidéo de fond | Le gabarit de départ n'était décrit nulle part ; le motif de code de la vidéo reste un signal « tech » |
| `v4.2` | 22/08/2026 | Modèle économique recalibré sur la mesure, double comptage du cache corrigé | Le script surestimait de 16 % : il comptait l'écriture de cache deux fois. Il se contrôle désormais contre la facture réelle |
| `v4.3` | 22/08/2026 | `README.md` | Le dépôt s'ouvrait sur rien : ni NOTES.md ni docs/ ne disent lequel ouvrir en premier |
| `v4.4` | 22/08/2026 | `npm run cout` : le coût de l'IA se mesure au lieu de se recopier | Le chiffre change à chaque session ; livrer l'outil vaut mieux que livrer la photographie |
| `v4.5` | 22/08/2026 | Vidéo relancée immédiatement, Bricolage Grotesque en interface, contraste vérifié sur toutes les règles | Le report au temps mort se voyait ; Archivo se confondait avec Inter ; et le contrôle à cinq paires ignorait les opacités — la navigation principale était à 2,94:1 |
| `v4.6` | 22/08/2026 | Fond vidéo diagnosticable : journal des raisons, `?video=1`, relance au premier geste. Garde-fou légal étendu aux textes d'attente | Quatre conditions pouvaient écarter la vidéo sans le moindre signe, à l'écran comme dans la console. Et « SIRET À RENSEIGNER » passait le contrôle du `null` tout en étant exactement ce qu'il fallait empêcher de publier |
