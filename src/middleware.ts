/**
 * LA GARDE — elle s'execute AVANT toute route /admin, page comme API.
 *
 * C'est le seul endroit ou l'on decide qui entre. Aucune page ne refait
 * ce controle, aucune page ne peut l'oublier : une route ajoutee demain
 * sous /admin est protegee sans qu'on y pense.
 *
 * ── CE QUI EST VERIFIE, A CHAQUE REQUETE ────────────────────────────
 *   1. le cookie existe ;
 *   2. sa signature HMAC est valide — il n'a donc pas ete fabrique ;
 *   3. il n'a pas expire ;
 *   4. l'e-mail qu'il porte est TOUJOURS dans ADMIN_EMAILS.
 *
 * Le point 4 est relu a chaque fois, jamais mis en cache. Retirer une
 * adresse de la variable ferme la porte a la requete suivante, sans
 * attendre les huit heures du cookie.
 *
 * ── POURQUOI PAS UN MASQUAGE EN FRONT ───────────────────────────────
 * Cacher le tableau en JavaScript ne protege rien : il suffit d'ouvrir
 * l'onglet reseau pour lire la reponse de l'API. La verification est
 * donc faite ici, cote serveur, et l'API refuse d'elle-meme.
 */

import { defineMiddleware } from 'astro:middleware';
import {
  COOKIE_SESSION, lireSession, estAutorise, effacerCookie,
} from './lib/admin/session';
import { PAGE_403 } from './lib/admin/refus';
import { lireEnv } from './lib/admin/env';

/** Routes du domaine admin ouvertes sans session : c'est par elles qu'on
 *  se connecte ou se deconnecte. */
const OUVERTES = new Set([
  '/admin/login', '/admin/oauth/start', '/admin/callback', '/admin/logout',
]);

const estAdmin = (c: string) => c === '/admin' || c.startsWith('/admin/') || c.startsWith('/api/admin');
const estApi = (c: string) => c.startsWith('/api/admin');

/** Un chemin d'admin ne doit jamais finir dans un index de moteur. */
function discret(reponse: Response): Response {
  reponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  /* Une page derriere authentification ne se met pas en cache partage :
     un intermediaire pourrait la resservir a quelqu'un d'autre. */
  reponse.headers.set('Cache-Control', 'private, no-store');
  return reponse;
}

export const onRequest = defineMiddleware(async (contexte, suite) => {
  const chemin = new URL(contexte.request.url).pathname.replace(/\/+$/, '') || '/';
  if (!estAdmin(chemin)) return suite();

  if (OUVERTES.has(chemin)) return discret(await suite());

  /* Aucune route /admin n'est prerendue, mais on ne suppose pas :
     sans environnement, on ferme. */
  const env = await lireEnv();
  const secret = env.ADMIN_SESSION_SECRET;
  const liste = env.ADMIN_EMAILS;

  const refuser = (code: 401 | 403, message: string) => {
    const entetes = new Headers({ 'content-type': 'application/json; charset=utf-8' });
    /* « Deconnexion » : le cookie part avec la reponse, quelle que soit
       la raison du refus. Un compte retire de la liste ne garde pas un
       cookie valide dans son navigateur. */
    entetes.append('set-cookie', effacerCookie(COOKIE_SESSION));
    if (estApi(chemin)) {
      return discret(new Response(JSON.stringify({ erreur: message }), { status: code, headers: entetes }));
    }
    if (code === 401) {
      entetes.set('location', '/admin/login');
      return discret(new Response(null, { status: 302, headers: entetes }));
    }
    entetes.set('content-type', 'text/html; charset=utf-8');
    return discret(new Response(PAGE_403, { status: 403, headers: entetes }));
  };

  if (!secret || !liste) {
    /* Mal configure n'est pas « ouvert » : c'est ferme, et on le dit. */
    return refuser(403, 'Tableau de bord non configuré : variables d\'environnement manquantes.');
  }

  const jeton = contexte.cookies.get(COOKIE_SESSION)?.value;
  if (!jeton) return refuser(401, 'Session absente.');

  const email = await lireSession(jeton, secret);
  if (!email) return refuser(401, 'Session invalide ou expirée.');

  if (!estAutorise(email, liste)) return refuser(403, 'Compte non autorisé.');

  contexte.locals.admin = { email };
  return discret(await suite());
});
