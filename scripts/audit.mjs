/* Controle de bonne sante du site produit, lance sur dist/.

   Ce n'est pas un test unitaire : c'est la liste des defauts qui se glissent
   dans un site statique sans que rien ne proteste — un titre en double, une
   image sans alt, un champ sans label, un lien interne casse, une page qui
   grossit sans qu'on s'en apercoive.

   `npm run audit` apres `npm run build`. */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const pages = [];
const soucis = [];

const parcourir = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) parcourir(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
};
parcourir(dist);

const sansBalises = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');

for (const chemin of pages.sort()) {
  const nom = relative(dist, chemin);
  /* Les maquettes sont hors index mais montrees a des prospects : elles sont
     auditees comme le reste, a deux exceptions pres — elles n'ont ni canonical
     ni meta description, et n'en ont pas besoin. */
  const maquette = nom.startsWith('demo-');

  const brut = readFileSync(chemin, 'utf8');
  const html = sansBalises(brut);
  const dire = (m) => soucis.push(`${nom} — ${m}`);

  /* Structure de la page */
  const h1 = html.match(/<h1[\s>]/g) ?? [];
  if (h1.length !== 1) dire(`${h1.length} <h1> (il en faut exactement un)`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) dire('titre absent ou trop court');
  if (!maquette && !/<meta name="description" content="[^"]{50,}"/.test(brut)) {
    dire('meta description absente ou trop courte');
  }
  if (!/<html lang="fr">/.test(html)) dire('lang="fr" absent');
  if (!maquette && !/rel="canonical"/.test(brut)) dire('canonical absent');

  /* Titres : pas de saut de niveau */
  const niveaux = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < niveaux.length; i += 1) {
    if (niveaux[i] - niveaux[i - 1] > 1) {
      dire(`saut de titre h${niveaux[i - 1]} → h${niveaux[i]}`);
      break;
    }
  }

  /* Images : alt obligatoire, dimensions conseillees */
  for (const img of html.match(/<img[^>]*>/g) ?? []) {
    if (!/\salt=/.test(img)) dire(`image sans alt : ${img.slice(0, 70)}…`);
    if (!/\swidth=/.test(img) || !/\sheight=/.test(img)) {
      dire(`image sans dimensions (decalage de mise en page) : ${img.slice(0, 70)}…`);
    }
  }

  /* Champs de formulaire : chacun doit avoir un label */
  for (const champ of html.match(/<(input|select|textarea)[^>]*>/g) ?? []) {
    const type = champ.match(/type="([^"]+)"/)?.[1] ?? 'text';
    if (['hidden', 'submit', 'button'].includes(type)) continue;
    const id = champ.match(/id="([^"]+)"/)?.[1];
    const dansLabel = new RegExp(`<label[^>]*>[^<]*${champ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    if (!id && !dansLabel.test(html) && !/aria-label=/.test(champ)) {
      dire(`champ sans id ni label : ${champ.slice(0, 60)}…`);
    } else if (id && !html.includes(`for="${id}"`) && !/aria-label=/.test(champ)) {
      dire(`champ #${id} sans <label for>`);
    }
  }

  /* Ancres : `#tarifs` doit exister dans la page visee, sinon le lien depose
     le visiteur en haut d'une page sans qu'il comprenne pourquoi. C'est ainsi
     qu'un `#realisations` a survecu a la suppression de sa section. */
  for (const m of html.matchAll(/href="([^"]*#[\w-]+)"/g)) {
    const [chemin_, ancre] = m[1].split('#');
    const cible = chemin_ === '' ? chemin : join(dist, chemin_ === '/' ? 'index.html' : `${chemin_}.html`);
    if (!existsSync(cible)) continue; // lien externe ou page absente, deja signale plus bas
    const page = cible === chemin ? html : sansBalises(readFileSync(cible, 'utf8'));
    if (!new RegExp(`id="${ancre}"`).test(page)) dire(`ancre morte : ${m[1]}`);
  }

  /* Liens internes : la cible doit exister dans dist/ */
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const cible = m[1];
    if (cible.startsWith('/assets') || cible.startsWith('/fonts') || cible.startsWith('/api')) continue;
    const candidats = [
      join(dist, cible === '/' ? 'index.html' : `${cible}.html`),
      join(dist, cible),
      join(dist, cible, 'index.html'),
    ];
    if (!candidats.some((c) => existsSync(c))) dire(`lien interne mort : ${cible}`);
  }

  /* Poids : une page de contenu qui depasse 60 Ko de HTML a derape */
  const ko = statSync(chemin).size / 1024;
  if (ko > 60) dire(`page lourde : ${ko.toFixed(0)} Ko de HTML`);
}

/* Poids total des ressources embarquees dans le premier ecran */
const media = ['assets/hero-poster.webp', 'assets/logo.svg']
  .map((f) => statSync(join(dist, f)).size)
  .reduce((a, b) => a + b, 0);
/* Le CSS est pose dans le HTML : on le mesure sur l'accueil plutot que dans
   _astro/, qui n'existe plus. */
const accueil = readFileSync(join(dist, 'index.html'), 'utf8');
const css = [...accueil.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1].length)
  .reduce((a, b) => a + b, 0);


/* ── Classes citees mais jamais definies ────────────────────────────────────
   Une faute de frappe dans un `class="..."` ne casse rien : elle produit une
   page sans style, silencieusement. Sans navigateur pour s'en apercevoir,
   c'est le controle qui remplace le coup d'oeil. */
