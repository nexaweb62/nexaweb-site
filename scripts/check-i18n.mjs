#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:i18n
           PAGES=/devis,/avis npm run check:i18n   (pour cibler)

   CE QUI RESTE EN FRANÇAIS QUAND ON PASSE EN ANGLAIS.

   Le système de traduction du site ne touche QUE ce qui porte un
   attribut : data-i18n pour le contenu, data-i18n-ph pour un
   placeholder, data-i18n-aria pour un nom accessible, data-i18n-title
   pour une infobulle. Tout le reste est invisible pour lui — et donc
   reste en français, pour toujours, sans que rien ne le signale.

   Ce contrôle fait l'inventaire inverse : il parcourt chaque page et
   liste tout ce qu'un visiteur peut LIRE et qui n'est couvert par
   aucune clé. Il tourne sur la page réelle, pas sur le fichier source :
   c'est le seul moyen de voir aussi ce que le JavaScript injecte.

   Les exceptions sont nommées une par une, et justifiées. Un nom
   propre, un prix, une adresse ou un e-mail ne se traduisent pas ; tout
   le reste, si. */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const PAGES = (process.env.PAGES || [
  '/', '/services', '/tarifs', '/devis', '/contact', '/equipe', '/avis',
  '/rendez-vous', '/comment-ca-marche', '/cgv', '/mentions-legales',
  '/politique-confidentialite', '/site-vitrine', '/ecommerce', '/seo',
  '/design-uiux', '/refonte', '/site-internet-artisan',
  '/site-internet-commerce', '/site-internet-restaurant',
  '/login', '/inscription', '/404',
].join(',')).split(',');

/* ── CE QUI NE SE TRADUIT PAS, ET POURQUOI ──────────────────────────
   Chaque motif est une exception assumée, pas un tapis sous lequel
   pousser ce qui dérange. */
const EXCEPTIONS = [
  { re: /^[\s ·—–\-—→←↓↑✓✗|/\\•#*+()[\]{}:;,.…"'«»]+$/u, quoi: 'ponctuation seule' },
  { re: /^\d+([.,]\d+)?\s*(€|%|px|h|j|min|s|ms|Go|Mo|ko)?$/i, quoi: 'nombre ou unité' },
  { re: /^(Nexa\s?Web|NEXAWEB|NEXA|WEB · AGENCE|WEB\s*·\s*AGENCE)$/i, quoi: 'nom de la marque' },
  { re: /@/, quoi: 'adresse e-mail' },
  { re: /^(FR|EN)$/, quoi: 'code de langue' },
  { re: /^(LinkedIn|Facebook|WhatsApp|Instagram|Google|Calendly|Supabase|Stripe|Cloudflare)$/i, quoi: 'nom de service tiers' },
  { re: /^(Carvin|Hauts-de-France|France|Lens|Lille|Douai|Béthune|Arras)$/i, quoi: 'nom de lieu' },
  { re: /^\d[\d\s]{8,}$/, quoi: 'numéro (SIRET, téléphone)' },
  { re: /^(SIRET|RCS|TVA|SAS|SASU|EI|URL|SEO|UI|UX|FAQ|RGPD|GDPR|CGV|HTML|CSS|JS|PDF|CMS|SSL|API)\b/i, quoi: 'sigle' },
  /* Les noms des cles de stockage du navigateur. Ce sont des
     identifiants techniques : les traduire les casserait. */
  { re: /^(nw[-_][a-z]+|nexa-[a-z]+)(,\s*(nw[-_][a-z]+|nexa-[a-z]+))*$/i, quoi: 'identifiant technique' },
  /* « vs » est du latin, identique dans les deux langues. */
  { re: /^vs\.?$/i, quoi: 'abreviation latine' },
  /* « 8/10 », « 24/7 » : un rapport chiffre ne se traduit pas. */
  { re: /^\d+\s*\/\s*\d+$/, quoi: 'proportion chiffree' },
  { re: /^https?:\/\//i, quoi: 'adresse web' },
];
/* Les noms de l'equipe, lus dans la page Equipe : ils ne se traduisent
   pas non plus, et les coder en dur ici les ferait diverger. */
let NOMS = [];

const estExcepte = txt => {
  const t = txt.trim();
  if (t.length < 2) return 'trop court';
  if (NOMS.includes(t)) return 'nom de personne';
  for (const e of EXCEPTIONS) if (e.re.test(t)) return e.quoi;
  return null;
};

const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('nexa-intro', '1');
    localStorage.setItem('nw-lang', 'en');
    localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: false }));
  } catch (e) {}
});
const page = await ctx.newPage();

