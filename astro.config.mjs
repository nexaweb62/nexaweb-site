// @ts-check
import { defineConfig } from 'astro/config';

// Nexa Web — site statique, aucun JS de framework.
// L'anglais est declare des maintenant pour que l'ajout se fasse sans refonte :
// tant qu'aucune page n'existe sous src/pages/en/, aucune route EN n'est generee.
export default defineConfig({
  site: 'https://nexaaweb.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
    /* Feuille unique de 24 Ko, ~6 Ko une fois compressee : la poser dans le
       HTML supprime une requete bloquante avant le premier rendu. Le visiteur
       type voit une page et decide ; economiser une aller-retour sur cette
       page-la vaut plus que le cache partage entre pages. */
    inlineStylesheets: 'always',
  },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
