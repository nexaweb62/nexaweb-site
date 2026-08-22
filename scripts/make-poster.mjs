/* Affiche du premier ecran, re-encodee.

   L'affiche est le plus gros fichier telecharge sur mobile — la video, elle,
   n'est jamais chargee sous 720 px. A 1920 px de large elle pesait 95 Ko pour
   un fond flou derriere du texte : 1600 px et une qualite de 72 donnent le meme
   rendu a l'oeil pour 54 Ko, soit 43 % du premier ecran mobile en moins.

   La source d'origine reste la video : node scripts/make-poster.mjs <fichier>
   (par defaut, l'affiche actuelle est re-encodee sur place). */

import sharp from 'sharp';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dest = fileURLToPath(new URL('../public/assets/hero-poster.webp', import.meta.url));
const src = process.argv[2] ?? dest;

const image = await sharp(src).resize(1600).webp({ quality: 72, effort: 6 }).toBuffer();
await sharp(image).toFile(dest);

console.log(`hero-poster.webp — ${Math.round(statSync(dest).size / 1024)} Ko`);
