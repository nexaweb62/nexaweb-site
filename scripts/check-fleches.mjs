#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:fleches   —   PAGES=/,/tarifs pour cibler.

   UNE SEULE FLÈCHE PAR BOUTON.

   InteractiveButton dessine SA flèche : un <svg> dans .ihb-h, qui arrive
   au survol. Elle est la seule que le bouton doive montrer.

   LE BUG QUE CE GARDE-FOU SURVEILLE.

   La clé data-i18n de ce bouton est posée sur ses DEUX libellés internes,
   et i18n.js applique les traductions par « el.innerHTML = t[k] ». Une
   entrée du dictionnaire qui se terminait par « → » — six le faisaient,
   en français comme en anglais — injectait donc ce caractère DANS le
   libellé, à côté du SVG. Au survol, le bouton montrait deux flèches :
   celle du texte et celle du composant.

   Le piège : rien dans le markup ne le laissait voir. Les props
   text="Démarrer un projet" étaient propres ; la flèche n'existait que
   dans le dictionnaire, et n'apparaissait qu'une fois i18n.js passé.
   Lire les .astro ne pouvait pas trouver ce bug — il faut lire le DOM
   APRÈS traduction. C'est ce que fait ce contrôle.

   CE QUI EST MESURÉ, POUR CHAQUE .ihb, DANS LES DEUX LANGUES ET AUX
   DEUX LARGEURS :

     1. aucun caractère-flèche (→ › » ➜ ↗ ➤) dans son texte ;
     2. exactement un <svg> ;
     3. au survol, ce SVG est réellement peint : opacité non nulle,
        dimensions non nulles, et son centre tombe dans le bouton.

   Le point 3 n'est pas redondant. Compter les nœuds dit ce qui existe,
   pas ce qui s'affiche : un SVG à opacité 0 ou débordant de son bouton
   passerait les deux premiers points en laissant un bouton sans flèche.
   Le reproche inverse du bug d'origine, et tout aussi faux. */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
/* Les flèches qu'on peut écrire au clavier et qui se glissent dans un
   libellé. ↗ est du lot : /services en porte une, sur un lien. */
const FLECHES = '→›»➜↗➤➔⇒';

/* Toutes les pages, pour le comptage ; le survol coûte plus cher et se
   concentre sur les deux pages que l'accueil et les tarifs. */
const TOUTES = (process.env.PAGES || [
  '/', '/services', '/tarifs', '/devis', '/contact', '/equipe', '/avis',
  '/rendez-vous', '/comment-ca-marche', '/cgv', '/mentions-legales',
  '/politique-confidentialite', '/site-vitrine', '/ecommerce', '/seo',
  '/design-uiux', '/refonte', '/site-internet-artisan',
  '/site-internet-commerce', '/site-internet-restaurant',
  '/login', '/inscription', '/404',
].join(',')).split(',');
const SURVOL = ['/', '/tarifs'];

/* ON ATTEND QUE LA PAGE AIT FINI DE DÉFILER.

   global.css pose « html{scroll-behavior:smooth} ». scrollIntoView() ne
   saute donc pas : il anime, sur une durée que personne ne contrôle et
   qui dépend de la distance. Survoler pendant ce temps, c'est viser une
   cible en mouvement — le pointeur est posé où le bouton ÉTAIT. C'est
   l'origine commune des trois faux positifs de ce contrôle : survol
   perdu, flèche lue au repos, opacité lue en plein fondu.
   On interroge donc scrollY jusqu'à ce qu'il ne bouge plus. */
const arretDuDefilement = async (page, budget = 3000) => {
  const t0 = Date.now();
  let avant = -1;
  while (Date.now() - t0 < budget) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === avant) return true;
    avant = y;
    await page.waitForTimeout(110);
  }
  return false;
};

const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const echecs = [];
const sautes = [];
let boutonsVus = 0, survolsVus = 0;

