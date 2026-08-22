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
  if (nom.startsWith('demo-')) continue;

  const brut = readFileSync(chemin, 'utf8');
  const html = sansBalises(brut);
  const dire = (m) => soucis.push(`${nom} — ${m}`);

  /* Structure de la page */
  const h1 = html.match(/<h1[\s>]/g) ?? [];
  if (h1.length !== 1) dire(`${h1.length} <h1> (il en faut exactement un)`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) dire('titre absent ou trop court');
  if (!/<meta name="description" content="[^"]{50,}"/.test(brut)) dire('meta description absente ou trop courte');
  if (!/<html lang="fr">/.test(html)) dire('lang="fr" absent');
  if (!/rel="canonical"/.test(brut)) dire('canonical absent');

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
const css = readdirSync(join(dist, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => statSync(join(dist, '_astro', f)).size)
  .reduce((a, b) => a + b, 0);

console.log(`audit : ${pages.length} page(s) — CSS ${(css / 1024).toFixed(0)} Ko, premier ecran ${(media / 1024).toFixed(0)} Ko de media`);

if (soucis.length === 0) {
  console.log('audit : rien a signaler.');
  process.exit(0);
}
console.log(`\naudit — ${soucis.length} point(s) a corriger :`);
soucis.forEach((s) => console.log(`  · ${s}`));
process.exit(1);
