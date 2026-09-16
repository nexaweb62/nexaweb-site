#!/usr/bin/env node
/* Génère les trois pistes de logo en SVG, lettres VECTORISÉES.

   Tout est construit sur une grille unique — hauteur de capitale 100
   unités, ligne de base à y=100 — et tracé par ce script plutôt qu'à la
   main : c'est ce qui garantit que les fûts ont la même épaisseur d'une
   lettre à l'autre et d'une piste à l'autre.

   Aucun <text> : le rendu ne dépend d'aucune police installée.

   Usage : npm run build:logos
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT  = join(ROOT, 'src/assets/logos');
mkdirSync(OUT, { recursive: true });

/* ── Couleurs lues dans les tokens : un logo ne peut pas lire le CSS de
      la page, ses couleurs sont figées dans le fichier. Les figer depuis
      la palette est le seul moyen qu'elles n'en divergent jamais. ── */
const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
const raw = {};
for (const m of css.matchAll(/(--raw-[\w-]+)\s*:\s*([^;]+);/g)) raw[m[1]] = m[2].trim();
const block = re => {
  const m = css.match(re); const o = {};
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*var\((--raw-[\w-]+)\)/g)) o[d[1].slice(2)] = raw[d[2]];
  return o;
};
const T = {
  dark:  block(/^:root \{([\s\S]*?)\n\}/m),
  light: block(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/),
};

/* ═══════════════════════════════════════════════════════════════════════
   ALPHABET GÉOMÉTRIQUE — hauteur de capitale 100, ligne de base y=100
   Chaque glyphe renvoie { d, w } : le tracé et sa chasse.
   ═══════════════════════════════════════════════════════════════════════ */
const H = 100;
const r2 = (n) => Math.round(n * 100) / 100;
/* Épaisseur horizontale d'une diagonale pour une épaisseur perpendiculaire
   donnée : sans cette correction les obliques paraissent plus fines que
   les fûts verticaux. */
const diagW = (s, dx, dy) => s * Math.hypot(dx, dy) / dy;
const poly = (...pts) => 'M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';
const rect = (x, y, w, h) => `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}Z`;

const GLYPH = {
  N(s, w = 76) {
    const dw = diagW(s * 1.08, w - 2 * s, H);           // diagonale un peu plus épaisse
    return { w, d: rect(0, 0, s, H) + rect(w - s, 0, s, H)
      + poly([s, 0], [s + dw, 0], [w - s, H], [w - s - dw, H]) };
  },
  E(s, w = 60) {
    return { w, d: rect(0, 0, s, H) + rect(0, 0, w, s)
      + rect(0, (H - s * 0.92) / 2, w * 0.84, s * 0.92) + rect(0, H - s, w, s) };
  },
  X(s, w = 72) {
    const dw = diagW(s, w, H);
    return { w, d: poly([0, 0], [dw, 0], [w, H], [w - dw, H])
      + poly([w - dw, 0], [w, 0], [dw, H], [0, H]) };
  },
  A(s, w = 78) {
    const dw = diagW(s, w / 2, H);
    const yb = 68, k = yb / H;
    const li = w / 2 + (dw - w / 2) * k;                // bord interne de la jambe gauche
    return { w, d: poly([w / 2 - dw, 0], [w / 2, 0], [dw, H], [0, H])
      + poly([w / 2, 0], [w / 2 + dw, 0], [w, H], [w - dw, H])
      + rect(li, yb - s * 0.42, w - 2 * li, s * 0.84) };
  },
  /* Le W se trace comme deux V à sommet pointu, pas comme quatre
     parallélogrammes empilés : avec ces derniers les sommets deviennent
     des blocs pleins aussi larges que deux fûts, les contre-formes se
     referment et la lettre se lit « YY ». Le point de rencontre des
     bords internes se calcule, il ne se pose pas à la ligne de base. */
  W(s, w = 118) {
    const V = (a, b, m) => {
      const hwL = diagW(s, Math.abs(m - a), H) / 2;
      const hwR = diagW(s, Math.abs(b - m), H) / 2;
      const t = 1 - (hwL + hwR) / (b - a);       // hauteur du sommet de la contre-forme
      const cx = a + hwL + (m - a) * t, cy = H * t;
      return poly([a - hwL, 0], [a + hwL, 0], [cx, cy], [b - hwR, 0],
                  [b + hwR, 0], [m + hwR, H], [m - hwL, H]);
    };
    const mid = w / 2, m1 = w * 0.295, m2 = w * 0.705;
    return { w, d: V(0, mid, m1) + V(mid, w, m2) };
  },
  B(s, w = 64) {
    const r1 = (H / 2) * 0.98, r2o = (H / 2) * 1.02;    // bol bas très légèrement plus grand
    const x1 = w - r1 * 0.55, x2 = w - r2o * 0.5;
    return { w, d:
      // bol supérieur
      `M0 0H${r2(x1)}A${r2(r1 * 0.55)} ${r2(H / 4)} 0 0 1 ${r2(x1)} ${r2(H / 2)}H0Z`
      + `M${r2(s)} ${r2(s)}V${r2(H / 2 - s / 2)}H${r2(x1 - s * 0.2)}A${r2(r1 * 0.55 - s)} ${r2(H / 4 - s / 2)} 0 0 0 ${r2(x1 - s * 0.2)} ${r2(s)}Z`
      // bol inférieur
      + `M0 ${r2(H / 2)}H${r2(x2)}A${r2(r2o * 0.5)} ${r2(H / 4)} 0 0 1 ${r2(x2)} ${r2(H)}H0Z`
      + `M${r2(s)} ${r2(H / 2 + s / 2)}V${r2(H - s)}H${r2(x2 - s * 0.2)}A${r2(r2o * 0.5 - s)} ${r2(H / 4 - s / 2)} 0 0 0 ${r2(x2 - s * 0.2)} ${r2(H / 2 + s / 2)}Z`
    };
  },
};

