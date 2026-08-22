# Nexa Web — conclusions

> Synthèse au 22 août 2026. Document d'entrée : il donne les réponses, et
> renvoie à [`analysis.md`](analysis.md) pour le détail des calculs, à
> [`production/`](production/) pour les documents opérationnels, et au journal
> des cycles pour l'historique des décisions.

---

## En une page

| Question | Réponse courte |
|---|---|
| Combien coûte l'IA ? | **163 $ mesurés** pour construire ce site en entier. 8 à 20 $ pour un site client une fois le processus rodé. 1 à 2 % du coût de production |
| Combien de temps pour un site ? | **18 h** avec Claude Code et un processus rodé, contre 39 h sans. **10,3 h** une fois industrialisé |
| Le modèle à trois tient-il ? | Oui à partir de 5 sites/mois, et **c'est l'acquisition qui limite, jamais la production** — 41 % de la capacité utilisée dans le scénario réaliste |
| Les tarifs sont-ils bons ? | **1 190 € + 99 €/mois** rendent le client rentable dès la mise en ligne. C'est ce qui rend tenable le « sans engagement » affiché |
| Le site convertit-il ? | Tous les défauts identifiés à l'audit sont corrigés. Il reste un manque de preuve, qui se règle avec le premier client, pas avec du code |
| Quoi faire lundi matin ? | Prospecter, mesurer les 50 premiers appels, publier la première étude de cas |

---

## 1. Coût de l'IA — mesuré, pas estimé

Relevé sur les transcripts de Claude Code, quatre sessions, du début de la
refonte à aujourd'hui — `npm run cout` le recalcule à la demande :

| | |
|---|---:|
| Tours d'assistant | 1 073 |
| Tokens d'entrée | 204 M, dont **98 % lus en cache** |
| Tokens de sortie | 1,52 M |
| **Coût** | **162,90 $ ≈ 150 €** |

**0,152 $ par tour.** C'est le seul chiffre à retenir pour estimer un projet.

Trois conséquences pratiques :

- **Le cache décide de la facture.** La même conversation sans cache aurait
  coûté 1 058 $ au lieu de 163 $, soit 6,5 fois plus. Rester dans une session longue plutôt
  que d'en ouvrir dix, ne pas changer de modèle en cours de route.
- **L'abonnement bat l'API dès le premier projet sérieux.** Claude Max 5× coûte
  100 $/mois ; ce site seul en a consommé 163 $ en une journée.
- **Le premier site coûte dix fois un site client.** 150 € ici, 8 à 20 $
  ensuite : la différence, c'est le système visuel, les impasses et les choix
  qu'on ne refait qu'une fois. Ne pas deviser un projet neuf au tarif d'un
  projet répété.

**Ce poste ne mérite aucune optimisation.** 20 € d'IA contre 810 € de temps
humain : le seul arbitrage qui compte est de savoir si elle fait gagner des
heures. Elle en fait gagner vingt et une par site.

## 2. Temps de production

| | Sans IA | Avec Claude Code | Débutant + Claude Code | Industrialisé |
|---|---:|---:|---:|---:|
| Total par site | 39 h | **18 h** | 42,5 h | **10,3 h** |

- Le gain est concentré sur conception, développement et responsive : **21 h
  → 6 h**. Le reste — cadrage, collecte, corrections, formation — est du temps
  humain incompressible, et représente plus de la moitié du travail une fois le
  processus rodé.
- **Un débutant assisté par l'IA est plus lent qu'un expérimenté sans IA**
  (42,5 h contre 39 h). Directement pertinent pour le recrutement : l'IA
  amplifie une compétence, elle ne la remplace pas.
- Le passage à 10,3 h ne vient pas de coder plus vite mais du
  [questionnaire de démarrage](production/questionnaire-client.md) : **c'est la
  seule variable qui fait basculer un projet de 10 h à 18 h.**

## 3. Le modèle à trois personnes

Au 12ᵉ mois, scénario réaliste (5 sites/mois, 51 clients au parc) :

| | Prudent | **Réaliste** | Optimisé |
|---|---:|---:|---:|
| CA mensuel | 3 392 € | **11 002 €** | 25 258 € |
| Marge brute | 491 € | **5 324 €** | 18 379 € |
| Par personne, avant charges | 1 112 € | **3 620 €** | 8 367 € |
| Capacité de production utilisée | 21 % | **41 %** | 52 % |
| Prospection à soutenir | 66 contacts/mois | **165/mois** | 297/mois |

Quatre conclusions, dans l'ordre d'importance :

1. **Le goulot est l'acquisition, jamais la production.** Même dans le scénario
   optimisé, la moitié de la capacité reste inutilisée. Ce qui limite le chiffre
   d'affaires, c'est le nombre d'entreprises contactées et converties.
2. **Le scénario prudent n'est pas viable à trois** : 1 112 € par personne avant
   charges, c'est sous le SMIC. À ce niveau, c'est une activité secondaire, ou
   une personne seule.
3. **La valeur est dans le parc, pas dans les lancements.** Au 12ᵉ mois du
   scénario réaliste, le récurrent (5 052 €) rejoint déjà les lancements, et il
   continue de croître sans travail supplémentaire.
4. **Le churn est l'ennemi numéro un.** À 6 %/mois au lieu de 3 %, la marge
   brute chute d'un tiers. Un euro dépensé à retenir vaut plus qu'un euro
   dépensé à acquérir.

