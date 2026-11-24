// Canvas-drawn textures: bib, medal, sleeves, labels, notes, screens.
import { TRACKS } from './data.js?v=17';

const DISPLAY = '"Archivo Black","Arial Black",Impact,sans-serif';
const SANS = 'Inter,"Helvetica Neue",Arial,sans-serif';
const HAND = 'Caveat,"Segoe Print","Comic Sans MS",cursive';

function cv(w, h, bg = '#fff') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  return [c, g];
}
function fit(g, text, maxW, size, font, weight = '') {
  do { g.font = `${weight} ${size}px ${font}`; size -= 2; } while (g.measureText(text).width > maxW && size > 8);
  return size + 2;
}
function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    if (g.measureText(line + w).width > maxW && line) { g.fillText(line.trim(), x, y); y += lh; line = ''; }
    line += w + ' ';
  }
  g.fillText(line.trim(), x, y); return y + lh;
}

function bib() {
  const [c, g] = cv(1500, 1200, '#fbfaf6');
  const W = 1500, H = 1200, SW = 1230; // main panel width, strip on the right
  g.fillStyle = '#1f55c4'; g.fillRect(0, 0, SW, 250);
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = `64px ${DISPLAY}`; g.fillText('BARCELONA MARATHON', SW / 2, 105);
  g.font = `600 44px ${SANS}`; g.fillText('2026', SW / 2, 185);
  g.fillStyle = '#f29ab8'; g.fillRect(0, 250, SW, 690);
  const gr = g.createLinearGradient(0, 250, 0, 940); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(210,60,120,.12)');
  g.fillStyle = gr; g.fillRect(0, 250, SW, 690);
  g.fillStyle = '#7a1230';
  fit(g, 'GUILLEM', SW - 120, 290, DISPLAY); g.fillText('GUILLEM', SW / 2, 500);
  g.font = `170px ${DISPLAY}`; g.fillText('26021', SW / 2, 770);
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 940, SW, 260);
  g.fillStyle = '#1f55c4'; g.fillRect(90, 990, SW - 180, 14);
  g.fillStyle = '#ef6a3a'; g.fillRect(90, 1150, SW - 180, 22);
  g.fillStyle = '#1b2a4a'; g.font = `600 46px ${SANS}`; g.fillText('MARATHON · BARCELONA', SW / 2, 1075);
  // right strip
  g.fillStyle = '#fbfaf6'; g.fillRect(SW, 0, W - SW, H);
  g.strokeStyle = '#b9b5aa'; g.setLineDash([14, 12]); g.lineWidth = 4; g.beginPath(); g.moveTo(SW + 2, 0); g.lineTo(SW + 2, H); g.stroke(); g.setLineDash([]);
  g.save(); g.translate(SW + (W - SW) / 2 + 6, 420); g.rotate(-Math.PI / 2); g.fillStyle = '#222'; g.font = `150px ${DISPLAY}`; g.fillText('26021', 0, 0); g.restore();
  g.fillStyle = '#222'; for (let i = 0; i < 26; i++) g.fillRect(SW + 60, 800 + i * 13, (i * 7) % 5 > 1 ? 150 : 110, i % 3 ? 5 : 9);
  g.fillStyle = '#d9d5cb'; for (const [x, y] of [[50, 50], [SW - 50, 50], [50, H - 50], [SW - 50, H - 50]]) { g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); }
  return c;
}

function medal() {
  const [c, g] = cv(768, 768, '#fff');
  const R = 384; g.translate(R, R);
  const ink = 'rgba(70,40,5,.72)';
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 7;
  g.beginPath(); g.arc(0, 0, 330, 0, 7); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 312, 0, 7); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const arc = (txt, rad, a0, size, flip) => {
    g.font = `${size}px ${DISPLAY}`; const step = (size * 0.86) / rad; let a = a0 - step * (txt.length - 1) / 2;
    for (const ch of txt) { g.save(); g.rotate(flip ? -a : a); g.translate(0, flip ? rad : -rad); g.fillText(ch, 0, 0); g.restore(); a += step; }
  };
  arc('BARCELONA MARATHON', 262, 0, 44, false);
  arc('FINISHER 2026', 262, 0, 44, true);
  g.font = `700 50px ${SANS}`; g.fillText('Guillem', 0, -92); g.fillText('Bárcena Folia', 0, -36);
  g.font = `112px ${DISPLAY}`; g.fillText('3:15:33', 0, 72);
  g.lineWidth = 5; g.beginPath(); g.moveTo(-170, 2); g.lineTo(170, 2); g.stroke();
  g.beginPath(); g.moveTo(-120, 140); g.lineTo(120, 140); g.stroke();
  return c;
}

