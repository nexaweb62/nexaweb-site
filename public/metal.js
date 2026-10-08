/* ═══════════════════════════════════════════════════════════════════════
   LA MATIÈRE DES BOUTONS — un chrome liquide, rendu UNE SEULE FOIS.

   Reprend le nuanceur du « Metallic Button » : bandes métalliques,
   frange chromatique, bombé au centre. Mais son architecture d'origine
   est intenable ici, et ce n'est pas une opinion — c'est mesuré.

   ── POURQUOI PAS UN CONTEXTE PAR BOUTON ────────────────────────────
   L'original crée un <canvas>, un contexte WebGL2, un programme de
   nuanceur et une boucle d'animation PAR BOUTON. Relevé dans Chromium
   sur ce site :

       contextes WebGL2 vivants par page : 16
         (j'en ai demandé 64 ; le navigateur en garde 16 et jette le reste)
       accueil : 13 boutons interactifs, 34 éléments cliquables

   Treize boutons prendraient donc 13 des 16 contextes autorisés sur la
   seule page d'accueil. Au-delà, Chrome détruit les plus anciens sans
   prévenir et les boutons se vident. Ajoutons 13 boucles d'animation et
   13 couches de composition — sur un site dont une page est partie en
   production ENTIÈREMENT NOIRE pour exactement ce motif.

   ── CE QU'ON FAIT À LA PLACE ───────────────────────────────────────
   Le temps n'entre dans ce nuanceur que par « direction -= t », suivi
   d'un fract() : il DÉCALE le motif, il ne le transforme pas. Faire
   glisser une image du motif reproduit donc fidèlement l'animation.

   Alors : UN contexte, le temps d'un rendu, deux textures (le chrome
   sombre et l'or), puis loseContext(). Il ne reste AUCUN contexte
   vivant. Les textures deviennent deux variables CSS, et chaque bouton
   les porte en fond. Le reflet glisse en CSS.

   ── SI QUOI QUE CE SOIT ÉCHOUE, LES BOUTONS RESTENT DES BOUTONS ────
   Pas de WebGL2, nuanceur refusé, toBlob indisponible : on ne pose
   rien, et la couleur de fond déjà portée par .ihb reste en place. Le
   bouton perd son reflet, jamais sa lisibilité.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LARG = 568, HAUT = 92;   /* deux fois la taille d'un bouton courant */

  var VERT = `#version 300 es
precision mediump float;
layout(location = 0) in vec4 a_position;
out vec2 v_uv;
void main() {
  gl_Position = a_position;
  v_uv = a_position.xy * .5;
}`;

  /* Le nuanceur d'origine, debarrasse de ce qui ne sert qu'a son
     systeme de cadrage : u_fit, u_worldWidth, u_rotation, u_offset…
     n'avaient de sens que parce que chaque bouton rendait sa propre
     image. Ici on rend une plaque, une fois. */
  var FRAG = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec4 u_colorBack;
uniform vec4 u_colorTint;
uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;
uniform float u_eclat;
uniform float u_lumBas;
uniform float u_lumHaut;

in vec2 v_uv;
out vec4 fragColor;

#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {
  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));
  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));
  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));
  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

