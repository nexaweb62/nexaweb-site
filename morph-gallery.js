/* =============================================
   NEXA WEB — Morph Gallery
   Cards des pages du site avec animation
   scatter → line → circle → arc + viewer iframe
   ============================================= */

(function () {
  'use strict';

  var TOTAL   = 20;
  var MAX_VS  = 3000;

  var PAGES = [
    { href: 'tarifs.html',                label: 'Tarifs',       cat: 'Pricing',   accent: '#4c72ff' },
    { href: 'devis.html',                 label: 'Devis',        cat: 'Devis',     accent: '#c026d3' },
    { href: 'blog.html',                  label: 'Blog',         cat: 'Articles',  accent: '#4c72ff' },
    { href: 'contact.html',               label: 'Contact',      cat: 'Contact',   accent: '#c026d3' },
    { href: 'site-vitrine.html',          label: 'Vitrine',      cat: 'Service',   accent: '#4c72ff' },
    { href: 'ecommerce.html',             label: 'E-Commerce',   cat: 'Service',   accent: '#c026d3' },
    { href: 'seo.html',                   label: 'SEO',          cat: 'Service',   accent: '#4c72ff' },
    { href: 'rendez-vous.html',           label: 'Rendez-vous',  cat: 'Planning',  accent: '#c026d3' },
    { href: 'contrat.html',               label: 'CGV',          cat: 'Légal',     accent: '#4c72ff' },
    { href: 'merci.html',                 label: 'Merci',        cat: 'Confirm',   accent: '#c026d3' },
    { href: 'demo-beaute.html',           label: 'Beauté',       cat: 'Démo',      accent: '#4c72ff' },
    { href: 'demo-boulangerie.html',      label: 'Boulangerie',  cat: 'Démo',      accent: '#c026d3' },
    { href: 'demo-conseil.html',          label: 'Conseil',      cat: 'Démo',      accent: '#4c72ff' },
    { href: 'demo-garage.html',           label: 'Garage',       cat: 'Démo',      accent: '#c026d3' },
    { href: 'demo-plombier.html',         label: 'Plombier',     cat: 'Démo',      accent: '#4c72ff' },
    { href: 'demo-restaurant.html',       label: 'Restaurant',   cat: 'Démo',      accent: '#c026d3' },
    { href: 'projet-atelier-dubois.html', label: 'Atelier',      cat: 'Projet',    accent: '#4c72ff' },
    { href: 'projet-boutique-lea.html',   label: 'Boutique',     cat: 'Projet',    accent: '#c026d3' },
    { href: 'projet-cabinet-martin.html', label: 'Cabinet',      cat: 'Projet',    accent: '#4c72ff' },
    { href: 'mentions-legales.html',      label: 'Mentions',     cat: 'Légal',     accent: '#c026d3' },
  ];

  var ICONS = {
    'Pricing':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    'Devis':    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    'Articles': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="13" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    'Contact':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    'Service':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    'Planning': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'Légal':    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    'Confirm':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'Démo':     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    'Projet':   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  };

  var lerp  = function (a, b, t) { return a * (1 - t) + b * t; };
  var clamp = function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); };

  /* ── MorphGallery ───────────────────────────── */
  function MorphGallery(container) {
    this.container  = container;
    this.scene      = container.querySelector('.mg-scene');
    this.introEl    = container.querySelector('.mg-intro');
    this.contentEl  = container.querySelector('.mg-content');
    this.scrollHint = container.querySelector('.mg-scroll-hint');

    this.cards  = [];
    this.phase  = 'scatter';
    this.vs     = 0;

    this.morphS    = 0; this.morphT    = 0;
    this.rotateS   = 0; this.rotateT   = 0;
    this.parallaxS = 0; this.parallaxT = 0;

    this.cw = 0;
    this.ch = 0;
    this.cur     = [];
    this.scatter = [];

    this.viewerOpen    = false;
    this.viewerAge     = 0;
    this.mouseVY       = 0;
    this.lastMouseY    = 0;
    this.lastMouseTime = 0;
    this.vsScrollStart = null; // scroll offset when circle phase activates

    this._init();
  }

  MorphGallery.prototype._init = function () {
    this._genScatter();
    this._buildCards();
    this._buildViewer();
    this._watchSize();
    this._bindScroll();
    this._bindMouse();
    this._raf();
    this._waitForViewport();
  };

  /* Start intro sequence when section enters the viewport */
  MorphGallery.prototype._waitForViewport = function () {
    var self    = this;
    var started = false;

    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !started) {
        started = true;
        io.disconnect();
        self._introSequence();
      }
    }, { threshold: 0.15 });

    io.observe(this.container);
  };

  /* Random scatter start positions */
  MorphGallery.prototype._genScatter = function () {
    for (var i = 0; i < TOTAL; i++) {
      var s = {
        x:        (Math.random() - 0.5) * 1400,
        y:        (Math.random() - 0.5) * 800,
        rotation: (Math.random() - 0.5) * 180,
        scale:    0.5,
        opacity:  0,
      };
      this.scatter.push(s);
      this.cur.push({ x: s.x, y: s.y, rotation: s.rotation, scale: s.scale, opacity: s.opacity });
    }
  };

  /* Build card DOM nodes */
  MorphGallery.prototype._buildCards = function () {
    var self = this;
    PAGES.forEach(function (page, i) {
      var el = document.createElement('div');
      el.className = 'mg-card';
      el.style.setProperty('--ca', page.accent);
      el.innerHTML =
        '<div class="mg-card__glow"></div>' +
        '<span class="mg-card__cat">' + page.cat + '</span>' +
        '<div class="mg-card__icon">' + (ICONS[page.cat] || ICONS['Service']) + '</div>' +
        '<span class="mg-card__label">' + page.label + '</span>' +
        '<div class="mg-card__shine"></div>';

      el.addEventListener('click', function () {
        if (self.viewerOpen) return;
        self._openViewer(page.href, el);
      });

      self.scene.appendChild(el);
      self.cards.push(el);
    });
  };

  /* Build the fullscreen page viewer */
  MorphGallery.prototype._buildViewer = function () {
    var self = this;
    var v = document.createElement('div');
    v.id        = 'mg-viewer';
    v.className = 'mg-viewer';
    v.setAttribute('aria-hidden', 'true');

    v.innerHTML =
      '<div class="mg-viewer__bar" id="mg-bar">' +
        '<button class="mg-viewer__close" id="mg-close" aria-label="Fermer">&#x2715;</button>' +
        '<span class="mg-viewer__hint">&#x2191; Glissez vers le haut pour fermer</span>' +
      '</div>' +
      '<iframe class="mg-viewer__frame" id="mg-frame" src="" title="Page Nexa Web" sandbox="allow-scripts allow-forms allow-popups"></iframe>';

    document.body.appendChild(v);

    /* Close button */
    document.getElementById('mg-close').addEventListener('click', function () {
      self._closeViewer();
    });

    /* Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.viewerOpen) self._closeViewer();
    });

    /* Mouse-velocity gesture on topbar (upward swipe = close) */
    var bar = document.getElementById('mg-bar');
    bar.addEventListener('mousemove', function (e) {
      var now = Date.now();
      var dt  = now - self.lastMouseTime;
      if (dt > 8 && self.viewerOpen && (now - self.viewerAge) > 600) {
        var vy = (e.clientY - self.lastMouseY) / dt * 1000; // px/s
        if (vy < -550) self._closeViewer();
        self.lastMouseY    = e.clientY;
        self.lastMouseTime = now;
      }
    });
  };

  /* Open viewer: scale from card origin */
  MorphGallery.prototype._openViewer = function (href, cardEl) {
    this.viewerOpen = true;
    this.viewerAge  = Date.now();

    var viewer = document.getElementById('mg-viewer');
    var frame  = document.getElementById('mg-frame');

    var rect = cardEl.getBoundingClientRect();
    var ox   = ((rect.left + rect.width  * 0.5) / window.innerWidth  * 100).toFixed(1) + '%';
    var oy   = ((rect.top  + rect.height * 0.5) / window.innerHeight * 100).toFixed(1) + '%';
    viewer.style.transformOrigin = ox + ' ' + oy;

    frame.src = href;
    viewer.setAttribute('aria-hidden', 'false');
    viewer.classList.add('mg-viewer--open');

    this.lastMouseY    = window.innerHeight * 0.5;
    this.lastMouseTime = Date.now();
  };

  /* Close viewer: shrink back */
  MorphGallery.prototype._closeViewer = function () {
    if (!this.viewerOpen) return;
    var self   = this;
    var viewer = document.getElementById('mg-viewer');
    viewer.classList.remove('mg-viewer--open');
    viewer.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      document.getElementById('mg-frame').src = '';
      self.viewerOpen = false;
    }, 520);
  };

  /* ResizeObserver — dimensions from the sticky viewport, not the tall outer section */
  MorphGallery.prototype._watchSize = function () {
    var self   = this;
    var sticky = this.container.querySelector('.mg-sticky') || this.container;
    function upd() {
      self.cw = sticky.offsetWidth;
      self.ch = sticky.offsetHeight;
    }
    upd();
    if (window.ResizeObserver) new ResizeObserver(upd).observe(sticky);
    else window.addEventListener('resize', upd);
  };

  /* Real scroll drives vs — listens on view container when stage is active */
  MorphGallery.prototype._bindScroll = function () {
    var self = this;
    function onScroll() {
      if (self.viewerOpen || self.vsScrollStart === null) return;
      var scrolled = -self.container.getBoundingClientRect().top;
      self.vs = clamp(scrolled - self.vsScrollStart, 0, MAX_VS);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    var viewEl = document.getElementById('view-accueil');
    if (viewEl) viewEl.addEventListener('scroll', onScroll, { passive: true });
  };

  /* Mouse parallax */
  MorphGallery.prototype._bindMouse = function () {
    var self = this;
    this.container.addEventListener('mousemove', function (e) {
      if (self.viewerOpen) return;
      var r  = self.container.getBoundingClientRect();
      var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      self.parallaxT = nx * 80;
    });
    this.container.addEventListener('mouseleave', function () {
      self.parallaxT = 0;
    });
  };

  /* Timed intro: scatter → line → circle, then unlock scroll-driven arc */
  MorphGallery.prototype._introSequence = function () {
    var self = this;
    setTimeout(function () { self.phase = 'line'; }, 300);
    setTimeout(function () {
      self.phase = 'circle';
      /* Capture scroll offset at this moment — vs=0 starts here */
      self.vsScrollStart = -self.container.getBoundingClientRect().top;
    }, 2000);
  };

  /* Calculate target position for card i */
  MorphGallery.prototype._target = function (i) {
    var phase  = this.phase;
    var morph  = this.morphS;
    var rot    = this.rotateS;
    var par    = this.parallaxS;
    var w      = this.cw;
    var h      = this.ch;

    if (phase === 'scatter') return this.scatter[i];

    if (phase === 'line') {
      var sp = 74;
      return { x: i * sp - (TOTAL * sp) / 2, y: 0, rotation: 0, scale: 1, opacity: 1 };
    }

    /* ── Circle ─────────────────────── */
    var minDim  = Math.min(w, h);
    var cRadius = Math.min(minDim * 0.33, 240);
    var cAngle  = (i / TOTAL) * 360;
    var cRad    = (cAngle * Math.PI) / 180;
    var cx      = Math.cos(cRad) * cRadius;
    var cy      = Math.sin(cRad) * cRadius;
    var cRot    = cAngle + 90;

    /* ── Arc ────────────────────────── */
    var mobile   = w < 768;
    var baseR    = Math.min(w, h * 1.5);
    var arcR     = baseR * (mobile ? 1.4 : 1.1);
    var apexY    = h * (mobile ? 0.35 : 0.25);
    var centerY  = apexY + arcR;
    var spread   = mobile ? 100 : 130;
    var startA   = -90 - spread / 2;
    var step     = spread / (TOTAL - 1);
    var scrollP  = clamp(rot / 360, 0, 1);
    var bounded  = -scrollP * spread * 0.8;
    var arcAngle = startA + i * step + bounded;
    var arcRad   = (arcAngle * Math.PI) / 180;
    var ax       = Math.cos(arcRad) * arcR + par;
    var ay       = Math.sin(arcRad) * arcR + centerY;
    var aScale   = mobile ? 1.4 : 1.8;

    return {
      x:        lerp(cx, ax, morph),
      y:        lerp(cy, ay, morph),
      rotation: lerp(cRot, arcAngle + 90, morph),
      scale:    lerp(1, aScale, morph),
      opacity:  1,
    };
  };

  /* Per-frame spring update */
  MorphGallery.prototype._tick = function () {
    var sf = 0.075;

    this.morphT  = clamp(this.vs / 600, 0, 1);
    this.rotateT = clamp(((this.vs - 600) / 2400) * 360, 0, 360);

    this.morphS    += (this.morphT    - this.morphS)    * sf;
    this.rotateS   += (this.rotateT   - this.rotateS)   * sf;
    this.parallaxS += (this.parallaxT - this.parallaxS) * 0.055;

    /* Intro text */
    if (this.introEl) {
      var op = (this.phase === 'circle') ? clamp(1 - this.morphS * 2, 0, 1) : 0;
      this.introEl.style.opacity = op;
    }
    if (this.scrollHint) {
      this.scrollHint.style.opacity = (this.phase === 'circle' && this.morphS < 0.08) ? 1 : 0;
    }
    /* Content text (fades in when arc is fully formed) */
    if (this.contentEl) {
      var t = clamp((this.morphS - 0.8) / 0.2, 0, 1);
      this.contentEl.style.opacity   = t;
      this.contentEl.style.transform = 'translateX(-50%) translateY(' + lerp(20, 0, t) + 'px)';
    }

    /* Cards spring positions */
    for (var i = 0; i < this.cards.length; i++) {
      var tgt = this._target(i);
      var cur = this.cur[i];
      cur.x        += (tgt.x        - cur.x)        * sf;
      cur.y        += (tgt.y        - cur.y)         * sf;
      cur.rotation += (tgt.rotation - cur.rotation)  * sf;
      cur.scale    += (tgt.scale    - cur.scale)     * sf;
      cur.opacity  += (tgt.opacity  - cur.opacity)   * sf;
      this.cards[i].style.transform =
        'translate(calc(-50% + ' + cur.x + 'px), calc(-50% + ' + cur.y + 'px))' +
        ' rotate(' + cur.rotation + 'deg)' +
        ' scale(' + cur.scale + ')';
      this.cards[i].style.setProperty('--rot', cur.rotation.toFixed(2) + 'deg');
      this.cards[i].style.opacity = cur.opacity;
    }
  };

  /* RAF loop — pauses when tab is hidden */
  MorphGallery.prototype._raf = function () {
    var self   = this;
    var active = !document.hidden;

    function loop() {
      self._tick();
      if (active) requestAnimationFrame(loop);
    }

    document.addEventListener('visibilitychange', function () {
      active = !document.hidden;
      if (active) requestAnimationFrame(loop);
    });

    requestAnimationFrame(loop);
  };

  /* ── Boot ────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('morph-gallery');
    if (el) new MorphGallery(el);
  });

})();
