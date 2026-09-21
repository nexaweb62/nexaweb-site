#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:anim   —   CHROME_PATH=… pour un Chromium précis.

   LA CHECKLIST DU SYSTÈME D'ANIMATION, EXÉCUTABLE.

   Elle passe toutes les pages en 1280×900 et en 390×844, dans les deux
   thèmes, et vérifie ce qui ne se voit pas à l'œil :

     1. aucune erreur JavaScript en console ;
     2. aucun débordement horizontal ;
     3. l'opacité de la rivière : 1 sur l'accueil, 0 partout ailleurs ;
     4. aucun élément ENTIÈREMENT visible dans l'écran sous 0,55
        d'opacité — c'est le piège d'un système d'animation au scroll :
        un texte que rien ne déclenche reste à zéro et personne ne le
        voit jamais ;
     5. aucun emoji dans le HTML livré ;
     6. aucune couleur verte sur la page Tarifs ;
     7. plus de canevas WebGL sur la page Rendez-vous ;
     8. rien au-dessus du curseur. Le curseur système est masqué et
        remplacé par un anneau d'or : tout élément qui passe devant lui
        laisse le visiteur sans rien pour savoir où il clique. C'est
        arrivé avec le menu plein écran (z-index 9000 contre 420).

   Le point 4 se mesure APRÈS avoir parcouru la page de haut en bas puis
   être remonté : c'est ce qu'un visiteur fait, et c'est ce qui révèle
   les éléments dont l'animation n'a jamais été déclenchée. */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH || undefined;
const PAGES = (process.env.PAGES || [
  '/', '/tarifs', '/devis', '/contact', '/equipe', '/avis', '/login', '/inscription',
  '/site-vitrine', '/ecommerce', '/refonte', '/seo', '/design-uiux', '/comment-ca-marche',
  '/404', '/rendez-vous', '/mentions-legales', '/politique-confidentialite',
  '/site-internet-artisan', '/site-internet-commerce', '/site-internet-restaurant',
].join(',')).split(',');
const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F0FF}]/u;

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const fails = [];
let checked = 0;

for (const theme of ['dark', 'light']) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme });
    await ctx.addInitScript(t => {
      try { localStorage.setItem('nw-theme', t); sessionStorage.setItem('nxa-ld', '1'); } catch (e) {}
    }, theme);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => {
      /* Les CDN sont bloqués par la politique de sortie de cet
         environnement : « d3 is not defined » sur /contact et les
         absences de Supabase ne sont pas des défauts du site. */
      if (/\b(d3|supabase|hcaptcha|Calendly)\b/i.test(e.message)) return;
      errs.push('exception : ' + e.message.slice(0, 140));
    });
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      /* Les CDN sont bloqués par la politique de sortie de cet
         environnement : ce n'est pas une erreur du site. */
      if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_BLOCKED|Failed to load resource/.test(t)) return;
      if (/SDK Supabase non chargé|d3 is not defined|hcaptcha/i.test(t)) return;
      errs.push('console : ' + t.slice(0, 140));
    });

    for (const path of PAGES) {
      errs.length = 0;
      await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
      /* On descend toute la page puis on remonte : exactement ce qu'un
         visiteur fait, et ce qui déclenche tout ce qui doit l'être. */
      await page.evaluate(async () => {
        const H = document.body.scrollHeight;
        for (let y = 0; y < H; y += 420) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise(r => setTimeout(r, 45));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 500));
      });

      const res = await page.evaluate(() => {
        const out = { over: 0, cands: [], river: null, canvas: 0 };
        out.over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const rv = document.querySelector('.river');
        out.river = rv ? getComputedStyle(rv).opacity : 'absent';

        /* Le plafond : l'anneau du curseur doit rester devant tout. */
        const ring = document.querySelector('.ring');
        out.plafond = [];
        if (ring) {
          const zr = parseInt(getComputedStyle(ring).zIndex, 10);
          out.zRing = zr;
          document.querySelectorAll('body *').forEach(el => {
            if (el.classList.contains('ring') || el.classList.contains('cur-dot')) return;
            const z = parseInt(getComputedStyle(el).zIndex, 10);
            if (!isNaN(z) && z >= zr) {
              out.plafond.push((el.id || el.className.toString().trim().split(/\s+/)[0] || el.tagName) + ' z=' + z);
            }
          });
        }
        /* La rivière est présente dans le DOM de toutes les pages, par
           construction : on ne compte que les AUTRES canevas. */
        out.canvas = [...document.querySelectorAll('canvas')].filter(c => c.id !== 'river').length;

        const opDe = el => {
          let op = 1;
          for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
            op *= parseFloat(getComputedStyle(n).opacity);
          }
          return op;
        };
        window.__opDe = opDe;

        /* Premier passage, bon marché : on repère les candidats. */
        const vh = innerHeight, vw = innerWidth;
        let k = 0;
        document.querySelectorAll('body *').forEach(el => {
          if (el.closest('[aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true') return;
          if (el.closest('.cnav, .curtain, #loader, .faq-a, details:not([open])')) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
          if (!own && el.tagName !== 'IMG') return;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          if (r.top < 0 || r.left < 0 || r.bottom > vh || r.right > vw) return;
          if (opDe(el) >= 0.55) return;
          el.setAttribute('data-ghost-probe', String(k++));
          out.cands.push({
            probe: k - 1,
            sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
            txt: (el.textContent || '').trim().slice(0, 40),
          });
        });
        return out;
      });

      /* Second passage, décisif : on AMÈNE chaque candidat au centre de
         l'écran et on remesure. Un élément peut être « dans le cadre »
         alors que la carte qui le porte commence à peine à entrer — ce
         n'est pas un fantôme, c'est une animation en cours. Le fantôme,
         c'est celui qui reste éteint une fois arrivé au centre. */
      const ghosts = [];
      for (const c of res.cands) {
        const op = await page.evaluate(async n => {
          const el = document.querySelector(`[data-ghost-probe="${n}"]`);
          if (!el) return 1;
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          await new Promise(r => setTimeout(r, 220));
          return +window.__opDe(el).toFixed(2);
        }, c.probe);
        if (op < 0.55) ghosts.push({ ...c, op });
      }
      await page.evaluate(() => {
        document.querySelectorAll('[data-ghost-probe]').forEach(e => e.removeAttribute('data-ghost-probe'));
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      res.ghosts = ghosts;

      checked++;
      const tag = `[${theme} ${vp.width}] ${path}`;
      for (const e of errs) fails.push(`${tag}  ${e}`);
      if (res.over !== 0) fails.push(`${tag}  débordement horizontal : ${res.over}px`);
      const attendu = path === '/' ? '1' : '0';
      if (res.river !== attendu) fails.push(`${tag}  rivière : opacité ${res.river}, attendu ${attendu}`);
      for (const e of [...new Set(res.plafond || [])]) {
        fails.push(`${tag}  ${e} passe devant le curseur (z=${res.zRing})`);
      }
      if (path === '/rendez-vous' && res.canvas > 0) {
        fails.push(`${tag}  la page Rendez-vous porte encore ${res.canvas} canevas`);
      }
      const seen = new Set();
      for (const g of res.ghosts) {
        const k = g.sel + g.op;
        if (seen.has(k)) continue; seen.add(k);
        fails.push(`${tag}  fantôme ${g.sel} à ${g.op} — « ${g.txt} »`);
      }
    }
    await ctx.close();
  }
}

