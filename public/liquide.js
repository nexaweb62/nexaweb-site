/* ═══════════════════════════════════════════════════════════════════
   L'OR LIQUIDE DU LOGO

   Le rendu fixe reste la vérité : c'est lui qui s'affiche, c'est lui
   qu'on voit si quoi que ce soit manque. Ce fichier ne fait qu'une
   chose — poser par-dessus, quand la machine le permet, une surface
   WebGL qui ondule sous le curseur.

   Ce que ça coûte, mesuré et non supposé : le moteur fait 509 ko bruts,
   125 ko compressés. C'est 1,4 fois tout le JavaScript du site réuni.
   D'où les trois verrous ci-dessous, et pas un de moins :

     1. il n'est demandé QUE si une tuile animée existe dans la page ;
     2. il n'est téléchargé QUE quand cette tuile entre à l'écran ;
     3. il est DÉTRUIT dès qu'elle en sort, et ne tourne jamais caché.

   Il s'efface aussi devant « réduire les animations », devant le mode
   léger du site — y compris quand celui-ci s'active APRÈS coup, la
   mesure de fluidité se faisant au premier défilement — et devant
   l'absence de WebGL.

   Aucun CDN : le moteur est servi depuis ce domaine. Un script tiers
   sur une page livre l'adresse IP de chaque visiteur à ce tiers, et
   remet le rendu de la page entre ses mains.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MOTEUR = '/vendor/liquid1-0.0.22.min.js';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* Les réglages du rendu fourni, repris tels quels. */
  var REGLAGE = {
    metalness: 0.2, roughness: 0.22, envMapIntensity: 0.55,
    displacementScale: 5, attenuation: 0.985,
  };

  var tuiles = document.querySelectorAll('[data-liquide]');
  if (!tuiles.length) return;

  /* Un seul téléchargement, quel que soit le nombre de tuiles. */
  var moduleP = null;
  function moteur() { return moduleP || (moduleP = import(MOTEUR)); }

  function webgl() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  var WEBGL = webgl();

  function leger() { return document.body.classList.contains('lite'); }
  function interdit() { return reduce.matches || leger() || !WEBGL; }

  for (var i = 0; i < tuiles.length; i++) brancher(tuiles[i]);

  function brancher(tuile) {
    var canvas = tuile.querySelector('.llq-canvas');
    var img = tuile.querySelector('img');
    if (!canvas || !img) return;

    var app = null;        // le moteur vivant, ou rien
    var occupe = false;    // un allumage est en cours
    var dedans = false;    // la tuile est à l'écran

    function allumer() {
      if (app || occupe || interdit()) return;
      occupe = true;
      moteur().then(function (mod) {
        /* Entre la demande et l'arrivée du fichier, la tuile a pu
           sortir de l'écran, ou le mode léger s'activer. On ne crée
           pas un contexte WebGL pour le détruire à la ligne suivante. */
        if (!dedans || interdit()) { occupe = false; return; }
        var a = mod.default(canvas);
        /* Même plafond de densité que la rivière d'or de l'accueil :
           au-delà, on paie des pixels que personne ne distingue. */
        a.three.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        a.three.resize();
        var m = a.liquidPlane.material;
        m.metalness = REGLAGE.metalness;
        m.roughness = REGLAGE.roughness;
        m.envMapIntensity = REGLAGE.envMapIntensity;
        a.liquidPlane.uniforms.displacementScale.value = REGLAGE.displacementScale;
        a.liquidPlane.attenuation = REGLAGE.attenuation;
        /* On donne au moteur l'image que le navigateur a RÉELLEMENT
           retenue — AVIF, WebP ou JPEG selon ce qu'il sait lire. Lui
           imposer un format, c'est parier sur son décodeur. */
        return Promise.resolve(a.loadImage(img.currentSrc || img.src)).then(function () {
          if (!dedans || interdit()) { try { a.dispose(); } catch (e) {} occupe = false; return; }
          app = a;
          occupe = false;
          tuile.classList.add('llq-vivant');
        });
      }).catch(function (e) {
        occupe = false;
        /* Le rendu fixe est déjà à l'écran : il n'y a rien à réparer. */
        if (window.console) console.info('Nexa Web — or liquide indisponible, le rendu fixe reste.', e);
      });
    }

    function eteindre() {
      if (!app) return;
      tuile.classList.remove('llq-vivant');
      try { app.dispose(); } catch (e) {}
      app = null;
    }

    /* La marge laisse le moteur arriver avant que la tuile ne soit vue,
       et évite d'allumer puis d'éteindre à chaque coup de molette. */
    var io = new IntersectionObserver(function (es) {
      dedans = es[0].isIntersecting;
      if (dedans) allumer(); else eteindre();
    }, { rootMargin: '200px' });
    io.observe(tuile);

    /* Un onglet en arrière-plan ne doit rien dessiner. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) eteindre();
      else if (dedans) allumer();
    });

    /* Le mode léger se décide APRÈS la mesure de fluidité, donc
       possiblement après l'allumage. On l'écoute au lieu de le lire
       une fois pour toutes. */
    new MutationObserver(function () { if (leger()) eteindre(); })
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
