#!/usr/bin/env node
/* GARDE-FOU : LE FORMULAIRE DE DEVIS NE LAISSE PLUS PASSER N'IMPORTE QUOI.
   Usage : npm run check:devis
   Prerequis pour la seconde moitie : le Worker local sur BASE_DEVIS
   (defaut http://127.0.0.1:8796), lance comme pour check:admin.

   ── CE QU'IL FALSIFIE ──────────────────────────────────────────────
   Verifier qu'une demande LEGITIME passe ne prouve rien : un formulaire
   sans aucun controle passerait ce test. Ce qui compte est l'inverse —
   qu'une demande illegitime soit arretee, et arretee de la bonne facon.
   Chaque protection est donc eprouvee par un cas qui doit echouer.

   ── DEUX MOITIES, POUR UNE RAISON ──────────────────────────────────
   A. Sans reseau : la logique pure et celle des appels exterieurs,
      rejouee a partir de reponses fabriquees. C'est la seule facon
      d'eprouver un etablissement ferme, un domaine sans MX ou une API
      en panne — on ne peut pas provoquer cela a la demande.
   B. Dans workerd : le parcours reel de la route, pour les controles
      qui n'appellent personne.

   ── CE QUI N'EST PAS COUVERT, ET POURQUOI ──────────────────────────
   Le proxy de cet environnement refuse recherche-entreprises.api.gouv.fr,
   cloudflare-dns.com et challenges.cloudflare.com (403, politique
   d'organisation). La FORME reelle de leurs reponses n'est donc pas
   verifiee ici — seulement ce qu'on en fait. C'est dit, plutot que
   masque derriere un test qui en donnerait l'illusion. */

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_DEVIS || 'http://127.0.0.1:8796';
const TMP = mkdtempSync(join(tmpdir(), 'nw-devis-'));

const compile = (src, nom) => {
  const out = `${TMP}/${nom}.mjs`;
  execFileSync('npx', ['esbuild', src, '--format=esm', '--target=es2022',
    '--bundle', '--external:./palette-courriel', `--outfile=${out}`,
    '--log-level=warning'], { stdio: 'inherit' });
  return out;
};

const V = await import(compile('src/lib/devis/validation.ts', 'validation'));
const R = await import(compile('src/lib/devis/reseau.ts', 'reseau'));
const J = await import(compile('src/lib/devis/jeton.ts', 'jeton'));

const echecs = [];
let n = 0;
function verifie(nom, reel, attendu) {
  n++;
  const a = JSON.stringify(reel), b = JSON.stringify(attendu);
  if (a === b) { console.log(`  ok   ${nom}`); return; }
  echecs.push(nom);
  console.log(`  ÉCHEC ${nom}\n         obtenu ${a} · attendu ${b}`);
}

/* ══ A. SANS RESEAU ═══════════════════════════════════════════════ */

console.log('\n── Téléphone français ──');
for (const [t, att] of [
  ['06 12 34 56 78', true], ['0612345678', true], ['+33 6 12 34 56 78', true],
  ['0033612345678', true], ['06.12.34.56.78', true], ['01 23 45 67 89', true],
  ['09 70 00 00 00', true], ['07 54 54 07 66', true],
  ['08 99 00 00 00', false],   // numéro à valeur ajoutée
  ['00 12 34 56 78', false], ['061234567', false], ['06123456789', false],
  ['+44 20 7946 0000', false], ['abcdefghij', false], ['', false],
]) verifie(`« ${t || '(vide)'} »`, V.telValide(t), att);

console.log('\n── SIRET ──');
verifie('SIRET valide connu', V.siretValide('73282932000074'), true);
verifie('un chiffre modifié', V.siretValide('73282932000075'), false);
verifie('13 chiffres', V.siretValide('7328293200007'), false);
verifie('lettres', V.siretValide('7328293200007A'), false);
verifie('espaces tolérés', V.siretValide('732 829 320 00074'), true);
/* La Poste : somme des chiffres multiple de cinq, pas la clé de Luhn.
   Sans ce cas particulier, on refuserait un client parfaitement réel. */
verifie('La Poste (règle propre)', V.siretValide('35600000000001'), true);
verifie('La Poste, somme fausse', V.siretValide('35600000000002'), false);

console.log('\n── Formules exigeant un SIRET ──');
for (const [f, att] of [
  ['entreprise', true], ['Entreprise', true], ['ENTREPRISE', true],
  ['entreprise-pro', true], ['business', true],
  ['vitrine', false], ['refonte', false], ['', false],
]) verifie(`formule « ${f || '(vide)'} »`, V.siretRequis(f), att);

