#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:header   —   CHROME_PATH=… pour un Chromium précis.

   L'EN-TÊTE, MESURÉ.

   Ce garde-fou est né d'un défaut réel : sur mobile, le bouton Retour
   perdait son libellé, se retrouvait collé au bord droit et passait pour
   absent — tandis que la grappe de droite comprimait le logo jusqu'à
   0 px de large à 320. Rien ne débordait, aucune erreur n'était levée :
   un contrôle peut disparaître sans qu'aucune mesure existante bronche.

   On vérifie donc, à chaque largeur et dans les deux thèmes :

     1. le logo garde sa largeur naturelle (130 px) ;
     2. le logo n'empiète pas sur la grappe de droite ;
     3. le bouton Retour est présent, visible, dans le cadre, et porte
        son libellé — un chevron seul ne se lit pas comme un bouton ;
     4. rien ne le recouvre : le point central lui appartient bien ;
     5. sa cible tactile fait au moins 44 px de haut (WCAG 2.5.8) ;
     6. la langue et le thème restent atteignables — dans la barre sur
        grand écran, dans le menu plein écran sur mobile — et jamais
        aux deux endroits à la fois ;
     7. un seul état pour deux exemplaires : les boutons cochés du
        sélecteur de thème s'accordent.

   Le point 3 se mesure sur une page intérieure : l'accueil n'a pas de
   bouton Retour, et c'est voulu. */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH || undefined;
/* 320 : iPhone SE de première génération. 360 : le plancher Android.
   390 et 430 : les iPhone courants. 1280 : l'ordinateur. */
const LARGEURS = [320, 360, 390, 430, 1024, 1280];
const PAGES = ['/tarifs', '/contact', '/404'];
const LOGO_NATUREL = 130;

const navigateur = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const echecs = [];
let mesures = 0;

for (const theme of ['dark', 'light']) {
  for (const largeur of LARGEURS) {
    /* Pointeur grossier sous 640 px : c'est là que la règle des 44 px
       s'applique, et c'est la configuration d'un vrai téléphone. */
    const tactile = largeur < 640;
    /* reducedMotion : la rivière et les animations au scroll font tourner
       le GPU à plein régime en mode sans fenêtre, pour rien — ce
       garde-fou mesure une mise en page, pas du mouvement. */
    const ctx = await navigateur.newContext({
      viewport: { width: largeur, height: 844 },
      colorScheme: theme,
      hasTouch: tactile,
      isMobile: tactile,
      reducedMotion: 'reduce',
    });
    await ctx.addInitScript(t => {
      try { localStorage.setItem('nw-theme', t); } catch (e) {}
    }, theme);
    const page = await ctx.newPage();

    for (const chemin of PAGES) {
      await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const vu = el => {
          if (!el) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          const rc = el.getBoundingClientRect();
          return rc.width > 1 && rc.height > 1;
        };
        const svg = document.querySelector('.nav-logo-svg');
        const navr = document.querySelector('.nav-r');
        const back = document.getElementById('hdr-back');
        const out = {
          logo: svg ? Math.round(svg.getBoundingClientRect().width) : null,
          empiete: svg && navr ? svg.getBoundingClientRect().right > navr.getBoundingClientRect().left + 0.5 : false,
          back: null,
          barreLangue: vu(document.querySelector('.nav-r > .lang-sel')),
          barreTheme: vu(document.querySelector('.nav-r > .theme-sel')),
          outils: vu(document.querySelector('.cnav-tools')) ||
                  getComputedStyle(document.querySelector('.cnav-tools') || document.body).display === 'flex',
          groupes: document.querySelectorAll('.theme-sel').length,
          coches: [...document.querySelectorAll('.theme-opt')]
            .filter(b => b.getAttribute('aria-checked') === 'true')
            .map(b => b.getAttribute('data-theme-opt')),
        };
        if (back) {
          const rc = back.getBoundingClientRect();
          const lbl = back.querySelector('.back-label');
          const cible = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2);
          out.back = {
            visible: vu(back),
            libelle: lbl ? (getComputedStyle(lbl).display !== 'none' && lbl.textContent.trim().length > 2) : false,
            hauteur: Math.round(rc.height),
            dansLeCadre: rc.x >= -0.5 && rc.right <= innerWidth + 0.5 && rc.y >= -0.5,
            atteignable: !!cible && (back === cible || back.contains(cible)),
          };
        }
        return out;
      });

      mesures++;
      const tag = `[${theme} ${largeur}] ${chemin}`;

      if (r.logo !== LOGO_NATUREL) {
        echecs.push(`${tag}  logo comprimé : ${r.logo} px au lieu de ${LOGO_NATUREL}`);
      }
      if (r.empiete) echecs.push(`${tag}  le logo passe sous la grappe de droite`);

      if (!r.back) {
        echecs.push(`${tag}  pas de bouton Retour`);
      } else {
        if (!r.back.visible) echecs.push(`${tag}  bouton Retour invisible`);
        if (!r.back.libelle) echecs.push(`${tag}  bouton Retour sans libellé (chevron seul)`);
        if (!r.back.dansLeCadre) echecs.push(`${tag}  bouton Retour hors du cadre`);
        if (!r.back.atteignable) echecs.push(`${tag}  bouton Retour recouvert par un autre élément`);
        const mini = largeur < 640 ? 44 : 38;
        if (r.back.hauteur < mini) {
          echecs.push(`${tag}  cible du Retour : ${r.back.hauteur} px de haut, minimum ${mini}`);
        }
      }

      /* Langue et thème : présents une fois, jamais deux, jamais zéro. */
      const dansLaBarre = r.barreLangue && r.barreTheme;
      if (dansLaBarre && r.outils) echecs.push(`${tag}  langue et thème présents en double`);
      if (!dansLaBarre && !r.outils) echecs.push(`${tag}  ni la langue ni le thème ne sont atteignables`);
      if (r.groupes !== 2) echecs.push(`${tag}  ${r.groupes} sélecteur(s) de thème dans le DOM, attendu 2`);
      if (new Set(r.coches).size > 1) {
        echecs.push(`${tag}  les deux sélecteurs de thème ne s'accordent pas : ${r.coches.join(' / ')}`);
      }
    }
    await ctx.close();
  }
}

