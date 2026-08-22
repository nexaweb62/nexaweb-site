/* Contraste de tout le site, calcule sur la feuille de style produite.

   L'audit ne verifiait que cinq paires ecrites a la main : il ratait toute
   couleur ajoutee depuis, et surtout il ignorait les `opacity`, qui reduisent
   le contraste reel sans changer la couleur declaree.

   Ce script fait l'inverse : il part de *toutes* les regles qui posent une
   couleur de texte, resout les variables, applique l'opacite et la
   transparence en composant sur le fond, et compare au seuil WCAG AA — 4,5:1
   pour le texte courant, 3:1 a partir de 24 px ou de 19 px en gras.

   Le fond n'est pas deductible d'une feuille de style sans moteur de rendu :
   il est declare ci-dessous, zone par zone. Le site n'en compte que quatre.

   `npm run contraste` — inclus dans `npm run audit`. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)), 'utf8')
  .match(/<style[^>]*>([\s\S]*?)<\/style>/g)
  ?.join('\n') ?? '';

/* ── Fonds reels du site ────────────────────────────────────────────────────
   Premier motif qui correspond au selecteur l'emporte ; sinon, le fond noir. */
const FONDS = [
  /* Le rond blanc du badge passe avant la pilule sombre qui l'entoure. */
  [/\.trust-badge (span|svg)/, '#ffffff', 'rond blanc'],
  [/\.nav-link|\.nav-pill|\.menu-sheet a|\.actionbar-cta|\.cta\b|\.menu-cta|\.header-cta:hover/, '#ffffff', 'pastille blanche'],
  [/\.trust-badge|\.trust-pill|\.header-cta/, '#28282a', 'pilule sombre'],
  [/\.price-card|\.demo-note|\.seuil|\.contact-panel/, '#050505', 'surface sur noir'],
];
const FOND_DEFAUT = ['#000000', 'fond noir'];

/* ── Couleurs ──────────────────────────────────────────────────────────────── */
const racine = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const variables = Object.fromEntries(
  [...racine.matchAll(/(--[\w-]+):\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]),
);

const resous = (valeur) => {
  let v = valeur.trim();
  for (let i = 0; i < 5 && v.includes('var('); i += 1) {
    v = v.replace(/var\((--[\w-]+)[^)]*\)/g, (_, nom) => variables[nom] ?? '');
  }
  return v.trim();
};

/* Retourne [r, g, b, alpha] ou null si la couleur n'est pas exploitable. */
const lis = (v) => {
  const t = v.trim().toLowerCase();
  if (t === 'transparent' || t === 'currentcolor' || t === 'inherit') return null;
  let m = t.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)).concat(1);
  m = t.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = t.match(/^#([0-9a-f]{8})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(parseInt(m[1].slice(6, 8), 16) / 255);
  m = t.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) {
      return [p[0], p[1], p[2], Number.isFinite(p[3]) ? p[3] : 1];
    }
  }
  if (t === 'white') return [255, 255, 255, 1];
  if (t === 'black') return [0, 0, 0, 1];
  return null;
};

const compose = ([r, g, b, a], fond) => {
  const [fr, fg, fb] = lis(fond);
  return [r * a + fr * (1 - a), g * a + fg * (1 - a), b * a + fb * (1 - a)];
};

const canal = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) =>
  0.2126 * canal(r / 255) + 0.7152 * canal(g / 255) + 0.0722 * canal(b / 255);
const contraste = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ── Parcours des regles ────────────────────────────────────────────────────── */
const resultats = [];
const IGNORE = /::(before|after|placeholder)|:hover|:focus|\.price-todo|\.legal-todo|@font-face/;

/* Textes purement decoratifs, retires de l'arbre d'accessibilite par
   `aria-hidden` : WCAG 1.4.3 ne leur applique pas de seuil. Toute entree ici
   doit correspondre a un element reellement marque `aria-hidden` dans le HTML.
   Le filigrane « 404 » est le seul du site. */
const DECORATIFS = /\.notfound-code/;

