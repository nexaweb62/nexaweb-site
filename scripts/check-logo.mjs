#!/usr/bin/env node
/* Prerequis : npm run build && npx astro preview (port 4321).
   Usage : npm run check:logo

   LE LOGO, LA BARRE ET L'INTRO, SUR TOUTES LES PAGES.

   Trois promesses faites page par page, et qu'un oubli dans un seul
   gabarit casse sans bruit :
     1. le nouveau symbole est dans l'en-tete ET dans le pied de page ;
     2. il ne reste AUCUNE trace de l'ancien (llq, nav-logo-tuile,
        logo-liquide) dans le HTML livre ;
     3. la barre s'etire au defilement et ne se cache jamais.
   Plus : aucun debordement horizontal, dans les deux themes et aux
   deux largeurs.
*/
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const PAGES = ['/', '/services', '/tarifs', '/devis', '/contact', '/equipe', '/avis',
  '/rendez-vous', '/mentions-legales', '/cgv', '/politique-confidentialite', '/404'];
const VUES = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
const VIEUX = /llq|nav-logo-tuile|foot-tuile|logo-liquide|LogoLiquide/;

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const fails = [];
let verifs = 0;

for (const vp of VUES) {
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme });
    await ctx.addInitScript(t => { try {
      localStorage.setItem('nw-theme', t);
      localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: 0 }));
      /* L'intro est testee a part : ici elle ne doit pas masquer les mesures. */
      sessionStorage.setItem('nexa-intro', '1');
    } catch (e) {} }, theme);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => {
      if (/\b(d3|supabase|hcaptcha|Calendly)\b/i.test(e.message)) return;
      errs.push(e.message.slice(0, 110));
    });

    for (const chemin of PAGES) {
      const ou = `${theme} ${vp.width} ${chemin}`;
      const rep = await page.goto(BASE + chemin, { waitUntil: 'load' });
      if (!rep || rep.status() >= 400) { fails.push(`${ou} : statut ${rep ? rep.status() : '?'}`); continue; }
      await page.waitForTimeout(900);

      /* 2 — plus aucune trace de l'ancien logo dans le HTML livre. */
      verifs++;
      const html = await page.content();
      const m = html.match(VIEUX);
      if (m) fails.push(`${ou} : trace de l'ancien logo — « ${m[0]} »`);

      const vu = await page.evaluate(() => {
        const hd = document.querySelector('.hdr .nav-logo-mk .lg-svg');
        const pd = document.querySelector('footer .foot-marque .lg-svg');
        const d = document.documentElement;
        const r = el => el ? el.getBoundingClientRect() : null;
        const rh = r(hd), rp = r(pd);
        const prof = hd ? getComputedStyle(hd.querySelector('.logo-depth')).stroke : null;
        return {
          hd: rh ? Math.round(rh.width) + 'x' + Math.round(rh.height) : null,
          pd: rp ? Math.round(rp.width) + 'x' + Math.round(rp.height) : null,
          pdLien: !!document.querySelector('footer a.foot-marque'),
          prof,
          deborde: d.scrollWidth > d.clientWidth ? d.scrollWidth + '>' + d.clientWidth : null,
          hdrVisible: document.querySelector('.hdr').getBoundingClientRect().top > -1,
        };
      });
      verifs += 5;
      if (!vu.hd) fails.push(`${ou} : pas de logo dans l'en-tete`);
      else if (vu.hd !== '30x32') fails.push(`${ou} : logo d'en-tete ${vu.hd} au lieu de 30x32`);
      /* SANS PIED DE PAGE, ET C'EST VOULU. /contact est une carte plein
         ecran : son titre, son epingle et son bouton sont TOUS en
         position:fixed, donc <main> mesure 0 px de haut. Un pied de page
         s'y place a l'ordonnee 0 et recouvre le titre — c'est exactement
         ce qui est arrive quand ce controle a reclame un pied ici, et
         qu'on lui en a ajoute un sans regarder le resultat.
         La page garde le logo de sa barre ; le reste du site garde son
         pied. */
      const sansPied = chemin === '/contact';
      if (!sansPied) {
        if (!vu.pd) fails.push(`${ou} : pas de logo dans le pied de page`);
        else if (vu.pd !== '40x42') fails.push(`${ou} : logo de pied ${vu.pd} au lieu de 40x42`);
        if (!vu.pdLien) fails.push(`${ou} : le logo du pied n'est pas un lien`);
      } else if (vu.pd) {
        fails.push(`${ou} : cette page plein ecran ne doit PAS porter de pied de page`);
      }
      if (vu.deborde) fails.push(`${ou} : debordement horizontal ${vu.deborde}`);
      /* L'arete doree doit suivre le theme, jamais etre une couleur figee. */
      if (vu.prof) {
        const clair = theme === 'light';
        const or = vu.prof.replace(/\s/g, '');
        const attendu = clair ? 'rgb(168,133,63)' : 'rgb(212,179,106)';
        verifs++;
        if (or !== attendu) fails.push(`${ou} : arete du logo ${vu.prof} au lieu de ${attendu}`);
      }

      /* 3 — la barre s'etire et ne disparait pas.
         On ATTEND que le defilement ait vraiment eu lieu avant de
         mesurer : sur /tarifs, qui fut longtemps la page la plus lourde,
         scrollTo met jusqu'a 600 ms a prendre effet. Un delai fixe
         mesurait une page encore en haut et criait au defaut. */
      await page.evaluate(() => scrollTo(0, 700));
      await page.waitForFunction(() => window.scrollY > 600 ||
        document.documentElement.scrollHeight <= innerHeight + 700, null, { timeout: 5000 })
        .catch(() => {});
      /* Puis on attend que la hauteur se STABILISE, au lieu de parier
         sur la duree annoncee de 0,7 s. Sur /tarifs, le shader de la
         page chargeait le fil principal : la transition est juste, mais
         les images tardent, et une mesure a instant fixe lisait 80 px
         au lieu de 64. C'est l'etat final qui compte. */
      await page.waitForFunction(() => {
        var h = Math.round(document.querySelector('.hdr').getBoundingClientRect().height);
        var v = window.__hdrH;
        window.__hdrH = h;
        return v === h;
      }, null, { timeout: 8000, polling: 350 }).catch(() => {});
      const apres = await page.evaluate(() => {
        const h = document.querySelector('.hdr');
        const r = h.getBoundingClientRect();
        return { cls: h.className, haut: Math.round(r.height), top: Math.round(r.top),
          logo: (() => { const s = document.querySelector('.nav-logo-mk .lg-svg');
            const b = s.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); })() };
      });
      verifs += 3;
      const peutDefiler = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 700);
      if (peutDefiler) {
        if (!/scrolled/.test(apres.cls)) fails.push(`${ou} : la barre ne s'etire pas au defilement (${apres.cls})`);
        if (apres.top < -1) fails.push(`${ou} : la barre se cache au defilement (top ${apres.top})`);
        const attH = vp.width <= 760 ? 56 : 64;
        if (apres.haut !== attH) fails.push(`${ou} : barre etiree a ${apres.haut}px au lieu de ${attH}`);
        if (apres.logo !== '24x26') fails.push(`${ou} : logo etire ${apres.logo} au lieu de 24x26`);
      }
      if (errs.length) { fails.push(`${ou} : JS — ${errs.join(' | ')}`); errs.length = 0; }
    }
    await ctx.close();
  }
}

