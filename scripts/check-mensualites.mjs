#!/usr/bin/env node
/* Prerequis : npm run build && npx astro preview (port 4321).
   Usage : npm run check:mensualites

   L'ECHEANCIER VOYAGE-T-IL DE TARIFS JUSQU'AU DEVIS ?

   On ne regarde pas l'ecran : on suit le chemin reel.
     1. sur Tarifs, on clique « En 4 fois » et on relit les adresses des
        trois boutons de formule ;
     2. on ouvre l'adresse obtenue, et on verifie que la pastille de
        budget ET l'echeancier arrivent coches ;
     3. on lit la mensualite affichee par CHAQUE formule et on la
        compare au calcul — pas a une constante recopiee ;
     4. on change de budget, et on verifie que l'echeancier tient : les
        deux groupes de pastilles partageaient un seul gestionnaire, qui
        decochait tout le monde a chaque clic ;
     5. on reclique la pastille deja choisie, dans les DEUX groupes :
        le budget se decoche, l'echeancier revient a « En une fois ».
        Rester bloque sur son choix est ce que faisait la premiere
        version, et ce que l'oeil ne distingue pas d'une panne ;
     6. on mesure le CONTRASTE de la mensualite, pastille eteinte et
        pastille allumee, dans les deux themes. Le garde-fou general du
        site ne peut pas le faire : il visite la page a l'etat par
        defaut, ou l'echeancier est au comptant et ou ces lignes sont en
        display:none. Un texte qu'aucun garde-fou ne voit est un texte
        qui derive.
*/
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
/* Les totaux affiches par la page Tarifs. La mensualite attendue est
   RECALCULEE ici, arrondie au superieur comme dans formules.ts. */
const TOTAUX = { refonte: 490, vitrine: 999, entreprise: 1200 };
const nb = s => parseInt(String(s).replace(/[^\d]/g, ''), 10);
const attendu = (total, n) => Math.ceil(total / n);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const fails = [];
let verifs = 0;

