/* =============================================
   NEXA WEB — Script principal
   Modèle : Denmu · One-page · Dark
   ============================================= */
'use strict';

/* ── CONSTANTES GLOBALES ─────────────────────── */
const RMQ = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── GSAP ────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

/* ── FPS MONITOR (console dev, aucun impact prod) */
(function initFPS() {
  let last   = performance.now();
  let frames = 0;
  (function tick(now) {
    frames++;
    if (now - last >= 1000) {
      const fps = Math.round(frames * 1000 / (now - last));
      if (fps < 55) console.warn(`[NEXA FPS] ${fps} fps — scroll potentiellement saccadé`);
      frames = 0;
      last   = now;
    }
    requestAnimationFrame(tick);
  })(performance.now());
})();

/* ── LENIS SMOOTH SCROLL ─────────────────────── */
let lenis = null;
(function initLenis() {
  if (RMQ) return;
  if (typeof Lenis === 'undefined') {
    console.warn('[NEXA] Lenis non chargé — scroll natif utilisé.');
    return;
  }
  lenis = new Lenis({
    duration: 1.1,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
})();

/* ── HEADER AU SCROLL ────────────────────────── */
(function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  function check() {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }
  window.addEventListener('scroll', check, { passive: true });
  check();

  /* Lien actif selon la section visible */
  const links   = header.querySelectorAll('.nav__link[href^="#"]');
  const targets = Array.from(links).map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

  function setActive() {
    const scrollMid = window.scrollY + window.innerHeight / 3;
    let active = targets[0];
    targets.forEach(t => { if (t.offsetTop <= scrollMid) active = t; });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + active.id);
    });
  }
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
})();

/* ── SCROLL DOUX VERS LES ANCRES ─────────────── */
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = document.querySelector(anchor.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (lenis) {
    lenis.scrollTo(target, { offset: -60, duration: 1.0 });
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* ── SILK SHADER (WebGL1) ─────────────────────
   Position fixed, z-index: -1
   Visible uniquement dans .s-cta
   (autres sections ont bg solide qui le couvre)
   ──────────────────────────────────────────── */
(function initSilkShader() {
  const canvas = document.getElementById('silk-bg');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.style.display = 'none'; return; }

  /* Vertex shader — triangle plein écran */
  const VS = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  /* Fragment shader — Silk noise */
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 u_colors[8];
uniform vec4 u_scene,u_shape,u_surface,u_finish,u_transform,u_space;
#define u_resolution u_scene.xy
#define u_time       u_scene.z
#define u_colorCount u_scene.w
#define u_scale      u_shape.x
#define u_intensity  u_shape.y
#define u_warp       u_shape.w
#define u_detail     u_surface.x
#define u_contrast   u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue        u_finish.x
#define u_vignette   u_finish.y
#define u_blur       u_finish.z
#define u_grain      u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x,31.0)
#endif
#define u_rotate u_transform.y
#define u_drift  u_transform.z
#define u_oklab  u_transform.w
#define u_offset u_space.xy
float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}
float grainHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17,9.2);a*=0.5;}return v;}
vec3 srgbToLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}
vec3 linearToSrgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0)),vec3(1.0/2.4))-.055,step(.0031308,c));}
vec3 linToOklab(vec3 c){float l=pow(max(.4122214708*c.r+.5363325363*c.g+.0514459929*c.b,0.),1./3.),m=pow(max(.2119034982*c.r+.6806995451*c.g+.1073969566*c.b,0.),1./3.),s=pow(max(.0883024619*c.r+.2817188376*c.g+.6299787005*c.b,0.),1./3.);return vec3(.2104542553*l+.7936177850*m-.0040720468*s,1.9779984951*l-2.4285922050*m+.4505937099*s,.0259040371*l+.7827717662*m-.8086757660*s);}
vec3 oklabToLin(vec3 c){float l=c.x+.3963377774*c.y+.2158037573*c.z,m=c.x-.1055613458*c.y-.0638541728*c.z,s=c.x-.0894841775*c.y-1.2914855480*c.z;l*=l*l;m*=m*m;s*=s*s;return vec3(4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s);}
vec3 mixColour(vec3 a,vec3 b,float t){if(u_oklab>.5){vec3 la=linToOklab(srgbToLinear(a)),lb=linToOklab(srgbToLinear(b));return clamp(linearToSrgb(oklabToLin(mix(la,lb,t))),0.,1.);}return mix(a,b,t);}
vec3 palette(float x){float n=max(u_colorCount-1.,1.),f=clamp(x,0.,1.)*n;vec3 col=u_colors[0];for(int i=0;i<7;i++){if(float(i)<n)col=mixColour(col,u_colors[i+1],smoothstep(0.,1.,clamp(f-float(i),0.,1.)));}return col;}
vec3 shade(vec2 uv,vec2 p,float t){vec2 q=p*1.6;float amp=.25+u_intensity*.85;for(float i=1.;i<5.;i+=1.){q.x+=amp/i*cos(i*2.4*q.y+t*.8+u_seed);q.y+=amp/i*cos(i*1.7*q.x+t*.6);}return palette(.5+.5*sin(q.x+q.y));}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution.xy;
  vec2 p=(gl_FragCoord.xy-.5*u_resolution.xy)/min(u_resolution.x,u_resolution.y);
  uv=p*min(u_resolution.x,u_resolution.y)/u_resolution.xy+.5;
  p*=u_scale;
  if(abs(u_rotate)>.0001){float cr=cos(u_rotate),sr=sin(u_rotate);p=mat2(cr,-sr,sr,cr)*p;}
  p+=u_offset;
  if(u_drift>.0001)p+=u_drift*vec2(sin(u_time*.31),cos(u_time*.23));
  if(u_warp>0.)p+=u_warp*(vec2(fbm(p*u_detail+u_seed),fbm(p*u_detail+vec2(5.2,1.3)))-.5);
  vec3 col;
  if(u_blur>0.){float e=u_blur,pe=e*u_scale;vec2 uvE=vec2(e)*min(u_resolution.x,u_resolution.y)/u_resolution.xy;col=shade(uv,p,u_time)*.36+shade(uv+vec2(uvE.x,0.),p+vec2(pe,0.),u_time)*.16+shade(uv-vec2(uvE.x,0.),p-vec2(pe,0.),u_time)*.16+shade(uv+vec2(0.,uvE.y),p+vec2(0.,pe),u_time)*.16+shade(uv-vec2(0.,uvE.y),p-vec2(0.,pe),u_time)*.16;}
  else{col=shade(uv,p,u_time);}
  if(abs(u_contrast-1.)>.0001)col=(col-.5)*u_contrast+.5;
  if(abs(u_saturation-1.)>.0001){float luma=dot(col,vec3(.299,.587,.114));col=mix(vec3(luma),col,u_saturation);}
  if(u_vignette>.0001){float vd=length(uv-.5)*1.41421356;col*=1.-u_vignette*smoothstep(.35,1.,vd);}
  if(u_grain>.0001)col+=(grainHash(gl_FragCoord.xy+vec2(u_seed*17.,u_seed*31.))-.5)*u_grain;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[NEXA Silk]', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[NEXA Silk link]', gl.getProgramInfoLog(prog)); return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uScene     = gl.getUniformLocation(prog, 'u_scene');
  const uShape     = gl.getUniformLocation(prog, 'u_shape');
  const uSurface   = gl.getUniformLocation(prog, 'u_surface');
  const uFinish    = gl.getUniformLocation(prog, 'u_finish');
  const uTransform = gl.getUniformLocation(prog, 'u_transform');
  const uSpace     = gl.getUniformLocation(prog, 'u_space');
  const colorLocs  = Array.from({ length: 8 }, (_, i) =>
    gl.getUniformLocation(prog, `u_colors[${i}]`));

  /* Couleurs neutres (gris) pour que le silk soit subtil */
  [[.063,.063,.063],[.961,.961,.961],[.690,.690,.690],[.227,.227,.227],
   [0,0,0],[0,0,0],[0,0,0],[0,0,0]]
  .forEach((c, i) => gl.uniform3fv(colorLocs[i], c));

  gl.uniform4f(uShape,      1.94, 0.58, 0.48, 0.04);
  gl.uniform4f(uSurface,    2.98, 1.31, 0.00, 1.00);
  gl.uniform4f(uFinish,     0.00, 0.15, 0.001, 0.01);
  gl.uniform4f(uTransform,  3195, 4.33, 0.06, 0.0);
  gl.uniform4f(uSpace,     -0.10, 0.02, 0.0, 0.0);

  const DPR = Math.min(devicePixelRatio, 2);
  function resize() {
    canvas.width  = Math.round(window.innerWidth  * DPR);
    canvas.height = Math.round(window.innerHeight * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let rafId = null;
  const t0 = performance.now();
  function render() {
    gl.uniform4f(uScene, canvas.width, canvas.height,
      (performance.now() - t0) / 1000 * 0.56, 4.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId)     { rafId = requestAnimationFrame(render); }
  });
  rafId = requestAnimationFrame(render);
})();

