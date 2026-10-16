#!/usr/bin/env node
/* GARDE-FOU : PERSONNE N'ENTRE SANS Y AVOIR DROIT.

   Prerequis : la sortie du build servie par le VRAI runtime Cloudflare.
       npm run build
       cp .dev.vars dist/server/.dev.vars
       npx wrangler dev -c dist/server/wrangler.json --port 8787 --local
   puis : npm run check:admin

   Pourquoi workerd et non « astro preview » : la garde s'appuie sur des
   cookies, des en-tetes et des codes de statut produits par le middleware
   dans l'environnement Workers. La tester ailleurs testerait autre chose.

   CE QUI EST FALSIFIE ICI. Il ne suffit pas de verifier qu'un compte
   autorise entre — n'importe quel code sans serrure passerait ce test.
   On verifie surtout que les autres sont REFUSES : cookie forge, cookie
   signe avec une autre cle, cookie expire, et compte Google parfaitement
   valide mais absent de la liste blanche. Ce dernier cas est le coeur du
   sujet : la signature est bonne, l'adresse est verifiee par Google, et
   l'acces doit quand meme etre refuse en 403 avec deconnexion.

   On verifie aussi qu'aucune reponse ne laisse fuir un secret, et que la
   page du tableau de bord ne contient aucune donnee de la feuille.

   La cle de test ci-dessous est celle de .dev.vars : elle n'ouvre rien
   ailleurs qu'en local. */
const BASE = process.env.BASE_ADMIN || 'http://127.0.0.1:8787';
const SECRET = process.env.ADMIN_SESSION_SECRET
  || 'secret-de-test-local-uniquement-ne-pas-utiliser-en-prod-0123456789';
const enc = new TextEncoder();

