#!/usr/bin/env node
/* GARDE-FOU : LA FEUILLE EST LUE PAR NOM DE COLONNE, JAMAIS PAR POSITION.
   Usage : npm run check:sheets   (aucun serveur requis)

   CE QUI A MOTIVE CE CONTROLE.

   Premiere version : en-tetes supposes en ligne 7, colonnes lues de A a
   Q. La feuille reelle a ses en-tetes en LIGNE 6 et sa colonne A VIDE.
   Resultat affiche : « 0 prospect » alors que l'onglet en contenait 16.
   Et le pire n'etait pas l'erreur, c'etait le silence : un zero
   ressemble a une feuille vide, pas a une lecture ratee.

   Une position ecrite en dur est une supposition sur un document que
   quelqu'un d'autre edite tous les jours. Elle casse au premier ajout de
   ligne, au premier deplacement de colonne, et elle casse sans rien dire.

   Ce controle verifie donc que la lecture survit a tout ce qu'une
   feuille de travail subit : des lignes de titre au-dessus, une colonne
   vide a gauche, des colonnes deplacees, une colonne inseree, des
   accents, des lignes plus courtes que les autres.

   Il n'appelle pas l'API Google : il lui donne exactement ce qu'elle
   renvoie — un tableau de tableaux de chaines — et verifie ce qu'on en
   fait. C'est la partie qui s'est trompee, c'est donc celle qu'on teste. */

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TMP = mkdtempSync(join(tmpdir(), 'nw-sheets-'));
const MOD = `${TMP}/sheets.mjs`;
execFileSync('npx', ['esbuild', 'src/lib/admin/sheets.ts', '--format=esm',
  '--target=es2022', `--outfile=${MOD}`, '--log-level=warning'], { stdio: 'inherit' });
const { tableau, clefColonne } = await import(MOD);

const echecs = [];
let n = 0;
const verifie = (nom, reel, attendu) => {
  n++;
  const a = JSON.stringify(reel), b = JSON.stringify(attendu);
  if (a === b) { console.log(`  ok   ${nom}`); return; }
  echecs.push(nom);
  console.log(`  ÉCHEC ${nom}\n         obtenu : ${a}\n         attendu : ${b}`);
};

/* ── Les en-tetes reels de la feuille de prospection ─────────────── */
const ENTETES = ['', '#', 'ENTREPRISE', 'SECTEUR', 'INTERLOCUTEUR', 'TÉLÉPHONE',
  'E-MAIL', 'ADRESSE', 'PRÉSENCE WEB', 'LIEN', 'GOOGLE MAPS',
  "ANGLE D'APPROCHE", 'PRIORITÉ', 'ASSIGNÉ', 'JOUR', 'STATUT', 'RELANCE',
  "NOTES D'APPEL"];

const ligne = (n, nom, statut, assigne) =>
  ['', String(n), nom, 'Commerce', 'M. X', '0600000000', 'x@y.fr', 'Carvin',
    'Aucune', '', '', 'Site vieillissant', 'Haute', assigne, 'Lundi', statut, '', ''];

/* ── 1. LA FORME REELLE : en-tetes en ligne 6, colonne A vide ───── */
{
  const valeurs = [
    ['Nexa Web — prospection'],            // 1
    [],                                     // 2
    ['Semaine du 13 au 17 octobre'],        // 3
    [],                                     // 4
    ['Objectif : 40 prospects'],            // 5
    ENTETES,                                // 6  ← les en-tetes
    ...Array.from({ length: 16 }, (_, i) =>
      ligne(i + 1, `Entreprise ${i + 1}`, i === 0 ? 'Signé' : 'À appeler', 'Mahmoud')),
  ];
  const t = tableau(valeurs, ['ENTREPRISE']);
  verifie('en-têtes trouvés en ligne 6, 16 lignes lues', t.lignes.length, 16);
  verifie('colonne A vide ignorée, ENTREPRISE bien lue',
    t.lignes[0]['ENTREPRISE'], 'Entreprise 1');
  verifie('accents normalisés dans la clé', t.lignes[0]['PRESENCE WEB'], 'Aucune');
  verifie('apostrophe normalisée', t.lignes[0]['ANGLE D APPROCHE'], 'Site vieillissant');
  verifie('le libellé d’origine est conservé pour l’affichage',
    t.etiquettes['PRESENCE WEB'], 'PRÉSENCE WEB');
  verifie('la colonne « # » n’a pas de nom, donc pas de clé',
    Object.keys(t.lignes[0]).includes(''), false);
  verifie('sansEntete est faux', t.sansEntete, false);
}

