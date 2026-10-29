/* ═══════════════════════════════════════════════════════════════════════
   LA FINITION — titres mot à mot, boutons, curseur, rideau de transition
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var fin = matchMedia('(hover:hover) and (pointer:fine)');

  /* ── 1. Les titres arrivent mot par mot ─────────────────────────────
     Un élément enfant (<em>, <span class="liquid">…) devient UN SEUL
     mot, jamais découpé caractère par caractère : sinon un dégradé
     background-clip:text se brise en morceaux. Les <br> sont conservés
     tels quels, sinon la mise en ligne saute. */
  (function split() {
    if (reduce.matches) return;
    var SEL = '.h-xl, .h-lg, .h-md, .s-title, .svc-title, .section-title, .legal-title,' +
              ' .prix-h1, .hero-title, .hero-hl, .contact-title, .rdv-title, .reviews-hl,' +
              ' .lf-headline, .form-lede-h, .cta-hl, .eq-cta-hl';
    function decouper(el) {
      if (el.dataset.split || el.dataset.reader) return;
      /* Si un autre système a déjà découpé ce titre, on ne repasse pas
         derrière : deux découpages se marchent dessus. */
      if (el.querySelector('.ln, .li')) return;
      el.dataset.split = '1';
      var out = [], i = 0;
      [].slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { out.push(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w'; w.style.setProperty('--dl', (i * 46) + 'ms'); i++;
            w.textContent = t; out.push(w);
          });
        } else if (node.nodeType === 1 && node.tagName === 'BR') {
          out.push(node.cloneNode(true));
        } else {
          var w2 = document.createElement('span');
          w2.className = 'w'; w2.style.setProperty('--dl', (i * 46) + 'ms'); i++;
          w2.appendChild(node.cloneNode(true)); out.push(w2);
        }
      });
      if (!out.length) return;
      while (el.firstChild) el.removeChild(el.firstChild);
      out.forEach(function (n) { el.appendChild(n); });
      el.classList.add('split');
      /* Le flou mot a mot ne vaut son prix que sur un titre : la classe
         qui le porte n'est posee que la. */
      if (/^H[1-3]$/.test(el.tagName)) el.classList.add('split-h');
    }
    document.querySelectorAll(SEL).forEach(decouper);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in');
        io.unobserve(el);
        /* ON EFFACE LE FILTRE UNE FOIS L'ARRIVEE JOUEE.
           Les mots terminent sur filter:blur(0px) — on ne peut pas
           finir sur « none », les deux valeurs ne s'interpolent pas et
           le flou sauterait. Mais un blur(0) laisse chaque mot sur sa
           propre couche de composition, repeinte a chaque image, pour
           plus rien. Sur une page de titres cela se compte par
           dizaines, et c'est l'une des causes du defaut d'affichage :
           au-dela d'un certain budget, le compositeur cesse de peindre.

           Le retard, c'est la cascade elle-meme : 46 ms par mot, plus
           les 600 ms du fondu, plus une marge. */
        var mots = el.querySelectorAll('.w').length;
        setTimeout(function () { el.classList.add('pose'); },
                   (Math.max(mots - 1, 0) * 46) + 600 + 140);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    document.querySelectorAll('.split').forEach(function (el) { io.observe(el); });
  })();

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

  /* ── 4. Le rideau de transition ─────────────────────────────────────
     Ce site est un vrai site multi-pages, pas une démonstration à
     onglets : il n'y a pas de routeur à intercepter. Le rideau se joue
     donc en deux temps — il monte au clic sur un lien interne, puis la
     navigation part ; et il se retire à l'arrivée sur la page suivante.

     Si le JS ne tourne pas, les liens restent des liens. */
  (function rideau() {
    var c = document.querySelector('.curtain');
    if (!c || reduce.matches) return;
    c.hidden = false;

    /* Le mot se reconstruit lettre par lettre. */
    var cw = c.querySelector('.cw');
    if (cw) {
      var i = 0;
      var lettres = function (txt, or_) {
        var out = '';
        for (var k = 0; k < txt.length; k++) {
          out += '<b style="--i:' + (i++) + '"' + (or_ ? ' class="g"' : '') + '>' + txt[k] + '</b>';
        }
        return out;
      };
      cw.innerHTML = lettres('NEXA', false) + '<i>' + lettres('WEB', true) + '</i>';
    }

    /* À l'arrivée : le rideau part vers le haut. */
    function retirer() {
      c.classList.remove('in');
      c.classList.add('out');
      setTimeout(function () { c.classList.remove('out'); }, 700);
    }
    if (sessionStorage.getItem('nw-curtain') === '1') {
      try { sessionStorage.removeItem('nw-curtain'); } catch (e) {}
      c.style.transform = 'translateY(0)';
      requestAnimationFrame(function () { c.style.transform = ''; retirer(); });
    }

    /* Au départ : le rideau monte, puis on navigue. */
    var parti = false;
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || parti) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href') || '';
      if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var u;
      try { u = new URL(a.href); } catch (err) { return; }
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search) return;
      e.preventDefault();
      parti = true;
      try { sessionStorage.setItem('nw-curtain', '1'); } catch (err) {}
      c.classList.add('in');
      setTimeout(function () { location.href = a.href; }, 430);
    });

    /* Retour arrière depuis le cache : la page ne doit pas rester couverte. */
    addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      parti = false;
      c.classList.remove('in', 'out');
      c.style.transform = '';
    });
  })();
})();
