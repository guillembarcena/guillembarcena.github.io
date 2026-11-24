// The mini-OS inside the monitor. Plain DOM, drawn sharp at full resolution.
import { cvHTML, ABOUT, CARDS, TRACKS } from './data.js?v=16';

const ICON = {
  cv: '<rect x="7" y="4" width="18" height="24" rx="2" fill="#fff"/><path d="M11 10h10M11 15h10M11 20h6" stroke="#2f7bff" stroke-width="2" stroke-linecap="round"/>',
  terminal: '<rect x="4" y="6" width="24" height="20" rx="3" fill="#16181d"/><path d="M9 13l4 3-4 3M15 20h7" stroke="#5dffa0" stroke-width="2" fill="none" stroke-linecap="round"/>',
  hoops: '<circle cx="16" cy="16" r="11" fill="#ef7a2f"/><path d="M5 16h22M16 5v22M8 8c5 4 5 12 0 16M24 8c-5 4-5 12 0 16" stroke="#3a1c08" stroke-width="1.5" fill="none"/>',
  ski: '<path d="M3 26L13 9l5 8 3-4 8 13z" fill="#fff"/><path d="M10 14l3-5 3 5-3-1.5z" fill="#bfe0ff"/><path d="M6 29l20-6" stroke="#e2452c" stroke-width="2.5" stroke-linecap="round"/>',
  paint: '<path d="M16 5c-7 0-11 5-11 10s4 9 8 9c2 0 2-2 3-3s4 0 6-1 5-3 5-7-4-8-11-8z" fill="#fff"/><circle cx="11" cy="13" r="2" fill="#e24a8d"/><circle cx="17" cy="10" r="2" fill="#2f7bff"/><circle cx="22" cy="14" r="2" fill="#f3bd4e"/>',
  drums: '<rect x="5" y="5" width="10" height="10" rx="2" fill="#8a5cf0"/><rect x="17" y="5" width="10" height="10" rx="2" fill="#e24a8d"/><rect x="5" y="17" width="10" height="10" rx="2" fill="#35d6ff"/><rect x="17" y="17" width="10" height="10" rx="2" fill="#f3bd4e"/>',
  notes: '<rect x="6" y="5" width="20" height="22" rx="2" fill="#ffe98a"/><path d="M10 11h12M10 16h12M10 21h7" stroke="#8a6d10" stroke-width="2" stroke-linecap="round"/>',
  settings: '<circle cx="16" cy="16" r="5" fill="none" stroke="#fff" stroke-width="3"/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M24.5 7.5L21 11M11 21l-3.5 3.5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
};
const svg = k => `<svg viewBox="0 0 32 32" aria-hidden="true">${ICON[k]}</svg>`;
const WALLS = {
  room: { name: 'The room at dusk', css: 'url(og.jpg) center/cover, #2a2459' },
  dusk: { name: 'Dusk sky', css: 'linear-gradient(180deg,#1d1f4d 0%,#5a3a82 38%,#c9567a 68%,#f6a05a 100%)' },
  grid: { name: 'Eixample grid', css: 'radial-gradient(circle at 50% 50%, #f3bd4e 0 14%, transparent 15%) 0 0/84px 84px, linear-gradient(#20263f 0 0)' },
  court: { name: 'Court', css: 'radial-gradient(circle at 50% 110%, transparent 0 34%, #f6e7cf 34% 35%, transparent 35%), linear-gradient(180deg,#c7652c,#9d4517)' },
};

const S = { root: null, audio: null, exit: null, openObject: null, z: 10, wins: {}, booted: false, best: 0, skiBest: 0 };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

const APPS = {
  cv: { title: 'CV', w: 900, h: 760, build: cvApp },
  terminal: { title: 'Terminal', w: 620, h: 400, build: termApp },
  hoops: { title: 'Free throws', w: 640, h: 470, build: hoopsApp },
  ski: { title: 'Ski run', w: 520, h: 620, build: skiApp },
  paint: { title: 'Paint', w: 660, h: 480, build: paintApp },
  drums: { title: 'Drum pad', w: 420, h: 470, build: drumApp },
  notes: { title: 'Notes', w: 460, h: 420, build: notesApp },
  settings: { title: 'Settings', w: 480, h: 400, build: settingsApp },
};

