#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:peinture

   EST-CE QUE LA PAGE SE PEINT, ET À QUEL PRIX ?

   ── POURQUOI CE CONTRÔLE EXISTE ─────────────────────────────────────
   La page Tarifs est partie en production presque entièrement NOIRE
   dans Chrome. Le texte était pourtant là : opacity 1, visibility
   visible, couleur claire, polices chargées. Tous les contrôles du
   site le confirmaient — et tous passaient, parce qu'ils lisent des
   styles calculés. Aucun ne regardait les PIXELS.

   La cause n'était pas du CSS caché, c'était un budget de composition
   dépassé. Mesure au protocole DevTools, mode léger neutralisé :

       /tarifs    161 couches composées    229 animations
       les autres  25 à 103 couches          8 à 135

   Le fond de la page animait ses 72 tracés un par un — 144 animations
   infinies — et six éléments portaient un backdrop-filter par-dessus :
   à chaque image, Chrome devait relire et reflouter un calque qui ne
   cessait jamais de changer. Au-delà d'un certain budget le
   compositeur cesse de peindre, et la page devient noire.

   Ce contrôle mesure donc les deux bouts :

     1. LE RÉSULTAT — on capture l'écran et on compte, dans le cadre du
        titre, les pixels qui diffèrent du fond. Un titre peint en
        laisse des milliers ; un titre non peint, aucun. C'est la seule
        mesure qui aurait vu le défaut.

     2. LA CAUSE — le nombre de couches composées, d'animations
        INFINIES, d'éléments à backdrop-filter, et d'éléments restés en
        filter:blur(0px) — un flou de zéro reste un flou, et garde
        l'élément sur sa propre couche pour rien.

   Le mode léger est neutralisé pendant la mesure : il gèle les
   animations, et on mesurerait une page déjà dégradée au lieu de celle
   que le navigateur du visiteur doit tenir. */
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:4321';
const PAGES = (process.env.PAGES || [
  '/', '/tarifs', '/services', '/devis', '/equipe', '/avis', '/comment-ca-marche',
  '/site-vitrine', '/ecommerce', '/seo', '/refonte', '/cgv',
].join(',')).split(',');

/* Les plafonds. Ils ne sont pas choisis : ce sont les valeurs mesurées
   sur les pages saines, arrondies vers le haut avec de la marge. Le
   defaut reel se situait a 161 couches et 150 animations infinies — un
   plafond a 140 et 16 l'attrape largement, sans crier sur une page
   normale. */
const PLAFOND = { couches: 140, infinies: 16, backdrop: 2, flouZero: 0 };
/* Un titre peint couvre au moins 2 % du rectangle qui l'entoure. Mesure
   sur les pages saines : entre 6 % et 19 %. Un titre absent : 0 %. */
const ENCRE_MINI = 0.02;

const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const echecs = [];
let mesures = 0;

/* TROIS LARGEURS. 1280 est l'ordinateur courant, 390 le telephone — et
   1920 l'ecran large, qui n'etait pas couvert. Le defaut a ete signale
   depuis une fenetre d'environ 2000 px : un ecran plus large fait une
   surface a peindre plus grande, donc des couches plus lourdes, et
   c'est exactement la que le compositeur rend les armes en premier.
   Ne mesurer que 1280 laissait le pire cas dehors. */
