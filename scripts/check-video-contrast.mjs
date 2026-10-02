#!/usr/bin/env node
/* Prérequis : le site doit tourner (npm run build && npx astro preview).
   Usage : npm run check:video

   LE CONTRASTE SUR UNE VIDÉO QUI BOUGE.

   check:contrast:rendered remonte les parents jusqu'à trouver une
   couleur de fond calculée. Derrière une balise <video> il n'y en a
   pas : la couleur du fond, ce sont les pixels de l'image en cours.
   Ce contrôle les lit vraiment.

   Méthode, pour chaque instant de la vidéo :
     1. on cale la vidéo sur cet instant et on attend le « seeked » ;
     2. on rend INVISIBLE tout le texte de la section, et on capture —
        on obtient le fond nu, voile et verre des cartes compris ;
     3. pour chaque élément de texte, on relit sa boîte dans cette
        capture et on retient le pixel le PLUS DÉFAVORABLE, celui dont
        la luminance est la plus proche de celle du texte ;
     4. on calcule le rapport de contraste contre ce pixel-là.

   On ne retient pas la moyenne : un prix blanc reste illisible s'il
   traverse une seule coulée d'or claire, même si le reste est sombre. */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

/* Le site coupe ses animations sous 38 images par seconde, et une
   machine sans carte graphique passe sous ce seuil : la vidéo se
   remplace alors par son affiche fixe — c'est voulu. Mais pour
   CONTRÔLER la vidéo, il faut qu'elle joue. On sert donc un finition.js
   dont le seuil est à zéro, uniquement pour la mesure. Sans ça, ce
   contrôle mesurait l'affiche en croyant mesurer la vidéo. */
const FINITION = readFileSync('public/finition.js', 'utf8').replace('ips < 38', 'ips < 0');
if (!/ips < 0/.test(FINITION)) throw new Error('seuil du mode léger introuvable dans finition.js');

const BASE = process.env.BASE || 'http://localhost:4321';
const INSTANTS = [0, 1.6, 3.2, 4.8, 6.4];     /* 5 points sur les 8 s */
const CHROME = process.env.CHROME_PATH || undefined;

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
let mesures = 0;
const echecs = [];

