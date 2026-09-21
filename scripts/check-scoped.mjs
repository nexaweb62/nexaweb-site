#!/usr/bin/env node
/* Usage : npm run check:scoped   (aucun navigateur, aucun serveur)

   LE PIÈGE DU STYLE SCOPÉ.

   Astro compile un <style> de composant en `.ico-star[data-astro-cid-…]`
   et ne pose cet attribut QUE sur les éléments écrits dans le template.
   Un élément fabriqué au runtime — createElement, innerHTML — ne l'a
   pas : aucune de ces règles ne s'applique à lui. Le résultat est
   silencieux et parfois spectaculaire : cinq <svg> sans taille ont fait
   1 152 px de large chacun sur la page Avis, et la page 8 417 px de
   haut au lieu de 2 800.

   Ce garde-fou recoupe deux listes, fichier par fichier :

     1. les classes qu'un <style> SCOPÉ définit (ce qui est déjà sorti
        par :global(...) ne compte pas, c'est justement le remède) ;
     2. les classes portées par un élément FABRIQUÉ par le script de ce
        même fichier.

   Fabriqué veut dire l'un des deux, et rien d'autre :
     - une classe écrite dans un class="…" à l'intérieur d'une chaîne
       (innerHTML, insertAdjacentHTML) ;
     - une classe posée sur une variable qui vient de createElement.

   classList.add('show') sur un élément du template n'est PAS un piège :
   l'élément garde son attribut data-astro-cid, la règle s'applique.
   C'est la distinction qui sépare les vrais cas des faux. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const fichiers = [];
for (const d of ['src/pages', 'src/components', 'src/layouts']) {
  for (const f of readdirSync(d)) if (f.endsWith('.astro')) fichiers.push(join(d, f));
}

const pieges = [];
for (const f of fichiers) {
  const src = readFileSync(f, 'utf8');

  /* 1. Les classes que le scope ATTEINT.

        Astro ne pose son attribut que sur le DERNIER element du
        selecteur : `.star-btn .ico-star` devient
        `.star-btn .ico-star[data-astro-cid-…]`. C'est donc le dernier
        compound, et lui seul, qui doit porter l'attribut — et donc lui
        seul qui casse quand l'element est fabrique au runtime.

        On retire ensuite les classes deja sorties par :global(...) :
        c'est le remede, pas le mal. Une classe peut etre les deux a la
        fois — .ico-star est scopee pour les etoiles du formulaire,
        ecrites dans le template, et globalisee pour celles que le
        script injecte.

        LIMITE ASSUMEE : une seule regle globalisee suffit a considerer
        la classe couverte. Si l'on globalise une regle et qu'on en
        laisse une autre scopee sur la meme classe, ce controle ne le
        verra pas. Ce qu'il attrape, et c'est le vrai scenario de
        regression, c'est une classe injectee dont AUCUNE regle n'est
        sortie du scope. */
  const derniersCompounds = (sel) =>
    sel.split(',').map(part => part.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean).pop() || '');

  const scopees = new Set();
  const soignees = new Set();
  for (const m of src.matchAll(/<style(?!\s+is:global)[^>]*>([\s\S]*?)<\/style>/g)) {
    const bloc = m[1];
    for (const g of bloc.matchAll(/:global\(([^)]*)\)/g)) {
      for (const c of g[1].matchAll(/\.([a-zA-Z][\w-]*)/g)) soignees.add(c[1]);
    }
    /* Les selecteurs restants, une fois les parties :global() neutralisees. */
    const css = bloc.replace(/:global\([^)]*\)/g, '\u0000');
    for (const regle of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      const sel = regle[1].split('\n').pop().trim();
      if (!sel || sel.startsWith('@') || sel.includes('\u0000')) continue;
      for (const comp of derniersCompounds(sel)) {
        for (const c of comp.matchAll(/\.([a-zA-Z][\w-]*)/g)) scopees.add(c[1]);
      }
    }
  }
  for (const c of soignees) scopees.delete(c);
  if (!scopees.size) continue;

  /* 2. Les classes portees par un element fabrique. */
  const fabriquees = new Map();          // classe -> raison
  for (const m of src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const js = m[1];

    /* a) class="…" dans une chaine : c'est du innerHTML. */
    for (const c of js.matchAll(/class=\\?["']([^"'\\]+)/g)) {
      for (const n of c[1].trim().split(/\s+/)) fabriquees.set(n, 'innerHTML');
    }

    /* b) une variable issue de createElement, puis habillee. */
    const nees = new Set();
    for (const c of js.matchAll(/(?:var|let|const)\s+([\w$]+)\s*=\s*document\.createElement/g)) nees.add(c[1]);
    for (const c of js.matchAll(/([\w$]+)\s*=\s*document\.createElement/g)) nees.add(c[1]);
    for (const nom of nees) {
      const re = new RegExp(nom.replace(/\$/g, '\\$') +
        "\\s*\\.\\s*(?:className\\s*=\\s*['\"]([^'\"]*)['\"]|classList\\.add\\(\\s*['\"]([^'\"]*)['\"])", 'g');
      for (const c of js.matchAll(re)) {
        for (const n of (c[1] || c[2] || '').trim().split(/\s+/)) {
          if (n) fabriquees.set(n, 'createElement (' + nom + ')');
        }
      }
    }
  }

  for (const [c, raison] of fabriquees) {
    if (scopees.has(c)) pieges.push({ f, c, raison });
  }
}

console.log(`${fichiers.length} composants Astro examinés.`);
if (!pieges.length) {
  console.log('\n✓ Rien de fabriqué en JavaScript ne dépend d\'un style scopé.');
  process.exit(0);
}
console.log(`\n✗ ${pieges.length} classe(s) fabriquée(s) au runtime mais stylée(s) dans un <style> scopé :\n`);
for (const p of pieges) {
  console.log(`  .${p.c}  —  ${p.f}  (${p.raison})`);
}
console.log('\n  Remède : ancrer la règle sur le conteneur et la sortir du scope,');
console.log('  par exemple  #mon-conteneur :global(.ma-classe){…}');
process.exit(1);
