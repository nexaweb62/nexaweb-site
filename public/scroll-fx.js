/* ═══════════════════════════════════════════════════════════════════════
   LE MOUVEMENT AU SCROLL — la part qui a besoin du DOM
   Le CSS fait tout le travail d'animation ; ce fichier ne fait que poser
   les marques dont il a besoin : le ruban, les calques de lumière, le
   découpage des paragraphes et la vitesse de défilement.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 1. Le ruban, une fois par page, juste avant le pied ───────────── */
  (function ribbon() {
    var f = document.querySelector('footer');
    if (!f || document.querySelector('.ribbon')) return;
    var MOTS = [['Sites sur mesure'], ['Carvin'], ['Hauts-de-France'], ['Nexa', 'Web'],
                ['Design'], ['Référencement local'], ['Sans gabarit']];
    var seg = MOTS.map(function (m) {
      return m.length > 1
        ? '<span class="seg">' + m[0] + '<b>' + m[1] + '</b><span>·</span></span>'
        : '<span class="seg">' + m[0] + '<span>·</span></span>';
    }).join('');
    var inner = seg + seg + seg + seg;
    var r = document.createElement('div');
    r.className = 'ribbon';
    r.setAttribute('aria-hidden', 'true');
    /* Deux fois la même piste : la translation de -50 % boucle sans couture. */
    r.innerHTML = '<div class="track">' + inner + inner + '</div>';
    f.parentNode.insertBefore(r, f);
  })();

  /* ── 2. Le calque de lumière, dans chaque carte ────────────────────── */
  var CARTES = '.plan-card,.card,.feat-item,.who-card,.team-card,.constat-item,' +
               '.step,.proc-step,.stat,.faq-item,.svc-row,.cta-inner,.launch-notice,.aside';
  (function pass() {
    document.querySelectorAll(CARTES).forEach(function (c) {
      if (c.querySelector(':scope > .pass')) return;
      var g = document.createElement('span');
      g.className = 'pass';
      g.setAttribute('aria-hidden', 'true');
      c.insertBefore(g, c.firstChild);
    });
  })();

  /* ── 3. Le texte s'allume mot par mot ──────────────────────────────── */
  (function reader() {
    if (reduce.matches) return;
    var SEL = '.s-sub, .svc-desc, .proc-desc, .who-desc, .card-desc, .legal-body p,' +
              ' .constat-text, .step-desc, .feat-desc, .lead, .cta-sub';
    document.querySelectorAll(SEL).forEach(function (el) {
      if (el.dataset.reader || el.dataset.split) return;
      if (el.closest('.cnav') || el.closest('.hdr')) return;
      var words = el.textContent.trim().split(/\s+/);
      if (words.length < 5) return;
      /* Un paragraphe qui contient un contrôle n'est pas du texte courant. */
      if (el.querySelector('a,button,input,select,textarea,svg')) return;
      el.dataset.reader = '1';
      var frag = document.createDocumentFragment(), i = 0;
      [].slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'rw'; w.style.setProperty('--i', i++); w.textContent = t;
            frag.appendChild(w);
          });
        } else {
          var w2 = document.createElement('span');
          w2.className = 'rw'; w2.style.setProperty('--i', i++);
          w2.appendChild(node.cloneNode(true));
          frag.appendChild(w2);
        }
      });
      if (!i) return;
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(frag);
      /* La vague balaye tout le paragraphe, quelle que soit sa longueur. */
      el.style.setProperty('--st', Math.min(1.5, 44 / i).toFixed(2) + '%');
      el.classList.add('reader');
    });
  })();

  /* ── 4. La vitesse du défilement fait pencher la page ──────────────── */
  (function skew() {
    if (reduce.matches) return;
    var root = document.documentElement, last = scrollY, v = 0, cur = 0, raf = null;
    function tick() {
      raf = null;
      cur += (v - cur) * 0.18;
      if (Math.abs(cur) < 0.02) cur = 0;
      var sk = Math.max(-1.35, Math.min(1.35, cur * 0.038));
      root.style.setProperty('--sk', sk.toFixed(2) + 'deg');
      root.style.setProperty('--svn', Math.max(-1, Math.min(1, cur / 26)).toFixed(3));
      v *= 0.82;
      if (Math.abs(cur) > 0.02 || Math.abs(v) > 0.02) raf = requestAnimationFrame(tick);
    }
    addEventListener('scroll', function () {
      var y = scrollY, d = y - last; last = y;
      v = Math.max(-46, Math.min(46, d));
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  })();

  /* ── 5. Le rang de chaque carte d'une pile, et l'ordre des puces ───── */
  (function rangs() {
    document.querySelectorAll('.steps,.constats,.facts').forEach(function (c) {
      var k = 0;
      [].slice.call(c.children).forEach(function (el) {
        if (el.matches('.step,.constat-item,.fact')) el.style.setProperty('--n', k++);
      });
    });
    document.querySelectorAll('.plan-features,.plan-card ul,.card ul,.aside ul,.feat-item ul')
      .forEach(function (u) {
        [].slice.call(u.children).forEach(function (li, i) { li.style.setProperty('--j', i); });
      });
  })();

  /* ── 6. Les chiffres montent quand la carte entre dans l'écran ──────
     Le compteur du site est piloté par des attributs (data-count). Les
     prix, eux, sont du texte libre : « 100 € — 200 € », « 1 200 € ». On
     les lit, on garde les littéraux (€, tiret, espaces fines) et on ne
     fait monter que les nombres.

     Un texte qui contient « / » n'est pas une quantité : « 24/7 » qui
     défile ressemble à un bug. On n'y touche pas. */
  (function chiffres() {
    if (reduce.matches) return;
    var cibles = [].slice.call(document.querySelectorAll('.plan-amount, .plan-from, .plan-to, .launch-num'));
    var RE = /\d+(?:[\s\u00A0\u202F]\d{3})*/g;
    cibles.forEach(function (el) {
      var txt = el.textContent;
      if (txt.indexOf('/') > -1) return;
      RE.lastIndex = 0;
      if (!RE.test(txt)) return;
      RE.lastIndex = 0;
      var parts = [], last = 0, m;
      while ((m = RE.exec(txt)) !== null) {
        parts.push({ lit: txt.slice(last, m.index) });
        parts.push({ num: parseInt(m[0].replace(/[^\d]/g, ''), 10), raw: m[0] });
        last = m.index + m[0].length;
      }
      parts.push({ lit: txt.slice(last) });
      el.__parts = parts;
      el.textContent = rendu(parts, 0);
    });
    function fmt(v, raw) {
      var t = String(v);
      if (/[\s\u00A0\u202F]/.test(raw)) t = t.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
      return t;
    }
    function rendu(parts, t) {
      return parts.map(function (p) {
        return p.lit !== undefined ? p.lit : fmt(Math.round(p.num * t), p.raw);
      }).join('');
    }
    function lancer(el) {
      if (el.__ran) return; el.__ran = 1;
      var t0 = null, D = 1250;
      requestAnimationFrame(function step(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / D);
        el.textContent = rendu(el.__parts, 1 - Math.pow(1 - k, 4));
        if (k < 1) requestAnimationFrame(step);
      });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) lancer(e.target); });
    }, { threshold: 0.4 });
    cibles.forEach(function (el) { if (el.__parts) io.observe(el); });
  })();

  /* ── 7. Le tiroir : lèvre dorée, reflet, et le contenu qui sort ─────
     Les enfants directs d'une carte sortent ligne après ligne, sauf les
     calques décoratifs et ceux qui ont déjà leur propre animation. */
  (function tiroir() {
    var DECOR = { LIP: 1, GLOSS: 1, PASS: 1, EDGE: 1, RIM: 1, SWEEP: 1, FLOW: 1 };
    document.querySelectorAll(CARTES).forEach(function (c) {
      if (c.dataset.drw) return; c.dataset.drw = '1';
      if (!c.querySelector(':scope > .lip')) {
        var l = document.createElement('span');
        l.className = 'lip'; l.setAttribute('aria-hidden', 'true');
        c.insertBefore(l, c.firstChild);
      }
      if (!c.querySelector(':scope > .gloss')) {
        var g = document.createElement('span');
        g.className = 'gloss'; g.setAttribute('aria-hidden', 'true');
        c.insertBefore(g, c.firstChild);
      }
      var i = 0;
      [].slice.call(c.children).forEach(function (el) {
        var cl = (el.className || '').toString().toUpperCase().split(/\s+/);
        if (cl.some(function (k) { return DECOR[k]; })) return;
        var cs = getComputedStyle(el);
        if (cs.animationName && cs.animationName !== 'none') return;
        el.classList.add('drwi');
        el.style.setProperty('--i', i++);
      });
    });
  })();

  /* ── 8. L'inclinaison 3D qui suit le curseur ───────────────────────
     Le JS ne pose QUE des variables : l'animation au scroll les
     reprend en direct depuis l'intérieur de ses keyframes. Poser un
     transform ici ne servirait à rien, l'animation l'écraserait. */
  (function tilt() {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    if (reduce.matches) return;
    var cur = null, pend = false, ev = null;
    function clear(c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
    document.addEventListener('pointermove', function (e) {
      ev = e; if (pend) return; pend = true;
      requestAnimationFrame(function () {
        pend = false;
        var c = ev.target && ev.target.closest ? ev.target.closest(CARTES) : null;
        if (c !== cur && cur) { clear(cur); cur = null; }
        if (!c) return;
        cur = c;
        var r = c.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5, py = (ev.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
        c.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
      });
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (cur) { clear(cur); cur = null; } }, { passive: true });
  })();

  window.nwCartes = CARTES;
})();
