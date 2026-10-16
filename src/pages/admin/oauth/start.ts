/**
 * DEPART DE LA CONNEXION — on fabrique l'etat, puis on renvoie a Google.
 *
 * L'etat et le verifieur PKCE sont poses dans un cookie httpOnly de dix
 * minutes. Le navigateur ne peut ni les lire ni les modifier ; au
 * retour, on compare ce que Google renvoie a ce qu'on avait pose. Sans
 * cette comparaison, n'importe qui pourrait faire aboutir chez nous un
 * code d'autorisation obtenu ailleurs.
 */

import type { APIRoute } from 'astro';
import { departAutorisation, adresseRetour } from '../../../lib/admin/oauth';
import { COOKIE_OAUTH, poserCookie } from '../../../lib/admin/session';
import { lireEnv } from '../../../lib/admin/env';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const env = await lireEnv();
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response(
      'Connexion indisponible : GOOGLE_OAUTH_CLIENT_ID manque.',
      { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  }

  const url = new URL(request.url);
  const retour = adresseRetour(url);
  const { url: versGoogle, etat, verifieur } = await departAutorisation(clientId, retour);

  const entetes = new Headers({ location: versGoogle });
  entetes.append('set-cookie', poserCookie(COOKIE_OAUTH, `${etat}.${verifieur}`, 600));
  entetes.set('Cache-Control', 'private, no-store');
  entetes.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(null, { status: 302, headers: entetes });
};
