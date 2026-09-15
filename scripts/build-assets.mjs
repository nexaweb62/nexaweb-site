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
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Nexa Web">
  <style>
    .bg { fill: ${T.dark.bg} }
    .mk { fill: ${T.dark.accent} }
    @media (prefers-color-scheme: light) {
      .bg { fill: ${T.light.bg} }
      .mk { fill: ${T.light.accent} }
    }
  </style>
  <rect class="bg" width="64" height="64" rx="14"/>
  <path class="mk" d="M16 47V17h6.4l14.6 19.1V17H43v30h-6.4L22 27.9V47z"/>
  <rect class="mk" x="16" y="51.5" width="27" height="3" rx="1.5"/>
</svg>
`;
write('favicon.svg', Buffer.from(favicon));

/* ── Icônes PWA : le SVG a un @media, un PNG non. On rastérise la
      variante sombre, qui est l'identité de la marque. ── */
const iconPng = (size) => sharp(Buffer.from(
  favicon.replace(/<style>[\s\S]*?<\/style>/, '')
         .replace(/class="bg"/, `fill="${T.dark.bg}"`)
         .replace(/class="mk"/g, `fill="${T.dark.accent}"`)
), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

for (const size of [16, 32, 180, 192, 512]) {
  write(`icons/icon-${size}.png`, await iconPng(size));
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

  <!-- La traînée de cuivre, en écho au hero -->
  <g transform="rotate(-28 980 300)" opacity="0.5">
    <rect x="700" y="292" width="760" height="7" rx="3.5" fill="${c.accent}"/>
    <rect x="700" y="330" width="420" height="3" rx="1.5" fill="${c.accent}" opacity="0.55"/>
  </g>

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
