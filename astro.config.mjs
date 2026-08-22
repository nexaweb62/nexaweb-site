// @ts-check
import { defineConfig } from 'astro/config';

// Nexa Web — site statique, aucun JS de framework.
// L'anglais est declare des maintenant pour que l'ajout se fasse sans refonte :
// tant qu'aucune page n'existe sous src/pages/en/, aucune route EN n'est generee.
export default defineConfig({
  site: 'https://nexaaweb.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