export const OS = {
  init(o) {
    Object.assign(S, o); const r = S.root;
    r.innerHTML = `<div class="os-wall"></div><div class="os-bar"><b>Guillem’s computer</b><span class="os-bar-r"><button class="os-snd"></button><button class="os-back">Back to the room</button></span></div>
      <div class="os-desk"></div><div class="os-dock"></div><div class="os-boot"><div class="os-boot-in"><div class="os-logo"><i></i><i></i><i></i><i></i></div><p>Starting up</p><div class="os-prog"><span></span></div></div></div>`;
    const dock = r.querySelector('.os-dock');
    for (const k of Object.keys(APPS)) { const b = el('button', 'os-ico', svg(k) + `<span>${APPS[k].title}</span>`); b.dataset.app = k; b.onclick = () => OS.open(k); dock.appendChild(b); }
    r.querySelector('.os-back').onclick = () => S.exit();
    r.addEventListener('dblclick', e => { if (!e.target.closest('.os-win, .os-dock, .os-bar')) S.exit(); });   // double click on the desktop goes back to the room
    const snd = r.querySelector('.os-snd'); const upd = on => snd.textContent = on ? 'Sound on' : 'Enable sound'; upd(S.audio.enabled); S.audio.listeners.push(upd); snd.onclick = () => S.audio.toggle();
    setWall(sessionGet('wall') || 'room');
  },
  enter(o = {}) {
    const boot = S.root.querySelector('.os-boot');
    const after = () => { boot.classList.add('done'); if (!S.wins.cv || o.app) OS.open(o.app || 'cv', o); };
    if (S.booted || o.instant) { S.booted = true; boot.classList.add('done', 'skip'); after(); }
    else { S.booted = true; boot.classList.add('run'); setTimeout(after, 1500); }
  },
  leave() { S.audio.stopLoop(); },
  open(id, o = {}) {
    const A = APPS[id]; if (!A) return null; let w = S.wins[id];
    if (!w) {
      w = el('div', 'os-win'); w.innerHTML = `<div class="os-tb"><span class="os-btns"><button class="c" aria-label="Close"></button><button class="m" aria-label="Minimise"></button><button class="f" aria-label="Maximise"></button></span><b>${A.title}</b></div><div class="os-body"></div><i class="os-rs"></i>`;
      const desk = S.root.querySelector('.os-desk'); const dw = desk.clientWidth || innerWidth, dh = desk.clientHeight || innerHeight - 120;
      const small = dw < 700; const ww = Math.min(A.w, dw - (small ? 8 : 40)), hh = Math.min(A.h, dh - (small ? 8 : 30)); const n = Object.keys(S.wins).length;
      Object.assign(w.style, { width: ww + 'px', height: hh + 'px', left: Math.max(4, (dw - ww) / 2 + (small ? 0 : (n % 4) * 34 - 40)) + 'px', top: Math.max(4, (dh - hh) / 2 + (small ? 0 : (n % 4) * 26 - 20)) + 'px' });
      desk.appendChild(w); S.wins[id] = w; w.dataset.app = id;
      w.addEventListener('pointerdown', () => focus(w), true);
      drag(w.querySelector('.os-tb'), (dx, dy, st) => { if (w.classList.contains('max')) return; w.style.left = st.l + dx + 'px'; w.style.top = Math.max(0, st.t + dy) + 'px'; }, () => ({ l: w.offsetLeft, t: w.offsetTop }));
      drag(w.querySelector('.os-rs'), (dx, dy, st) => { w.style.width = Math.max(300, st.w + dx) + 'px'; w.style.height = Math.max(220, st.h + dy) + 'px'; w.dispatchEvent(new Event('resized')); }, () => ({ w: w.offsetWidth, h: w.offsetHeight }));
      w.querySelector('.c').onclick = () => { w.dispatchEvent(new Event('closed')); w.remove(); delete S.wins[id]; dockState(); };
      w.querySelector('.m').onclick = () => { w.classList.add('min'); dockState(); };
      w.querySelector('.f').onclick = () => { w.classList.toggle('max'); w.dispatchEvent(new Event('resized')); };
      w.querySelector('.os-tb').ondblclick = () => w.querySelector('.f').onclick();
      A.build(w.querySelector('.os-body'), w);
      requestAnimationFrame(() => w.classList.add('in'));
    }
    w.classList.remove('min'); if (o.max) w.classList.add('max'); focus(w); dockState();
    if (id === 'cv' && o.section) setTimeout(() => { const t = w.querySelector('#cv-' + o.section); if (t) { t.scrollIntoView({ block: 'start' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1600); } }, 60);
    return w;
  },
  plainCV(target) { target.innerHTML = `<main class="cv-doc plain">${cvHTML()}<p class="cv-dl"><a href="assets/cv.pdf">Download CV (PDF)</a></p></main>`; checkPdf(target.querySelector('.cv-dl')); },
};
function focus(w) { w.style.zIndex = ++S.z; for (const k in S.wins) S.wins[k].classList.toggle('top', S.wins[k] === w); }
function dockState() { S.root.querySelectorAll('.os-ico').forEach(b => b.classList.toggle('open', !!S.wins[b.dataset.app])); }
function drag(handle, move, start) {
  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return; const st = start(); const x0 = e.clientX, y0 = e.clientY; handle.setPointerCapture(e.pointerId); e.preventDefault();
    const mv = ev => move(ev.clientX - x0, ev.clientY - y0, st); const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
    handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
  });
}
function sessionGet(k) { try { return sessionStorage.getItem('room-' + k); } catch (e) { return null; } }
function sessionSet(k, v) { try { sessionStorage.setItem('room-' + k, v); } catch (e) { } }
function setWall(k) { if (!WALLS[k]) k = 'dusk'; const w = S.root.querySelector('.os-wall'); w.style.background = WALLS[k].css; w.style.filter = k === 'room' ? 'blur(3px) brightness(.82)' : ''; w.style.transform = k === 'room' ? 'scale(1.03)' : ''; S.wall = k; sessionSet('wall', k); }
function checkPdf(node) { fetch('assets/cv.pdf', { method: 'HEAD' }).then(r => { if (!r.ok) node.hidden = true; }).catch(() => { node.hidden = true; }); }

