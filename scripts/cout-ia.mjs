/* Cout reel de Claude Code sur ce projet, lu dans les transcripts locaux.

   Claude Code enregistre la consommation de chaque echange dans
   ~/.claude/projects/<projet>/*.jsonl. Ce script les additionne et applique les
   tarifs publics. Aucun appel reseau, aucune cle : c'est de la lecture de
   fichiers.

   `npm run cout`

   A relancer avant toute discussion de tarif ou de devis : le chiffre du jour
   vaut mieux qu'un chiffre recopie d'un document. Les valeurs citees dans
   docs/analysis.md § 1.1.0 sont une photographie datee, pas une constante. */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/* Tarifs API Anthropic, $/million de tokens — releves le 22/08/2026.
   cacheW : ecriture de cache, 125 % de l'entree. cacheR : lecture, 10 %. */
const TARIFS = {
  opus: { in: 5, out: 25, cacheW: 6.25, cacheR: 0.5 },
  sonnet: { in: 3, out: 15, cacheW: 3.75, cacheR: 0.3 },
  haiku: { in: 1, out: 5, cacheW: 1.25, cacheR: 0.1 },
};
const USD_EUR = 0.92;

const famille = (m = '') => (m.includes('opus') ? 'opus' : m.includes('haiku') ? 'haiku' : 'sonnet');

/* Claude Code remplace les separateurs de chemin par des tirets. */
const dossier =
  process.argv[2] ??
  join(homedir(), '.claude', 'projects', process.cwd().replace(/\//g, '-'));

if (!existsSync(dossier)) {
  console.error(`Aucun transcript dans ${dossier}`);
  console.error('Usage : node scripts/cout-ia.mjs [dossier de transcripts]');
  process.exit(1);
}

const total = {};
const parSession = [];

for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.jsonl'))) {
  const session = {};
  for (const ligne of readFileSync(join(dossier, fichier), 'utf8').split('\n')) {
    if (!ligne.trim()) continue;
    let evenement;
    try {
      evenement = JSON.parse(ligne);
    } catch {
      continue;
    }
    const u = evenement?.message?.usage;
    if (!u) continue;

    const cle = famille(evenement?.message?.model);
    session[cle] ??= { in: 0, out: 0, cw: 0, cr: 0, tours: 0 };
    session[cle].in += u.input_tokens ?? 0;
    session[cle].out += u.output_tokens ?? 0;
    session[cle].cw += u.cache_creation_input_tokens ?? 0;
    session[cle].cr += u.cache_read_input_tokens ?? 0;
    session[cle].tours += 1;
  }

  for (const [cle, v] of Object.entries(session)) {
    total[cle] ??= { in: 0, out: 0, cw: 0, cr: 0, tours: 0 };
    for (const champ of ['in', 'out', 'cw', 'cr', 'tours']) total[cle][champ] += v[champ];
  }

  const cout = Object.entries(session).reduce(
    (s, [cle, v]) =>
      s + (v.in * TARIFS[cle].in + v.out * TARIFS[cle].out + v.cw * TARIFS[cle].cacheW + v.cr * TARIFS[cle].cacheR) / 1e6,
    0,
  );
  const tours = Object.values(session).reduce((s, v) => s + v.tours, 0);
  if (tours) parSession.push({ nom: fichier.slice(0, 8), tours, cout });
}

console.log('Sessions');
for (const s of parSession.sort((a, b) => b.cout - a.cout)) {
  console.log(`  ${s.nom}  ${String(s.tours).padStart(5)} tours  ${('$' + s.cout.toFixed(2)).padStart(9)}`);
}

console.log('\nPar modele');
let grand = 0;
let tousTours = 0;
for (const [cle, v] of Object.entries(total)) {
  const cout = (v.in * TARIFS[cle].in + v.out * TARIFS[cle].out + v.cw * TARIFS[cle].cacheW + v.cr * TARIFS[cle].cacheR) / 1e6;
  const entree = v.in + v.cw + v.cr;
  if (!entree && !v.out) continue;
  grand += cout;
  tousTours += v.tours;
  console.log(
    `  ${cle.padEnd(7)} ${String(v.tours).padStart(5)} tours · entree ${(entree / 1e6).toFixed(1)} M ` +
      `(${((100 * v.cr) / entree).toFixed(1)} % lus en cache) · sortie ${(v.out / 1e3).toFixed(0)} K · $${cout.toFixed(2)}`,
  );
}

/* Ce que la meme conversation aurait coute sans cache : toute l'entree au plein
   tarif. C'est le chiffre qui justifie de rester dans une session longue. */
const sansCache = Object.entries(total).reduce(
  (s, [cle, v]) => s + ((v.in + v.cw + v.cr) * TARIFS[cle].in + v.out * TARIFS[cle].out) / 1e6,
  0,
);

console.log(`\nTOTAL       $${grand.toFixed(2)}  ≈ ${(grand * USD_EUR).toFixed(0)} €`);
console.log(`Par tour    $${(grand / tousTours).toFixed(3)}`);
console.log(`Sans cache  $${sansCache.toFixed(2)} — le cache divise la facture par ${(sansCache / grand).toFixed(1)}.`);
