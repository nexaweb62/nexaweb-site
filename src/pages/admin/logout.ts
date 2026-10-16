/**
 * DECONNEXION.
 *
 * En POST, et non en GET : une image ou un lien pointant vers une URL de
 * deconnexion en GET suffirait a deconnecter quelqu'un depuis un autre
 * site. Avec un POST et SameSite=Lax, le cookie n'accompagne pas une
 * requete croisee — la deconnexion ne peut venir que de nos pages.
 *
 * Le GET existe quand meme, mais il se contente d'afficher le formulaire
 * de retour : il n'efface rien.
 */

import type { APIRoute } from 'astro';
import { COOKIE_SESSION, COOKIE_OAUTH, effacerCookie } from '../../lib/admin/session';

export const prerender = false;

export const POST: APIRoute = async () => {
  const entetes = new Headers({ location: '/admin/login?deconnecte=1' });
  entetes.append('set-cookie', effacerCookie(COOKIE_SESSION));
  entetes.append('set-cookie', effacerCookie(COOKIE_OAUTH));
  entetes.set('Cache-Control', 'private, no-store');
  entetes.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(null, { status: 303, headers: entetes });
};

export const GET: APIRoute = async () =>
  new Response(null, {
    status: 302,
    headers: { location: '/admin/login', 'X-Robots-Tag': 'noindex, nofollow' },
  });
