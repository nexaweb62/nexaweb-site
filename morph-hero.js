/* =============================================
   NEXA WEB — Scroll Morph Hero (vanilla JS)
   Port of scroll-morph-hero React/Framer Motion
   ============================================= */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────
  const TOTAL   = 20;
  const MAX_VS  = 3000; // virtual scroll range

  const IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80",
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=80",
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=300&q=80",
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=300&q=80",
    "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=300&q=80",
  ];

  // ── Utils ────────────────────────────────────
  const lerp  = (a, b, t) => a * (1 - t) + b * t;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  // ── MorphHero class ──────────────────────────
  function MorphHero(container) {
    this.container   = container;
    this.inner       = container.querySelector('.morph-inner');
    this.introEl     = container.querySelector('.morph-intro-text');
    this.contentEl   = container.querySelector('.morph-content-text');
    this.scrollHint  = container.querySelector('.morph-scroll-hint');

    this.cards  = [];
    this.phase  = 'scatter'; // scatter → line → circle
    this.vs     = 0;         // virtual scroll position

    // Spring smoothed values
    this.morphS    = 0; // 0 = circle, 1 = arc
    this.rotateS   = 0; // shuffle angle (degrees)
    this.parallaxS = 0; // mouse parallax (px)

    // Target values
    this.morphT    = 0;
    this.rotateT   = 0;
    this.parallaxT = 0;

    this.cw = 0; // container width
    this.ch = 0; // container height

    // Per-card state (current spring position)
    this.cur      = [];
    this.scatter  = [];

    this._init();
  }

  MorphHero.prototype._init = function () {
    this._genScatter();
    this._buildCards();
    this._watchSize();
    this._bindScroll();
    this._bindMouse();
    this._introSequence();
    this._raf();
  };

  // Random scatter positions (generated once)
  MorphHero.prototype._genScatter = function () {
    for (let i = 0; i < TOTAL; i++) {
      const s = {
        x:        (Math.random() - 0.5) * 1400,
        y:        (Math.random() - 0.5) * 800,
        rotation: (Math.random() - 0.5) * 180,
        scale:    0.5,
        opacity:  0,
      };
      this.scatter.push(s);
      this.cur.push({ ...s });
    }
  };

  // Create card DOM nodes and append to inner
  MorphHero.prototype._buildCards = function () {
    IMAGES.slice(0, TOTAL).forEach((src, i) => {
      const el = document.createElement('div');
      el.className = 'morph-card';
      el.innerHTML =
        '<div class="morph-card__inner">' +
          '<div class="morph-card__front">' +
            '<img src="' + src + '" alt="réalisation ' + (i + 1) + '" loading="lazy">' +
            '<div class="morph-card__shine"></div>' +
          '</div>' +
          '<div class="morph-card__back">' +
            '<span class="morph-card__back-label">Voir</span>' +
          '</div>' +
        '</div>';
      this.inner.appendChild(el);
      this.cards.push(el);
    });
  };

  // ResizeObserver for container dimensions
  MorphHero.prototype._watchSize = function () {
    const update = () => {
      this.cw = this.container.offsetWidth;
      this.ch = this.container.offsetHeight;
    };
    update();
    new ResizeObserver(update).observe(this.container);
  };

  // Virtual scroll — only intercept wheel while within bounds
  MorphHero.prototype._bindScroll = function () {
    const self = this;
    this.container.addEventListener('wheel', function (e) {
      const next = self.vs + e.deltaY;
      if (next >= 0 && next <= MAX_VS) {
        e.preventDefault();
        self.vs = clamp(next, 0, MAX_VS);
      }
    }, { passive: false });

    let ty = 0;
    this.container.addEventListener('touchstart', function (e) {
      ty = e.touches[0].clientY;
    }, { passive: true });
    this.container.addEventListener('touchmove', function (e) {
      const dy = ty - e.touches[0].clientY;
      ty = e.touches[0].clientY;
      self.vs = clamp(self.vs + dy, 0, MAX_VS);
    }, { passive: false });
  };

  // Mouse parallax
  MorphHero.prototype._bindMouse = function () {
    const self = this;
    this.container.addEventListener('mousemove', function (e) {
      const r  = self.container.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      self.parallaxT = nx * 100;
    });
    this.container.addEventListener('mouseleave', function () {
      self.parallaxT = 0;
    });
  };

  // Timed intro: scatter → line → circle
  MorphHero.prototype._introSequence = function () {
    const self = this;
    setTimeout(function () { self.phase = 'line'; },   500);
    setTimeout(function () { self.phase = 'circle'; }, 2500);
  };

  // Calculate target position for card i based on current phase + spring values
  MorphHero.prototype._target = function (i) {
    const phase = this.phase;
    const morph = this.morphS;
    const rot   = this.rotateS;
    const par   = this.parallaxS;
    const w     = this.cw;
    const h     = this.ch;

    if (phase === 'scatter') return this.scatter[i];

    if (phase === 'line') {
      const sp = 70; // card spacing
      return { x: i * sp - (TOTAL * sp) / 2, y: 0, rotation: 0, scale: 1, opacity: 1 };
    }

    // ── Circle ──────────────────────────────
    const minDim  = Math.min(w, h);
    const cRadius = Math.min(minDim * 0.34, 260);
    const cAngle  = (i / TOTAL) * 360;
    const cRad    = (cAngle * Math.PI) / 180;
    const cx      = Math.cos(cRad) * cRadius;
    const cy      = Math.sin(cRad) * cRadius;
    const cRot    = cAngle + 90;

    // ── Arc ─────────────────────────────────
    const mobile  = w < 768;
    const baseR   = Math.min(w, h * 1.5);
    const arcR    = baseR * (mobile ? 1.4 : 1.1);
    const apexY   = h * (mobile ? 0.35 : 0.25);
    const centerY = apexY + arcR;
    const spread  = mobile ? 100 : 130;
    const startA  = -90 - spread / 2;
    const step    = spread / (TOTAL - 1);

    const scrollProg = clamp(rot / 360, 0, 1);
    const bounded    = -scrollProg * spread * 0.8;
    const arcAngle   = startA + i * step + bounded;
    const arcRad     = (arcAngle * Math.PI) / 180;
    const ax         = Math.cos(arcRad) * arcR + par;
    const ay         = Math.sin(arcRad) * arcR + centerY;
    const aScale     = mobile ? 1.4 : 1.8;

    // ── Interpolate circle → arc ─────────────
    return {
      x:        lerp(cx, ax, morph),
      y:        lerp(cy, ay, morph),
      rotation: lerp(cRot, arcAngle + 90, morph),
      scale:    lerp(1, aScale, morph),
      opacity:  1,
    };
  };

  // Per-frame update
  MorphHero.prototype._tick = function () {
    const sf = 0.075; // spring factor ≈ stiffness 40 / damping 15
    const vs = this.vs;

    // Spring targets
    this.morphT   = clamp(vs / 600, 0, 1);
    this.rotateT  = clamp(((vs - 600) / 2400) * 360, 0, 360);

    // Smooth
    this.morphS    += (this.morphT   - this.morphS)    * sf;
    this.rotateS   += (this.rotateT  - this.rotateS)   * sf;
    this.parallaxS += (this.parallaxT - this.parallaxS) * 0.055;

    // ── Intro text ──────────────────────────
    if (this.introEl) {
      const op = (this.phase === 'circle')
        ? clamp(1 - this.morphS * 2, 0, 1)
        : 0;
      this.introEl.style.opacity = op;
    }

    // ── Scroll hint ─────────────────────────
    if (this.scrollHint) {
      this.scrollHint.style.opacity = (this.phase === 'circle' && this.morphS < 0.1) ? 1 : 0;
    }

    // ── Content text ────────────────────────
    if (this.contentEl) {
      const t = clamp((this.morphS - 0.8) / 0.2, 0, 1);
      this.contentEl.style.opacity   = t;
      this.contentEl.style.transform = 'translateY(' + lerp(22, 0, t) + 'px)';
    }

    // ── Cards ───────────────────────────────
    for (let i = 0; i < this.cards.length; i++) {
      const tgt = this._target(i);
      const cur = this.cur[i];

      cur.x        += (tgt.x        - cur.x)        * sf;
      cur.y        += (tgt.y        - cur.y)         * sf;
      cur.rotation += (tgt.rotation - cur.rotation)  * sf;
      cur.scale    += (tgt.scale    - cur.scale)     * sf;
      cur.opacity  += (tgt.opacity  - cur.opacity)   * sf;

      this.cards[i].style.transform =
        'translate(calc(-50% + ' + cur.x + 'px), calc(-50% + ' + cur.y + 'px))' +
        ' rotate(' + cur.rotation + 'deg)' +
        ' scale(' + cur.scale + ')';
      this.cards[i].style.opacity = cur.opacity;
    }
  };

  // RAF loop — pauses on tab hidden
  MorphHero.prototype._raf = function () {
    let active = !document.hidden;
    const self = this;

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

  // ── Boot ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('morph-container');
    if (el) new MorphHero(el);
  });

})();
