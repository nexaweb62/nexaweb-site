#!/usr/bin/env node
/* Prerequis : npm run build && npx astro preview (port 4321).
   Usage : npm run check:cookies

   LE BANDEAU COMMANDE-T-IL VRAIMENT QUELQUE CHOSE ?

   Un bandeau de consentement est une promesse faite au visiteur. La
   seule facon de savoir si elle est tenue est de regarder ce qui part
   sur le reseau, pas ce qui est ecrit sur le bouton. Ce harnais ecoute
   donc les requetes reelles.

   Ce qu'il verifie :

     1. SANS AUCUN CHOIX, aucun appel ne part vers un tiers non declare
        necessaire. En particulier : rien chez Calendly. C'est le coeur
        du sujet — avant, le script Calendly partait au chargement de la
        page, et un bandeau pose par-dessus n'aurait rien commande.
     2. APRES ACCEPTATION, Calendly est bien appele. Un bandeau qui
        bloque meme apres un oui est cassé dans l'autre sens.
     3. APRES REFUS, toujours rien — et le refus survit au rechargement.
        Reposer la question a chaque visite est une facon de forcer la
        main, la CNIL le dit.
     4. REFUSER EST AUSSI SIMPLE QU'ACCEPTER. La regle est mesurable :
        memes dimensions, meme police, meme graisse, memes couleurs. Un
        refus plus petit ou plus pale est exactement ce qui se fait
        sanctionner, et c'est le genre de derive qu'une retouche de
        style introduit sans le vouloir.
     5. Le bandeau NE BLOQUE PAS la page : on peut continuer sans
        choisir, et cliquer ailleurs.
     6. Le lien du pied de page rouvre le panneau, sur n'importe quelle
        page, apres un choix.
     7. L'INVENTAIRE DECLARE CORRESPOND A LA REALITE : toute cle de
        stockage que le site utilise doit figurer dans le tableau de la
        politique de confidentialite. C'est ce controle qui manquait :
        la page affirmait « uniquement thème et langue » alors que le
        site en ecrivait cinq et appelait trois tiers.
*/
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';

/* Les tiers que le site a le droit d'appeler SANS consentement, et la
   raison. Tout ce qui n'est pas dans cette liste est un defaut. */
const NECESSAIRES = {
  'js.hcaptcha.com':      'anti-robot des formulaires — securite, exemptee',
  'newassets.hcaptcha.com': 'ressources hCaptcha',
  'cdn.jsdelivr.net':     'bibliotheque Supabase',
};
/* Les tiers qui exigent un accord. */
const SOUS_ACCORD = ['calendly.com'];

const PAGES = ['/', '/tarifs/', '/devis/', '/rendez-vous/', '/contact/', '/login/'];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const fails = [];
let verifs = 0;