for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  for (const plan of ['3', '4']) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => {
      if (/\b(d3|supabase|hcaptcha|Calendly)\b/i.test(e.message)) return;
      errs.push(e.message.slice(0, 120));
    });

    /* ── 1. Tarifs : le choix s'ecrit dans les adresses ── */
    await page.goto(BASE + '/tarifs/', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.evaluate(p => {
      const r = document.getElementById('paie-' + p);
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }, plan);
    await page.waitForTimeout(200);
    const liens = await page.evaluate(() => [...document.querySelectorAll('.plan-cta[href^="/devis"]')]
      .map(a => ({ formule: a.dataset.plan, href: a.getAttribute('href') })));
    verifs++;
    if (liens.length !== 3) fails.push(`${vp.width} ${plan}x : ${liens.length} boutons de formule au lieu de 3`);
    for (const l of liens) {
      verifs++;
      if (!l.href.includes('paiement=' + plan))
        fails.push(`${vp.width} ${plan}x : le bouton « ${l.formule} » pointe vers ${l.href}`);
      /* Un second choix ne doit pas empiler les parametres. */
      if ((l.href.match(/paiement=/g) || []).length > 1)
        fails.push(`${vp.width} ${plan}x : parametre en double dans ${l.href}`);
    }
    /* Retour au comptant : le parametre doit disparaitre, pas rester. */
    await page.evaluate(() => {
      const r = document.getElementById('paie-1');
      r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(150);
    const compt = await page.evaluate(() => document.querySelector('.plan-cta[href^="/devis"]').getAttribute('href'));
    verifs++;
    if (compt.includes('paiement')) fails.push(`${vp.width} : le comptant laisse « ${compt} »`);

    /* ── 2 et 3. Devis : tout arrive coche, les montants sont justes ── */
    for (const [cle, total] of Object.entries(TOTAUX)) {
      await page.goto(`${BASE}/devis/?formule=${cle}&paiement=${plan}`, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      const vu = await page.evaluate(() => {
        const coche = n => { const e = document.querySelector(`input[name="${n}"]:checked`); return e ? e.value : null; };
        const mois = {};
        document.querySelectorAll('.budget-pill input[name="budget"]').forEach(r => {
          const p = r.closest('.budget-pill');
          const v = [...p.querySelectorAll('.budget-mois')]
            .filter(s => getComputedStyle(s).display !== 'none')
            .map(s => s.textContent.trim());
          mois[r.value] = v;
        });
        return { budget: coche('budget'), paiement: coche('paiement'), mois,
          allumees: [...document.querySelectorAll('.budget-pill.selected')].length };
      });
      verifs += 3;
      if (vu.budget !== cle) fails.push(`${vp.width} ${plan}x /devis?formule=${cle} : budget coche = ${vu.budget}`);
      if (vu.paiement !== plan) fails.push(`${vp.width} ${plan}x /devis?formule=${cle} : echeancier coche = ${vu.paiement}`);
      if (vu.allumees !== 2) fails.push(`${vp.width} ${plan}x /devis?formule=${cle} : ${vu.allumees} pastilles allumees au lieu de 2`);
      for (const [f, lignes] of Object.entries(vu.mois)) {
        verifs++;
        if (lignes.length !== 1) { fails.push(`${vp.width} ${plan}x : « ${f} » montre ${lignes.length} mensualites au lieu d'une`); continue; }
        const att = attendu(TOTAUX[f], +plan);
        if (nb(lignes[0]) !== att)
          fails.push(`${vp.width} ${plan}x : « ${f} » affiche ${lignes[0]} au lieu de ${att} €/mois`);
        if (!/mois|month/i.test(lignes[0]))
          fails.push(`${vp.width} ${plan}x : « ${f} » affiche ${lignes[0]} sans son unite`);
      }
    }

    /* ── 4. Changer de budget ne doit pas effacer l'echeancier ── */
    await page.goto(`${BASE}/devis/?formule=vitrine&paiement=${plan}`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.locator('.budget-pill input[name="budget"][value="entreprise"]').locator('..').click();
    await page.waitForTimeout(200);
    const apres = await page.evaluate(() => {
      const c = n => { const e = document.querySelector(`input[name="${n}"]:checked`); return e ? e.value : null; };
      return { budget: c('budget'), paiement: c('paiement') };
    });
    verifs += 2;
    if (apres.budget !== 'entreprise') fails.push(`${vp.width} ${plan}x : le clic sur Entreprise donne ${apres.budget}`);
    if (apres.paiement !== plan) fails.push(`${vp.width} ${plan}x : changer de budget a remis l'echeancier a ${apres.paiement}`);

    /* ── 5. Le reclique : chaque groupe doit pouvoir revenir en arriere ── */
    await page.goto(`${BASE}/devis/?formule=vitrine&paiement=${plan}`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const lu = () => page.evaluate(() => {
      const c = n => { const e = document.querySelector(`input[name="${n}"]:checked`); return e ? e.value : null; };
      return { budget: c('budget'), paiement: c('paiement'),
        mois: [...document.querySelectorAll('.budget-mois')].filter(e => getComputedStyle(e).display !== 'none').length,
        allumees: [...document.querySelectorAll('.budget-pill.selected')].length };
    });
    /* L'echeancier : reclique -> retour au comptant, et plus aucune
       mensualite affichee. Et il reste toujours une pastille allumee. */
    await page.locator(`.budget-pill input[name="paiement"][value="${plan}"]`).locator('..').click();
    await page.waitForTimeout(250);
    const r1 = await lu();
    verifs += 4;
    if (r1.paiement !== 'comptant') fails.push(`${vp.width} ${plan}x : reclique sur l'echeancier -> ${r1.paiement} au lieu de comptant`);
    if (r1.mois !== 0) fails.push(`${vp.width} ${plan}x : reclique sur l'echeancier -> ${r1.mois} mensualites encore affichees`);
    if (r1.budget !== 'vitrine') fails.push(`${vp.width} ${plan}x : reclique sur l'echeancier a change le budget (${r1.budget})`);
    /* Une pastille d'echeancier allumee + la pastille de budget. */
    if (r1.allumees !== 2) fails.push(`${vp.width} ${plan}x : ${r1.allumees} pastilles allumees apres reclique au lieu de 2`);

    /* Le budget, lui, se decoche entierement : c'est une information
       facultative, et « je ne sais pas » est une reponse valable. */
    await page.locator('.budget-pill input[name="budget"][value="vitrine"]').locator('..').click();
    await page.waitForTimeout(250);
    const r2 = await lu();
    verifs += 2;
    if (r2.budget !== null) fails.push(`${vp.width} ${plan}x : reclique sur le budget -> ${r2.budget} au lieu de rien`);
    if (r2.paiement !== 'comptant') fails.push(`${vp.width} ${plan}x : reclique sur le budget a change l'echeancier (${r2.paiement})`);

    /* ── 6. En comptant, aucune mensualite ne doit s'afficher ── */
    await page.goto(BASE + '/devis/', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const nues = await page.evaluate(() => ({
      visibles: [...document.querySelectorAll('.budget-mois')].filter(s => getComputedStyle(s).display !== 'none').length,
      paiement: (document.querySelector('input[name="paiement"]:checked') || {}).value,
    }));
    verifs += 2;
    if (nues.visibles !== 0) fails.push(`${vp.width} : ${nues.visibles} mensualites affichees en paiement comptant`);
    if (nues.paiement !== 'comptant') fails.push(`${vp.width} : sans parametre, l'echeancier vaut ${nues.paiement}`);

    /* ── 7. Le contraste de la mensualite, dans les deux etats ── */
    for (const theme of ['dark', 'light']) {
      const c2 = await browser.newContext({ viewport: vp, colorScheme: theme });
      await c2.addInitScript(t => { try { localStorage.setItem('nw-theme', t); } catch (e) {} }, theme);
      const p2 = await c2.newPage();
      await p2.goto(`${BASE}/devis/?formule=vitrine&paiement=${plan}`, { waitUntil: 'load' });
      await p2.waitForTimeout(900);
      const mesures = await p2.evaluate(() => {
        const rgb = c => { const m = String(c).match(/-?[\d.]+/g); return m ? [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1] : [0, 0, 0, 0]; };
        const sur = (h, b) => h.slice(0, 3).map((v, i) => v * h[3] + b[i] * (1 - h[3]));
        const L = p => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
          return .2126 * f(p[0]) + .7152 * f(p[1]) + .0722 * f(p[2]); };
        const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
        return [...document.querySelectorAll('.budget-mois')]
          .filter(e => getComputedStyle(e).display !== 'none')
          .map(e => {
            /* Le fond reel : on empile les fonds des ancetres jusqu'au
               premier opaque, exactement comme le navigateur peint. */
            let fond = [255, 255, 255], pile = [], n = e;
            while (n && n !== document.documentElement) {
              const c = rgb(getComputedStyle(n).backgroundColor);
              if (c[3] > 0) pile.push(c);
              if (c[3] >= 1) break;
              n = n.parentElement;
            }
            if (n === document.documentElement || !n) pile.push(rgb(getComputedStyle(document.body).backgroundColor));
            for (let i = pile.length - 1; i >= 0; i--) fond = sur(pile[i], fond);
            const cs = getComputedStyle(e);
            /* L'opacite de l'element melange le texte a son fond. */
            const op = +cs.opacity;
            const encre = sur([...rgb(cs.color).slice(0, 3), op], fond);
            const px = parseFloat(cs.fontSize), gras = +cs.fontWeight >= 700;
            return { txt: e.textContent.trim(), r: +ratio(encre, fond).toFixed(2),
              seuil: (px >= 24 || (px >= 18.66 && gras)) ? 3 : 4.5,
              allumee: !!e.closest('.budget-pill.selected'), px: Math.round(px) };
          });
      });
      if (!mesures.length) fails.push(`${vp.width} ${plan}x ${theme} : aucune mensualite a mesurer`);
      if (!mesures.some(m => m.allumee)) fails.push(`${vp.width} ${plan}x ${theme} : aucune mensualite sur pastille allumee`);
      mesures.forEach(m => {
        verifs++;
        if (m.r < m.seuil) fails.push(`${vp.width} ${plan}x ${theme} : « ${m.txt} » a ${m.r}:1 (< ${m.seuil}) ` +
          `sur pastille ${m.allumee ? 'allumee' : 'eteinte'}`);
      });
      await c2.close();
    }

    if (errs.length) fails.push(`${vp.width} ${plan}x : erreurs JavaScript — ${errs.join(' | ')}`);
    await ctx.close();
  }
}
await browser.close();

console.log(`\n${verifs} verifications, ${fails.length} en echec.`);
fails.forEach(f => console.log('  ✗ ' + f));
if (!fails.length) console.log('\n✓ L echeancier voyage de Tarifs au Devis, et chaque formule montre sa mensualite.');
process.exit(fails.length ? 1 : 0);
