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
      es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    document.querySelectorAll('.split').forEach(function (el) { io.observe(el); });
  })();

  /* ── 2. Les boutons ─────────────────────────────────────────────────
     La flèche peut être un nœud texte ou un élément : les deux cas sont
     gérés, sinon elle ne part pas au survol. */
  var BTN = '.btn, .btn-g, .svc-cta, .cta-btn, .submit-btn, .lf-btn';
  (function boutons() {
    document.querySelectorAll(BTN).forEach(function (b) {
      if (b.dataset.fx) return; b.dataset.fx = '1';
      var t = document.createElement('span'); t.className = 't';
      while (b.firstChild) t.appendChild(b.firstChild);
      var last = t.lastChild;
      while (last && last.nodeType === 3 && !last.textContent.trim()) { t.removeChild(last); last = t.lastChild; }
      if (last && last.nodeType === 1 && /^[→↗]$/.test((last.textContent || '').trim())) {
        last.classList.add('ar'); last.style.fontStyle = 'normal';
      } else if (last && last.nodeType === 3 && /[→↗]\s*$/.test(last.textContent)) {
        var txt = last.textContent, idx = txt.search(/[→↗]\s*$/);
        last.textContent = txt.slice(0, idx);
        var ar = document.createElement('i');
        ar.className = 'ar'; ar.style.fontStyle = 'normal'; ar.textContent = txt.slice(idx).trim();
        t.appendChild(ar);
      }
      var sh = document.createElement('span'); sh.className = 'sh'; sh.setAttribute('aria-hidden', 'true');
      var fi = document.createElement('span'); fi.className = 'fill'; fi.setAttribute('aria-hidden', 'true');
      b.appendChild(sh); b.appendChild(fi); b.appendChild(t);
    });
    if (reduce.matches) return;
    /* La nappe d'or part du point EXACT où le curseur est entré. */
    document.addEventListener('pointerenter', function (e) {
      var b = e.target && e.target.closest ? e.target.closest(BTN) : null; if (!b) return;
      var r = b.getBoundingClientRect();
      b.style.setProperty('--bx', (e.clientX - r.left) + 'px');
      b.style.setProperty('--by', (e.clientY - r.top) + 'px');
    }, true);
    document.addEventListener('pointerdown', function (e) {
      var b = e.target && e.target.closest ? e.target.closest(BTN) : null; if (!b) return;
      var r = b.getBoundingClientRect();
      var rp = document.createElement('span'); rp.className = 'rip'; rp.setAttribute('aria-hidden', 'true');
      rp.style.left = (e.clientX - r.left) + 'px'; rp.style.top = (e.clientY - r.top) + 'px';
      rp.style.animation = 'ripGo 640ms cubic-bezier(.16,1,.3,1) forwards';
      b.appendChild(rp);
      setTimeout(function () { rp.remove(); }, 700);
    }, true);
  })();

  /* ── 3. Le curseur ──────────────────────────────────────────────────
     body.pointer n'est posée QUE d'ici : si ce script échoue, le curseur
     système reste. Rien n'est masqué à l'aveugle. */
  (function curseur() {
    if (!fin.matches || reduce.matches) return;
    var ring = document.querySelector('.ring'), dot = document.querySelector('.cur-dot'),
        lamp = document.querySelector('.lamp'), body = document.body;
    if (!ring || !dot) return;
    var tx = innerWidth / 2, ty = innerHeight / 2, rx = tx, ry = ty, raf = null, on = false;
    var GRAB = '.btn, .btn-g, a, button, .plan-card, .card, .who-card, .team-card, .stat,' +
               ' .step, .constat-item, .qa .q, .svc-row, .feat-item';
    function loop() {
      raf = null;
      rx += (tx - rx) * 0.19; ry += (ty - ry) * 0.19;
      ring.style.setProperty('--rx2', rx.toFixed(1) + 'px');
      ring.style.setProperty('--ry3', ry.toFixed(1) + 'px');
      if (Math.abs(tx - rx) > 0.4 || Math.abs(ty - ry) > 0.4) raf = requestAnimationFrame(loop);
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      dot.style.setProperty('--dx2', tx + 'px'); dot.style.setProperty('--dy2', ty + 'px');
      if (lamp) { lamp.style.setProperty('--lx', tx + 'px'); lamp.style.setProperty('--ly2', ty + 'px'); }
      if (!on) { on = true; body.classList.add('pointer'); }
      var g = e.target && e.target.closest ? e.target.closest(GRAB) : null;
      body.classList.toggle('grab', !!g);
      ring.style.setProperty('--rs', g ? '2.05' : '1');
      dot.style.setProperty('--ds', g ? '0' : '1');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerdown', function () { body.classList.add('press'); }, { passive: true });
    document.addEventListener('pointerup', function () { body.classList.remove('press'); }, { passive: true });
    document.addEventListener('mouseleave', function () { body.classList.remove('pointer', 'grab'); on = false; });
    document.addEventListener('mouseenter', function () { body.classList.add('pointer'); on = true; });
  })();

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