for (const theme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem('nw-theme', t); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  await p.route('**/finition.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FINITION }));
  await p.goto(BASE + '/tarifs', { waitUntil: 'load' });
  await p.locator('.plans-section').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2600);                /* les chiffres finissent de monter */

  const pret = await p.evaluate(() => {
    const v = document.querySelector('.riv-v');
    if (!v) return 'pas de video';
    if (getComputedStyle(v).display === 'none') return 'masquée (mode léger ou mouvement réduit)';
    v.pause();
    return v.readyState >= 2 ? 'ok' : 'pas chargee (readyState ' + v.readyState + ')';
  });
  if (pret !== 'ok') { echecs.push(`[${theme}] vidéo : ${pret}`); await ctx.close(); continue; }

  /* Couleurs et boîtes sont lues UNE fois, avant tout voile de mesure.
     Les relire à chaque image exposait à une course : le voile de
     l'instant précédent pouvait n'être pas encore retiré, l'encre
     revenait transparente — donc lue comme noire — et le contrôle
     sortait des 1,06:1 intermittents sur des libellés impeccables.
     Rien ici ne dépend de l'image affichée : la vidéo ne déplace rien. */
  /* Les cibles : tout ce qui porte du texte dans la section. */
  const cibles = await p.evaluate(() => {
    const out = [];
    const sec = document.querySelector('.plans-section');
    sec.querySelectorAll('*').forEach((el) => {
      if (!el.childNodes.length) return;
      const propre = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (!propre) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return;
      /* Un fond OPAQUE au-dessus de la vidéo rend l'échantillonnage
         inutile et même trompeur : la boîte d'une pastille arrondie
         déborde de la pastille, et ses coins montrent la vidéo alors
         qu'aucune lettre ne s'y pose. On remonte donc chercher le
         premier fond sans transparence, et on s'en sert tel quel. */
      let opaque = null;
      for (let a = el; a && a !== sec.parentElement; a = a.parentElement) {
        const f = getComputedStyle(a).backgroundColor;
        const m = f.match(/[\d.]+/g);
        if (!m) continue;
        const alpha = m.length > 3 ? +m[3] : 1;
        if (alpha >= 0.999) { opaque = m.slice(0, 3).map(Number); break; }
      }
      out.push({
        sel: el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : el.tagName.toLowerCase(),
        mot: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24),
        couleur: (cs.color.match(/[\d.]+/g) || []).slice(0, 3).map(Number),
        transparent: /rgba?\([^)]*,\s*0\s*\)/.test(cs.color),
        opaque,
        taille: parseFloat(cs.fontSize), gras: +cs.fontWeight >= 700,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      });
    });
    return out;
  });

  for (const t of INSTANTS) {
    await p.evaluate((t) => new Promise((ok) => {
      const v = document.querySelector('.riv-v');
      v.addEventListener('seeked', ok, { once: true });
      v.currentTime = t;
      setTimeout(ok, 1500);                    /* filet : un seek peut ne jamais aboutir */
    }), t);


    /* Le fond nu : on efface le texte, on capture, on remet.
       Une feuille de style avec !important, et non des styles en ligne
       élément par élément : la première version posait
       el.style.color sur chaque élément portant du texte, et les
       libellés de la bascule y échappaient. Le contrôle comparait alors
       du texte à du texte et sortait des 1,02:1 absurdes. */
    /* Marqueur explicite plutôt que « le dernier <style> » : si un autre
       style s'ajoute après le nôtre, le retrait rate, deux voiles
       s'empilent, et la mesure suivante lit le texte comme transparent
       — donc comme du noir. Constaté : des encres rgb(0,0,0) là où la
       feuille de style dit blanc. */
    await p.addStyleTag({ content: '/*nw-voile*/ .plans-section, .plans-section *{color:transparent !important;' +
      /* color ne suffit pas : le site peint certains textes avec
         -webkit-text-fill-color, qui prime sur lui. Les libellés de la
         bascule restaient donc visibles, et le contrôle comparait une
         encre claire à ses propres lettres — d'où des 1,87:1 qui ne
         décrivaient rien. Vu à l'image. */
      '-webkit-text-fill-color:transparent !important;text-shadow:none !important}' });
    const png = await p.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 1000 } });
    const restes = await p.evaluate(() => {
      const l = [...document.querySelectorAll('style')].filter((e) => e.textContent.includes('/*nw-voile*/'));
      l.forEach((e) => e.remove());
      return l.length;
    });
    if (restes !== 1) {
      echecs.push(`[${theme} t=${t}s] INSTRUMENT : ${restes} voile(s) de mesure retiré(s) au lieu d'un.`);
    }

    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };

    /* ── L'INSTRUMENT SE VÉRIFIE LUI-MÊME ────────────────────────────
       Les boîtes viennent du DOM, les pixels d'une capture : si les
       deux ne sont pas dans le même repère, tout ce qui suit est du
       bruit — et c'est arrivé. On prend un élément dont la CSS donne un
       fond OPAQUE connu, on lit son pixel central, et on exige qu'il
       corresponde. Sinon on s'arrête au lieu de publier des chiffres. */
    const temoin = await p.evaluate(() => {
      const e = document.querySelector('.plan-badge span');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
               attendu: (getComputedStyle(e).backgroundColor.match(/\d+/g) || []).slice(0, 3).map(Number) };
    });
    let voile = 1;
    if (temoin) {
      const lu = px(temoin.x, temoin.y);
      /* La page porte une couche de grain en position:fixed, z-index 300,
         au-dessus de TOUT : elle assombrit la capture d'environ 10 %.
         Ce n'est pas un désalignement — les trois canaux sont multipliés
         par le même facteur. On s'en sert pour distinguer les deux cas :
           · les trois rapports concordent  → simple voile, on le mesure
             et on l'applique aussi à la couleur du texte, puisqu'il
             assombrit l'un comme l'autre ;
           · ils divergent → ce n'est pas un voile, les boîtes et les
             pixels ne désignent pas la même chose, et on s'arrête. */
      const rapports = lu.map((v, i) => v / Math.max(1, temoin.attendu[i]));
      const etendue = Math.max(...rapports) - Math.min(...rapports);
      if (etendue > 0.06) {
        echecs.push(`[${theme} t=${t}s] INSTRUMENT FAUSSÉ : la pastille « Populaire » devrait valoir ` +
                    `rgb(${temoin.attendu}), la capture donne rgb(${lu}), et les trois canaux ne sont pas ` +
                    `dans le même rapport (étendue ${etendue.toFixed(3)}). Boîtes et pixels désalignés.`);
        continue;
      }
      voile = rapports.reduce((a, b) => a + b, 0) / 3;
    }

    for (const c of cibles) {
      /* Une encre entièrement transparente ne vient jamais du design :
         c'est un voile de mesure resté en place. On le dit au lieu de
         publier un rapport de contraste inventé. */
      if (c.transparent) {
        echecs.push(`[${theme}] INSTRUMENT : « ${c.mot} » a une encre transparente — ` +
                    `un voile de mesure n'a pas été retiré.`);
        continue;
      }
      const seuil = (c.taille >= 24 || (c.taille >= 18.66 && c.gras)) ? 3 : 4.5;
      /* Le voile s'applique au texte comme au fond : on compare ce que
         l'œil voit, pas ce que la feuille de style déclare. */
      const encre = c.couleur.map((v) => Math.round(v * voile));
      let pire = Infinity, pirePx = null;
      if (c.opaque) {
        pirePx = c.opaque.map((v) => Math.round(v * voile));
        pire = ratio(encre, pirePx);
      } else {
        /* Deux pixels de retrait : le bord d'une boîte porte
           l'antialiasing de ce qu'il y a autour, jamais de lettre. */
        const x1 = Math.max(0, c.x + 2), x2 = Math.min(info.width - 1, c.x + c.w - 2);
        const y1 = Math.max(0, c.y + 2), y2 = Math.min(info.height - 1, c.y + c.h - 2);
        for (let y = y1; y < y2; y += 2) {
          for (let x = x1; x < x2; x += 2) {
            const q = px(x, y), r = ratio(encre, q);
            if (r < pire) { pire = r; pirePx = q; }
          }
        }
      }
      if (!pirePx) continue;
      mesures++;
      if (pire < seuil) {
        echecs.push(`[${theme} t=${t}s] ${c.sel} « ${c.mot} » ${pire.toFixed(2)}:1 / ${seuil} ` +
                    `— encre vue rgb(${encre}) sur le pire pixel rgb(${pirePx})`);
      }
    }
  }
  await ctx.close();
}
await b.close();

console.log(`${mesures} mesures : chaque texte de la section contre le pixel le plus défavorable, ` +
            `sur ${INSTANTS.length} instants de la vidéo × 2 thèmes, voile de grain compris.`);
if (!echecs.length) {
  console.log('\n✓ Tout le texte posé sur la vidéo tient son seuil WCAG AA.');
  process.exit(0);
}
console.log(`\n✗ ${echecs.length} texte(s) sous le seuil :\n`);
for (const e of echecs.slice(0, 25)) console.log('  ' + e);
process.exit(1);
