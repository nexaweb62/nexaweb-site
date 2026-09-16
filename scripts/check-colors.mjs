#!/usr/bin/env node
/* Interdit toute couleur littérale hors du fichier de tokens.
   Couvre CSS, Astro, JS, SVG, JSON, HTML — y compris les canvas et le WebGL. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN = ['src', 'public'];
const EXT  = new Set(['.css', '.astro', '.ts', '.tsx', '.js', '.jsx', '.svg', '.html', '.json', '.webmanifest']);

/* Le SEUL fichier ÉCRIT À LA MAIN qui contient des couleurs littérales. */
const TOKENS = 'src/styles/tokens.css';

/* Fichiers GÉNÉRÉS depuis ce même fichier par `npm run build:assets`.
   Un favicon, une image OG ou un manifeste PWA ne peuvent pas lire les
   variables CSS de la page : leurs couleurs sont forcément figées dans le
   fichier. Les figer depuis les tokens, par script, est le seul moyen
   qu'elles ne divergent jamais de la palette. Ne jamais les éditer à la
   main — relancer le générateur. */
const GENERATED = new Set([
  'public/favicon.svg',
  'public/site.webmanifest',
]);
/* Répertoires entièrement produits par un générateur lisant les tokens. */
const GENERATED_DIRS = ['src/assets/logos/', 'public/logos/'];

const PATTERNS = [
  // #rgb / #rrggbb / #rrggbbaa — précédé d'un séparateur, pas d'un mot
  { re: /(?<![\w&])#[0-9a-fA-F]{3}(?![0-9a-fA-F\w])|(?<![\w&])#[0-9a-fA-F]{6}(?![0-9a-fA-F\w])|(?<![\w&])#[0-9a-fA-F]{8}(?![0-9a-fA-F\w])/g, what: 'hex' },
  // rgb()/rgba()/hsl()/hsla() dont le contenu commence par un chiffre
  // (exclut les identifiants type linearToSrgb(c) du GLSL)
  { re: /(?<![\w-])(?:rgba?|hsla?)\(\s*[\d.]/gi, what: 'fonction couleur' },
  // Mots-clés de couleurs nommées à bannir
  { re: /\b(?:violet|purple|indigo|fuchsia|magenta|rebeccapurple)\b/gi, what: 'couleur nommée' },
];

/* Exceptions documentées, une par une. */
const ALLOW = [
  // Identifiants GLSL contenant « Srgb( » / « srgb( »
  /(?:linearTo|to|from)Srgb\(/i,
  // color-mix(in srgb, …) : espace colorimétrique, pas une couleur
  /in\s+srgb/i,
  // Ces deux-là construisent une couleur À PARTIR d'un token, sans littéral
  /rgba\(' \+ c\[0\]/,
  /return m2 \? \[\+m2\[0\]/,
];

/* Neutralise le contenu des commentaires SANS décaler les numéros de ligne :
   une couleur n'est une faute que si c'est une VALEUR. Un commentaire qui
   explique qu'on a retiré un dégradé violet n'en est pas une. */
function stripComments(src) {
  const keep = ch => (ch === '\n' ? '\n' : ' ');
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => [...m].map(keep).join(''))   // /* … */
    .replace(/<!--[\s\S]*?-->/g,      m => [...m].map(keep).join(''))   // <!-- … -->
    .replace(/(^|[^:\w])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length)); // // …
}

const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!EXT.has(extname(p))) continue;
    const rel = relative(ROOT, p);
    if (rel === TOKENS || GENERATED.has(rel)) continue;
    if (GENERATED_DIRS.some(d => rel.startsWith(d))) continue;
    stripComments(readFileSync(p, 'utf8')).split('\n').forEach((line, i) => {
      if (ALLOW.some(a => a.test(line))) return;
      for (const { re, what } of PATTERNS) {
        re.lastIndex = 0;
        const m = line.match(re);
        if (m) hits.push({ file: rel, line: i + 1, what, found: [...new Set(m)].join(' '), src: line.trim().slice(0, 100) });
      }
    });
  }
}
for (const d of SCAN) walk(join(ROOT, d));

if (!hits.length) {
  console.log(`✓ Aucune couleur littérale hors de ${TOKENS}`);
  console.log(`  (générés depuis ce fichier : ${[...GENERATED].join(', ')},`);
  console.log(`   et ${GENERATED_DIRS.join(', ')} — npm run build:assets / build:logos)`);
  process.exit(0);
}
console.error(`✗ ${hits.length} couleur(s) littérale(s) hors de ${TOKENS} :\n`);
for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.what}] ${h.found}\n      ${h.src}`);
process.exit(1);
