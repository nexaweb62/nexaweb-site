/* Sitemap genere depuis dist/, apres le build.

   Le fichier etait ecrit a la main dans public/ : trois URLs, aucune garantie
   qu'une page ajoutee y arrive un jour. Il est desormais deduit des pages
   reellement produites, ce qui rend l'oubli impossible.

   Sont exclues : les pages portant `noindex`, la 404, et les maquettes de
   demonstration (deja en Disallow dans robots.txt). */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const ORIGIN = 'https://nexaaweb.com';

/* `lastmod` : date du dernier commit ayant touche le contenu de la page, et non
   la date du build — sinon toutes les pages se declarent modifiees a chaque
   deploiement, et Google cesse rapidement de tenir compte du champ. Les pages
   generees dependent de leur gabarit *et* de leur fichier de contenu : on prend
   la plus recente des deux. */
const SOURCES = {
  'index.html': ['src/pages/index.astro', 'src/config/site.ts'],
  'equipe.html': ['src/pages/equipe.astro', 'src/config/site.ts'],
  'fiche-google-business.html': ['src/pages/fiche-google-business.astro', 'src/config/guide.ts'],
};
const GENEREES = ['src/pages/[metier].astro', 'src/config/metiers.ts'];

const dateGit = (fichier) => {
  try {
    const sortie = execFileSync('git', ['log', '-1', '--format=%cs', '--', fichier], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return sortie || null;
  } catch {
    /* Pas de depot git (build depuis une archive) : on retombera sur le fichier. */
    return null;
  }
};

const derniereModif = (rel, chemin) => {
  const sources = SOURCES[rel] ?? (rel.startsWith('site-internet-') ? GENEREES : [`src/pages/${rel.replace(/\.html$/, '.astro')}`]);
  const dates = sources.map(dateGit).filter(Boolean).sort();
  return dates.at(-1) ?? statSync(chemin).mtime.toISOString().slice(0, 10);
};

/* Frequence et priorite par page. La page d'accueil bouge, les mentions non. */
const PROFILS = [
  { motif: /^index\.html$/, changefreq: 'monthly', priority: '1.0' },
  { motif: /^(mentions-legales|politique-confidentialite)\.html$/, changefreq: 'yearly', priority: '0.3' },
  { motif: /./, changefreq: 'monthly', priority: '0.7' },
];

const pages = [];

const parcourir = (dossier) => {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) parcourir(chemin);
    else if (entree.name.endsWith('.html')) pages.push(chemin);
  }
};
parcourir(dist);

const urls = [];

for (const chemin of pages.sort()) {
  const rel = relative(dist, chemin).split(/[\\/]/).join('/');
  if (rel === '404.html' || rel.startsWith('demo-')) continue;

  const html = readFileSync(chemin, 'utf8');
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;

  const loc = rel === 'index.html' ? `${ORIGIN}/` : `${ORIGIN}/${rel.replace(/\.html$/, '')}`;
  const profil = PROFILS.find((p) => p.motif.test(rel));

  urls.push(
    `  <url>\n` +
      `    <loc>${loc}</loc>\n` +
      `    <lastmod>${derniereModif(rel, chemin)}</lastmod>\n` +
      `    <changefreq>${profil.changefreq}</changefreq>\n` +
      `    <priority>${profil.priority}</priority>\n` +
      `  </url>`,
  );
}

writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);

console.log(`sitemap : ${urls.length} URL(s) — ${pages.length - urls.length} page(s) ecartee(s).`);