/* Compose un mot : renvoie { d, w } avec un interlettrage donné. */
function word(letters, s, tracking = 10, widths = {}) {
  let x = 0, d = '';
  for (const ch of letters) {
    const g = GLYPH[ch](s, widths[ch]);
    d += g.d.replace(/M(-?[\d.]+) (-?[\d.]+)/g, (_, a, b) => `M${r2(+a + x)} ${b}`)
            .replace(/H(-?[\d.]+)/g, (_, a) => `H${r2(+a + x)}`)
            .replace(/L(-?[\d.]+) (-?[\d.]+)/g, (_, a, b) => `L${r2(+a + x)} ${b}`)
            .replace(/A([\d.]+) ([\d.]+) 0 0 ([01]) (-?[\d.]+) (-?[\d.]+)/g,
                     (_, rx, ry, sw, a, b) => `A${rx} ${ry} 0 0 ${sw} ${r2(+a + x)} ${b}`);
    x += g.w + tracking;
  }
  return { d, w: x - tracking };
}

const svg = (vb, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}">\n`
  + `  <title>${title}</title>\n${body}\n</svg>\n`;

const files = [];
const emit = (name, content) => {
  writeFileSync(join(OUT, name + '.svg'), content);
  files.push(`${name}.svg`.padEnd(30) + (content.length / 1024).toFixed(1).padStart(6) + ' Ko');
};

/* ═══════════════════════════════════════════════════════════════════════
   PISTE A — monogramme dans un badge + nom
   Le seul des trois qui fonctionne isolé : il alimente le favicon,
   l'avatar et les icônes PWA.
   ═══════════════════════════════════════════════════════════════════════ */
const S_HEAVY = 18, S_LIGHT = 11;

function markA(bgFill, nFill, side = 140) {
  const r = side * 0.23;                                 // rayon ≈ 23 % du côté
  const g = GLYPH.N(S_HEAVY * 1.12, 76);
  const scale = side * 0.56 / H;
  const tx = (side - g.w * scale) / 2, ty = (side - H * scale) / 2;
  return `  <rect width="${side}" height="${side}" rx="${r2(r)}" fill="${bgFill}"/>\n`
       + `  <g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(scale)})" fill="${nFill}">`
       + `<path d="${g.d}"/></g>`;
}