console.log('\n── Adresses jetables ──');
for (const [e, att] of [
  ['jean@yopmail.com', true], ['x@mailinator.com', true],
  ['x@sous.mailinator.com', true], ['a@temp-mail.org', true],
  ['jean@gmail.com', false], ['contact@orvanes.tech', false],
]) verifie(`« ${e} »`, V.domaineJetable(e), att);

console.log('\n── Liste noire (silencieuse) ──');
{
  const L = V.lireListeNoire('general@orvanes.tech, orvanes.tech, 0754540766');
  verifie('e-mail exact', V.estSurListeNoire({ email: 'general@orvanes.tech' }, L), true);
  verifie('  casse ignorée', V.estSurListeNoire({ email: 'General@Orvanes.Tech' }, L), true);
  verifie('domaine entier', V.estSurListeNoire({ email: 'autre@orvanes.tech' }, L), true);
  verifie('  sous-domaine', V.estSurListeNoire({ email: 'x@mail.orvanes.tech' }, L), true);
  verifie('téléphone', V.estSurListeNoire({ telephone: '07 54 54 07 66' }, L), true);
  verifie('  autre écriture', V.estSurListeNoire({ telephone: '+33754540766' }, L), true);
  verifie('demande légitime', V.estSurListeNoire({ email: 'jean@gmail.com', telephone: '0612345678' }, L), false);
  /* Un domaine proche ne doit pas être pris pour le domaine bloqué. */
  verifie('domaine voisin non bloqué', V.estSurListeNoire({ email: 'x@orvanes.tech.fr' }, L), false);
  verifie('liste vide ne bloque rien', V.estSurListeNoire({ email: 'x@y.fr' }, V.lireListeNoire('')), false);
}

console.log('\n── Annuaire des entreprises (réponses rejouées) ──');
{
  const rep = (corps, ok = true) => async () => ({
    ok, status: ok ? 200 : 503, json: async () => corps,
  });
  const active = {
    results: [{
      nom_complet: 'BOULANGERIE LEFEVRE', libelle_activite_principale: 'Boulangerie et boulangerie-pâtisserie',
      etat_administratif: 'A',
      matching_etablissements: [{ siret: '73282932000074', etat_administratif: 'A', libelle_commune: 'CARVIN' }],
    }],
  };
  let r = await R.chercherSiret('73282932000074', rep(active));
  verifie('entreprise active → trouvée', r.etat, 'trouve');
  verifie('  nom officiel remonté', r.entreprise?.nom, 'BOULANGERIE LEFEVRE');
  verifie('  activité remontée', r.entreprise?.activite, 'Boulangerie et boulangerie-pâtisserie');
  verifie('  commune remontée', r.entreprise?.commune, 'CARVIN');

  const ferme = JSON.parse(JSON.stringify(active));
  ferme.results[0].matching_etablissements[0].etat_administratif = 'C';
  verifie('établissement fermé → refus',
    (await R.chercherSiret('73282932000074', rep(ferme))).etat, 'ferme');

  /* L'unité légale peut être active alors que CET établissement est
     fermé : c'est l'établissement interrogé qui décide. */
  const uniteActiveEtabFerme = JSON.parse(JSON.stringify(active));
  uniteActiveEtabFerme.results[0].etat_administratif = 'A';
  uniteActiveEtabFerme.results[0].matching_etablissements[0].etat_administratif = 'C';
  verifie('unité active mais établissement fermé → refus',
    (await R.chercherSiret('73282932000074', rep(uniteActiveEtabFerme))).etat, 'ferme');

  verifie('aucun résultat → inconnu',
    (await R.chercherSiret('73282932000074', rep({ results: [] }))).etat, 'inconnu');

  /* Correspondance approximative : l'API rend une entreprise dont aucun
     établissement ne porte ce SIRET. Ce n'est pas une identification. */
  const autre = JSON.parse(JSON.stringify(active));
  autre.results[0].matching_etablissements[0].siret = '99999999900011';
  verifie('SIRET absent des établissements → inconnu',
    (await R.chercherSiret('73282932000074', rep(autre))).etat, 'inconnu');

  verifie('API en panne → indisponible, pas refus',
    (await R.chercherSiret('73282932000074', rep({}, false))).etat, 'indisponible');
  verifie('API injoignable → indisponible',
    (await R.chercherSiret('73282932000074', async () => { throw new Error('réseau'); })).etat,
    'indisponible');
}

