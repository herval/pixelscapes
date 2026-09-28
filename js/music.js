'use strict';
// Pixelscapes FM: an endless, procedurally generated lo-fi radio built on the Web Audio API.
// Every sound is synthesized (no samples): FM electric piano, sub bass, boom-bap drums, soft leads,
// vinyl crackle, tape wow/flutter, and rain. Each "track" gets its own key, tempo, progression,
// grooves, melody and song structure; when it ends the next one is generated. The mood follows
// the scene (night, rain, snow, season).
(function () {
  const PS = (window.PS = window.PS || {});
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ------------------------------------------------------------------------------------------
  // Harmony

  const QUAL = {
    maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17],
    dom7: [0, 4, 7, 10], dom9: [0, 4, 7, 10, 14], dom13: [0, 4, 10, 14, 21], sus: [0, 5, 7, 10, 14], add9: [0, 4, 7, 14],
  };
  // [semitones above the tonic, quality]; one chord per bar
  const PROGS_MAJ = [
    [[2, 'm9'], [7, 'dom9'], [0, 'maj9'], [9, 'm7']],
    [[0, 'maj7'], [9, 'm9'], [2, 'm7'], [7, 'dom13']],
    [[5, 'maj9'], [4, 'm7'], [2, 'm9'], [0, 'maj7']],
    [[0, 'maj9'], [0, 'maj9'], [5, 'maj9'], [5, 'maj9']],
    [[5, 'maj7'], [7, 'sus'], [4, 'm7'], [9, 'm9']],
    [[2, 'm9'], [7, 'sus'], [0, 'maj9'], [0, 'add9']],
    [[9, 'm9'], [5, 'maj9'], [0, 'maj9'], [7, 'dom9']],
    [[0, 'maj9'], [4, 'm7'], [5, 'maj9'], [7, 'sus']],
  ];
  const PROGS_MIN = [
    [[0, 'm9'], [0, 'm9'], [5, 'm9'], [5, 'm9']],
    [[0, 'm9'], [8, 'maj7'], [5, 'm7'], [7, 'm7']],
    [[0, 'm11'], [10, 'dom9'], [8, 'maj9'], [7, 'dom9']],
    [[5, 'm9'], [10, 'dom13'], [3, 'maj9'], [8, 'maj7']],
    [[0, 'm9'], [3, 'maj7'], [10, 'dom9'], [5, 'm9']],
    [[8, 'maj9'], [7, 'm7'], [5, 'm9'], [0, 'm9']],
  ];
  const PENTA_MAJ = [0, 2, 4, 7, 9];
  const PENTA_MIN = [0, 3, 5, 7, 10];

  // Grooves: 16 steps per bar. Values are velocities.
  const DRUMS = [
    { k: [1, 0, 0, 0, 0, 0, 0, 0.55, 0, 0, 1, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.25], h: [0.8, 0, 0.45, 0, 0.8, 0, 0.45, 0.25, 0.8, 0, 0.45, 0, 0.8, 0, 0.45, 0] },
    { k: [1, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0.5, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0.3] },
    { k: [1, 0, 0, 0.6, 0, 0, 0, 0, 1, 0, 0.5, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0.2, 0, 0, 0, 0, 1, 0, 0.2, 0], h: [0.6, 0.25, 0.5, 0.25, 0.6, 0.25, 0.5, 0.25, 0.6, 0.25, 0.5, 0.25, 0.6, 0.25, 0.5, 0.25] },
    { k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], h: [0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0] },
    { k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [0.75, 0, 0.4, 0.2, 0.75, 0, 0.4, 0, 0.75, 0, 0.4, 0.2, 0.75, 0, 0.6, 0] },
  ];
  // Bass: [step, semitones from chord root, length in steps]
  const BASS = [
    [[0, 0, 6], [10, 0, 4], [14, 7, 2]],
    [[0, 0, 3], [3, 12, 2], [8, 0, 5], [14, 7, 2]],
    [[0, 0, 10], [12, 7, 3]],
    [[0, 0, 5], [6, 0, 2], [10, 3, 2], [12, 5, 3]],
  ];
  // Keys comping: [step, length, velocity]
  const COMP = [
    [[0, 15, 0.9]],
    [[0, 6, 0.85], [6, 4, 0.55], [10, 6, 0.7]],
    [[0, 9, 0.85], [10, 6, 0.6]],
    [[0, 3, 0.8], [3, 3, 0.5], [7, 5, 0.7], [12, 4, 0.55]],
  ];

  const WORDS_A = ['rainy', 'late', 'blue', 'neon', 'quiet', 'sleepy', 'golden', 'foggy', 'midnight', 'rooftop', 'slow', 'hazy', 'warm', 'lonely', 'soft', 'last', 'sunday', 'cold'];
  const WORDS_B = ['bodega', 'ferry', 'fire escape', 'steam vents', 'pigeons', 'subway', 'puddles', 'stoop', 'window', 'bridge', 'taxi', 'radiator', 'laundromat', 'coffee', 'skyline', 'streetlights', 'harbor', 'elevator'];

  function makeRng(seed) { return PS.rng ? PS.rng(seed) : Math.random; }

  function generateTrack(seed, mood) {
    const r = makeRng(seed);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const night = mood.night || 0, rain = mood.rain || 0, snow = mood.snow || 0;
    const minor = r() < 0.3 + 0.3 * night + 0.35 * rain;
    const key = 48 + Math.floor(r() * 12); // tonic, C3..B3
    const prog = pick(minor ? PROGS_MIN : PROGS_MAJ);
    const bpm = Math.round(84 - night * 12 - rain * 4 + (r() * 8 - 4));
    const winter = mood.season === 'winter' || snow > 0.2;
    const leadInst = winter && r() < 0.6 ? 'bell' : pick(['ep', 'soft', 'soft', 'ep', 'bell']);
    const scale = minor ? PENTA_MIN : PENTA_MAJ;

    // Chord voicings: keep the voices close together from bar to bar.
    let prev = null;
    const voicings = prog.map(([deg, q]) => {
      const root = key + deg;
      const tones = QUAL[q].slice(1).map((i) => root + i);
      const center = prev ? prev.reduce((a, b) => a + b, 0) / prev.length : 62;
      const v = tones.map((n) => { while (n < center - 6) n += 12; while (n > center + 6) n -= 12; return n; });
      v.sort((a, b) => a - b);
      const out = [];
      for (const n of v) if (!out.includes(n)) out.push(n);
      prev = out.slice(0, 5);
      return { root, notes: prev };
    });

    // Melody: a two-bar motif over the scale, repeated with variation.
    const scaleNotes = [];
    for (let o = 0; o < 3; o++) for (const s of scale) scaleNotes.push(key + 12 + o * 12 + s);
    const range = scaleNotes.filter((n) => n >= key + 17 && n <= key + 34);
    const motif = [];
    let idx = Math.floor(range.length / 2), step = 0;
    while (step < 32) {
      const len = pick([2, 2, 3, 4, 4, 6]);
      if (r() < 0.35) { step += len; continue; }
      idx = Math.max(0, Math.min(range.length - 1, idx + pick([-2, -1, -1, 0, 1, 1, 2])));
      motif.push([step, range[idx], Math.min(len, 32 - step), 0.55 + r() * 0.35]);
      step += len;
    }
    const variant = motif.map(([s, n, l, v]) => [s, r() < 0.3 ? range[Math.max(0, Math.min(range.length - 1, range.indexOf(n) + pick([-1, 1])))] : n, l, v]);

    const sections = [
      { name: 'intro', bars: 4, keys: 1, cut: 900 },
      { name: 'a', bars: 8, keys: 1, drums: 1, bass: 1, cut: 1 },
      { name: 'b', bars: 8, keys: 1, drums: 1, bass: 1, lead: 1, cut: 1 },
      { name: 'break', bars: 4, keys: 1, hats: 1, cut: 1100 },
      { name: 'a2', bars: 8, keys: 1, drums: 1, bass: 1, lead: 1, cut: 1, alt: 1 },
      { name: 'b2', bars: 8, keys: 1, drums: 1, bass: 1, lead: 1, cut: 1, alt: 1 },
      { name: 'outro', bars: 4, keys: 1, hats: 1, cut: 800, fade: 1 },
    ];
    return {
      seed, bpm, swing: 0.12 + r() * 0.14, key, minor, prog, voicings,
      drums: pick(DRUMS), drumsAlt: pick(DRUMS), bass: pick(BASS), comp: pick(COMP), compAlt: pick(COMP),
      motif, variant, leadInst, sections,
      bars: sections.reduce((a, s) => a + s.bars, 0),
      bright: 4200 + (1 - night) * 3600 - rain * 1200,
      title: `${pick(WORDS_A)} ${pick(WORDS_B)}`,
      strum: 0.012 + r() * 0.02,
      wobble: 4 + r() * 8,
    };
  }

  // ------------------------------------------------------------------------------------------
  // Engine

  class Lofi {
    constructor(ctx, opts) {
      this.ctx = ctx;
      this.opts = opts || {};
      this.getMood = this.opts.getMood || (() => ({}));
      this.onTrack = this.opts.onTrack || (() => {});
      this.seed = this.opts.seed != null ? this.opts.seed : (Math.random() * 1e9) | 0;
      this.volume = this.opts.volume != null ? this.opts.volume : 0.6;
      this.build();
      this.track = null;
      this.nextTime = ctx.currentTime + 0.1;
      this.step = 0;
    }

    build() {
      const c = this.ctx;
      const g = (v) => { const n = c.createGain(); n.gain.value = v; return n; };
      this.master = g(this.volume);
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -20; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.25;
      // soft tape saturation
      this.sat = c.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
      this.sat.curve = curve;
      this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 3000; this.lp.Q.value = 0.3;
      this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 35;
      this.bus = g(1);
      this.bus.connect(this.lp).connect(this.hp).connect(this.sat).connect(this.comp).connect(this.master).connect(c.destination);
      this.fade = g(1); // per-track fade in/out
      this.fade.connect(this.bus);
      this.duck = g(1); // sidechain pump from the kick
      this.duck.connect(this.fade);
      this.drums = g(0.9); this.drums.connect(this.fade);
      this.keys = g(0.62); this.keys.connect(this.duck);
      this.bassBus = g(0.5); this.bassBus.connect(this.duck);
      this.leadBus = g(0.4); this.leadBus.connect(this.duck);
      // reverb
      this.rev = c.createConvolver();
      this.rev.buffer = this.impulse(2.8);
      this.revSend = g(1); this.revRet = g(0.32);
      this.revSend.connect(this.rev).connect(this.revRet).connect(this.bus);
      // tape wow & flutter, shared by every pitched voice
      this.detune = g(1);
      const wow = c.createOscillator(); wow.frequency.value = 0.31;
      this.wowAmt = g(7); wow.connect(this.wowAmt).connect(this.detune);
      const flutter = c.createOscillator(); flutter.frequency.value = 5.7;
      const flAmt = g(2.2); flutter.connect(flAmt).connect(this.detune);
      wow.start(); flutter.start();
      // noise for drums
      this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const nd = this.noise.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      // vinyl crackle + hiss
      const cr = c.createBuffer(1, c.sampleRate * 6, c.sampleRate);
      const cd = cr.getChannelData(0);
      let hiss = 0;
      for (let i = 0; i < cd.length; i++) {
        hiss = hiss * 0.97 + (Math.random() * 2 - 1) * 0.03;
        cd[i] = hiss * 0.08;
      }
      for (let k = 0; k < 6 * 9; k++) {
        const at = Math.floor(Math.random() * (cd.length - 40)), amp = (Math.random() < 0.1 ? 0.5 : 0.18) * (Math.random() < 0.5 ? -1 : 1);
        for (let j = 0; j < 30; j++) cd[at + j] += amp * Math.exp(-j / 4) * (j % 2 ? -0.6 : 1);
      }
      this.crackle = c.createBufferSource(); this.crackle.buffer = cr; this.crackle.loop = true;
      const crf = c.createBiquadFilter(); crf.type = 'highpass'; crf.frequency.value = 900;
      this.crackleGain = g(0.35);
      this.crackle.connect(crf).connect(this.crackleGain).connect(this.sat);
      this.crackle.start();
      // rain ambience (pink-ish noise, band-limited)
      const rb = c.createBuffer(2, c.sampleRate * 5, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = rb.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
          d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
          if (Math.random() < 0.0004) d[i] += (Math.random() - 0.5) * 0.6; // drips
        }
      }
      this.rain = c.createBufferSource(); this.rain.buffer = rb; this.rain.loop = true;
      const rhp = c.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 350;
      const rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 5000;
      this.rainGain = g(0);
      this.rain.connect(rhp).connect(rlp).connect(this.rainGain).connect(this.comp);
      this.rain.start();
    }

    impulse(sec) {
      const c = this.ctx, len = Math.floor(c.sampleRate * sec);
      const b = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      return b;
    }

    setVolume(v) { this.volume = v; this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); }

    // Ambience follows the weather continuously.
    setAmbience(mood) {
      const t = this.ctx.currentTime;
      this.rainGain.gain.setTargetAtTime(Math.min(0.4, (mood.rain || 0) * 0.45), t, 2);
      this.crackleGain.gain.setTargetAtTime(0.25 + 0.2 * (mood.night || 0), t, 2);
    }

    next() { this.forceNext = true; }

    // ---- instruments ------------------------------------------------------------------------

    env(gain, t, peak, attack, decayTo, decay, end, release) {
      const p = gain.gain;
      p.setValueAtTime(0.0001, t);
      p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
      p.exponentialRampToValueAtTime(Math.max(0.0002, decayTo), t + attack + decay);
      p.setValueAtTime(Math.max(0.0002, decayTo), end);
      p.exponentialRampToValueAtTime(0.0001, end + release);
    }

    kick(t, v) {
      const c = this.ctx, o = c.createOscillator(), a = c.createGain();
      o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.09);
      a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(v * 0.95, t + 0.004); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(a).connect(this.drums); o.start(t); o.stop(t + 0.45);
      const d = this.duck.gain;
      d.setValueAtTime(1, t); d.linearRampToValueAtTime(0.62, t + 0.01); d.linearRampToValueAtTime(1, t + 0.28);
    }

    snare(t, v) {
      const c = this.ctx;
      const n = c.createBufferSource(); n.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.6;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4500;
      const a = c.createGain();
      a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(v * 0.42, t + 0.003); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      n.connect(bp).connect(lp).connect(a); a.connect(this.drums); a.connect(this.revSend);
      n.start(t, Math.random() * 1.5); n.stop(t + 0.25);
      const o = c.createOscillator(), ob = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      ob.gain.setValueAtTime(0.0001, t); ob.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.003); ob.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(ob).connect(this.drums); o.start(t); o.stop(t + 0.14);
    }

    hat(t, v, open) {
      const c = this.ctx;
      const n = c.createBufferSource(); n.buffer = this.noise;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
      const a = c.createGain(), len = open ? 0.28 : 0.045;
      a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(v * 0.2, t + 0.002); a.gain.exponentialRampToValueAtTime(0.0001, t + len);
      n.connect(hp).connect(a).connect(this.drums);
      n.start(t, Math.random() * 1.5); n.stop(t + len + 0.02);
    }

    // FM electric piano (Rhodes-ish): sine carrier, 1:1 modulator with decaying index, plus a tine "ping".
    ep(t, m, dur, v, bus) {
      const c = this.ctx, f = midiHz(m);
      const car = c.createOscillator(); car.frequency.value = f;
      const mod = c.createOscillator(); mod.frequency.value = f;
      const mg = c.createGain();
      mg.gain.setValueAtTime(f * 2.4 * v, t); mg.gain.exponentialRampToValueAtTime(f * 0.3 + 1, t + 1.1);
      mod.connect(mg).connect(car.frequency);
      const tine = c.createOscillator(); tine.frequency.value = f * 14;
      const tg = c.createGain(); tg.gain.setValueAtTime(f * 0.9 * v, t); tg.gain.exponentialRampToValueAtTime(1, t + 0.06);
      tine.connect(tg).connect(car.frequency);
      const a = c.createGain();
      this.env(a, t, v * 0.16, 0.006, v * 0.06, 1.6, t + dur, 0.45);
      car.connect(a); a.connect(bus || this.keys); a.connect(this.revSend);
      this.detune.connect(car.detune); this.detune.connect(mod.detune);
      const end = t + dur + 0.5;
      for (const o of [car, mod, tine]) { o.start(t); o.stop(end); }
    }

    bass(t, m, dur, v) {
      const c = this.ctx, f = midiHz(m);
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const sub = c.createOscillator(); sub.frequency.value = f / 2;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.8;
      const a = c.createGain(), sg = c.createGain(); sg.gain.value = 0.35;
      this.env(a, t, v * 0.42, 0.012, v * 0.3, 0.25, t + dur, 0.09);
      o.connect(lp); sub.connect(sg).connect(lp); lp.connect(a).connect(this.bassBus);
      this.detune.connect(o.detune);
      for (const x of [o, sub]) { x.start(t); x.stop(t + dur + 0.15); }
    }

    lead(t, m, dur, v, inst) {
      const c = this.ctx, f = midiHz(m);
      if (inst === 'ep') return this.ep(t, m, dur, v * 0.9, this.leadBus);
      if (inst === 'bell') {
        // soft celesta: FM with inharmonic ratio and fast decay
        const car = c.createOscillator(); car.frequency.value = f;
        const mod = c.createOscillator(); mod.frequency.value = f * 3.5;
        const mg = c.createGain(); mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.5);
        mod.connect(mg).connect(car.frequency);
        const a = c.createGain(); this.env(a, t, v * 0.16, 0.003, 0.0005, 1.1, t + 1.2, 0.2);
        car.connect(a); a.connect(this.leadBus); a.connect(this.revSend);
        for (const o of [car, mod]) { o.start(t); o.stop(t + 1.5); }
        return;
      }
      // soft filtered triangle with delayed vibrato
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const vib = c.createOscillator(); vib.frequency.value = 5.2;
      const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(14, t + Math.min(0.5, dur));
      vib.connect(vg).connect(o.detune);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      const a = c.createGain(); this.env(a, t, v * 0.2, 0.05, v * 0.15, 0.3, t + dur, 0.25);
      o.connect(lp).connect(a); a.connect(this.leadBus); a.connect(this.revSend);
      this.detune.connect(o.detune);
      for (const x of [o, vib]) { x.start(t); x.stop(t + dur + 0.4); }
    }

    // ---- sequencing --------------------------------------------------------------------------

    newTrack() {
      const mood = this.getMood();
      this.track = generateTrack(this.seed++, mood);
      this.step = 0;
      this.wowAmt.gain.setTargetAtTime(this.track.wobble, this.nextTime, 1);
      const t = this.nextTime;
      this.fade.gain.cancelScheduledValues(t);
      this.fade.gain.setValueAtTime(0.0001, t);
      this.fade.gain.exponentialRampToValueAtTime(1, t + 4);
      this.onTrack(this.track, t);
    }

    sectionAt(bar) {
      let b = bar;
      for (const s of this.track.sections) { if (b < s.bars) return { s, barIn: b }; b -= s.bars; }
      return null;
    }

    scheduleStep(t) {
      const T = this.track;
      const bar = Math.floor(this.step / 16), st = this.step % 16;
      const sec = this.sectionAt(bar);
      if (!sec) return false;
      const { s, barIn } = sec;
      const stepDur = 60 / T.bpm / 4;
      const swingT = st % 2 ? T.swing * stepDur : 0;
      const hum = () => (Math.random() - 0.5) * 0.012;
      const tt = t + swingT;
      const chord = T.voicings[bar % T.voicings.length];

      if (st === 0 && barIn === 0) {
        const cut = s.cut === 1 ? T.bright : s.cut;
        this.lp.frequency.setTargetAtTime(cut, t, s.cut === 1 ? 1.2 : 0.8);
        if (s.fade) {
          const end = t + s.bars * 16 * stepDur;
          this.fade.gain.setValueAtTime(1, end - 6);
          this.fade.gain.exponentialRampToValueAtTime(0.0001, end);
        }
      }
      // keys
      if (s.keys) {
        const comp = s.alt ? T.compAlt : T.comp;
        for (const [cs, len, vel] of comp) {
          if (cs !== st) continue;
          chord.notes.forEach((n, i) => this.ep(tt + i * T.strum + hum(), n, len * stepDur, vel * (0.75 + Math.random() * 0.25)));
        }
      }
      // bass
      if (s.bass) {
        let br = chord.root;
        while (br > 47) br -= 12;
        while (br < 36) br += 12;
        for (const [bs, iv, len] of T.bass) if (bs === st) this.bass(tt + hum(), br + iv, len * stepDur, 0.85);
      }
      // drums
      const D = s.alt ? T.drumsAlt : T.drums;
      const fill = barIn % 4 === 3 && st >= 12 && Math.random() < 0.5;
      if (s.drums) {
        if (D.k[st]) this.kick(tt + hum() * 0.5, D.k[st]);
        if (D.s[st]) this.snare(tt + hum() * 0.5, D.s[st] * (0.85 + Math.random() * 0.15));
        else if (fill && Math.random() < 0.4) this.snare(tt, 0.2 + Math.random() * 0.2);
        if (Math.random() < 0.05 && !D.s[st] && st % 2) this.snare(tt, 0.12);
      }
      if (s.drums || s.hats) {
        if (D.h[st]) this.hat(tt + hum(), D.h[st] * (0.7 + Math.random() * 0.3), st === 14 && Math.random() < 0.15);
      }
      // lead: two-bar motif, the variant on alternate phrases
      if (s.lead) {
        const phraseStep = (bar % 2) * 16 + st;
        const motif = Math.floor(bar / 2) % 2 && s.alt ? T.variant : T.motif;
        for (const [ms, n, len, vel] of motif) if (ms === phraseStep) this.lead(tt + hum(), n, len * stepDur, vel, T.leadInst);
      }
      return true;
    }

    // Schedule everything up to `until` (seconds on the context clock).
    scheduleUntil(until) {
      while (this.nextTime < until) {
        if (!this.track || this.forceNext) {
          if (this.forceNext && this.track) {
            const t = this.nextTime;
            this.fade.gain.cancelScheduledValues(t);
            this.fade.gain.setValueAtTime(this.fade.gain.value, t);
            this.fade.gain.linearRampToValueAtTime(0.0001, t + 0.8);
            this.nextTime += 1;
          }
          this.forceNext = false;
          this.newTrack();
        }
        if (!this.scheduleStep(this.nextTime)) { this.nextTime += 0.8; this.track = null; continue; }
        this.nextTime += 60 / this.track.bpm / 4;
        this.step++;
      }
    }

    start() {
      if (this.timer) return;
      this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.1);
      // background tabs throttle timers to ~1/s, so look further ahead when hidden
      const ahead = () => (typeof document !== 'undefined' && document.hidden ? 1.6 : 0.3);
      this.timer = setInterval(() => this.scheduleUntil(this.ctx.currentTime + ahead()), 50);
      this.scheduleUntil(this.ctx.currentTime + 0.3);
    }

    stop() { clearInterval(this.timer); this.timer = null; }
  }

  PS.Lofi = Lofi;
  PS.generateLofiTrack = generateTrack;
})();