/* ── Le Retour fait-il ce que son nom accessible annonce ? ──────────
   « page précédente » doit ramener à la page précédente DE CE SITE, et
   à l'accueil quand il n'y en a pas. */
const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();

await page.goto(BASE + '/tarifs', { waitUntil: 'domcontentloaded' });
await page.click('#hdr-back').catch(() => {});
await page.waitForTimeout(900);
let ou = new URL(page.url()).pathname;
if (ou !== '/') echecs.push(`arrivée directe : le Retour mène à ${ou}, attendu /`);

/* On repart d'un onglet vierge, puis on visite deux pages du site.
   On navigue par goto et non par clic : à 390 px les liens de l'en-tête
   sont dans le menu plein écran, et un clic sur un lien masqué expire
   en silence — le test passerait à côté de ce qu'il mesure. Le compteur
   d'onglet, lui, s'incrémente de la même façon dans les deux cas. */
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { try { sessionStorage.removeItem('nw-vues'); } catch (e) {} });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.goto(BASE + '/contact', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(300);
await page.goto(BASE + '/tarifs', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(300);
await page.click('#hdr-back').catch(() => {});
await page.waitForTimeout(900);
ou = new URL(page.url()).pathname;
if (ou !== '/contact') echecs.push(`parcours interne : le Retour mène à ${ou}, attendu /contact`);

/* Le sélecteur du menu plein écran pilote bien le site. */
await page.goto(BASE + '/tarifs', { waitUntil: 'domcontentloaded' });
await page.click('#menu-btn').catch(() => {});
await page.waitForTimeout(600);
await page.click('.cnav-tools .theme-opt[data-theme-opt="light"]').catch(() => {});
await page.waitForTimeout(400);
const etat = await page.evaluate(() => ({
  attr: document.documentElement.getAttribute('data-theme'),
  coches: [...document.querySelectorAll('.theme-opt')]
    .filter(b => b.getAttribute('aria-checked') === 'true')
    .map(b => b.getAttribute('data-theme-opt')),
  langues: [...document.querySelectorAll('.lang-opt.active')].map(b => b.getAttribute('data-lang')),
}));
if (etat.attr !== 'light') echecs.push(`le thème choisi dans le menu ne s'applique pas (data-theme=${etat.attr})`);
if (etat.coches.length !== 2 || new Set(etat.coches).size !== 1) {
  echecs.push(`après un choix dans le menu, les deux sélecteurs divergent : ${etat.coches.join(' / ')}`);
}
if (etat.langues.length !== 2 || new Set(etat.langues).size !== 1) {
  echecs.push(`les deux sélecteurs de langue divergent : ${etat.langues.join(' / ')}`);
}
await ctx.close();
await navigateur.close();

console.log(`${mesures} en-têtes mesurés (${LARGEURS.length} largeurs × 2 thèmes × ${PAGES.length} pages), plus 4 essais de comportement.`);
if (!echecs.length) { console.log("\n✓ En-tête : tout passe."); process.exit(0); }
console.log(`\n✗ ${echecs.length} point(s) en échec :\n`);
for (const e of echecs) console.log('  ' + e);
process.exit(1);