/* ── 2. La forme SUPPOSEE au depart doit marcher aussi ───────────── */
{
  const valeurs = [ENTETES.slice(1), ...[1, 2, 3].map(i =>
    ligne(i, `E${i}`, 'À appeler', 'Imad').slice(1))];
  const t = tableau(valeurs, ['ENTREPRISE']);
  verifie('en-têtes en ligne 1, sans colonne vide', t.lignes.length, 3);
  verifie('  ENTREPRISE toujours juste', t.lignes[2]['ENTREPRISE'], 'E3');
}

/* ── 3. Colonnes DEPLACEES : le nom prime sur la position ────────── */
{
  const valeurs = [
    ['STATUT', 'ENTREPRISE', 'ASSIGNÉ'],
    ['Signé', 'Boulangerie', 'Mahmoud'],
    ['Refusé', 'Garage', 'Imad'],
  ];
  const t = tableau(valeurs, ['ENTREPRISE']);
  verifie('colonnes dans un autre ordre', t.lignes[0]['ENTREPRISE'], 'Boulangerie');
  verifie('  et le statut suit sa colonne', t.lignes[1]['STATUT'], 'Refusé');
}

/* ── 4. Colonne INSEREE au milieu ────────────────────────────────── */
{
  const valeurs = [
    ['ENTREPRISE', 'NOUVELLE COLONNE', 'STATUT'],
    ['Plomberie', 'peu importe', 'RDV fixé'],
  ];
  const t = tableau(valeurs, ['ENTREPRISE']);
  verifie('colonne insérée : STATUT reste juste', t.lignes[0]['STATUT'], 'RDV fixé');
}

/* ── 5. Lignes plus COURTES que l'en-tete ────────────────────────── */
{
  /* L'API tronque les cellules vides de fin : une ligne peut etre plus
     courte que son en-tete. La valeur manquante doit etre la chaine
     vide, jamais undefined — sinon tout calcul qui la touche renvoie
     NaN ou « undefined » a l'ecran. */
  const valeurs = [
    ['ENTREPRISE', 'STATUT', 'RELANCE', "NOTES D'APPEL"],
    ['Fleuriste', 'Signé'],
  ];
  const t = tableau(valeurs, ['ENTREPRISE']);
  verifie('cellule tronquée → chaîne vide', t.lignes[0]['RELANCE'], '');
  verifie('  et pas undefined', typeof t.lignes[0]['NOTES D APPEL'], 'string');
}

/* ── 6. Aucune ligne d'en-tetes : on le DIT ──────────────────────── */
{
  const t = tableau([['du texte'], ['autre chose']], ['ENTREPRISE']);
  verifie('onglet sans en-têtes → sansEntete', t.sansEntete, true);
  verifie('  et aucune ligne inventée', t.lignes.length, 0);
}

/* ── 7. Onglet vide ou absent ────────────────────────────────────── */
verifie('onglet vide', tableau([], ['ENTREPRISE']).lignes.length, 0);
verifie('onglet absent', tableau(undefined, ['ENTREPRISE']).sansEntete, false);

/* ── 8. Les autres onglets, avec leurs propres ancres ────────────── */
{
  const t = tableau([
    [], ['Ventes 2026'],
    ['facture', 'date', 'client', 'prestation', 'montant_ht', 'statut'],
    ['F-001', '12/08/2026', 'Boulangerie', 'Site vitrine', '999 €', 'Payé'],
  ], ['FACTURE', 'MONTANT HT', 'PRESTATION']);
  verifie('Ventes : en-têtes minuscules trouvés', t.lignes.length, 1);
  verifie('  montant_ht → MONTANT HT', t.lignes[0]['MONTANT HT'], '999 €');
}
{
  const t = tableau([
    ['client', 'projet', 'statut', 'assigne', 'echeance', 'montant_ht'],
    ['Garage', 'Refonte', 'En cours', 'Imad', '28/10/2026', '1490'],
  ], ['PROJET']);
  verifie('Projets : échéance lue', t.lignes[0]['ECHEANCE'], '28/10/2026');
}

/* ── 9. La normalisation elle-meme ───────────────────────────────── */
for (const [brut, attendu] of [
  ['PRÉSENCE WEB', 'PRESENCE WEB'], ['montant_ht', 'MONTANT HT'],
  ["ANGLE D'APPROCHE", 'ANGLE D APPROCHE'], ['E-MAIL', 'E MAIL'],
  ['#', ''], ['  Priorité  ', 'PRIORITE'], ['Montant-HT', 'MONTANT HT'],
]) verifie(`clefColonne(${JSON.stringify(brut)})`, clefColonne(brut), attendu);

console.log(echecs.length
  ? `\n✗ ${echecs.length} échec(s) sur ${n} contrôles`
  : `\n✓ ${n} contrôles : la feuille est lue par nom de colonne, quelle que soit sa mise en page`);
process.exit(echecs.length ? 1 : 0);
