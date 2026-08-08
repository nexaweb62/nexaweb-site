/* ===================================================
   NEXA WEB — Tarifs Gallery
   Infinite draggable masonry grid (3×3 tile loop)
   =================================================== */
(function () {
  'use strict';

  var viewport = document.getElementById('tarifs-gallery');
  var world    = document.getElementById('tg-world');
  if (!viewport || !world) return;

  var rmq      = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FRICTION = rmq ? 1 : 0.905;
  var MIN_VEL  = 0.08;
  var CLICK_DIST = 8;
  var CLICK_DUR  = 250;
  var KEY_STEP   = 140;

  /* ── Cards ────────────────────────────────────── */
  var CARDS = [
    { label:'Vitrine',      sub:'Site professionnel',    price:'690',   sz:'md', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    { label:'E-Commerce',   sub:'Boutique en ligne',     price:'1 290', sz:'lg', svc:'ecommerce',bdg:'1000-2000',
      icon:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' },
    { label:'Restaurant',   sub:'Menu & réservation',    price:'690',   sz:'sm', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>' },
    { label:'Plombier',     sub:'Artisan & urgences',    price:'690',   sz:'sm', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
    { label:'Garage',       sub:'Auto & mécanique',      price:'890',   sz:'md', svc:'vitrine',  bdg:'500-1000',
      icon:'<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' },
    { label:'Boulangerie',  sub:'Commerce de proximité', price:'690',   sz:'lg', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
    { label:'SEO',          sub:'Référencement Google',  price:'490',   sz:'sm', svc:'seo',      bdg:'500-1000',
      icon:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
    { label:'Cabinet',      sub:'Conseil & expertise',   price:'890',   sz:'md', svc:'vitrine',  bdg:'500-1000',
      icon:'<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
    { label:'Boutique',     sub:'Mode & lifestyle',      price:'1 290', sz:'lg', svc:'ecommerce',bdg:'1000-2000',
      icon:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
    { label:'Atelier',      sub:'Artisanat & déco',      price:'890',   sz:'sm', svc:'vitrine',  bdg:'500-1000',
      icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
    { label:'Beauté',       sub:'Spa & bien-être',       price:'690',   sz:'md', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' },
    { label:'Conseil',      sub:'B2B & management',      price:'1 290', sz:'sm', svc:'vitrine',  bdg:'1000-2000',
      icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
    { label:'Landing Page', sub:'Conversion & leads',    price:'490',   sz:'md', svc:'vitrine',  bdg:'500-1000',
      icon:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' },
    { label:'Blog',         sub:'Contenu & audience',    price:'890',   sz:'lg', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
    { label:'Portfolio',    sub:'Créatif & agence',      price:'690',   sz:'sm', svc:'vitrine',  bdg:'500-1000',
      icon:'<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
    { label:'Immobilier',   sub:'Agence & annonces',     price:'890',   sz:'md', svc:'vitrine',  bdg:'500-1000',
      icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    { label:'Application',  sub:'Web app & SaaS',        price:'2 490', sz:'lg', svc:'autre',    bdg:'2000-5000',
      icon:'<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>' },
    { label:'Refonte',      sub:'Modernisation',          price:'1 290', sz:'sm', svc:'refonte',  bdg:'1000-2000',
      icon:'<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>' },
  ];

  /* ── Build one tile (3 flex columns, masonry stagger) ── */
  function buildTile(isSource) {
    var tile  = document.createElement('div');
    tile.className = 'tg-tile';

    var inner = document.createElement('div');
    inner.className = 'tg-tile__inner';
    tile.appendChild(inner);

    var cols = [0, 1, 2].map(function (i) {
      var col = document.createElement('div');
      col.className = 'tg-col';
      inner.appendChild(col);
      return col;
    });

    CARDS.forEach(function (c, idx) {
      var card = document.createElement('div');
      card.className = 'tg-card tg-card--' + c.sz;
      card.dataset.svc = c.svc;
      card.dataset.bdg = c.bdg;

      if (isSource) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label',
          c.label + ' — à partir de ' + c.price + ' € · demander un devis');
      } else {
        card.setAttribute('aria-hidden', 'true');
        card.setAttribute('tabindex', '-1');
      }

      card.innerHTML =
        '<div class="tg-card__bg" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
          ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
          c.icon + '</svg>' +
        '</div>' +
        '<div class="tg-card__body">' +
          '<span class="tg-card__label">' + c.label + '</span>' +
          '<span class="tg-card__sub">' + c.sub + '</span>' +
          '<span class="tg-card__price">À partir de <strong>' + c.price + ' €</strong></span>' +
        '</div>';

      cols[idx % 3].appendChild(card);
    });

    return tile;
  }

  /* ── Navigate + pre-fill ─────────────────────── */
  function goDevis(svc, bdg) {
    var sel = document.getElementById('vd-service');
    var bud = document.getElementById('vd-budget');
    if (sel) sel.value = svc || '';
    if (bud) bud.value = bdg || '';
    if (window.nexaGoTo) window.nexaGoTo('devis');
  }

  /* ── State ───────────────────────────────────── */
  var tileW = 0, tileH = 0;
  var tx = 0, ty = 0;
  var vx = 0, vy = 0;
  var dragging = false;
  var rafId    = null;
  var pdX = 0, pdY = 0, pdT = 0, lastX = 0, lastY = 0;

  /* ── Snap (keep in [-tileW, 0) × [-tileH, 0)) ─ */
  function snap() {
    while (tx >= 0)      tx -= tileW;
    while (tx < -tileW)  tx += tileW;
    while (ty >= 0)      ty -= tileH;
    while (ty < -tileH)  ty += tileH;
  }

  function applyTransform() {
    world.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
  }

  /* ── RAF inertia loop ────────────────────────── */
  function loop() {
    tx += vx; ty += vy;
    vx *= FRICTION; vy *= FRICTION;
    snap();
    applyTransform();
    if (Math.abs(vx) > MIN_VEL || Math.abs(vy) > MIN_VEL) {
      rafId = requestAnimationFrame(loop);
    } else {
      vx = 0; vy = 0; rafId = null;
    }
  }

  function startLoop() {
    if (rafId) return;
    rafId = requestAnimationFrame(loop);
  }

  /* ── Pointer helpers ─────────────────────────── */
  function pointerDown(cx, cy) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    vx = 0; vy = 0;
    dragging = true;
    pdX = lastX = cx;
    pdY = lastY = cy;
    pdT = Date.now();
    viewport.classList.add('is-dragging');
  }

  function pointerMove(cx, cy) {
    if (!dragging) return;
    var dx = cx - lastX, dy = cy - lastY;
    lastX = cx; lastY = cy;
    tx += dx; ty += dy;
    vx = dx; vy = dy;
    snap();
    applyTransform();
  }

  function pointerUp(cx, cy) {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (!rmq && (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5)) startLoop();
  }

  /* ── Mouse ───────────────────────────────────── */
  viewport.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    pointerDown(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function (e) { pointerMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup',   function (e) { pointerUp(e.clientX, e.clientY); });

  /* ── Touch ───────────────────────────────────── */
  viewport.addEventListener('touchstart', function (e) {
    pointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  viewport.addEventListener('touchmove', function (e) {
    e.preventDefault();
    pointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  viewport.addEventListener('touchend', function (e) {
    pointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: true });

  /* ── Wheel ───────────────────────────────────── */
  viewport.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    tx -= e.deltaX; ty -= e.deltaY;
    vx = -e.deltaX * 0.4; vy = -e.deltaY * 0.4;
    snap(); applyTransform();
    if (!rmq) startLoop();
  }, { passive: false });

  /* ── Click → devis ───────────────────────────── */
  viewport.addEventListener('click', function (e) {
    var dist = Math.hypot(e.clientX - pdX, e.clientY - pdY);
    if (dist >= CLICK_DIST || Date.now() - pdT >= CLICK_DUR) return;
    var card = e.target.closest('[data-svc]');
    if (card) goDevis(card.dataset.svc, card.dataset.bdg);
  });

  /* ── Keyboard ────────────────────────────────── */
  viewport.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest('[data-svc]');
      if (!card) return;
      e.preventDefault();
      goDevis(card.dataset.svc, card.dataset.bdg);
      return;
    }
    var moved = false;
    if (e.key === 'ArrowLeft')  { tx += KEY_STEP; moved = true; }
    if (e.key === 'ArrowRight') { tx -= KEY_STEP; moved = true; }
    if (e.key === 'ArrowUp')    { ty += KEY_STEP; moved = true; }
    if (e.key === 'ArrowDown')  { ty -= KEY_STEP; moved = true; }
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      snap(); applyTransform();
    }
  });

  /* ── Init ────────────────────────────────────── */
  var src = buildTile(true);
  src.style.cssText = 'position:absolute;left:0;top:0;';
  world.appendChild(src);
  void src.offsetWidth; // force layout

  tileW = src.offsetWidth;
  tileH = src.offsetHeight;

  if (!tileW || !tileH) return;

  /* Clone 8 more tiles for 3×3 grid */
  for (var row = 0; row < 3; row++) {
    for (var col = 0; col < 3; col++) {
      if (row === 0 && col === 0) continue;
      var clone = src.cloneNode(true);
      /* clones are decorative — hide from a11y */
      clone.querySelectorAll('[tabindex]').forEach(function (el) {
        el.setAttribute('tabindex', '-1');
        el.setAttribute('aria-hidden', 'true');
      });
      clone.style.cssText =
        'position:absolute;left:' + (col * tileW) + 'px;top:' + (row * tileH) + 'px;';
      world.appendChild(clone);
    }
  }

  /* Place source tile */
  src.style.cssText = 'position:absolute;left:0;top:0;';

  tx = -tileW;
  ty = -tileH;
  applyTransform();

})();