void main() {
  float t = .3 * (u_time + 2.8);
  vec2 uv = v_uv + .5;
  uv.y = 1. - uv.y;

  float cycleWidth = u_repetition;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  rotatedUV = vec2(rotatedUV.x * cos(angle) - rotatedUV.y * sin(angle),
                   rotatedUV.x * sin(angle) + rotatedUV.y * cos(angle)) + vec2(.5);

  /* LE BORD EST NEUTRALISE. Dans l'original il dessine un disque : le
     bouton etait une pastille et le nuanceur peignait sa forme. Ici
     c'est le CSS qui donne la forme — border-radius et overflow — et
     la plaque doit etre pleine d'un bord a l'autre, sinon le fond
     transparaitrait aux angles. */
  float edge = 0.;
  float opacity = 1.;

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color1 = vec3(.98, .98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;
  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);

  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);
  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);
  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);
  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));
  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;

  float colorDispersion = clamp(1. - bump, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;
  float dispersionBlue = colorDispersion * 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;
  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  float blur = u_softness / 15.;
  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);

  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r), bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g), bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  vec3 color = vec3(r, g, b);

  /* L'ECLAT EST BRIDE. Le nuanceur d'origine va jusqu'au blanc presque
     pur, et le libelle du bouton est blanc : les bandes claires le
     rendaient illisible par endroits. L'original s'en sort avec une
     ombre portee sur le texte ; ici on ramene plutot la plaque vers la
     couleur de fond du bouton, de sorte que le contraste du libelle
     soit garanti PAR CONSTRUCTION et pas rattrape apres coup.
     La valeur est reglee a la mesure, par relevé de contraste. */
  color = mix(u_colorBack.rgb, color, u_eclat);

  /* ── LA PLAQUE NE PEUT PAS ATTEINDRE LA COULEUR DU LIBELLE ────────
     C'est LE defaut de principe du chrome sous du texte : ses bandes
     vont du quasi-noir au quasi-blanc, donc quelle que soit la couleur
     des lettres, une bande finit par l'egaler. Mesure au pixel avant
     correction, pire cas du site : 1,00:1 — la lettre et le fond
     exactement de la meme couleur.

     L'original traite le symptome, par une ombre portee sur le texte.
     On traite la cause : la luminosite de la plaque est REMAPPEE dans
     une bande sure, calculee a partir de la couleur du libelle. Les
     rapports entre canaux sont preserves, donc la frange chromatique
     et le dessin des bandes survivent — seule l'amplitude se resserre.

     Les deux bornes sont reglees A LA MESURE, en relisant le contraste
     au pixel jusqu'a ce que le pire cas du site passe AA. */
  float L = dot(color, vec3(.2126, .7152, .0722));
  float Lc = u_lumBas + (u_lumHaut - u_lumBas) * clamp(L, 0., 1.);
  color *= (L > .001) ? (Lc / L) : 1.;

  /* Le grain d'origine, qui casse les bandes de quantification. */
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);

  fragColor = vec4(clamp(color, 0., 1.), 1.);
}`;

  function compiler(gl, type, src) {
    var s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }

  /* Une couleur de jeton, « #RRGGBB », vers trois flottants. Aucune
     couleur n'est ecrite dans ce fichier : elles viennent toutes des
     variables CSS, et check:colors le verifie. */
  function versFloats(valeur) {
    var v = String(valeur).trim();
    if (v.charAt(0) === '#') {
      var h = v.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length >= 6) {
        var n = parseInt(h.slice(0, 6), 16);
        if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
      }
    }
    var m = v.match(/-?[\d.]+/g);
    if (m && m.length >= 3) return [+m[0] / 255, +m[1] / 255, +m[2] / 255];
    return null;
  }

  function rendre() {
    var toile = document.createElement('canvas');
    toile.width = LARG; toile.height = HAUT;
    var gl = toile.getContext('webgl2', { antialias: false, alpha: false,
                                          preserveDrawingBuffer: true });
    if (!gl) return null;

    var vs = compiler(gl, gl.VERTEX_SHADER, VERT);
    var fs = compiler(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.deleteProgram(prog); return null; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, LARG, HAUT);

    var u = {};
    ['u_time','u_colorBack','u_colorTint','u_softness','u_repetition','u_shiftRed',
     'u_shiftBlue','u_distortion','u_contour','u_angle','u_eclat',
     'u_lumBas','u_lumHaut']
      .forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });

    function plaque(fond, teinte, eclat, lumBas, lumHaut, frange) {
      gl.uniform1f(u.u_time, 0);
      gl.uniform4f(u.u_colorBack, fond[0], fond[1], fond[2], 1);
      gl.uniform4f(u.u_colorTint, teinte[0], teinte[1], teinte[2], 1);
      gl.uniform1f(u.u_softness, 0.5);
      gl.uniform1f(u.u_repetition, 4);
      gl.uniform1f(u.u_shiftRed, frange);
      gl.uniform1f(u.u_shiftBlue, frange);
      gl.uniform1f(u.u_distortion, 0);
      gl.uniform1f(u.u_contour, 0);
      gl.uniform1f(u.u_angle, 45);
      gl.uniform1f(u.u_eclat, eclat);
      gl.uniform1f(u.u_lumBas, lumBas);
      gl.uniform1f(u.u_lumHaut, lumHaut);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return toile;
    }

    return { plaque: plaque, fermer: function () {
      gl.deleteProgram(prog);
      var p = gl.getExtension('WEBGL_lose_context');
      if (p) p.loseContext();          /* AUCUN contexte ne survit */
    } };
  }

  function poser() {
    var cs = getComputedStyle(document.body);
    var fondSombre = versFloats(cs.getPropertyValue('--raw-black-925'));
    var fondOr     = versFloats(cs.getPropertyValue('--raw-gold-400'));
    var teinteOr   = versFloats(cs.getPropertyValue('--raw-gold-400'));
    var teinteFroide = versFloats(cs.getPropertyValue('--raw-warm-40'));
    if (!fondSombre || !fondOr || !teinteOr || !teinteFroide) return;

    var moteur;
    try { moteur = rendre(); } catch (e) { return; }
    if (!moteur) return;

    /* L'ECLAT : 0 = la plaque disparait dans la couleur du bouton,
       1 = le chrome pur de l'original. Les deux valeurs sont reglees
       par mesure de contraste du libelle, pas a l'oeil. */
    var r = document.documentElement;
    var restant = 2;

    /* UNE URL D'OBJET, PAS UNE DATA-URL. Une data-url de cette plaque
       pese 130 Ko de base64 ; deux plaques posees en variables CSS sur
       <html>, cela fait 257 Ko de chaine dans un attribut de style,
       relus a chaque recalcul. Le blob tient en une URL de 50
       caracteres, et l'image vit la ou doivent vivre les images. */
    function publier(nom, toile) {
      function fini() { if (--restant === 0) { try { moteur.fermer(); } catch (e) {} } }
      try {
        toile.toBlob(function (b) {
          if (b) {
            r.style.setProperty(nom, 'url("' + URL.createObjectURL(b) + '")');
            r.classList.add('metal-pret');
          }
          fini();
        }, 'image/png');
      } catch (e) { fini(); }
    }

    /* Les deux plaques sont dessinees sur la MEME toile : il faut donc
       publier la premiere avant de dessiner la seconde, sinon toBlob,
       qui est asynchrone, lirait deux fois la derniere. */
    /* Bouton sombre : libelle presque blanc. La plaque doit rester
       SOUS lui. Le libelle est a --raw-warm-40, luminance WCAG 0,876 :
       pour tenir 4,5:1 la plaque doit rester sous 0,156 en luminance
       WCAG, soit environ 0,43 dans l'espace du nuanceur. On s'arrete a
       0,36, avec de la marge. */
    var t1 = moteur.plaque(fondSombre, teinteOr, 0.85, 0.03, 0.36, 0.30);
    var copie = document.createElement('canvas');
    copie.width = t1.width; copie.height = t1.height;
    copie.getContext('2d').drawImage(t1, 0, 0);
    publier('--ihb-metal', copie);

    /* Bouton d'appel : libelle presque noir. La plaque doit rester
       AU-DESSUS de lui. Le libelle est a --raw-gold-950, luminance
       WCAG 0,005 : la plaque doit rester AU-DESSUS de 0,198, soit
       environ 0,48 dans l'espace du nuanceur. On part de 0,52.
       Premiere tentative a 0,30 : relevé 2,76:1, sous AA. Les deux
       espaces ne se correspondent pas lineairement — d'ou la mesure
       plutot que le calcul.

       ET IL EST BEAUCOUP PLUS SOBRE QUE LE BOUTON SOMBRE. Aux reglages
       de l'original, l'appel a l'action virait a l'arc-en-ciel :
       la frange chromatique ecarte les canaux, et sur un fond deja
       sature cela donnait de l'orange, du jaune et du blanc au lieu de
       l'or de la marque. On baisse donc la frange de 0,30 a 0,10, on
       laisse l'or du fond dominer (eclat 0,55 au lieu de 0,85) et on
       resserre la bande de luminosite. Le chrome devient un reflet SUR
       l'or, au lieu de le remplacer. */
    var t2 = moteur.plaque(fondOr, teinteOr, 0.55, 0.55, 0.82, 0.10);
    var copie2 = document.createElement('canvas');
    copie2.width = t2.width; copie2.height = t2.height;
    copie2.getContext('2d').drawImage(t2, 0, 0);
    publier('--ihb-metal-or', copie2);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poser, { once: true });
  } else { poser(); }
})();
