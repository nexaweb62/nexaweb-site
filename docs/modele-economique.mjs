/* Modèle économique Nexa Web — chiffres du document docs/analysis.md.
   Script volontairement lisible et ré-exécutable : `node docs/modele-economique.mjs`.
   Toute hypothèse est nommée en tête pour être discutée et corrigée. */

// ── Hypothèses ─────────────────────────────────────────────────────────────
const H = {
  // Coût horaire chargé d'un associé (rémunération nette visée + cotisations
  // + charges fixes réparties). À confirmer avec un comptable.
  coutHoraire: 45,

  // Tarifs API Anthropic, $/million de tokens (relevés le 2026-08-22).
  api: {
    opus5:   { in: 5, out: 25 },
    sonnet5: { in: 3, out: 15 },   // tarif introductif 2/10 jusqu'au 2026-08-31
    haiku45: { in: 1, out: 5 },
  },
  cacheRead: 0.1,    // lecture de cache : 10 % du prix d'entrée
  cacheWrite: 1.25,  // écriture de cache : 125 % du prix d'entrée
  usdEur: 0.92,

  // Infrastructure récurrente par site (€/mois)
  infraParSiteMois: 1.0,   // Netlify gratuit à ce volume ; domaine ~12 €/an
  churnMensuel: 0.03,      // 3 %/mois — hypothèse prudente, à mesurer
};

// ── Coût API d'une session Claude Code produisant un site ───────────────────
// Modèle : N tours d'assistant, contexte moyen C, dont une part servie par le
// cache. Claude Code met le préfixe en cache, donc l'entrée est très majoritai-
// rement de la lecture de cache, bien moins chère que de l'entrée fraîche.
function coutSession({ tours, contexteMoyen, partCache, sortieParTour, ecritureCache, modele }) {
  const p = H.api[modele];
  const lecture = contexteMoyen * partCache;
  const fraiche = contexteMoyen * (1 - partCache);
  const parTour =
      (lecture       / 1e6) * p.in * H.cacheRead
    + (fraiche       / 1e6) * p.in
    + (ecritureCache / 1e6) * p.in * H.cacheWrite
    + (sortieParTour / 1e6) * p.out;
  return { usd: parTour * tours, eur: parTour * tours * H.usdEur, parTourUsd: parTour };
}

const SESSIONS = {
  'premier site (design system compris)': { tours: 420, contexteMoyen: 85000, partCache: 0.86, sortieParTour: 1800, ecritureCache: 6000 },
  'site client, process rodé':            { tours: 150, contexteMoyen: 60000, partCache: 0.88, sortieParTour: 1400, ecritureCache: 4000 },
  'site client, industrialisé':           { tours:  70, contexteMoyen: 45000, partCache: 0.90, sortieParTour: 1100, ecritureCache: 3000 },
};

// ── Temps de production, en heures ─────────────────────────────────────────
const PHASES = ['Cadrage client','Collecte du contenu','Conception','Développement','Intégration contenu','Responsive','SEO initial','Performance','Tests','Corrections','Déploiement + DNS','Formation client'];
const TEMPS = {
  'Dev expérimenté, sans IA':        [1.5, 2.0, 6.0, 12.0, 3.0, 3.0, 2.5, 1.5, 2.0, 3.0, 1.5, 1.0],
  'Dev expérimenté + Claude Code':   [1.5, 2.0, 2.0,  3.0, 1.5, 1.0, 1.5, 0.5, 1.0, 2.0, 1.0, 1.0],
  'Débutant + Claude Code':          [2.5, 3.0, 5.0,  9.0, 3.0, 3.5, 3.0, 1.5, 3.0, 5.0, 2.5, 1.5],
  'Process industrialisé':           [1.0, 1.5, 0.5,  1.5, 1.0, 0.5, 1.0, 0.3, 0.7, 1.0, 0.5, 0.8],
};

// ── Scénarios ──────────────────────────────────────────────────────────────
const SCENARIOS = {
  Prudent:    { sitesMois: 2, heuresSite: 25, setup:  890, abo:  79, sessionKey: 'site client, process rodé',   modele: 'sonnet5' },
  Réaliste:   { sitesMois: 5, heuresSite: 18, setup: 1190, abo:  99, sessionKey: 'site client, process rodé',   modele: 'sonnet5' },
  Optimisé:   { sitesMois: 9, heuresSite: 10, setup: 1490, abo: 129, sessionKey: 'site client, industrialisé',  modele: 'sonnet5' },
};

// Coût d'acquisition : heures de prospection nécessaires pour décrocher 1 client.
// Hypothèse : 100 contacts → ~3 clients, et ~12 min par contact tout compris.
const CONTACTS_PAR_CLIENT = 33;
const MIN_PAR_CONTACT = 12;
const heuresAcquisitionParClient = (CONTACTS_PAR_CLIENT * MIN_PAR_CONTACT) / 60;

const eur = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
const eur2 = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

