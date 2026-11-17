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
import { avecEntetesSecurite } from './lib/securite/entetes';

/** Routes du domaine admin ouvertes sans session : c'est par elles qu'on
 *  se connecte ou se deconnecte. */
const OUVERTES = new Set([
  '/admin/login', '/admin/oauth/start', '/admin/callback', '/admin/logout',
]);

const estAdmin = (c: string) => c === '/admin' || c.startsWith('/admin/') || c.startsWith('/api/admin');
const estApi = (c: string) => c.startsWith('/api/admin');

/**
 * LE CHEMIN TEL QUE LE ROUTEUR LE COMPRENDRA, pas tel qu'il est ecrit.
 *
 * La garde comparait le chemin BRUT de l'URL. Or le routeur d'Astro le
 * decode avant de choisir la page : « /%61dmin » (le « a » encode) et
 * « /%2561dmin » (encode deux fois) servaient le tableau de bord sans
 * passer par ici, et « /api//admin/data » atteignait l'API. Verifie dans
 * workerd le 3 novembre : 200 au lieu de 403. Seule la seconde
 * verification de l'API empechait la lecture des donnees.
 *
 * Deux protections, qui se couvrent l'une l'autre :
 *   1. le chemin est decode (trois passes au plus), ses barres obliques
 *      repliees, sa casse ignoree ;
 *   2. SURTOUT, on regarde aussi la ROUTE que le routeur a choisie
 *      (contexte.routePattern) : c'est elle qui sera rendue, quelle que
 *      soit la facon dont l'URL a ete ecrite.
 */
function cheminNormalise(brut: string): string {
  let c = brut;
  for (let i = 0; i < 3; i++) {
    let d: string;
    try { d = decodeURIComponent(c); } catch { break; }
    if (d === c) break;
    c = d;
  }
  c = c.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  return c.toLowerCase();
}

/** Un chemin d'admin ne doit jamais finir dans un index de moteur. */
function discret(reponse: Response): Response {
  /* Les en-tetes de securite d'abord : avecEntetesSecurite recopie la
     reponse si ses en-tetes sont figes, et la suite ecrit sur la copie. */
  const r = avecEntetesSecurite(reponse, true);
  r.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  /* Une page derriere authentification ne se met pas en cache partage :
     un intermediaire pourrait la resservir a quelqu'un d'autre. */
  r.headers.set('Cache-Control', 'private, no-store');
  return r;
}

export const onRequest = defineMiddleware(async (contexte, suite) => {
  const chemin = cheminNormalise(new URL(contexte.request.url).pathname);
  const route = (contexte.routePattern || '').toLowerCase();
  const zoneAdmin = estAdmin(chemin) || estAdmin(route);
  /* Hors de l'espace interne : rien a verifier, mais les en-tetes de
     securite partent quand meme — public/_headers ne couvre pas les
     reponses du Worker (/devis, /api/devis, /devis/confirme). */
  if (!zoneAdmin) return avecEntetesSecurite(await suite());

  /* La route choisie par le routeur fait foi ; le chemin ne sert que
     quand aucune route d'admin n'a ete trouvee (une adresse inconnue
     sous /admin reste fermee, et ne dit pas qu'elle n'existe pas). */
  const cle = estAdmin(route) ? route : chemin;
  if (OUVERTES.has(cle)) return discret(await suite());

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
    if (estApi(chemin) || estApi(route)) {
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
