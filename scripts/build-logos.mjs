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

/* ═══════════════════════════════════════════════════════════════════════
   PISTE D — LA TUILE DE VERRE ET L'OR LIQUIDE
   La commande décrivait un rendu 3D posé sur un noir fixe. Un noir fixe
   ne peut pas servir d'en-tête en mode clair : la tuile y ferait un
   carré noir sur le papier. Le dessin est donc refait en vecteur, et
   chaque couleur vient des jetons — ce qui lui donne une version claire
   et une version sombre au lieu d'une seule image.

   Le relief est obtenu par des dégradés et deux filets de lumière, pas
   par un flou : un filter SVG se recalcule à chaque redimensionnement,
   un dégradé non.
   ═══════════════════════════════════════════════════════════════════════ */
/* La diagonale du N EST l'or liquide.
   Deux essais avant celui-ci. Un ruban en S qui traversait la lettre :
   regarde en planche de contact, il se lisait comme une rature et rendait
   le N illisible des 64 px. Puis la meme coulee avec des debords arrondis
   au-dessus et en dessous de la lettre : les bouts ronds faisaient des
   tetes d'allumette.
   Ce qui tient : la coulee occupe EXACTEMENT la diagonale du N, decoupee
   comme elle, donc elle s'emboite dans les futs sans entaille. Le liquide
   se lit au degrade et au reflet, pas a un debord. Une seule goutte,
   detachee, sous le pied droit. */
function couleeN(sEp, w = 76) {
  const dw = diagW(sEp * 1.08, w - 2 * sEp, H);
  return {
    /* Le meme polygone que la diagonale du glyphe : les angles coincident
       au pixel pres avec les futs. */
    diag: poly([sEp, 0], [sEp + dw, 0], [w - sEp, H], [w - sEp - dw, H]),
    /* Le reflet suit l'arete superieure gauche, en retrait. */
    reflet: `M${r2(sEp + dw * 0.3)} ${r2(H * 0.10)}L${r2(w - sEp - dw * 0.7)} ${r2(H * 0.90)}`,
    refletEp: sEp * 0.26,
    goutte: [w - sEp / 2, H + sEp * 0.95],
    goutteR: sEp * 0.30,
  };
}

