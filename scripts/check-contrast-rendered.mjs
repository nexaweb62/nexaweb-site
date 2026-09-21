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
    /* 'load' puis networkidle en deux temps : avec des CDN bloqués,
       networkidle peut se résoudre pendant que le document est encore en
       train d'être remplacé, et l'evaluate qui suit part dans le vide. */
    await p.goto(BASE + path, { waitUntil: 'load' }).catch(()=>{});
    await p.waitForLoadState('networkidle').catch(()=>{});
    await p.waitForTimeout(150);
    /* Un rechargement peut emporter le contexte pendant le parcours :
       on réessaie une fois plutôt que de faire tomber toute la série. */
    const parcourir = () => p.evaluate(async () => {
      for (let y=0; y<document.body.scrollHeight; y+=500) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,60)); }
      window.scrollTo({top:0,behavior:'instant'}); await new Promise(r=>setTimeout(r,500));
    });
    try { await parcourir(); }
    catch (e) {
      console.warn(`  (contexte perdu sur ${path} en ${theme} — on recharge)`);
      await p.goto(BASE + path, { waitUntil: 'load' }).catch(()=>{});
      await p.waitForTimeout(400);
      await parcourir().catch(()=>{});
    }

    const res = await p.evaluate(() => {
      // color-mix() est rendu par le navigateur en color(srgb r g b / a) où
      // r,g,b sont dans 0–1, pas 0–255. Sans ce cas, du blanc se lisait
      // comme rgb(1,1,1), c'est-à-dire presque noir.
      /* Le navigateur sert aujourd'hui des oklab(), des color(srgb …) et
         des color-mix() résolus. Une forme non reconnue ne doit JAMAIS
         être devinée : un oklab lu comme du rgb donnait un noir presque
         opaque et faisait échouer des boutons parfaitement lisibles.
         On la fait donc rasteriser par le navigateur lui-même. */
      const cv = document.createElement('canvas'); cv.width = cv.height = 1;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const viaCanvas = c => {
        try {
          cx.clearRect(0, 0, 1, 1);
          cx.fillStyle = '#000'; cx.fillStyle = c;
          if (cx.fillStyle === '#000' && !/^#0{3,6}$|^black$|^rgba?\(0, ?0, ?0/.test(c)) return null;
          cx.clearRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
          const d = cx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        } catch (e) { return null; }
      };
      const parse = c => {
        if (!c || c === 'transparent') return null;
        const srgb = c.match(/^color\(srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)(?:\s*\/\s*([\d.%]+))?\)/);
        if (srgb) {
          const a = srgb[4] === undefined ? 1 : (srgb[4].endsWith('%') ? parseFloat(srgb[4]) / 100 : +srgb[4]);
          return [1,2,3].map(i => Math.round(Math.min(1, Math.max(0, +srgb[i])) * 255)).concat(a);
        }
        if (/^rgba?\(/.test(c)) {
          const m = c.match(/[\d.]+/g);
          return m ? m.slice(0,3).map(Number).concat(m[3] !== undefined ? +m[3] : 1) : null;
        }
        return viaCanvas(c);
      };
      const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
        return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
      // « source-over » complet : le résultat de deux voiles empilés reste
      // un voile. L'ancienne version forçait alpha = 1 au premier
      // composite, si bien qu'un voile d'or à 13 % était lu comme de l'or
      // plein — et un bouton parfaitement lisible ressortait à 1.87:1.
      const over = (fg, bg) => {
        if (fg[3] >= 1) return fg;
        const a = fg[3] + bg[3] * (1 - fg[3]);
        if (a <= 0) return [0, 0, 0, 0];
        return [0,1,2].map(i => (fg[i]*fg[3] + bg[i]*bg[3]*(1-fg[3])) / a).concat(a);
      };
      const ratio = (a,b2) => { const [x,y] = [lum(a),lum(b2)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };

      // Les boutons en verre n'ont pas de background-color : ils ont un
      // dégradé translucide (background-image). Le lire est indispensable,
      // sinon on mesure le texte contre le fond de page et on croit le
      // verre lisible alors qu'on ne l'a jamais mesuré.
      // Chaque arrêt de couleur du dégradé donne un fond candidat ; le
      // texte traverse toute la hauteur du bouton, donc on retient le pire.
      const stopsOf = n => {
        const bi = getComputedStyle(n).backgroundImage;
        if (!bi || bi === 'none' || !/gradient/.test(bi)) return null;
        const cols = bi.match(/(?:rgba?|color)\([^()]*\)/g);
        if (!cols) return null;
        const out = cols.map(parse).filter(Boolean);
        return out.length ? out : null;
      };
      // k = 0 → premier arrêt de chaque dégradé, k = 1 → dernier.
      function bgOf(el, k) {
        let acc = null;
        for (let n = el; n; n = n.parentElement) {
          const st = stopsOf(n);
          const layers = [];
          if (st) layers.push(k === 0 ? st[0] : st[st.length - 1]);
          layers.push(parse(getComputedStyle(n).backgroundColor));
          for (const c of layers) {
            if (!c || c[3] === 0) continue;
            acc = acc ? over(acc, c) : c;
            if (acc[3] >= 0.999) return acc;
          }
        }
        return acc && acc[3] >= 0.999 ? acc : [255,255,255,1];
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
        /* Décor retiré de l'arbre d'accessibilité : le ruban au-dessus du
           pied de page est un lettrage creux, aria-hidden, sans contenu.
           WCAG 1.4.3 exempte explicitement ce qui est décoratif. */
        if (el.closest('[aria-hidden="true"]')) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        // L'opacité d'un ANCÊTRE s'applique au texte comme si l'encre
        // était translucide. Sans en tenir compte, un paragraphe à
        // opacity:.85 se mesurait sur sa couleur déclarée : les liens des
        // pages légales passaient ici et tombaient à 3.96:1 en vrai.
        let opAcc = 1;
        for (let n = el; n; n = n.parentElement) opAcc *= parseFloat(getComputedStyle(n).opacity);
        // Texte réservé aux lecteurs d'écran : découpé à 1 px, jamais peint.
        // Le contraste ne s'applique pas à ce qui ne s'affiche pas.
        if (cs.clip !== 'auto' && cs.clip !== '') return;
        if (opAcc < 0.1) return;                            // invisible ou en cours d'animation
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;

        const fg = parse(cs.color); if (!fg) return;
        fg[3] *= opAcc;
        const cands = [bgOf(el, 0), bgOf(el, 1)];
        let bg = cands[0], cr = Infinity;
        for (const c of cands) { const r2 = ratio(over(fg, c), c); if (r2 < cr) { cr = r2; bg = c; } }
        const px = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        // WCAG : « grand texte » = 24px, ou 18.66px en gras → seuil 3:1
        const min = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
        if (cr < min) {
          el.setAttribute('data-contrast-probe', String(out.length));
          out.push({
            probe: out.length,
            sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : ''),
            text: el.textContent.trim().slice(0, 44),
            ratio: +cr.toFixed(2), min, px: Math.round(px),
          });
        }
        window.__n = (window.__n || 0) + 1;
      });
      window.__mesure = el => {
        const cs2 = getComputedStyle(el);
        let op2 = 1;
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          op2 *= parseFloat(getComputedStyle(n).opacity);
        }
        const fg2 = parse(cs2.color); if (!fg2) return null;
        fg2[3] *= op2;
        let cr2 = Infinity;
        for (const c of [bgOf(el, 0), bgOf(el, 1)]) {
          const r3 = ratio(over(fg2, c), c); if (r3 < cr2) cr2 = r3;
        }
        const px2 = parseFloat(cs2.fontSize);
        const bold2 = parseInt(cs2.fontWeight, 10) >= 700;
        return { cr: cr2, min: (px2 >= 24 || (px2 >= 18.66 && bold2)) ? 3 : 4.5 };
      };
      return { fails: out, checked: window.__n || 0 };
    });

    total += res.checked;

    /* Second passage : une carte saisie en plein pli est à 64 %
       d'opacité, et son texte ressort alors sous AA. Ce n'est pas un
       défaut de contraste, c'est une animation en cours. On amène donc
       chaque échec au centre de l'écran, on laisse l'animation finir, et
       on ne garde que ce qui échoue ENCORE. */
    if (res.fails.length) {
      /* On FIGE tout pour le second passage. Centrer l'élément ne suffit
         pas : la carte qui le porte est plus grande que lui et peut
         rester en plein pli. Or le contraste se juge AU REPOS — un état
         transitoire d'animation n'est pas un défaut de contraste. */
      await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
        .catch(() => {});
      await p.waitForTimeout(120);
    }
    for (const f of res.fails) {
      const encore = await p.evaluate(async n => {
        const el = document.querySelector(`[data-contrast-probe="${n}"]`);
        if (!el) return null;
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise(r => setTimeout(r, 160));
        return window.__mesure(el);
      }, f.probe);
      if (encore && encore.cr < encore.min) {
        fails.push({ theme, path, ...f, ratio: +encore.cr.toFixed(2) });
      }
    }
    await p.evaluate(() => {
      document.querySelectorAll('[data-contrast-probe]').forEach(e => e.removeAttribute('data-contrast-probe'));
    });
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