for (const [largeur, hauteur] of [[1920, 1080], [1280, 900], [390, 844]]) {
  for (const theme of ['dark', 'light']) {
    const ctx = await nav.newContext({
      viewport: { width: largeur, height: hauteur }, colorScheme: theme,
      isMobile: largeur < 640, hasTouch: largeur < 640,
    });
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem('nexa-intro', '1');
        localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: false }));
      } catch (e) {}
      /* On empeche le mode leger de s'installer — voir l'en-tete. Le
         garde-fou du site reste intact, il n'est neutralise qu'ici. */
      const ajout = DOMTokenList.prototype.add;
      DOMTokenList.prototype.add = function () {
        const g = [...arguments].filter(c => c !== 'lite');
        if (g.length) ajout.apply(this, g);
      };
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('LayerTree.enable');
    let couches = 0;
    cdp.on('LayerTree.layerTreeDidChange', e => { couches = (e.layers || []).length; });

    for (const chemin of PAGES) {
      couches = 0;
      await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1300);
      /* On parcourt la page : les revelations au defilement creent des
         couches, et c'est apres ce parcours que le visiteur voit le
         resultat. */
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
          scrollTo({ top: y, behavior: 'instant' });
          await new Promise(r => setTimeout(r, 110));
        }
        scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.waitForTimeout(1100);

      const tag = `[${theme} ${largeur}] ${chemin}`;
      mesures++;

      /* ── 1. LE RÉSULTAT, EN PIXELS ── */
      const cadre = await page.evaluate(() => {
        const h = document.querySelector('h1');
        if (!h) return null;
        h.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = h.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return null;
        /* Le fond de reference se lit SOUS le titre, pas sur <body> :
           une section peut avoir sa propre couleur. */
        const fond = (() => {
          let e = h;
          while (e) {
            const c = getComputedStyle(e).backgroundColor;
            if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
            e = e.parentElement;
          }
          return getComputedStyle(document.body).backgroundColor;
        })();
        return {
          x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
          w: Math.min(Math.round(r.width), innerWidth - Math.max(0, Math.round(r.x))),
          h: Math.min(Math.round(r.height), innerHeight - Math.max(0, Math.round(r.y))),
          fond, texte: h.textContent.trim().slice(0, 28),
        };
      });

      if (!cadre) {
        echecs.push(`${tag}  pas de <h1> mesurable`);
      } else {
        await page.waitForTimeout(250);
        const buf = await page.screenshot({ clip: { x: cadre.x, y: cadre.y, width: cadre.w, height: cadre.h } });
        const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(cadre.fond) || [0, 0, 0, 0];
        const fr = +m[1], fg = +m[2], fb = +m[3];
        let encre = 0;
        for (let i = 0; i < data.length; i += 3) {
          /* « Différent du fond » : au moins 28 niveaux d'écart cumulés.
             En dessous, c'est du dégradé ou de l'anticrénelage. */
          if (Math.abs(data[i] - fr) + Math.abs(data[i + 1] - fg) + Math.abs(data[i + 2] - fb) > 28) encre++;
        }
        const part = encre / (info.width * info.height);
        if (part < ENCRE_MINI) {
          echecs.push(`${tag}  le titre « ${cadre.texte} » n'est pas peint : ` +
            `${(part * 100).toFixed(2)} % du cadre differe du fond (minimum ${ENCRE_MINI * 100} %)`);
        }
      }

      /* ── 2. LA CAUSE, EN BUDGET ── */
      const d = await page.evaluate(() => {
        const tous = [...document.querySelectorAll('*')];
        const f = e => getComputedStyle(e).filter;
        return {
          infinies: document.getAnimations().filter(a => {
            try { return a.effect.getComputedTiming().iterations === Infinity; } catch (e) { return false; }
          }).length,
          backdrop: tous.filter(e => {
            const cs = getComputedStyle(e);
            const v = cs.backdropFilter || cs.webkitBackdropFilter;
            return v && v !== 'none';
          }).length,
          flouZero: tous.filter(e => /blur\(0(px)?\)/.test(f(e))).length,
        };
      });
      if (couches > PLAFOND.couches) echecs.push(`${tag}  ${couches} couches composees (plafond ${PLAFOND.couches})`);
      if (d.infinies > PLAFOND.infinies) echecs.push(`${tag}  ${d.infinies} animations infinies (plafond ${PLAFOND.infinies})`);
      if (d.backdrop > PLAFOND.backdrop) echecs.push(`${tag}  ${d.backdrop} elements a backdrop-filter (plafond ${PLAFOND.backdrop})`);
      if (d.flouZero > PLAFOND.flouZero) echecs.push(`${tag}  ${d.flouZero} element(s) restes en filter:blur(0px)`);
    }
    await ctx.close();
  }
}
await nav.close();

console.log(`${mesures} pages mesurees (${PAGES.length} pages x 3 largeurs x 2 themes).`);
if (!echecs.length) { console.log('\n✓ Peinture : tout est peint, et dans le budget.'); process.exit(0); }
console.log(`\n✗ ${echecs.length} point(s) en echec :\n`);
for (const e of [...new Set(echecs)]) console.log('  ' + e);
process.exit(1);
