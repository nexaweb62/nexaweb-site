#!/usr/bin/env node
/* GARDE-FOU : LE TABLEAU DE BORD S'AFFICHE, ET AFFICHE JUSTE.

   Prerequis : les memes que check:admin (build + wrangler dev sur 8787).
   Usage : npm run check:admin:rendu

   On ouvre la VRAIE page servie par workerd, avec une session valide, et
   on intercepte l'API pour maitriser les donnees. Le code de rendu teste
   est donc celui qui partira en production, pas une copie.

   Les nombres attendus ne sont ecrits nulle part : ils sortent du vrai
   src/lib/admin/kpi.ts, transpile a la volee. Si une regle de comptage
   derive, ce controle le montre.

   Quatre cas : donnees completes en 1280 et en 390, en clair et en
   sombre, puis le cas ou les onglets « Ventes » et « Projets »
   n'existent pas encore — il doit donner un etat vide propre, pas une
   erreur.

   Ce qu'il surveille en plus : aucune erreur JavaScript, aucun
   debordement horizontal, et surtout qu'une balise <script> saisie dans
   la feuille reste du TEXTE au lieu d\'etre executee.
*/
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_ADMIN || 'http://127.0.0.1:8787';
const SECRET = process.env.ADMIN_SESSION_SECRET
  || 'secret-de-test-local-uniquement-ne-pas-utiliser-en-prod-0123456789';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/* Les captures et le transpile vivent hors du depot : ce sont des
   sous-produits de controle, pas du code. */
