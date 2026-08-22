/* Garde-fou avant mise en production.
   Empeche de publier la page tarifs avec des montants non renseignes :
   l'offre affiche les prix en clair, un placeholder en ligne serait pire
   que pas de page du tout. */

import { readFileSync } from 'node:fs';

const isProd = process.env.CONTEXT === 'production';
const problems = [];

const config = readFileSync(new URL('../src/config/site.ts', import.meta.url), 'utf8');

/* On lit l'objet littereal PRICING, pas l'annotation de type qui le precede :
   sans cette delimitation, la regex capture `number | null` et ne detecte rien. */
const literal = config.match(/export const PRICING[^=]*=\s*\{([\s\S]*?)\n\};/);

if (!literal) {
  problems.push("impossible de lire l'objet PRICING dans src/config/site.ts");
} else {
  for (const key of ['setup', 'monthly']) {
    const m = literal[1].match(new RegExp(`\\b${key}\\s*:\\s*([^,\\n]+)`));
    const value = m ? m[1].trim().replace(/,$/, '') : null;
    if (value === null) {
      problems.push(`PRICING.${key} est absent de src/config/site.ts`);
    } else if (value === 'null') {
      problems.push(`PRICING.${key} vaut null — montant a renseigner dans src/config/site.ts`);
    }
  }
}

const html = (() => {
  try {
    return readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  } catch {
    return '';
  }
})();

if (html.includes('price-todo')) {
  problems.push('dist/index.html contient encore un placeholder de prix (.price-todo)');
}

if (problems.length === 0) {
  console.log('check-build : rien a signaler.');
  process.exit(0);
}

const label = isProd ? 'ERREUR' : 'AVERTISSEMENT';
console.log(`\n${label} — le site n'est pas pret pour la production :`);
problems.forEach((p) => console.log(`  · ${p}`));

if (isProd) {
  console.log('\nDeploiement interrompu. Renseignez les montants, puis relancez.\n');
  process.exit(1);
}
console.log('\n(Contexte non-production : le build continue.)\n');
