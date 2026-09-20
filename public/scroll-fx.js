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

  window.nwCartes = CARTES;
})();
