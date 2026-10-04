#!/usr/bin/env node
/* Prerequis : npm run build && npx astro preview (port 4321).
   Usage : npm run check:soie

   LE CONTRASTE DES TEXTES POSES SUR LA SOIE, MESURE.

   La soie bouge : une seule image ne prouve rien. On echantillonne
   plusieurs instants et on garde le PIRE pixel vu.

   Methode, et ses deux temoins :
     - on masque le texte par visibility:hidden — et non par
       color:transparent, qui laisse -webkit-text-fill-color peindre
       encore les lettres — on capture son rectangle, et on lit le fond
       REELLEMENT peint derriere lui ;
     - temoin A, un carre magenta injecte sous le meme protocole : si la
       capture et le calcul sont justes on doit relire du magenta franc.
       Sinon l'instrument ment, et son verdict est jete ;
     - temoin B, un texte de carte : son fond doit retomber sur
       --surface, a quelques points pres (le grain du site assombrit
       toute capture).

   Limite assumee : on ne mesure que ce qui est VISIBLE et STABLE. Un element encore
   transforme ou a demi transparent — une carte en train de s'ouvrir —
   est saute, sinon le harnais accuse le fond de ce que fait l'animation
   d'entree. Un texte qui resterait transforme pour toujours serait, lui,
   attrape par check:anim.
*/
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const PATH = process.env.PATH_PAGE || '/tarifs/';
const ECH = +(process.env.ECH || 9);        // instants echantillonnes, repartis sur toute la page
const AA = 4.5, AA_GRAND = 3.0;             // seuils WCAG

function lum([r, g, b]) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = s => {
  const v = String(s).trim();
  if (v.charAt(0) === '#') {
    const h = v.length === 4 ? v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : v.slice(1);
    return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
  }
  const m = v.match(/-?[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
};

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const defauts = [];
let mesures = 0;

/* Decode un PNG dans la page et rend les pixels extremes : le plus
   clair et le plus sombre du rectangle. Ce sont eux qui decident. */
async function extremes(page, buf) {
  return page.evaluate(async b64 => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const L = p => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
      return .2126 * f(p[0]) + .7152 * f(p[1]) + .0722 * f(p[2]); };
    /* Deux precautions, nees d'une mesure fausse : le rectangle d'un
       texte touche ses voisins — une pastille doree, une pastille de
       validation — et page.screenshot arrondit le decoupage vers
       l'exterieur. Le pixel le plus clair etait donc regulierement un
       pixel de bordure, pas le fond sous les lettres.
         - on rentre de 2 pixels sur chaque bord ;
         - on prend les 2e et 98e centiles de luminance, pas les
           extremes : un pixel isole ne decide plus de rien. */
    const M = 2;
    const px = [];
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = M; y < c.height - M; y++) {
      for (let x = M; x < c.width - M; x++) {
        const i = (y * c.width + x) * 4;
        const p = [d[i], d[i + 1], d[i + 2]];
        px.push({ p, l: L(p) });
        sr += p[0]; sg += p[1]; sb += p[2]; n++;
      }
    }
    if (!n) return null;
    px.sort((a, b) => a.l - b.l);
    const q = f => px[Math.min(px.length - 1, Math.max(0, Math.round(f * (px.length - 1))))].p;
    return { hi: q(0.98), lo: q(0.02), moy: [sr / n, sg / n, sb / n].map(Math.round) };
  }, buf.toString('base64'));
}

