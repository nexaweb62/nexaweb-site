/* Garde-fou avant mise en production. Deux choses ne doivent jamais partir en
   ligne a moitie remplies :
   - les montants, parce que l'offre affiche les prix en clair et qu'un
     placeholder serait pire que pas de page du tout ;
   - les mentions legales obligatoires (LCEN art. 6 III), parce qu'un site
     professionnel sans SIRET ni adresse de siege est en infraction.
   Dans les deux cas les valeurs sont inventables par personne d'autre que
   l'editeur : le build echoue plutot que de publier une approximation. */

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

/* Mentions legales obligatoires (LCEN art. 6 III). Meme principe que pour les
   montants : le site ne doit pas partir en ligne avec « SIRET a renseigner »
   affiche. La TVA n'y figure pas — null y est un cas legitime (franchise en
   base), la page affiche alors la mention de l'article 293 B. */
const legal = config.match(/export const LEGAL[^=]*=\s*\{([\s\S]*?)\n\};/);

if (!legal) {
  problems.push("impossible de lire l'objet LEGAL dans src/config/site.ts");
} else {
  /* Un texte d'attente — « SIRET A RENSEIGNER », « SAS — A REMPLACER » — passe
     le controle du null tout en etant exactement ce qu'il fallait empecher de
     publier. Il vaut meme pire : la page affiche alors une mention legale
     apparemment remplie, et personne ne la relit. */
  const ATTENTE = /renseigner|remplacer|a completer|à compléter|todo|xxx|lorem|votre siret|exemple/i;

  for (const key of ['forme', 'siret', 'adresse', 'directeur']) {
    const m = legal[1].match(new RegExp(`\\b${key}\\s*:\\s*([^,\\n]+)`));
    const value = m ? m[1].trim().replace(/,$/, '') : null;
    if (value === null) problems.push(`LEGAL.${key} est absent de src/config/site.ts`);
    else if (value === 'null') problems.push(`LEGAL.${key} vaut null — mention legale obligatoire`);
    else if (ATTENTE.test(value)) {
      problems.push(`LEGAL.${key} contient un texte d'attente (${value}) — a remplacer par la vraie valeur`);
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

/* La feuille de style est desormais posee dans le HTML (astro.config.mjs) et
   contient la regle `.price-todo` : chercher le mot dans la page entiere le
   trouvait toujours, et bloquait une mise en production parfaitement valide.
   On ne regarde donc que le corps de la page, style retire. */
const corps = html.replace(/<style[\s\S]*?<\/style>/g, '');

if (/class="[^"]*\bprice-todo\b/.test(corps)) {
  problems.push('dist/index.html contient encore un placeholder de prix (.price-todo)');
}

const mentions = (() => {
  try {
    return readFileSync(new URL('../dist/mentions-legales.html', import.meta.url), 'utf8');
  } catch {
    return '';
  }
})();

if (/class="legal-todo"/.test(mentions)) {
  problems.push('dist/mentions-legales.html affiche encore une mention obligatoire non renseignee');
}

/* Meme filet, mais sur la page produite : il attrape un texte d'attente arrive
   par un autre chemin que l'objet LEGAL. */
const attenteVisible = mentions.match(/[^<>]*(?:À RENSEIGNER|A RENSEIGNER|À REMPLACER|A REMPLACER)[^<>]*/i);
if (attenteVisible) {
  problems.push(`dist/mentions-legales.html affiche « ${attenteVisible[0].trim()} » aux visiteurs`);
}

if (problems.length === 0) {
  console.log('check-build : rien a signaler.');
  process.exit(0);
}

const label = isProd ? 'ERREUR' : 'AVERTISSEMENT';
console.log(`\n${label} — le site n'est pas pret pour la production :`);
problems.forEach((p) => console.log(`  · ${p}`));

if (isProd) {
  console.log('\nDeploiement interrompu. Completez les points ci-dessus, puis relancez.\n');
  process.exit(1);
}
console.log('\n(Contexte non-production : le build continue.)\n');
