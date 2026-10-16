/**
 * LA PAGE DE REFUS — partagee entre la garde et le retour OAuth.
 *
 * Les deux refusent pour la meme raison et doivent le dire de la meme
 * facon. Une seule page, un seul texte, un seul comportement : le
 * cookie de session part avec la reponse, quel que soit le chemin par
 * lequel on arrive ici.
 *
 * AUCUNE COULEUR ECRITE ICI. Une page fabriquee dans une chaine ne peut
 * pas lire les jetons de tokens.css, et des valeurs en dur divergeraient
 * de la palette au premier changement — check:colors les refuse, a
 * raison. On s'appuie donc sur les couleurs SYSTEME (Canvas, CanvasText,
 * LinkText) : ce sont des mots-cles, pas des valeurs, et le navigateur
 * les resout lui-meme en clair comme en sombre.
 */

import { COOKIE_SESSION, effacerCookie } from './session';

export const PAGE_403 = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Accès refusé</title>
<style>
:root{color-scheme:dark light}
body{margin:0;min-height:100vh;display:grid;place-items:center;
  font:400 16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;
  background:Canvas;color:CanvasText;padding:24px;text-align:center}
h1{font-size:1.5rem;font-weight:600;margin:0 0 12px}
p{margin:0 0 20px;opacity:.75;max-width:42ch}
a{color:LinkText;text-underline-offset:3px}
</style></head><body><main>
<h1>Accès refusé</h1>
<p>Ce compte Google ne figure pas parmi les comptes autorisés. Vous avez été déconnecté.</p>
<a href="/admin/login">Essayer avec un autre compte</a>
</main></body></html>`;

export function reponse403(): Response {
  const entetes = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  entetes.append('set-cookie', effacerCookie(COOKIE_SESSION));
  entetes.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  entetes.set('Cache-Control', 'private, no-store');
  return new Response(PAGE_403, { status: 403, headers: entetes });
}