/* ── L'intro : une fois par visite, et jamais en mouvement reduit ── */
for (const [nom, opts] of [['normal', {}], ['mouvement reduit', { reducedMotion: 'reduce' }]]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', ...opts });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: 0 }));
  } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForTimeout(600);
  const un = await page.evaluate(() => !!document.getElementById('intro'));
  verifs++;
  if (nom === 'normal' && !un) fails.push(`intro : absente sur la premiere page`);
  if (nom !== 'normal' && un) fails.push(`intro : presente malgre le mouvement reduit`);
  /* Et le contenu doit etre visible en mouvement reduit. */
  if (nom !== 'normal') {
    const h1 = await page.evaluate(() => {
      const h = document.querySelector('main h1');
      return h ? getComputedStyle(h).opacity : '0';
    });
    verifs++;
    if (parseFloat(h1) < 0.99) fails.push(`intro : en mouvement reduit, le titre est a l'opacite ${h1}`);
  }
  /* Deuxieme page : plus d'intro. */
  await page.waitForTimeout(nom === 'normal' ? 6000 : 400);
  await page.goto(BASE + '/tarifs/', { waitUntil: 'commit' });
  await page.waitForTimeout(500);
  verifs++;
  if (await page.evaluate(() => !!document.getElementById('intro')))
    fails.push(`intro (${nom}) : rejouee sur la deuxieme page`);
  await ctx.close();
}

await browser.close();
console.log(`\n${verifs} verifications, ${fails.length} en echec.`);
fails.forEach(f => console.log('  ✗ ' + f));
if (!fails.length) console.log("\n✓ Le logo est partout, l'ancien nulle part, et la barre ne disparait plus.");
process.exit(fails.length ? 1 : 0);
