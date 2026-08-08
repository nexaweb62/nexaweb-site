import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import {
  abs, blendScreen, float, mod, mx_cell_noise_float,
  oneMinus, smoothstep, texture, uniform, uv, vec2, vec3,
  pass, mix, add
} from 'three/tsl';

(async function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
  await renderer.init();

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    const w = canvas.offsetWidth  || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  resize();
  window.addEventListener('resize', resize);

  const loader = new THREE.TextureLoader();
  const [rawMap, depthMap] = await Promise.all([
    loader.loadAsync('https://i.postimg.cc/XYwvXN8D/img-4.png'),
    loader.loadAsync('https://i.postimg.cc/2SHKQh2q/raw-4.webp'),
  ]);

  // Uniforms
  const uPointer  = uniform(new THREE.Vector2(0, 0));
  const uProgress = uniform(0.0);
  const uScan     = uniform(0.0);

  // Depth-parallax texture sampling
  const tDepth = texture(depthMap);
  const tRaw   = texture(rawMap, uv().add(tDepth.r.mul(uPointer).mul(0.01)));

  // Dot matrix driven by depth flow
  const tUv     = vec2(uv().x, uv().y);
  const tiling  = vec2(120.0);
  const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);
  const bri     = mx_cell_noise_float(tUv.mul(tiling).div(2));
  const dist    = tiledUv.length();
  const dotVal  = smoothstep(0.5, 0.49, dist).mul(bri);
  const flow    = oneMinus(smoothstep(0.0, 0.02, abs(tDepth.r.sub(uProgress))));

  // Accent blue #4c72ff → (0.298, 0.447, 1.0) × 10
  const mask      = dotVal.mul(flow).mul(vec3(2.98, 4.47, 10.0));
  const colorNode = blendScreen(tRaw, mask);

  const mat  = new THREE.MeshBasicNodeMaterial({ colorNode, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), mat);
  mesh.scale.set(0.8, 0.8, 1);
  scene.add(mesh);

  // Post-processing: bloom + blue accent scan line
  const pp       = new THREE.PostProcessing(renderer);
  const scPass   = pass(scene, camera);
  const scColor  = scPass.getTextureNode('output');
  const bloomOut = bloom(scColor, 1.0, 0.5, 1.0);

  const scanL  = smoothstep(0.0, 0.05, abs(uv().y.sub(uScan)));
  const blueGl = vec3(0.298, 0.447, 1.0).mul(oneMinus(scanL)).mul(0.35);
  const wScan  = mix(scColor, add(scColor, blueGl), smoothstep(0.9, 1.0, oneMinus(scanL)));
  pp.outputNode = wScan.add(bloomOut);

  // Mouse parallax
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    uPointer.value.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    uPointer.value.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  });

  // Render loop
  const clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    uProgress.value = Math.sin(t * 0.5) * 0.5 + 0.5;
    uScan.value     = Math.sin(t * 0.5) * 0.5 + 0.5;
    pp.renderAsync();
  })();
})().catch(err => console.warn('[hero-webgpu] init failed:', err));
