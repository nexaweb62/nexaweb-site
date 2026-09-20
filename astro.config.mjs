// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  site: 'https://nexaaweb.com',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      /* esbuild, pas lightningcss.
         lightningcss replie « animation-name/-timing/-fill » ET
         « animation-timeline » dans le raccourci « animation », et sort
         « animation: linear both progGrow scroll(root) ». Or la
         timeline ne fait pas partie du raccourci : la déclaration est
         invalide, le navigateur la jette en entier, et TOUTES les
         animations pilotées par le scroll meurent silencieusement au
         build. Vérifié dans Chromium : la forme repliée donne
         animation-name:none. */
      cssMinify: 'esbuild',
    },
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
  },
});