/* ── SPLINE ROBOT — interactions ──────────────
   @splinetool/viewer est un web component natif.
   La scène intègre son propre mouse-tracking 3D.
   On gère : fond transparent + scroll drift.
   ──────────────────────────────────────────── */
(function initSplineRobot() {
  const PRM     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewer  = document.querySelector('spline-viewer');
  const robotEl = document.getElementById('hero-robot');
  const robotCol= document.querySelector('.hero-robot-col');
  const heroSec = document.getElementById('accueil');

  /* Rendre le fond de la scène transparent après chargement */
  if (viewer) {
    viewer.addEventListener('load', () => {
      try {
        /* API interne @splinetool/viewer */
        const rt = viewer._runtime || viewer.runtime;
        if (rt && typeof rt.setBackgroundColor === 'function') {
          rt.setBackgroundColor({ r: 0, g: 0, b: 0, a: 0 });
        }
      } catch (e) { /* noop — dépend de la version du viewer */ }
    });
  }

  /* Scroll reaction — drift vers le haut + légère transparence
     La Spline scène conserve son propre mouse-tracking interne. */
  if (!PRM && robotCol && heroSec) {
    let rDirty = false;

    function applyRobotScroll() {
      const sy   = window.scrollY;
      if (sy > 0) {
        const prog = Math.min(Math.max(sy / (heroSec.offsetHeight * 0.62), 0), 1);
        robotCol.style.opacity   = Math.max(0.50, 1 - prog * 0.55).toFixed(3);
        robotCol.style.transform = `translateY(${(-40 * prog).toFixed(1)}px)`;
      } else {
        robotCol.style.opacity   = '';
        robotCol.style.transform = '';
      }
    }

    window.addEventListener('scroll', () => {
      if (!rDirty) {
        rDirty = true;
        requestAnimationFrame(() => { rDirty = false; applyRobotScroll(); });
      }
    }, { passive: true });
  }
})();
