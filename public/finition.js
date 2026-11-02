/* ═══════════════════════════════════════════════════════════════════════
   LA FINITION — le mode léger automatique (le reste a été retiré)
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var fin = matchMedia('(hover:hover) and (pointer:fine)');

  /* ── 1. Les titres mot à mot — RETIRÉ ─────────────────────────────
     Chaque mot montait, pivotait et sortait d'un flou. Un titre se lit
     d'un bloc : il est là dès l'arrivée. */

  /* ── 2. Les boutons ─────────────────────────────────────────────────
     Ce bloc enveloppait chaque bouton de quatre calques — un reflet qui
     balayait en boucle, une nappe d'or qui partait du curseur, une onde à
     l'appui, une flèche détachée. Tout cela a été retiré avec les
     pilules : le bouton est une plaque peinte en CSS (global.css, « LA
     PLAQUE »), et son seul mouvement est un pixel d'enfoncement à
     l'appui. Il n'y a plus rien à injecter. */

  /* ── 3. Le curseur ──────────────────────────────────────────────────
     RETIRE. Le site rend le curseur du systeme : c'est celui que le
     visiteur connait, et il ne demandait pas a etre remplace. */


  /* ── 5. Le mode léger automatique ───────────────────────────────────
     On mesure la fluidité réelle pendant 1,1 s au premier défilement.
     En dessous de 38 images par seconde, le site s'allège tout seul. */
  (function leger() {
    if (reduce.matches) return;
    var lance = false;
    function mesure() {
      if (lance) return; lance = true;
      var n = 0, t0 = performance.now();
      requestAnimationFrame(function f() {
        n++;
        var d = performance.now() - t0;
        if (d < 1100) { requestAnimationFrame(f); return; }
        var ips = n / (d / 1000);
        if (ips < 38) {
          document.body.classList.add('lite');
          if (window.console) console.info('Nexa Web — mode léger activé (' + Math.round(ips) + ' i/s)');
        }
      });
    }
    addEventListener('scroll', mesure, { passive: true, once: true });
    /* Filet de sécurité : on mesure aussi au bout de 4 s, même sans défilement. */
    setTimeout(mesure, 4000);
  })();

  /* ── 4. Le rideau de transition — RETIRÉ ─────────────────────────
     Un lien est un lien : la page suivante s'ouvre tout de suite, sans
     voile doré qui monte et redescend. */
})();