/* Ouvre une page et rend la liste des hotes tiers contactes. */
async function visite(ctx, chemin, apres) {
  const p = await ctx.newPage();
  const hotes = new Set();
  p.on('request', r => {
    try {
      const h = new URL(r.url()).hostname;
      if (h && !/^(localhost|127\.0\.0\.1)$/.test(h)) hotes.add(h);
    } catch (e) {}
  });
  await p.goto(BASE + chemin, { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  if (apres) await apres(p);
  await p.waitForTimeout(1800);
  return { p, hotes };
}
const chezEux = (hotes, nom) => [...hotes].some(h => h === nom || h.endsWith('.' + nom));

/* ── 1. Sans choix : rien que le necessaire ne part ── */
for (const chemin of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const { p, hotes } = await visite(ctx, chemin);
  verifs++;
  for (const h of hotes) {
    if (!NECESSAIRES[h] && !Object.keys(NECESSAIRES).some(n => h.endsWith('.' + n.split('.').slice(-2).join('.')))) {
      fails.push(`sans choix, ${chemin} appelle ${h} — non declare necessaire`);
    }
  }
  for (const n of SOUS_ACCORD) {
    verifs++;
    if (chezEux(hotes, n)) fails.push(`sans choix, ${chemin} appelle deja ${n}`);
  }
  /* Le bandeau doit etre la, et visible. */
  const vu = await p.evaluate(() => {
    const e = document.getElementById('ck');
    if (!e) return null;
    const c = e.querySelector('.ck-carte');
    const r = c ? c.getBoundingClientRect() : null;
    return { cache: e.hidden, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
      dansEcran: r ? (r.bottom <= innerHeight + 1 && r.top >= -1) : false };
  });
  verifs += 2;
  if (!vu) fails.push(`${chemin} : pas de bandeau du tout`);
  else {
    if (vu.cache) fails.push(`${chemin} : le bandeau est masque alors qu'aucun choix n'a ete fait`);
    if (!vu.dansEcran || vu.w < 100 || vu.h < 40)
      fails.push(`${chemin} : bandeau hors ecran ou trop petit (${vu.w}x${vu.h})`);
  }
  await ctx.close();
}

/* ── 4. Accepter et refuser, strictement de meme poids ── */
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
  await ctx.addInitScript(t => { try { localStorage.setItem('nw-theme', t); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const duo = await p.evaluate(() => {
    const lu = id => {
      const e = document.getElementById(id);
      if (!e) return null;
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        taille: cs.fontSize, graisse: cs.fontWeight, couleur: cs.color,
        fond: cs.backgroundColor, bordure: cs.borderTopColor + ' ' + cs.borderTopWidth,
        opacite: cs.opacity, visible: r.width > 0 && r.height > 0 };
    };
    return { ok: lu('ck-ok'), non: lu('ck-non') };
  });
  verifs++;
  if (!duo.ok || !duo.non) { fails.push(`${theme} : un des deux boutons de decision manque`); }
  else {
    const m = [['taille', 'police'], ['graisse', 'graisse'], ['couleur', 'couleur du texte'],
               ['fond', 'fond'], ['bordure', 'bordure'], ['opacite', 'opacite']];
    for (const [k, nom] of m) {
      verifs++;
      if (duo.ok[k] !== duo.non[k])
        fails.push(`${theme} : refuser n'a pas la meme ${nom} qu'accepter (${duo.non[k]} contre ${duo.ok[k]})`);
    }
    verifs += 2;
    /* La largeur depend du libelle, pas du rang : on tolere l'ecart que
       produisent « Tout accepter » et « Tout refuser », pas davantage. */
    if (Math.abs(duo.ok.h - duo.non.h) > 0.5)
      fails.push(`${theme} : hauteurs differentes (${duo.ok.h} contre ${duo.non.h})`);
    if (duo.non.w < duo.ok.w * 0.8)
      fails.push(`${theme} : le bouton refuser est nettement plus etroit (${duo.non.w} contre ${duo.ok.w})`);
  }
  await ctx.close();
}

/* ── 2, 3 et 6. Le parcours complet sur /rendez-vous ── */
for (const geste of ['accepter', 'refuser']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const { p, hotes } = await visite(ctx, '/rendez-vous/', async page => {
    await page.click(geste === 'accepter' ? '#ck-ok' : '#ck-non');
  });
  verifs += 2;
  const appele = chezEux(hotes, 'calendly.com');
  if (geste === 'accepter' && !appele) fails.push(`apres acceptation, Calendly n'est toujours pas charge`);
  if (geste === 'refuser' && appele)   fails.push(`apres refus, Calendly est quand meme charge`);
  /* Le bandeau doit avoir disparu, le choix etre enregistre. */
  const etat = await p.evaluate(() => {
    let c = null;
    try { c = JSON.parse(localStorage.getItem('nw-consent') || 'null'); } catch (e) {}
    return { cache: document.getElementById('ck').hidden, c };
  });
  verifs += 2;
  if (!etat.cache) fails.push(`apres « ${geste} », le bandeau est encore affiche`);
  if (!etat.c || typeof etat.c.t !== 'number')
    fails.push(`apres « ${geste} », le choix n'est pas enregistre avec sa date`);
  else if (!!etat.c.rdv !== (geste === 'accepter'))
    fails.push(`apres « ${geste} », le choix enregistre vaut rdv=${etat.c.rdv}`);

  /* Le choix survit au rechargement : on ne repose pas la question. */
  const r2 = await visite(ctx, '/rendez-vous/');
  verifs += 2;
  const encore = await r2.p.evaluate(() => document.getElementById('ck').hidden);
  if (!encore) fails.push(`apres « ${geste} », la question est reposee au rechargement`);
  const appele2 = chezEux(r2.hotes, 'calendly.com');
  if (geste === 'refuser' && appele2) fails.push(`au rechargement apres refus, Calendly part quand meme`);
  if (geste === 'accepter' && !appele2) fails.push(`au rechargement apres acceptation, Calendly ne part plus`);

  /* Le lien du pied de page rouvre le panneau. */
  await r2.p.evaluate(() => {
    const b = document.getElementById('foot-ck');
    if (b) { b.scrollIntoView(); b.click(); }
  });
  await r2.p.waitForTimeout(400);
  const rouvert = await r2.p.evaluate(() => {
    const e = document.getElementById('ck');
    return { ouvert: e && !e.hidden, detail: !document.getElementById('ck-detail').hidden,
      coche: document.getElementById('ck-rdv').checked };
  });
  verifs += 3;
  if (!rouvert.ouvert) fails.push(`le lien Cookies du pied de page ne rouvre pas le panneau (apres « ${geste} »)`);
  if (!rouvert.detail) fails.push(`le panneau rouvert ne montre pas le detail des categories`);
  if (rouvert.coche !== (geste === 'accepter'))
    fails.push(`le panneau rouvert affiche un interrupteur qui ne reflete pas le choix « ${geste} »`);
  await ctx.close();
}

/* ── 5. Le bandeau laisse la page utilisable ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const libre = await p.evaluate(() => {
    const e = document.getElementById('ck');
    const r = e.getBoundingClientRect();
    /* Un point DANS la bande mais HORS de la carte : il doit laisser
       passer le clic, sinon le bandeau barre une colonne entiere. */
    const c = e.querySelector('.ck-carte').getBoundingClientRect();
    const x = Math.max(4, c.left / 2), y = (r.top + r.bottom) / 2;
    const sous = document.elementFromPoint(x, y);
    return { barre: !!(sous && e.contains(sous)), horsCarte: x < c.left };
  });
  verifs++;
  if (libre.horsCarte && libre.barre) fails.push('le bandeau intercepte les clics en dehors de sa carte');
  await ctx.close();
}

