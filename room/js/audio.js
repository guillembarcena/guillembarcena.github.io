// All sound is made here with WebAudio. On by default; the engine starts on the first click or key.
const BPM = 124, STEP = 60 / BPM / 4;
export const audio = {
  ctx: null, enabled: false, playing: false, master: null, analyser: null, _timer: 0, _step: 0, _next: 0, _noise: null, _data: null, listeners: [],
  enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor(); this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 256; this._data = new Uint8Array(128);
      this.master.connect(comp); comp.connect(this.analyser); this.analyser.connect(this.ctx.destination);
      const len = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, len, len); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this._noise = b;
    }
    this.ctx.resume(); this.enabled = true; this.listeners.forEach(f => f(true)); return true;
  },
  // Sound is on by default. Browsers only allow audio after the visitor's first click or key,
  // so the audio engine is started on that first gesture (capture phase, before any click handler).
  armDefault() {
    this.enabled = true; this.listeners.forEach(f => f(true));
    const go = () => { ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, go, true)); if (this.enabled) this.enable(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, go, true));
  },
  disable() { this.stopLoop(); if (this.ctx) this.ctx.suspend(); this.enabled = false; this.listeners.forEach(f => f(false)); },
  toggle() { this.enabled ? this.disable() : this.enable(); return this.enabled; },
  _env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  _osc(type, f, t, dur, peak, dest, f2) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.5); this._env(g, t, 0.004, dur, peak); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05); return o; },
  _nz(t, dur, peak, type, freq, q = 1) { const s = this.ctx.createBufferSource(); s.buffer = this._noise; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = this.ctx.createGain(); this._env(g, t, 0.002, dur, peak); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); },
  kick(t) { this._osc('sine', 150, t, 0.3, 1.0, null, 46); this._nz(t, 0.02, 0.2, 'lowpass', 2500); },
  hat(t, open) { this._nz(t, open ? 0.22 : 0.045, 0.22, 'highpass', 8500); },
  clap(t) { for (const o of [0, 0.011, 0.023]) this._nz(t + o, 0.09, 0.3, 'bandpass', 1500, 1.2); },
  snare(t) { this._nz(t, 0.14, 0.4, 'bandpass', 2200, 0.7); this._osc('triangle', 190, t, 0.09, 0.4, null, 140); },
  tom(t) { this._osc('sine', 170, t, 0.28, 0.7, null, 80); },
  rim(t) { this._osc('square', 820, t, 0.03, 0.25); },
  cow(t) { this._osc('square', 560, t, 0.16, 0.16); this._osc('square', 845, t, 0.16, 0.16); },
  stab(t, chord = 0) {
    const notes = [[220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63]][chord % 2];
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.22);
    f.connect(this.master); for (const n of notes) for (const d of [-6, 6]) { const o = this._osc('sawtooth', n, t, 0.24, 0.07, f); o.detune.value = d; }
  },
  bass(t, chord = 0) { this._osc('triangle', chord % 2 ? 43.65 : 55, t, 0.16, 0.6); },
  hit(name) { if (!this.enabled) return false; const t = this.ctx.currentTime + 0.005; ({ kick: () => this.kick(t), snare: () => this.snare(t), clap: () => this.clap(t), hat: () => this.hat(t), open: () => this.hat(t, true), tom: () => this.tom(t), rim: () => this.rim(t), cow: () => this.cow(t), stab: () => this.stab(t, (this._stabN = (this._stabN || 0) + 1)) })[name]?.(); return true; },
  startLoop(bars = 8) {
    if (!this.enabled || this.playing) return; this.playing = true; this._step = 0; this._next = this.ctx.currentTime + 0.06; const total = bars * 16;
    this._timer = setInterval(() => {
      while (this._next < this.ctx.currentTime + 0.12) {
        const s = this._step % 16, bar = Math.floor(this._step / 16), t = this._next;
        if (s % 4 === 0) this.kick(t);
        if (s % 4 === 2) { this.hat(t, bar % 2 === 1 && s === 14); this.bass(t, Math.floor(bar / 2)); }
        if (bar >= 2 && (s === 4 || s === 12)) this.clap(t);
        if ([3, 6, 11, 14].includes(s)) this.stab(t, Math.floor(bar / 2));
        this._step++; this._next += STEP;
        if (this._step >= total) { this.stopLoop(); break; }
      }
    }, 25);
  },
  stopLoop() { clearInterval(this._timer); this.playing = false; this._stopTrack(); },
  // Loops cut from the four records on the wall. Loaded only when first asked for, after sound is enabled.
  _tracks: [['paris', 31.22], ['octave', 28.604], ['rozlyne', 31.168], ['snake', 28.916]], _bufs: {}, _src: null, track: -1,
  _stopTrack() { if (this._src) { const s = this._src, g = this._srcGain, t = this.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.25); s.stop(t + 0.3); this._src = null; } this.track = -1; },
  async playTrack(i) {
    if (!this.enabled || !this._tracks[i]) return false;
    if (this.track === i) { this.stopLoop(); return false; }
    this.stopLoop(); this.track = i; const [name, len] = this._tracks[i];
    try {
      if (!this._bufs[name]) { const r = await fetch('room/audio/' + name + '.mp3'); this._bufs[name] = await this.ctx.decodeAudioData(await r.arrayBuffer()); }
    } catch (e) { this.track = -1; return false; }
    if (this.track !== i || !this.enabled) return false;       // something else was chosen while loading
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this._bufs[name]; s.loop = true; s.loopStart = 0.4; s.loopEnd = 0.4 + len;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.15);
    s.connect(g); g.connect(this.master); s.start(t, 0.4); this._src = s; this._srcGain = g; this.playing = true; return true;
  },
  // six meter levels: four channels and master left/right. Synthetic when silent.
  levels(t) {
    const ph = (t * BPM / 60) % 1, k = Math.exp(-ph * 5), h = Math.exp(-((ph + 0.5) % 1) * 9);
    const syn = [0.42 + 0.5 * k, 0.3 + 0.45 * h + 0.08 * Math.sin(t * 3.1), 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.7)) * k, 0.12 + 0.1 * h, 0.45 + 0.45 * k, 0.42 + 0.42 * k + 0.05 * h];
    if (this.playing && this.analyser) {
      this.analyser.getByteFrequencyData(this._data); const band = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += this._data[i]; return Math.min(1, s / (b - a) / 200); };
      const lo = band(0, 4), mid = band(6, 30), hi = band(50, 110);
      return [lo, hi * 1.6, mid * 1.3, mid * 0.6, Math.max(lo, mid), Math.max(lo * 0.95, hi)];
    }
    return syn;
  },
};
