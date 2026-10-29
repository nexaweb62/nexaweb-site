#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:fleches   —   PAGES=/,/tarifs pour cibler.

   AUCUNE FLÈCHE DANS UN BOUTON.

   L'ancien bouton (l'« Interactive Hover Button » de magicui) faisait
   arriver une flèche au survol, et ce contrôle vérifiait qu'il n'y en
   avait qu'UNE : le dictionnaire de i18n.js en glissait une seconde dans
   le libellé (« Démarrer un projet → »), et le survol en montrait deux.

   Le bouton est devenu une plaque, sans flèche du tout : « → » accolé à
   un libellé est la signature des pages générées, et le libellé dit déjà
   où il mène. Le contrat change donc de « une » à « zéro », et le piège
   d'origine reste le même — le dictionnaire peut réinjecter une flèche
   que le balisage ne montre pas. On lit donc le DOM APRÈS traduction,
   dans les deux langues, aux deux largeurs.

   CE QUI EST MESURÉ, POUR CHAQUE .ihb :
     1. aucun caractère-flèche (→ › » ➜ ↗ ➤ ➔ ⇒) dans son texte ;
     2. aucun <svg> à l'intérieur ;
     3. sur / et /tarifs, au survol : le texte ne change pas et aucun
        élément n'apparaît — rien n'est injecté par un script. */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH || undefined;
const FLECHES = '→›»➜↗➤➔⇒';

const TOUTES = (process.env.PAGES || [
  '/', '/services', '/tarifs', '/devis', '/contact', '/equipe', '/avis',
  '/rendez-vous', '/comment-ca-marche', '/cgv', '/mentions-legales',
  '/politique-confidentialite', '/site-vitrine', '/ecommerce', '/seo',
  '/design-uiux', '/refonte', '/site-internet-artisan',
  '/site-internet-commerce', '/site-internet-restaurant',
  '/login', '/inscription', '/404',
].join(',')).split(',');
const SURVOL = ['/', '/tarifs'];

const nav = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const echecs = [];
let boutonsVus = 0, survolsVus = 0;

for (const langue of ['fr', 'en']) {
  for (const largeur of [1280, 390]) {
    const ctx = await nav.newContext({ viewport: { width: largeur, height: 900 } });
    await ctx.addInitScript(l => {
      try {
        sessionStorage.setItem('nexa-intro', '1');
        localStorage.setItem('nw-lang', l);
        localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: false }));
      } catch (e) {}
    }, langue);
    const page = await ctx.newPage();

    for (const chemin of TOUTES) {
      try {
        await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (e) { echecs.push(`${chemin} ${langue} ${largeur} : page injoignable`); continue; }
      /* i18n.js s'applique au chargement : on le laisse passer. */
      await page.waitForTimeout(900);

      const lot = await page.evaluate(F => [...document.querySelectorAll('.ihb')].map(b => ({
        texte: (b.textContent || '').trim().replace(/\s+/g, ' '),
        glyphes: [...(b.textContent || '')].filter(c => F.includes(c)).join(''),
        svgs: b.querySelectorAll('svg').length,
        enfants: b.querySelectorAll('*').length,
        cle: b.querySelector('[data-i18n]')?.getAttribute('data-i18n') || '(sans clé)',
      })), FLECHES);

      boutonsVus += lot.length;
      for (const b of lot) {
        const ou = `${chemin} ${langue} ${largeur}  « ${b.texte || '(vide)'} » [${b.cle}]`;
        if (b.glyphes) echecs.push(`${ou} : flèche « ${b.glyphes} » dans le texte`);
        if (b.svgs) echecs.push(`${ou} : ${b.svgs} <svg> dans le bouton`);
      }

      if (!SURVOL.includes(chemin)) continue;
      const n = lot.length;
      for (let i = 0; i < n; i++) {
        const b = page.locator('.ihb').nth(i);
        const visible = await b.evaluate(el => {
          if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) return false;
          const r = el.getBoundingClientRect(); return !!(r.width && r.height);
        }).catch(() => false);
        if (!visible) continue;
        try {
          await b.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await b.hover({ timeout: 4000, force: true });
          await page.waitForTimeout(260);
        } catch (e) { continue; }
        const apres = await b.evaluate(el => ({
          survole: el.matches(':hover'),
          texte: (el.textContent || '').trim().replace(/\s+/g, ' '),
          enfants: el.querySelectorAll('*').length,
          svgs: el.querySelectorAll('svg').length,
        }));
        if (!apres.survole) continue;
        survolsVus++;
        const ou = `${chemin} ${langue} ${largeur}  « ${lot[i].texte} » (survol)`;
        if (apres.texte !== lot[i].texte) echecs.push(`${ou} : le texte change en « ${apres.texte} »`);
        if (apres.enfants !== lot[i].enfants) echecs.push(`${ou} : ${apres.enfants - lot[i].enfants} élément(s) injecté(s)`);
        if (apres.svgs) echecs.push(`${ou} : un <svg> apparaît`);
      }
    }
    await ctx.close();
  }
}
await nav.close();

if (echecs.length) {
  console.log(`\n✗ ${echecs.length} problème(s) sur ${boutonsVus} bouton(s) lus, ${survolsVus} survolé(s) :\n`);
  for (const e of echecs) console.log('  ' + e);
  console.log('\n  Remède : le libellé ne porte jamais de flèche, ni dans la prop');
  console.log('  text= ni dans les entrées du dictionnaire de public/i18n.js, et');
  console.log('  aucun script ne doit rien ajouter dans un bouton.\n');
  process.exit(1);
}
console.log(`✓ aucune flèche, rien d'injecté — ${boutonsVus} bouton(s) lus, ${survolsVus} survolé(s), FR et EN, 1280 et 390 px`);
