/* ═══════════════════════════════════════════════════════════════════════
   NEXA WEB — SYSTÈME DE MOUVEMENT
   Un IntersectionObserver pour les entrées, UN SEUL requestAnimationFrame
   pour tout ce qui est lié au scroll. Aucun listener scroll non throttlé.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)');

  /* ───────────────────────────────────────────────────────────────────
     1. ENTRÉES — IntersectionObserver, UNE SEULE FOIS par élément
     ─────────────────────────────────────────────────────────────────── */
  var revealTargets = '[data-anim],.r,[data-count-group]';

  function revealAll() {
    document.querySelectorAll(revealTargets).forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  function initReveals() {
    if (reduced.matches || !('IntersectionObserver' in window)) { revealAll(); return; }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);           // rien ne se rejoue en remontant
        if (e.target.hasAttribute('data-count-group')) startCounters(e.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.15 });

    document.querySelectorAll(revealTargets).forEach(function (el) {
      // Déjà dans le viewport au chargement : on affiche sans attendre un scroll.
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('is-in');
        if (el.hasAttribute('data-count-group')) startCounters(el);
        return;
      }
      io.observe(el);
    });

  }


  /* ───────────────────────────────────────────────────────────────────
     1b. DÉCOUPAGE EN LIGNES
         L'effet signature enveloppe chaque ligne RÉELLEMENT RENDUE dans
         un masque. On ne peut donc pas l'écrire dans le balisage : le
         nombre de lignes dépend de la largeur, de la langue et de la
         police. On mesure, puis on reconstruit.
         Bonus : l'i18n remplace l'innerHTML des titres — repasser ici
         après un changement de langue suffit à tout recâbler.
     ─────────────────────────────────────────────────────────────────── */
  function splitLines(el) {
    if (el.dataset.origHtml === undefined) el.dataset.origHtml = el.innerHTML;
    el.innerHTML = el.dataset.origHtml;

    // 1. Atomiser : chaque mot devient une unité mesurable ; les éléments
    //    inline (<em>, <span>) et les <br> restent intacts.
    var units = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.nodeValue.split(/(\s+)/).forEach(function (w) {
          if (!w.trim()) return;
          var sp = document.createElement('span');
          sp.className = 'w';
          sp.textContent = w;
          units.push(sp);
        });
      } else if (node.nodeName === 'BR') {
        units.push({ br: true });
      } else {
        var c = node.cloneNode(true);
        if (c.nodeType === 1) c.classList.add('w');
        units.push(c);
      }
    });
    if (!units.length) return;

    el.innerHTML = '';
    units.forEach(function (u) {
      if (u.br) { el.appendChild(document.createElement('br')); return; }
      el.appendChild(u);
      el.appendChild(document.createTextNode(' '));
    });

    // 2. Mesurer : regrouper par position verticale réelle.
    var lines = [], cur = null, top = null;
    units.forEach(function (u) {
      if (u.br) { cur = null; top = null; return; }
      var t = u.offsetTop;
      if (cur === null || Math.abs(t - top) > 2) { cur = []; lines.push(cur); top = t; }
      cur.push(u);
    });
    if (!lines.length) return;

    // 3. Reconstruire : un masque par ligne.
    el.innerHTML = '';
    lines.forEach(function (words, i) {
      var ln = document.createElement('span'); ln.className = 'ln';
      var li = document.createElement('span'); li.className = 'li';
      li.style.setProperty('--i', i);
      words.forEach(function (w, j) {
        if (j) li.appendChild(document.createTextNode(' '));
        w.classList.remove('w');
        li.appendChild(w);
      });
      ln.appendChild(li);
      el.appendChild(ln);
    });
    el.dataset.split = '1';
  }

  function splitAll() {
    document.querySelectorAll('[data-anim="lines"]').forEach(function (el) {
      var wasIn = el.classList.contains('is-in');
      splitLines(el);
      if (wasIn || reduced.matches) el.classList.add('is-in');
    });
  }

  // Le nombre de lignes change avec la largeur : on recoupe, sans excès.
  var resizeT = null, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;   // ignore la barre d'URL mobile
    lastW = window.innerWidth;
    clearTimeout(resizeT);
    resizeT = setTimeout(splitAll, 180);
  }, { passive: true });

  /* ───────────────────────────────────────────────────────────────────
     6. COMPTEURS — un traitement par tuile, jamais un seul et même code
     ─────────────────────────────────────────────────────────────────── */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function startCounters(scope) {
    scope.querySelectorAll('[data-count]').forEach(function (el) {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';

      var target = parseFloat(el.getAttribute('data-count'));
      var dur = parseFloat(el.getAttribute('data-count-dur')) || 1400;

      if (reduced.matches) { el.textContent = String(target); settle(el); return; }

      // Largeur réservée + chiffres tabulaires PENDANT le comptage : la mise
      // en page ne bouge pas d'un pixel. On repasse en chiffres
      // proportionnels une fois la valeur figée (un grand nombre en
      // tabular-nums paraît lâche aux tailles d'affichage).
      el.style.fontVariantNumeric = 'tabular-nums';
      el.style.display = 'inline-block';
      el.style.minWidth = String(target).length + 'ch';

      var t0 = null;
      (function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        el.textContent = String(Math.round(easeOutExpo(p) * target));
        if (p < 1) requestAnimationFrame(step); else settle(el);
      })(performance.now());
    });

    // Fragments statiques (« /7 ») : fondu à la fin, jamais comptés.
    scope.querySelectorAll('[data-count-after]').forEach(function (el) {
      if (reduced.matches) { el.style.opacity = '1'; return; }
      el.style.opacity = '0';
      el.style.transition = 'opacity 400ms var(--ease-out)';
      setTimeout(function () { el.style.opacity = '1'; }, 1400);
    });

    // Symboles non chiffrables (« ∞ ») : fondu + léger scale, aucun comptage.
    scope.querySelectorAll('[data-count-symbol]').forEach(function (el) {
      if (reduced.matches) { el.style.opacity = '1'; return; }
      el.style.opacity = '0';
      el.style.transform = 'scale(.92)';
      el.style.transition = 'opacity 700ms var(--ease-out),transform 700ms var(--ease-out)';
      requestAnimationFrame(function () {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
    });
  }

  function settle(el) {
    el.style.fontVariantNumeric = 'normal';
    el.style.minWidth = '';
  }

  /* ───────────────────────────────────────────────────────────────────
     2. BOUCLE SCROLL UNIQUE — barre de lecture, en-tête, parallaxe
     ─────────────────────────────────────────────────────────────────── */
  function initScrollLoop() {
    var bar = document.querySelector('.read-bar');
    var hdr = document.getElementById('hdr');
    var parallax = [];
    var desktop = window.matchMedia('(min-width:1024px)');

    function collectParallax() {
      parallax = desktop.matches && !reduced.matches
        ? Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'))
        : [];
      if (!desktop.matches || reduced.matches) {
        document.querySelectorAll('[data-parallax]').forEach(function (el) { el.style.transform = ''; });
      }
    }
    collectParallax();
    desktop.addEventListener('change', collectParallax);

    var lastY = window.scrollY, ticking = false;

    function frame() {
      ticking = false;
      var y = window.scrollY;
      var docH = document.documentElement.scrollHeight - window.innerHeight;

      /* 8 — Progression de lecture */
      if (bar) bar.style.transform = 'scaleX(' + (docH > 0 ? Math.min(y / docH, 1) : 0) + ')';

      /* 9 — En-tête intelligent : se rétracte vers le bas, revient vers le haut */
      if (hdr) {
        hdr.classList.toggle('is-scrolled', y > 40);
        var menuOpen = document.body.classList.contains('nav-open');
        hdr.classList.toggle('is-hidden', !menuOpen && y > 120 && y > lastY);
      }

      /* 3 — Parallaxe douce : 0,88× la vitesse du scroll, PLAFONNÉE à ±60 px.
         Sans ce plafond, une section haute produit un décalage bien
         supérieur et casse le cadrage. */
      for (var i = 0; i < parallax.length; i++) {
        var el = parallax[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        var centre = r.top + r.height / 2 - window.innerHeight / 2;
        var shift = Math.max(-60, Math.min(60, centre * -0.12));
        el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      }

      lastY = y;
    }

    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();
  }

  /* ───────────────────────────────────────────────────────────────────
     3. TYPOGRAPHIE FRANÇAISE — espaces insécables et apostrophes
        Ne touche qu'aux nœuds de texte visibles, jamais au code.
     ─────────────────────────────────────────────────────────────────── */
  var NNBSP = ' '; // espace fine insécable — avant ? ! ; :
  var NBSP  = ' '; // espace insécable — avant €, dans « »

  function frenchTypography() {
    if ((localStorage.getItem('nw-lang') || 'fr') !== 'fr') return;
    var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return (n.parentNode && SKIP[n.parentNode.nodeName])
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      var t = n.nodeValue;
      if (!/[?!;:€']/.test(t)) continue;
      var out = t
        .replace(/ +([?!;:])/g, NNBSP + '$1')   // espace fine avant la double ponctuation
        .replace(/(\d) +€/g, '$1' + NBSP + '€') // insécable avant l'euro
        .replace(/(\w)'(\w)/g, '$1’$2');   // apostrophe typographique
      if (out !== t) n.nodeValue = out;
    }
  }

  /* ───────────────────────────────────────────────────────────────────
     4. DÉMARRAGE
     ─────────────────────────────────────────────────────────────────── */
  function boot() {
    splitAll();          // avant l'observation : les masques doivent exister
    initReveals();
    initScrollLoop();
    frenchTypography();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // L'i18n réinjecte du texte : on repasse la typographie derrière elle.
  // L'i18n remplace l'innerHTML des titres. Son écouteur est enregistré
  // avant le nôtre (i18n.js est chargé en premier), donc quand on arrive ici
  // les titres portent déjà la nouvelle langue — en clair, non découpés.
  // Il faut OUBLIER le cache de découpage, sinon splitLines() restaure
  // l'original de l'ancienne langue et écrase la traduction.
  document.addEventListener('nw-lang', function () {
    setTimeout(function () {
      document.querySelectorAll('[data-anim="lines"][data-i18n]').forEach(function (el) {
        // Si les masques sont encore en place, c'est que l'i18n ne
        // connaissait pas cette clé : le contenu n'a pas bougé, le cache
        // reste valable.
        if (!el.querySelector('.ln')) delete el.dataset.origHtml;
      });
      splitAll();
      frenchTypography();
    }, 0);
  });

  // Le visiteur active « réduire les animations » en cours de route.
  reduced.addEventListener('change', function () { if (reduced.matches) revealAll(); });

  /* ───────────────────────────────────────────────────────────────────
     5. PONT TOKENS → JS
        Les canvas et le WebGL n'ont pas accès aux variables CSS : ils
        passent par ici. Aucune couleur n'est donc écrite en dur dans du JS,
        et tout suit la bascule de thème.
     ─────────────────────────────────────────────────────────────────── */
  function token(name){
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function tokenRgb(name){
    var v = token(name);
    if(v.charAt(0) === '#'){
      var h = v.length === 4
        ? v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
        : v.slice(1);
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }
    var m2 = v.match(/-?[\d.]+/g);
    return m2 ? [+m2[0], +m2[1], +m2[2]] : [0,0,0];
  }
  window.nwToken = token;
  window.nwTokenRgb = tokenRgb;
  window.nwTokenRgba = function(name, a){
    var c = tokenRgb(name);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };

  window.nwRevealAll = revealAll;
  void root;
})();
