#!/usr/bin/env node
/* GARDE-FOU : LES PROTECTIONS DU SITE NE S'EVAPORENT PAS EN SILENCE.
   Usage : npm run check:securite
   Prerequis pour la seconde moitie : le site servi par workerd sur
   BASE_SECU (defaut http://127.0.0.1:4324), par exemple :
       npm run build && npx astro preview --port 4324

   ── CE QUI EST FALSIFIE ────────────────────────────────────────────
   A. Sans serveur : les en-tetes de public/_headers (fichiers statiques)
      et ceux que le middleware pose sur les reponses du Worker sont les
      MEMES. Deux copies d'une meme regle finissent toujours par
      diverger ; ce controle le voit le jour ou cela arrive.
   B. Avec serveur :
      · la garde de /admin ne se contourne pas en ecrivant l'adresse
        autrement — « /%61dmin », « /%2561dmin » et « /api//admin/data »
        servaient le tableau de bord ou son API avant le 3 novembre ;
      · les pages rendues par le Worker portent les en-tetes, puisque
        _headers ne les couvre pas ;
      · l'API de devis refuse un corps demesure et un JSON qui n'est pas
        un objet, au lieu de tomber en erreur 500. */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_SECU || 'http://127.0.0.1:4324';
const TMP = mkdtempSync(join(tmpdir(), 'nw-secu-'));

const echecs = [];
let n = 0;
function verifie(nom, obtenu, attendu) {
  n++;
  const ok = typeof attendu === 'function' ? attendu(obtenu) : JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`  ${ok ? '✓' : '✗'} ${nom}${ok ? '' : ` — obtenu ${JSON.stringify(obtenu)}`}`);
  if (!ok) echecs.push(nom);
}

/* ══ A. Les deux copies des en-tetes ═════════════════════════════ */

console.log('── public/_headers et le middleware disent la même chose ──');
const sortie = `${TMP}/entetes.mjs`;
execFileSync('npx', ['esbuild', 'src/lib/securite/entetes.ts', '--format=esm',
  '--target=es2022', `--outfile=${sortie}`, '--log-level=warning'], { stdio: 'inherit' });
const { ENTETES_COMMUNS, CSP_ADMIN } = await import(sortie);

/* Le bloc « /* » de _headers : les lignes indentees qui le suivent. */
const lignes = readFileSync('public/_headers', 'utf8').split('\n');
const debut = lignes.findIndex(l => l.trim() === '/*');
const bloc = {};
for (const l of lignes.slice(debut + 1)) {
  if (!/^\s+\S/.test(l)) break;
  const i = l.indexOf(':');
  bloc[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
}
for (const [nom, valeur] of Object.entries(ENTETES_COMMUNS)) {
  verifie(`${nom} identique`, bloc[nom.toLowerCase()], valeur);
}
verifie('Cloudflare limite une valeur à 2 000 caractères',
  Math.max(...Object.values(bloc).map(v => v.length)), v => v < 2000);
verifie('la CSP de l’espace interne n’appelle aucun tiers', /https?:/.test(CSP_ADMIN), false);

/* ══ B. Sur le site servi ════════════════════════════════════════ */

console.log('\n── Sur le site servi ──');
const joignable = await fetch(BASE + '/', { redirect: 'manual' })
  .then(r => r.status < 500).catch(() => false);

if (!joignable) {
  console.log(`  (ignoré : rien ne répond sur ${BASE})`);
} else {
  const get = (chemin, opts = {}) => fetch(BASE + chemin, { redirect: 'manual', ...opts });

  /* Toutes ces adresses designent l'espace interne pour le routeur. Sans
     session, AUCUNE ne doit repondre 200. 302 (vers la connexion), 401
     ou 403 (selon la configuration) sont tous des refus. */
  const refus = s => [302, 401, 403].includes(s);
  for (const chemin of ['/admin', '/admin/', '/%61dmin', '/%2561dmin', '/%61dmin/',
    '/admin/%2e', '/api/admin/data', '/api/%61dmin/data', '/api//admin/data',
    '/api/admin/%64ata', '/%2561pi/admin/data']) {
    const r = await get(chemin);
    await r.arrayBuffer();
    verifie(`${chemin} sans session → refusé`, r.status, s => refus(s) || s === 404);
  }
  /* Les pages ouvertes le restent, quelle que soit l'ecriture. */
  const login = await get('/admin/login');
  verifie('/admin/login reste ouverte', login.status, 200);
  verifie('  avec la CSP stricte de l’espace interne',
    login.headers.get('content-security-policy'), CSP_ADMIN);
  await login.arrayBuffer();

  /* Les reponses du Worker portent les en-tetes. */
  const pages = [
    ['/', 'fichier statique'],
    ['/devis', 'rendue par le Worker'],
    ['/devis/confirme?t=abime', 'rendue par le Worker'],
  ];
  for (const [chemin, nature] of pages) {
    const r = await get(chemin);
    await r.arrayBuffer();
    for (const nom of ['X-Content-Type-Options', 'X-Frame-Options', 'Content-Security-Policy',
      'Strict-Transport-Security', 'Referrer-Policy']) {
      verifie(`${chemin} (${nature}) porte ${nom}`, r.headers.get(nom), v => !!v);
    }
  }

  /* L'API de devis. */
  const poste = (corps, entetes = {}) => fetch(BASE + '/api/devis/envoyer', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...entetes },
    body: corps,
  });
  let r = await poste('null');
  verifie('JSON « null » → 400, pas 500', r.status, 400);
  r = await poste('[1,2]');
  verifie('JSON tableau → 400', r.status, 400);
  r = await poste(JSON.stringify({ prenom: 'a'.repeat(70 * 1024) }));
  verifie('corps de 70 Ko → 413', r.status, 413);
  verifie('  et la réponse porte les en-têtes', r.headers.get('x-content-type-options'), 'nosniff');
  r = await poste('{}', { origin: 'https://ailleurs.example', 'content-type': 'text/plain' });
  verifie('envoi depuis un autre site → 403', r.status, 403);
}

console.log(echecs.length
  ? `\n✗ ${echecs.length} échec(s) sur ${n} contrôles`
  : `\n✓ ${n} contrôles : les protections sont en place`);
process.exit(echecs.length ? 1 : 0);
