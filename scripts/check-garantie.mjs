#!/usr/bin/env node
/* Prerequis : npm run build && npx astro preview (port 4321).
   Usage : npm run check:garantie

   LE BADGE DE GARANTIE, ET SA FENETRE.

   Une fenetre modale est un petit mecanisme a quatre temps — elle
   s'ouvre, elle retient le clavier, elle se ferme, elle rend le focus —
   et chacun se casse sans bruit. Deux defauts reels sont sortis d'ici,
   qu'aucun autre garde-fou ne voyait :

     1. LA FENETRE PASSAIT DERRIERE LE CONTENU. Nee dans .plans-section,
        qui porte z-index:1, elle etait plafonnee a ce niveau : le
        panneau « Obtenez votre devis » passait devant et mangeait son
        quatrieme point. Elle demenage maintenant sur <body>.
     2. LE FOCUS N'ENTRAIT JAMAIS DEDANS. visibility est une propriete
        DISCRETE : transitionnee sur 240 ms, elle bascule a mi-parcours.
        focus() sur un element encore invisible est refuse en silence, et
        la tabulation continuait de parcourir le formulaire DERRIERE la
        fenetre. Le defaut dependait de la vitesse des images — il passait
        sur une page courte et echouait sur les autres. C'est exactement
        ce qu'un controle manuel ne trouve pas.

   On verifie donc le mecanisme, pas l'apparence : ou va le focus, d'ou
   il ne sort pas, ce qui est reellement au-dessus, et ce que le texte
   dit dans les deux langues.
*/
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
/* Les pages qui doivent porter le badge. L'oublier quelque part est le
   defaut le plus probable quand la page sera remaniee. */
const PAGES = ['/tarifs/', '/devis/', '/', '/cgv/'];
const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const fails = [];
let verifs = 0;

const neuf = async (theme, vp) => {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: theme });
  await ctx.addInitScript(t => {
    try {
      localStorage.setItem('nw-theme', t);
      /* Le bandeau cookies couvrirait le bas de l'ecran et fausserait
         les mesures de recouvrement : on repond une fois pour toutes. */
      localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: 0 }));
    } catch (e) {}
  }, theme);
  return ctx;
};