function sleeve(i) {
  const S = 1024; const t = TRACKS[i];
  const P = [
    { bg: '#efe6d2', ink: '#1c2247' }, { bg: '#0d0f14', ink: '#f2efe6' },
    { bg: '#f0468a', ink: '#15101a' }, { bg: '#0f6b5c', ink: '#fbf3da' },
  ][i];
  const [c, g] = cv(S, S, P.bg);
  if (i === 0) {
    g.fillStyle = '#e2452c'; g.beginPath(); g.arc(590, 400, 300, 0, 7); g.fill();
    g.fillStyle = '#1c2247'; g.beginPath(); g.arc(330, 300, 150, 0, 7); g.fill();
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#f2b23a'; g.beginPath(); g.arc(700, 250, 110, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#1c2247'; g.fillRect(70, 740, 884, 8);
  } else if (i === 1) {
    g.lineWidth = 34;
    for (let k = 0; k < 9; k++) { g.strokeStyle = k % 2 ? '#2f7bff' : '#12357a'; g.beginPath(); g.arc(S, 0, 180 + k * 78, Math.PI / 2, Math.PI); g.stroke(); }
    g.fillStyle = '#0d0f14'; g.fillRect(0, 690, S, 334);
    g.fillStyle = '#2f7bff'; g.fillRect(70, 700, 240, 10);
  } else if (i === 2) {
    g.fillStyle = '#ffd42e';
    for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(-200 + k * 190, 0); g.lineTo(-90 + k * 190, 0); g.lineTo(-560 + k * 190, 700); g.lineTo(-670 + k * 190, 700); g.fill(); }
    g.fillStyle = '#15101a'; g.beginPath(); g.moveTo(S, 0); g.lineTo(S, 420); g.lineTo(604, 0); g.fill();
    g.fillStyle = '#f0468a'; g.fillRect(0, 660, S, 364);
    g.fillStyle = '#15101a'; g.fillRect(70, 690, 884, 10);
  } else {
    g.fillStyle = 'rgba(251,243,218,.16)';
    for (let y = 0; y < 9; y++) for (let x = 0; x < 13; x++) { g.beginPath(); g.arc(80 + x * 72, 80 + y * 72, 7, 0, 7); g.fill(); }
    g.fillStyle = '#ff7a2f';
    const pts = [[1, 6], [2, 6], [3, 6], [3, 5], [3, 4], [4, 4], [5, 4], [5, 3], [5, 2], [6, 2], [7, 2], [8, 2], [8, 3], [8, 4], [9, 4], [10, 4], [10, 3], [11, 3]];
    pts.forEach(([x, y], k) => { g.fillStyle = k % 4 === 3 ? '#fbf3da' : '#ff7a2f'; g.fillRect(48 + x * 72, 48 + y * 72, 62, 62); });
    g.fillStyle = '#0f6b5c'; g.fillRect(0, 700, S, 324);
    g.fillStyle = '#ff7a2f'; g.fillRect(70, 706, 884, 10);
  }
  g.fillStyle = P.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  fit(g, t.artist.toUpperCase(), 884, 92, DISPLAY); g.fillText(t.artist.toUpperCase(), 70, 838);
  g.font = `600 50px ${SANS}`; wrap(g, t.title, 70, 910, 884, 60);
  return c;
}