function markD(c, side = 140, id = 'd') {
  const r = side * 0.22;                                  // squircle iOS
  const k = side / 140;                                   // la grille du ruban
  const sEp = S_HEAVY * 1.05;
  const g = GLYPH.N(sEp, 76);
  const scale = side * 0.60 / H;
  const tx = (side - g.w * scale) / 2, ty = (side - H * scale) / 2;
  /* Les deux fûts seuls : la diagonale est remplacée par la coulée. */
  const stems = rect(0, 0, sEp, H) + rect(76 - sEp, 0, sEp, H);
  const co = couleeN(sEp, 76);

  if (c.monoOnly) {
    return `  <rect x="5" y="5" width="${r2(side - 10)}" height="${r2(side - 10)}" rx="${r2(r)}" `
         + `fill="none" stroke="${c.mono}" stroke-width="10"/>\n`
         + `  <g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(scale)})" fill="${c.mono}">`
         + `<path d="${stems}"/></g>\n`
         + `  <g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(scale)})" fill="${c.mono}">`
         + `<path d="${co.diag}"/>`
         + `<circle cx="${r2(co.goutte[0])}" cy="${r2(co.goutte[1])}" r="${r2(co.goutteR)}"/></g>`;
  }

  return `  <defs>\n`
    + `    <linearGradient id="${id}-verre" x1="0" y1="0" x2="0.35" y2="1">`
    + `<stop offset="0" stop-color="${c.tuileHaut}" stop-opacity="${c.tuileHautA}"/>`
    + `<stop offset="1" stop-color="${c.tuileBas}"/></linearGradient>\n`
    + `    <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="${c.rim}" stop-opacity=".95"/>`
    + `<stop offset=".45" stop-color="${c.rim}" stop-opacity=".25"/>`
    + `<stop offset="1" stop-color="${c.rim}" stop-opacity=".8"/></linearGradient>\n`
    + `    <linearGradient id="${id}-or" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="${c.orClair}"/>`
    + `<stop offset=".45" stop-color="${c.orMoyen}"/>`
    + `<stop offset="1" stop-color="${c.orSombre}"/></linearGradient>\n`
    + `    <clipPath id="${id}-tuile">`
    + `<rect width="${side}" height="${side}" rx="${r2(r)}"/></clipPath>\n`
    + `  </defs>\n`
    // 1. le corps de verre
    + `  <rect width="${side}" height="${side}" rx="${r2(r)}" fill="url(#${id}-verre)"/>\n`
    + `  <g clip-path="url(#${id}-tuile)">\n`
    // 2. le reflet du haut, la poussiere d'or
    + `    <ellipse cx="${r2(side * .5)}" cy="${r2(side * .10)}" rx="${r2(side * .36)}" ry="${r2(side * .11)}" `
    + `fill="${c.eclat}" opacity="${c.eclatA}"/>\n`
    + `    <g fill="${c.orClair}">`
    + [[30,96,1.8,.40],[106,44,1.3,.34],[46,118,1.1,.30],[118,98,1.6,.26],[86,22,1.0,.30],[24,58,1.2,.22]]
        .map(([x,y,rr,o]) => `<circle cx="${r2(x*k)}" cy="${r2(y*k)}" r="${r2(rr*k)}" opacity="${o}"/>`).join('')
    + `</g>\n`
    // 3. les deux futs du N : interieur sombre, aretes dorees
    + `    <g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(scale)})">`
    + `<path d="${stems}" fill="${c.lettreFond}" stroke="${c.lettreArete}" stroke-width="5" stroke-linejoin="round"/>`
    + `</g>\n`
    // 4. la coulee d'or a la place de la diagonale, son reflet, sa goutte
    + `    <g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(scale)})">`
    + `<path d="${co.diag}" fill="url(#${id}-or)"/>`
    + `<path d="${co.reflet}" fill="none" stroke="${c.eclat}" stroke-width="${r2(co.refletEp)}" `
    + `stroke-opacity=".45" stroke-linecap="round" stroke-dasharray="${r2(H * 0.22)} ${r2(H * 0.13)}"/>`
    + `<circle cx="${r2(co.goutte[0])}" cy="${r2(co.goutte[1])}" r="${r2(co.goutteR)}" fill="url(#${id}-or)"/>`
    + `</g>\n`
    + `  </g>\n`
    // 5. le filet de lumiere du bord, pose en dernier
    + `  <rect x="2.25" y="2.25" width="${r2(side - 4.5)}" height="${r2(side - 4.5)}" rx="${r2(r - 2.25)}" `
    + `fill="none" stroke="url(#${id}-rim)" stroke-width="4.5"/>`;
}