console.log('\n── Le domaine reçoit-il du courrier ? (DNS rejoué) ──');
{
  const dns = corps => async () => ({ ok: true, status: 200, json: async () => corps });
  verifie('MX présent → oui',
    await R.domaineRecoitDuCourrier('gmail.com',
      dns({ Status: 0, Answer: [{ type: 15, data: '10 gmail-smtp-in.l.google.com.' }] })), 'oui');
  verifie('domaine inexistant (NXDOMAIN) → non',
    await R.domaineRecoitDuCourrier('nexistepas.invalid', dns({ Status: 3 })), 'non');
  /* RFC 5321 §5.1 : sans MX, l'adresse A reçoit le courrier. De petits
     domaines professionnels sont dans ce cas ; les refuser coûterait de
     vrais clients. */
  {
    let appel = 0;
    const f = async () => {
      appel++;
      return { ok: true, status: 200, json: async () => (appel === 1
        ? { Status: 0, Answer: [] }
        : { Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }] }) };
    };
    verifie('pas de MX mais une adresse A → oui',
      await R.domaineRecoitDuCourrier('petit-domaine.fr', f), 'oui');
  }
  verifie('ni MX ni A → non',
    await R.domaineRecoitDuCourrier('vide.fr', dns({ Status: 0, Answer: [] })), 'non');
  verifie('DNS en panne → indisponible, pas refus',
    await R.domaineRecoitDuCourrier('x.fr', async () => { throw new Error('dns'); }), 'indisponible');
}

console.log('\n── Turnstile ──');
{
  const ok = async () => ({ ok: true, json: async () => ({ success: true }) });
  const ko = async () => ({ ok: true, json: async () => ({ success: false }) });
  verifie('jeton accepté', await R.turnstileValide('jeton', 'secret', undefined, ok), true);
  verifie('jeton refusé', await R.turnstileValide('jeton', 'secret', undefined, ko), false);
  verifie('aucun jeton → refus', await R.turnstileValide('', 'secret', undefined, ok), false);
  /* Une panne REFUSE, contrairement aux deux contrôles précédents : le
     jeton est la seule chose qu'un robot ne sait pas produire. */
  verifie('panne → refus (et non laisser-passer)',
    await R.turnstileValide('jeton', 'secret', undefined,
      async () => { throw new Error('panne'); }), false);
}