/* On releve d'abord les noms de l'equipe, pour ne pas les signaler. */
try {
  await page.goto(BASE + '/equipe', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  NOMS = await page.evaluate(() =>
    [...document.querySelectorAll('.eq-name,.team-name,[class*="-name"]')]
      .map(e => e.textContent.trim()).filter(Boolean));
} catch (e) {}

const manques = [];
let pagesVues = 0;

for (const chemin of PAGES) {
  try {
    await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (e) { continue; }
  await page.waitForTimeout(900);
  pagesVues++;

  const trouve = await page.evaluate(() => {
    const INVISIBLE = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'PATH']);
    const couvert = el => { /* lui ou un ancetre porte une cle */
      let n = el;
      while (n && n !== document.documentElement) {
        if (n.hasAttribute && n.hasAttribute('data-i18n')) return true;
        n = n.parentElement;
      }
      return false;
    };
    const visible = el => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      return true;
    };
    const out = [];

    /* 1. Les noeuds de texte.

       ON REMONTE HORS DES MOTS DECOUPES. L'animation des titres et la
       lecture mot a mot emballent chaque mot dans un <span class="w">
       ou « rw », chaque ligne dans « ln » / « li ». Signaler ces spans
       un par un transformait un paragraphe a traduire en quarante
       lignes de rapport : 2072 entrees au premier passage, pour une
       centaine de vrais manques. On remonte donc jusqu'au bloc qui
       porterait la cle, et on ne le signale qu'une fois. */
    const DECOUPE = new Set(['w', 'rw', 'ln', 'li']);
    const bloc = el => {
      let n = el;
      while (n && n.parentElement && typeof n.className === 'string' &&
             n.className.trim().split(/\s+/).some(c => DECOUPE.has(c))) {
        n = n.parentElement;
      }
      return n;
    };
    /* ON SIGNALE LE BLOC UNE FOIS, MAIS AVEC CE QUI EST VRAIMENT
       DECOUVERT. Rapporter le textContent entier du bloc melangeait
       le texte a traduire avec les prix et les separateurs qui, eux,
       sont des exceptions legitimes : une pastille de budget
       remontait « Showcase Pro — 999 €333 €/month » alors que seul le
       nom etait en cause, et il etait deja traduit. */
    const parBloc = new Map();
    const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = it.nextNode())) {
      const t = (n.nodeValue || '').trim();
      if (!t) continue;
      const p0 = n.parentElement;
      if (!p0 || INVISIBLE.has(p0.tagName)) continue;
      if (p0.closest('svg')) continue;
      if (!visible(p0)) continue;
      if (couvert(p0)) continue;
      const p = bloc(p0);
      if (!parBloc.has(p)) parBloc.set(p, []);
      parBloc.get(p).push(t);
    }
    for (const [p, morceaux] of parBloc) {
      out.push({ type: 'texte', morceaux, ou: p.tagName.toLowerCase() +
        (typeof p.className === 'string' && p.className ? '.' + p.className.trim().split(/\s+/)[0] : '') });
    }

    /* 2. Les attributs que l'on lit ou que l'on entend. */
    const paires = [['placeholder', 'data-i18n-ph'], ['aria-label', 'data-i18n-aria'],
                    ['title', 'data-i18n-title'], ['alt', 'data-i18n-alt'],
                    ['value', 'data-i18n-value']];
    document.querySelectorAll('*').forEach(el => {
      for (const [attr, cle] of paires) {
        if (attr === 'value' && el.tagName !== 'INPUT') continue;
        if (attr === 'value' && !['submit', 'button', 'reset'].includes(el.type)) continue;
        const v = el.getAttribute(attr);
        if (!v || !v.trim()) continue;
        if (el.hasAttribute(cle)) continue;
        out.push({ type: attr, txt: v.trim(), ou: el.tagName.toLowerCase() +
          (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '') });
      }
    });

    /* 3. La page elle-meme.

       ON NE REGARDE PAS LE TEXTE DU TITRE, mais s'il est RACCROCHE au
       systeme. Lire « Pricing — Nexa Web » ne dit pas s'il a ete
       traduit ou s'il etait deja en anglais : le premier passage
       signalait des titres parfaitement traduits. La seule question
       qui se pose est : la page declare-t-elle une cle ? */
    const r = document.documentElement;
    const d = document.querySelector('meta[name="description"]');

    /* 4. Les cles citees existent-elles vraiment ?
       Une faute de frappe dans un data-i18n ne leve rien : l'element
       garde son francais, en silence. nwT rend le sentinelle quand la
       cle est absente des DEUX dictionnaires. */
    const SENTINELLE = '\u0000';
    const clesMortes = [];
    if (window.nwT) {
      const attrs = ['data-i18n','data-i18n-ph','data-i18n-aria',
                     'data-i18n-title','data-i18n-alt','data-i18n-value'];
      const vues = new Set();
      attrs.forEach(a => document.querySelectorAll('[' + a + ']').forEach(el => {
        const k = el.getAttribute(a);
        if (!k || vues.has(k)) return;
        vues.add(k);
        if (window.nwT(k, SENTINELLE) === SENTINELLE) clesMortes.push(k);
      }));
      [r.getAttribute('data-i18n-doctitle'), r.getAttribute('data-i18n-docdescr')]
        .forEach(k => { if (k && window.nwT(k, SENTINELLE) === SENTINELLE) clesMortes.push(k); });
    }

    return { noeuds: out, lang: r.lang, clesMortes,
             titreLie: !!r.getAttribute('data-i18n-doctitle'),
             descrLie: !!r.getAttribute('data-i18n-docdescr'),
             aDescr: !!d };
  });

  for (const n of trouve.noeuds) {
    if (n.morceaux) {
      /* Chaque morceau passe le filtre des exceptions ; on ne signale
         le bloc que s'il en reste quelque chose a traduire. */
      const restants = n.morceaux.filter(m => !estExcepte(m));
      if (!restants.length) continue;
      manques.push({ page: chemin, type: n.type, ou: n.ou, txt: restants.join(' ') });
      continue;
    }
    if (estExcepte(n.txt)) continue;
    manques.push({ page: chemin, ...n });
  }
  if (trouve.lang !== 'en') {
    manques.push({ page: chemin, type: '<html lang>', txt: trouve.lang || '(vide)', ou: 'html' });
  }
  if (!trouve.titreLie) {
    manques.push({ page: chemin, type: '<title>', txt: 'aucune cle data-i18n-doctitle', ou: 'html' });
  }
  if (trouve.aDescr && !trouve.descrLie) {
    manques.push({ page: chemin, type: 'meta description', txt: 'aucune cle data-i18n-docdescr', ou: 'html' });
  }
  for (const k of trouve.clesMortes) {
    manques.push({ page: chemin, type: 'cle morte', txt: k + ' — absente des dictionnaires', ou: 'i18n.js' });
  }
}
await nav.close();

/* On regroupe par page : une liste de 400 lignes ne se lit pas. */
const parPage = new Map();
for (const m of manques) {
  if (!parPage.has(m.page)) parPage.set(m.page, []);
  parPage.get(m.page).push(m);
}

/* Sortie machine, pour l'outil qui pose les cles. */
if (process.env.JSON) {
  console.log(JSON.stringify(manques, null, 1));
  process.exit(manques.length ? 1 : 0);
}

console.log(`${pagesVues} pages parcourues en anglais.`);
if (!manques.length) { console.log('\n✓ Traduction : rien ne reste en français.'); process.exit(0); }

console.log(`\n✗ ${manques.length} element(s) sans traduction :\n`);
for (const [p, liste] of [...parPage].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${p}  (${liste.length})`);
  const vus = new Set();
  for (const m of liste) {
    const k = m.type + m.txt;
    if (vus.has(k)) continue; vus.add(k);
    console.log(`     [${m.type}] ${m.ou.padEnd(22)} « ${m.txt.replace(/\s+/g, ' ').slice(0, 78)} »`);
  }
}
process.exit(1);
