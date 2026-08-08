/* =============================================
   NEXA WEB — Main Script
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ── PAGE LOADER ──────────────────────────────
  const loader = document.getElementById('loader');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('hidden'), 1300);
    });
    setTimeout(() => loader.classList.add('hidden'), 3000);
  }

  // ── TUBES ANIMATION (Three.js CDN) ──────────
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) {
    const CDN_URL = 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';
    import(CDN_URL)
      .then(module => {
        const TubesCursor = module.default;
        window.tubesApp = TubesCursor(heroCanvas, {
          tubes: {
            colors: ['#f967fb', '#4c72ff', '#6958d5'],
            lights: {
              intensity: 200,
              colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5']
            }
          }
        });
        heroCanvas.addEventListener('click', () => {
          if (!window.tubesApp) return;
          const rnd = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
          try {
            window.tubesApp.tubes.setColors([rnd(), rnd(), rnd()]);
            window.tubesApp.tubes.setLightsColors([rnd(), rnd(), rnd(), rnd()]);
          } catch (_) {}
        });
      })
      .catch(() => { heroCanvas.style.display = 'none'; });
  }

  // ── SILK SHADER BACKGROUND ──────────────────
  initSilkShader();

  // ── NAVIGATION ──────────────────────────────
  const header  = document.getElementById('site-header');
  const burger  = document.getElementById('nav-burger');
  const navList = document.getElementById('nav-list');

  if (header) {
    let lastScrollY = window.scrollY;
    let ticking     = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        header.classList.toggle('scrolled', y > 60);
        // Cache en scroll bas, montre en scroll haut (seuil 80px pour éviter micro-tremblements)
        if (y > 80) {
          header.classList.toggle('header--hidden', y > lastScrollY);
        } else {
          header.classList.remove('header--hidden');
        }
        lastScrollY = y;
        ticking     = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (burger && navList) {
    const panelBackdrop = document.getElementById('panel-backdrop');

    function closeNav() {
      burger.classList.remove('open');
      navList.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (panelBackdrop) panelBackdrop.classList.remove('open');
    }

    burger.addEventListener('click', () => {
      const isOpen = burger.classList.toggle('open');
      navList.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (panelBackdrop) panelBackdrop.classList.toggle('open', isOpen);
    });

    if (panelBackdrop) panelBackdrop.addEventListener('click', closeNav);

    navList.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navList.classList.contains('open')) closeNav();
    });
  }

  // ── PREFERS-REDUCED-MOTION ────────────────────
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── HERO LINES PARALLAX ───────────────────────
  if (!reduceMotion) {
    const heroLines = document.querySelector('.hero-lines');
    const heroSection = document.querySelector('.hero');
    if (heroLines && heroSection) {
      heroLines.style.transition = 'transform 0.4s ease-out';
      heroSection.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 14;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        heroLines.style.transform = `translate(${x}px, ${y}px)`;
      });
      heroSection.addEventListener('mouseleave', () => {
        heroLines.style.transform = 'translate(0, 0)';
      });
    }
  }

  // ── SCROLL REVEAL ────────────────────────────
  document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('is-visible'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    if (!el.closest('.hero')) revealObserver.observe(el);
  });

  // ── COUNTER ANIMATION ────────────────────────
  const counters = document.querySelectorAll('.stat__num[data-target]');
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── PARALLAX (GSAP ScrollTrigger — 4 depth layers) ──
  (function initParallax() {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Use view-accueil as scroller when in stage mode
    var viewAccueil = document.getElementById('view-accueil');
    if (viewAccueil) ScrollTrigger.defaults({ scroller: viewAccueil });

    var hero = document.querySelector('.hero');
    if (hero) {
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8
        }
      });

      tl.to('.hero__content',  { yPercent: 30, ease: 'none' }, 0)
        .to('.hero__scroll',   { yPercent: 70, ease: 'none' }, 0);
    }

    var morphSection = document.querySelector('.morph-gallery');
    if (morphSection) {
      gsap.fromTo('.mg-sticky',
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.morph-gallery',
            start: 'top bottom',
            end: 'top top',
            scrub: 0.7
          }
        }
      );
    }

  })();

  // ── SMOOTH ANCHOR SCROLL ─────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.getElementById(anchor.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      if (window.__lenis) {
        window.__lenis.scrollTo(target);
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── LENIS SMOOTH SCROLL ──────────────────────
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof Lenis === 'undefined') return;
    var lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  })();

  // ── VELOCITY BLUR (effet 1) ───────────────────
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var targets = Array.from(document.querySelectorAll('.hero__title, .mg-intro__title'));
    var objs    = Array.from(document.querySelectorAll('.scroll-obj'));
    if (!targets.length) return;
    var blurVel = 0;
    gsap.ticker.add(function () {
      var lenis = window.__lenis;
      var raw   = lenis ? Math.abs(lenis.velocity || 0) : 0;
      blurVel  += (Math.min(raw / 55, 1) - blurVel) * 0.1; // lerp
      var needsEffect = blurVel > 0.012;
      var blur  = (blurVel * 8).toFixed(2);
      var scale = (1 + blurVel * 0.15).toFixed(4);
      targets.forEach(function (el) {
        el.style.filter    = needsEffect ? 'blur(' + blur + 'px)' : '';
        el.style.transform = needsEffect ? 'scaleY(' + scale + ')' : '';
      });
      var objBlur = (blurVel * 5).toFixed(2);
      objs.forEach(function (el) {
        el.style.filter = needsEffect ? 'blur(' + objBlur + 'px)' : '';
      });
    });
  })();

  // ── OBJETS TRAVERSANTS (effet 2) ─────────────
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var hero = document.getElementById('hero');
    if (!hero) return;
    var obj1   = document.querySelector('.scroll-obj--1');
    var obj2   = document.querySelector('.scroll-obj--2');
    var obj3   = document.querySelector('.scroll-obj--3');
    var obj4   = document.querySelector('.scroll-obj--4');
    var mobile = window.matchMedia('(max-width: 768px)').matches;
    var amp    = mobile ? 32 : 55;
    var viewAccueil = document.getElementById('view-accueil');
    var base   = { trigger: hero, start: 'top top', end: 'bottom top',
                   scroller: viewAccueil || window };

    if (obj1) gsap.fromTo(obj1,
      { x: '-38vw', rotation: -3 },
      { x: amp + 'vw', rotation: 4, ease: 'none',
        scrollTrigger: Object.assign({}, base, { scrub: 1.8 }) });

    if (obj2) gsap.fromTo(obj2,
      { x: (amp + 2) + 'vw', rotation: 3 },
      { x: '-32vw', rotation: -4, ease: 'none',
        scrollTrigger: Object.assign({}, base, { scrub: 2.3 }) });

    if (obj3 && !mobile) gsap.fromTo(obj3,
      { x: (amp * 0.65) + 'vw', rotation: -2 },
      { x: '-28vw', rotation: 3, ease: 'none',
        scrollTrigger: Object.assign({}, base, { scrub: 3.1 }) });

    if (obj4 && !mobile) gsap.fromTo(obj4,
      { x: '-28vw', rotation: 2 },
      { x: (amp * 0.65) + 'vw', rotation: -3, ease: 'none',
        scrollTrigger: Object.assign({}, base, { scrub: 2.7 }) });
  })();

  // ── NAV DOTS / PROGRESS BAR handled by view-nav.js ──
  // (snap system replaced by 4-view stage navigation)

});

// ─────────────────────────────────────────────
//  BOUTON FLOTTANT "NOS TARIFS"
// ─────────────────────────────────────────────
(function () {
  var floatBtn = document.getElementById('tarifs-float');
  var mgSect   = document.getElementById('morph-gallery');
  if (!floatBtn || !mgSect) return;

  var rmq    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var fillEl = floatBtn.querySelector('.tarifs-float__fill');
  var hoverTimer = null;

  new IntersectionObserver(function (entries) {
    floatBtn.classList.toggle('visible', entries[0].isIntersecting);
  }, { threshold: 0 }).observe(mgSect);

  function navigate() {
    clearTimeout(hoverTimer);
    if (window.nexaGoTo) { window.nexaGoTo('tarifs'); return; }
    if (rmq) { window.location.href = 'tarifs.html'; return; }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.transition = 'transform 0.6s cubic-bezier(.16,.8,.24,1)';
    document.body.style.transform  = 'translateX(-100%)';
    setTimeout(function () { window.location.href = 'tarifs.html'; }, 600);
  }

  function onEnter() {
    if (isMobile) return;
    floatBtn.classList.add('hovering');
    if (rmq) { navigate(); return; }
    hoverTimer = setTimeout(navigate, 400);
  }

  function onLeave() {
    if (isMobile) return;
    clearTimeout(hoverTimer);
    floatBtn.classList.remove('hovering');
    if (fillEl) {
      fillEl.style.transition = 'none';
      fillEl.style.width = '0%';
      requestAnimationFrame(function () { fillEl.style.transition = ''; });
    }
  }

  floatBtn.addEventListener('mouseenter', onEnter);
  floatBtn.addEventListener('mouseleave', onLeave);
  floatBtn.addEventListener('click', navigate);
})();

// ─────────────────────────────────────────────
//  PAGE TARIFS — animations + retour
// ─────────────────────────────────────────────
(function () {
  var backBtn = document.getElementById('tarifs-page-back');
  if (!backBtn) return;

  var navTarifs = document.getElementById('nav-tarifs');
  if (navTarifs) navTarifs.classList.add('nav__link--tarifs-active');

  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var main = document.querySelector('.tarifs-page');

  if (main && !rmq) {
    main.style.opacity = '0';
    main.style.transform = 'translateX(8%)';
    requestAnimationFrame(function () {
      main.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(.16,.8,.24,1)';
      requestAnimationFrame(function () {
        main.style.opacity = '1';
        main.style.transform = 'translateX(0)';
      });
    });
  }

  function goBack() {
    if (rmq) { window.location.href = 'index.html'; return; }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.transition = 'transform 0.5s cubic-bezier(.76,0,.24,1)';
    document.body.style.transform  = 'translateX(100%)';
    setTimeout(function () { window.location.href = 'index.html'; }, 500);
  }

  backBtn.addEventListener('click', goBack);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') goBack();
  });
})();

// ─────────────────────────────────────────────
//  SILK SHADER — WebGL1, no libraries
// ─────────────────────────────────────────────
function initSilkShader() {
  const canvas = document.getElementById('silk-bg');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.style.display = 'none'; return; }

  // Vertex shader — fullscreen triangle
  const VS = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

  // Fragment shader — "Silk" (21st.dev Shader Builder)
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;

#define u_resolution  u_scene.xy
#define u_time        u_scene.z
#define u_colorCount  u_scene.w
#define u_scale       u_shape.x
#define u_intensity   u_shape.y
#define u_paramA      u_shape.z
#define u_warp        u_shape.w
#define u_detail      u_surface.x
#define u_contrast    u_surface.y
#define u_brightness  u_surface.z
#define u_saturation  u_surface.w
#define u_hue         u_finish.x
#define u_vignette    u_finish.y
#define u_blur        u_finish.z
#define u_grain       u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed        u_transform.x
#else
#define u_seed        mod(u_transform.x, 31.0)
#endif
#define u_rotate      u_transform.y
#define u_drift       u_transform.z
#define u_oklab       u_transform.w
#define u_offset      u_space.xy
#define u_mouse       u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect   u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius   u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(15731.743, 7892.321) * n);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708*c.r + 0.5363325363*c.g + 0.0514459929*c.b;
  float m = 0.2119034982*c.r + 0.6806995451*c.g + 0.1073969566*c.b;
  float s = 0.0883024619*c.r + 0.2817188376*c.g + 0.6299787005*c.b;
  l = pow(max(l,0.0),1.0/3.0); m = pow(max(m,0.0),1.0/3.0); s = pow(max(s,0.0),1.0/3.0);
  return vec3(
     0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
     1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
     0.0259040371*l + 0.7827717662*m - 0.8086757660*s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774*c.y + 0.2158037573*c.z;
  float m = c.x - 0.1055613458*c.y - 0.0638541728*c.z;
  float s = c.x - 0.0894841775*c.y - 1.2914855480*c.z;
  l=l*l*l; m=m*m*m; s=s*s*s;
  return vec3(
     4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
    -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
    -0.0041960863*l - 0.7034186147*m + 1.7076147010*s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la,lb,t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i+1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299,0.596,0.211, 0.587,-0.274,-0.523, 0.114,-0.322,0.312);
  const mat3 toRGB = mat3(1.0,1.0,1.0, 0.956,-0.272,-1.106, 0.621,-0.647,1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y*ca - yiq.z*sa, yiq.y*sa + yiq.z*ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  vec2 q = p * 1.6;
  float amp = 0.25 + u_intensity * 0.85;
  for (float i = 1.0; i < 5.0; i += 1.0) {
    q.x += amp / i * cos(i * 2.4 * q.y + t * 0.8 + u_seed);
    q.y += amp / i * cos(i * 1.7 * q.x + t * 0.6);
  }
  return palette(0.5 + 0.5 * sin(q.x + q.y));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  if (u_cursorPresence > 0.001) {
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc,-cs,cs,cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(cursorDistance / max(u_cursorRadius,0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr,-sr,sr,cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }

  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x,0.0), p + vec2(pe,0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x,0.0), p - vec2(pe,0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0,uvE.y), p + vec2(0.0,pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0,uvE.y), p - vec2(0.0,pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }

  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(gl_FragCoord.xy + vec2(u_seed*17.0, u_seed*31.0)) - 0.5) * u_grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  // Compile helper
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Silk shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Silk shader link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // Fullscreen triangle buffer
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uScene     = gl.getUniformLocation(prog, 'u_scene');
  const uShape     = gl.getUniformLocation(prog, 'u_shape');
  const uSurface   = gl.getUniformLocation(prog, 'u_surface');
  const uFinish    = gl.getUniformLocation(prog, 'u_finish');
  const uTransform = gl.getUniformLocation(prog, 'u_transform');
  const uSpace     = gl.getUniformLocation(prog, 'u_space');
  const uCursor    = gl.getUniformLocation(prog, 'u_cursor');
  const colorLocs  = Array.from({length: 8}, (_, i) =>
    gl.getUniformLocation(prog, `u_colors[${i}]`));

  // Set static uniforms (exact values from spec)
  // Colors: #101010, #F5F5F5, #B0B0B0, #3A3A3A + 4 unused zeros
  const COLORS = [
    [0.063, 0.063, 0.063],
    [0.961, 0.961, 0.961],
    [0.690, 0.690, 0.690],
    [0.227, 0.227, 0.227],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ];
  COLORS.forEach((c, i) => gl.uniform3fv(colorLocs[i], c));

  // u_shape:     scale=1.94, intensity=0.58, paramA=0.48, warp=0.04
  // u_surface:   detail=2.98, contrast=1.31, brightness=0.00, saturation=1.00
  // u_finish:    hue=0.00, vignette=0.15, blur=0.001, grain=0.01
  // u_transform: seed=3195, rotation=4.33, drift=0.06, oklab=0.0
  // u_space:     offset.x=-0.10, offset.y=0.02, pointer.xy=0 (cursor off)
  // u_cursor:    presence=0 (cursor off), effect=2, strength=0.65, radius=0.46
  gl.uniform4f(uShape,      1.94,   0.58,  0.48,  0.04);
  gl.uniform4f(uSurface,    2.98,   1.31,  0.00,  1.00);
  gl.uniform4f(uFinish,     0.00,   0.15,  0.001, 0.01);
  gl.uniform4f(uTransform,  3195.0, 4.33,  0.06,  0.0);
  gl.uniform4f(uSpace,     -0.10,   0.02,  0.0,   0.0);
  gl.uniform4f(uCursor,     0.0,    2.0,   0.65,  0.46);

  // Resize — cap DPR at 2
  const DPR = Math.min(devicePixelRatio, 2);
  function resize() {
    canvas.width  = Math.round(window.innerWidth  * DPR);
    canvas.height = Math.round(window.innerHeight * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // RAF render loop
  let rafId = null;
  const t0 = performance.now();

  function render() {
    const secs = (performance.now() - t0) / 1000;
    // u_scene: width, height, time * 0.56 (speed 24/100), colorCount=4
    gl.uniform4f(uScene, canvas.width, canvas.height, secs * 0.56, 4.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(render);
  }

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(render);
    }
  });

  rafId = requestAnimationFrame(render);
}