// ---------------------------------------------------------------- programs
function cvApp(body) {
  body.classList.add('cv-app');
  body.innerHTML = `<nav class="cv-nav"><a data-s="education">Education</a><a data-s="experience">Experience</a><a data-s="additional">Additional</a><a data-s="skills">Skills</a><a data-s="beyond">Beyond work</a><a class="cv-dl" href="assets/cv.pdf" download>Download CV (PDF)</a></nav><div class="cv-scroll"><div class="cv-doc">${cvHTML()}</div></div>`;
  body.querySelectorAll('[data-s]').forEach(a => a.onclick = () => body.querySelector('#cv-' + a.dataset.s).scrollIntoView({ behavior: 'smooth', block: 'start' }));
  checkPdf(body.querySelector('.cv-dl'));
}

function termApp(body) {
  body.classList.add('term'); body.innerHTML = '<div class="term-out"></div><div class="term-in"><span>guillem@room ~ %</span><input spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Command"></div>';
  const out = body.querySelector('.term-out'), inp = body.querySelector('input'); const hist = []; let hi = 0;
  const print = (t, cls) => { const d = el('div', cls); d.textContent = t; out.appendChild(d); out.scrollTop = 1e6; };
  const objs = Object.keys(CARDS).filter(k => k !== 'computer');
  const cmds = {
    help: () => 'Commands: help, whoami, cv, ls shelf, open <object>, marathon, skills, how, clear\nPrograms: open ski, open hoops, open paint, open drums\nAlso try: coffee, dj, sudo',
    whoami: () => 'Guillem Bárcena Folia. Economist, oriented to health and public policy,\nand to startups, technology and innovation.',
    cv: () => { OS.open('cv'); return 'Opening the CV.'; },
    ls: a => a === 'shelf' || !a ? objs.join('   ') : `ls: ${a}: no such shelf`,
    open: a => { if (objs.includes(a)) { setTimeout(() => S.openObject(a), 500); return `Flying back to the room to look at: ${CARDS[a].name}.`; } if (APPS[a]) { OS.open(a); return 'Opening ' + APPS[a].title + '.'; } return 'Usage: open <object>. Objects: ' + objs.join(', '); },
    marathon: () => 'Barcelona Marathon 2026\nbib      26021\nfinish   3:15:33\n' + '▁▂▃▄▅▆▇█▇▆▅▅▆▇█▇▆▅▄▃  done.',
    skills: () => 'Generative and agentic AI   ████████████\nStata                       █████████\nRStudio                     █████████\nExcel                       ██████████\nLanguages: Catalan and Spanish (native), English (fluent)',
    how: () => 'The room was modelled in Blender with Python, and its light was baked with Cycles.\nthree.js draws those baked textures, plus the city outside and the live parts.\nAll of it was made with Claude Code.',
    coffee: () => 'The mug on the desk is empty. Brewing is not implemented.',
    dj: () => { if (!S.audio.enabled) return 'Sound is off. Click "Enable sound" first.'; S.audio.playing ? S.audio.stopLoop() : S.audio.startLoop(); return S.audio.playing ? 'Playing a short house loop.' : 'Stopped.'; },
    sudo: () => 'Nice try. This computer only takes orders from its owner.',
    exit: () => { setTimeout(() => S.exit(), 300); return 'Back to the room.'; },
    records: () => TRACKS.map(t => t.artist + ' - ' + t.title).join('\n'),
    clear: () => { out.innerHTML = ''; return ''; },
  };
  const run = line => { print('guillem@room ~ % ' + line, 'cmd'); const [c, ...r] = line.trim().split(/\s+/); if (!c) return; const f = cmds[c.toLowerCase()]; const res = f ? f(r.join(' ').toLowerCase()) : `command not found: ${c}. Type help.`; if (res) print(res); };
  print('Welcome. Type help to see what this terminal can do.');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = inp.value; inp.value = ''; if (v.trim()) { hist.push(v); hi = hist.length; } run(v); } else if (e.key === 'ArrowUp') { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); } else if (e.key === 'ArrowDown') { inp.value = hist[++hi] || ''; hi = Math.min(hi, hist.length); } e.stopPropagation(); });
  body.addEventListener('pointerup', () => { if (!getSelection().toString()) inp.focus({ preventScroll: true }); });
  body._run = run; if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => inp.focus({ preventScroll: true }), 50);
}

