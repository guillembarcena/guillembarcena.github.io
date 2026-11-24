import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { buildCity } from './city.js?v=22';
import { overlayCanvas, desktopCanvas, laptopCanvas, loadFonts } from './textures.js?v=22';
import { CARDS, TRACKS } from './data.js?v=22';
import { audio } from './audio.js?v=22';
import { OS } from './os.js?v=22';

const params = new URLSearchParams(location.search);
const FIXED_T = params.has('t') ? parseFloat(params.get('t')) : null;
let VIEW = params.get('view') || 'room';
const $ = s => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;

function hasGL() { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; } }

const soundBtn = $('#sound');
const setSoundLabel = on => { soundBtn.textContent = on ? 'Sound on' : 'Enable sound'; soundBtn.classList.toggle('on', on); };
soundBtn.addEventListener('click', () => { audio.toggle(); });
audio.listeners.push(setSoundLabel);
audio.armDefault();

if (!hasGL() || params.has('nogl')) {
  document.body.classList.add('nogl'); OS.plainCV($('#plain')); $('#loader').remove();
} else start();

async function start() {
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.autoClear = false;
  let pr = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(41.5, 1, 0.05, 60);
  const cityCam = new THREE.PerspectiveCamera(41.5, 1, 4, 16000);
  const city = buildCity();

  // ---------- load
  await loadFonts();
  const tl = new THREE.TextureLoader();
  const loadTex = u => new Promise((res, rej) => tl.load(u, t => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
  const [gltf, tA, tB, tC] = await Promise.all([
    new Promise((res, rej) => new GLTFLoader().load('room/baked/room.glb?v=22', res, undefined, rej)),
    loadTex('room/baked/bake_A.jpg?v=22'), loadTex('room/baked/bake_B.jpg?v=22'), loadTex('room/baked/bake_C.jpg?v=22')]);
  const baked = { A: new THREE.MeshBasicMaterial({ map: tA }), B: new THREE.MeshBasicMaterial({ map: tB, side: THREE.DoubleSide }), C: new THREE.MeshBasicMaterial({ map: tC, side: THREE.DoubleSide }) };
  const UT = { value: 0 };
  const vinylMat = baked.C.clone(); vinylMat.color.setScalar(1.75);
  const swayMat = (base, y0) => { const m = baked.C.clone(); m.onBeforeCompile = s => { s.uniforms.uT = UT; s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n float hh = max(position.y - ${y0.toFixed(2)}, 0.0); transformed.x += sin(uT*1.1 + position.y*4.0 + position.z*3.0)*0.02*hh*${base.toFixed(2)}; transformed.z += cos(uT*0.8 + position.x*5.0)*0.012*hh*${base.toFixed(2)};`); }; return m; };
  const sway = { 1: swayMat(1.0, 1.04), 2: swayMat(0.7, 0.5), 3: swayMat(1.2, 2.22) };

  const clickables = [], lifts = [], live = {};
  const canvTex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const flip = c => { const d = document.createElement('canvas'); d.width = c.width; d.height = c.height; const g = d.getContext('2d'); g.translate(0, c.height); g.scale(1, -1); g.drawImage(c, 0, 0); return d; };
  // glTF UVs have v flipped, so canvases are used as drawn with flipY=false... the quads use (0,0) bottom-left in Blender, exported as v' = 1-v, which matches canvas rows top-down.
  const ovlCache = {};
  const glassMat = (strength, lamp) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: UT, uS: { value: strength }, uLamp: { value: lamp } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vW; uniform float uT, uS; uniform vec3 uLamp;
      void main(){ vec3 V = normalize(vW - cameraPosition); vec3 dL = normalize(uLamp - cameraPosition); float a = max(dot(V, dL), 0.0);
        vec3 c = vec3(1.0,0.68,0.36) * (pow(a, 2600.0)*0.5 + pow(a, 300.0)*0.05);
        float s = sin((vW.x*1.3 + vW.y*0.8)*2.4 + cameraPosition.x*2.6 + cameraPosition.y*1.5);
        c += vec3(0.75,0.72,1.0) * smoothstep(0.55, 1.0, s) * uS;
        c += vec3(0.5,0.4,0.7) * pow(1.0 - abs(V.z), 3.0) * 0.25;
        gl_FragColor = vec4(c, 1.0); }` });

  const screenMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: canvTex(desktopCanvas(), false) }, uOn: { value: -1 }, uHover: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform sampler2D map; uniform float uOn, uHover;
      void main(){ vec2 uv = vUv; vec3 c = vec3(0.012,0.014,0.02);
        if (uOn > 0.0) { float wide = smoothstep(0.0, 0.10, uOn), open = smoothstep(0.10, 0.42, uOn);
          vec2 q = (uv - 0.5) / vec2(mix(0.02, 1.0, wide), mix(0.006, 1.0, open*open)) + 0.5;
          float inside = step(0.0,q.x)*step(q.x,1.0)*step(0.0,q.y)*step(q.y,1.0);
          vec3 t = texture2D(map, q).rgb; float boot = smoothstep(0.45, 1.5, uOn);
          float fl = 1.0 + 0.55*exp(-uOn*2.2)*sin(uOn*61.0); fl *= (uOn > 0.62 && uOn < 0.70) || (uOn > 0.9 && uOn < 0.93) ? 0.25 : 1.0;
          c = mix(vec3(0.85,0.92,1.0)*(1.6-open*0.5), t, boot) * inside * fl;
          c *= 0.95 + 0.05*sin(vUv.y*1100.0); c *= 1.0 + 0.12*uHover; c += vec3(0.02,0.03,0.05); }
        gl_FragColor = vec4(c, 1.0); }` });
  let screenMesh = null;
  { const im = new Image(); im.onload = () => { const old = screenMat.uniforms.map.value; screenMat.uniforms.map.value = canvTex(desktopCanvas(im), false); old.dispose(); }; im.src = 'og.jpg?v=22'; }
  const vuC = document.createElement('canvas'); vuC.width = 300; vuC.height = 190; const vuG = vuC.getContext('2d'); const vuTex = canvTex(vuC);
  const djC = ['L', 'R'].map(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 148; return c; }); const djTex = djC.map(c => canvTex(c));
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 96, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.45, 'rgba(255,255,255,.9)'); gr.addColorStop(.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const jogs = [];
  const djGlow = [['#35d6ff', -3.055], ['#ffab2e', -2.385]].map(([col, x]) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.set(x, 1.02, -1.74); sp.scale.setScalar(0.62); sp.renderOrder = 5; scene.add(sp); return sp; });

  gltf.scene.traverse(o => {
    if (!o.isMesh) return; const ud = o.userData;
    if (ud.ovl) {
      const tex = ovlCache[ud.ovl] || (ovlCache[ud.ovl] = canvTex(overlayCanvas(ud.ovl)));
      o.material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      o.renderOrder = 2;
    } else if (ud.live) {
      const L = ud.live; o.renderOrder = 3;
      if (L === 'screen') { o.material = screenMat; screenMesh = o; }
      else if (L === 'laptop') o.material = new THREE.MeshBasicMaterial({ map: canvTex(laptopCanvas()) });
      else if (L.startsWith('djscreen')) o.material = new THREE.MeshBasicMaterial({ map: djTex[L.endsWith('L') ? 0 : 1] });
      else if (L === 'vu') o.material = new THREE.MeshBasicMaterial({ map: vuTex, transparent: true, depthWrite: false });
      else if (L.startsWith('jog')) { o.material = new THREE.MeshBasicMaterial({ map: ringTex, color: L.endsWith('L') ? '#35d6ff' : '#ffab2e', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); jogs.push(o); }
      else if (L === 'glassframe') { o.material = glassMat(0.07, new THREE.Vector3(1.02, 1.78, -2.4)); o.renderOrder = 4; }
    } else if (ud.sway) o.material = sway[ud.sway];
    else if (ud.click === 'vinyl') o.material = vinylMat;
    else o.material = baked[ud.grp] || baked.C;
    if (ud.click) { clickables.push(o); lifts.push({ o, base: o.position.clone(), l: 0 }); }
  });
  scene.add(gltf.scene);
  // terrazzo chips on the floor, multiplied over the baked light
  { const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const cols = ['#d9d6cf', '#c4c0b8', '#e9e6df', '#b3aea5', '#d2c8b8', '#9f9b94', '#cfd2d6', '#8b8780'];
    for (let k = 0; k < 2600; k++) { const x = rnd() * N, y = rnd() * N, r = 1.5 + rnd() * rnd() * 9, n = 4 + (rnd() * 3 | 0), a0 = rnd() * 6.28; g.fillStyle = cols[rnd() * cols.length | 0]; g.globalAlpha = 0.55 + rnd() * 0.45;
      for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { g.beginPath(); for (let q = 0; q < n; q++) { const a = a0 + q / n * 6.283, rr = r * (0.6 + rnd() * 0.5); g.lineTo(x + ox + Math.cos(a) * rr, y + oy + Math.sin(a) * rr); } g.fill(); } }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4.75); t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(0, 0.0015, 0.85); m.renderOrder = 2; scene.add(m); }
  // brushed aluminium on the desk top: fine cool streaks multiplied over the baked light
  { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#d3d8e0'; g.fillRect(0, 0, 1024, 512);
    let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 2600; k++) { const y = rnd() * 512, x = rnd() * 1024, w = 60 + rnd() * 420, v = rnd(); g.globalAlpha = 0.05 + rnd() * 0.1; g.fillStyle = v > 0.5 ? '#ffffff' : '#8d939e'; g.fillRect(x - w / 2, y, w, 1); }
    g.globalAlpha = 1; const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(255,255,255,.0)'); gr.addColorStop(.5, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(120,128,140,.18)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.76).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.position.set(1.55, 0.7403, -1.62); m.renderOrder = 1; scene.add(m); }
  // soft glow under the arc lamp
  { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: '#ffc98f', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.28 })); sp.position.set(-1.40, 1.30, -1.05); sp.scale.setScalar(0.36); sp.renderOrder = 5; scene.add(sp); }
  // the two paintings (public domain photographs), loaded as full-resolution textures; the drawn canvas stays as a fallback
  await Promise.all(Object.entries({ gauguin: 'room/img/cheval-blanc.jpg?v=22', pissarro: 'room/img/pissarro-eragny.jpg?v=22' }).map(([k, src]) => new Promise(res => {
    const im = new Image();
    im.onload = () => { const t = new THREE.Texture(im); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true;
      gltf.scene.traverse(o => { if (o.userData.ovl === k) { o.material = new THREE.MeshBasicMaterial({ map: t, color: k === 'pissarro' ? '#d6cbc6' : '#e8dac4', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); } }); res(); };
    im.onerror = res; im.src = src; setTimeout(res, 5000); })));
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.55), glassMat(0.03, new THREE.Vector3(0.2, 1.3, 40)));
  winGlass.position.set(-0.55, 1.625, -2.2); winGlass.renderOrder = 4; scene.add(winGlass);

  // dust in the window light
  const DN = 260, dpos = new Float32Array(DN * 3), dph = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dpos[i * 3] = -1.9 + Math.random() * 3.2; dpos[i * 3 + 1] = 0.25 + Math.random() * 2.2; dpos[i * 3 + 2] = -2.0 + Math.random() * 3.6; dph[i] = Math.random() * 100; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dg.setAttribute('aPh', new THREE.BufferAttribute(dph, 1));
  const dustU = { uT: UT, uPx: { value: 1 } };
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: dustU,
    vertexShader: `attribute float aPh; uniform float uT, uPx; varying float vA; void main(){ vec3 p = position; p.x += sin(uT*0.11 + aPh)*0.22; p.y += sin(uT*0.07 + aPh*1.7)*0.18 + 0.1*sin(uT*0.31+aPh*3.0); p.z += cos(uT*0.09 + aPh*2.3)*0.2;
      float beam = smoothstep(1.6, 0.2, abs(p.x + 0.55 - (p.z + 2.2)*0.36)) * smoothstep(-0.3, 0.5, p.y - (0.85 - (-(p.z + 2.2))*0.42*0.0)); vec4 mv = modelViewMatrix*vec4(p,1.0);
      vA = (0.25 + 0.75*beam) * (0.55 + 0.45*sin(uT*1.3 + aPh*9.0)); gl_PointSize = (1.0 + 2.2*fract(aPh*7.3)) * uPx * clamp(3.0/(-mv.z), 0.5, 3.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0,0.78,0.52)*vA*smoothstep(0.5, 0.1, d)*0.55, 1.0); }` }));
  dust.frustumCulled = false; scene.add(dust);
  // soft shafts of last light through the panes
  { const pos = [], uv = [], d = new THREE.Vector3(0.36, -0.42, 1).normalize().multiplyScalar(3.8); const xs = [-1.5, -1.03, -0.55, -0.07, 0.4];
    for (let k = 0; k < 4; k++) for (const y of [1.15, 1.6, 2.05, 2.34]) { const a = [xs[k] + 0.03, y, -2.05], b = [xs[k + 1] - 0.03, y, -2.05], c = [b[0] + d.x, b[1] + d.y, b[2] + d.z], e = [a[0] + d.x, a[1] + d.y, a[2] + d.z];
      pos.push(...a, ...b, ...c, ...a, ...c, ...e); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uT: UT },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uT; void main(){ float a = smoothstep(0.0, 0.06, vUv.y)*pow(1.0 - vUv.y, 1.5)*smoothstep(0.0, 0.25, vUv.x)*smoothstep(1.0, 0.75, vUv.x); a *= 0.8 + 0.2*sin(uT*0.35 + vUv.x*7.0 + vUv.y*3.0); gl_FragColor = vec4(vec3(1.0, 0.60, 0.36)*a*0.06, 1.0); }` }));
    m.frustumCulled = false; m.renderOrder = 6; scene.add(m); }
  // glint on the medal
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(.12, 'rgba(255,230,170,.5)'); gr.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,245,220,.9)'; g.fillRect(4, 63, 120, 2); g.fillRect(63, 14, 2, 100); return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glint.position.set(1.047, 1.674, -1.972); glint.scale.setScalar(0.06); glint.renderOrder = 5; scene.add(glint);

  // ---------- camera rig
  const V3 = (a) => new THREE.Vector3(...a);
  const SCREEN = new THREE.Vector3(1.65, 1.09, -1.8275), SW = 0.80, SH = 0.345;
  const VIEWS = {
    room: { p: [0, 1.46, 3.5], t: [0, 1.13, -2], fov: 44 }, dj: { p: [-2.3, 1.62, -0.45], t: [-2.72, 1.1, -1.75], fov: 38 },
    vinyl: { p: [-2.62, 1.75, -0.35], t: [-2.65, 1.76, -2], fov: 36 }, window: { p: [-0.2, 1.6, 0.9], t: [-0.42, 1.72, -2.2], fov: 27 },
    desk: { p: [1.4, 1.32, -0.3], t: [1.5, 1.04, -1.85], fov: 38 }, shelf: { p: [2.55, 1.2, 1.25], t: [2.98, 1.1, -1.85], fov: 40 },
    marathon: { p: [1.02, 1.84, -0.85], t: [1.02, 1.84, -2], fov: 36 }, wall: { p: [1.7, 1.9, 0.45], t: [1.75, 2.0, -2], fov: 40 },
    gauguin: { p: [2.03, 1.78, -0.4], t: [2.03, 1.78, -2], fov: 34, pf: 47 }, pissarro: { p: [-2.12, 1.68, -1.5], t: [-3.6, 1.66, -0.98], fov: 36, pf: 80 },
  };
  const ZONE = { marathon: 'marathon', basketball: 'shelf', diploma: 'shelf', edinburgh: 'shelf', binders: 'shelf', scout: 'wall', rumia: 'desk', dj: 'dj', vinyl: 'vinyl' };
  const cur = { p: V3(VIEWS.room.p), t: V3(VIEWS.room.t), fov: 44 };
  let tween = null, mode = 'room', viewName = 'room';
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function go(name, dur = 1.5, done) {
    const v = name === 'screen' ? screenView() : VIEWS[name]; viewName = name;
    tween = { fp: cur.p.clone(), ft: cur.t.clone(), ff: cur.fov, tp: V3(v.p), tt: V3(v.t), tf: v.fov, t0: performance.now(), dur: dur * 1000, done };
    look.yaw = look.pitch = 0; look.zoom = 0;
    if (dur === 0) { cur.p.copy(tween.tp); cur.t.copy(tween.tt); cur.fov = tween.tf; tween = null; done && done(); }
  }
  const aspect = () => innerWidth / innerHeight;
  const fovBase = f => aspect() >= 1.2 ? f : Math.min(viewName === 'room' ? 54 : 60, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(f / 2)) * Math.min(1.9, 1.2 / aspect()))));
  // on a portrait screen the two paintings get their own field of view so the whole frame fits
  let pfK = 0, pfT = performance.now(), pfV = 60;
  const fovFor = f => { const base = fovBase(f), v = VIEWS[viewName], want = v && v.pf && aspect() < 0.8 ? 1 : 0; if (want) pfV = v.pf;
    const now = performance.now(); pfK += (want - pfK) * Math.min(1, (now - pfT) / 350); pfT = now; return base + (pfV - base) * pfK; };
  function screenView() { const f = THREE.MathUtils.degToRad(cur.fov) / 2; const d = Math.min((SH / 2) / Math.tan(f), (SW / 2) / (Math.tan(f) * aspect())) * 0.98; return { p: [SCREEN.x, SCREEN.y, SCREEN.z + d], t: SCREEN.toArray(), fov: cur.fov }; }
  const look = { yaw: 0, pitch: 0, zoom: 0, mx: 0, my: 0, sx: 0, sy: 0, syaw: 0, spitch: 0, szoom: 0 };

  // ---------- cards, hover, input
  const card = $('#card'), label = $('#label');
  let openId = null, hoverId = null, hoverSub = null;
  function openCard(id) {
    const c = CARDS[id]; if (!c) return; openId = id;
    card.innerHTML = `<button class="x" aria-label="Close">×</button><h2>${c.title}</h2>${id === 'vinyl' ? '<ul>' + c.lines.map(l => `<li>${l}</li>`).join('') + '</ul>' : c.lines.map(l => `<p>${l}</p>`).join('')}<div class="foot">${c.year ? `<span class="year">${c.year}</span>` : '<span></span>'}<a href="?view=cv" class="cvlink">Open in CV</a></div>`;
    card.classList.add('show');
    card.querySelector('.x').onclick = closeCard;
    card.querySelector('.cvlink').onclick = e => { e.preventDefault(); const sec = c.cv; closeCard(true); enterOS({ app: 'cv', section: sec }); };
    if (ZONE[id] && viewName !== ZONE[id]) go(ZONE[id], 1.4);
    if (id === 'dj' && audio.enabled) audio.playing ? audio.stopLoop() : audio.startLoop();
  }
  function closeCard(stay) { if (!openId) return; openId = null; card.classList.remove('show'); if (stay !== true && mode === 'room') go('room', 1.4); }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(clickables, false)[0]; return h ? h.object.userData : null; }
  let down = null, lastInput = performance.now(), lastTap = null;
  // true when the pointer is over the window opening in the back wall (and pick() has just set the ray)
  function overWindow() { const o = ray.ray.origin, d = ray.ray.direction; if (d.z >= 0) return false; const t = (-2.0 - o.z) / d.z, x = o.x + d.x * t, y = o.y + d.y * t; return x > -1.55 && x < 0.45 && y > 0.85 && y < 2.4; }
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, yaw: look.yaw, pitch: look.pitch, moved: false }; canvas.setPointerCapture(e.pointerId); lastInput = performance.now(); });
  canvas.addEventListener('pointermove', e => {
    lastInput = performance.now(); look.mx = e.clientX / innerWidth * 2 - 1; look.my = e.clientY / innerHeight * 2 - 1;
    if (down) { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      if (down.moved && mode === 'room') { const k = THREE.MathUtils.degToRad(cur.fov) / innerHeight * 1.1; look.yaw = THREE.MathUtils.clamp(down.yaw + dx * k, -0.75, 0.75); look.pitch = THREE.MathUtils.clamp(down.pitch + dy * k, -0.3, 0.3); } }
    else if (e.pointerType === 'mouse' && mode === 'room') { const u = pick(e.clientX, e.clientY); hoverId = u ? u.click : null; hoverSub = u ? u.hover : null;
      if (hoverId) { const s = hoverSub && hoverSub.startsWith('sleeve') ? TRACKS[+hoverSub.slice(6)] : null; label.textContent = s ? s.artist + ' - ' + s.title + '. Click to listen' : CARDS[hoverId].name; label.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - label.offsetWidth - 12)}px, ${e.clientY + 18}px)`; }
      label.classList.toggle('show', !!hoverId); canvas.style.cursor = hoverId ? 'pointer' : 'grab'; }
  });
  canvas.addEventListener('pointerup', e => {
    const d = down; down = null;
    // second click of a double click that started flying into the screen from a close-up: turn back to the room
    if (d && !d.moved && mode === 'fly' && lastTap && lastTap.away && performance.now() - lastTap.t < 400) { lastTap = null; flyCancel = true; mode = 'room'; document.body.classList.remove('inos'); osEl.classList.remove('pre'); go('room', 1.4); return; }
    if (!d || d.moved || mode !== 'room') return;
    const u = pick(e.clientX, e.clientY);
    // a double click (or double tap) anywhere always leads back to the starting point of view;
    // from the starting view, a double click on the window walks up to it
    const now = performance.now(), tap = { t: now, x: e.clientX, y: e.clientY, away: viewName !== 'room' || !!openId }, prev = lastTap; lastTap = tap;
    if (prev && now - prev.t < 400 && Math.abs(prev.x - tap.x) + Math.abs(prev.y - tap.y) < 40) { lastTap = null;
      if (prev.away) { closeCard(true); go('room', 1.4); return; }
      if (!u && overWindow()) { go('window', 1.6); return; } }
    if (!u) { if (openId) closeCard(); else if (viewName !== 'room') go('room', 1.4); return; }
    if (u.click === 'computer') { closeCard(true); enterOS({}); } else if (u.click === 'skis') { closeCard(true); enterOS({ app: 'ski' }); } else if (u.click === 'gauguin' || u.click === 'pissarro') { closeCard(true); go(u.click, 1.4); } else { openCard(u.click); if (u.hover && u.hover.startsWith('sleeve')) audio.playTrack(+u.hover.slice(6)); }
  });
  canvas.addEventListener('pointerleave', () => { hoverId = null; label.classList.remove('show'); });
  addEventListener('wheel', e => { if (mode !== 'room') return; look.zoom = THREE.MathUtils.clamp(look.zoom - e.deltaY * 0.0012, 0, 0.55); lastInput = performance.now(); }, { passive: true });
  addEventListener('keydown', e => {
    lastInput = performance.now();
    if (e.key === 'Escape') { if (mode === 'os') exitOS(); else closeCard(); }
    if (mode !== 'room') return;
    if (e.key === 'ArrowLeft') look.yaw = Math.max(-0.75, look.yaw - 0.08); if (e.key === 'ArrowRight') look.yaw = Math.min(0.75, look.yaw + 0.08);
    if (e.key === 'ArrowUp') look.pitch = Math.max(-0.3, look.pitch - 0.05); if (e.key === 'ArrowDown') look.pitch = Math.min(0.3, look.pitch + 0.05);
    if (e.key === 'Enter') enterOS({});
  });
  $('#skip').addEventListener('click', e => { e.preventDefault(); closeCard(true); enterOS({ app: 'cv', instant: true, max: true }); });

  // ---------- computer
  const osEl = $('#os');
  let flyCancel = false;
  function enterOS(o = {}) {
    if (mode === 'os') { OS.open(o.app || 'cv', o); return; }
    mode = 'fly'; flyCancel = false; label.classList.remove('show'); hoverId = null; document.body.classList.add('inos');
    const arrive = () => { mode = 'os'; osEl.classList.add('show'); OS.enter(o); };
    if (o.instant) { go('screen', 0); arrive(); } else { go('screen', 1.7, arrive); setTimeout(() => { if (!flyCancel && mode === 'fly') osEl.classList.add('pre'); }, 1250); }
  }
  function exitOS() { if (mode !== 'os') return; OS.leave(); osEl.classList.remove('show', 'pre'); document.body.classList.remove('inos'); mode = 'room'; go('room', 1.8); }
  OS.init({ root: osEl, audio, exit: exitOS, openObject: id => { exitOS(); setTimeout(() => openCard(id), 600); } });

  // ---------- frame loop
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = cityCam.aspect = w / h; }
  addEventListener('resize', resize); resize();
  const t0 = performance.now(); let last = t0, acc = 0, frames = 0, slow = 0, djNext = 0;
  window.__stats = { fps: 0, pr };
  const TOUR = ['room', 'window', 'desk', 'wall', 'room', 'dj', 'pissarro', 'shelf']; let tourI = 0, lastTour = 0;
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3(), right = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  function drawLive(T) {
    const lv = audio.levels(T);
    vuG.clearRect(0, 0, 300, 190);
    const xs = [46, 118, 190, 262, 136, 150];
    for (let c = 0; c < 4; c++) for (let k = 0; k < 10; k++) { const on = lv[c] * 10 > k; vuG.fillStyle = on ? (k > 7 ? '#ff4a3a' : k > 5 ? '#ffc23a' : '#46ff86') : 'rgba(255,255,255,.07)'; vuG.fillRect(xs[c] - 5, 150 - k * 13, 10, 9); }
    if (FIXED_T !== null ? !drawLive.done : T > djNext) { djNext = T + 0.05; drawLive.done = true;
      djC.forEach((c, i) => { const g = c.getContext('2d'); g.fillStyle = '#05080c'; g.fillRect(0, 0, 320, 148); const col = i ? '#ffab2e' : '#35d6ff';
        for (let x = 0; x < 320; x += 3) { const s = x + Math.floor(T * 60) * 3 + i * 500; const b = (s / 3) % 16 < 1.5 ? 1 : 0.35 + 0.5 * Math.abs(Math.sin(s * 0.11) * Math.sin(s * 0.023 + i)); const h = b * 46; g.fillStyle = x < 160 ? col : 'rgba(255,255,255,.75)'; g.globalAlpha = (s / 3) % 16 < 1.5 ? 1 : 0.8; g.fillRect(x, 64 - h, 2, h * 2); }
        g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillRect(159, 10, 2, 108); g.fillStyle = col; g.fillRect(0, 130, 320 * ((T * 0.012 + i * 0.3) % 1), 6); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 130, 320, 1); });
      djTex.forEach(t => t.needsUpdate = true); }
    vuTex.needsUpdate = true;
    const ph = (T * 124 / 60) % 1, beat = Math.exp(-ph * 4);
    djGlow.forEach((sp, i) => { sp.material.opacity = 0.10 + 0.22 * (audio.playing ? Math.max(lv[4], beat) : beat); });
    jogs.forEach((j, i) => { j.material.opacity = 0.45 + 0.55 * (audio.playing ? Math.max(lv[4], beat) : beat * 0.8 + 0.1); });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const T = FIXED_T !== null ? FIXED_T : (now - t0) / 1000; UT.value = T;
    if (mode === 'os' && FIXED_T === null) return;                    // the room rests while the OS is open
    // dynamic resolution
    acc += dt; frames++;
    if (acc > 1) { const fps = frames / acc; window.__stats.fps = fps; if (fps < 48 && pr > 0.7) { slow++; if (slow > 1) { pr = Math.max(0.7, pr * 0.85); renderer.setPixelRatio(pr); resize(); slow = 0; } } else slow = 0; window.__stats.pr = pr; acc = 0; frames = 0; }
    if (tween) { const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k); cur.p.lerpVectors(tween.fp, tween.tp, e); cur.t.lerpVectors(tween.ft, tween.tt, e); cur.fov = tween.ff + (tween.tf - tween.ff) * e; if (k >= 1) { const d = tween.done; tween = null; d && d(); } }
    const idle = now - lastInput > 5000 || FIXED_T !== null;
    if (FIXED_T === null && mode === 'room' && !openId && !tween && now - lastInput > 12000 && now - lastTour > 8500 && VIEW === 'room') { tourI = (tourI + 1) % TOUR.length; go(TOUR[tourI], 3.6); lastTour = now; }
    const sm = 1 - Math.exp(-dt * 5);
    const inRoom = mode === 'room' ? 1 : 0;
    look.sx += (look.mx * inRoom - look.sx) * sm; look.sy += (look.my * inRoom - look.sy) * sm;
    look.syaw += (look.yaw * inRoom - look.syaw) * sm; look.spitch += (look.pitch * inRoom - look.spitch) * sm; look.szoom += (look.zoom * inRoom - look.szoom) * sm;
    const intro = viewName === 'room' && VIEW === 'room' ? 1 - ease(Math.min(1, T / 3.4)) : 0;
    const drift = inRoom * (viewName === 'room' ? 1 : 0.35);
    dir.subVectors(cur.t, cur.p); const dist = dir.length(); dir.normalize(); right.crossVectors(dir, UP).normalize();
    camera.position.copy(cur.p).addScaledVector(right, (look.sx * 0.22 + Math.sin(T * 0.21) * 0.16 * (idle ? 1 : 0.4)) * drift).addScaledVector(UP, (-look.sy * 0.07 + Math.sin(T * 0.17 + 1) * 0.035) * drift)
      .addScaledVector(dir, look.szoom * dist - intro * 1.3);
    camera.position.y += intro * 0.12;
    tmp.copy(cur.t).addScaledVector(right, look.sx * 0.1 * drift);
    camera.fov = fovFor(cur.fov) - look.szoom * 6; camera.updateProjectionMatrix();
    camera.lookAt(tmp); camera.rotateY(-look.syaw - look.sx * 0.03 * drift); camera.rotateX(-look.spitch);
    cityCam.position.copy(camera.position); cityCam.quaternion.copy(camera.quaternion); cityCam.fov = camera.fov; cityCam.updateProjectionMatrix();

    // hover lift
    for (const L of lifts) {
      const u = L.o.userData; let want = 0;
      if (hoverId && u.click === hoverId) { if (hoverId === 'vinyl') want = (u.hover && (u.hover === hoverSub || (u.hover === 'pulled'))) ? 1 : 0; else want = (hoverId === 'computer' || hoverId === 'gauguin' || hoverId === 'pissarro') ? 0 : 1; }
      L.l += (want - L.l) * (1 - Math.exp(-dt * 12));
      const wall = u.click === 'marathon' || u.click === 'vinyl' || u.click === 'skis' || u.click === 'scout'; const amt = u.click === 'dj' ? 0.008 : 0.022;
      L.o.position.set(L.base.x, L.base.y + (wall ? 0.004 : amt) * L.l, L.base.z + (wall ? (u.hover === 'pulled' ? 0.06 : 0.025) : 0) * L.l);
    }
    screenMat.uniforms.uOn.value = T - 1.3; screenMat.uniforms.uHover.value += ((hoverId === 'computer' ? 1 : 0) - screenMat.uniforms.uHover.value) * 0.15;
    glint.material.opacity = 0.15 + 0.85 * Math.pow(Math.max(0, Math.sin(T * 0.9 + camera.position.x * 7.0)), 10);
    glint.material.rotation = T * 0.2;
    dustU.uPx.value = pr * (innerHeight / 900); city.lamps.material.uniforms.uPx.value = pr * (innerHeight / 1000); for (const d of city.dots) d.material.size = Math.max(1.0, (d.material.userData.s || (d.material.userData.s = d.material.size)) * pr * innerHeight / 1000);
    drawLive(T);
    city.update(T, Math.min(1, T / 150));
    renderer.clear(); renderer.render(city.scene, cityCam); renderer.clearDepth(); renderer.render(scene, camera);
  }

  // initial state from the URL
  if (VIEWS[VIEW]) go(VIEW, 0);
  if (params.get('card')) openCard(params.get('card'));
  if (VIEW === 'os' || VIEW === 'cv') enterOS({ app: params.get('app') || 'cv', instant: true, max: VIEW === 'cv', section: params.get('section') });
  window.__room = { go, openCard, enterOS, exitOS, audio, camera, scene, city, renderer, get mode() { return mode; } };
  requestAnimationFrame(t => { frame(t); $('#loader').classList.add('gone'); document.body.classList.add('entered'); setTimeout(() => $('#loader')?.remove(), 900); });
}
