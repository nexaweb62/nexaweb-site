// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  site: 'https://nexaaweb.com',
  integrations: [react()],

  /* ── POURQUOI UN ADAPTATEUR SUR UN SITE STATIQUE ───────────────────
     Le site reste en mode « static » : les 23 pages publiques sont
     toujours prerendues au build, octet pour octet, et servies comme
     des fichiers. L'adaptateur n'existe que pour les quelques routes
     qui portent « export const prerender = false » — /admin et son
     API.

     Elles ne PEUVENT pas etre statiques. Le tableau de bord verifie
     une session a chaque requete et detient la cle d'un compte de
     service Google : les deux demandent du code serveur. Un masquage
     en JavaScript cote navigateur ne protegerait rien, et une cle
     livree au navigateur n'est plus une cle.

     « imageService: compile » : le service d'images par defaut de
     l'adaptateur s'appuie sur des binaires indisponibles dans un
     Worker. Les images du site sont de toute facon generees au build
     par scripts/build-images.mjs, donc rien n'a besoin d'etre
     retaille a l'execution. */
  adapter: cloudflare({ imageService: 'compile' }),

  /* PAS DE SESSION ASTRO. L'adaptateur active sinon, de lui-meme, un
     stockage de session sur Cloudflare KV et exige un espace de noms
     nomme « SESSION » — qu'il faudrait creer et payer pour rien.
     La session de l'admin est un cookie signe que nous fabriquons
     nous-memes (src/lib/admin/session.ts) : aucun stockage serveur,
     donc aucun KV. */
  session: false,
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