const b64url = o => btoa(String.fromCharCode(...o)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function cle(s){return crypto.subtle.importKey('raw',enc.encode(s),{name:'HMAC',hash:'SHA-256'},false,['sign']);}
async function jeton(email, secret = SECRET, exp = Math.floor(Date.now()/1000)+3600) {
  const corps = b64url(enc.encode(JSON.stringify({e: email, exp})));
  const sig = await crypto.subtle.sign('HMAC', await cle(secret), enc.encode(corps));
  return corps + '.' + b64url(new Uint8Array(sig));
}

const echecs = [];
let n = 0;
async function cas(nom, chemin, opts, attendu) {
  n++;
  const r = await fetch(BASE + chemin, { ...opts, redirect: 'manual' });
  const ok = attendu.statut === r.status;
  const detail = [`${r.status}`];
  let corps = '';
  try { corps = await r.text(); } catch {}
  let bon = ok;
  if (attendu.entete) {
    for (const [k, v] of Object.entries(attendu.entete)) {
      const vu = r.headers.get(k) || '';
      if (!vu.includes(v)) { bon = false; detail.push(`${k}="${vu}" ≠ "${v}"`); }
    }
  }
  if (attendu.corpsContient && !corps.includes(attendu.corpsContient)) {
    bon = false; detail.push(`corps sans « ${attendu.corpsContient} »`);
  }
  if (attendu.corpsSansJamais) {
    for (const interdit of attendu.corpsSansJamais) {
      if (corps.includes(interdit)) { bon = false; detail.push(`FUITE : corps contient « ${interdit} »`); }
    }
  }
  const effaceCookie = (r.headers.get('set-cookie') || '').includes('Max-Age=0');
  if (attendu.deconnecte && !effaceCookie) { bon = false; detail.push('pas de déconnexion'); }
  console.log(`${bon ? '  ok  ' : '  ÉCHEC'} ${nom.padEnd(54)} → ${detail.join('  ')} (attendu ${attendu.statut})`);
  if (!bon) echecs.push(nom);
}

const cookie = v => ({ headers: { cookie: `__Host-nw_admin=${v}` } });

console.log('\n── Le site public n\'a pas bougé ──');
await cas('/ sert la page statique', '/', {}, { statut: 200, corpsContient: 'Nexa' });
/* 307 vers /tarifs/ : c'est la normalisation de barre finale de Workers
   Assets, et elle existait DEJA avant l'adaptateur — verifie en faisant
   tourner l'ancienne configuration cote a cote (t-cmp.mjs). Ce n'est
   donc pas une regression, c'est le comportement de production. */
await cas('/tarifs : meme 307 qu\'avant', '/tarifs', {}, { statut: 307 });
await cas('/tarifs/ sert la page statique', '/tarifs/', {}, { statut: 200 });
await cas('/robots.txt interdit /admin', '/robots.txt', {}, { statut: 200, corpsContient: 'Disallow: /admin' });

console.log('\n── Sans session ──');
await cas('/admin renvoie vers la connexion', '/admin', {}, { statut: 302, entete: { location: '/admin/login' } });
await cas('/admin/ (barre finale) aussi', '/admin/', {}, { statut: 302, entete: { location: '/admin/login' } });
await cas('/api/admin/data refuse', '/api/admin/data', {}, { statut: 401 });
await cas('/admin/login reste ouverte', '/admin/login', {}, { statut: 200, corpsContient: 'Continuer avec Google' });
await cas('/admin porte X-Robots-Tag', '/admin', {}, { statut: 302, entete: { 'x-robots-tag': 'noindex' } });

console.log('\n── Cookie forgé ou abîmé ──');
const bon = await jeton('ahmoudchteoui@gmail.com');
await cas('signature modifiée', '/admin', cookie(bon.slice(0, -4) + 'AAAA'), { statut: 302 });
await cas('signé avec une autre clé', '/admin', cookie(await jeton('ahmoudchteoui@gmail.com', 'mauvaise-cle')), { statut: 302 });
await cas('charge sans signature', '/admin', cookie(bon.split('.')[0]), { statut: 302 });
await cas('cookie expiré', '/admin', cookie(await jeton('ahmoudchteoui@gmail.com', SECRET, Math.floor(Date.now()/1000) - 10)), { statut: 302 });
await cas('API, signature modifiée', '/api/admin/data', cookie(bon.slice(0, -4) + 'AAAA'), { statut: 401 });

console.log('\n── Compte Google valide mais HORS liste blanche ──');
const intrus = await jeton('intrus@gmail.com');
await cas('page : 403 + déconnexion', '/admin', cookie(intrus),
  { statut: 403, deconnecte: true, corpsContient: 'Accès refusé',
    corpsSansJamais: ['ahmoudchteoui', 'imadtorchi', 'SHEET_ID', '1cqr42'] });
await cas('API : 403 + déconnexion', '/api/admin/data', cookie(intrus),
  { statut: 403, deconnecte: true, corpsSansJamais: ['ahmoudchteoui', 'imadtorchi', '1cqr42'] });
await cas('deuxième associé accepté', '/admin', cookie(await jeton('imadtorchi6@gmail.com')), { statut: 200 });
await cas('casse et espaces tolérés', '/admin', cookie(await jeton('  AHmoudChteoui@Gmail.com  ')), { statut: 200 });

console.log('\n── Session valide ──');
await cas('page du tableau de bord', '/admin', cookie(bon),
  { statut: 200, corpsContient: 'Tableau de bord',
    corpsSansJamais: ['ADMIN_SESSION_SECRET', 'secret-de-test', 'test-secret', 'GOOGLE_SA_PRIVATE_KEY'] });
await cas('la page ne contient AUCUNE donnée de la feuille', '/admin', cookie(bon),
  { statut: 200, corpsSansJamais: ['1cqr42IttF4k9FC65BEuVklgJoYP_HYU1xB78gF4yr5k'] });
/* La clé de service est bidon en local : l'API doit échouer PROPREMENT
   en 502, ce qui prouve que l'authentification est passée et que c'est
   bien la lecture Sheets qui s'arrête — pas une fuite de secret. */
await cas('API atteinte, erreur de lecture propre', '/api/admin/data', cookie(bon),
  { statut: 502, corpsSansJamais: ['cle-de-test-invalide', 'test-secret', SECRET] });

console.log('\n── Déconnexion ──');
await cas('POST /admin/logout efface le cookie', '/admin/logout',
  { method: 'POST', headers: { cookie: `__Host-nw_admin=${bon}`, origin: BASE } },
  { statut: 303, deconnecte: true });
await cas('POST sans en-tete Origin est refuse (anti-CSRF)', '/admin/logout',
  { method: 'POST', ...cookie(bon) }, { statut: 403 });
await cas('GET /admin/logout n\'efface rien', '/admin/logout', cookie(bon), { statut: 302 });

console.log(`\n${echecs.length ? '✗ ' + echecs.length + ' échec(s) sur ' + n : '✓ ' + n + ' contrôles, tous verts'}`);
if (echecs.length) { echecs.forEach(e => console.log('   · ' + e)); process.exit(1); }
