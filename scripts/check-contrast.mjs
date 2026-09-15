#!/usr/bin/env node
/* Vérifie le contraste WCAG de TOUTES les paires texte/fond des deux thèmes.
   Les valeurs sont lues dans src/styles/tokens.css — jamais recopiées ici. */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/* ── Résolution des tokens ── */
const raw = {};
for (const m of css.matchAll(/(--raw-[\w-]+)\s*:\s*([^;]+);/g)) raw[m[1]] = m[2].trim();

function block(re) {
  const m = css.match(re);
  if (!m) throw new Error('bloc de thème introuvable: ' + re);
  const out = {};
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*var\((--raw-[\w-]+)\)/g)) out[d[1]] = raw[d[2]];
  return out;
}
const THEMES = {
  sombre: block(/^:root \{([\s\S]*?)\n\}/m),
  clair:  block(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/),
};
// contrôle: le bloc @media clair doit être identique au bloc [data-theme=light]
const mediaLight = block(/@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\) \{([\s\S]*?)\n  \}/);

/* ── Colorimétrie ── */
const hex2rgb = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
const lum = hex => {
  const [r,g,b] = hex2rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ── Matrice à tester ──
   Chaque token de premier plan × chaque surface sur laquelle il peut atterrir. */
const SURFACES = ['bg', 'surface', 'surface-2'];
const FOREGROUND = {
  'text':        { min: 4.5, note: 'texte principal' },
  'text-muted':  { min: 4.5, note: 'texte secondaire' },
  'text-subtle': { min: 4.5, note: 'texte tertiaire / labels' },
  'accent-text': { min: 4.5, note: 'liens et texte cuivre' },
  'success':     { min: 4.5, note: 'message de succès' },
  'warning':     { min: 4.5, note: 'message d\'alerte' },
  'danger':      { min: 4.5, note: 'message d\'erreur' },
  // WCAG 1.4.11 : 3:1 exigé pour la limite d'un composant d'interface.
  // --field-border borde les champs de formulaire → soumis à la règle.
  'field-border': { min: 3.0, note: 'bordure de champ de formulaire (WCAG 1.4.11)' },
  // --border / --border-strong ne bordent que des éléments décoratifs
  // (filets, séparateurs, cartes) : exemptés par 1.4.11, mais doivent
  // rester perceptibles.
  // --border est dessiné sur --bg et --surface uniquement ; dans une zone
  // --surface-2 (survol, champ) c'est --border-strong qui prend le relais.
  'border':        { min: 1.2, note: 'filet de séparation (décoratif)', on: ['bg', 'surface'] },
  'border-strong': { min: 1.2, note: 'filet accentué (décoratif)' },
  'accent':      { min: 3.0, note: 'fonds/bordures/icônes décoratives' },
  'focus':       { min: 3.0, note: 'anneau de focus (non-texte)' },
};

let fail = 0, rows = [];
for (const [theme, T] of Object.entries(THEMES)) {
  for (const [fg, spec] of Object.entries(FOREGROUND)) {
    for (const s of (spec.on || SURFACES)) {
      const r = ratio(T['--'+fg], T['--'+s]);
      const ok = r >= spec.min;
      if (!ok) fail++;
      rows.push({ theme, paire: `--${fg} / --${s}`, ratio: r.toFixed(2), min: spec.min, ok, note: spec.note });
    }
  }
  // texte posé sur l'accent (bouton CTA principal)
  const r = ratio(T['--on-accent'], T['--accent']);
  if (r < 4.5) fail++;
  rows.push({ theme, paire: '--on-accent / --accent', ratio: r.toFixed(2), min: 4.5, ok: r >= 4.5, note: 'texte sur CTA cuivre' });
}

/* ── Garde-fou : --accent ne doit JAMAIS servir de couleur de texte en clair ── */
const accentAsTextLight = Math.min(...SURFACES.map(s => ratio(THEMES.clair['--accent'], THEMES.clair['--'+s])));
const guard = accentAsTextLight < 4.5;

/* ── Garde-fou : les deux blocs clairs doivent être rigoureusement identiques ── */
const drift = Object.keys(THEMES.clair).filter(k => mediaLight[k] !== THEMES.clair[k])
  .concat(Object.keys(mediaLight).filter(k => !(k in THEMES.clair)));

/* ── Rapport ── */
const w = [8, 30, 7, 5, 4];
const line = c => c.map((v, i) => String(v).padEnd(w[i])).join(' ');
console.log(line(['THÈME', 'PAIRE', 'RATIO', 'MIN', '']));
console.log('─'.repeat(60));
for (const r of rows) console.log(line([r.theme, r.paire, r.ratio + ':1', r.min, r.ok ? 'OK' : '✗ ÉCHEC']) + (r.ok ? '' : '  ← ' + r.note));
console.log('─'.repeat(60));

if (drift.length) { console.error('✗ Les deux blocs de thème clair ont divergé :', drift.join(', ')); fail++; }
else console.log('✓ Les deux blocs de thème clair sont rigoureusement identiques.');

if (guard) console.log(`✓ Garde-fou : --accent en clair plafonne à ${accentAsTextLight.toFixed(2)}:1 — réservé aux fonds/bordures, --accent-text obligatoire pour du texte.`);
else console.log('⚠ --accent passe le AA en clair : le garde-fou --accent-text n\'est plus discriminant.');

console.log(fail ? `\n✗ ${fail} paire(s) en échec.` : `\n✓ ${rows.length} paires validées, aucune en échec.`);
process.exit(fail ? 1 : 0);
