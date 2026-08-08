/* ── Mac Intro — rotation 3D + clic pour entrer + scroll-up pour sortir ── */
(function () {
  'use strict';

  var overlay = document.getElementById('mac-intro');
  var wrap    = document.getElementById('mac-intro-wrap');
  var hint    = document.getElementById('mac-intro-hint');
  var bezel   = overlay ? overlay.querySelector('.mac-bezel') : null;

  if (!overlay || !wrap || typeof gsap === 'undefined') return;

  // prefers-reduced-motion → CSS cache déjà l'overlay via display:none
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var state     = 'waiting'; // 'waiting' | 'intro' | 'entering' | 'site' | 'exiting'
  var spinTl    = null;
  var exitTimer = null;

  // Prépare la 3D et cache l'overlay en attendant le loader
  gsap.set(wrap, { transformPerspective: 1200, transformOrigin: 'center center' });
  gsap.set(overlay, { autoAlpha: 0 });
  document.body.style.overflow = 'hidden';

  // ── Lance l'intro une fois le loader disparu ────
  function startIntro() {
    if (state !== 'waiting') return;
    state = 'intro';

    gsap.to(overlay, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' });

    spinTl = gsap.to(wrap, {
      rotationY : 360,
      duration  : 6,
      ease      : 'none',
      repeat    : -1
    });
  }

  var loaderObs  = null;
  var loader     = document.getElementById('loader');
  var hardTimer  = setTimeout(function () {
    if (loaderObs) loaderObs.disconnect();
    startIntro();
  }, 3600);

  if (loader) {
    if (loader.classList.contains('hidden')) {
      clearTimeout(hardTimer);
      setTimeout(startIntro, 200);
    } else {
      loaderObs = new MutationObserver(function () {
        if (loader.classList.contains('hidden')) {
          loaderObs.disconnect();
          clearTimeout(hardTimer);
          setTimeout(startIntro, 300);
        }
      });
      loaderObs.observe(loader, { attributes: true, attributeFilter: ['class'] });
    }
  } else {
    clearTimeout(hardTimer);
    startIntro();
  }

  // ── Entrée (clic ou clavier) ────────────────────
  function enter() {
    if (state !== 'intro') return;
    state = 'entering';

    if (spinTl) spinTl.pause();

    gsap.timeline({
      onComplete: function () {
        state = 'site';
        document.body.style.overflow = '';
        initScrollExit();
      }
    })
      .to(hint,    { autoAlpha: 0, duration: 0.2 }, 0)
      .to(wrap,    { rotationY: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' }, 0)
      .to(wrap,    { scale: 12, duration: 0.9, ease: 'power2.inOut', transformOrigin: 'center center' }, 0.38)
      .to(bezel,   { autoAlpha: 0, duration: 0.3, ease: 'power2.out' }, 0.78)
      .to(overlay, { autoAlpha: 0, duration: 0.38 }, 1.02);
  }

  // ── Sortie (scroll-up depuis le top) ────────────
  function exit() {
    if (state !== 'site') return;
    state = 'exiting';
    document.body.style.overflow = 'hidden';

    gsap.set(wrap,  { scale: 12, rotationY: 0, transformPerspective: 1200 });
    if (bezel) gsap.set(bezel, { autoAlpha: 0 });
    if (hint)  gsap.set(hint,  { autoAlpha: 0 });

    gsap.timeline({
      onComplete: function () {
        state = 'intro';
        if (spinTl) spinTl.restart();
      }
    })
      .to(overlay, { autoAlpha: 1, duration: 0.35 }, 0)
      .to(bezel,   { autoAlpha: 1, duration: 0.35 }, 0.22)
      .to(wrap,    { scale: 1,  duration: 0.9, ease: 'power2.inOut' }, 0.3)
      .to(hint,    { autoAlpha: 1, duration: 0.3 }, 1.0);
  }

  // ── Listeners clic / clavier ────────────────────
  overlay.addEventListener('click', enter);
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
  });

  // ── Scroll-up pour revenir au Mac ───────────────
  function initScrollExit() {
    window.addEventListener('wheel', function (e) {
      if (state !== 'site') return;
      if (window.scrollY > 20) return;
      if (e.deltaY >= 0) return;
      clearTimeout(exitTimer);
      exitTimer = setTimeout(exit, 220);
    }, { passive: true });

    var ty0 = 0;
    window.addEventListener('touchstart', function (e) {
      ty0 = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', function (e) {
      if (state !== 'site') return;
      if (window.scrollY > 20) return;
      if (e.changedTouches[0].clientY - ty0 > 65) {
        clearTimeout(exitTimer);
        exitTimer = setTimeout(exit, 0);
      }
    }, { passive: true });
  }

})();
