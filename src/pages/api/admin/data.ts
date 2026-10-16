/**
 * L'API DU TABLEAU DE BORD.
 *
 * La garde de src/middleware.ts a deja refuse tout ce qui n'est pas une
 * session valide d'un compte de la liste blanche. On le reverifie quand
 * meme ici : si quelqu'un deplace un jour cette route hors du prefixe
 * /api/admin, elle ne doit pas s'ouvrir en silence. Une protection qui
 * depend d'un chemin est une protection qu'un renommage annule.
 *
 * La reponse ne contient AUCUN secret : ni cle, ni jeton, ni identifiant
 * de feuille. Que des nombres et le contenu des lignes.
 */

import type { APIRoute } from 'astro';
import { donnees } from '../../../lib/admin/sheets';
import { construire } from '../../../lib/admin/kpi';
import { lireEnv } from '../../../lib/admin/env';

export const prerender = false;

const entetes = {
  'content-type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

export const GET: APIRoute = async ({ locals, request }) => {
  if (!locals.admin) {
    return new Response(JSON.stringify({ erreur: 'Non autorisé.' }), { status: 401, headers: entetes });
  }

  const env = await lireEnv();
  /* Le bouton « Actualiser » court-circuite le cache de 45 s. Le
     rafraichissement automatique, lui, ne le force pas : soixante
     onglets ouverts ne doivent pas faire soixante lectures. */
  const forcer = new URL(request.url).searchParams.get('forcer') === '1';

  try {
    const brut = await donnees(env, forcer);
    return new Response(JSON.stringify({
      ...construire(brut),
      connecte: locals.admin.email,
    }), { status: 200, headers: entetes });
  } catch (e) {
    /* Le message des erreurs de sheets.ts est ecrit pour etre lu par
       l'associe qui configure — « feuille non partagee », « SHEET_ID
       incorrect ». Il ne contient ni cle ni jeton. */
    const message = e instanceof Error ? e.message : 'Lecture impossible.';
    return new Response(JSON.stringify({ erreur: message }), { status: 502, headers: entetes });
  }
};
