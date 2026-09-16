#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:contrast:rendered
   CHROME_PATH=… pour pointer un Chromium précis. */
/* Mesure le contraste RÉELLEMENT RENDU : chaque élément portant du texte,
   sa couleur calculée contre le fond effectif derrière lui (en remontant
   les parents transparents). Plus sévère que la vérification des paires de
   tokens, qui ne sait pas ce qui atterrit sur quoi. */
import { chromium } from 'playwright-core';

const BASE  = process.env.BASE || 'http://localhost:4321';
const PAGES = (process.env.PAGES || [
  '/', '/tarifs', '/devis', '/contact', '/equipe', '/avis', '/login', '/inscription',
  '/site-vitrine', '/ecommerce', '/refonte', '/seo', '/design-uiux', '/comment-ca-marche',
  '/404', '/rendez-vous', '/mentions-legales', '/politique-confidentialite',
  '/site-internet-artisan', '/site-internet-commerce', '/site-internet-restaurant',
].join(',')).split(',');
const CHROME = process.env.CHROME_PATH || undefined;
const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
let total = 0, fails = [];

for (const theme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  await ctx.addInitScript(t => { try { localStorage.setItem('nw-theme', t); sessionStorage.setItem('nxa-ld','1'); } catch(e){} }, theme);
  const p = await ctx.newPage();

  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' }).catch(()=>{});
    await p.evaluate(async () => {
      for (let y=0; y<document.body.scrollHeight; y+=500) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,60)); }
      window.scrollTo({top:0,behavior:'instant'}); await new Promise(r=>setTimeout(r,500));
    });

    const res = await p.evaluate(() => {
      // color-mix() est rendu par le navigateur en color(srgb r g b / a) où
      // r,g,b sont dans 0–1, pas 0–255. Sans ce cas, du blanc se lisait
      // comme rgb(1,1,1), c'est-à-dire presque noir.
      const parse = c => {
        if (!c || c === 'transparent') return null;
        const srgb = c.match(/^color\(srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)(?:\s*\/\s*([\d.%]+))?\)/);
        if (srgb) {
          const a = srgb[4] === undefined ? 1 : (srgb[4].endsWith('%') ? parseFloat(srgb[4]) / 100 : +srgb[4]);
          return [1,2,3].map(i => Math.round(Math.min(1, Math.max(0, +srgb[i])) * 255)).concat(a);
        }
        const m = c.match(/[\d.]+/g);
        return m ? m.slice(0,3).map(Number).concat(m[3] !== undefined ? +m[3] : 1) : null;
      };
      const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
        return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
      const over = (fg, bg) => fg[3] >= 1 ? fg : [0,1,2].map(i => fg[i]*fg[3] + bg[i]*(1-fg[3])).concat(1);
      const ratio = (a,b2) => { const [x,y] = [lum(a),lum(b2)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };

      function bgOf(el) {
        let acc = null;
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (!c || c[3] === 0) continue;
          acc = acc ? over(acc, c) : c;
          if (acc[3] >= 1) return acc;
        }
        return acc && acc[3] >= 1 ? acc : [255,255,255,1];
      }

      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        // Uniquement les éléments dont le texte leur appartient en propre.
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!own) return;
        // Texte posé sur un voile photographique : son fond réel est un
        // élément FRÈRE (le dégradé sur la photo), que remonter les
        // ancêtres ne peut pas voir. Mesuré à part, à l'œil.
        if (el.closest('[data-on-media]')) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        if (parseFloat(cs.opacity) < 0.75) return;          // en cours d'animation
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;

        const fg = parse(cs.color); if (!fg) return;
        const bg = bgOf(el);
        const cr = ratio(over(fg, bg), bg);
        const px = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        // WCAG : « grand texte » = 24px, ou 18.66px en gras → seuil 3:1
        const min = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
        if (cr < min) out.push({
          sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : ''),
          text: el.textContent.trim().slice(0, 44),
          ratio: +cr.toFixed(2), min, px: Math.round(px),
        });
        window.__n = (window.__n || 0) + 1;
      });
      return { fails: out, checked: window.__n || 0 };
    });

    total += res.checked;
    res.fails.forEach(f => fails.push({ theme, path, ...f }));
  }
  await ctx.close();
}
await b.close();

console.log(`${total} éléments de texte mesurés sur ${PAGES.length} page(s) × 2 thèmes.`);
if (!fails.length) { console.log('✓ Aucun texte sous son seuil WCAG AA.'); process.exit(0); }
console.log(`✗ ${fails.length} sous le seuil :\n`);
const seen = new Set();
for (const f of fails) {
  const k = f.theme + f.path + f.sel + f.ratio;
  if (seen.has(k)) continue; seen.add(k);
  console.log(`  [${f.theme}] ${f.path}  ${f.sel}  ${f.ratio}:1 < ${f.min}:1  (${f.px}px)\n      « ${f.text} »`);
}
process.exit(1);
