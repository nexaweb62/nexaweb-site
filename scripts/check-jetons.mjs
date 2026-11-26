#!/usr/bin/env node
/* Usage : npm run check:jetons
 *
 * TOUT var(--x) DOIT AVOIR UN --x QUELQUE PART.
 *
 * Ce garde-fou est né d'une panne que les autres ne pouvaient pas voir.
 * En passant la palette en monochrome, les jetons sémantiques
 * « --glass-gold-* » ont été renommés « --glass-acc-* » dans tokens.css,
 * mais global.css a continué à les appeler par leur ancien nom. CSS ne
 * proteste pas : un var() sans valeur ni repli rend la déclaration
 * invalide, en silence. Les boutons de verre ont simplement perdu leur
 * dégradé — rien n'a cassé, rien n'a crié.
 *
 * Aucun contrôle existant ne pouvait l'attraper : check:colors cherche
 * des couleurs EN TROP, pas de la peinture MANQUANTE ; et une mesure de
 * saturation voit du gris là où il ne reste plus rien à peindre.
 * Mesurer ce qui existe ne dit rien de ce qui a disparu.
 *
 * On collecte donc les deux ensembles — les noms DÉFINIS (en CSS, et
 * posés depuis JS par setProperty) et les noms UTILISÉS — et on exige
 * que le second soit inclus dans le premier. Un var() muni d'un repli,
 * « var(--x, 0) », est admis : l'auteur a prévu l'absence.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const RACINES = ['src', 'public', 'scripts'];
const EXT = new Set(['.css', '.astro', '.js', '.ts', '.mjs', '.svg', '.json']);

function fichiers(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git' || n === 'dist') continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) fichiers(p, acc);
    else if (EXT.has(extname(p))) acc.push(p);
  }
  return acc;
}

const definis = new Set();
const utilises = new Map();   /* nom -> [fichier:ligne, …] */

/* Des noms que le navigateur fournit ou que des bibliotheques posent. */
const TOLERES = new Set();

for (const racine of RACINES) {
  let liste;
  try { liste = fichiers(racine); } catch { continue; }
  for (const f of liste) {
    const src = readFileSync(f, 'utf8');
    const lignes = src.split('\n');

    /* DEFINITIONS : « --x: … » en CSS, et setProperty('--x', …) en JS. */
    for (const m of src.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) definis.add(m[1]);
    for (const m of src.matchAll(/setProperty\(\s*['"`](--[A-Za-z0-9_-]+)/g)) definis.add(m[1]);
    /* publier('--x', …) : l'habillage maison de setProperty dans metal.js */
    for (const m of src.matchAll(/publier\(\s*['"`](--[A-Za-z0-9_-]+)/g)) definis.add(m[1]);

    /* UTILISATIONS : var(--x) sans repli. « var(--x, … ) » est admis. */
    lignes.forEach((ligne, i) => {
      for (const m of ligne.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
        if (m[2] === ',') continue;                 /* un repli existe */
        const nom = m[1];
        if (!utilises.has(nom)) utilises.set(nom, []);
        utilises.get(nom).push(`${f}:${i + 1}`);
      }
    });
  }
}

const orphelins = [...utilises.entries()]
  .filter(([n]) => !definis.has(n) && !TOLERES.has(n))
  .sort((a, b) => b[1].length - a[1].length);

if (orphelins.length === 0) {
  console.log(`✓ Tous les var(--…) sans repli sont définis quelque part`);
  console.log(`  ${definis.size} jetons définis, ${utilises.size} utilisés sans repli`);
  process.exit(0);
}

console.error(`✗ ${orphelins.length} jeton(s) utilisé(s) sans jamais être défini(s) :\n`);
for (const [nom, lieux] of orphelins) {
  console.error(`  ${nom}`);
  for (const l of lieux.slice(0, 6)) console.error(`      ${l}`);
  if (lieux.length > 6) console.error(`      … et ${lieux.length - 6} autre(s)`);
}
console.error(`\n  Un var() sans valeur ni repli rend la déclaration invalide,`);
console.error(`  en silence : la propriété n'est simplement pas peinte.`);
process.exit(1);
