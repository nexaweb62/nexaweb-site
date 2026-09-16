#!/usr/bin/env node
/* Détecte les CASSURES HORIZONTALES du fond.

   Méthode : on ne mesure que les GOUTTIÈRES EXTÉRIEURES — les colonnes
   situées hors de la colonne de contenu (.wrap est plafonné à 1280 px et
   centré, donc au-delà il n'y a que du fond). Une carte, un bouton ou une
   image n'y arrive jamais. Tout palier de luminance qui apparaît dans ces
   colonnes est donc une cassure du fond, et non le bord d'un bloc réel.

   On compare en L* (clarté perceptuelle) et non en luminance linéaire :
   sur un fond quasi noir, un écart de luminance minuscule est très visible.

   On capture viewport par viewport plutôt qu'en pleine page : les couches
   d'ambiance sont en position:fixed, une capture pleine page les étire et
   invente un bord qui n'existe pas au défilement.

   Usage : npm run check:seams   (le site doit tourner)
*/
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const BASE   = process.env.BASE   || 'http://localhost:4321';
const PAGES  = (process.env.PAGES || '/').split(',');
const THEMES = (process.env.THEMES || 'dark').split(',');
const W = 1440, VH = 900;
const GUTTER = 56;                      // colonnes de fond pur, de chaque bord
/* Seuil en L*. 1,0 correspond au seuil de perception (JND) d'une arête
   franche sur une grande surface. En dessous on mesure le bruit de
   rastérisation du navigateur : un écart de 0,5 L* sur ce fond vaut
   1,5 niveau sur 255, soit un rapport de contraste de 1,007:1 — rien
   qu'un œil puisse voir. DELTA_L=0.3 pour inspecter ce plancher. */
const DELTA_L = Number(process.env.DELTA_L || 1.0);
/* L'en-tête et la barre de progression sont en position:fixed : ils se
   re-dessinent en haut de CHAQUE vue et produiraient une fausse cassure
   tous les 675 px. On saute donc le haut de chaque capture — les vues se
   chevauchant, aucune ligne du document n'échappe à la mesure. */
const SKIP_TOP = 96;
const CHROME = process.env.CHROME_PATH || undefined;

const toL = (Y) => Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
let totalFound = 0;

for (const theme of THEMES) {
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: VH }, colorScheme: theme,
      /* Décors figés : une cassure structurelle est la même dans les deux
         modes, mais seul celui-ci est mesurable de façon déterministe. */
      reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('nw-theme', t); sessionStorage.setItem('nxa-ld', '1'); } catch (e) {} }, theme);
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});

    // Déclenche toutes les entrées, sinon on mesure une page à moitié révélée.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 70));
      }
      window.scrollTo({ top: 0, behavior: 'instant' }); await new Promise(r => setTimeout(r, 500));
    });
    const docH = await page.evaluate(() => document.body.scrollHeight);

    const seams = new Map();
    for (let scrollY = 0; scrollY < docH - VH * 0.3; scrollY += Math.round(VH * 0.75)) {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
      await page.waitForTimeout(220);
      const real = await page.evaluate(() => window.scrollY);

      /* Deux captures à la même position, espacées dans le temps. Une vraie
         cassure est STATIQUE ; un fond animé (canvas, shader) bouge entre
         les deux et produirait sinon des dizaines de fausses alertes. On ne
         retient que ce qui se reproduit à l'identique. */
      const profile = async () => {
        const buf = await page.screenshot();
        const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
        const ch = info.channels, out = new Float64Array(info.height);
        for (let y = 0; y < info.height; y++) {
          let sum = 0, n = 0;
          for (let x = 0; x < info.width; x++) {
            if (x >= GUTTER && x < info.width - GUTTER) continue;   // hors gouttières
            const i = (y * info.width + x) * ch;
            sum += 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]);
            n++;
          }
          out[y] = toL(sum / n);
        }
        return out;
      };
      const shots = [await profile()];
      for (let k = 0; k < 2; k++) { await page.waitForTimeout(350); shots.push(await profile()); }

      for (let y = SKIP_TOP; y < shots[0].length; y++) {
        const ds = shots.map(s => Math.abs(s[y] - s[y - 1]));
        const lo = Math.min(...ds), hi = Math.max(...ds);
        if (lo < DELTA_L) continue;                       // doit tenir sur les TROIS
        if (hi - lo > DELTA_L * 0.3) continue;            // dispersé → animation, pas cassure
        const docY = real + y;
        const key = Math.round(docY / 3) * 3;
        if (!seams.has(key) || seams.get(key).d < lo)
          seams.set(key, { docY, d: lo, from: shots[0][y - 1], to: shots[0][y] });
      }
    }

    // À quoi correspond chaque cassure dans le DOM ?
    const found = [...seams.values()].sort((a, b) => b.d - a.d);
    const annotated = [];
    for (const s of found) {
      const what = await page.evaluate((y) => {
        const els = [...document.querySelectorAll('section, .sec-texture, .amb-depth, .amb-streak, footer, main > *')];
        const near = els.map(e => {
          const r = e.getBoundingClientRect();
          const top = r.top + window.scrollY, bot = top + r.height;
          return { sel: (e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : '')).slice(0, 34),
                   dTop: Math.abs(top - y), dBot: Math.abs(bot - y), top: Math.round(top), bot: Math.round(bot) };
        }).filter(o => o.dTop < 4 || o.dBot < 4);
        return near.map(o => `${o.sel}${o.dTop < 4 ? ' (haut ' + o.top + ')' : ' (bas ' + o.bot + ')'}`).join(' · ') || '—';
      }, s.docY);
      annotated.push({ ...s, what });
    }

    const label = `${theme} ${path}`;
    if (!annotated.length) console.log(`✓ ${label} — aucune cassure du fond (seuil ΔL* ≥ ${DELTA_L})`);
    else {
      console.log(`✗ ${label} — ${annotated.length} cassure(s) :`);
      for (const s of annotated)
        console.log(`   y=${String(s.docY).padStart(5)}  ΔL*=${s.d.toFixed(2).padStart(6)}  (L* ${s.from.toFixed(1)} → ${s.to.toFixed(1)})  ${s.what}`);
      totalFound += annotated.length;
    }
    await ctx.close();
  }
}
await browser.close();
process.exit(totalFound ? 1 : 0);