for (const langue of ['fr', 'en']) {
  for (const largeur of [1280, 390]) {
    const ctx = await nav.newContext({ viewport: { width: largeur, height: 900 } });
    await ctx.addInitScript(l => {
      try {
        sessionStorage.setItem('nexa-intro', '1');
        localStorage.setItem('nw-lang', l);
        localStorage.setItem('nw-consent', JSON.stringify({ v: 1, t: Date.now(), rdv: false }));
      } catch (e) {}
    }, langue);
    const page = await ctx.newPage();

    for (const chemin of TOUTES) {
      try {
        await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (e) { echecs.push(`${chemin} ${langue} ${largeur} : page injoignable`); continue; }
      /* i18n.js s'applique au chargement : on le laisse passer, sinon on
         lirait le français d'origine et le bug resterait invisible. */
      await page.waitForTimeout(900);

      const lot = await page.evaluate(F => {
        const dedans = s => [...s].some(c => F.includes(c));
        return [...document.querySelectorAll('.ihb')].map((b, i) => ({
          i,
          /* Le libellé visible et sa copie de survol portent le même
             texte : on les regarde séparément pour nommer le fautif. */
          repos:  (b.querySelector('.ihb-t')?.textContent || '').trim(),
          survol: (b.querySelector('.ihb-h')?.textContent || '').trim(),
          glyphes: [...(b.textContent || '')].filter(c => F.includes(c)).join(''),
          fautif: dedans(b.querySelector('.ihb-t')?.textContent || '') ? '.ihb-t'
                : dedans(b.querySelector('.ihb-h')?.textContent || '') ? '.ihb-h' : '',
          svgs: b.querySelectorAll('svg').length,
          cle: b.querySelector('[data-i18n]')?.getAttribute('data-i18n') || '(sans clé)',
        }));
      }, FLECHES);

      boutonsVus += lot.length;
      for (const b of lot) {
        const ou = `${chemin} ${langue} ${largeur}  « ${b.repos || '(vide)'} » [${b.cle}]`;
        if (b.glyphes) echecs.push(`${ou} : flèche « ${b.glyphes} » dans le texte (${b.fautif})`);
        if (b.svgs !== 1) echecs.push(`${ou} : ${b.svgs} <svg> au lieu d'un seul`);
      }

      if (!SURVOL.includes(chemin)) continue;

      /* LE SURVOL. On passe la souris sur chaque bouton et on regarde ce
         qui est peint. Trois précautions, chacune payée par un faux
         positif de ce contrôle.

         1. ON CENTRE LE BOUTON. scrollIntoViewIfNeeded() le gare au bord
            de l'écran, et là une des quatre cartes de /tarifs à 390 px
            donnait une flèche à 0,27 — stable, deux lectures d'accord,
            donc pas un transitoire. C'était pourtant la valeur VOULUE :
            .drwi s'anime sur « animation-timeline: view() », son opacité
            est une fonction de la position de défilement, et le bord de
            l'écran est l'endroit où le fondu d'entrée n'est qu'au quart.
            Vérifié aux trois positions : bord haut 0, bord bas 0,79,
            centré 1. Mesurer là, c'est mesurer le fondu en croyant
            mesurer le survol.

         2. ON JUGE L'ATTEIGNABILITÉ APRÈS AVOIR DÉFILÉ, jamais avant.
            Testée avant, elle écartait tous les boutons encore sous la
            ligne de flottaison — justement ceux dont l'opacité est à 0
            parce que leur fondu d'entrée n'a pas commencé. 36 boutons
            sur 76 disparaissaient ainsi du contrôle.

         3. ON VÉRIFIE QUE LE SURVOL A PRIS. hover({force:true}) envoie
            le pointeur aux coordonnées du bouton, mais c'est le test de
            recouvrement du navigateur qui décide à qui va :hover : sous
            l'en-tête fixe, le survol part à l'en-tête et le bouton reste
            au repos. Sans cette garde, on lisait « flèche à opacité 0 »
            là où il n'y avait tout simplement pas de survol. */
      const n = lot.length;
      for (let i = 0; i < n; i++) {
        const b = page.locator('.ihb').nth(i);
        const nom = `${chemin} ${langue} ${largeur} « ${lot[i].repos} »`;
        let survolPris = false;
        /* Centré d'abord ; si l'en-tête fixe intercepte, on redescend le
           bouton de sa hauteur et on réessaie. */
        for (const decalage of [0, 120, -120]) {
          try {
            await b.evaluate((el, d) => {
              el.scrollIntoView({ block: 'center' });
              if (d) window.scrollBy(0, d);
            }, decalage);
            await arretDuDefilement(page);
            /* UN BOUTON DANS UN PANNEAU FERMÉ N'EST PAS UN BOUTON CASSÉ.
               Le bandeau cookies garde ses deux boutons dans le DOM,
               carte à opacité 0, et ne s'ouvre qu'à la première visite.
               Les sauter est légitime ; en silence, non — ils sont
               comptés et nommés à la fin. */
            const joignable = await b.evaluate(el => {
              if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) return false;
              const r = el.getBoundingClientRect();
              return !!(r.width && r.height);
            });
            if (!joignable) break;
            await b.hover({ timeout: 4000, force: true });
            await page.waitForTimeout(300);
            survolPris = await b.evaluate(el => el.matches(':hover'));
          } catch (e) { survolPris = false; }
          if (survolPris) break;
        }
        if (!survolPris) { sautes.push(nom + ' — survol non pris'); continue; }
        survolsVus++;
        /* ON ATTEND QUE LA VALEUR SE STABILISE, ON NE LA PRÉLÈVE PAS.

           Première version de ce contrôle : une seule lecture, 420 ms
           après le survol. Elle a annoncé deux flèches à opacité 0 et
           0,27 sur quatre boutons — faux. Vérifié à la main : les mêmes
           boutons, suivis sur trois secondes, tiennent 1. Ce que la
           lecture unique avait attrapé, c'est l'apparition au défilement
           encore en cours : le bouton venait d'entrer dans l'écran, son
           conteneur montait de 0 vers 1, et la mesure tombait dedans.
           L'erreur exacte que check:anim et check:contrast:rendered ont
           déjà faite ici. On interroge donc jusqu'à ce que deux lectures
           consécutives s'accordent. */
        const vu = await b.evaluate(async el => {
          const lire = () => {
            const svg = el.querySelector('.ihb-h svg');
            if (!svg) return { manque: true };
            const r = svg.getBoundingClientRect(), rb = el.getBoundingClientRect();
            /* L'opacité effective : celle du SVG et de tous ses parents
               jusqu'au bouton inclus. .ihb-h est à 0 au repos — c'est
               elle qui dirait « pas de flèche » si le survol n'avait
               pas pris ; le bouton lui-même est dans la chaîne parce
               qu'une flèche dans un bouton transparent n'est pas une
               flèche visible. */
            let o = 1;
            for (let p = svg; p && p !== el.parentElement; p = p.parentElement)
              o *= parseFloat(getComputedStyle(p).opacity);
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            return {
              libelle: (el.querySelector('.ihb-t')?.textContent || '').trim(),
              survole: el.matches(':hover'),
              opacite: +o.toFixed(3), l: Math.round(r.width), h: Math.round(r.height),
              dedans: cx >= rb.left - 1 && cx <= rb.right + 1 && cy >= rb.top - 1 && cy <= rb.bottom + 1,
              nbSvg: el.querySelectorAll('svg').length,
            };
          };
          const dormir = ms => new Promise(r => setTimeout(r, ms));
          let avant = lire(), lectures = 1;
          for (let i = 0; i < 24; i++) {
            await dormir(120);
            const apres = lire();
            if (apres.manque || avant.manque) return apres;
            lectures++;
            if (Math.abs(apres.opacite - avant.opacite) < 0.004
                && apres.l === avant.l && apres.h === avant.h) {
              return { ...apres, lectures };
            }
            avant = apres;
          }
          return { ...avant, lectures, instable: true };
        });
        /* LE SURVOL SE PERD TOUT SEUL.

           Troisième faux positif : trois boutons annonçaient « flèche à
           opacité 0, hors du bouton » — exactement l'état de REPOS, où
           .ihb-h est garé à droite et transparent. Le survol avait bien
           pris, et il s'était perdu ENTRE la vérification et la mesure :
           la page continue de défiler sous le curseur (compteurs de prix,
           animations liées au défilement), le pointeur ne touche plus le
           bouton, qui revient au repos — et la mesure se stabilise sur
           ce repos, donc sans alerte de transitoire.
           Preuve que les deux allaient ensemble : « Voir notre méthode »
           échouait en anglais et passait en français, le même bouton.
           On remesure donc, et une lecture dont le survol n'est plus là
           ne compte pas. */
        if (!vu.manque && !vu.survole) {
          let reprise = null;
          for (let essai = 0; essai < 3 && !(reprise && reprise.survole); essai++) {
            try {
              await b.hover({ timeout: 4000, force: true });
              await page.waitForTimeout(320);
              reprise = await b.evaluate(el => {
                const svg = el.querySelector('.ihb-h svg');
                if (!svg) return { manque: true };
                const r = svg.getBoundingClientRect(), rb = el.getBoundingClientRect();
                let o = 1;
                for (let p = svg; p && p !== el.parentElement; p = p.parentElement)
                  o *= parseFloat(getComputedStyle(p).opacity);
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                return {
                  libelle: (el.querySelector('.ihb-t')?.textContent || '').trim(),
                  survole: el.matches(':hover'),
                  opacite: +o.toFixed(3), l: Math.round(r.width), h: Math.round(r.height),
                  dedans: cx >= rb.left - 1 && cx <= rb.right + 1 && cy >= rb.top - 1 && cy <= rb.bottom + 1,
                  nbSvg: el.querySelectorAll('svg').length,
                };
              });
            } catch (e) { reprise = null; }
          }
          if (reprise && reprise.survole) { Object.assign(vu, reprise); }
          else { sautes.push(nom + ' — survol perdu pendant la mesure'); continue; }
        }
        const ou = `${chemin} ${langue} ${largeur}  « ${vu.libelle || lot[i].repos} »`;
        if (vu.manque) { echecs.push(`${ou} : aucun svg dans .ihb-h au survol`); continue; }
        if (vu.opacite < 0.5) echecs.push(`${ou} : flèche à opacité ${vu.opacite} au survol`);
        if (!vu.l || !vu.h) echecs.push(`${ou} : flèche de ${vu.l}×${vu.h} px au survol`);
        if (!vu.dedans) echecs.push(`${ou} : flèche hors du bouton au survol`);
        if (vu.nbSvg !== 1) echecs.push(`${ou} : ${vu.nbSvg} <svg> au survol`);
        if (vu.instable) echecs.push(`${ou} : flèche encore en mouvement après 3 s de survol`);
      }
    }
    await ctx.close();
  }
}
await nav.close();

if (echecs.length) {
  console.log(`\n✗ ${echecs.length} problème(s) de flèche sur ${boutonsVus} bouton(s) lus, ${survolsVus} survolé(s) :\n`);
  for (const e of echecs) console.log('  ' + e);
  console.log('\n  Remède : le libellé ne porte jamais de flèche, ni dans la prop');
  console.log('  text= ni dans les entrées du dictionnaire de public/i18n.js.');
  console.log('  Le composant dessine la sienne.\n');
  process.exit(1);
}
console.log(`✓ une seule flèche par bouton — ${boutonsVus} bouton(s) lus, ${survolsVus} survolé(s), FR et EN, 1280 et 390 px`);
if (sautes.length) {
  console.log(`  (${sautes.length} bouton(s) non survolés, hors d'atteinte — panneau fermé :`);
  for (const s of sautes) console.log('     ' + s);
  console.log('   leur libellé est tout de même lu, flèches comprises.)');
}