function binder(i) {
  const [c, g] = cv(240, 720, '#fbfaf5');
  const names = ['INCAVI · Wine industry plan', 'ACA · Next Generation EU', 'ACA · Document management', 'Barcelona · NGEU office'][i];
  g.strokeStyle = '#333'; g.lineWidth = 4; g.strokeRect(12, 12, 216, 696);
  // KPMG mark running up the spine (read from bottom to top), then the project name
  g.save(); g.translate(120, 360); g.rotate(-Math.PI / 2); g.textAlign = 'center';
  g.strokeStyle = '#00338d'; g.lineWidth = 9; g.textBaseline = 'alphabetic'; g.font = `italic 800 100px ${SANS}`;
  'KPMG'.split('').forEach((ch, k) => { const x = -338 + k * 108; g.strokeRect(x, -84, 98, 140); g.fillStyle = '#fbfaf5'; g.fillRect(x + 8, 20, 82, 46); g.fillStyle = '#00338d'; g.fillText(ch, x + 49, 72, 92); });
  g.fillStyle = '#16181d'; g.textBaseline = 'middle';
  const w2 = names.split(' · '); g.font = `800 40px ${SANS}`; g.fillText(w2[0], 218, -40);
  fit(g, w2[1], 236, 30, SANS, '600'); g.fillStyle = '#444'; g.fillText(w2[1], 218, 14);
  g.restore(); return c;
}

function rumia() {
  const [c, g] = cv(900, 540, '#fff');
  g.fillStyle = '#17756b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `190px ${DISPLAY}`; g.fillText('RUMIA', 450, 240);
  g.font = `600 54px ${SANS}`; g.fillStyle = '#333'; g.fillText('health + AI · prototype', 450, 410);
  return c;
}

function postcard() {
  // a photo of the Highlands, drawn
  const [c, g] = cv(1000, 700, '#fbfaf6');
  const sky = g.createLinearGradient(0, 30, 0, 420); sky.addColorStop(0, '#7f9cc4'); sky.addColorStop(.7, '#d9dfe6'); sky.addColorStop(1, '#f3e6cf');
  g.fillStyle = sky; g.fillRect(30, 30, 940, 640);
  g.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y, r] of [[240, 130, 90], [330, 150, 70], [700, 110, 110], [800, 140, 70]]) { g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, 7); g.fill(); }
  const hill = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(30, 670); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(970, 670); g.fill(); };
  hill([[30, 330], [150, 250], [260, 300], [380, 190], [470, 240], [560, 300], [700, 230], [820, 300], [970, 260]], '#6f7f9a');
  hill([[30, 400], [120, 350], [250, 390], [330, 330], [470, 400], [600, 360], [760, 410], [900, 350], [970, 380]], '#56684f');
  g.fillStyle = '#8fa9c2'; g.beginPath(); g.moveTo(30, 470); g.bezierCurveTo(300, 440, 600, 450, 970, 480); g.lineTo(970, 540); g.bezierCurveTo(600, 520, 300, 540, 30, 520); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(200, 478, 380, 4); g.fillRect(520, 500, 260, 3);
  hill([[30, 520], [200, 500], [420, 540], [640, 510], [800, 545], [970, 520]], '#6b5d3c');
  g.fillStyle = '#8a4f7a'; for (let k = 0; k < 160; k++) { const x = 40 + (k * 97) % 920, y = 560 + (k * 53) % 100; g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.fill(); }
  g.fillStyle = '#3f4f33'; for (let k = 0; k < 60; k++) { const x = 40 + (k * 151) % 920, y = 548 + (k * 71) % 110; g.fillRect(x, y, 3, 14); }
  g.strokeStyle = '#fbfaf6'; g.lineWidth = 26; g.strokeRect(30, 30, 940, 640);
  return c;
}