console.log('='.repeat(78));
console.log('1. COÛT API PAR SITE');
console.log('='.repeat(78));
for (const [nom, s] of Object.entries(SESSIONS)) {
  const o = coutSession({ ...s, modele: 'opus5' });
  const n = coutSession({ ...s, modele: 'sonnet5' });
  console.log(`${nom.padEnd(38)} Opus 5 : ${('$' + o.usd.toFixed(2)).padStart(8)} (${eur2(o.eur).padStart(9)})   Sonnet 5 : ${('$' + n.usd.toFixed(2)).padStart(7)} (${eur2(n.eur)})`);
}
console.log(`\nAbonnement Claude Max 5× : 100 $/mois ≈ ${eur2(100 * H.usdEur)}/mois.`);
console.log('Seuil de bascule vers l\'abonnement, au coût Sonnet 5 « process rodé » :');
const parSite = coutSession({ ...SESSIONS['site client, process rodé'], modele: 'sonnet5' }).eur;
console.log(`  ${Math.ceil(100 * H.usdEur / parSite)} sites/mois. Au-delà, l'abonnement est moins cher que l'API.`);

console.log('\n' + '='.repeat(78));
console.log('2. TEMPS DE PRODUCTION (heures)');
console.log('='.repeat(78));
console.log('Phase'.padEnd(24) + Object.keys(TEMPS).map(k => k.slice(0, 15).padStart(17)).join(''));
PHASES.forEach((ph, i) => {
  console.log(ph.padEnd(24) + Object.values(TEMPS).map(t => String(t[i]).padStart(17)).join(''));
});
console.log('TOTAL'.padEnd(24) + Object.values(TEMPS).map(t => String(t.reduce((a, b) => a + b, 0).toFixed(1)).padStart(17)).join(''));

console.log('\n' + '='.repeat(78));
console.log('3. SCÉNARIOS — trois personnes, situation au 12e mois');
console.log('='.repeat(78));
console.log(`Acquisition : ${CONTACTS_PAR_CLIENT} contacts pour 1 client, ${MIN_PAR_CONTACT} min/contact → ${heuresAcquisitionParClient.toFixed(1)} h de prospection par client signé.\n`);

for (const [nom, s] of Object.entries(SCENARIOS)) {
  const coutIA = coutSession({ ...SESSIONS[s.sessionKey], modele: s.modele }).eur;
  const coutProd = s.heuresSite * H.coutHoraire;
  const coutAcq = heuresAcquisitionParClient * H.coutHoraire;
  const coutTotalClient = coutProd + coutAcq + coutIA;

  // Parc au 12e mois avec churn
  let parc = 0;
  for (let m = 0; m < 12; m++) parc = parc * (1 - H.churnMensuel) + s.sitesMois;

  const mrr = parc * s.abo;
  const caSetupMois = s.sitesMois * s.setup;
  const caMois = mrr + caSetupMois;

  const coutMois = s.sitesMois * coutTotalClient + parc * H.infraParSiteMois;
  const heuresMois = s.sitesMois * (s.heuresSite + heuresAcquisitionParClient) + parc * 0.25;
  const capacite = 3 * 110; // 3 personnes × 110 h productives/mois

  console.log(`── ${nom} ──`);
  console.log(`  ${s.sitesMois} sites/mois · ${s.heuresSite} h/site · setup ${eur(s.setup)} · abonnement ${eur(s.abo)}/mois`);
  console.log(`  Coût par client : production ${eur(coutProd)} + acquisition ${eur(coutAcq)} + IA ${eur2(coutIA)} = ${eur(coutTotalClient)}`);
  console.log(`  Parc au 12e mois : ${parc.toFixed(0)} clients · MRR ${eur(mrr)}`);
  console.log(`  CA mensuel : ${eur(caMois)}  (dont ${eur(caSetupMois)} de lancements, ${eur(mrr)} de récurrent)`);
  console.log(`  Marge brute : ${eur(caMois - coutMois)}  (${((1 - coutMois / caMois) * 100).toFixed(0)} %)`);
  console.log(`  Charge : ${heuresMois.toFixed(0)} h/mois pour une capacité de ${capacite} h  →  ${heuresMois > capacite ? 'SATURÉ' : (heuresMois / capacite * 100).toFixed(0) + ' % de la capacité'}`);
  console.log(`  Par personne, avant impôts : ${eur((caMois - parc * H.infraParSiteMois - s.sitesMois * coutIA) / 3)}/mois brut de charges`);
  console.log(`  Prospection à soutenir : ${(s.sitesMois * CONTACTS_PAR_CLIENT)} contacts qualifiés par mois, soit ${(s.sitesMois * CONTACTS_PAR_CLIENT / 21).toFixed(0)} par jour ouvré.`);
  console.log('');
}

console.log('='.repeat(78));
console.log('4. VALEUR CLIENT ET SEUILS');
console.log('='.repeat(78));
for (const [nom, s] of Object.entries(SCENARIOS)) {
  const dureeVie = 1 / H.churnMensuel; // mois
  const ltv = s.setup + s.abo * dureeVie;
  const coutIA = coutSession({ ...SESSIONS[s.sessionKey], modele: s.modele }).eur;
  const cac = heuresAcquisitionParClient * H.coutHoraire;
  const coutTotalClient = s.heuresSite * H.coutHoraire + cac + coutIA;
  console.log(`${nom.padEnd(10)} durée de vie ${dureeVie.toFixed(0)} mois · valeur client ${eur(ltv)} · coût ${eur(coutTotalClient)} · ratio ${(ltv / coutTotalClient).toFixed(1)}×`);
  const moisAvantRentabilite = Math.ceil((coutTotalClient - s.setup) / s.abo);
  console.log(`${''.padEnd(10)} ${moisAvantRentabilite <= 0
    ? "les frais de lancement couvrent déjà le coût : rentable dès la mise en ligne."
    : `rentable au bout de ${moisAvantRentabilite} mois d'abonnement.`}`);
}