console.log('\n── Le jeton de confirmation ──');
{
  const SECRET = 'secret-de-test-local';
  const base = {
    prenom: 'Jean', nom: 'Dupont', email: 'jean@exemple.fr', telephone: '0612345678',
    entreprise: 'Ma Boulangerie', siret: '73282932000074', formule: 'entreprise',
    type_site: 'vitrine', delai_souhaite: '1 mois', budget_estime: '1000',
    paiement: 'comptant', description: 'Un projet de site vitrine complet.',
    site_existant: '', ent_nom: 'BOULANGERIE LEFEVRE', ent_activite: 'Boulangerie',
    ent_commune: 'CARVIN',
  };
  const jeton = await J.fabriquerJeton(base, SECRET);
  const lu = await J.lireJeton(jeton, SECRET);
  verifie('aller-retour : état', lu.etat, 'ok');
  verifie('  e-mail conservé', lu.demande?.email, 'jean@exemple.fr');
  verifie('  nom officiel conservé', lu.demande?.ent_nom, 'BOULANGERIE LEFEVRE');

  verifie('autre clé → invalide', (await J.lireJeton(jeton, 'autre-secret')).etat, 'invalide');
  verifie('jeton tronqué → invalide', (await J.lireJeton(jeton.slice(0, -6), SECRET)).etat, 'invalide');
  /* AES-GCM authentifie : un octet modifié est rejeté, pas seulement
     illisible. C'est ce qui empêche de bricoler l'adresse de destination. */
  const abime = jeton.slice(0, 40) + (jeton[40] === 'A' ? 'B' : 'A') + jeton.slice(41);
  verifie('un octet modifié → invalide', (await J.lireJeton(abime, SECRET)).etat, 'invalide');
  verifie('vide → invalide', (await J.lireJeton('', SECRET)).etat, 'invalide');

  /* Le jeton ne doit pas livrer son contenu à qui le lit sans la clé :
     il transite par des serveurs de messagerie et des journaux. */
  const clair = Buffer.from(jeton.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1');
  verifie('contenu illisible sans la clé', /jean@exemple\.fr|Dupont/.test(clair), false);

  const expire = await J.fabriquerJeton(base, SECRET);
  verifie('durée annoncée : 24 h', J.DUREE_JETON, 86400);
  void expire;
}

/* ══ B. DANS workerd ══════════════════════════════════════════════ */

console.log('\n── La route /api/devis/envoyer ──');
const joignable = await fetch(BASE + '/', { redirect: 'manual' })
  .then(r => r.status < 500).catch(() => false);

if (!joignable) {
  console.log(`  (ignoré : aucun Worker sur ${BASE} — lancez wrangler dev)`);
} else {
  const demande = (sur = {}) => ({
    prenom: 'Jean', nom: 'Dupont', email: 'jean@exemple-reel.fr',
    telephone: '0612345678', entreprise: 'Ma Boulangerie', siret: '',
    formule: 'vitrine', type_site: 'vitrine', delai_souhaite: '1 mois',
    budget_estime: '1000', paiement: 'comptant',
    description: 'Je souhaite un site vitrine pour ma boulangerie à Carvin.',
    site_existant: '', rgpd: true, website_url: '', turnstile: 'x', ...sur,
  });

  const poste = async (corps) => {
    const r = await fetch(BASE + '/api/devis/envoyer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify(corps),
    });
    let j = null;
    try { j = await r.json(); } catch {}
    return { statut: r.status, corps: j };
  };

  /* Le pot de miel et la liste noire répondent SUCCÈS — c'est le
     comportement voulu. Les distinguer d'une vraie demande apprendrait
     à l'expéditeur quoi changer. */
  let r = await poste(demande({ website_url: 'http://spam.example' }));
  verifie('pot de miel → succès silencieux', [r.statut, r.corps?.ok], [200, true]);
  verifie('  et aucune confirmation annoncée', r.corps?.confirmation ?? false, false);

  r = await poste(demande({ email: 'general@orvanes.tech' }));
  verifie('liste noire, e-mail → succès silencieux', [r.statut, r.corps?.ok], [200, true]);
  verifie('  rien n’est annoncé', r.corps?.confirmation ?? false, false);

  r = await poste(demande({ email: 'autre@orvanes.tech' }));
  verifie('liste noire, domaine → succès silencieux', [r.statut, r.corps?.ok], [200, true]);

  r = await poste(demande({ telephone: '07 54 54 07 66' }));
  verifie('liste noire, téléphone → succès silencieux', [r.statut, r.corps?.ok], [200, true]);

  r = await poste(demande({ telephone: '0899000000' }));
  verifie('numéro surtaxé → refus', [r.statut, r.corps?.champ], [400, 'tel']);

  r = await poste(demande({ telephone: '061234' }));
  verifie('numéro trop court → refus', [r.statut, r.corps?.champ], [400, 'tel']);

  r = await poste(demande({ email: 'jetable@yopmail.com' }));
  verifie('adresse jetable → refus', [r.statut, r.corps?.champ], [400, 'email']);

  r = await poste(demande({ email: 'pas-une-adresse' }));
  verifie('e-mail malformé → refus', [r.statut, r.corps?.champ], [400, 'email']);

  r = await poste(demande({ description: 'court' }));
  verifie('description trop courte → refus', [r.statut, r.corps?.champ], [400, 'description']);

  r = await poste(demande({ prenom: '' }));
  verifie('prénom manquant → refus', [r.statut, r.corps?.champ], [400, 'prenom']);

  r = await poste(demande({ rgpd: false }));
  verifie('RGPD non coché → refus', [r.statut, r.corps?.champ], [400, 'rgpd']);

  r = await poste(demande({ formule: 'entreprise', siret: '' }));
  verifie('formule Entreprise sans SIRET → refus', [r.statut, r.corps?.champ], [400, 'siret']);

  r = await poste(demande({ formule: 'entreprise', siret: '73282932000075' }));
  verifie('SIRET à la clé fausse → refus', [r.statut, r.corps?.champ], [400, 'siret']);

  r = await poste(demande({ formule: 'vitrine', siret: '' }));
  verifie('formule Vitrine sans SIRET → accepté', r.statut !== 400, true);

  /* Aucun message d'erreur ne doit révéler un secret ni la structure
     interne : ils sont lus par l'expéditeur, qui n'est pas toujours
     un client. */
  r = await poste(demande({ email: 'jetable@yopmail.com' }));
  const msg = JSON.stringify(r.corps ?? {});
  verifie('aucun secret dans le message de refus',
    /RESEND|TOKEN|SECRET|supabase|apikey/i.test(msg), false);
}

console.log(echecs.length
  ? `\n✗ ${echecs.length} échec(s) sur ${n} contrôles`
  : `\n✓ ${n} contrôles : les demandes illégitimes sont arrêtées, et de la bonne façon`);
process.exit(echecs.length ? 1 : 0);