const TMP = process.env.SORTIE_RENDU || mkdtempSync(join(tmpdir(), 'nw-admin-'));
const OUT = TMP;
const enc = new TextEncoder();
const b64url = o => btoa(String.fromCharCode(...o)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function jeton(email) {
  const corps = b64url(enc.encode(JSON.stringify({ e: email, exp: Math.floor(Date.now()/1000)+3600 })));
  const cle = await crypto.subtle.importKey('raw', enc.encode(SECRET), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return corps + '.' + b64url(new Uint8Array(await crypto.subtle.sign('HMAC', cle, enc.encode(corps))));
}

const prospects = [
  { ENTREPRISE:'Boulangerie Lefèvre', SECTEUR:'Commerce', 'PRESENCE WEB':'Aucune', PRIORITE:'Haute', ASSIGNE:'Mahmoud', JOUR:'Lundi', STATUT:'Signé', RELANCE:'' },
  { ENTREPRISE:'Garage Dubois', SECTEUR:'Automobile', 'PRESENCE WEB':'Page Facebook', PRIORITE:'Haute', ASSIGNE:'Imad', JOUR:'Lundi', STATUT:'Devis envoyé', RELANCE:'20/10' },
  { ENTREPRISE:'Coiffure Éclat', SECTEUR:'Beauté', 'PRESENCE WEB':'Site vieillissant', PRIORITE:'Moyenne', ASSIGNE:'Mahmoud', JOUR:'Mardi', STATUT:'RDV fixé', RELANCE:'' },
  { ENTREPRISE:'Plomberie Martin', SECTEUR:'Artisanat', 'PRESENCE WEB':'Aucune', PRIORITE:'Haute', ASSIGNE:'Imad', JOUR:'Mardi', STATUT:'À appeler', RELANCE:'' },
  { ENTREPRISE:'Restaurant Le Carvinois', SECTEUR:'Restauration', 'PRESENCE WEB':'Google Maps', PRIORITE:'Moyenne', ASSIGNE:'', JOUR:'Mercredi', STATUT:'', RELANCE:'' },
  { ENTREPRISE:'Fleuriste Rose & Co', SECTEUR:'Commerce', 'PRESENCE WEB':'Instagram', PRIORITE:'Basse', ASSIGNE:'Mahmoud', JOUR:'Jeudi', STATUT:'Refusé', RELANCE:'' },
  { ENTREPRISE:'Auto-école Horizon', SECTEUR:'Formation', 'PRESENCE WEB':'Site ancien', PRIORITE:'Moyenne', ASSIGNE:'Imad', JOUR:'Jeudi', STATUT:'Relancé', RELANCE:'22/10' },
  { ENTREPRISE:'<script>alert(1)</script>', SECTEUR:'Test d’injection', 'PRESENCE WEB':'—', PRIORITE:'Basse', ASSIGNE:'Imad', JOUR:'Vendredi', STATUT:'À appeler', RELANCE:'' },
];
const ventes = [
  { FACTURE:'F-2026-001', DATE:'12/08/2026', CLIENT:'Boulangerie Lefèvre', PRESTATION:'Site vitrine', MONTANT_HT:'999 €', STATUT:'Payé' },
  { FACTURE:'F-2026-002', DATE:'03/09/2026', CLIENT:'Garage Dubois', PRESTATION:'Refonte', MONTANT_HT:'1 490 €', STATUT:'Payé' },
  { FACTURE:'F-2026-003', DATE:'05/10/2026', CLIENT:'Coiffure Éclat', PRESTATION:'Site vitrine', MONTANT_HT:'1 200 €', STATUT:'En attente' },
];
const projets = [
  { CLIENT:'Boulangerie Lefèvre', PROJET:'Site vitrine 5 pages', STATUT:'Livré', ASSIGNE:'Mahmoud', ECHEANCE:'01/09/2026', MONTANT_HT:'999' },
  { CLIENT:'Garage Dubois', PROJET:'Refonte + SEO', STATUT:'En cours', ASSIGNE:'Imad', ECHEANCE:'28/10/2026', MONTANT_HT:'1490' },
  { CLIENT:'Coiffure Éclat', PROJET:'Site vitrine', STATUT:'En cours', ASSIGNE:'Mahmoud', ECHEANCE:'', MONTANT_HT:'1200' },
];

/* Le VRAI calcul, transpile depuis src/lib/admin/kpi.ts (voir la
   commande esbuild dans l'historique) : si kpi.ts se trompe, ce test
   doit le montrer. Aucun nombre n'est ecrit a la main ici. */
const KPI = `${TMP}/kpi-transpile.mjs`;
execFileSync('npx', ['esbuild', 'src/lib/admin/kpi.ts', '--format=esm',
  '--target=es2022', `--outfile=${KPI}`, '--log-level=warning'], { stdio: 'inherit' });
const { construire } = await import(KPI);

function charge(avecOnglets) {
  return {
    prospects, ventes: avecOnglets ? ventes : [], projets: avecOnglets ? projets : [],
    ongletsManquants: avecOnglets ? [] : ['Ventes', 'Projets'],
    majLe: new Date().toISOString(),
  };
}

const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const echecs = [];

for (const [nom, avecOnglets, largeur, theme] of [
  ['complet-1280-sombre', true, 1280, 'dark'],
  ['complet-390-sombre', true, 390, 'dark'],
  ['complet-1280-clair', true, 1280, 'light'],
  ['onglets-absents-1280-sombre', false, 1280, 'dark'],
]) {
  /* Le cookie passe par un en-tete, pas par le bocal du navigateur : le
     prefixe « __Host- » exige Secure, et workerd local parle en clair,
     donc Chrome refuserait de le poser. Cote serveur, c'est exactement
     la meme chose — il lit l'en-tete Cookie. Ce que ce test ne peut donc
     PAS verifier, c'est l'acceptation du prefixe par le navigateur ;
     elle ne s'observe qu'en HTTPS, donc en production. */
  const ctx = await nav.newContext({
    viewport: { width: largeur, height: 1000 }, colorScheme: theme, deviceScaleFactor: 1.5,
    extraHTTPHeaders: { cookie: `__Host-nw_admin=${await jeton('ahmoudchteoui@gmail.com')}` },
  });
  await ctx.addInitScript(t => { try { localStorage.setItem('nw-theme', t); } catch (e) {} }, theme);

  const page = await ctx.newPage();
  const erreursJs = [];
  page.on('pageerror', e => erreursJs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') erreursJs.push('console: ' + m.text()); });

  await page.route('**/api/admin/data*', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ...construire(charge(avecOnglets)), connecte: 'ahmoudchteoui@gmail.com' }),
    });
  });

  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#ad-corps:not([hidden])', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);

  const vu = await page.evaluate(() => ({
    resume: document.getElementById('ad-resume').textContent.trim(),
    jauges: [...document.querySelectorAll('#ad-jauges .ad-carte')].map(c => ({
      titre: c.querySelector('.ad-jauge-titre').textContent,
      valeur: c.querySelector('.ad-jauge-n').textContent,
      objectif: c.querySelector('.ad-jauge-obj').textContent,
      largeur: c.querySelector('.ad-remplie').style.width,
    })),
    lignes: document.querySelectorAll('#ad-pipeline-tb tr').length,
    compte: document.getElementById('ad-compte').textContent,
    ca: document.getElementById('ad-ca').textContent.slice(0, 160),
    projets: document.getElementById('ad-projets').textContent.slice(0, 160),
    maj: document.getElementById('ad-maj').textContent,
    /* Une balise injectee depuis la feuille doit rester du TEXTE. */
    scriptInjecte: document.querySelectorAll('#ad-pipeline-tb script').length,
    debordement: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));

  console.log(`\n── ${nom} ──`);
  console.log('  résumé   :', vu.resume);
  console.log('  jauges   :', vu.jauges.map(j => `${j.titre} ${j.valeur}${j.objectif} (${j.largeur})`).join(' | '));
  console.log('  pipeline :', vu.lignes, 'lignes —', vu.compte);
  console.log('  CA       :', vu.ca.replace(/\s+/g, ' ').trim().slice(0, 120));
  console.log('  projets  :', vu.projets.replace(/\s+/g, ' ').trim().slice(0, 120));
  console.log('  maj      :', vu.maj);
  if (erreursJs.length) { echecs.push(`${nom} : erreur JS — ${erreursJs[0]}`); console.log('  ✗ JS :', erreursJs[0]); }
  if (vu.scriptInjecte) echecs.push(`${nom} : une balise <script> de la feuille a été exécutée`);
  if (vu.debordement) echecs.push(`${nom} : débordement horizontal`);
  if (!vu.lignes) echecs.push(`${nom} : pipeline vide`);

  await page.screenshot({ path: `${OUT}/admin-${nom}.png`, fullPage: true });
  await ctx.close();
}
await nav.close();
console.log(`\n  captures : ${TMP}`);
console.log(echecs.length ? `\n✗ ${echecs.length} problème(s)` : '\n✓ rendu correct dans les quatre cas');
echecs.forEach(e => console.log('   · ' + e));
process.exit(echecs.length ? 1 : 0);
