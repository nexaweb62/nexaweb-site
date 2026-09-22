#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:liquid   —   CHROME_PATH=… pour un Chromium précis.

   LE TEXTE PEINT PAR UN DÉGRADÉ.

   `background-clip:text` demande `color:transparent` : le texte n'a plus
   de couleur, il est découpé dans un dégradé. Tout contrôle qui lit la
   propriété `color` y voit donc du transparent et annonce 1:1 — ce que
   check:contrast:rendered faisait, à juste titre incapable de voir à
   travers. Le chiffre était faux, mais l'alerte était fondée : mesuré au
   pixel, le dégradé de la référence descendait à 1,90:1 sur noir et
   2,76:1 sur blanc.

   Ce garde-fou mesure ce qui est RÉELLEMENT PEINT. Pour chaque élément
   concerné, deux captures de la même zone — une normale, une avec le
   texte masqué. Tout pixel qui change est de l'encre ; le fond est lu au
   même endroit sur la seconde.

   LE PIÈGE DE LA MESURE, EN DEUX TEMPS.

   D'abord : le pixel le plus faible d'un glyphe est toujours un pixel
   d'ANTICRÉNELAGE, à moitié encre à moitié fond. Le prendre pour verdict
   reviendrait à déclarer tout texte illisible — mesuré à 1,24:1 sur un
   texte parfaitement lisible.

   Ensuite, et c'est le piège suivant : filtrer « les pixels les plus
   écartés du fond » ne suffit pas. Ils restent partiellement couverts,
   et la preuve est arithmétique — en sombre l'encre mesurée ressortait
   PLUS SOMBRE que la butée la plus sombre du dégradé, en clair PLUS
   CLAIRE que la plus claire. Dans les deux cas, du fond s'y était mêlé.
   Juger là-dessus condamne un texte lisible.

   D'où une TROISIÈME capture, avec le texte forcé en noir plein. Elle
   donne la couverture réelle de chaque pixel : alpha = (fond - noir) /
   fond. On ne juge alors que les pixels PLEINEMENT couverts (alpha au
   moins 0,95), dont la couleur affichée est celle de l'encre, sans
   mélange.

   Seuil : 3:1, le minimum WCAG AA pour du grand texte — ces éléments le
   sont tous (44 px et plus). */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH || undefined;
const SEUIL = 3;
/* Où le site peint du texte dans un dégradé. */
const CIBLES = [
  ['/devis', '.dv-title .liquid', '« 48 heures »'],
  ['/',      '.proc-step:nth-child(1) .liquid', 'méthode « 01 »'],
  ['/',      '.proc-step:nth-child(4) .liquid', 'méthode « 04 »'],
];

