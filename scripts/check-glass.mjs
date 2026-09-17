#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:glass   —   CHROME_PATH=… pour un Chromium précis.
           --self-test           —   ne vérifie que la colorimétrie du mesureur.

   CONTRASTE DES BOUTONS EN VERRE, MESURÉ SUR LES PIXELS RÉELLEMENT PEINTS.

   Pourquoi pas le compositeur de check:contrast:rendered ? Parce qu'un
   bouton en verre n'a pas de fond : il a un flou qui échantillonne ce qui
   passe derrière lui — le halo doré, la texture, le shader du hero. Aucun
   calcul sur les couleurs déclarées ne peut voir ça.

   Méthode, pour chaque libellé posé sur du verre : on capture la zone du
   libellé DEUX FOIS — une fois telle quelle, une fois le texte rendu
   transparent. La seconde capture donne le fond exact, flou compris ;
   la différence entre les deux donne exactement les pixels où la lettre
   s'est posée. On compare la couleur d'encre au fond sous ces pixels-là,
   et on garde le pire.

   Le pire pixel, pas une moyenne : c'est lui qui décide si une lettre
   disparaît. Seuil AA 4.5:1, ou 3:1 pour du grand texte.

   (Une première version cherchait les pixels d'encre par seuil de
   distance colorimétrique. À 12 px, les fûts d'une lettre n'atteignent
   jamais la couleur pleine : ils étaient comptés comme du fond, et tout
   ressortait à 1.7:1. D'où les deux captures.)

   Le mesureur se teste lui-même au démarrage sur trois valeurs posées à la
   main. Sans ça, un bug du mesureur passerait pour un site sain — c'est
   déjà arrivé sur ce projet. */
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH || undefined;
const GLYPH_D = 8;        // écart entre les deux captures au-delà duquel un pixel porte de l'encre
const MIN_GLYPH = 12;     // nombre minimal de pixels de glyphe pour que la mesure compte

/* NO_BACKDROP=1 : on rejoue tout le site comme sur un navigateur sans
   backdrop-filter. La feuille de style est réécrite à la volée — les
   déclarations de flou sautent et la branche « @supports not » devient
   inconditionnelle. C'est le seul moyen honnête de vérifier le repli :
   Chromium ne sait pas désactiver backdrop-filter. */
const NO_BACKDROP = process.env.NO_BACKDROP === '1';
const SUPPORTS_NOT = '@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px)))';

const SEL = [
  '.btn', '.btn-g', '.menu-btn', '.theme-sel', '.login-btn', '.hdr-back',
  '.cnav-close', '.lang-sel', '.enter-btn', '.submit-btn', '.lf-btn',
  '.lf-social-btn', '.lf-reset-btn', '.lf-lang-btn', '.success-back',
  '.nf-btn-home', '.nf-btn-explore', '.tc-btn',
].join(',');

const PAGES = (process.env.PAGES || [
  '/', '/tarifs', '/devis', '/contact', '/equipe', '/avis', '/login',
  '/inscription', '/404', '/site-vitrine', '/rendez-vous',
].join(',')).split(',');

const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

/* ── colorimétrie ── */
const srgb = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

for (const [ink, bg, want] of [
  [[255, 255, 255], [0, 0, 0], 21],
  [[255, 246, 228], [95, 81, 51], 7.2121],   // .btn sombre, haut du dégradé, sur --bg
  [[36, 27, 6], [215, 198, 159], 10.1001],   // .btn clair, haut du dégradé, sur --bg
]) {
  const got = ratio(ink, bg);
  if (Math.abs(got - want) > 0.005) { console.error(`✗ auto-test : ${got.toFixed(4)} ≠ ${want}`); process.exit(2); }
}
if (process.argv.includes('--self-test')) { console.log('✓ auto-test colorimétrique OK'); process.exit(0); }

const parse = c => { const m = c && c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
let measured = 0, skipped = 0;
const all = [];

for (const theme of ['dark', 'light']) {
  for (const vp of VIEWPORTS) {
    // Mouvement figé : sans ça, un fond animé derrière le verre bouge
    // entre les deux captures, et TOUT le bouton ressort comme « pixel de
    // glyphe ». Un libellé parfaitement lisible tombait ainsi à 1.24:1.
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => {
      try { localStorage.setItem('nw-theme', t); sessionStorage.setItem('nxa-ld', '1'); } catch (e) {}
    }, theme);
    const page = await ctx.newPage();
    if (NO_BACKDROP) {
      await page.route(u => u.pathname.endsWith('.css'), async route => {
        try {
          const r = await route.fetch();
          let css = await r.text();
          // D'abord les conditions @supports — jamais par une regex large :
          // la condition « @supports (backdrop-filter:blur(1px)) » contient
          // le mot, et une regex gourmande dévorait la feuille jusqu'au
          // point-virgule suivant. Tout le site devenait noir.
          css = css.split(SUPPORTS_NOT).join('@supports (color:red)');
          css = css.split('@supports (backdrop-filter:blur(1px))').join('@supports (color:__aucun__)');
          // Puis les déclarations elles-mêmes, une par une, en clair.
          for (const d of ['blur(22px) saturate(180%)', 'blur(14px)', 'blur(12px)']) {
            css = css.split(`-webkit-backdrop-filter:${d}`).join('--x-bdf:0');
            css = css.split(`backdrop-filter:${d}`).join('--x-bdf:0');
          }
          await route.fulfill({ status: 200, contentType: 'text/css', body: css });
        } catch { await route.continue().catch(() => {}); }
      });
    }

    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'load' }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(200);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 40));
        }
        window.scrollTo({ top: 0, behavior: 'instant' }); await new Promise(r => setTimeout(r, 400));
      });

      // Les LIBELLÉS, pas les conteneurs : un sélecteur de thème contient un
      // segment doré plein et deux glyphes sur verre — trois fonds, trois
      // encres. Mesurer le conteneur d'un bloc ne veut rien dire.
      const labels = await page.evaluate(sel => {
        const out = [];
        let n = 0;
        document.querySelectorAll(sel).forEach(root => {
          const rcs = getComputedStyle(root);
          if (rcs.visibility === 'hidden' || rcs.display === 'none' || +rcs.opacity < 0.9) return;
          const nodes = [root, ...root.querySelectorAll('*')];
          for (const el of nodes) {
            if (![...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none') continue;
            const r = el.getBoundingClientRect();
            if (r.width <= 2 || r.height <= 2) continue;          // .sr-only & consorts
            if (cs.clip !== 'auto' && cs.clip !== '') continue;   // clip:rect(0 0 0 0)
            const txt = [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim();
            if (!txt) continue;
            const px = parseFloat(cs.fontSize);
            const big = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
            el.setAttribute('data-glass-probe', String(n));
            out.push({
              n, ink: cs.color, txt: txt.slice(0, 32), min: big ? 3 : 4.5, px: Math.round(px),
              root: typeof root.className === 'string' && root.className
                ? '.' + root.className.trim().split(/\s+/).slice(0, 2).join('.') : root.tagName.toLowerCase(),
            });
            n++;
          }
        });
        return out;
      }, SEL);

      for (const t of labels) {
        const loc = page.locator(`[data-glass-probe="${t.n}"]`).first();
        // locator.screenshot() fait défiler puis cadre l'élément lui-même :
        // page.screenshot({clip}) mélange coordonnées de document et de
        // viewport dès qu'on a défilé, et capture alors n'importe quoi.
        let bufA, bufB;
        try {
          await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
          await page.waitForTimeout(120);
          bufA = await loc.screenshot({ timeout: 5000 });
          await page.evaluate(n => {
            const st = document.createElement('style');
            st.id = 'glass-probe-hide';
            st.textContent = `[data-glass-probe="${n}"],[data-glass-probe="${n}"] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}`;
            document.head.appendChild(st);
          }, t.n);
          await page.waitForTimeout(60);
          bufB = await loc.screenshot({ timeout: 5000 });
          await page.evaluate(() => document.getElementById('glass-probe-hide')?.remove());
        } catch {
          await page.evaluate(() => document.getElementById('glass-probe-hide')?.remove()).catch(() => {});
          skipped++; continue;
        }
        const A = await sharp(bufA).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const B = await sharp(bufB).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const ink = parse(t.ink);
        if (!ink || A.info.width !== B.info.width || A.info.height !== B.info.height) { skipped++; continue; }
        const { width: W, height: H } = A.info;

        // Un pixel porte de l'encre si les deux captures y diffèrent.
        // Le fond sous ce pixel, c'est la seconde capture.
        let wr = Infinity, wbg = null, glyphs = 0;
        for (let i = 0; i < W * H; i++) {
          const o = i * 3;
          const d = Math.abs(A.data[o] - B.data[o]) + Math.abs(A.data[o+1] - B.data[o+1]) + Math.abs(A.data[o+2] - B.data[o+2]);
          if (d < GLYPH_D) continue;
          glyphs++;
          const bg = [B.data[o], B.data[o+1], B.data[o+2]];
          const r = ratio(ink, bg);
          if (r < wr) { wr = r; wbg = bg; }
        }
        if (glyphs < MIN_GLYPH || !isFinite(wr)) { skipped++; continue; }
        measured++;
        all.push({ theme, vp: vp.width, path, root: t.root, txt: t.txt, px: t.px,
                   ratio: +wr.toFixed(2), min: t.min, bg: wbg, ink });
      }
      await page.evaluate(() => document.querySelectorAll('[data-glass-probe]').forEach(e => e.removeAttribute('data-glass-probe')));
    }
    await ctx.close();
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   L'ÉCRAN D'ACCUEIL — LE PIRE FOND DU SITE
   Le champ de soie passe du noir à l'or plein derrière la marque et le
   bouton « Entrer ». Aucun autre contrôle n'a un fond pareil, et aucun
   des passages ci-dessus ne le voyait : ils sautent l'écran d'accueil en
   posant nxa-ld dans sessionStorage.

   Pour mesurer le pire cas et pas un instant du shader, on remplace le
   canvas par un aplat de --accent : c'est la plus claire des quatre
   couleurs que le shader peut produire en sombre, la plus sombre en
   clair. Ce que le voile radial et le verre en font est alors mesuré sur
   les pixels réels, flou compris.
   ═══════════════════════════════════════════════════════════════════════ */
const introFails = [], introAll = [];
for (const theme of ['dark', 'light']) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('nw-theme', t); } catch (e) {} }, theme);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(900);
    await page.addStyleTag({ content: '#nucleus-cv{display:none!important}.ld-nucleus-wrap{background:var(--accent)!important}' });
    await page.waitForTimeout(250);

    for (const sel of ['.enter-btn span', '.ld-brand', '.ld-brand b']) {
      const loc = page.locator(sel).first();
      if (!(await loc.count())) { continue; }
      const info = await loc.evaluate(el => {
        const cs = getComputedStyle(el);
        const px = parseFloat(cs.fontSize);
        return { ink: cs.color, txt: el.textContent.trim().slice(0, 24),
                 min: (px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700)) ? 3 : 4.5 };
      }).catch(() => null);
      if (!info) continue;
      let A, B;
      try {
        A = await loc.screenshot({ timeout: 5000 });
        await page.addStyleTag({ content: `${sel}{color:transparent!important;-webkit-text-fill-color:transparent!important}` });
        await page.waitForTimeout(80);
        B = await loc.screenshot({ timeout: 5000 });
      } catch { continue; }
      const a = await sharp(A).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const b2 = await sharp(B).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      if (a.info.width !== b2.info.width || a.info.height !== b2.info.height) continue;
      const ink = parse(info.ink); if (!ink) continue;
      let wr = Infinity, wbg = null, glyphs = 0;
      for (let i = 0; i < a.info.width * a.info.height; i++) {
        const o = i * 3;
        const d = Math.abs(a.data[o] - b2.data[o]) + Math.abs(a.data[o+1] - b2.data[o+1]) + Math.abs(a.data[o+2] - b2.data[o+2]);
        if (d < GLYPH_D) continue;
        glyphs++;
        const bg = [b2.data[o], b2.data[o+1], b2.data[o+2]];
        const r = ratio(ink, bg);
        if (r < wr) { wr = r; wbg = bg; }
      }
      if (glyphs < MIN_GLYPH || !isFinite(wr)) continue;
      const rec = { theme, vp: vp.width, sel, txt: info.txt, ratio: +wr.toFixed(2), min: info.min, bg: wbg, ink };
      introAll.push(rec);
      if (wr < info.min) introFails.push(rec);
      // On remet l'encre pour la mesure suivante.
      await page.addStyleTag({ content: `${sel}{color:${info.ink}!important;-webkit-text-fill-color:${info.ink}!important}` });
    }
    await ctx.close();
  }
}
await browser.close();