**Ne pas recruter la troisième personne avant d'avoir atteint le scénario
réaliste** : à deux, il donne environ 5 430 € par personne au lieu de 3 620 €.

## 4. Tarifs

**1 190 € de lancement + 99 €/mois**, affichés sur le site depuis `v1.8`.

- Coût total par client : 1 125 € (18 h de production, 6,6 h de prospection,
  18 € d'IA). **Les frais de lancement le couvrent à eux seuls** : le client est
  rentable dès la mise en ligne, et chaque mois d'abonnement est de la marge.
- C'est ce qui rend tenable la promesse « sans engagement de durée ». À 890 € de
  lancement, il faudrait sept mois d'abonnement pour rentrer dans ses frais —
  **si vous consentez ce tarif aux premiers clients, prenez l'engagement de
  douze mois en échange.**
- Pour un restaurant à 300 000 € de chiffre d'affaires, 2 400 € la première
  année représentent moins de 1 %. Défendable *si* la conversation porte sur le
  retour : « deux couverts de plus par semaine remboursent l'abonnement ».
  Vendu comme un coût technique, c'est trop cher.
- **Ne jamais** descendre sous 890 €, proposer un site sans abonnement, ou
  facturer à l'heure — cette dernière erreur fait baisser la facture chaque fois
  que l'outillage progresse.

## 5. Conversion, UX, SEO

Ce qui a été corrigé aujourd'hui, dans l'ordre de valeur :

| Cycle | Apport |
|---|---|
| `v1.9` | Engagements posés **avant** le prix ; barre d'action mobile |
| `v2.0` | Polices auto-hébergées : plus aucun appel tiers, un problème RGPD en moins |
| `v2.1` | `noindex` sur les pages de service, sitemap généré, balisage enrichi, image de partage JPEG |
| `v2.2` | Page `/equipe` : on sait enfin qui est derrière |
| `v2.3` | Trois pages métier, formulaire instrumenté, audit et test automatiques |
| `v2.4` | Style dans la page, vidéo repoussée : accueil complet à 12,7 Ko compressés |
| `v2.6` | Questionnaire de démarrage et checklist de mise en ligne |
| `v2.7` | Maquettes remises au travail, liées depuis les pages métier |
| `v2.8` | Barre d'action et fil d'Ariane sur les pages d'atterrissage |
| `v3.0`–`v3.1` | Audit renforcé : classes sans style, ancres mortes, contrastes. Deux vrais défauts trouvés, dont une section sans mise en forme depuis `v1.1` |
| `v3.2` | Guide « fiche Google Business » — la page qui rencontre le commerçant avant qu'il cherche une agence |
| `v3.3`–`v3.4` | Politique de confidentialité exacte, mentions légales obligatoires nommées et bloquantes |
| `v3.5` | Premier écran mobile à 56 Ko, vocabulaire d'agence contrôlé automatiquement |
| `v3.6`–`v3.7` | Seuil de rentabilité sous les prix, focus piégé dans le menu mobile |

**Ce qui reste ouvert** (détail en [`analysis.md`](analysis.md) § 5.2) :

- **P9 — aucune mesure d'audience.** On sait de quelle page vient une demande,
  pas combien de visiteurs il a fallu. Sans dénominateur, pas de taux de
  conversion. Cloudflare Web Analytics : sans cookie, sans script tiers dans le
  dépôt, sans bannière.
- **P10 — aucun palier d'entrée.** Un commerçant qui trouve 1 190 € trop cher
  n'a rien d'autre à regarder. Un audit de fiche Google à 150–250 €, déduit des
  frais de lancement en cas de suite, capterait une partie de ces départs.
- **P12 — aucune preuve.** Le site l'assume honnêtement, mais la première étude
  de cas vaudra plus que toutes les améliorations ci-dessus. Elle est bloquée
  sur le premier client, pas sur le site.

## 6. Industrialisation

Ce que le dépôt sait faire tout seul : contenu centralisé en un fichier, pages
métier générées depuis un tableau, formulaire sans service tiers, sitemap déduit
des pages réelles, refus de publier des prix vides, `npm run audit` sur les
douze pages, `npm run test:contact` sur le chemin de conversion.

Ce qui manque, par rendement : le gabarit de départ pour un site client, puis
une bibliothèque de sections — **à extraire au deuxième ou troisième site, pas
avant**, sous peine d'abstraire des cas qu'on n'a pas encore vus.

**Le piège :** l'industrialisation ne s'applique qu'à la part du travail qui est
déjà rapide. Passer une journée à outiller pour gagner vingt minutes par site
est une erreur de priorité tant que le carnet n'est pas plein.

## 7. À faire, dans cet ordre

1. **Prospecter et mesurer.** 50 appels, un tableau : contacté, réponse,
   rendez-vous, signé. Le modèle repose sur « 33 contacts pour 1 client » — une
   hypothèse. Si c'est 80, tout change.
2. **Activer la mesure d'audience** (P9).
3. **Signer le premier client et publier l'étude de cas** (P12).
4. **Choisir le statut juridique avec un comptable.** L'écart de cotisations
   pèse plus lourd que n'importe quelle optimisation technique.
5. **Terminer la mise en production** : projet Cloudflare Pages, domaine vérifié
   chez Resend, redirection `www`, DNS — la liste complète est dans
   [`../NOTES.md`](../NOTES.md).
6. **Révoquer la clé Anthropic** du worker Cloudflare de l'ancien site. C'est
   une clé active exposée dans un service qui n'est plus surveillé.