for (const vp of VIEWPORTS) {
  for (const theme of ['dark', 'light']) {
    for (const chemin of PAGES) {
      const ctx = await neuf(theme, vp);
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => {
        if (/\b(d3|supabase|hcaptcha|Calendly)\b/i.test(e.message)) return;
        errs.push(e.message.slice(0, 110));
      });
      const ou = `${theme} ${vp.width} ${chemin}`;
      await page.goto(BASE + chemin, { waitUntil: 'load' });
      await page.waitForTimeout(1400);

      verifs++;
      const n = await page.evaluate(() => document.querySelectorAll('.gar-b').length);
      if (!n) { fails.push(`${ou} : aucun badge de garantie`); await ctx.close(); continue; }

      /* ── Le badge lui-meme : visible, cliquable, et pas vert ── */
      const badge = await page.evaluate(() => {
        const b = document.querySelector('.gar-b');
        const r = b.getBoundingClientRect();
        const ico = getComputedStyle(b.querySelector('.gar-ico')).stroke;
        const m = ico.match(/-?\d+/g) || [0, 0, 0];
        /* Teinte verte : le site la bannit, la page Tarifs surtout. */
        const [R, G, B] = m.map(Number);
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        let h = 0;
        if (mx !== mn) {
          const d = mx - mn;
          h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
          h = Math.round(h * 60); if (h < 0) h += 360;
        }
        return { w: Math.round(r.width), h: Math.round(r.height), texte: b.textContent.trim(),
          teinte: h, sat: mx ? (mx - mn) / mx : 0, ico };
      });
      verifs += 3;
      if (badge.w < 60 || badge.h < 24) fails.push(`${ou} : badge trop petit (${badge.w}x${badge.h})`);
      if (!/14|jours|days/i.test(badge.texte)) fails.push(`${ou} : le badge ne mentionne pas le delai — « ${badge.texte} »`);
      if (badge.sat > 0.2 && badge.teinte > 80 && badge.teinte < 170)
        fails.push(`${ou} : le bouclier du badge est vert (${badge.ico})`);

      /* ── L'ouverture ── */
      await page.click('.gar-b');
      await page.waitForTimeout(700);
      const ouvert = await page.evaluate(() => {
        const f = document.querySelector('.gar-f');
        const c = f.querySelector('.gar-carte').getBoundingClientRect();
        return {
          open: f.classList.contains('open'), inert: f.hasAttribute('inert'),
          parent: f.parentElement.tagName,
          aria: document.querySelector('.gar-b').getAttribute('aria-expanded'),
          dedans: f.contains(document.activeElement),
          focus: document.activeElement.tagName + '.' + document.activeElement.className,
          /* CE QUI EST VRAIMENT AU-DESSUS. Un z-index ne prouve rien :
             il ne vaut que dans son contexte d'empilement. */
          dessus: (document.elementFromPoint(c.left + c.width / 2, c.bottom - 8) || {}).className || '',
          points: f.querySelectorAll('.gar-pt').length,
          dansEcran: c.top >= -1 && c.bottom <= innerHeight + 1,
        };
      });
      verifs += 6;
      if (!ouvert.open) fails.push(`${ou} : la fenetre ne s'ouvre pas`);
      if (ouvert.inert) fails.push(`${ou} : la fenetre reste inert une fois ouverte`);
      if (ouvert.parent !== 'BODY') fails.push(`${ou} : la fenetre n'a pas demenage sur <body> (${ouvert.parent})`);
      if (ouvert.aria !== 'true') fails.push(`${ou} : aria-expanded vaut ${ouvert.aria}`);
      if (!ouvert.dedans) fails.push(`${ou} : le focus n'entre pas dans la fenetre (${ouvert.focus})`);
      if (!/gar-/.test(ouvert.dessus)) fails.push(`${ou} : quelque chose passe devant la fenetre — « ${ouvert.dessus} »`);
      verifs += 2;
      if (ouvert.points !== 4) fails.push(`${ou} : ${ouvert.points} points expliques au lieu de 4`);
      if (!ouvert.dansEcran) fails.push(`${ou} : la fenetre deborde de l'ecran`);

      /* ── Le piege a focus : neuf tabulations, jamais dehors ── */
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab'); await page.waitForTimeout(110);
        verifs++;
        const d = await page.evaluate(() => ({
          dedans: document.querySelector('.gar-f').contains(document.activeElement),
          ou: document.activeElement.tagName + '.' + document.activeElement.className }));
        if (!d.dedans) { fails.push(`${ou} : Tab n°${i + 1} sort de la fenetre -> ${d.ou}`); break; }
      }
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(110);
        verifs++;
        const d = await page.evaluate(() => ({
          dedans: document.querySelector('.gar-f').contains(document.activeElement),
          ou: document.activeElement.tagName + '.' + document.activeElement.className }));
        if (!d.dedans) { fails.push(`${ou} : Maj+Tab n°${i + 1} sort -> ${d.ou}`); break; }
      }

      /* ── Echap ferme, rend le focus, et relache le defilement ── */
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      const ferme = await page.evaluate(() => ({
        open: document.querySelector('.gar-f').classList.contains('open'),
        inert: document.querySelector('.gar-f').hasAttribute('inert'),
        focus: document.activeElement.className,
        aria: document.querySelector('.gar-b').getAttribute('aria-expanded'),
        verrou: document.body.classList.contains('nav-open'),
      }));
      verifs += 5;
      if (ferme.open) fails.push(`${ou} : Echap ne ferme pas`);
      if (!ferme.inert) fails.push(`${ou} : la fenetre fermee ne redevient pas inert`);
      if (!/gar-b/.test(ferme.focus)) fails.push(`${ou} : le focus ne revient pas au badge (${ferme.focus})`);
      if (ferme.aria !== 'false') fails.push(`${ou} : aria-expanded reste ${ferme.aria} apres fermeture`);
      if (ferme.verrou) fails.push(`${ou} : le verrou de defilement n'est pas retire`);

      /* ── Le clic sur le fond ferme aussi ── */
      await page.click('.gar-b'); await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelector('.gar-f')
        .dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await page.waitForTimeout(400);
      verifs++;
      if (await page.evaluate(() => document.querySelector('.gar-f').classList.contains('open')))
        fails.push(`${ou} : le clic sur le fond ne ferme pas`);

      if (errs.length) fails.push(`${ou} : erreurs JavaScript — ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
}

/* ── Le texte, dans les deux langues ──
   Les quatre points sont la promesse commerciale : un mot qui manque en
   anglais, et la version anglaise promet autre chose que la francaise. */
for (const lang of ['fr', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  await ctx.addInitScript(l => { try {
    localStorage.setItem('nw-lang', l);
    localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: 0 }));
  } catch (e) {} }, lang);
  const page = await ctx.newPage();
  await page.goto(BASE + '/tarifs/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const t = await page.evaluate(() => {
    const pts = [...document.querySelectorAll('.gar-pt')].map(e => e.textContent.trim());
    const forts = [...document.querySelectorAll('.gar-pt strong')]
      .map(f => ({ txt: f.textContent, c: getComputedStyle(f).color, g: getComputedStyle(f).fontWeight }));
    return { badge: document.querySelector('.gar-b').textContent.trim(), pts, forts,
      encre: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() };
  });
  verifs += 3;
  if (t.pts.length !== 4) fails.push(`${lang} : ${t.pts.length} points au lieu de 4`);
  /* Les quatre chiffres de la promesse doivent survivre a la traduction. */
  const tout = (t.badge + ' ' + t.pts.join(' ')).toLowerCase();
  for (const motif of [/\b14\b/, /\b2\b|\btwo\b|\bdeux\b/, /100\s*%/]) {
    verifs++;
    if (!motif.test(tout)) fails.push(`${lang} : « ${motif} » absent du texte de la garantie`);
  }
  /* Les <strong> sont recrees par i18n.js (innerHTML) : sans :global()
     dans le composant, la regle scopee ne les atteint plus. C'est arrive. */
  for (const f of t.forts) {
    verifs++;
    if (f.g !== '600') fails.push(`${lang} : « ${f.txt} » a la graisse ${f.g} — la regle scopee ne l'atteint pas`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${verifs} verifications, ${fails.length} en echec.`);
fails.forEach(f => console.log('  ✗ ' + f));
if (!fails.length) console.log('\n✓ Le badge est en place, sa fenetre passe devant, et le clavier ne lui echappe pas.');
process.exit(fails.length ? 1 : 0);