// My own drawing after "Le Cheval blanc" (Paul Gauguin): white horse drinking in a blue-green pool.
function gauguin() {
  const [c, g] = cv(800, 1216, '#17406a');
  const blob = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 6) g.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]); g.fill(); };
  // meadow at the top, water below
  blob('#2f6f4a', [0, 0, 300, -40, 600, 20, 800, 0, 800, 200, 800, 320, 640, 300, 420, 330, 200, 300, 0, 380, 0, 200, 0, 100, 0, 0]);
  blob('#e3c23a', [300, 60, 420, 30, 560, 50, 640, 110, 600, 190, 430, 200, 330, 160, 280, 120, 280, 80, 300, 60]);
  blob('#123a66', [0, 380, 220, 300, 520, 340, 800, 300, 800, 700, 800, 1216, 800, 1216, 0, 1216, 0, 1216, 0, 800, 0, 380]);
  blob('#1f5f86', [60, 520, 240, 460, 520, 500, 760, 470, 780, 640, 560, 700, 300, 660, 120, 700, 40, 620, 60, 520]);
  // orange reflections in the stream
  blob('#e5822f', [420, 640, 560, 600, 720, 640, 780, 740, 700, 860, 520, 900, 430, 830, 380, 760, 380, 690, 420, 640]);
  blob('#f0a23c', [80, 900, 200, 840, 360, 880, 400, 980, 300, 1090, 160, 1100, 80, 1040, 40, 980, 50, 930, 80, 900]);
  blob('#d9602c', [520, 980, 640, 940, 760, 990, 780, 1090, 700, 1160, 560, 1150, 500, 1100, 480, 1040, 490, 1000, 520, 980]);
  // riders in the background
  blob('#b5452a', [470, 240, 560, 220, 640, 250, 650, 320, 640, 400, 620, 400, 610, 330, 540, 330, 500, 400, 480, 400, 490, 320, 440, 300, 450, 250, 470, 240]);
  blob('#d98a5a', [545, 150, 575, 140, 590, 170, 585, 240, 540, 240, 535, 190, 540, 160, 545, 150]);
  blob('#9aa3ad', [140, 250, 220, 235, 280, 260, 285, 320, 275, 380, 258, 380, 250, 330, 190, 330, 160, 380, 142, 380, 150, 320, 110, 300, 120, 262, 140, 250]);
  blob('#c9774c', [195, 170, 222, 162, 236, 190, 230, 250, 190, 250, 186, 205, 190, 180, 195, 170]);
  // the white horse, head down to drink
  const hc = '#dfe9d4';
  blob(hc, [300, 600, 420, 560, 540, 580, 590, 660, 600, 760, 560, 800, 430, 810, 330, 800, 270, 760, 250, 680, 270, 620, 300, 600]);
  blob(hc, [300, 620, 250, 640, 200, 720, 170, 820, 150, 880, 170, 930, 215, 930, 240, 900, 250, 840, 270, 770, 320, 720, 340, 680, 330, 640, 300, 620]);
  blob(hc, [330, 780, 360, 780, 370, 900, 365, 1010, 335, 1012, 322, 1010, 318, 900, 320, 820, 322, 790, 330, 780]);
  blob(hc, [520, 770, 560, 760, 570, 880, 562, 1000, 536, 1002, 522, 1000, 520, 900, 512, 830, 512, 790, 520, 770]);
  blob('#a9c2a2', [430, 790, 455, 790, 462, 880, 458, 960, 436, 962, 428, 960, 426, 880, 426, 820, 426, 800, 430, 790]);
  blob('#a9c2a2', [300, 640, 380, 610, 470, 640, 520, 700, 430, 690, 360, 700, 310, 720, 290, 690, 290, 660, 300, 640]);
  blob('#f2f6ea', [320, 600, 400, 575, 480, 585, 540, 610, 470, 620, 390, 618, 340, 630, 315, 625, 312, 610, 320, 600]);
  blob('#6f7f6a', [585, 650, 610, 680, 618, 760, 600, 840, 590, 780, 588, 720, 584, 690, 582, 670, 583, 660, 585, 650]);
  // dark curving branches across the picture
  g.strokeStyle = '#1b2f6e'; g.lineCap = 'round';
  const br = (w, pts) => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 6) g.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]); g.stroke(); };
  br(26, [0, 470, 160, 400, 300, 470, 430, 430, 560, 390, 660, 470, 800, 420]);
  br(16, [300, 462, 330, 380, 420, 350, 470, 280]); br(14, [520, 420, 600, 360, 690, 380, 740, 320]); br(12, [130, 430, 120, 360, 60, 330, 30, 280]);
  g.fillStyle = '#2f7a55'; for (const [x, y] of [[470, 270], [500, 300], [430, 330], [740, 310], [700, 350], [40, 270], [80, 310], [640, 440], [230, 420]]) { g.beginPath(); g.ellipse(x, y, 30, 15, 0.6, 0, 7); g.fill(); }
  // lilies in the corner
  for (const [x, y] of [[80, 1130], [150, 1170], [40, 1180]]) { g.fillStyle = '#f4f1e6'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * 1.26) * 16, y + Math.sin(k * 1.26) * 16, 18, 9, k * 1.26, 0, 7); g.fill(); } g.fillStyle = '#e3c23a'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  // canvas grain
  g.globalAlpha = 0.07; g.fillStyle = '#000'; for (let k = 0; k < 2600; k++) g.fillRect((k * 131) % 800, (k * 277) % 1216, 3, 2); g.globalAlpha = 1;
  return c;
}