function conceptA(c, mono) {
  const nexa = word('NEXA', S_HEAVY, 11);
  const web  = word('WEB',  S_HEAVY, 11);
  const side = 140, gap = 46;
  const scale = 1;
  const x0 = side + gap;
  const total = x0 + nexa.w + 22 + web.w;
  const ty = (side - H) / 2;
  const ink  = mono ? c.mono : c.text;
  const gold = mono ? c.mono : c.accent;
  return svg(`0 0 ${r2(total)} ${side}`,
    markA(mono ? 'none' : c.badgeBg, mono ? c.mono : c.badgeInk, side)
    + (mono ? `\n  <rect width="${side}" height="${side}" rx="${r2(side * 0.23)}" fill="none" stroke="${c.mono}" stroke-width="10"/>` : '')
    + `\n  <g transform="translate(${r2(x0)} ${ty})">`
    + `<path d="${nexa.d}" fill="${ink}"/>`
    + `<g transform="translate(${r2(nexa.w + 22)} 0)"><path d="${web.d}" fill="${gold}"/></g>`
    + `</g>`,
    'Nexa Web');
}

/* ═══════════════════════════════════════════════════════════════════════
   PISTE B — logotype seul, typographié
   ═══════════════════════════════════════════════════════════════════════ */
function conceptB(c, mono) {
  /* Une seule ligne, pas un empilement : à 28 px de haut, une version
     empilée ramène le fût fin à 1,2 px et le filet à 1,1 px — sous le
     minimum de 2 px. Sur une ligne, la même construction donne 2,4 px. */
  const nexa = word('NEXA', S_HEAVY, 11);
  const web  = word('WEB',  S_LIGHT, 30);                // graisse fine, très espacée
  const ink  = mono ? c.mono : c.text;
  const gold = mono ? c.mono : c.accent;
  const gapX = 30, ruleH = 10, ruleGap = 16, dot = 10;
  const xWeb = nexa.w + gapX;
  const total = xWeb + web.w + dot * 3.2;
  const h = H + ruleGap + ruleH;
  return svg(`0 0 ${r2(total)} ${r2(h)}`,
    `  <path d="${nexa.d}" fill="${ink}"/>\n`
    + `  <g transform="translate(${r2(xWeb)} 0)">`
    + `<path d="${web.d}" fill="${ink}"/>`
    + `<circle cx="${r2(web.w + dot * 1.7)}" cy="${r2(H - dot)}" r="${r2(dot)}" fill="${gold}"/>`
    + `</g>\n`
    // Filet or sous WEB seulement
    + `  <rect x="${r2(xWeb)}" y="${r2(H + ruleGap)}" width="${r2(web.w)}" height="${ruleH}" fill="${gold}"/>`,
    'Nexa Web');
}

/* ═══════════════════════════════════════════════════════════════════════
   PISTE C — symbole abstrait (trois faces en isométrie) + nom
   ═══════════════════════════════════════════════════════════════════════ */
function symbolC(c, mono, side = 140) {
  const cx = side / 2, w = side * 0.40, hh = side * 0.23, dep = side * 0.30;
  const top = [[cx, side * 0.12], [cx + w, side * 0.12 + hh], [cx, side * 0.12 + hh * 2], [cx - w, side * 0.12 + hh]];
  const left  = [[cx - w, side * 0.12 + hh], [cx, side * 0.12 + hh * 2], [cx, side * 0.12 + hh * 2 + dep], [cx - w, side * 0.12 + hh + dep]];
  const right = [[cx + w, side * 0.12 + hh], [cx, side * 0.12 + hh * 2], [cx, side * 0.12 + hh * 2 + dep], [cx + w, side * 0.12 + hh + dep]];
  const P = pts => pts.map(p => `${r2(p[0])},${r2(p[1])}`).join(' ');
  if (mono) {
    return `  <g fill="none" stroke="${c.mono}" stroke-width="10" stroke-linejoin="round">`
      + `<polygon points="${P(top)}"/><polygon points="${P(left)}"/><polygon points="${P(right)}"/></g>`;
  }
  return `  <polygon points="${P(top)}"   fill="${c.accent}"/>\n`
       + `  <polygon points="${P(left)}"  fill="${c.accentDim}"/>\n`
       + `  <polygon points="${P(right)}" fill="${c.faceDark}"/>`;
}

