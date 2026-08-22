/* Portraits de la page equipe.

   Source : img/membre{1,2,3}.jpg de l'ancien site, toujours sur la branche
   `main`. Les trois cliches viennent de seances differentes — deux fonds
   blancs, un fond bleute — et jureraient cote a cote sur fond noir. Le passage
   en niveaux de gris les met d'accord et les fait tenir dans la charte.

   A relancer si une photo change : node scripts/make-portraits.mjs
   (les sources sont attendues dans /tmp, extraites par `git show main:...`). */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const SOURCES = process.argv[2];
if (!SOURCES) {
  console.error('usage : node scripts/make-portraits.mjs <dossier des membreN.jpg>');
  process.exit(1);
}

/* Recadrages calibres a la main, photo par photo : les trois sources n'ont ni
   le meme format ni la meme distance au sujet, et un recadrage automatique
   coupe le menton de la premiere. Les valeurs ci-dessous alignent les trois
   visages a la meme echelle. */
const CIBLES = [
  { src: 'membre1.jpg', out: 'imad.webp', zone: { left: 0, top: 40, width: 399, height: 560 } },
  { src: 'membre2.jpg', out: 'ahmed.webp', zone: { left: 0, top: 60, width: 567, height: 790 } },
  { src: 'membre3.jpg', out: 'killian.webp', zone: { left: 0, top: 20, width: 574, height: 800 } },
];

for (const { src, out, zone } of CIBLES) {
  const dest = fileURLToPath(new URL(`../public/assets/equipe/${out}`, import.meta.url));
  await sharp(`${SOURCES}/${src}`)
    .extract(zone)
    .resize(480, 672)
    .grayscale()
    .linear(1.06, -8)
    .webp({ quality: 76 })
    .toFile(dest);
  console.log(`  ${out.padEnd(14)} ${Math.round(statSync(dest).size / 1024)} Ko`);
}