/* ── 7. L'inventaire declare couvre ce que le site utilise ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const vues = new Set();
  for (const chemin of PAGES) {
    await p.goto(BASE + chemin, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const k = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    k.forEach(x => vues.add(x));
  }
  /* On clique aussi pour declencher ce qui ne s'ecrit qu'au choix. */
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.click('#ck-non').catch(() => {});
  await p.waitForTimeout(300);
  (await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)])).forEach(x => vues.add(x));

  await p.goto(BASE + '/politique-confidentialite/', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const declare = await p.evaluate(() => document.body.innerText);
  for (const cle of vues) {
    verifs++;
    /* Les jetons Supabase portent un identifiant de projet variable :
       la politique les decrit par leur nature, pas par leur nom exact. */
    if (/^sb-/.test(cle)) {
      if (!/Supabase/i.test(declare)) fails.push(`la politique ne mentionne pas la session Supabase (cle ${cle})`);
      continue;
    }
    if (!declare.includes(cle))
      fails.push(`la cle « ${cle} » est utilisee par le site mais absente de la politique de confidentialite`);
  }
  console.log('  cles de stockage rencontrees : ' + [...vues].sort().join(', '));
  await ctx.close();
}

await browser.close();
console.log(`\n${verifs} verifications, ${fails.length} en echec.`);
fails.forEach(f => console.log('  ✗ ' + f));
if (!fails.length) console.log('\n✓ Le bandeau commande ce qu il annonce, et refuser coute le meme clic qu accepter.');
process.exit(fails.length ? 1 : 0);