function tartan() {
  const [c, g] = cv(512, 256, '#27406b');
  const band = (pos, w, col, a) => { g.globalAlpha = a; g.fillStyle = col; for (let p = pos; p < 512; p += 128) { g.fillRect(p, 0, w, 256); g.fillRect(0, p, 512, w); } g.globalAlpha = 1; };
  band(0, 44, '#1f6a4c', .75); band(60, 8, '#c9302c', .9); band(84, 4, '#f3e9c8', .9); band(100, 16, '#10203f', .7);
  g.globalAlpha = .12; g.strokeStyle = '#000'; for (let k = -256; k < 512; k += 4) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); } g.globalAlpha = 1;
  return c;
}

function axes(g, x, y, w, h, lx, ly) {
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.lineTo(x + w, y + h); g.stroke();
  g.font = `30px ${HAND}`; g.textAlign = 'center'; g.fillText(lx, x + w / 2, y + h + 34);
  g.save(); g.translate(x - 16, y + h / 2); g.rotate(-Math.PI / 2); g.fillText(ly, 0, 0); g.restore();
}
function frontier(g, x, y, w, h, n = 14) {
  g.beginPath(); for (let k = 0; k <= 30; k++) { const s = k / 30; const px = x + s * w, py = y + h - h * 0.92 * Math.pow(s, 0.45); k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  for (let k = 0; k < n; k++) { const s = 0.12 + ((k * 0.6180339) % 1) * 0.82; const f = 0.55 + ((k * 0.377) % 1) * 0.42; g.beginPath(); g.arc(x + s * w, y + h - h * 0.92 * Math.pow(s, 0.45) * f, 6, 0, 7); g.fill(); }
}
function notebook() {
  const [c, g] = cv(1240, 860, '#fbf9f2');
  g.strokeStyle = 'rgba(60,90,160,.16)'; g.lineWidth = 2; for (let y = 60; y < 860; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1240, y); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(616, 0, 8, 860);
  g.strokeStyle = '#1d2a55'; g.fillStyle = '#1d2a55'; g.lineWidth = 4; g.lineCap = 'round';
  g.font = `52px ${HAND}`; g.textAlign = 'left'; g.fillText('DEA: efficiency frontier', 60, 90);
  axes(g, 90, 140, 440, 330, 'health spending', 'outcomes'); frontier(g, 90, 140, 440, 330);
  g.font = `34px ${HAND}`; g.textAlign = 'left'; wrap(g, 'Autonomous communities under the curve could reach the same outcomes with less spending.', 60, 580, 500, 44);
  g.font = `52px ${HAND}`; g.fillText('Go-to-market', 680, 90);
  const bars = [0.35, 0.5, 0.42, 0.7, 0.62, 0.86];
  axes(g, 700, 140, 440, 300, 'weeks', 'pipeline');
  bars.forEach((b, k) => { g.fillStyle = k === 5 ? '#c9412f' : '#1d2a55'; g.fillRect(724 + k * 68, 440 - b * 280, 44, b * 280); });
  g.fillStyle = '#1d2a55'; g.font = `36px ${HAND}`;
  ['organisation', 'funding', 'clients'].forEach((t, k) => { g.strokeRect(700, 560 + k * 70, 34, 34); g.fillText(t, 760, 590 + k * 70); });
  g.strokeStyle = '#c9412f'; g.beginPath(); g.moveTo(704, 578); g.lineTo(716, 592); g.lineTo(740, 556); g.stroke();
  return c;
}
function cork(k) {
  if (k === 'corkA') {
    const [c, g] = cv(810, 600, '#fffdf6'); g.strokeStyle = '#1d2a55'; g.fillStyle = '#1d2a55'; g.lineWidth = 5;
    g.font = `60px ${HAND}`; g.fillText('Public health spending', 50, 80);
    axes(g, 90, 120, 620, 380, 'inputs', 'outputs'); frontier(g, 90, 120, 620, 380, 17); return c;
  }
  if (k === 'corkB') {
    const [c, g] = cv(900, 630, '#f3ead2'); g.strokeStyle = '#3d6e3c'; g.lineWidth = 5; g.fillStyle = '#3a3226';
    g.font = `62px ${HAND}`; g.fillText('Summer camp', 50, 82);
    for (let r = 0; r < 4; r++) { g.beginPath(); g.ellipse(560, 380, 280 - r * 60, 170 - r * 38, 0.2, 0, 7); g.stroke(); }
    g.strokeStyle = '#c9412f'; g.setLineDash([16, 14]); g.beginPath(); g.moveTo(90, 520); g.bezierCurveTo(240, 380, 330, 520, 450, 400); g.bezierCurveTo(520, 330, 560, 380, 600, 330); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#c9412f'; for (const [x, y] of [[90, 520], [300, 455], [600, 330]]) { g.beginPath(); g.moveTo(x - 26, y + 10); g.lineTo(x, y - 30); g.lineTo(x + 26, y + 10); g.fill(); }
    g.fillStyle = '#3a3226'; g.font = `40px ${HAND}`; g.fillText('AEiG Pau Claris', 60, 150); return c;
  }
  if (k === 'corkC') {
    const [c, g] = cv(630, 780, '#fffdf6'); g.fillStyle = '#1f55c4'; g.fillRect(0, 0, 630, 120);
    g.fillStyle = '#fff'; g.font = `50px ${DISPLAY}`; g.fillText('MARATHON', 40, 80);
    g.fillStyle = '#222'; g.font = `50px ${HAND}`;
    ['long run', 'intervals', 'easy run', 'rest', 'race day'].forEach((t, i) => { g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(50, 180 + i * 90, 44, 44); g.fillText(t, 130, 220 + i * 90); if (i !== 3) { g.strokeStyle = '#c9412f'; g.beginPath(); g.moveTo(56, 204 + i * 90); g.lineTo(70, 220 + i * 90); g.lineTo(100, 174 + i * 90); g.stroke(); } });
    g.fillStyle = '#c9412f'; g.font = `74px ${DISPLAY}`; g.fillText('3:15:33', 50, 720); return c;
  }
  const [c, g] = cv(900, 600, '#ffe98a'); g.fillStyle = '#2a2a2a';
  g.font = `70px ${HAND}`; g.fillText('RUMIA: go-to-market', 50, 100);
  g.font = `56px ${HAND}`; ['organisation', 'funding', 'clients'].forEach((t, i) => g.fillText('→ ' + t, 80, 230 + i * 100));
  g.strokeStyle = '#c9412f'; g.lineWidth = 6; g.beginPath(); g.ellipse(250, 410, 190, 50, -0.03, 0, 7); g.stroke(); return c;
}
function bookspine(i) {
  const [c, g] = cv(700, 110, '#fff'); g.fillStyle = i === 2 ? '#3a2a1a' : '#000'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = `52px ${DISPLAY}`; g.fillText(['HEALTH ECONOMICS', 'PUBLIC POLICY', 'ECONOMETRICS'][i], 350, 58);
  if (i < 2) { g.globalCompositeOperation = 'difference'; }
  return c;
}

function keys() {
  const [c, g] = cv(876, 300, '#9b9993'); g.fillStyle = '#fff';
  for (let r = 0; r < 5; r++) { const n = r < 4 ? 14 : 9; let x = 8; for (let k = 0; k < n; k++) { const w = r < 4 ? 54 : (k === 4 ? 364 : 54); g.beginPath(); g.roundRect(x, 8 + r * 58, w, 50, 8); g.fill(); x += w + 7.5; } }
  return c;
}
export function overlayCanvas(name) {
  if (name === 'keys') return keys();
  if (name === 'gauguin') return gauguin();
  if (name === 'pissarro') return cv(64, 52, '#b9cf9a')[0];
  if (name === 'bib') return bib();
  if (name === 'medal') return medal();
  if (name.startsWith('sleeve')) return sleeve(+name.slice(6));
  if (name.startsWith('binder')) return binder(+name.slice(6));
  if (name === 'rumia') return rumia();
  if (name === 'postcard') return postcard();
  if (name === 'tartan') return tartan();
  if (name === 'notebook') return notebook();
  if (name.startsWith('cork')) return cork(name);
  if (name.startsWith('bookspine')) return bookspine(+name.slice(9));
  return cv(8, 8)[0];
}

// The desktop as seen from the room (the real OS is DOM, shown once inside).
export function desktopCanvas(img) {
  const [c, g] = cv(1600, 690, '#1a1433');
  if (img) { g.filter = 'blur(3px)'; g.drawImage(img, -20, -85, 1640, 861); g.filter = 'none'; g.fillStyle = 'rgba(20,14,40,.22)'; g.fillRect(0, 0, 1600, 690); } else {
  const gr = g.createLinearGradient(0, 0, 0, 690); gr.addColorStop(0, '#2a2459'); gr.addColorStop(.55, '#b0527a'); gr.addColorStop(1, '#f39a56');
  g.fillStyle = gr; g.fillRect(0, 0, 1600, 690);
  g.fillStyle = 'rgba(20,14,40,.85)';
  const sp = [[640, 300, 14], [668, 250, 16], [700, 235, 16], [730, 290, 14], [770, 200, 20], [810, 160, 24], [850, 215, 20]];
  for (const [x, y, w] of sp) { g.beginPath(); g.moveTo(x - w, 560); g.quadraticCurveTo(x - w, y + 60, x, y); g.quadraticCurveTo(x + w, y + 60, x + w, 560); g.fill(); }
  g.fillRect(0, 520, 1600, 170); }
  g.fillStyle = 'rgba(10,10,20,.55)'; g.fillRect(0, 0, 1600, 34);
  g.fillStyle = '#fff'; g.font = `600 18px ${SANS}`; g.textBaseline = 'middle'; g.fillText('Guillem’s computer', 18, 18);
  // CV window
  g.translate(320, 0); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(138, 78, 700, 520);
  g.fillStyle = '#fbfaf7'; g.fillRect(130, 70, 700, 520);
  g.fillStyle = '#e8e4dc'; g.fillRect(130, 70, 700, 38);
  g.fillStyle = '#333'; g.font = `600 17px ${SANS}`; g.fillText('CV', 200, 90);
  ['#ef6a5a', '#f3bd4e', '#62c655'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(152 + i * 20, 89, 6, 0, 7); g.fill(); });
  g.fillStyle = '#16181d'; g.font = `34px ${DISPLAY}`; g.fillText('Guillem Bárcena Folia', 160, 150);
  g.fillStyle = '#b9b5ad'; for (let i = 0; i < 13; i++) g.fillRect(160, 200 + i * 28, i % 4 === 0 ? 220 : 560 - (i * 53) % 190, i % 4 === 0 ? 12 : 8);
  g.translate(-320, 0);
  g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.roundRect(560, 612, 480, 62, 18); g.fill();
  ['#2f7bff', '#16181d', '#ef7a2f', '#e24a8d', '#8a5cf0', '#f3bd4e', '#8d9199'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.roundRect(578 + i * 65, 621, 44, 44, 11); g.fill(); });
  return c;
}