const feuille = [...accueil.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join('\n');

/* `url(…/archivo-latin.woff2)` et `format('woff2')` contiennent un point suivi
   d'un mot : sans ce nettoyage, l'extension passe pour une classe. */
const feuilleNette = feuille.replace(/url\([^)]*\)/g, '').replace(/format\([^)]*\)/g, '');
const definies = new Set([...feuilleNette.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));
/* Classes sans regle propre, et c'est voulu : `menu-link` sert de point
   d'accroche au JavaScript du menu, son apparence vient de `.menu-sheet a`.
   `menu-open` et `is-active` sont posees a l'execution. `price-todo` et sa note
   ne s'affichent que si un montant repasse a null : c'est le garde-fou de mise
   en production, la regle doit rester dans la feuille. */
const tolerees = new Set([
  'menu-open',
  'is-active',
  'menu-link',
  'price-todo',
  'price-todo-note',
  'astro-route-announcer',
]);

const citees = new Map();
for (const chemin of pages) {
  const nom = relative(dist, chemin);
  if (nom.startsWith('demo-')) continue; // feuilles autonomes
  for (const m of readFileSync(chemin, 'utf8').matchAll(/\sclass="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) {
      if (!citees.has(c)) citees.set(c, nom);
    }
  }
}

for (const [classe, page] of citees) {
  if (!definies.has(classe) && !tolerees.has(classe)) {
    soucis.push(`${page} — classe sans style : .${classe}`);
  }
}



/* ── Coherence des montants ─────────────────────────────────────────────────
   Les prix ne doivent exister qu'a un seul endroit : PRICING, dans
   src/config/site.ts. Un montant ecrit en clair dans un texte survit au
   changement de tarif et fait mentir la page — c'est arrive aux descriptions
   des pages metier, corrigees en v4.0. Tout montant en euros affiche par le
   site doit donc correspondre a l'un des deux prix. */
const config = readFileSync(fileURLToPath(new URL('../src/config/site.ts', import.meta.url)), 'utf8');
const bloc_prix = config.match(/export const PRICING[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
/* `toLocaleString('fr-FR')` separe les milliers par une espace fine insecable :
   on compare des chiffres nus des deux cotes. */
const chiffres = (t) => t.replace(/[\s\u00a0\u202f]/g, '');
const autorises = new Set([...bloc_prix.matchAll(/:\s*(\d+)/g)].map((m) => m[1]));

/* Montants cites a dessein, qui ne sont pas des prix de Nexa Web. Toute
   nouvelle entree ici doit etre justifiee : c'est le seul moyen de faire
   passer un montant fixe, et c'est voulu. */
const MONTANTS_CITES = new Set([
  '300', // « mon neveu peut me le faire pour 300 € », objection citee dans la FAQ
]);

for (const chemin of pages) {
  const nom = relative(dist, chemin);
  if (nom.startsWith('demo-')) continue; // etablissements fictifs, prix fictifs
  const texte = sansBalises(readFileSync(chemin, 'utf8')).replace(/<[^>]+>/g, ' ');
  for (const m of texte.matchAll(/([\d\s\u00a0\u202f]*\d)\s?€/g)) {
    const montant = chiffres(m[1]);
    if (!autorises.has(montant) && !MONTANTS_CITES.has(montant)) {
      soucis.push(`${nom} — montant « ${m[1].trim()} € » etranger a PRICING`);
    }
  }
}

/* ── Vocabulaire ────────────────────────────────────────────────────────────
   La regle editoriale du site tient en une phrase : un mot qu'on ne dirait pas
   au telephone a un boulanger n'a rien a faire sur la page. Elle n'etait
   verifiee que par relecture, donc oubliee des qu'une section est ajoutee.
   La liste ne contient que des termes indefendables ici — pas des mots
   discutables comme « solution » ou « accompagnement », qui ont parfois un sens
   precis. */
const INTERDITS = [
  'expérience digitale',
  'expériences digitales',
  'sur-mesure',
  'clé en main',
  'clef en main',
  'à 360',
  'synergie',
  'écosystème digital',
  'transformation digitale',
  'booster votre',
  'boostez votre',
  'nouvelle génération',
  'incontournable',
  'leader du marché',
  'à la pointe',
  'notre ADN',
  'passionnés du digital',
  'agence premium',
];

for (const chemin of pages) {
  const nom = relative(dist, chemin);
  const texte = sansBalises(readFileSync(chemin, 'utf8'))
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase();
  for (const mot of INTERDITS) {
    if (texte.includes(mot)) soucis.push(`${nom} — vocabulaire d'agence : « ${mot} »`);
  }
}

/* Les contrastes sont verifies par scripts/contraste.mjs, qui parcourt toutes
   les regles de couleur de la feuille au lieu de cinq paires ecrites a la main,
   et qui tient compte des opacites. `npm run audit` enchaine les deux. */

/* Regles definies et jamais employees. Simple information : une classe peut
   servir a une page future ou etre posee par un script. Mais une liste qui
   s'allonge signale un renommage a moitie fait — exactement le defaut que le
   controle ci-dessus a trouve dans l'autre sens. */
const orphelines = [...definies].filter(
  (c) => !citees.has(c) && !tolerees.has(c) && !c.startsWith('astro-'),
);
if (orphelines.length) {
  console.log(`audit : ${orphelines.length} regle(s) sans emploi — ${orphelines.join(', ')}`);
}

console.log(
  `audit : ${pages.length} page(s) — CSS ${(css / 1024).toFixed(0)} Ko dans la page, ` +
    `premier ecran ${(media / 1024).toFixed(0)} Ko de media, ` +
    `${citees.size} classes utilisees`,
);

if (soucis.length === 0) {
  console.log('audit : rien a signaler.');
  process.exit(0);
}
console.log(`\naudit — ${soucis.length} point(s) a corriger :`);
soucis.forEach((s) => console.log(`  · ${s}`));
process.exit(1);