function conceptD(c, mono) {
  const nexa = word('NEXA', S_HEAVY, 12);
  const web  = word('WEB',  S_LIGHT, 34);                 // graisse fine, tres espacee
  const side = 140, gap = 44;
  const x0 = side + gap;
  const total = x0 + nexa.w + 26 + web.w;
  const ty = (side - H) / 2;
  const cc = mono ? { ...c, monoOnly: true } : c;
  const encre = mono ? c.mono : c.text;
  return svg(`0 0 ${r2(total)} ${side}`,
    markD(cc, side, mono ? 'dm' : (c.theme === 'light' ? 'dl' : 'dd'))
    + (mono ? '' : `\n  <defs><linearGradient id="${c.theme === 'light' ? 'dl' : 'dd'}-mot" x1="0" y1="0" x2=".3" y2="1">`
        + `<stop offset="0" stop-color="${c.orClair}"/><stop offset="1" stop-color="${c.orSombre}"/></linearGradient></defs>`)
    + `\n  <g transform="translate(${r2(x0)} ${ty})">`
    + `<path d="${nexa.d}" fill="${mono ? c.mono : `url(#${c.theme === 'light' ? 'dl' : 'dd'}-mot)`}"/>`
    + `<g transform="translate(${r2(nexa.w + 26)} 0)"><path d="${web.d}" fill="${encre}"/></g>`
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
    theme,
    /* La tuile de verre : un haut teinte d'or qui se perd dans le fond. */
    tuileHaut:  theme === 'dark' ? raw['--raw-gold-900'] : raw['--raw-gold-300'],
    tuileHautA: theme === 'dark' ? '.55' : '.42',
    tuileBas:   theme === 'dark' ? raw['--raw-black-950'] : raw['--raw-paper-50'],
    rim:        theme === 'dark' ? raw['--raw-gold-400'] : raw['--raw-gold-700'],
    eclat:      raw['--raw-paper-0'],
    eclatA:     theme === 'dark' ? '.13' : '.55',
    orClair:    theme === 'dark' ? raw['--raw-gold-300'] : raw['--raw-gold-600'],
    orMoyen:    theme === 'dark' ? raw['--raw-gold-400'] : raw['--raw-gold-700'],
    orSombre:   theme === 'dark' ? raw['--raw-gold-600'] : raw['--raw-gold-900'],
    lettreFond: theme === 'dark' ? raw['--raw-black-950'] : raw['--raw-paper-50'],
    lettreArete: theme === 'dark' ? raw['--raw-gold-400'] : raw['--raw-gold-800'],
  };
  // En clair le badge est noir sur or : on inverse pour respecter la consigne.
  if (theme === 'light') { c.badgeBg = t.accent; c.badgeInk = t.text; }
  emit(`logo-a-${theme}`, conceptA(c, false));
  emit(`logo-b-${theme}`, conceptB(c, false));
  emit(`logo-c-${theme}`, conceptC(c, false));
  emit(`logo-d-${theme}`, conceptD(c, false));
  emit(`mark-d-${theme}`, svg('0 0 140 140', markD(c, 140, theme === 'light' ? 'mdl' : 'mdd'), 'Nexa Web'));
}
/* Monochrome — tampon, facture, sérigraphie. Un seul ton, encre pleine. */
{
  const c = { mono: '#000000', text: '#000000', accent: '#000000' };
  emit('logo-a-mono', conceptA(c, true));
  emit('logo-b-mono', conceptB(c, true));
  emit('logo-c-mono', conceptC(c, true));
  emit('logo-d-mono', conceptD(c, true));
}
/* Marque seule de la piste A — favicon, avatar, icônes PWA. */
for (const theme of ['dark', 'light']) {
  const t = T[theme];
  const bg = theme === 'dark' ? t.accent : t.accent;
  const ink = theme === 'dark' ? t['on-accent'] : t.text;
  emit(`mark-a-${theme}`, svg('0 0 140 140', markA(bg, ink, 140), 'Nexa Web'));
}

/* ── Contrôle : aucun trait sous 2 px à la taille d'emploi la plus petite.
      A, B et C servent dans l'en-tête, donc 28 px de haut. D est une icône
      d'application : tuile de verre, arête biseautée, ruban d'or liquide —
      trois choses qui demandent de la place. Son plancher est 64 px, la
      taille d'un favicon moderne et d'un avatar. En dessous elle devient
      une bouillie : c'est mesuré ci-dessous, pas supposé. ── */
const MIN_PX = 2;
const checks = [
  ['A — fût',            140, S_HEAVY, 28],
  ['B — fût fin',        126, S_LIGHT, 28],
  ['B — filet or',       126, 10,      28],
  ['C — fût',            140, S_HEAVY, 28],
  ['A/C — contour mono', 140, 10,      28],
  ['D — arête du N',     140, 5,       64],
  ['D — coulée d\'or',   140, 11.3,    64],
  /* Le reflet est un éclat, pas une structure : il a le droit de se fondre
     dans l'or quand la vignette est petite, comme un vrai reflet. Son
     plancher est donc 128 px, la taille de l'icône d'application et de
     l'image de partage, là où il se voit. Le logo reste lisible sans lui. */
  ['D — reflet',         140, 2.95,   128],
  ['D — filet du bord',  140, 4.5,     64],
];
const thin = [];
for (const [what, vbH, units, cible] of checks) {
  const px = units * (cible / vbH);
  const line = `  ${what.padEnd(22)} ${px.toFixed(2)} px à ${cible} px de haut`;
  if (px < MIN_PX) thin.push(line + '  ✗ SOUS 2 px');
  else console.log(line + '  ✓');
}
if (thin.length) { console.error('\n✗ Traits trop fins :\n' + thin.join('\n')); process.exit(1); }

console.log('\nLogos générés depuis src/styles/tokens.css :\n');
console.log(files.join('\n'));
