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

     1. le logo garde sa largeur naturelle (34 px — la tuile ; le mot
        « NEXAWEB » qui la suivait a été retiré de l'en-tête, et avec lui
        les 130 px que ce contrôle mesurait) ;
     2. le logo n'empiète pas sur la grappe de droite ;
     3. le bouton Retour est présent, visible, dans le cadre, et porte
        son libellé — un chevron seul ne se lit pas comme un bouton ;
     4. rien ne le recouvre : le point central lui appartient bien ;
     5. sa cible tactile fait au moins 44 px de haut (WCAG 2.5.8) ;
     6. la langue et le thème restent atteignables — dans la barre sur
        grand écran, dans le menu plein écran sur mobile — et jamais
        aux deux endroits à la fois ;
     7. un seul état pour deux exemplaires : les boutons cochés du
        sélecteur de thème s'accordent, et il y en a toujours un ;
     8. AUCUN ÉLÉMENT DE LA BARRE NE SORT DE L'ÉCRAN, et il reste une
        gouttière des deux côtés ;
     9. UN THÈME ENREGISTRÉ RESTE RÉVERSIBLE : on part d'un visiteur
        enfermé en sombre, on clique « clair », et le fond change
        vraiment — sur téléphone comme sur ordinateur.

   Le point 3 se mesure sur une page intérieure : l'accueil n'a pas de
   bouton Retour, et c'est voulu.

   ── POURQUOI LE POINT 8 EXISTE ──────────────────────────────────────
   Il est né d'un défaut parti en ligne. Sur téléphone, le bouton
   « Démarrer un projet » dépassait de 51 px à droite : mesuré sur
   /tarifs à 390 px, il commençait à 234 et finissait à 441. Toutes les
   pages intérieures étaient touchées, l'accueil non — elle n'a pas de
   bouton Retour, donc 113 px de moins à loger.

   Aucune mesure existante ne pouvait l'attraper. La barre est en
   position:fixed : elle n'élargit PAS le document, donc
   scrollWidth - clientWidth reste à zéro pendant qu'un bouton pend
   hors de l'écran. Et le contrôle du cadre ne portait que sur le
   bouton Retour — celui qui tenait. La seule mesure qui voit ce défaut
   compare le bord droit de CHAQUE élément de la barre à innerWidth.

   On mesure le logo et les enfants DIRECTS de .nav-r, pas tous les
   descendants : la copie de survol du bouton interactif (.ihb-h) est
   posée en absolu avec translateX(48px), donc son rectangle dépasse
   toujours de 48 px à droite. Elle est à opacité 0 et rognée par
   l'overflow:hidden du bouton — la signaler serait une fausse alerte
   permanente, et une alerte permanente ne se lit plus.

   ── POURQUOI LE POINT 9 EXISTE ──────────────────────────────────────
   Lui aussi est né d'un défaut parti en ligne. Le sélecteur de thème a
   été retiré du balisage, mais le script de démarrage de BaseLayout a
   continué d'appliquer la préférence gardée dans localStorage. Un
   visiteur qui avait choisi « sombre » se retrouvait donc enfermé
   dedans : téléphone en clair, site en noir, et aucun bouton nulle part
   pour en sortir. Mesuré avant correction — nw-theme=dark en mémoire,
   système en clair : fond rgb(10,10,11), zéro contrôle sur la page.

   La règle qui en sort est générale : TANT QUE LE DÉMARRAGE LIT UNE
   PRÉFÉRENCE, UNE COMMANDE DOIT POUVOIR LA RÉÉCRIRE. Compter les
   contrôles ne suffit pas — le point 9 part d'un thème enregistré, va
   chercher la commande là où elle se trouve, clique, et vérifie que la
   couleur du fond a vraiment changé. */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH || undefined;
/* 320 : iPhone SE de première génération. 360 : le plancher Android.
   390 et 430 : les iPhone courants. 1280 : l'ordinateur. */
const LARGEURS = [320, 360, 390, 430, 1024, 1280];
const PAGES = ['/tarifs', '/contact', '/404'];
/* Le symbole du logo, largeur en pixels. On mesure le <svg> et non le
   lien : le lien porte aussi le texte, et sa largeur change donc avec
   chiffre, que l'image soit chargée ou non. */
