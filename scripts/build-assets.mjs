#!/usr/bin/env node
/* Génère les assets d'image du site À PARTIR des tokens.
   Favicon, icônes PWA, images Open Graph, textures de section.

   Pourquoi un générateur plutôt que des fichiers écrits à la main :
   un favicon, une image OG ou une icône PWA ne peuvent pas lire les
   variables CSS de la page — leurs couleurs sont forcément figées dans le
   fichier. Les figer ICI, depuis src/styles/tokens.css, est le seul moyen
   qu'elles ne divergent jamais de la palette.

   Usage : npm run build:assets
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const PUB  = join(ROOT, 'public');

/* ── Lecture des tokens ─────────────────────────────────────────────── */
const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
const raw = {};
for (const m of css.matchAll(/(--raw-[\w-]+)\s*:\s*([^;]+);/g)) raw[m[1]] = m[2].trim();

function themeBlock(re) {
  const m = css.match(re);
  const out = {};
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*var\((--raw-[\w-]+)\)/g)) out[d[1].slice(2)] = raw[d[2]];
  return out;
}
const T = {
  dark:  themeBlock(/^:root \{([\s\S]*?)\n\}/m),
  light: themeBlock(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/),
};

const FONT = 'DejaVu Sans, Helvetica, Arial, sans-serif';
const out = [];
const write = (p, buf) => {
  mkdirSync(join(PUB, p, '..'), { recursive: true });
  writeFileSync(join(PUB, p), buf);
  out.push(`${p.padEnd(34)} ${(buf.length / 1024).toFixed(1).padStart(7)} Ko`);
};

/* ═══════════════════════════════════════════════════════════════════════
   1. FAVICON — le monogramme suit le thème du système d'exploitation
      grâce au @media embarqué dans le SVG.
   ═══════════════════════════════════════════════════════════════════════ */
/* ── LE SYMBOLE, SOURCE UNIQUE ───────────────────────────────────────
   Le meme « N » fil de fer que src/components/Logo.astro. Dans la page
   il prend ses couleurs des jetons ; ici il ne peut pas — un favicon
   n'a pas acces au CSS du site — donc les teintes sont passees en
   parametre, et ce fichier est l'un des rares que check:colors
   autorise a en contenir.

   Les coordonnees sont celles du composant, au caractere pres. Si le
   dessin change la-bas, il change ici : c'est le seul endroit ou la
   duplication est inevitable, autant qu'elle soit visible. */
const FACE = [
  'M20 85L20 15','M20 15L34 15','M34 15L66 62','M66 62L66 15','M66 15L80 15',
  'M80 15L80 85','M80 85L66 85','M66 85L34 38','M34 38L34 85','M34 85L20 85',
];
const PROFONDEUR = [
  'M20 15L28 7','M34 15L42 7','M66 15L74 7','M80 15L88 7','M80 85L88 77',
  'M28 7L42 7','M42 7L66 42.25','M74 7L88 7','M88 7L88 77',
];
/* viewBox "10 0 90 95" : le dessin deborde a gauche et en haut du
   carre 100x100 d'origine, on le recadre sur son encombrement reel. */
const symbole = ({ face, depth, trait = 2.2, pad = 0 }) => {
  const x = 10 - pad, y = 0 - pad, w = 90 + pad * 2, h = 95 + pad * 2;
  const g = (liste, couleur) =>
    `<g fill="none" stroke="${couleur}" stroke-width="${trait}" ` +
    `stroke-linecap="round" stroke-linejoin="round">` +
    liste.map(d => `<path d="${d}"/>`).join('') + `</g>`;
  return { viewBox: `${x} ${y} ${w} ${h}`, corps: g(FACE, face) + g(PROFONDEUR, depth) };
};

/* ── Le favicon : fond arrondi sombre + symbole ──
   Le fond reste sombre dans les deux themes. Une icone d'onglet qui
   change de couleur avec le systeme devient invisible sur la moitie
   des barres d'onglets ; celle-ci a toujours son propre fond. */
const FOND_ICONE = T.dark.bg;
/* Le trait grossit et la marge fond quand l'icone rapetisse. Mesure sur
   la premiere version, a trait constant : 5 pixels clairs sur 256 a
   16 px — le N avait disparu, les traits passaient sous le pixel. Et
   sous 24 px on ne garde que la face : deux jeux de traits qui se
   croisent dans seize pixels ne font plus qu'une bouillie. */