function conceptC(c, mono) {
  const nexa = word('NEXA', S_HEAVY, 11);
  const web  = word('WEB',  S_HEAVY, 11);
  const side = 140, gap = 40;
  const x0 = side + gap;
  const total = x0 + nexa.w + 22 + web.w;
  const ink  = mono ? c.mono : c.text;
  const gold = mono ? c.mono : c.accent;
  return svg(`0 0 ${r2(total)} ${side}`,
    symbolC(c, mono, side)
    + `\n  <g transform="translate(${r2(x0)} ${r2((side - H) / 2)})">`
    + `<path d="${nexa.d}" fill="${ink}"/>`
    + `<g transform="translate(${r2(nexa.w + 22)} 0)"><path d="${web.d}" fill="${gold}"/></g>`
    + `</g>`,
    'Nexa Web');
}

/* ── Émission : 3 pistes × (clair, sombre, monochrome) ── */
for (const theme of ['dark', 'light']) {
  const t = T[theme];
  const c = {
    text: t.text, accent: t['accent-text'],
    badgeBg: theme === 'dark' ? t.accent : t.text,       // or sur noir / noir sur or
    badgeInk: theme === 'dark' ? t['on-accent'] : t.bg,
    accentDim: theme === 'dark' ? raw['--raw-gold-600'] : raw['--raw-gold-900'],
    // Une face trop proche du fond aplatit le volume : on prend un ton
    // franchement détaché dans les deux thèmes.
    faceDark: theme === 'dark' ? raw['--raw-black-700'] : raw['--raw-black-ink'],
    mono: t.text,
  };
  // En clair le badge est noir sur or : on inverse pour respecter la consigne.
  if (theme === 'light') { c.badgeBg = t.accent; c.badgeInk = t.text; }
  emit(`logo-a-${theme}`, conceptA(c, false));
  emit(`logo-b-${theme}`, conceptB(c, false));
  emit(`logo-c-${theme}`, conceptC(c, false));
}
/* Monochrome — tampon, facture, sérigraphie. Un seul ton, encre pleine. */
{
  const c = { mono: '#000000', text: '#000000', accent: '#000000' };
  emit('logo-a-mono', conceptA(c, true));
  emit('logo-b-mono', conceptB(c, true));
  emit('logo-c-mono', conceptC(c, true));
}
/* Marque seule de la piste A — favicon, avatar, icônes PWA. */
for (const theme of ['dark', 'light']) {
  const t = T[theme];
  const bg = theme === 'dark' ? t.accent : t.accent;
  const ink = theme === 'dark' ? t['on-accent'] : t.text;
  emit(`mark-a-${theme}`, svg('0 0 140 140', markA(bg, ink, 140), 'Nexa Web'));
}

/* ── Contrôle : aucun trait sous 2 px à la taille header (28 px de haut) ── */
const HEADER_PX = 28, MIN_PX = 2;
const checks = [
  ['A — fût',            140, S_HEAVY],
  ['B — fût fin',        126, S_LIGHT],
  ['B — filet or',       126, 10],
  ['C — fût',            140, S_HEAVY],
  ['A/C — contour mono', 140, 10],
];
const thin = [];
for (const [what, vbH, units] of checks) {
  const px = units * (HEADER_PX / vbH);
  const line = `  ${what.padEnd(22)} ${px.toFixed(2)} px`;
  if (px < MIN_PX) thin.push(line + '  ✗ SOUS 2 px');
  else console.log(line + '  ✓');
}
if (thin.length) { console.error('\n✗ Traits trop fins :\n' + thin.join('\n')); process.exit(1); }

console.log('\nLogos générés depuis src/styles/tokens.css :\n');
console.log(files.join('\n'));