const fails = all.filter(r => r.ratio < r.min);
all.sort((a, b) => a.ratio / a.min - b.ratio / b.min);
console.log(`${NO_BACKDROP ? '[SANS backdrop-filter] ' : ''}${measured} libellés sur verre mesurés au pixel — 2 thèmes × ${VIEWPORTS.length} largeurs × ${PAGES.length} pages.`);
if (skipped) console.log(`(${skipped} ignorés : hors écran, invisibles, ou trop peu de pixels de glyphe.)`);
console.log('\nLes dix plus justes :');
for (const w of all.slice(0, 10)) {
  console.log(`  [${w.theme} ${w.vp}] ${w.path} ${w.root} ${w.ratio}:1 / ${w.min} — rgb(${w.ink}) sur rgb(${w.bg}) — « ${w.txt} »`);
}

console.log(`\nÉcran d'accueil, fond forcé à --accent (le pire que le shader produise) — ${introAll.length} mesures :`);
introAll.sort((a, b) => a.ratio / a.min - b.ratio / b.min);
for (const w of introAll) {
  console.log(`  [${w.theme} ${w.vp}] ${w.sel}  ${w.ratio}:1 / ${w.min} — rgb(${w.ink}) sur rgb(${w.bg}) — « ${w.txt} »`);
}
fails.push(...introFails);
if (!fails.length) { console.log('\n✓ Aucun libellé de bouton sous son seuil WCAG AA.'); process.exit(0); }
console.log(`\n✗ ${fails.length} sous le seuil :`);
const seen = new Set();
for (const f of fails) {
  const k = f.theme + (f.path || 'intro') + (f.root || f.sel) + f.txt + f.ratio;
  if (seen.has(k)) continue; seen.add(k);
  console.log(`  [${f.theme} ${f.vp}] ${f.path || "accueil (écran d'intro)"}  ${f.root || f.sel}  ${f.ratio}:1 < ${f.min}:1  « ${f.txt} »  encre rgb(${f.ink}) sur rgb(${f.bg})`);
}
process.exit(1);
