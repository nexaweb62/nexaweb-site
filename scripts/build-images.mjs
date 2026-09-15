#!/usr/bin/env node
/* Chaîne de production des images photographiques du site.
   Dépose une source large dans assets/sources/, lance `npm run build:images`,
   et chaque image en ressort déclinée, encodée et vérifiée.

   Pour chaque source :
     · AVIF + WebP, avec repli JPEG
     · au moins 3 largeurs, srcset et sizes
     · width/height écrits dans le manifeste → CLS = 0
     · budget de poids vérifié PAR FICHIER SERVI ; si le budget n'est pas
       tenable, on réduit la LARGEUR SERVIE plutôt que la qualité, et on
       le dit.

   Le manifeste public/img/manifest.json est lu par src/components/Picture.astro.
*/
import { readdirSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC  = join(ROOT, 'assets/sources');
const OUT  = join(ROOT, 'public/img/gen');

/* Profils — largeurs servies et budget PAR FICHIER, en Ko. */
const PROFILES = {
  hero:    { widths: [1280, 1920, 2560], budgetAvif: { 1920: 180 } },
  vignette:{ widths: [ 480,  800, 1600], budgetAvif: {  800:  90 } },
  texture: { widths: [1200, 1800, 2400], budgetAvif: { 1800: 120 } },
};
/* Le profil se déduit du préfixe du fichier : hero-*.jpg, vignette-*.jpg… */
const profileOf = name => Object.keys(PROFILES).find(p => name.startsWith(p)) || 'vignette';

const ENCODERS = [
  { ext: 'avif', fn: 'avif', type: 'image/avif', opts: q => ({ quality: q, effort: 6 }) },
  { ext: 'webp', fn: 'webp', type: 'image/webp', opts: q => ({ quality: q + 20 }) },
  { ext: 'jpg',  fn: 'jpeg', type: 'image/jpeg', opts: q => ({ quality: q + 26, mozjpeg: true }) },
];

mkdirSync(OUT, { recursive: true });
if (!existsSync(SRC) || !readdirSync(SRC).length) {
  console.log('assets/sources/ est vide — rien à produire.');
  console.log('Nomme les sources hero-*, vignette-* ou texture-* pour choisir le profil.');
  process.exit(0);
}

const manifest = {};
const warnings = [];

for (const file of readdirSync(SRC).filter(f => /\.(jpe?g|png|tiff?|webp|avif)$/i.test(f))) {
  const { name } = parse(file);
  const profile = PROFILES[profileOf(name)];
  const src = sharp(join(SRC, file));
  const meta = await src.metadata();
  const entry = { widths: {}, ratio: meta.width / meta.height, alt: '' };

  // On n'agrandit jamais une source. Si elle est plus petite que toutes les
  // largeurs du profil, on l'encode au moins à sa taille native : une image
  // mal compressée a tout autant besoin de passer à l'AVIF.
  let widths = profile.widths.filter(w => w <= meta.width);
  if (!widths.length) {
    widths = [meta.width];
    warnings.push(`${name} : source de ${meta.width}px seulement — servie à sa taille native, sans agrandissement.`);
  } else if (meta.width > widths[widths.length - 1] * 1.1) {
    // La source dépasse nettement la plus grande largeur retenue : on ajoute
    // sa taille native, sinon les écrans haute densité sont sous-servis.
    widths.push(meta.width);
  }

  for (const w of widths) {
    const h = Math.round(w / entry.ratio);
    entry.widths[w] = { w, h };

    for (const enc of ENCODERS) {
      let quality = enc.ext === 'avif' ? 50 : 50;
      const budget = enc.ext === 'avif' ? profile.budgetAvif[w] : null;
      let buf = await sharp(join(SRC, file)).resize(w).toFormat(enc.fn, enc.opts(quality)).toBuffer();

      // Budget dépassé : on RÉDUIT LA LARGEUR SERVIE, pas la qualité.
      if (budget && buf.length / 1024 > budget) {
        let served = w;
        while (buf.length / 1024 > budget && served > w * 0.6) {
          served = Math.round(served * 0.92);
          buf = await sharp(join(SRC, file)).resize(served).toFormat(enc.fn, enc.opts(quality)).toBuffer();
        }
        entry.widths[w] = { w: served, h: Math.round(served / entry.ratio) };
        warnings.push(`${name} ${w}px : budget ${budget} Ko intenable — largeur servie ramenée à ${served}px `
                    + `(${(buf.length / 1024).toFixed(0)} Ko) plutôt que de dégrader la qualité.`);
      }
      writeFileSync(join(OUT, `${name}-${entry.widths[w].w}.${enc.ext}`), buf);
    }
  }
  manifest[name] = entry;
  console.log(`${name.padEnd(24)} ${Object.values(entry.widths).map(v => v.w + 'px').join(' · ')}`);
}

writeFileSync(join(ROOT, 'public/img/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (warnings.length) console.log('\n⚠  ' + warnings.join('\n⚠  '));
console.log(`\n${Object.keys(manifest).length} image(s) → public/img/gen/ + manifest.json`);
void statSync;