function hoopsApp(body, win) {
  body.classList.add('hoops'); body.innerHTML = '<canvas></canvas><div class="hoops-hud"><span class="sc"></span><span class="hint">Hold to set the power, release to shoot.</span></div>';
  const c = body.querySelector('canvas'), g = c.getContext('2d'); let W = 600, H = 380, raf = 0, alive = true;
  const st = { score: 0, streak: 0, charge: 0, charging: false, ball: null, hoopX: 0.78, msg: '', msgT: 0, net: 0 };
  const hud = () => body.querySelector('.sc').textContent = `Score ${st.score}   Best this session ${S.best}`;
  const fit = () => { W = Math.max(280, body.clientWidth); H = Math.max(180, body.clientHeight - 34); const d = Math.min(2, devicePixelRatio || 1); c.width = W * d; c.height = H * d; c.style.width = W + 'px'; c.style.height = H + 'px'; g.setTransform(d, 0, 0, d, 0, 0); };
  const floor = () => H - 36, start = () => ({ x: W * 0.14, y: floor() - 70 }), hoop = () => ({ x: W * st.hoopX, y: floor() - Math.min(210, H * 0.5) });
  const shoot = () => { const p = 0.35 + st.charge * 0.65; const sp = (W * 0.55 + 520) * p; const a = -1.02; st.ball = { ...start(), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, scored: false, t: 0, spin: 0, below: false }; };
  c.addEventListener('pointerdown', e => { if (st.ball) return; st.charging = true; st.charge = 0; c.setPointerCapture(e.pointerId); });
  const rel = () => { if (st.charging) { st.charging = false; shoot(); } }; c.addEventListener('pointerup', rel); c.addEventListener('pointercancel', rel);
  let last = performance.now();
  const tick = now => {
    if (!alive) return; raf = requestAnimationFrame(tick); const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (st.charging) st.charge = Math.min(1, st.charge + dt * 0.85);
    const hp = hoop(), R = 15, rimL = hp.x - 27, rimR = hp.x + 27; const b = st.ball;
    if (b) {
      for (let k = 0; k < 3; k++) { const h = dt / 3; b.vy += 900 * h; const py = b.y; b.x += b.vx * h; b.y += b.vy * h; b.spin += b.vx * h * 0.03;
        for (const rx of [rimL, rimR]) { const dx = b.x - rx, dy = b.y - hp.y, d = Math.hypot(dx, dy); if (d < R + 3) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; } b.x = rx + nx * (R + 3); b.y = hp.y + ny * (R + 3); } }
        if (b.x + R > hp.x + 36 && b.y > hp.y - 78 && b.y < hp.y + 22 && b.vx > 0) { b.vx *= -0.55; b.x = hp.x + 36 - R; }
        if (!b.scored && py < hp.y && b.y >= hp.y && b.x > rimL + 4 && b.x < rimR - 4 && b.vy > 0) { b.scored = true; st.score++; st.streak++; st.net = 1; S.best = Math.max(S.best, st.score); st.msg = st.streak > 2 ? 'On fire' : 'Swish'; st.msgT = 1.2; hud(); S.audio.hit('rim'); }
        if (b.y + R > floor()) { b.y = floor() - R; b.vy *= -0.55; b.vx *= 0.7; b.below = true; if (Math.abs(b.vy) < 60) b.t += 1; } }
      b.t += dt;
      if (b.t > 2.6 || b.x > W + 40 || b.x < -40) { if (!b.scored) { if (st.score) { st.msg = 'Missed. Score reset'; st.msgT = 1.2; } st.score = 0; st.streak = 0; hud(); } else st.hoopX = 0.6 + Math.random() * 0.26; st.ball = null; st.charge = 0; }
    }
    st.msgT -= dt; st.net *= 0.92;
    // draw
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#2a2459'); sky.addColorStop(.7, '#c9567a'); sky.addColorStop(1, '#f6a05a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(30,20,60,.5)'; for (let i = 0; i < 16; i++) { const bw = W / 16, bh = 22 + ((i * 37) % 5) * 9; g.fillRect(i * bw, floor() - bh, bw - 3, bh); }
    { const sx = W * 0.34, f = floor(); for (const [dx, h] of [[-32, 72], [-16, 98], [0, 124], [16, 94], [32, 76]]) { g.beginPath(); g.moveTo(sx + dx - 7, f); g.quadraticCurveTo(sx + dx - 6, f - h * 0.7, sx + dx, f - h); g.quadraticCurveTo(sx + dx + 6, f - h * 0.7, sx + dx + 7, f); g.fill(); } }
    g.fillStyle = '#b55a2a'; g.fillRect(0, floor(), W, 40); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, floor(), W, 2);
    g.fillStyle = '#2b2d36'; g.fillRect(hp.x + 50, hp.y - 20, 7, floor() - hp.y + 20); g.fillRect(hp.x + 36, hp.y - 14, 18, 6);
    g.fillStyle = '#f4f1ea'; g.fillRect(hp.x + 34, hp.y - 78, 5, 100);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; for (let i = 0; i <= 6; i++) { const x = rimL + (i / 6) * 54; g.beginPath(); g.moveTo(x, hp.y); g.lineTo(hp.x + (x - hp.x) * 0.55, hp.y + 40 + st.net * 10); g.stroke(); }
    g.strokeStyle = '#ff5a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(rimL, hp.y); g.lineTo(rimR + 8, hp.y); g.stroke();
    const p = b || start();
    g.save(); g.translate(p.x, p.y); g.rotate(b ? b.spin : 0); g.fillStyle = '#ef7a2f'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.strokeStyle = '#3a1c08'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.moveTo(0, -R); g.lineTo(0, R); g.arc(0, 0, R, 0, 7); g.stroke(); g.restore();
    if (!b) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(p.x - 40, p.y + 34, 80, 10); g.fillStyle = st.charge > 0.85 ? '#ff4a3a' : '#46ff86'; g.fillRect(p.x - 40, p.y + 34, 80 * st.charge, 10); }
    if (st.msgT > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(1, st.msgT * 2)})`; g.font = '700 26px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(st.msg, W / 2, 60); }
  };
  fit(); hud(); win.addEventListener('resized', fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(body); win.addEventListener('closed', () => { alive = false; cancelAnimationFrame(raf); }); raf = requestAnimationFrame(tick);
  body._st = st;
}

function paintApp(body, win) {
  body.classList.add('paint'); const cols = ['#16181d', '#e2452c', '#f3bd4e', '#2f7bff', '#17756b', '#e24a8d', '#8a5cf0', '#ffffff'];
  body.innerHTML = `<div class="paint-tools">${cols.map((c, i) => `<button class="sw${i ? '' : ' on'}" style="background:${c}" data-c="${c}" aria-label="Colour"></button>`).join('')}<label>Brush<input type="range" min="2" max="40" value="8"></label><button class="clear">Clear</button></div><canvas></canvas>`;
  const c = body.querySelector('canvas'), g = c.getContext('2d'); let col = cols[0], size = 8, lastP = null;
  const fit = () => { const keep = c.width ? c : null; const tmp = keep && document.createElement('canvas'); if (tmp) { tmp.width = c.width; tmp.height = c.height; tmp.getContext('2d').drawImage(c, 0, 0); } c.width = Math.max(200, body.clientWidth); c.height = Math.max(120, body.clientHeight - 44); g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, c.width, c.height); if (tmp) g.drawImage(tmp, 0, 0); else demo(); };
  const demo = () => { g.strokeStyle = '#e2452c'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); const x0 = 40, y0 = c.height - 50; for (let i = 0; i <= 40; i++) { const s = i / 40; g.lineTo(x0 + s * 220, y0 - 150 * Math.pow(s, 0.45)); } g.stroke(); g.fillStyle = '#16181d'; g.font = '500 15px Inter, sans-serif'; g.fillText('Draw something.', 44, y0 + 26); };
  const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const line = (a, b) => { g.strokeStyle = col; g.lineWidth = size; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); lastP = pos(e); line(lastP, [lastP[0] + 0.1, lastP[1]]); });
  c.addEventListener('pointermove', e => { if (!lastP) return; const p = pos(e); line(lastP, p); lastP = p; });
  const end = () => lastP = null; c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  body.querySelectorAll('.sw').forEach(b => b.onclick = () => { col = b.dataset.c; body.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); });
  body.querySelector('input').oninput = e => size = +e.target.value;
  body.querySelector('.clear').onclick = () => { g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, c.width, c.height); };
  setTimeout(fit, 0); win.addEventListener('resized', fit); if (window.ResizeObserver) { let ro; new ResizeObserver(() => { clearTimeout(ro); ro = setTimeout(fit, 80); }).observe(body); }
}

function drumApp(body, win) {
  body.classList.add('drums'); const pads = [['kick', 'Kick', 'Q'], ['snare', 'Snare', 'W'], ['clap', 'Clap', 'E'], ['hat', 'Hat', 'A'], ['open', 'Open hat', 'S'], ['tom', 'Tom', 'D'], ['rim', 'Rim', 'Z'], ['cow', 'Bell', 'X'], ['stab', 'Chord', 'C']];
  body.innerHTML = `<div class="drum-msg"><span>Sound is off.</span> <button>Enable sound</button></div><div class="pads">${pads.map(p => `<button class="pad" data-n="${p[0]}"><b>${p[1]}</b><i>${p[2]}</i></button>`).join('')}</div><div class="drum-foot"><button class="loop">Play house loop</button></div>`;
  const msg = body.querySelector('.drum-msg'); const upd = on => msg.hidden = on; upd(S.audio.enabled); S.audio.listeners.push(upd);
  msg.querySelector('button').onclick = () => S.audio.enable();
  const hit = n => { const b = body.querySelector(`[data-n="${n}"]`); if (!b) return; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 110); S.audio.hit(n); };
  body.querySelectorAll('.pad').forEach(b => b.addEventListener('pointerdown', () => hit(b.dataset.n)));
  const lp = body.querySelector('.loop'); lp.onclick = () => { if (!S.audio.enabled) return; S.audio.playing ? S.audio.stopLoop() : S.audio.startLoop(); lp.textContent = S.audio.playing ? 'Stop loop' : 'Play house loop'; };
  const key = e => { if (!win.classList.contains('top') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; const p = pads.find(p => p[2].toLowerCase() === e.key.toLowerCase()); if (p) hit(p[0]); };
  addEventListener('keydown', key); win.addEventListener('closed', () => removeEventListener('keydown', key));
}

function notesApp(body) { body.classList.add('notes'); body.innerHTML = '<textarea spellcheck="false" aria-label="Notes"></textarea>'; const t = body.querySelector('textarea'); t.value = 'About me\n\n' + ABOUT; t.addEventListener('keydown', e => e.stopPropagation()); }

function settingsApp(body) {
  body.classList.add('settings');
  body.innerHTML = `<h3>Wallpaper</h3><div class="walls">${Object.entries(WALLS).map(([k, w]) => `<button data-w="${k}"><i style="background:${w.css.replace(/"/g, '&quot;')}"></i><span>${w.name}</span></button>`).join('')}</div><h3>Sound</h3><p><button class="snd"></button></p><h3>About</h3><p>A small operating system inside a baked three.js room. Made with Claude Code.</p>`;
  const mark = () => body.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === S.wall)); mark();
  body.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { setWall(b.dataset.w); mark(); });
  const snd = body.querySelector('.snd'); const upd = on => snd.textContent = on ? 'Sound is on. Turn off' : 'Enable sound'; upd(S.audio.enabled); S.audio.listeners.push(upd); snd.onclick = () => S.audio.toggle();
}

function skiApp(body, win) {
  body.classList.add('hoops'); body.innerHTML = '<canvas></canvas><div class="hoops-hud"><span class="sc"></span><span class="hint">Pointer or arrow keys. Dodge the trees.</span></div>';
  const c = body.querySelector('canvas'), g = c.getContext('2d'); let W = 480, H = 520, raf = 0, alive = true, last = performance.now();
  const st = { state: 'ready', x: 0.5, tx: 0.5, vx: 0, dist: 0, speed: 0, obs: [], trail: [], next: 0, key: 0, t: 0, flakes: [] };
  const hud = () => body.querySelector('.sc').textContent = `Distance ${Math.floor(st.dist)} m   Best this session ${Math.floor(S.skiBest)} m`;
  const fit = () => { W = Math.max(260, body.clientWidth); H = Math.max(200, body.clientHeight - 34); const d = Math.min(2, devicePixelRatio || 1); c.width = W * d; c.height = H * d; c.style.width = W + 'px'; c.style.height = H + 'px'; g.setTransform(d, 0, 0, d, 0, 0); };
  const SY = () => H * 0.26;
  const start = () => { Object.assign(st, { state: 'run', dist: 0, speed: 190, obs: [], trail: [], next: 0.4, t: 0 }); hud(); };
  const px = e => { const r = c.getBoundingClientRect(); st.tx = Math.min(0.96, Math.max(0.04, (e.clientX - r.left) / r.width)); };
  c.addEventListener('pointermove', px);
  c.addEventListener('pointerdown', e => { px(e); if (st.state !== 'run') start(); });
  const kd = e => { if (!win.classList.contains('top')) return; if (e.key === 'ArrowLeft') st.key = -1; else if (e.key === 'ArrowRight') st.key = 1; else if ((e.key === ' ' || e.key === 'Enter') && st.state !== 'run') start(); else return; e.preventDefault(); };
  const ku = e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') st.key = 0; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const tree = (x, y, s) => { g.fillStyle = 'rgba(40,60,110,.18)'; g.beginPath(); g.ellipse(x + 8 * s, y + 4 * s, 16 * s, 6 * s, 0, 0, 7); g.fill(); g.fillStyle = '#5a3a24'; g.fillRect(x - 2.5 * s, y - 6 * s, 5 * s, 9 * s); for (let k = 0; k < 3; k++) { g.fillStyle = ['#1f5a3c', '#27704a', '#2f8558'][k]; g.beginPath(); g.moveTo(x - (15 - k * 3.5) * s, y - (5 + k * 11) * s); g.lineTo(x + (15 - k * 3.5) * s, y - (5 + k * 11) * s); g.lineTo(x, y - (25 + k * 11) * s); g.fill(); } g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 5 * s, y - 39 * s); g.lineTo(x + 5 * s, y - 39 * s); g.lineTo(x, y - 47 * s); g.fill(); };
  const rock = (x, y, s) => { g.fillStyle = 'rgba(40,60,110,.18)'; g.beginPath(); g.ellipse(x + 5 * s, y + 3 * s, 15 * s, 5 * s, 0, 0, 7); g.fill(); g.fillStyle = '#6f7684'; g.beginPath(); g.moveTo(x - 13 * s, y + 2 * s); g.lineTo(x - 8 * s, y - 10 * s); g.lineTo(x + 3 * s, y - 14 * s); g.lineTo(x + 13 * s, y - 4 * s); g.lineTo(x + 11 * s, y + 3 * s); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 8 * s, y - 10 * s); g.lineTo(x + 3 * s, y - 14 * s); g.lineTo(x + 7 * s, y - 9 * s); g.lineTo(x - 3 * s, y - 7 * s); g.fill(); };
  const tick = now => {
    if (!alive) return; raf = requestAnimationFrame(tick); const dt = Math.min(0.033, (now - last) / 1000); last = now; st.t += dt;
    if (st.state === 'run') {
      if (st.key) st.tx = Math.min(0.96, Math.max(0.04, st.tx + st.key * dt * 0.9));
      const ox = st.x; st.x += (st.tx - st.x) * Math.min(1, dt * 7); st.vx = (st.x - ox) / dt;
      st.speed = Math.min(520, st.speed + dt * 9); st.dist += st.speed * dt / 14; const dy = st.speed * dt;
      st.next -= dt; if (st.next <= 0) { st.next = Math.max(0.16, 0.5 - st.dist / 2600) * (0.6 + Math.random() * 0.8); st.obs.push({ x: Math.random(), y: H + 60, rock: Math.random() < 0.3, s: 0.85 + Math.random() * 0.5 }); }
      for (const o of st.obs) o.y -= dy; st.obs = st.obs.filter(o => o.y > -70);
      st.trail.push({ x: st.x, y: SY() }); for (const p of st.trail) p.y -= dy; st.trail = st.trail.filter(p => p.y > -10);
      for (const o of st.obs) if (Math.abs(o.x * W - st.x * W) < 13 * o.s && Math.abs(o.y - 3 - SY()) < 9) { st.state = 'crash'; S.skiBest = Math.max(S.skiBest, st.dist); S.audio.hit('snare'); hud(); }
      if ((Math.floor(st.dist) % 5) === 0) hud();
    }
    // slope
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f7fbff'); gr.addColorStop(1, '#dbe8f7'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,150,200,.16)'; g.lineWidth = 1; const off = (st.dist * 14) % 70; for (let y = -off; y < H; y += 70) { g.beginPath(); g.moveTo(0, y + 20); g.bezierCurveTo(W * 0.3, y, W * 0.7, y + 40, W, y + 14); g.stroke(); }
    g.strokeStyle = 'rgba(90,120,180,.45)'; g.lineWidth = 2; for (const dx of [-4, 4]) { g.beginPath(); st.trail.forEach((p, i) => i ? g.lineTo(p.x * W + dx, p.y) : g.moveTo(p.x * W + dx, p.y)); g.stroke(); }
    // forest on both sides of the piste
    g.fillStyle = 'rgba(70,110,170,.16)'; g.fillRect(0, 0, W * 0.035, H); g.fillRect(W * 0.965, 0, W * 0.035, H);
    const eo = (st.dist * 14) % 44; for (let y = -eo - 10; y < H + 40; y += 44) { tree(W * 0.012, y + 30, 0.6); tree(W * 0.988, y + 8, 0.6); }
    // snow spray behind the skis
    if (st.state === 'run') { g.fillStyle = 'rgba(255,255,255,.95)'; for (let k = 0; k < 7; k++) { const a = st.t * 31 + k * 2.4; g.beginPath(); g.arc(st.x * W + Math.sin(a) * (7 + k * 1.5) - st.vx * 9, SY() - 12 - k * 5 - (Math.cos(a * 1.3) + 1) * 3, 2.6 - k * 0.25, 0, 7); g.fill(); } }
    const all = st.obs.slice().sort((a, b) => a.y - b.y); let drawn = false;
    const skier = () => { const x = st.x * W, y = SY(), lean = Math.max(-0.5, Math.min(0.5, st.vx * 1.6)); g.save(); g.translate(x, y); g.rotate(st.state === 'crash' ? 1.3 : lean * 0.5);
      g.strokeStyle = '#d93a2b'; g.lineWidth = 3; g.lineCap = 'round'; for (const dx of [-4, 4]) { g.beginPath(); g.moveTo(dx - lean * 6, -12); g.lineTo(dx + lean * 6, 14); g.stroke(); }
      g.fillStyle = '#1c2247'; g.fillRect(-5, -16, 10, 12); g.fillStyle = '#2f7bff'; g.beginPath(); g.roundRect(-7, -30, 14, 16, 4); g.fill(); g.fillStyle = '#f3bd4e'; g.beginPath(); g.arc(0, -35, 5.5, 0, 7); g.fill();
      g.strokeStyle = '#444'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-8, -24); g.lineTo(-14, -2); g.moveTo(8, -24); g.lineTo(14, -2); g.stroke(); g.restore(); };
    for (const o of all) { if (!drawn && o.y > SY()) { skier(); drawn = true; } (o.rock ? rock : tree)(o.x * W, o.y, o.s); } if (!drawn) skier();
    if (st.state !== 'run') { g.fillStyle = 'rgba(18,14,31,.72)'; g.beginPath(); g.roundRect(W / 2 - 150, H / 2 - 52, 300, 104, 16); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 24px Inter, sans-serif'; g.fillText(st.state === 'crash' ? `Wiped out at ${Math.floor(st.dist)} m` : 'Ski run', W / 2, H / 2 - 6); g.font = '500 14px Inter, sans-serif'; g.fillText(st.state === 'crash' ? 'Click to go again' : 'Click to start', W / 2, H / 2 + 22); }
  };
  fit(); hud(); win.addEventListener('resized', fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(body);
  win.addEventListener('closed', () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); }); raf = requestAnimationFrame(tick);
  body._st = st;
}