const reglage = (cote) =>
  cote <= 16 ? { trait: 9,   marge: 2,  relief: false }
: cote <= 32 ? { trait: 6,   marge: 5,  relief: true  }
: cote <= 64 ? { trait: 4.2, marge: 9,  relief: true  }
:              { trait: 3.4, marge: 12, relief: true  };

const iconeSvg = (cote) => {
  const r = reglage(cote);
  const { viewBox, corps } = symbole({
    face: T.dark.text, depth: r.relief ? T.dark.accent : T.dark.text, trait: r.trait,
  });
  const inner = r.relief ? corps : corps.slice(0, corps.indexOf('</g>') + 4);
  const d = 64 - r.marge * 2;
  const rayon = Math.round(64 * 14 / 64);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Nexa Web">
  <rect width="64" height="64" rx="${rayon}" fill="${FOND_ICONE}"/>
  <svg x="${r.marge}" y="${r.marge}" width="${d}" height="${d}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${inner}</svg>
</svg>
`;
};
const faviconSvg = iconeSvg(180);
write('favicon.svg', Buffer.from(faviconSvg));

/* ── Les deux SVG publics, pour un usage hors du site ──
   logo.svg : le symbole seul, fond transparent, en or et blanc chaud.
   logo-complet.svg : le symbole et le nom, tels qu'ils paraissent. */
{
  const { viewBox, corps } = symbole({ face: T.dark.text, depth: T.dark.accent });
  write('logo.svg', Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="90" height="95" role="img" aria-label="Nexa Web">${corps}</svg>\n`));

  write('logo-complet.svg', Buffer.from(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 95" width="300" height="95" role="img" aria-label="Nexa Web — Agence">
  <svg x="0" y="0" width="90" height="95" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${corps}</svg>
  <text x="108" y="46" font-family="${FONT}" font-weight="700" font-size="26" letter-spacing="7.3" fill="${T.dark.text}">NEXA</text>
  <text x="108" y="66" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="500" font-size="11" letter-spacing="3.5" fill="${T.dark['text-muted']}">WEB · AGENCE</text>
</svg>
`));
}

/* ── Les PNG, rendus depuis le favicon vectoriel ──
   Plus de recadrage ni de serrage : le fil de fer est un dessin, pas
   une photo. Il reste net a 16 px parce qu'il n'a que dix traits, la
   ou le rendu 3D precedent devenait une tache brune qu'il fallait
   rogner de 15 % pour sauver. */
const iconPng = (size) => sharp(Buffer.from(iconeSvg(size)), { density: 384 })
  .resize(size, size)
  .png({ compressionLevel: 9, effort: 10 }).toBuffer();

for (const size of [16, 32, 180, 192, 512]) {
  write(`icons/icon-${size}.png`, await iconPng(size));
}
/* Apple lit ce nom-la en premier quand le <link> manque. */
write('apple-touch-icon.png', await iconPng(180));

/* ── favicon.ico ──
   sharp ne sait pas ecrire d'ICO. Le format accepte un PNG tel quel
   dans son entree : six octets d'en-tete, seize de description, puis
   l'image. On l'assemble a la main plutot que d'ajouter une
   dependance pour vingt-deux octets. */
{
  const png = await iconPng(32);
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(1, 4);
  const ent = Buffer.alloc(16);
  ent[0] = 32; ent[1] = 32; ent[2] = 0; ent[3] = 0;
  ent.writeUInt16LE(1, 4); ent.writeUInt16LE(32, 6);
  ent.writeUInt32LE(png.length, 8); ent.writeUInt32LE(22, 12);
  write('favicon.ico', Buffer.concat([dir, ent, png]));
}

/* ── Manifeste PWA ── */
write('site.webmanifest', Buffer.from(JSON.stringify({
  name: 'Nexa Web', short_name: 'Nexa Web',
  description: 'Agence web premium · Carvin, Hauts-de-France',
  start_url: '/', display: 'standalone',
  background_color: T.dark.bg, theme_color: T.dark.bg,
  icons: [192, 512].map(s => ({ src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png', purpose: 'any' })),
}, null, 2) + '\n'));

/* ═══════════════════════════════════════════════════════════════════════
   2. IMAGES OPEN GRAPH — une par thème
   ═══════════════════════════════════════════════════════════════════════ */
const ogSvg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="halo" cx="82%" cy="14%" r="52%">
      <stop offset="0%"   stop-color="${c.accent}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${c.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="depth" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${c.surface}" stop-opacity="1"/>
      <stop offset="70%"  stop-color="${c.bg}"      stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${c.bg}"/>
  <rect width="1200" height="630" fill="url(#depth)" opacity="0.7"/>
  <rect width="1200" height="630" fill="url(#halo)"/>

  <!-- Le symbole, a la place de la trainee de cuivre : c'est lui que
       l'on doit reconnaitre dans un fil d'actualite. -->
  ${(() => { const k = symbole({ face: c.text, depth: c.accent, trait: 2.4 });
     return `<svg x="760" y="150" width="310" height="327" viewBox="${k.viewBox}" preserveAspectRatio="xMidYMid meet" opacity="0.92">${k.corps}</svg>`; })()}

  <text x="80" y="268" font-family="${FONT}" font-weight="bold" font-size="128" fill="${c.text}" letter-spacing="-3">NEXA</text>
  <text x="80" y="392" font-family="${FONT}" font-weight="bold" font-size="128" fill="${c.accent}" letter-spacing="-3">WEB</text>

  <rect x="80" y="432" width="52" height="4" rx="2" fill="${c.accent}"/>

  <text x="80" y="492" font-family="${FONT}" font-size="26" fill="${c['text-muted']}">Des sites web qui donnent une nouvelle</text>
  <text x="80" y="530" font-family="${FONT}" font-size="26" fill="${c['text-muted']}">dimension à votre marque.</text>

  <text x="80" y="592" font-family="${FONT}" font-weight="bold" font-size="15" fill="${c['accent-text']}" letter-spacing="3">CARVIN · HAUTS-DE-FRANCE · nexaaweb.com</text>
</svg>`;

for (const [name, c] of [['og-image', T.dark], ['og-image-light', T.light]]) {
  const png = await sharp(Buffer.from(ogSvg(c))).png({ compressionLevel: 9, palette: true }).toBuffer();
  write(`${name}.png`, png);
}

/* ═══════════════════════════════════════════════════════════════════════
   3. TEXTURES DE FOND DE SECTION
      Grain fin + profondeur d'encre + une traînée cuivre. Posées à
      opacity ≤ .5, elles remplacent les mesh-gradients violets.
   ═══════════════════════════════════════════════════════════════════════ */
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

async function texture(name, c, variant) {
  const W = 2400, H = 1400;
  // Grain argentique : bruit monochrome doux, pas de pixels isolés criards.
  const noise = Buffer.alloc(W * H);
  let seed = variant === 0 ? 20260915 : 77712345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < noise.length; i++) noise[i] = 118 + ((rnd() + rnd() + rnd()) / 3 - 0.5) * 64;
  const grain = await sharp(noise, { raw: { width: W, height: H, channels: 1 } })
    .blur(0.7).png().toBuffer();

  const angle = variant === 0 ? -24 : 14;
  const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="d" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"  stop-color="${c.surface}"/>
        <stop offset="55%" stop-color="${c.bg}"/>
        <stop offset="100%" stop-color="${c['surface-2']}"/>
      </linearGradient>
      <radialGradient id="s" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${c.accent}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0"/>
      </radialGradient>
      <filter id="b"><feGaussianBlur stdDeviation="90"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#d)"/>
    <g transform="rotate(${angle} ${W * 0.62} ${H * 0.38})" filter="url(#b)">
      <ellipse cx="${W * 0.62}" cy="${H * 0.38}" rx="${W * 0.42}" ry="${H * 0.10}" fill="url(#s)"/>
    </g>
  </svg>`);

  const composed = await sharp(base)
    .composite([{ input: grain, blend: 'soft-light' }])
    .toBuffer();

  for (const [ext, opts] of [['avif', { quality: 46 }], ['webp', { quality: 68 }], ['jpg', { quality: 74, mozjpeg: true }]]) {
    const fn = ext === 'jpg' ? 'jpeg' : ext;
    write(`img/textures/${name}.${ext}`, await sharp(composed)[fn](opts).toBuffer());
  }
  void hex2rgb;
}

/* Une texture par thème : une nappe d'encre posée sur un fond crème
   serait aussi fausse qu'une nappe crème sur de l'encre. */
await texture('texture-1-dark',  T.dark,  0);
await texture('texture-2-dark',  T.dark,  1);
await texture('texture-1-light', T.light, 0);
await texture('texture-2-light', T.light, 1);

console.log('Assets générés depuis src/styles/tokens.css :\n');
console.log(out.join('\n'));
