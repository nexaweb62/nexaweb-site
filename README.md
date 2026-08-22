# Nexa Web — site

Site vitrine de Nexa Web, agence de création de sites internet pour les
restaurants et commerces de proximité des Hauts-de-France. Astro 7, sortie
statique, aucun framework côté navigateur, aucun appel à un service tiers.

**Production** : Cloudflare Pages · **Domaine** : `nexaaweb.com`

```bash
npm install
npm run dev            # serveur de développement
npm run build          # build + sitemap + garde-fous de production
npm run audit          # relit dist/ : titres, alt, labels, liens et ancres morts,
                       # contrastes, montants, vocabulaire
npm run test:contact   # la fonction du formulaire, sans navigateur
npx astro check        # typage
```

`npm run build` **échoue en production** si un prix ou une mention légale
obligatoire manque. C'est volontaire.

## Où trouver quoi

| Vous cherchez | Fichier |
|---|---|
| Les décisions, les chiffres, ce qu'il reste à faire | [`docs/conclusions.md`](docs/conclusions.md) |
| Le détail des calculs et le journal des cycles | [`docs/analysis.md`](docs/analysis.md) |
| Couleurs, typographie, gabarits, interdits | [`docs/design-system.md`](docs/design-system.md) |
| Produire un site client | [`docs/production/`](docs/production/) |
| Comptes, services, déploiement, à faire | [`NOTES.md`](NOTES.md) |
| Tout le contenu du site | [`src/config/site.ts`](src/config/site.ts) |

## Les treize pages

Accueil · trois pages métier (`/site-internet-{restaurant,commerce,artisan}`) ·
`/equipe` · guide `/fiche-google-business` · mentions légales · politique de
confidentialité · `/merci`, `/probleme`, `/404` · deux maquettes de
démonstration hors index.
