/* =============================================
   NEXA WEB — View Transitions
   Boundary scroll triggers + Curtain animation
   ============================================= */
(function () {
  'use strict';

  if (!document.getElementById('stage')) return;

  var ACCUM_THRESHOLD = 120;
  var BOUNCE_LOCK_MS  = 1000;
  var rmq         = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CURTAIN_DUR = rmq ? 0 : 680;
  var REVEAL_DUR  = rmq ? 0 : 380;
  var ORDER       = ['accueil', 'tarifs', 'devis', 'contact'];

  var curtainBusy = false;
  var bounceLock  = false;
  var activeTrig  = null;
  var trigAccum   = 0;

  /* ── Wrap nexaGoTo for curtain animation ────── */
  var _origGoTo = window.nexaGoTo;
  window.nexaGoTo = function (viewId, opts) {
    if (!opts) opts = {};
    if (curtainBusy) return;
    var from = window._nexaState ? window._nexaState.current : null;
    if ((from === 'tarifs' && viewId === 'devis') ||
        (from === 'devis'  && viewId === 'tarifs')) {
      if (window._nexaState && window._nexaState.transitioning) return;
      curtainTransition(from, viewId, opts);
      return;
    }
    _origGoTo(viewId, opts);
  };

  /* ── Trigger table ──────────────────────────── */
  var TRIGGERS = [
    { viewId:'accueil', edge:'bottom', target:'tarifs',  label:'Tarifs'  },
    { viewId:'tarifs',  edge:'top',    target:'accueil', label:'Accueil' },
    { viewId:'tarifs',  edge:'bottom', target:'devis',   label:'Devis'   },
    { viewId:'devis',   edge:'top',    target:'tarifs',  label:'Tarifs'  },
    { viewId:'devis',   edge:'bottom', target:'contact', label:'Contact' },
    { viewId:'contact', edge:'bottom', target:'devis',   label:'Devis'   }
  ];

  function getActiveTrigger(cur, deltaY) {
    if (!cur) return null;
    var dir = deltaY > 0 ? 'bottom' : 'top';
    for (var i = 0; i < TRIGGERS.length; i++) {
      var t = TRIGGERS[i];
      if (t.viewId !== cur || t.edge !== dir) continue;
      var el = document.getElementById('view-' + cur);
      if (!el) continue;
      var gap = el.scrollHeight - el.clientHeight;
      if (gap > 2) {
        /* Scrollable view: must be at edge */
        if (t.edge === 'bottom' && (el.scrollHeight - el.scrollTop - el.clientHeight) > 2) continue;
        if (t.edge === 'top'    && el.scrollTop > 2) continue;
      }
      return t;
    }
    return null;
  }

  /* ── Nav-hint (one per edge) ────────────────── */
  var hints = {
    top:    makeHint('top'),
    bottom: makeHint('bottom')
  };

  function makeHint(edge) {
    var div = document.createElement('div');
    div.className = 'nav-hint nav-hint--' + edge;
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = '<span class="nav-hint__label"></span>' +
                    '<div class="nav-hint__bar"><div class="nav-hint__fill"></div></div>';
    document.body.appendChild(div);
    return {
      el:    div,
      label: div.querySelector('.nav-hint__label'),
      fill:  div.querySelector('.nav-hint__fill')
    };
  }

  function showHint(t, progress) {
    var h = hints[t.edge];
    h.label.textContent = (t.edge === 'bottom' ? '↓ ' : '↑ ') + t.label;
    h.fill.style.width  = Math.min(progress * 100, 100).toFixed(1) + '%';
    h.el.classList.add('is-visible');
  }

  function hideHints() {
    hints.top.el.classList.remove('is-visible');
    hints.bottom.el.classList.remove('is-visible');
  }

  /* ── Wheel accumulation ─────────────────────── */
  function onWheel(deltaY) {
    if (bounceLock || curtainBusy) return;
    if (Math.abs(deltaY) < 1) return;
    if (window._nexaState && window._nexaState.transitioning) return;

    var cur = window._nexaState ? window._nexaState.current : window._nexaCurrentView;
    var t   = getActiveTrigger(cur, deltaY);

    if (!t) {
      if (activeTrig) { activeTrig = null; trigAccum = 0; hideHints(); }
      return;
    }

    if (t !== activeTrig) { activeTrig = t; trigAccum = 0; hideHints(); }
    trigAccum += Math.abs(deltaY);

    var progress = trigAccum / ACCUM_THRESHOLD;
    if (progress < 1) { showHint(t, progress); return; }

    /* Threshold reached → fire */
    activeTrig = null; trigAccum = 0; hideHints();
    bounceLock = true;
    setTimeout(function () { bounceLock = false; }, BOUNCE_LOCK_MS);
    window.nexaGoTo(t.target);
  }

  window.addEventListener('wheel', function (e) { onWheel(e.deltaY); }, { capture: true, passive: true });

  /* ── Touch swipe ─────────────────────────────── */
  var tStart = null;
  window.addEventListener('touchstart', function (e) {
    tStart = { y: e.touches[0].clientY, x: e.touches[0].clientX };
  }, { passive: true });

  window.addEventListener('touchend', function (e) {
    if (!tStart) return;
    var dy = tStart.y - e.changedTouches[0].clientY;
    var dx = tStart.x - e.changedTouches[0].clientX;
    tStart = null;
    if (Math.abs(dy) < 44 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
    /* Amplify so a single swipe crosses the threshold */
    onWheel(dy > 0 ? ACCUM_THRESHOLD + 10 : -(ACCUM_THRESHOLD + 10));
  }, { passive: true });

  /* ── Escape: go back one view ───────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var cur = window._nexaState ? window._nexaState.current : window._nexaCurrentView;
    var idx = ORDER.indexOf(cur);
    if (idx > 0) window.nexaGoTo(ORDER[idx - 1]);
  });

  /* ── Curtain animation ─────────────────────── */
  function curtainTransition(from, to, opts) {
    curtainBusy = true;

    var curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML =
      '<div class="curtain__left"></div>' +
      '<div class="curtain__right"></div>' +
      '<div class="curtain__line"></div>';
    document.body.appendChild(curtain);

    var left  = curtain.querySelector('.curtain__left');
    var right = curtain.querySelector('.curtain__right');
    var line  = curtain.querySelector('.curtain__line');

    function cleanup() {
      if (curtain.parentNode) curtain.parentNode.removeChild(curtain);
      curtainBusy = false;
    }

    if (rmq) {
      /* Reduced motion: instant swap + quick fade */
      _origGoTo(to, { instant: true, noPush: opts.noPush });
      curtain.style.transition = 'opacity 0.25s ease';
      requestAnimationFrame(function () { curtain.style.opacity = '0'; });
      setTimeout(cleanup, 280);
      return;
    }

    var easeOpen  = 'cubic-bezier(0.16,1,0.3,1)';
    var easeClose = 'cubic-bezier(0.7,0,0.84,0)';

    if (from === 'tarifs') {
      /* ────────────────────────────────────────────
         FORWARD : tarifs → devis
         Panels at center (covering) → switch → open
         ──────────────────────────────────────────── */

      /* line visible during the brief cover */
      line.style.opacity = '1';

      /* switch stage while panels cover screen */
      _origGoTo(to, { instant: true, noPush: opts.noPush });

      /* double-RAF to flush paint before animating */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var dur = CURTAIN_DUR + 'ms ' + easeOpen;
          left.style.transition  = 'transform ' + dur;
          right.style.transition = 'transform ' + dur;
          line.style.transition  = 'opacity 180ms ease ' + Math.round(CURTAIN_DUR * 0.45) + 'ms';
          left.style.transform   = 'translateX(-100%)';
          right.style.transform  = 'translateX(100%)';
          line.style.opacity     = '0';
          setTimeout(cleanup, CURTAIN_DUR + 80);
        });
      });

    } else {
      /* ────────────────────────────────────────────
         REVERSE : devis → tarifs
         Panels off-screen → close + devis shrinks
         → switch behind → panels open
         ──────────────────────────────────────────── */

      /* Start panels off-screen */
      left.style.transform  = 'translateX(-100%)';
      right.style.transform = 'translateX(100%)';

      var devisEl = document.getElementById('view-devis');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          /* ① Close panels + shrink devis simultaneously */
          var closeDur = CURTAIN_DUR + 'ms ' + easeClose;
          left.style.transition  = 'transform ' + closeDur;
          right.style.transition = 'transform ' + closeDur;
          left.style.transform   = 'translateX(0)';
          right.style.transform  = 'translateX(0)';

          if (devisEl) {
            devisEl.style.transition = 'transform ' + closeDur + ', opacity ' + closeDur;
            devisEl.style.transform  = 'scale(0.94)';
            devisEl.style.opacity    = '0';
          }

          /* ② Line glows as panels meet */
          setTimeout(function () {
            line.style.transition = 'opacity 130ms ease';
            line.style.opacity    = '1';
          }, Math.round(CURTAIN_DUR * 0.72));

          /* ③ Panels fully closed → switch + open */
          setTimeout(function () {
            /* switch the stage instantly behind the curtain */
            _origGoTo(to, { instant: true, noPush: opts.noPush });

            /* reset devis (now inert/hidden behind curtain) */
            if (devisEl) {
              devisEl.style.transition = 'none';
              devisEl.style.transform  = '';
              devisEl.style.opacity    = '';
              requestAnimationFrame(function () { devisEl.style.transition = ''; });
            }

            /* ④ Open panels to reveal tarifs */
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                var openDur = REVEAL_DUR + 'ms ' + easeOpen;
                left.style.transition  = 'transform ' + openDur;
                right.style.transition = 'transform ' + openDur;
                line.style.transition  = 'opacity 100ms ease';
                left.style.transform   = 'translateX(-100%)';
                right.style.transform  = 'translateX(100%)';
                line.style.opacity     = '0';
                setTimeout(cleanup, REVEAL_DUR + 80);
              });
            });

          }, CURTAIN_DUR + 20);
        });
      });
    }
  }

})();
