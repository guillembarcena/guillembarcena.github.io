// Barcelona at dusk, built in code: sky, Collserola, Eixample grid, Sagrada Família, near rooftops.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';

const GROUND = -34;
const HAZE = new THREE.Color('#d9805e');
const GRID = 133, ROT = 0.2;
const COMMON = /* glsl */`
uniform float uTime; uniform float uDusk; uniform vec3 uHaze;
float hash(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+7.1; a*=.5; } return s; }
vec3 hazed(vec3 c, float d){ float f = 1.0 - exp(-d/2400.0); return mix(c, uHaze*(1.0-0.35*uDusk), f*0.85); }
`;

export function buildCity() {
  const scene = new THREE.Scene();
  const U = { uTime: { value: 0 }, uDusk: { value: 0 }, uHaze: { value: HAZE } };
  const tick = [];

  // ---------- sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(11000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: COMMON + /* glsl */`
      varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); float e = d.y; float az = atan(d.x, -d.z);
        float dk = uDusk;
        vec3 hor = mix(vec3(1.0,0.60,0.26), vec3(0.95,0.42,0.22), dk);
        vec3 pink = mix(vec3(0.93,0.42,0.47), vec3(0.72,0.28,0.45), dk);
        vec3 vio = mix(vec3(0.42,0.30,0.66), vec3(0.26,0.19,0.50), dk);
        vec3 top = mix(vec3(0.13,0.15,0.36), vec3(0.05,0.06,0.20), dk);
        vec3 c = mix(hor, pink, smoothstep(0.0, 0.085, e));
        c = mix(c, vio, smoothstep(0.05, 0.22, e));
        c = mix(c, top, smoothstep(0.18, 0.62, e));
        float sun = exp(-(pow(az+0.16,2.0)*5.0 + pow(e+0.005,2.0)*110.0));
        c += vec3(1.0,0.72,0.30)*sun*(0.75-0.3*dk);
        // long thin clouds, lit from below
        vec2 q = vec2(az*2.2, e*17.0);
        float cl = smoothstep(0.50, 0.78, fbm(q*vec2(1.0,1.7)+vec2(uTime*0.004,0.0)));
        float band = smoothstep(0.015,0.07,e)*(1.0-smoothstep(0.26,0.42,e));
        vec3 cc = mix(vec3(1.0,0.50,0.30), vec3(0.34,0.22,0.46), smoothstep(0.03,0.26,e));
        c = mix(c, cc, cl*band*0.72);
        float st = step(0.9965, hash(floor(d.xy*420.0)))*smoothstep(0.22,0.5,e)*(0.25+0.75*dk);
        c += st*vec3(1.0,0.95,0.9)*(0.6+0.4*sin(uTime*2.0+d.x*90.0));
        c = mix(c, hor*0.9, (1.0-smoothstep(-0.02, 0.0, e))*0.9);
        gl_FragColor = vec4(c, 1.0);
      }` }));
  sky.frustumCulled = false; scene.add(sky);

  // ---------- hills (Collserola) as layered silhouettes
  function ridge(z, fn, top, bot, extra, rim) {
    const sh = new THREE.Shape(); const X = 9000;
    sh.moveTo(-X, GROUND - 20);
    for (let x = -X; x <= X; x += 60) sh.lineTo(x, fn(x));
    sh.lineTo(X, GROUND - 20);
    const geos = [new THREE.ShapeGeometry(sh)];
    if (extra) geos.push(...extra);
    const m = new THREE.Mesh(mergeGeometries(geos.map(g => { const n = g.toNonIndexed(); for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); return n; })), new THREE.ShaderMaterial({
      uniforms: { ...U, cTop: { value: new THREE.Color(top) }, cBot: { value: new THREE.Color(bot) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: COMMON + `uniform vec3 cTop, cBot; varying vec2 vP; void main(){ float h = smoothstep(${(GROUND).toFixed(1)}, 420.0, vP.y); vec3 c = mix(cBot, cTop, h); float n = fbm(vec2(vP.x/420.0, vP.y/110.0)); c *= 0.82 + 0.36*n; c = mix(c, vec3(0.20,0.36,0.30), 0.22*smoothstep(0.45, 0.7, n)); gl_FragColor = vec4(c*(1.0-0.25*uDusk), 1.0); }` }));
    m.position.z = z; scene.add(m);
    // sunset rim along the crest, and house lights on the slopes
    const rp = []; for (let x = -X; x <= X; x += 60) rp.push(new THREE.Vector3(x, fn(x) + 1.5, z + 2));
    for (const [dy, op] of [[0, 0.95], [-5, 0.5], [-11, 0.25]]) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rp.map(p => p.clone().setY(p.y + dy))), new THREE.LineBasicMaterial({ color: rim, transparent: true, opacity: op })); scene.add(l); }
    const lp = []; let rr = z * 7 + 3; const R = () => (rr = (Math.abs(rr) * 16807 + 11) % 2147483647) / 2147483647;
    for (let k = 0; k < 360; k++) { const x = (R() - 0.5) * 9000; const top2 = fn(x); const y = GROUND + 8 + Math.pow(R(), 2.8) * (top2 - GROUND) * 0.55; lp.push(x, y, z + 4); }
    const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)), new THREE.PointsMaterial({ color: '#ffbe78', size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; scene.add(pts); dots.push(pts);
    return m;
  }
  const dots = [];
  const far = x => 250 + 120 * Math.sin(x / 1700 + 1) + 60 * Math.sin(x / 520 + 2) + 22 * Math.sin(x / 170) + 190 * Math.exp(-Math.pow((x + 1500) / 900, 2)) + 60 * Math.exp(-Math.pow((x - 2600) / 700, 2));
  const TX = -1250, TZ = -7000; // Torre de Collserola
  const rect = (x, y, w, h) => { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y + h / 2, 0); return g; };
  const tb = far(TX);
  const towerParts = [rect(TX, tb - 10, 8, 200), rect(TX, tb + 100, 24, 32), rect(TX, tb + 132, 14, 9), rect(TX, tb + 190, 3, 60), rect(TX, tb + 80, 13, 20)];
  const cb = far(TX + 620); // Tibidabo church, small
  const church = [rect(TX + 620, cb - 5, 60, 40), rect(TX + 620, cb + 30, 14, 60), rect(TX + 596, cb + 30, 8, 26), rect(TX + 644, cb + 30, 8, 26)];
  ridge(TZ, far, '#4b4f8c', '#c8708a', [...towerParts, ...church], '#ffb070');
  ridge(-4300, x => 60 + 70 * Math.sin(x / 900 + 3) + 30 * Math.sin(x / 260) + 130 * Math.exp(-Math.pow((x - 900) / 600, 2)) + 90 * Math.exp(-Math.pow((x + 2600) / 800, 2)), '#2f4d5e', '#93587c', null, '#ff9a6a');
  const red = glowSprite('#ff3a2a', 46); red.position.set(TX, tb + 252, TZ + 5); scene.add(red);
  tick.push(t => { red.material.opacity = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.4), 6); });
  { const cg = glowSprite('#ffb866', 95); cg.position.set(TX + 620, cb + 40, TZ + 6); cg.material.opacity = 0.5; scene.add(cg);
    for (const dy of [118, 150, 196]) { const w = glowSprite('#fff2dd', 26); w.position.set(TX, tb + dy, TZ + 6); w.material.opacity = 0.9; scene.add(w); }
    const wp = [], wc = []; const pal = ['#ff5a6a', '#ffd24a', '#5ad1ff', '#7dff9a', '#ff8ad8']; const col = new THREE.Color();
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; wp.push(Math.cos(a) * 42, Math.sin(a) * 42, 0); col.set(pal[k % 5]); wc.push(col.r, col.g, col.b); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; wp.push(Math.cos(a) * 21, Math.sin(a) * 21, 0); wc.push(1, 0.95, 0.8); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
    const wheel = new THREE.Points(wg, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    wheel.position.set(TX + 780, far(TX + 780) + 46, TZ + 6); wheel.frustumCulled = false; scene.add(wheel); dots.push(wheel);
    tick.push(t => { wheel.rotation.z = t * 0.12; }); }

  // ---------- ground with streets, car lights
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16000, 9000).rotateX(-Math.PI / 2).translate(0, GROUND, -4300), new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec3 vW; void main(){ vW = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: COMMON + /* glsl */`
      varying vec3 vW;
      void main(){
        float cs = cos(${ROT.toFixed(3)}), sn = sin(${ROT.toFixed(3)});
        vec2 g = vec2(cs*vW.x - sn*vW.z, sn*vW.x + cs*vW.z) / ${GRID.toFixed(1)};
        vec2 f = abs(fract(g) - 0.5) * ${GRID.toFixed(1)};
        float dist = length(vW - cameraPosition);
        float street = max(smoothstep(55.0, 57.5, f.x), smoothstep(55.0, 57.5, f.y));
        float lamps = 0.25 + 0.75*smoothstep(4.0, 40.0, uTime + 30.0*uDusk);
        vec3 c = mix(vec3(0.10,0.07,0.12), vec3(0.34,0.19,0.12) + vec3(0.9,0.5,0.2)*0.55*lamps, street);
        float mm = max(f.x, f.y); float tree = smoothstep(56.8, 58.0, mm)*smoothstep(61.5, 60.0, mm)*step(0.42, noise(vW.xz*0.33));
        c = mix(c, vec3(0.16,0.38,0.20) + vec3(0.22,0.16,0.02)*lamps, tree*0.9);
        // cars: small lights sliding along the streets
        float lane = f.x > f.y ? floor(g.x) : floor(g.y) + 57.0;
        float along = (f.x > f.y ? g.y : g.x) * ${GRID.toFixed(1)};
        float dirn = mod(lane, 2.0) < 1.0 ? 1.0 : -1.0;
        float car = smoothstep(0.93, 1.0, 1.0 - abs(fract(along/70.0 - dirn*uTime*0.12 + hash(vec2(lane, 1.0))) - 0.5)*2.0);
        c += street * car * (dirn > 0.0 ? vec3(1.0,0.2,0.12) : vec3(1.0,0.9,0.7)) * 1.2 * smoothstep(1800.0, 300.0, dist);
        float far = smoothstep(2400.0, 5200.0, dist);
        c = mix(c, vec3(0.16,0.10,0.17), far);
        gl_FragColor = vec4(hazed(c, dist), 1.0);
      }` }));
  scene.add(ground);

  // ---------- buildings shader (blocks + near rooftops)
  const bMat = () => new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      attribute float aSeed; varying vec3 vW; varying vec3 vN; varying float vSeed;
      void main(){
        vec4 p = vec4(position,1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p; vN = normalize(mat3(instanceMatrix) * normal);
        #else
          vN = normal;
        #endif
        vSeed = aSeed; vec4 w = modelMatrix * p; vW = w.xyz; vN = normalize(mat3(modelMatrix)*vN);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: COMMON + /* glsl */`
      varying vec3 vW; varying vec3 vN; varying float vSeed;
      void main(){
        vec3 n = normalize(vN); float dist = length(vW - cameraPosition);
        vec3 c;
        float lit = 0.24 + 0.34*smoothstep(0.0, 70.0, uTime + 60.0*uDusk);
        if (n.y > 0.6) {
          float k = hash(floor(vW.xz/7.0) + vSeed);
          float gk = hash(floor(vW.xz/11.0) + vSeed*3.0); c = mix(vec3(0.36,0.22,0.22), vec3(0.50,0.31,0.26), k); c = mix(c, vec3(0.20,0.38,0.25), step(0.87, gk)); c = mix(c, vec3(0.52,0.47,0.50), step(gk, 0.10)); c *= 0.86 + 0.28*noise(vW.xz*0.11); vec2 rc = abs(fract(vW.xz/13.0) - 0.5); float pl = smoothstep(0.0, 0.035, 0.5 - max(rc.x, rc.y)); c *= mix(0.74 + 0.26*pl, 0.94, clamp(fwidth(vW.x/13.0)*9.0, 0.0, 1.0));
          c += vec3(0.34,0.15,0.06) * 0.26;     // last light on the flat roofs
        } else {
          float u = dot(vW.xz, vec2(-n.z, n.x)); float v = vW.y - (${GROUND.toFixed(1)});
          vec2 s = vec2(u/2.6, v/3.2); vec2 cell = floor(s); vec2 f = fract(s);
          float win = step(0.32,f.x)*step(f.x,0.68)*step(0.16,f.y)*step(f.y,0.8);
          float h = hash(cell + vSeed*17.0);
          float on = step(h, lit) * (0.75 + 0.25*sin(uTime*0.7 + h*40.0));
          float soon = step(h, lit+0.004)*step(lit, h); on += soon*step(0.5, fract(uTime*7.0));
          float face = 0.5 + 0.5*dot(n, normalize(vec3(-0.35,0.0,-1.0)));
          float ph = hash(vec2(floor(u/15.0), vSeed)); vec3 pal = ph < 0.25 ? vec3(0.92,0.68,0.40) : ph < 0.5 ? vec3(0.92,0.54,0.45) : ph < 0.7 ? vec3(0.95,0.84,0.66) : ph < 0.85 ? vec3(0.60,0.74,0.62) : vec3(0.58,0.66,0.84); vec3 wall = pal * mix(0.60, 1.0, face*face) + vec3(0.06,0.04,0.10);
          wall *= 0.80 + 0.20*step(0.1, f.y); wall *= 0.88 + 0.12*step(0.06, f.x); float balc = step(0.24,f.x)*step(f.x,0.76)*step(0.07,f.y)*step(f.y,0.16); wall = mix(wall, vec3(0.10,0.08,0.13), balc*0.7*(1.0-clamp(fwidth(s.y)*3.0,0.0,1.0)));                   // floor lines
          vec3 warm = mix(vec3(1.0,0.72,0.38), vec3(1.0,0.90,0.68), hash(cell*1.7+vSeed)); float wk = hash(cell*2.3 + vSeed); warm = mix(warm, vec3(0.45,0.80,1.0), step(0.93, wk)); warm = mix(warm, vec3(1.0,0.45,0.70), step(wk, 0.04));
          float fw = clamp(fwidth(s.x)*1.6, 0.0, 1.0);
          float wv = mix(win, 0.25, fw);
          vec3 shut = hash(cell + 3.1) < 0.35 ? vec3(0.15,0.30,0.25) : wall*0.38; c = mix(wall, shut, wv*(1.0-on));
          c += wv*on*warm*1.25*(0.72 + 0.5*smoothstep(0.16, 0.8, f.y));
          c *= mix(0.7, 1.0, smoothstep(0.0, 14.0, v));
        }
        gl_FragColor = vec4(hazed(c, dist), 1.0);
      }` });

  // Eixample block: chamfered square with a courtyard
  const s = 56.5, ch = 15;
  const shape = new THREE.Shape();
  [[-s + ch, -s], [s - ch, -s], [s, -s + ch], [s, s - ch], [s - ch, s], [-s + ch, s], [-s, s - ch], [-s, -s + ch]].forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  const hole = new THREE.Path(); const hs = 30;
  [[-hs, -hs], [-hs, hs], [hs, hs], [hs, -hs]].forEach(([x, y], i) => i ? hole.lineTo(x, y) : hole.moveTo(x, y)); shape.holes.push(hole);
  const blockGeo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).rotateX(-Math.PI / 2);
  const cs = Math.cos(ROT), sn = Math.sin(ROT);
  const cell = (i, j) => new THREE.Vector3(cs * i * GRID + sn * j * GRID, GROUND, -sn * i * GRID + cs * j * GRID);
  // which cell is the basilica in
  const sfI = 1, sfJ = -8; const sfPos = cell(sfI, sfJ);
  const cells = [];
  for (let j = -1; j >= -30; j--) for (let i = -26; i <= 26; i++) {
    const p = cell(i, j); if (p.z > -70 || Math.abs(p.x) > 3200 || p.z < -3700) continue;
    if (j === sfJ && Math.abs(i - sfI) <= 1) continue;
    cells.push([p, i, j]);
  }
  const blocks = new THREE.InstancedMesh(blockGeo, bMat(), cells.length);
  const seeds = new Float32Array(cells.length); const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ROT);
  const lampPos = [], lampOn = [];
  let rnd = 1; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  cells.forEach(([p, i, j], k) => {
    const h = 20 + R() * 7 + (R() > 0.9 ? 6 : 0);
    M.compose(p, Q, new THREE.Vector3(1, h, 1)); blocks.setMatrixAt(k, M); seeds[k] = R() * 100;
    if (p.z > -2300 && Math.abs(p.x) < 1900) for (let a = 0; a < 4; a++) for (let b = -1; b <= 1; b++) {
      const lx = [b * 40, 66, b * 40, -66][a], lz = [66, b * 40, -66, b * 40][a];
      lampPos.push(p.x + cs * lx + sn * lz, GROUND + 9, p.z - sn * lx + cs * lz); lampOn.push(1.5 + R() * 34);
    }
  });
  blockGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  blocks.frustumCulled = false; scene.add(blocks);
  // parks beside the basilica
  for (const di of [-1, 1]) {
    const p = cell(sfI + di, sfJ); const park = new THREE.Mesh(new THREE.CylinderGeometry(52, 56, 13, 14), new THREE.MeshBasicMaterial({ color: '#2f2a30' }));
    park.position.set(p.x, GROUND + 6, p.z); scene.add(park);
  }

  // street lamps, coming on one by one, and far city lights
  let rr = 7; const R2 = () => (rr = (rr * 48271) % 2147483647) / 2147483647;
  for (let k = 0; k < 2600; k++) { const z = -2300 - Math.pow(R2(), 1.5) * 4300; lampPos.push((R2() - 0.5) * 9000, GROUND + 8 + R2() * 30 + Math.max(0, (-z - 4200) * 0.04), z); lampOn.push(R2() * 60 - 12); }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3)); lg.setAttribute('aOn', new THREE.Float32BufferAttribute(lampOn, 1));
  const lamps = new THREE.Points(lg, new THREE.ShaderMaterial({
    uniforms: { ...U, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aOn; uniform float uTime, uDusk, uPx; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); float t = uTime + uDusk*30.0 - aOn; float on = step(0.0, t) * (t < 0.5 ? step(0.5, fract(t*9.0)) : 1.0); vA = on * (0.75 + 0.25*sin(uTime*3.0 + aOn*20.0)); gl_PointSize = clamp(2600.0/(-mv.z), 1.6, 9.0) * uPx; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(1.0,0.72,0.36)*vA*smoothstep(0.5,0.05,d)*1.5, 1.0); }` }));
  lamps.frustumCulled = false; scene.add(lamps);

  // ---------- near rooftops, real 3D for parallax
  const near = [], clutter = [];
  const B = (x, yTop, z, w, d, seed) => { const g = new THREE.BoxGeometry(w, yTop - GROUND, d); g.translate(x, (yTop + GROUND) / 2, z); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(seed), 1)); near.push(g); };
  const C = (x, y, z, w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); clutter.push(g); };
  let r3 = 11; const R3 = () => (r3 = (r3 * 16807) % 2147483647) / 2147483647;
  const roofs = [];
  let x = -75; while (x < 80) { const w = 13 + R3() * 9; const top = -11 + R3() * 5.5; B(x + w / 2, top, -47, w - 0.4, 26, R3() * 50); roofs.push([x + w / 2, top, -47, w, 26]); x += w; }
  x = -60; while (x < 60) { const w = 11 + R3() * 8; const top = -15 + R3() * 6; B(x + w / 2, top, -15, w - 0.3, 18, R3() * 50); roofs.push([x + w / 2, top, -15, w, 18]); x += w; }
  for (const [rx, top, rz, w, d] of roofs) {
    C(rx, top, rz + d / 2 - 0.2, w - 0.4, 1.0, 0.3); C(rx, top, rz - d / 2 + 0.2, w - 0.4, 1.0, 0.3); C(rx - w / 2 + 0.3, top, rz, 0.3, 1.0, d);
    C(rx + (R3() - 0.5) * w * 0.5, top, rz + (R3() - 0.5) * d * 0.4, 3.4, 2.7, 4.2);               // stair hut
    if (R3() > 0.4) { const cx = rx + (R3() - 0.5) * w * 0.6, cz = rz + (R3() - 0.5) * d * 0.5; for (let k = 0; k < 3; k++) C(cx + k * 0.7, top, cz, 0.45, 1.5 + (k % 2) * 0.3, 0.45); C(cx + 0.7, top + 1.5, cz, 2.1, 0.12, 0.7); }
    if (R3() > 0.5) { const ax = rx + (R3() - 0.5) * w * 0.7, az = rz + (R3() - 0.5) * d * 0.6; C(ax, top, az, 0.07, 4.2, 0.07); C(ax, top + 3.4, az, 1.5, 0.05, 0.05); C(ax, top + 3.0, az, 1.1, 0.05, 0.05); C(ax, top + 3.8, az, 0.8, 0.05, 0.05); }
    if (R3() > 0.55) { const g = new THREE.CylinderGeometry(0.75, 0.75, 1.6, 10); g.translate(rx + (R3() - 0.5) * w * 0.5, top + 1.5, rz - d * 0.25); clutter.push(g); C(rx, top, rz - d * 0.25, 1.9, 0.7, 1.9); }
  }
  scene.add(new THREE.Mesh(mergeGeometries(near), bMat()));
  const cl = new THREE.Mesh(mergeGeometries(clutter.map(g => g.toNonIndexed())), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normal; vW = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vN; varying vec3 vW; uniform float uDusk; void main(){ float f = 0.5+0.5*dot(normalize(vN), normalize(vec3(-0.35,0.35,-1.0))); vec3 c = mix(vec3(0.17,0.11,0.17), vec3(0.72,0.40,0.27), f*f); gl_FragColor = vec4(c*(1.0-0.25*uDusk), 1.0); }` }));
  scene.add(cl);

  // ---------- life on the near rooftops: parasols, planters, strings of lights
  { const props = [], sl = []; let r5 = 23; const R5 = () => (r5 = (r5 * 16807) % 2147483647) / 2147483647; const col = new THREE.Color();
    const P = (g, hex) => { g = g.index ? g.toNonIndexed() : g; col.set(hex); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); g.deleteAttribute('uv'); g.deleteAttribute('normal'); props.push(g); };
    const pal = ['#e8502f', '#f3bd4e', '#19a08c', '#f6f1e6', '#e86a9a'];
    for (const [rx, top, rz, w, d] of roofs) {
      for (let k = 0; k < 4; k++) { if (R5() > 0.6) continue; const g = new THREE.BoxGeometry(1.5, 0.9, 0.8); g.translate(rx - w / 2 + 1.4 + k * (w - 2.8) / 3, top + 0.45, rz + d / 2 - 1.0); P(g, R5() > 0.5 ? '#3f8a4a' : '#2f6f45'); const f = new THREE.BoxGeometry(1.3, 0.28, 0.6); f.translate(rx - w / 2 + 1.4 + k * (w - 2.8) / 3, top + 1.0, rz + d / 2 - 1.0); P(f, pal[Math.floor(R5() * 5)]); }
      if (R5() > 0.45) { const px = rx + (R5() - 0.5) * w * 0.5, pz = rz + d * 0.22; const c = new THREE.ConeGeometry(1.7, 0.7, 8); c.translate(px, top + 2.5, pz); P(c, pal[Math.floor(R5() * 5)]); const pole = new THREE.BoxGeometry(0.08, 2.4, 0.08); pole.translate(px, top + 1.2, pz); P(pole, '#e9e4d8'); const tb = new THREE.CylinderGeometry(0.6, 0.6, 0.08, 10); tb.translate(px, top + 0.8, pz); P(tb, '#f1eee8');
        const x0 = px - 4, x1 = px + 4; for (let k = 0; k <= 16; k++) { const u = k / 16; sl.push(x0 + (x1 - x0) * u, top + 3.2 - Math.sin(u * Math.PI) * 0.6, pz + 1.6); } }
      if (R5() > 0.6) { const g = new THREE.BoxGeometry(3.0, 0.05, 1.6); g.translate(rx + (R5() - 0.5) * w * 0.4, top + 1.9, rz - d * 0.05); P(g, R5() > 0.5 ? '#f6f1e6' : '#7fb4e8'); }
    }
    scene.add(new THREE.Mesh(mergeGeometries(props), new THREE.MeshBasicMaterial({ vertexColors: true })));
    const sp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sl, 3)), new THREE.PointsMaterial({ color: '#ffd9a0', size: 3.2, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.frustumCulled = false; scene.add(sp); dots.push(sp); tick.push(t => { sp.material.opacity = 0.8 + 0.2 * Math.sin(t * 2.3); }); }
  // birds crossing the sky
  { const N = 7, pos = new Float32Array(N * 12); const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const birds = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#2a1a33' })); birds.frustumCulled = false; scene.add(birds);
    tick.push(t => { for (let i = 0; i < N; i++) { const x = ((t * 7 + i * 71) % 520) - 300 + Math.sin(i * 3.1) * 12, y = 46 + (i % 3) * 9 + Math.sin(t * 0.5 + i) * 3 + (i > 3 ? 22 : 0), z = -330 - (i % 4) * 26, fl = Math.sin(t * 7 + i * 1.7) * 0.9, o = i * 12;
      pos[o] = x - 2.1; pos[o + 1] = y + fl; pos[o + 2] = z; pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z; pos[o + 6] = x; pos[o + 7] = y; pos[o + 8] = z; pos[o + 9] = x + 2.1; pos[o + 10] = y + fl; pos[o + 11] = z; } bg.attributes.position.needsUpdate = true; }); }
  // Torre Glòries, with its skin of coloured lights
  { const H = 144, pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push(new THREE.Vector2(19.5 * Math.sqrt(Math.max(0, 1 - Math.pow(k, 2.7))) + 0.2, k * H)); }
    const tg = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: COMMON + `varying vec2 vUv; varying vec3 vW; void main(){ vec2 cell = floor(vec2(vUv.x*56.0, vUv.y*46.0)); float n = hash(cell); float wv = 0.5 + 0.5*sin(vUv.y*7.0 - uTime*0.5 + n*2.5 + vUv.x*6.283);
        vec3 led = mix(vec3(0.18,0.34,1.0), vec3(1.0,0.16,0.30), smoothstep(0.3, 0.7, wv)); led = mix(led, vec3(1.0,0.3,0.9), step(0.9, n));
        vec3 c = vec3(0.07,0.07,0.14) + led*(0.35 + 0.65*n)*step(0.22, fract(vUv.y*46.0))*step(0.15, fract(vUv.x*56.0)); gl_FragColor = vec4(hazed(c, length(vW - cameraPosition)*0.5), 1.0); }` }));
    tg.position.set(96, GROUND, -900); scene.add(tg);
    const gl = glowSprite('#b04cff', 260); gl.position.set(96, GROUND + 70, -880); gl.material.opacity = 0.22; scene.add(gl); }

  // ---------- Sagrada Família
  sfPos.x -= 42; const sf = buildSagrada(U, tick); sf.position.copy(sfPos); sf.rotation.y = ROT + 0.42; sf.scale.setScalar(1.12); scene.add(sf);
  const glow = glowSprite('#ffb060', 520); glow.position.set(sfPos.x, GROUND + 70, sfPos.z + 60); glow.material.opacity = 0.34; scene.add(glow);

  return { scene, uniforms: U, lamps, dots, update(t, dusk) { U.uTime.value = t; U.uDusk.value = dusk; for (const f of tick) f(t); }, sfPos: sfPos.clone().setY(GROUND + 110) };
}

function glowSprite(color, size) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size); return s;
}

function buildSagrada(U, tick) {
  const grp = new THREE.Group(); const parts = [];
  const add = (g, kind, H = 1, y0 = 0) => {
    g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count; const k = new Float32Array(n), rel = new Float32Array(n);
    for (let i = 0; i < n; i++) { k[i] = kind; rel[i] = (g.attributes.position.getY(i) - y0) / H; }
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(k, 1)); g.setAttribute('aRel', new THREE.Float32BufferAttribute(rel, 1));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    parts.push(g); return g;
  };
  const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
  // slender facade tower, tapering to a mosaic pinnacle
  const spire = (x, z, H, r = 4.3) => {
    const P = [[r, 0], [r, .42], [r * .9, .58], [r * .72, .72], [r * .5, .84], [r * .3, .925], [r * .22, .95], [r * .62, .958], [r * .66, .97], [r * .22, .982], [r * .42, .988], [r * .05, 1]].map(p => [p[0], p[1] * H]);
    const g = lathe(P, 12); g.translate(x, 0, z); add(g, 0, H);
  };
  // wide central tower: paraboloid on a drum
  const dome = (x, z, R, hb, H, kind = 1) => {
    const d = H - hb; const P = [[R, 0], [R, hb]];
    for (let i = 1; i <= 10; i++) { const s = i / 10; P.push([R * (1 - Math.pow(s, 2.2)) * (1 - 0.06 * s) + 0.4, hb + d * s]); }
    const g = lathe(P, 16); g.translate(x, 0, z); add(g, kind, H);
  };
  const box = (x, y, z, w, h, d, kind = 2, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); add(g, kind, 60); return g; };
  // nave, aisles, roof, transept, apse
  box(4, 23, 0, 92, 46, 30); box(4, 15, 0, 92, 30, 48);
  { const g = new THREE.BoxGeometry(92, 17, 17); g.rotateX(Math.PI / 4); g.translate(4, 46, 0); add(g, 2, 60); }
  box(0, 23, 0, 26, 46, 62);
  { const g = new THREE.BoxGeometry(17, 17, 62); g.rotateZ(Math.PI / 4); g.translate(0, 46, 0); add(g, 2, 60); }
  { const g = new THREE.CylinderGeometry(21, 21, 40, 14); g.translate(-44, 20, 0); add(g, 2, 60); const c = new THREE.ConeGeometry(21, 16, 14); c.translate(-44, 48, 0); add(c, 2, 60); }
  for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + (i / 6) * Math.PI; const c = new THREE.ConeGeometry(2.6, 22, 6); c.translate(-44 + Math.cos(a) * 21, 49, Math.sin(a) * 21); add(c, 0, 60); }
  // facade gables
  for (const zz of [32, -32]) for (const [dx, h, r] of [[-13, 40, 8], [0, 52, 10], [13, 40, 8]]) { const c = new THREE.ConeGeometry(r, h, 4); c.rotateY(Math.PI / 4); c.translate(dx, h / 2, zz); add(c, 2, 60); }
  // eight facade towers
  for (const [zz, hs] of [[31, [98, 107, 107, 98]], [-31, [102, 112, 112, 102]]]) [-17.5, -6, 6, 17.5].forEach((dx, i) => spire(dx, zz, hs[i]));
  // central towers
  dome(0, 0, 10.5, 72, 165);
  for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) dome(dx, dz, 6.4, 64, 129);
  dome(-29, 0, 7.6, 60, 124);
  const lights = [];
  // cross on the tallest tower, star on the tower over the apse
  { const g1 = new THREE.BoxGeometry(1.8, 12, 1.8); g1.translate(0, 170, 0); add(g1, 4, 1); const g2 = new THREE.BoxGeometry(9, 1.8, 1.8); g2.translate(0, 170.5, 0); add(g2, 4, 1); const g3 = new THREE.BoxGeometry(1.8, 1.8, 9); g3.translate(0, 170.5, 0); add(g3, 4, 1); lights.push([0, 170.5, 0, '#fff0cc', 34, 0.8]); }
  { const g = new THREE.OctahedronGeometry(4.4, 0); g.scale(1, 1, 0.5); g.translate(-29, 130, 0); add(g, 4, 1); const g2 = new THREE.OctahedronGeometry(4.4, 0); g2.scale(0.5, 1, 1); g2.rotateY(Math.PI / 4); g2.translate(-29, 130, 0); add(g2, 4, 1); lights.push([-29, 130, 0, '#fff6dd', 46, 1]); }
  for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) { const g = new THREE.SphereGeometry(1.5, 6, 5); g.translate(dx, 130.5, dz); add(g, 4, 1); }
  // cranes
  const crane = (x, z, H, jib, ang) => {
    const m = new THREE.Matrix4().makeRotationY(ang).setPosition(x, 0, z);
    const mk = (g) => { g.applyMatrix4(m); add(g, 3, 1); };
    const a = new THREE.BoxGeometry(2.2, H, 2.2); a.translate(0, H / 2, 0); mk(a);
    const j = new THREE.BoxGeometry(jib, 1.4, 1.4); j.translate(jib / 2 - 6, H - 3, 0); mk(j);
    const c = new THREE.BoxGeometry(18, 2.2, 2.2); c.translate(-14, H - 3, 0); mk(c);
    const w = new THREE.BoxGeometry(5, 5, 3); w.translate(-20, H - 6, 0); mk(w);
    const t = new THREE.ConeGeometry(1.6, 9, 4); t.translate(0, H + 3.5, 0); mk(t);
    const s1 = new THREE.BoxGeometry(jib * 0.62, 0.35, 0.35); s1.rotateZ(-Math.atan2(10, jib * 0.6)); s1.translate(jib * 0.3, H + 3, 0); mk(s1);
    const hk = new THREE.BoxGeometry(0.3, 26, 0.3); hk.translate(jib * 0.55, H - 16, 0); mk(hk);
    const p = new THREE.Vector3(0, H + 9, 0).applyMatrix4(m); lights.push([p.x, p.y, p.z, '#ff3322', 7, -1]);
  };
  crane(34, -8, 186, 74, 2.6); crane(-58, 14, 150, 58, 0.5); crane(8, -44, 168, 62, -1.1);
  const geo = mergeGeometries(parts.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'aKind', 'aRel'].includes(k)) g.deleteAttribute(k); return g; }));
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `attribute float aKind, aRel; varying float vK, vR; varying vec3 vN, vW; varying vec2 vUv; void main(){ vK = aKind; vR = aRel; vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: COMMON + /* glsl */`
      varying float vK, vR; varying vec3 vN, vW; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN); float h = vW.y - (${GROUND.toFixed(1)});
        float dist = length(vW - cameraPosition);
        vec3 stone = vec3(0.70, 0.58, 0.47);
        float up = exp(-h/75.0);
        float front = 0.55 + 0.45*max(n.z, 0.0);
        vec3 warm = vec3(1.0, 0.63, 0.30) * (0.30 + 1.55*up) * front * (0.75 + 0.25*uDusk);
        vec3 skyl = vec3(0.30, 0.22, 0.40) * (0.75 + 0.25*n.y);
        float rim = pow(max(dot(n, normalize(vec3(-0.75, 0.1, -0.65))), 0.0), 1.5);
        vec3 c = stone * (warm + skyl) + vec3(1.0, 0.45, 0.22) * rim * 0.42; float side = 0.5 + 0.5*dot(n, normalize(vec3(-0.85, 0.1, 0.5))); c *= mix(0.58, 1.14, side);
        if (vK < 0.5) {
          float rows = 30.0; float row = floor(vR*rows);
          float slot = step(0.3, fract(vR*rows)) * step(0.72, fract(vUv.x*12.0 + row*0.5)) * step(0.22, vR) * step(vR, 0.90);
          c = mix(c, vec3(0.12,0.07,0.09) + vec3(1.0,0.6,0.25)*0.3*up, slot*0.7); c *= 1.12;
          float pin = smoothstep(0.945, 0.955, vR);
          vec3 mosaic = mix(vec3(0.95,0.75,0.25), vec3(0.85,0.2,0.15), step(0.5, fract(vR*160.0)));
          c = mix(c, mosaic*(0.55+0.3*rim) + 0.12, pin);
        } else if (vK < 1.5) {
          float rib = 0.72 + 0.28*smoothstep(0.0, 0.5, abs(fract(vUv.x*12.0) - 0.5)*2.0);
          float wn = step(0.6, fract(vR*22.0)) * step(0.55, fract(vUv.x*12.0+0.2)) * step(0.45, vR) * step(vR, 0.92);
          c = c*rib*0.92; c = mix(c, vec3(1.0,0.78,0.42)*0.9, wn*0.22*step(0.5, fract(vUv.x*6.0)));
        } else if (vK < 2.5) {
          float wn = step(0.5, fract(h/9.0)) * step(0.5, fract((vW.x+vW.z)/5.0)) * step(20.0, h) * step(h, 46.0);
          c = mix(c, vec3(1.0,0.7,0.35)*0.8, wn*0.35);
        } else if (vK < 3.5) {
          c = vec3(0.11,0.08,0.12) + vec3(0.5,0.22,0.12)*rim*0.5;
        } else { c = vec3(1.0,0.95,0.80)*1.25; }
        float f = 1.0 - exp(-dist/2400.0);
        gl_FragColor = vec4(mix(c, uHaze*(1.0-0.35*uDusk), f*(vK > 2.5 && vK < 3.5 ? 0.35 : 0.5)), 1.0);
      }` });
  grp.add(new THREE.Mesh(geo, mat));
  for (const [x, y, z, col, size, blink] of lights) {
    const s = glowSprite(col, size); s.position.set(x, y, z); grp.add(s);
    if (blink < 0) tick.push(t => { s.material.opacity = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.0 + x), 8); });
    else tick.push(t => { s.material.opacity = blink * (0.8 + 0.2 * Math.sin(t * 1.3 + x)); });
  }
  return grp;
}