/* ── Contrôles sur le HTML livré, sans navigateur ── */
const statiques = [];
for (const path of PAGES) {
  const url = BASE + path;
  const html = await fetch(url).then(r => r.text()).catch(() => '');
  if (!html) { statiques.push(`${path} : page injoignable`); continue; }
  const corps = html.replace(/<!--[\s\S]*?-->/g, '');
  if (EMOJI.test(corps)) {
    const m = corps.match(EMOJI);
    statiques.push(`${path} : emoji « ${m[0]} » dans le HTML livré`);
  }
}

/* Le vert, uniquement sur Tarifs : CSS et HTML. */
const tarifs = await fetch(BASE + '/tarifs').then(r => r.text()).catch(() => '');
const feuilles = [...tarifs.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
let cssTarifs = '';
for (const f of feuilles) cssTarifs += await fetch(BASE + f).then(r => r.text()).catch(() => '');
const versLesVerts = [];
const hexes = [...(tarifs + cssTarifs).matchAll(/#([0-9a-fA-F]{6})\b/g)];
for (const h of hexes) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.08) continue;                       // gris : pas une teinte
  let t = 0;
  if (max === r) t = ((g - b) / d) % 6; else if (max === g) t = (b - r) / d + 2; else t = (r - g) / d + 4;
  t = (t * 60 + 360) % 360;
  if (t >= 80 && t <= 160) versLesVerts.push('#' + h[1] + ' (teinte ' + Math.round(t) + ')');
}
const vertsUniques = [...new Set(versLesVerts)];
/* Les marques tierces gardent leur couleur : recolorer le vert de
   WhatsApp ou celui de Google serait une faute, pas une correction. */
const MARQUES = new Set(['#25d366', '#34a853']);
const vertsFautifs = vertsUniques.filter(v => !MARQUES.has(v.slice(0, 7).toLowerCase()));
if (vertsFautifs.length) statiques.push('/tarifs : vert restant — ' + vertsFautifs.join(', '));

await browser.close();

console.log(`${checked} passages de page (${PAGES.length} pages × 2 thèmes × ${VIEWPORTS.length} largeurs).`);
if (vertsUniques.length && !vertsFautifs.length) {
  console.log(`(Verts tolérés sur /tarifs, marques tierces : ${vertsUniques.join(', ')})`);
}
const tout = fails.concat(statiques);
if (!tout.length) { console.log('\n✓ Checklist du système d\'animation : tout passe.'); process.exit(0); }
console.log(`\n✗ ${tout.length} point(s) en échec :\n`);
const vus = new Set();
for (const f of tout) {
  const k = f.replace(/\[\w+ \d+\]/, '');
  if (vus.has(k)) continue; vus.add(k);
  console.log('  ' + f);
}
process.exit(1);
