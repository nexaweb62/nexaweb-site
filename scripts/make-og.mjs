/* Image de partage : 1200 x 630, JPEG.
   Generee une fois depuis l'affiche du hero (1920 x 1080), recadree au format
   attendu par les reseaux et assombrie pour rester dans la charte du site.
   A relancer si l'affiche change : node scripts/make-og.mjs */

import sharp from 'sharp';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../public/assets/hero-poster.webp', import.meta.url));
const out = fileURLToPath(new URL('../public/assets/og.jpg', import.meta.url));

const voile = Buffer.from(
  `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
     <rect width="1200" height="630" fill="#000" opacity="0.28"/>
   </svg>`,
);

await sharp(src)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .composite([{ input: voile, blend: 'over' }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out);

console.log(`public/assets/og.jpg ecrit — ${Math.round(statSync(out).size / 1024)} Ko`);