for (const theme of ['dark', 'light']) {
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme });
    await ctx.addInitScript(t => { try { localStorage.setItem('nw-theme', t); } catch (e) {} }, theme);
    const page = await ctx.newPage();
    await page.goto(BASE + PATH, { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    /* On parcourt la page pour declencher les animations d'entree,
       sinon la moitie des textes est a opacite 0 et ne prouve rien. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 350) {
        scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
      }
      scrollTo(0, 0); await new Promise(r => setTimeout(r, 500));
    });
    await page.waitForTimeout(1200);

    /* ── TEMOIN A : un carre magenta, mesure par le meme chemin. ── */
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'temoin-magenta';
      d.style.cssText = 'position:fixed;left:40px;top:300px;width:80px;height:50px;' +
        'background:#FF00FF;z-index:9999';
      d.textContent = 'temoin';
      document.body.appendChild(d);
    });
    await page.waitForTimeout(250);
    const rT = await page.evaluate(() => {
      const el = document.getElementById('temoin-magenta');
      el.style.visibility = 'hidden';
      const r = el.getBoundingClientRect();
      return { x: r.x + 4, y: r.y + 4, width: r.width - 8, height: r.height - 8 };
    });
    /* visibility:hidden masque AUSSI le fond de l'element. Le temoin se
       mesure donc visible : il verifie la capture et le calcul, pas le
       masquage. Le masquage, c'est le temoin B qui le verifie. */
    await page.evaluate(() => { document.getElementById('temoin-magenta').style.visibility = 'visible'; });
    await page.waitForTimeout(120);
    const mag = await extremes(page, await page.screenshot({ clip: rT })) || { moy: [0, 0, 0] };
    await page.evaluate(() => document.getElementById('temoin-magenta').remove());
    const ecartMag = Math.max(Math.abs(mag.moy[0] - 255), Math.abs(mag.moy[1] - 0), Math.abs(mag.moy[2] - 255));
    if (ecartMag > 24) {
      console.log('INSTRUMENT FAUX — le temoin magenta se relit ' + mag.moy +
        ' au lieu de 255,0,255. Mesures abandonnees pour ' + theme + ' ' + vp.width + '.');
      await ctx.close();
      continue;
    }

    /* ── Les textes sans fond opaque, trouves par composition d'alphas. ── */
    const cibles = await page.evaluate(() => {
      const alpha = c => { const m = c.match(/-?[\d.]+/g); return !m ? 0 : (m.length > 3 ? +m[3] : 1); };
      /* Le pied de page aussi passe sur la soie : elle est fixee a
         l'ecran, pas bornee a <main>. L'oublier revenait a ne mesurer
         que la moitie de ce que le visiteur lit. */
      const racines = [...document.querySelectorAll('main, footer')];
      const out = []; let i = 0;
      document.querySelectorAll('main *, footer *').forEach(el => {
        const main = racines.find(r => r.contains(el));
        if (!main) return;
        const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim())
          .map(n => n.nodeValue.trim()).join(' ');
        if (!txt) return;
        const r0 = el.getBoundingClientRect();
        if (!r0.width || !r0.height) return;
        const cs = getComputedStyle(el);
        if (+cs.opacity < 0.9) return;
        let cover = 0, n = el;
        while (n && n !== main.parentElement) {
          cover = 1 - (1 - cover) * (1 - alpha(getComputedStyle(n).backgroundColor));
          if (cover >= 0.995) break;
          n = n.parentElement;
        }
        if (cover >= 0.995) return;
        el.setAttribute('data-soie', 's' + (i++));
        const px = parseFloat(cs.fontSize), gras = +cs.fontWeight >= 700;
        out.push({
          id: el.getAttribute('data-soie'), cover: +cover.toFixed(2),
          cls: String(el.className || el.tagName).slice(0, 32), txt: txt.slice(0, 30),
          col: cs.color, grand: px >= 24 || (px >= 18.66 && gras), px: Math.round(px),
        });
      });
      /* TEMOIN B : un texte de carte, fond cense etre opaque. */
      const carte = document.querySelector('.plan-card .plan-name');
      if (carte) carte.setAttribute('data-soie', 'temoinB');
      return out;
    });

    /* On masque TOUS les textes vises d'un coup, puis on echantillonne
       la soie a plusieurs instants et on garde le pire pixel par cible. */
    await page.evaluate(() => {
      document.querySelectorAll('[data-soie]').forEach(e => { e.style.visibility = 'hidden'; });
    });
    await page.waitForTimeout(200);

    const pires = new Map();
    const pas = await page.evaluate(n => Math.max(
      120, Math.ceil((document.documentElement.scrollHeight - innerHeight) / n)), ECH);
    for (let k = 0; k < ECH; k++) {
      const ids = await page.evaluate(() => [...document.querySelectorAll('[data-soie]')]
        .map(e => e.getAttribute('data-soie')));
      for (const id of ids) {
        /* Le rectangle est relu JUSTE avant sa capture. Mesure a l'appui :
           les relever tous d'un coup puis capturer un a un decalait les
           pastilles de paiement d'une case — on lisait l'or de la pastille
           voisine et on criait au defaut de contraste. */
        const r = await page.evaluate(i => {
          const e = document.querySelector('[data-soie="' + i + '"]');
          const b = e.getBoundingClientRect();
          if (b.width < 2 || b.height < 2 || b.bottom <= 0 || b.top >= innerHeight) return null;
          /* UN INSTANT DE TIROIR N'EST PAS UN DEFAUT DE LISIBILITE.
             Les cartes du site entrent en pliant dans l'espace : le
             temps de l'animation, un texte est incline, decale, et son
             rectangle chevauche ce qui l'entoure. Mesure a l'appui :
             « Offre de lancement » relevait 80,71,48 — la bordure doree
             de la pastille voisine — alors qu'au repos son fond est a
             9,9,10. On n'echantillonne donc que ce qui a fini de
             bouger. C'est une limite assumee du harnais : il juge l'etat
             stable, pas les quelques centiemes de seconde de l'entree. */
          let n = e;
          while (n && n !== document.body) {
            const cs = getComputedStyle(n);
            if (cs.transform !== 'none' || +cs.opacity < 0.999) return null;
            n = n.parentElement;
          }
          /* CE QUI EST RECOUVERT N'EST PAS SUR LA SOIE.
             Le bandeau cookies est en position fixe, en bas de l'ecran :
             il passe DEVANT le pied de page et le selecteur de paiement.
             Le harnais lisait alors la carte du bandeau comme « le fond
             derriere le texte » et criait au defaut de contraste sur un
             texte que le visiteur ne voit meme pas a cet instant.
             Constate : « pire fond 255,255,255 » en clair, soit --surface
             du bandeau, et 244,242,238 en sombre, soit la couleur de son
             titre. Aucune de ces valeurs n'existe dans la soie.

             Le test : la cible est deja masquee, donc elementFromPoint
             rend ce qu'il y a dessous. Pour un element non recouvert,
             c'est un de ses ANCETRES — la carte, main, body. Pour un
             element recouvert, c'est l'intrus. On echantillonne plusieurs
             points : un bandeau ne masque souvent qu'une partie. */
          const pts = [[0.5, 0.5], [0.08, 0.5], [0.92, 0.5], [0.5, 0.12], [0.5, 0.88]];
          for (const [fx, fy] of pts) {
            const x = Math.min(innerWidth - 1, Math.max(0, b.left + b.width * fx));
            const y = Math.min(innerHeight - 1, Math.max(0, b.top + b.height * fy));
            const sous = document.elementFromPoint(x, y);
            if (sous && !sous.contains(e)) return null;
          }
          const x = Math.max(0, b.x), y = Math.max(0, b.y);
          return { x, y, width: Math.min(b.width, innerWidth - x), height: Math.min(b.height, innerHeight - y) };
        }, id);
        if (!r || r.width < 6 || r.height < 6) continue;
        const e = await extremes(page, await page.screenshot({ clip: r }));
        if (!e) continue;
        const p = pires.get(id) || { hi: e.hi, lo: e.lo, moy: e.moy };
        if (lum(e.hi) > lum(p.hi)) p.hi = e.hi;
        if (lum(e.lo) < lum(p.lo)) p.lo = e.lo;
        p.moy = e.moy;
        pires.set(id, p);
      }
      /* On avance dans la page pour voir d'autres textes ET d'autres
         instants de la soie. Les paliers couvrent TOUTE la hauteur du
         document, pied de page compris : un pas fixe de 420 px
         s'arretait au milieu de la page et laissait le pied non mesure. */
      await page.evaluate(y => scrollTo(0, y), Math.round((k + 1) * pas));
      await page.waitForTimeout(900);
    }
    await page.evaluate(() => {
      document.querySelectorAll('[data-soie]').forEach(e => { e.style.visibility = ''; });
    });

    /* ── TEMOIN B : le fond d'un texte de carte doit etre --surface. ── */
    const surf = rgb(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface')));
    const tb = pires.get('temoinB');
    if (!tb) {
      console.log('INSTRUMENT MUET — le temoin B n a jamais ete capture (' + theme + ' ' + vp.width + ').');
      await ctx.close(); continue;
    }
    const ecartB = Math.max(...[0, 1, 2].map(i => Math.abs(tb.moy[i] - surf[i])));
    /* Un NaN rend toute comparaison fausse et ferait PASSER le temoin en
       silence : c'est exactement ce qui est arrive a la premiere version,
       ou --surface valant « #121214 » se lisait [121214, NaN, NaN]. */
    if (!Number.isFinite(ecartB) || ecartB > 30) {
      console.log('INSTRUMENT FAUX — le temoin B (fond de carte) se relit ' + tb.moy +
        ' au lieu de ' + surf + '. Mesures abandonnees pour ' + theme + ' ' + vp.width + '.');
      await ctx.close(); continue;
    }

    for (const c of cibles) {
      const p = pires.get(c.id);
      if (!p) continue;
      const fg = rgb(c.col);
      const r = Math.min(ratio(fg, p.hi), ratio(fg, p.lo));
      const seuil = c.grand ? AA_GRAND : AA;
      mesures++;
      if (r < seuil) defauts.push({ theme, vp: vp.width, ...c, r: +r.toFixed(2), seuil,
        hi: p.hi, lo: p.lo });
    }
    console.log('  ' + theme + ' ' + vp.width + ' : ' + cibles.length + ' textes sur la soie, ' +
      'temoins OK (magenta ' + mag.moy + ', carte ' + tb.moy + ' vs --surface ' + surf + ')');
    await ctx.close();
  }
}
await browser.close();

console.log('\n' + mesures + ' mesures, ' + defauts.length + ' sous le seuil.');
for (const d of defauts) {
  console.log('  ✗ ' + d.theme + ' ' + d.vp + '  ' + d.r + ':1 (< ' + d.seuil + ')  ' +
    d.cls.padEnd(28) + ' ' + d.col.padEnd(20) + ' pire fond ' + d.hi + ' / ' + d.lo +
    '  « ' + d.txt + ' »');
}
process.exit(defauts.length ? 1 : 0);