const LOGO_NATUREL = 30;

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
        const svg = document.querySelector('.nav-logo-mk .lg-svg');
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
          menu: (() => {
            const m = document.querySelector('.menu-btn');
            if (!m) return null;
            const rm = m.getBoundingClientRect();
            return { visible: vu(m), h: Math.round(rm.height) };
          })(),
          coches: [...document.querySelectorAll('.theme-opt')]
            .filter(b => b.getAttribute('aria-checked') === 'true')
            .map(b => b.getAttribute('data-theme-opt')),
          /* Les éléments qui composent la barre, de gauche à droite. */
          barre: (() => {
            const nr = document.querySelector('.nav-r');
            const els = [document.querySelector('.nav-logo'), ...(nr ? nr.children : [])]
              .filter(vu);
            return els.map(e => {
              const b = e.getBoundingClientRect();
              /* Nommer le bouton par son libellé : « ihb » ne dit rien à
                 qui lit le rapport, « Démarrer un projet » dit tout. */
              const t = e.querySelector('.ihb-t,.hdr-btn-lbl');
              const nom = (t && t.textContent.trim()) ||
                          e.getAttribute('aria-label') ||
                          (e.id || e.className || e.tagName).toString().split(' ')[0];
              return { nom, g: Math.round(b.left), d: Math.round(b.right) };
            }).sort((a, b) => a.g - b.g);
          })(),
          fenetre: innerWidth,
        };
        if (back) {
          const rc = back.getBoundingClientRect();
          /* Le bouton Retour est devenu un bouton interactif : son
             libelle vit dans .ihb-t, plus dans .back-label. */
          const lbl = back.querySelector('.ihb-t') || back.querySelector('.back-label');
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

      /* LE SELECTEUR DE THEME DOIT ETRE LA. Deux exemplaires — la barre
         et le menu plein ecran — et un seul etat peint sur les deux. */
      /* LE BOUTON MENU DOIT EXISTER ET SE VOIR, SUR CHAQUE PAGE.
         Il a disparu une fois : en retirant le selecteur de theme voisin,
         une expression reguliere trop large l'a emporte avec lui, et
         personne ne l'a vu avant que le site soit en ligne. Sur telephone
         c'est la SEULE facon d'atteindre les autres pages — un header
         sans lui est un cul-de-sac. */
      if (!r.menu) echecs.push(`${tag}  pas de bouton Menu`);
      else if (!r.menu.visible) echecs.push(`${tag}  bouton Menu invisible`);
      else if (r.menu.h < 36) echecs.push(`${tag}  bouton Menu de ${r.menu.h} px de haut seulement`);

      if (r.groupes !== 2) {
        echecs.push(`${tag}  ${r.groupes} sélecteur(s) de thème, attendu 2 (barre + menu)`);
      }
      if (r.coches.length !== 2) {
        echecs.push(`${tag}  ${r.coches.length} bouton(s) de thème coché(s), attendu 2 (un par exemplaire)`);
      } else if (r.coches[0] !== r.coches[1]) {
        echecs.push(`${tag}  les deux sélecteurs de thème divergent : ${r.coches.join(' / ')}`);
      }
      if (!r.barreLangue && !r.outils) echecs.push(`${tag}  la langue n'est atteignable nulle part`);
      if (!r.barreTheme && !r.outils) echecs.push(`${tag}  le thème n'est atteignable nulle part`);

      /* POINT 8 — la barre tient dans l'écran, avec de l'air aux deux
         bouts. « Ça rentre au pixel près » n'est pas une mise en page :
         8 px de gouttière, c'est le minimum en dessous duquel un bouton
         a l'air d'avoir été coupé. */
      const GOUTTIERE = 8, ECART = 4;
      for (const e of r.barre) {
        if (e.d > r.fenetre + 0.5 || e.g < -0.5) {
          echecs.push(`${tag}  « ${e.nom} » sort de l'écran : ${e.g}→${e.d} pour ${r.fenetre} px de large`);
        }
      }
      if (r.barre.length) {
        const prem = r.barre[0], dern = r.barre[r.barre.length - 1];
        if (prem.g < GOUTTIERE) echecs.push(`${tag}  « ${prem.nom} » colle au bord gauche (${prem.g} px)`);
        if (r.fenetre - dern.d < GOUTTIERE) {
          echecs.push(`${tag}  « ${dern.nom} » colle au bord droit (${r.fenetre - dern.d} px)`);
        }
        /* Deux contrôles qui se touchent se lisent comme un seul. */
        for (let i = 1; i < r.barre.length; i++) {
          const trou = r.barre[i].g - r.barre[i - 1].d;
          if (trou < ECART) {
            echecs.push(`${tag}  « ${r.barre[i - 1].nom} » et « ${r.barre[i].nom} » se touchent (${trou} px)`);
          }
        }
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

/* Le menu plein écran pilote bien la langue. Le thème n'y est plus. */
await page.goto(BASE + '/tarifs', { waitUntil: 'domcontentloaded' });
await page.click('#menu-btn').catch(() => {});
await page.waitForTimeout(600);
const etat = await page.evaluate(() => ({
  themes: document.querySelectorAll('.cnav-tools .theme-opt').length,
  langues: [...document.querySelectorAll('.lang-opt.active')].map(b => b.getAttribute('data-lang')),
}));
if (etat.themes !== 3) {
  echecs.push(`le menu porte ${etat.themes} bouton(s) de thème, attendu 3 (système, clair, sombre)`);
}
if (etat.langues.length !== 2 || new Set(etat.langues).size !== 1) {
  echecs.push(`les deux sélecteurs de langue divergent : ${etat.langues.join(' / ')}`);
}
await ctx.close();

/* ── POINT 9 — une préférence enregistrée reste réversible ──────────
   On part d'un visiteur enfermé : « sombre » en mémoire, téléphone en
   clair. Puis on fait ce qu'il ferait — ouvrir le menu, cliquer
   « clair » — et on regarde la couleur du fond, pas l'attribut. C'est
   la couleur qui dit si le site a obéi.

   On rejoue le tout sur les deux largeurs qui comptent, parce que la
   commande n'est pas au même endroit : dans la barre sur ordinateur,
   dans le menu plein écran sur téléphone. Un site réglable sur l'un et
   bloqué sur l'autre serait exactement le défaut qu'on vient de
   corriger. */
const SOMBRE = 'rgb(10, 10, 11)';
for (const [largeur, ou] of [[390, 'téléphone'], [1280, 'ordinateur']]) {
  const c = await navigateur.newContext({
    viewport: { width: largeur, height: 844 },
    colorScheme: 'light',
    hasTouch: largeur < 640, isMobile: largeur < 640,
    reducedMotion: 'reduce',
  });
  await c.addInitScript(() => { try { localStorage.setItem('nw-theme', 'dark'); } catch (e) {} });
  const pg = await c.newPage();
  await pg.goto(BASE + '/tarifs', { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(350);

  const depart = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (depart !== SOMBRE) {
    echecs.push(`[${ou}] le thème enregistré n'est pas appliqué au chargement : fond ${depart}`);
  }

  /* Sur téléphone la commande vit dans le menu plein écran. */
  if (largeur < 640) await pg.click('#menu-btn').catch(() => {});
  await pg.waitForTimeout(500);

  const clic = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('.theme-opt[data-theme-opt="light"]')]
      .find(e => e.getBoundingClientRect().width > 1);
    if (!b) return 'aucun bouton « clair » visible';
    b.click();
    return null;
  });
  if (clic) { echecs.push(`[${ou}] ${clic} — le thème enregistré est irréversible`); }
  await pg.waitForTimeout(450);

  const apres = await pg.evaluate(() => ({
    fond: getComputedStyle(document.body).backgroundColor,
    attr: document.documentElement.getAttribute('data-theme'),
    garde: (() => { try { return localStorage.getItem('nw-theme'); } catch (e) { return '?'; } })(),
  }));
  if (apres.fond === SOMBRE) {
    echecs.push(`[${ou}] clic sur « clair » : le fond reste ${apres.fond}`);
  }
  if (apres.attr !== 'light') echecs.push(`[${ou}] clic sur « clair » : data-theme vaut ${apres.attr}`);
  if (apres.garde !== 'light') echecs.push(`[${ou}] clic sur « clair » : nw-theme vaut ${apres.garde}`);

  /* Et le retour au réglage du système : la clé doit DISPARAÎTRE, sans
     quoi « système » serait un troisième choix figé de plus. */
  await pg.evaluate(() => {
    const b = [...document.querySelectorAll('.theme-opt[data-theme-opt="system"]')]
      .find(e => e.getBoundingClientRect().width > 1);
    if (b) b.click();
  });
  await pg.waitForTimeout(450);
  const auto = await pg.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    garde: (() => { try { return localStorage.getItem('nw-theme'); } catch (e) { return '?'; } })(),
    fond: getComputedStyle(document.body).backgroundColor,
  }));
  if (auto.attr !== null) echecs.push(`[${ou}] retour au système : data-theme reste ${auto.attr}`);
  if (auto.garde !== null) echecs.push(`[${ou}] retour au système : nw-theme reste ${auto.garde}`);
  if (auto.fond === SOMBRE) {
    echecs.push(`[${ou}] retour au système : fond ${auto.fond} alors que l'OS est en clair`);
  }
  await c.close();
}
await navigateur.close();

console.log(`${mesures} en-têtes mesurés (${LARGEURS.length} largeurs × 2 thèmes × ${PAGES.length} pages), plus 4 essais de comportement et 2 essais de réversibilité du thème.`);
if (!echecs.length) { console.log("\n✓ En-tête : tout passe."); process.exit(0); }
console.log(`\n✗ ${echecs.length} point(s) en échec :\n`);
for (const e of echecs) console.log('  ' + e);
process.exit(1);