const lum = (r, g, b) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contraste = (a, b) => {
  const [x, y] = [lum(...a), lum(...b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

const navigateur = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const echecs = [];
let mesures = 0;

for (const [chemin, sel, nom] of CIBLES) {
  for (const theme of ['dark', 'light']) {
    const ctx = await navigateur.newContext({
      viewport: { width: 1280, height: 900 }, colorScheme: theme, reducedMotion: 'reduce',
    });
    await ctx.addInitScript(t => {
      try { localStorage.setItem('nw-theme', t); } catch (e) {}
    }, theme);
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1400);

    const el = await page.$(sel);
    if (!el) { echecs.push(`${nom} (${theme}) : introuvable — ${sel}`); await ctx.close(); continue; }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    /* Une séquence épinglée ne montre qu'une étape à la fois : on force
       celle qu'on mesure à être visible, sinon il n'y a rien à mesurer. */
    await page.evaluate(s => {
      const e = document.querySelector(s);
      const pas = e && e.closest('.proc-step');
      if (pas) pas.style.cssText = 'opacity:1!important;animation:none!important;transform:none!important';
    }, sel);
    await page.waitForTimeout(250);

    const boite = await el.boundingBox();
    if (!boite || boite.width < 4) { echecs.push(`${nom} (${theme}) : sans surface`); await ctx.close(); continue; }
    const zone = {
      x: Math.round(boite.x), y: Math.round(boite.y),
      width: Math.round(boite.width), height: Math.round(boite.height),
    };
    const avec = (await page.screenshot({ clip: zone })).toString('base64');
    /* Texte en noir plein : donne la couverture de chaque pixel. */
    await page.evaluate(s => {
      const e = document.querySelector(s);
      e.dataset.av = e.getAttribute('style') || '';
      e.style.backgroundImage = 'none';
      e.style.color = '#000';
      e.style.webkitTextFillColor = '#000';
    }, sel);
    await page.waitForTimeout(220);
    const noir = (await page.screenshot({ clip: zone })).toString('base64');
    await page.evaluate(s => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
    await page.waitForTimeout(220);
    const sans = (await page.screenshot({ clip: zone })).toString('base64');

    const px = await page.evaluate(async ({ a, k, b }) => {
      const lire = async d64 => {
        const img = new Image(); img.src = 'data:image/png;base64,' + d64; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
        return c.getImageData(0, 0, cv.width, cv.height).data;
      };
      const A = await lire(a), K = await lire(k), B = await lire(b);
      const out = [];
      for (let i = 0; i < A.length; i += 4) {
        /* noir = (1-alpha)*fond  =>  alpha = 1 - noir/fond, par canal.
           On prend le canal le plus lumineux du fond : le plus fiable,
           celui qui a le plus de marge pour descendre. */
        let cMax = 0, fMax = 0;
        for (let c = 0; c < 3; c++) if (B[i + c] > fMax) { fMax = B[i + c]; cMax = c; }
        if (fMax < 8) {
          /* Fond quasi noir : la couverture ne se lit pas ainsi. On se
             rabat sur l'écart au fond du texte noir, qui vaut alors 0 —
             donc on prend l'écart de l'encre, normalisé plus bas. */
          out.push([A[i], A[i + 1], A[i + 2], B[i], B[i + 1], B[i + 2], -1]);
          continue;
        }
        const alpha = 1 - (K[i + cMax] / fMax);
        out.push([A[i], A[i + 1], A[i + 2], B[i], B[i + 1], B[i + 2], alpha]);
      }
      return out;
    }, { a: avec, k: noir, b: sans });
    await ctx.close();

    /* Fond trop sombre pour lire la couverture par le noir : on la lit
       par l'écart de l'encre au fond, normalisé sur le maximum. */
    let coeur = px.filter(p => p[6] >= 0.95);
    if (!coeur.length) {
      const ecart = p => Math.abs(p[0]-p[3]) + Math.abs(p[1]-p[4]) + Math.abs(p[2]-p[5]);
      const m = Math.max(...px.map(ecart));
      coeur = px.filter(p => ecart(p) >= m * 0.97);
    }
    if (!coeur.length) { echecs.push(`${nom} (${theme}) : aucun pixel pleinement couvert`); continue; }

    let pire = Infinity, pireP = null;
    for (const [r, g, b, fr, fg, fb] of coeur) {
      const k = contraste([r, g, b], [fr, fg, fb]);
      if (k < pire) { pire = k; pireP = [[r, g, b], [fr, fg, fb]]; }
    }
    mesures++;
    const ligne = `${nom} (${theme}) — ${pire.toFixed(2)}:1 sur ${coeur.length} px de cœur`
      + ` (encre rgb(${pireP[0]}) sur fond rgb(${pireP[1]}))`;
    if (pire < SEUIL) echecs.push(ligne); else console.log('  ok   ' + ligne);
  }
}
await navigateur.close();

console.log(`\n${mesures} texte(s) en dégradé mesuré(s) au pixel, seuil ${SEUIL}:1 (grand texte).`);
if (!echecs.length) { console.log('\n✓ Tout texte peint par un dégradé reste lisible.'); process.exit(0); }
console.log(`\n✗ ${echecs.length} sous le seuil :\n`);
for (const e of echecs) console.log('  ' + e);
process.exit(1);