for (const m of css.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
  const selecteur = m[1].trim().replace(/\s+/g, ' ');
  const corps = m[2];
  if (IGNORE.test(selecteur) || DECORATIFS.test(selecteur)) continue;
  /* `opacity: 0` suivi d'une animation `forwards` est un etat de depart :
     la valeur qui compte est celle d'arrivee, soit 1. */
  if (/animation:/.test(corps) && /opacity:\s*0\s*;/.test(corps)) continue;

  const couleur = corps.match(/(?:^|;|\s)color:\s*([^;]+)/)?.[1];
  if (!couleur) continue;

  const rgba = lis(resous(couleur));
  if (!rgba) continue;

  /* L'opacite de la regle multiplie l'alpha : c'est le contraste reellement vu. */
  const opacite = Number(corps.match(/(?:^|;|\s)opacity:\s*([\d.]+)/)?.[1] ?? 1);
  const effectif = [rgba[0], rgba[1], rgba[2], rgba[3] * opacite];

  const zone = FONDS.find(([motif]) => motif.test(selecteur));
  const [fond, nomFond] = zone ? [zone[1], zone[2]] : FOND_DEFAUT;

  /* Seuil : 3:1 pour du gros texte (>= 24 px, ou >= 19 px en gras). */
  const taille = corps.match(/font-size:\s*(?:clamp\([^,]+,[^,]+,\s*)?([\d.]+)px/);
  const px = taille ? Number(taille[1]) : 15;
  const gras = /font-weight:\s*(600|700|bold)/.test(corps);
  const seuil = px >= 24 || (px >= 19 && gras) ? 3 : 4.5;

  const ratio = contraste(compose(effectif, fond), lis(fond));
  resultats.push({ selecteur, ratio, seuil, nomFond, px, opacite, couleur: resous(couleur).trim() });
}


/* ── Maquettes de demonstration ─────────────────────────────────────────────
   Elles portent leur propre feuille, avec leurs propres couleurs, et ne
   passent donc pas par le parcours ci-dessus. Elles sont montrees a des
   prospects : leur texte courant doit tenir le meme seuil. Le texte courant y
   est un blanc casse pose en `rgba` sur un fond tres sombre — c'est l'alpha qui
   decide, et il etait sous le seuil sur les deux. */
const MAQUETTES = [
  { fichier: 'demo-le-grenier.html', fond: '--bg', texte: '--mu' },
  { fichier: 'demo-la-fournee-dor.html', fond: '--bg', texte: '--mu' },
];

for (const m of MAQUETTES) {
  let page;
  try {
    page = readFileSync(fileURLToPath(new URL(`../dist/${m.fichier}`, import.meta.url)), 'utf8');
  } catch {
    continue;
  }
  const valeur = (nom) => page.match(new RegExp(`${nom}:\\s*([^;}]+)`))?.[1]?.trim();
  const fond = lis(valeur(m.fond));
  const texte = lis(valeur(m.texte));
  if (!fond || !texte) continue;

  const r = contraste(compose(texte, valeur(m.fond)), valeur(m.fond));
  resultats.push({
    selecteur: `${m.fichier} (texte courant)`,
    ratio: r,
    seuil: 4.5,
    nomFond: 'fond de la maquette',
    px: 15,
    opacite: 1,
    couleur: valeur(m.texte),
  });
}

resultats.sort((a, b) => a.ratio - b.ratio);

console.log(`contraste : ${resultats.length} regles de couleur verifiees sur ${new Set(resultats.map((r) => r.nomFond)).size} fonds`);
for (const r of resultats.slice(0, 6)) {
  const etat = r.ratio < r.seuil ? 'ECHEC' : ' ok  ';
  console.log(
    `  ${etat} ${r.ratio.toFixed(2).padStart(6)}:1 (seuil ${r.seuil})  ${r.selecteur.slice(0, 42).padEnd(44)}` +
      `${r.couleur.padEnd(26)}${r.opacite !== 1 ? `opacite ${r.opacite} ` : ''}sur ${r.nomFond}`,
  );
}

const echecs = resultats.filter((r) => r.ratio < r.seuil);

if (echecs.length) {
  console.log(`\ncontraste : ${echecs.length} regle(s) sous le seuil.`);
  process.exit(1);
}
console.log('contraste : tout est au niveau AA.');
