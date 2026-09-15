#!/usr/bin/env node
/* Interdit toute couleur littérale hors du fichier de tokens.
   Couvre CSS, Astro, JS, SVG, JSON, HTML — y compris les canvas et le WebGL. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN = ['src', 'public'];
const EXT  = new Set(['.css', '.astro', '.ts', '.tsx', '.js', '.jsx', '.svg', '.html', '.json', '.webmanifest']);

/* Le SEUL fichier autorisé à contenir des couleurs littérales. */
const TOKENS = 'src/styles/tokens.css';

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

const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!EXT.has(extname(p))) continue;
    const rel = relative(ROOT, p);
    if (rel === TOKENS) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
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
  console.log(`✓ Aucune couleur littérale hors de ${TOKENS}.`);
  process.exit(0);
}
console.error(`✗ ${hits.length} couleur(s) littérale(s) hors de ${TOKENS} :\n`);
for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.what}] ${h.found}\n      ${h.src}`);
process.exit(1);
