/* =============================================
   NEXA WEB — View Navigation
   Stage 2D : Accueil (0,0) → Tarifs (1,0) → Devis (1,1) → Contact (1,2)
   ============================================= */
(function () {
  'use strict';

  var stage = document.getElementById('stage');
  if (!stage) return;

  document.body.classList.add('stage-active');

  var ORDER  = ['accueil', 'tarifs', 'devis', 'contact'];
  var rmq    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TRANS  = rmq ? 0 : 900;

  /* ── initial view from hash ─────────────────── */
  var initView = location.hash.replace('#', '') || 'accueil';
  if (ORDER.indexOf(initView) === -1) initView = 'accueil';
  var current = initView;

  var transitioning = false;

  /* ── Core navigate ──────────────────────────── */
  function goTo(viewId, opts) {
    if (!opts) opts = {};
    if (ORDER.indexOf(viewId) === -1) return;
    if (transitioning) return;
    if (viewId === current && !opts.force) return;

    transitioning = true;
    current = viewId;
    window._nexaCurrentView = viewId; /* expose to view-transitions.js */

    /* opts.instant: skip CSS transition (used by curtain animation) */
    if (opts.instant) { stage.classList.add('no-transition'); void stage.offsetWidth; }
    stage.setAttribute('data-active', viewId);
    if (opts.instant) { void stage.offsetWidth; stage.classList.remove('no-transition'); }

    /* inert */
    ORDER.forEach(function (id) {
      var el = document.getElementById('view-' + id);
      if (!el) return;
      if (id === viewId) el.removeAttribute('inert');
      else               el.setAttribute('inert', '');
    });

    /* snap dots */
    document.querySelectorAll('.snap-dot[data-view]').forEach(function (d) {
      d.classList.toggle('snap-dot--active', d.dataset.view === viewId);
    });

    /* nav links */
    document.querySelectorAll('.nav__link[data-view]').forEach(function (l) {
      l.classList.toggle('active', l.dataset.view === viewId);
    });

    /* blink active nav link */
    if (!rmq) {
      var al = document.querySelector('.nav__link[data-view="' + viewId + '"]');
      if (al) {
        al.classList.add('nav__link--blink');
        setTimeout(function () { al.classList.remove('nav__link--blink'); }, 2900);
      }
    }

    /* hash */
    if (!opts.noPush) {
      history.pushState({ view: viewId }, '', '#' + viewId);
    }

    /* progress bar reset */
    var fill = document.getElementById('scroll-progress-fill');
    var ve   = document.getElementById('view-' + viewId);
    if (fill) {
      var max = ve ? ve.scrollHeight - ve.clientHeight : 0;
      fill.style.width = max > 0 ? (ve.scrollTop / max * 100).toFixed(2) + '%' : '0%';
    }

    var effectiveTrans = opts.instant ? 0 : TRANS;
    setTimeout(function () { transitioning = false; }, effectiveTrans + 60);
  }

  /* expose for external callers (view-transitions.js wraps this) */
  window.nexaGoTo = goTo;

  /* expose state for view-transitions.js (getter-based, always fresh) */
  window._nexaCurrentView = current;
  window._nexaState = {
    get current()      { return current;      },
    get transitioning(){ return transitioning; }
  };

  /* ── Snap dots ──────────────────────────────── */
  document.querySelectorAll('.snap-dot[data-view]').forEach(function (dot) {
    dot.addEventListener('click', function () { window.nexaGoTo(dot.dataset.view); });
    dot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.nexaGoTo(dot.dataset.view); }
    });
  });

  /* ── All [data-view] links (not snap-dots, not view containers) ─ */
  document.querySelectorAll('[data-view]:not(.snap-dot):not(.view), [data-goto-view]').forEach(function (el) {
    var targetView = el.dataset.view || el.dataset.gotoView;
    if (!targetView) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.nexaGoTo(targetView); /* goes through curtain wrapper if tarifs↔devis */
    });
  });

  /* ── Browser back / forward ─────────────────── */
  window.addEventListener('popstate', function (e) {
    var v = (e.state && e.state.view) || (location.hash.replace('#', '') || 'accueil');
    if (ORDER.indexOf(v) !== -1) window.nexaGoTo(v, { noPush: true });
  });

  /* ── Progress bar (per active view scroll) ──── */
  var progressFill = document.getElementById('scroll-progress-fill');
  ORDER.forEach(function (id) {
    var el = document.getElementById('view-' + id);
    if (!el) return;
    el.addEventListener('scroll', function () {
      if (id !== current || !progressFill) return;
      var max = el.scrollHeight - el.clientHeight;
      progressFill.style.width = max > 0 ? (el.scrollTop / max * 100).toFixed(2) + '%' : '0%';
    }, { passive: true });
  });

  /* ── Header hide / show per active view ─────── */
  var header = document.getElementById('site-header');
  var lastY  = {};
  ORDER.forEach(function (id) {
    var el = document.getElementById('view-' + id);
    if (!el || !header) return;
    el.addEventListener('scroll', function () {
      if (id !== current) return;
      var y = el.scrollTop;
      header.classList.toggle('scrolled', y > 60);
      if (y > 80) {
        header.classList.toggle('header--hidden', y > (lastY[id] || 0));
      } else {
        header.classList.remove('header--hidden');
      }
      lastY[id] = y;
    }, { passive: true });
  });

  /* ── Morph-gallery scroll adapter ───────────── */
  window._viewAccueil = document.getElementById('view-accueil');

  /* ── Keyboard: arrow keys cycle views ───────── */
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var mac = document.getElementById('mac-intro');
    if (mac && parseFloat(getComputedStyle(mac).opacity) > 0.05) return;
    var gallery = document.getElementById('tarifs-gallery');
    if (gallery && (gallery === document.activeElement || gallery.contains(document.activeElement))) return;
    var idx = ORDER.indexOf(current);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (idx < ORDER.length - 1) { e.preventDefault(); window.nexaGoTo(ORDER[idx + 1]); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (idx > 0) { e.preventDefault(); window.nexaGoTo(ORDER[idx - 1]); }
    }
  });

  /* ── Initial state ──────────────────────────── */
  stage.setAttribute('data-active', current);
  ORDER.forEach(function (id) {
    var el = document.getElementById('view-' + id);
    if (!el) return;
    if (id === current) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  });

  if (current !== 'accueil') {
    history.replaceState({ view: current }, '', '#' + current);
  } else {
    history.replaceState({ view: 'accueil' }, '', location.pathname + location.search);
  }

})();
