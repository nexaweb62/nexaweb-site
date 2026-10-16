/**
 * RETOUR DE GOOGLE — c'est ici que l'acces est accorde, ou refuse.
 *
 * L'ordre des verifications n'est pas decoratif. On controle d'abord ce
 * qui vient du navigateur (l'etat), puis on parle a Google (l'echange
 * du code), puis on verifie ce que Google a dit (la signature du
 * jeton), et SEULEMENT ensuite on regarde la liste blanche. Chaque
 * etape ferme une porte avant d'ouvrir la suivante.
 */

import type { APIRoute } from 'astro';
import { echangerCode, emailDuJeton, adresseRetour } from '../../lib/admin/oauth';
import {
  COOKIE_OAUTH, COOKIE_SESSION, DUREE_SESSION,
  signerSession, estAutorise, poserCookie, effacerCookie,
} from '../../lib/admin/session';
import { reponse403 } from '../../lib/admin/refus';
import { lireEnv } from '../../lib/admin/env';

export const prerender = false;

/** Un echec de connexion ne dit jamais POURQUOI avec precision : la
 *  difference entre « compte inconnu » et « signature invalide » est une
 *  information utile a qui cherche a entrer. Le detail reste au serveur. */
function versLogin(raison: string): Response {
  const entetes = new Headers({ location: `/admin/login?erreur=${encodeURIComponent(raison)}` });
  entetes.append('set-cookie', effacerCookie(COOKIE_OAUTH));
  entetes.set('Cache-Control', 'private, no-store');
  entetes.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(null, { status: 302, headers: entetes });
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const env = await lireEnv();
  const { GOOGLE_OAUTH_CLIENT_ID: clientId, GOOGLE_OAUTH_CLIENT_SECRET: secretClient,
    ADMIN_SESSION_SECRET: secretSession, ADMIN_EMAILS: liste } = env;

  if (!clientId || !secretClient || !secretSession || !liste) {
    return versLogin('config');
  }

  const url = new URL(request.url);

  /* Google signale un refus de l'utilisateur par « error », sans code. */
  if (url.searchParams.get('error')) return versLogin('annule');

  const code = url.searchParams.get('code');
  const etatRecu = url.searchParams.get('state');
  const memoire = cookies.get(COOKIE_OAUTH)?.value;
  if (!code || !etatRecu || !memoire) return versLogin('etat');

  const coupe = memoire.indexOf('.');
  const etatAttendu = memoire.slice(0, coupe);
  const verifieur = memoire.slice(coupe + 1);
  /* Comparaison stricte de l'etat : c'est la protection contre une
     requete forgee depuis un autre site. */
  if (!etatAttendu || !verifieur || etatAttendu !== etatRecu) return versLogin('etat');

  let email: string;
  try {
    const idToken = await echangerCode({
      code, verifieur, retour: adresseRetour(url),
      clientId, clientSecret: secretClient,
    });
    email = await emailDuJeton(idToken, clientId);
  } catch {
    return versLogin('google');
  }

  /* LA LISTE BLANCHE. Un compte Google parfaitement valide, dont la
     signature est bonne et l'adresse verifiee, n'entre pas pour autant :
     403 et deconnexion, comme pour n'importe quel autre refus. */
  if (!estAutorise(email, liste)) {
    const refus = reponse403();
    refus.headers.append('set-cookie', effacerCookie(COOKIE_OAUTH));
    return refus;
  }

  const jeton = await signerSession(email.trim().toLowerCase(), secretSession);
  const entetes = new Headers({ location: '/admin' });
  entetes.append('set-cookie', poserCookie(COOKIE_SESSION, jeton, DUREE_SESSION));
  entetes.append('set-cookie', effacerCookie(COOKIE_OAUTH));
  entetes.set('Cache-Control', 'private, no-store');
  entetes.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(null, { status: 302, headers: entetes });
};