export function laptopCanvas() {
  const [c, g] = cv(640, 400, '#11131a');
  g.fillStyle = '#1b1e29'; g.fillRect(0, 0, 640, 28);
  g.strokeStyle = '#3a4058'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 60); g.lineTo(60, 340); g.lineTo(600, 340); g.stroke();
  g.strokeStyle = '#6fd8ff'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 40; k++) { const s = k / 40; const x = 60 + s * 540, y = 340 - 250 * Math.pow(s, 0.45); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.fillStyle = '#ffb469'; for (let k = 0; k < 17; k++) { const s = 0.1 + ((k * 0.618) % 1) * 0.85; const f = 0.5 + ((k * 0.377) % 1) * 0.45; g.beginPath(); g.arc(60 + s * 540, 340 - 250 * Math.pow(s, 0.45) * f, 5, 0, 7); g.fill(); }
  g.fillStyle = '#8d93a8'; g.font = `15px ${SANS}`; g.fillText('dea_efficiency.do', 12, 19);
  return c;
}

export async function loadFonts() {
  if (!document.fonts) return;
  const want = ['400 20px "Archivo Black"', '600 20px Inter', '700 20px Inter', '500 20px Inter', '400 20px Caveat'];
  await Promise.race([Promise.all(want.map(f => document.fonts.load(f).catch(() => 0))), new Promise(r => setTimeout(r, 1800))]);
}
