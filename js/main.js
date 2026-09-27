'use strict';
// Pixelscapes engine: sky, parallax skyline, water reflections, ambient life and the event scheduler.
(function () {
  const PS = window.PS;
  const { hex, mix, css, clamp, smooth } = PS;
  const R = PS.R;

  const q = new URLSearchParams(location.search);
  const num = (k, d) => (q.has(k) && !isNaN(parseFloat(q.get(k))) ? parseFloat(q.get(k)) : d);
  const cfg = {
    city: q.get('city') || 'nyc',
    pan: num('pan', 3.5),              // main-layer art pixels per second
    speed: num('speed', 1),            // time multiplier (e.g. 600 = 10 min per second)
    time: q.get('time'),               // fixed start time "HH:MM"
    res: num('res', 270),              // target art-pixel height
    scale: num('scale', 0),            // force pixel scale
    fps: num('fps', 30),
    events: num('events', 1),          // event frequency multiplier
    label: q.get('label') !== '0',
    debug: q.has('debug'),
    lat: q.has('lat') ? num('lat', 40) : null,
    lon: q.has('lon') ? num('lon', -74) : null,
    event: q.get('event'),
    cam: q.has('cam') ? num('cam', 0) : null,
  };

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const pS = new PS.Painter(ctx);
  const pM = new PS.Painter(ctx);

  // --- location & clock -----------------------------------------------------------------------
  let loc = null;
  if (cfg.lat != null && cfg.lon != null) loc = { lat: cfg.lat, lon: cfg.lon };
  else {
    try { const c = JSON.parse(localStorage.getItem('pixelscapes.loc') || 'null'); if (c) loc = c; } catch (e) { /* ignore */ }
    if (!loc) loc = PS.guessLocation();
    if (navigator.geolocation && !q.has('nogeo')) {
      try {
        navigator.geolocation.getCurrentPosition((pos) => {
          loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          try { localStorage.setItem('pixelscapes.loc', JSON.stringify(loc)); } catch (e) { /* ignore */ }
          dirty = true;
        }, () => {}, { timeout: 15000, maximumAge: 6 * 3600e3 });
      } catch (e) { /* ignore */ }
    }
  }

  const realStart = Date.now();
  let simStart = realStart;
  if (cfg.time) {
    const [h, m] = cfg.time.split(':').map(Number);
    const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); simStart = d.getTime();
  }
  let timeOffset = 0;
  const simNow = () => new Date(simStart + (Date.now() - realStart) * cfg.speed + timeOffset);

  // --- scene state --------------------------------------------------------------------------
  const city = PS.cities[cfg.city] ? PS.cities[cfg.city](1337) : PS.cities.nyc(1337);
  for (const L of city.layers) {
    L.canvas = document.createElement('canvas');
    L.ctx = L.canvas.getContext('2d');
    L.W = L.B.W;
    L.ops = L.B.ops;
  }
  const main = city.layers.find((l) => l.name === 'main');
  const WM = main.W;

  let s = 1, SW = 0, SH = 0, VW = 0, VH = 0, horizon = 0, groundY = 0;
  const sky = document.createElement('canvas'), skyCtx = sky.getContext('2d');
  const water = document.createElement('canvas'), waterCtx = water.getContext('2d');
  let stars = [], clouds = [], dashes = [], cars = [], tvs = [];
  let P = PS.palette(20, false), sunInfo = null, moonInfo = null, hour = 12;
  let dirty = true, lastRender = -1e9, lastPalAlt = 999;
  let cam = cfg.cam != null ? cfg.cam : R() * WM, paused = false;
  let t = 0;
  const events = [];
  let nextEvent = 3;
  const claimed = new Set();
  const claimedGrid = new Set();
  let toast = null;

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    SW = Math.round(window.innerWidth * dpr); SH = Math.round(window.innerHeight * dpr);
    canvas.width = SW; canvas.height = SH;
    s = cfg.scale || Math.max(1, Math.round(SH / cfg.res));
    VW = Math.ceil(SW / s); VH = Math.ceil(SH / s);
    horizon = VH - Math.max(26, Math.round(VH * 0.2));
    groundY = horizon - 5;
    for (const L of city.layers) { L.canvas.width = L.W; L.canvas.height = horizon; }
    sky.width = VW; sky.height = horizon;
    water.width = VW; water.height = VH - horizon;
    pS.s = pM.s = s;
    const sr = PS.rng(99);
    stars = Array.from({ length: Math.round(VW * horizon / 260) }, () => ({
      x: Math.floor(sr() * VW), y: Math.floor(sr() * horizon * 0.85), b: 0.35 + sr() * 0.65, tw: sr() < 0.3 ? 1 + sr() * 3 : 0, ph: sr() * 10, big: sr() < 0.04,
      c: sr() < 0.15 ? [255, 220, 190] : sr() < 0.2 ? [200, 220, 255] : [255, 255, 245],
    }));
    makeClouds();
    dashes = Array.from({ length: Math.round(WM * (VH - horizon) / 90) }, () => ({ x: sr() * WM, r: 1 + Math.floor(sr() * (VH - horizon - 1)), w: 1 + Math.floor(sr() * 4), ph: sr() * 10, sp: 0.5 + sr() * 1.5 }));
    cars = [];
    for (const lane of city.lanes) {
      const n = Math.round((lane.x1 - lane.x0) / (lane.bridge ? 18 : 22));
      for (let i = 0; i < n; i++) cars.push({ lane, x: lane.x0 + sr() * (lane.x1 - lane.x0), v: (8 + sr() * 10) * lane.dir, c: sr.pick(['#d8d4cc', '#c83a32', '#2a4a8a', '#f2c230', '#303038', '#e8e8f0', '#4a7a4a']) });
    }
    ctx.imageSmoothingEnabled = false;
    dirty = true;
  }

  // --- clouds -------------------------------------------------------------------------------
  function makeClouds() {
    const dayKey = Math.floor(simNow().getTime() / 864e5);
    const r = PS.rng(dayKey * 7 + 3);
    const cover = r();
    const n = Math.round(2 + cover * 8 * (VW / 480));
    clouds = [];
    const span = VW + 300;
    for (let i = 0; i < n; i++) {
      const streak = r() < 0.25;
      const w = streak ? r.int(40, 110) : r.int(22, 70);
      const h = streak ? r.int(5, 8) : Math.round(w * r.range(0.28, 0.42));
      const mask = new Uint8Array(w * h);
      const blobs = streak ? 5 : r.int(4, 8);
      for (let b = 0; b < blobs; b++) {
        const cx = r.range(0.18, 0.82) * w, rx = streak ? r.range(0.15, 0.35) * w : r.range(0.13, 0.28) * w;
        const ry = streak ? h * 0.5 : Math.min(h * 0.85, rx * r.range(0.6, 0.9));
        const cy = h - ry * (streak ? 1 : 0.8) - 0.5;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) mask[y * w + x] = 1;
        }
      }
      const ys = streak ? r.range(horizon * 0.35, horizon * 0.7) : r.range(6, horizon * 0.5);
      clouds.push({ w, h, mask, x: r() * span, y: Math.round(ys), drift: r.range(0.4, 1.4), par: streak ? 0.03 : 0.06, canvas: document.createElement('canvas') });
    }
  }

  function renderClouds() {
    const lit = P.cl, body = P.cb, sh = P.cs;
    const sunLeft = (sunInfo ? sunInfo.dir : 0) < 0;
    for (const c of clouds) {
      const { w, h, mask } = c;
      c.canvas.width = w; c.canvas.height = h;
      const g = c.canvas.getContext('2d');
      const img = g.createImageData(w, h), d = img.data;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        const b = PS.bayer(x, y);
        let col = body;
        const up1 = at(x, y - 1), up2 = at(x, y - 2), dn1 = at(x, y + 1), dn2 = at(x, y + 2);
        const side = sunLeft ? at(x - 1, y) : at(x + 1, y);
        if (!up1 || (!up2 && b > 0.4) || (!side && b > 0.5)) col = lit;
        else if (!dn1 || (!dn2 && b > 0.5) || y > h * 0.75) col = sh;
        const i = (y * w + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
  }

  // --- sky ----------------------------------------------------------------------------------
  const sx = (H) => VW * (0.5 + 0.44 * Math.sin(clamp(H * 0.75, -Math.PI / 2, Math.PI / 2)));
  const sy = (alt) => horizon - 4 - alt * (horizon - 24) / 55;

  function renderSky() {
    const w = VW, h = horizon;
    const img = skyCtx.createImageData(w, h), d = img.data;
    const N = 20;
    const bands = [];
    for (let i = 0; i <= N; i++) {
      const tt = i / N;
      bands.push(tt < 0.55 ? mix(P.top, P.mid, tt / 0.55) : mix(P.mid, P.hor, (tt - 0.55) / 0.45));
    }
    const sun = sunInfo, moon = moonInfo;
    const glowR = 36 + 90 * P.golden + 16 * P.day, glowS = 0.12 + 0.62 * P.golden;
    const mGlow = moon && moon.visible ? 0.16 * P.stars * (0.3 + 0.7 * Math.sin(moon.phase * Math.PI)) : 0;
    for (let y = 0; y < h; y++) {
      const lvl = (y / (h - 1)) * N;
      const lo = Math.floor(lvl), f = lvl - lo;
      for (let x = 0; x < w; x++) {
        const b = PS.bayer(x, y);
        let c = bands[f > b ? Math.min(N, lo + 1) : lo];
        if (sun.alt > -8) {
          const dx = x - sun.x, dy = (y - sun.y) * 1.4;
          const dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < glowR) {
            const g = (1 - dd / glowR) ** 2 * glowS * clamp((sun.alt + 8) / 8, 0, 1);
            const qg = Math.floor(g * 7 + b) / 7;
            if (qg > 0) c = mix(c, P.glow, Math.min(0.85, qg));
          }
        }
        if (mGlow > 0) {
          const dx = x - moon.x, dy = y - moon.y;
          const dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < 28) { const qg = Math.floor((1 - dd / 28) ** 2 * mGlow * 6 + b) / 6; if (qg > 0) c = mix(c, [190, 200, 235], qg); }
        }
        const i = (y * w + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    // sun disc
    if (sun.alt > -3) {
      const R0 = 6;
      const core = mix(P.sunDisc, [255, 255, 255], 0.5);
      for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) {
        const dd = x * x + y * y;
        if (dd > R0 * R0 + 2) continue;
        const X = Math.round(sun.x) + x, Y = Math.round(sun.y) + y;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const c = dd < (R0 - 2) * (R0 - 2) ? core : P.sunDisc;
        const i = (Y * w + X) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
    }
    // moon with phase
    if (moon && moon.visible) {
      const R0 = 5, ph = moon.phase;
      const k = Math.cos(ph * 2 * Math.PI);
      const litC = mix([244, 240, 220], P.hor, 0.15 * P.day), crater = mix([214, 208, 190], P.hor, 0.15 * P.day);
      const craters = [[-2, -1], [1, 2], [2, -2], [-1, 2], [0, 0]];
      for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) {
        if (x * x + y * y > R0 * R0 + 1) continue;
        const X = Math.round(moon.x) + x, Y = Math.round(moon.y) + y;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const nx = (x + 0.5) / (R0 + 0.5), ny = y / (R0 + 0.5);
        const lim = Math.sqrt(Math.max(0, 1 - ny * ny));
        const lit = ph < 0.5 ? nx > k * lim : nx < -k * lim;
        const i = (Y * w + X) * 4;
        let c;
        if (lit) c = craters.some(([a, bb]) => a === x && bb === y) ? crater : litC;
        else c = mix([d[i], d[i + 1], d[i + 2]], [60, 66, 110], 0.35 * P.stars);
        const a = P.day > 0.5 ? 0.55 : 1;
        d[i] = PS.lerp(d[i], c[0], a); d[i + 1] = PS.lerp(d[i + 1], c[1], a); d[i + 2] = PS.lerp(d[i + 2], c[2], a);
      }
    }
    skyCtx.putImageData(img, 0, 0);
  }

  function renderWater() {
    const w = VW, h = VH - horizon;
    const img = waterCtx.createImageData(w, h), d = img.data;
    const base = P.wat;
    const a0 = 0.46 + 0.04 * P.day, a1 = 0.78 + 0.04 * P.day;
    for (let y = 0; y < h; y++) {
      const k = y / Math.max(1, h - 1);
      for (let x = 0; x < w; x++) {
        const b = PS.bayer(x, y);
        let a = a0 + (a1 - a0) * k;
        a = Math.floor(a * 8 + b) / 8;
        if (y % 3 === 1 && b > 0.35) a += 0.08; // ripple troughs
        const i = (y * w + x) * 4;
        d[i] = base[0]; d[i + 1] = base[1]; d[i + 2] = base[2]; d[i + 3] = Math.min(255, a * 255);
      }
    }
    waterCtx.putImageData(img, 0, 0);
  }

  function updateSun(now) {
    const sun = PS.sunPos(now, loc.lat, loc.lon);
    hour = now.getHours() + now.getMinutes() / 60;
    const rising = sun.H < 0;
    P = PS.palette(sun.alt, rising);
    const X = sx(sun.H);
    P.sunDir = clamp((X / VW - 0.5) * 2.2, -1, 1) * smooth(-2, 6, sun.alt);
    sunInfo = { alt: sun.alt, x: X, y: sy(sun.alt), dir: P.sunDir };
    const phase = PS.moonPhase(now);
    const m = PS.moonPos(sun, phase, loc.lat);
    moonInfo = { alt: m.alt, x: sx(m.H), y: sy(m.alt), phase, visible: m.alt > 2 && phase > 0.04 && phase < 0.96 };
    P.sil = css(mix(hex('#07081a'), hex('#221e33'), P.day));
  }

  function renderAll(now) {
    updateSun(now);
    renderSky();
    for (const L of city.layers) PS.renderLayer(L, P, groundY, hour);
    renderClouds();
    renderWater();
    // pick a few lit windows to flicker like TVs
    tvs = [];
    const res = PS.litFraction(hour);
    const ops = main.ops;
    for (let i = 0; i < 400 && tvs.length < 40; i++) {
      const o = ops[Math.floor(R() * ops.length)];
      if (o.t === 'w' && !o.office && !o.side && o.th < res) tvs.push({ o, ph: R() * 10 });
    }
    lastPalAlt = sunInfo.alt;
    dirty = false;
  }

  // --- drawing ------------------------------------------------------------------------------
  function blitLayer(L, off) {
    const Wl = L.W;
    const om = ((off % Wl) + Wl) % Wl;
    const base = Math.round(om * s);
    const ix = Math.floor(base / s), rem = base - ix * s;
    let col = ix, dx = -rem, remaining = VW + 1;
    while (remaining > 0) {
      const w = Math.min(remaining, Wl - col);
      ctx.drawImage(L.canvas, col, 0, w, horizon, dx, 0, w * s, horizon * s);
      dx += w * s; remaining -= w; col = 0;
    }
    return { om, base };
  }

  function layerMx(L, om, wx) {
    let d = wx - om;
    d = ((d % L.W) + L.W) % L.W;
    if (d > L.W - 200) d -= L.W;
    return om + d;
  }

  const S = {
    get t() { return t; }, get P() { return P; }, get VW() { return VW; }, get VH() { return VH; },
    get horizon() { return horizon; }, get groundY() { return groundY; }, get om() { return S._om; }, WM,
    main, city, lm: city.landmarks, get hour() { return hour; }, get month() { return simNow().getMonth(); },
    get sil() { return P.sil; }, get moon() { return moonInfo; }, claimedGrid,
    mx: (wx) => layerMx(main, S._om, wx),
    claim: (rf) => claimed.add(rf), release: (rf) => claimed.delete(rf),
    pickRoof(o) {
      const minW = (o && o.minW) || 6;
      const cands = [];
      for (const rf of main.B.roofs) {
        if (claimed.has(rf) || rf.w < minW) continue;
        const X = S.mx(rf.x) - S._om;
        if (X < VW * 0.3 || X + rf.w > VW - 6) continue;
        if (groundY + rf.y < 22) continue;
        const wgt = (rf.sky ? 4 : 1) * (rf.row === 'back' ? 1.5 : 1);
        cands.push([rf, wgt]);
      }
      if (!cands.length) return null;
      let tot = cands.reduce((a, c) => a + c[1], 0), r = R() * tot;
      for (const [rf, w] of cands) { r -= w; if (r <= 0) return rf; }
      return cands[0][0];
    },
    spawn: (id) => spawn(id),
  };

  function spawn(id) {
    const cands = id ? PS.EVENTS.filter((e) => e.id === id) : PS.EVENTS.filter((e) => !e.ok || e.ok(S));
    if (!cands.length) return null;
    for (let attempt = 0; attempt < 6; attempt++) {
      let def;
      if (id) def = cands[0];
      else {
        const tot = cands.reduce((a, e) => a + e.w, 0);
        let r = R() * tot;
        def = cands.find((e) => (r -= e.w) <= 0) || cands[0];
      }
      if (!id && events.some((e) => e.id === def.id) && def.id !== 'plane' && def.id !== 'birds') continue;
      const ev = def.make(S);
      if (ev) { ev.id = def.id; events.push(ev); return ev; }
      if (id) return null;
    }
    return null;
  }

  function drawEvents(z, omMain) {
    for (const ev of events) {
      if (ev.z !== z) continue;
      const p = ev.space === 'main' ? pM : pS;
      try { ev.draw(p, S); } catch (e) { ev.dead = true; console.error(ev.id, e); }
    }
  }

  function drawStars() {
    if (P.stars <= 0.01) return;
    for (const st of stars) {
      if (moonInfo.visible && Math.abs(st.x - moonInfo.x) < 9 && Math.abs(st.y - moonInfo.y) < 9) continue;
      let a = st.b * P.stars;
      if (st.tw) a *= 0.55 + 0.45 * Math.sin(t * st.tw + st.ph);
      a *= 1 - smooth(horizon * 0.5, horizon * 0.9, st.y);
      if (a < 0.05) continue;
      ctx.fillStyle = PS.cssA(st.c, a);
      ctx.fillRect(st.x * s, st.y * s, s, s);
      if (st.big && a > 0.5) {
        ctx.fillStyle = PS.cssA(st.c, a * 0.35);
        ctx.fillRect((st.x - 1) * s, st.y * s, s, s); ctx.fillRect((st.x + 1) * s, st.y * s, s, s);
        ctx.fillRect(st.x * s, (st.y - 1) * s, s, s); ctx.fillRect(st.x * s, (st.y + 1) * s, s, s);
      }
    }
  }

  function drawClouds() {
    const span = VW + 300;
    for (const c of clouds) {
      let x = (c.x - t * c.drift - cam * c.par) % span;
      if (x < 0) x += span;
      x -= 150;
      if (x > VW || x + c.w < 0) continue;
      ctx.drawImage(c.canvas, Math.round(x * s), c.y * s, c.w * s, c.h * s);
    }
  }

  function drawBlinkers(L, om, base, p) {
    p.ox = -base;
    for (const b of L.B.blinkers) {
      const X = layerMx(L, om, b.x);
      if (X - om < -2 || X - om > VW + 2) continue;
      const on = ((t + b.phase) % b.period) < 0.45;
      if (!on) continue;
      const y = b.y + groundY;
      if (P.dark > 0.3) {
        ctx.globalAlpha = 0.3 * P.dark;
        p.rect(X - 1, y - 1, 3, 3, b.c);
        ctx.globalAlpha = 1;
      }
      p.rect(X, y, 1, 1, b.c);
    }
  }

  function drawMainAmbient(om) {
    const night = P.dark > 0.4;
    // cars
    for (const c of cars) {
      const X = S.mx(c.x);
      if (X - om < -3 || X - om > VW + 3) continue;
      const y = groundY + c.lane.y - (c.lane.bridge ? 1 : 0);
      if (night) {
        pM.rect(X, y, 1, 1, c.v > 0 ? '#fff4c8' : '#ff3a2a');
        if (c.v > 0) { ctx.globalAlpha = 0.35; pM.rect(X + 1, y, 2, 1, '#fff4c8'); ctx.globalAlpha = 1; }
      } else pM.rect(X, y, 2, 1, c.c);
    }
    // TV flicker
    if (P.dark > 0.5) {
      for (const tv of tvs) {
        const X = S.mx(tv.o.x);
        if (X - om < -2 || X - om > VW + 2) continue;
        const k = PS.hash(Math.floor(t * 6 + tv.ph * 10), tv.o.x);
        pM.rect(X, groundY + tv.o.y, tv.o.w, tv.o.h, k < 0.33 ? '#9fc8ff' : k < 0.66 ? '#6a8cff' : '#d8ecff');
      }
    }
  }

  function drawReflection() {
    const wh = VH - horizon;
    ctx.fillStyle = css(P.wat);
    ctx.fillRect(0, horizon * s, SW, wh * s);
    for (let r = 0; r < wh; r++) {
      const src = horizon - 1 - r;
      if (src < 0) break;
      const amp = 0.4 + r * 0.07;
      const off = Math.round(Math.sin(r * 0.9 + t * 1.8 + Math.sin(r * 0.37 - t * 0.7) * 2) * amp);
      ctx.drawImage(canvas, 0, src * s, SW, s, off * s, (horizon + r) * s, SW, s);
    }
    ctx.drawImage(water, 0, 0, VW, wh, 0, horizon * s, VW * s, wh * s);
  }

  function drawWaterSparkle(om) {
    const wh = VH - horizon;
    const hl = mix(P.hor, [255, 255, 255], 0.35);
    const hlc = PS.cssA(hl, 0.35 + 0.25 * P.day);
    ctx.fillStyle = hlc;
    for (const dsh of dashes) {
      if (Math.sin(t * dsh.sp + dsh.ph) < 0.55) continue;
      const X = S.mx(dsh.x + Math.sin(t * 0.3 + dsh.ph) * 2);
      if (X - om < -5 || X - om > VW + 5) continue;
      pM.rect(X, horizon + dsh.r, dsh.w, 1);
    }
    // sun / moon glitter path
    const src = sunInfo.alt > -2 ? { x: sunInfo.x, c: mix(P.sunDisc, [255, 255, 255], 0.4), a: 0.5 + 0.4 * P.golden } :
      moonInfo.visible && P.stars > 0.3 ? { x: moonInfo.x, c: [230, 232, 255], a: 0.45 * P.stars } : null;
    if (src) {
      const tick = Math.floor(t * 5);
      for (let r = 1; r < wh; r++) {
        const spread = 2 + r * 0.45;
        for (let k = 0; k < 2; k++) {
          const hsh = PS.hash(r * 13 + k, tick + k * 7);
          if (hsh > 0.55) continue;
          const x = src.x + (PS.hash(r, tick * 3 + k) - 0.5) * 2 * spread;
          pS.rect(Math.round(x), horizon + r, 1 + Math.floor(hsh * 4), 1, PS.cssA(src.c, src.a * (1 - r / wh * 0.6)));
        }
      }
    }
  }

  function drawLabel() {
    if (!cfg.label || t > 12) return;
    const a = t < 1 ? t : t > 9 ? Math.max(0, (12 - t) / 3) : 1;
    const now = simNow();
    const hh = now.getHours(), mm = String(now.getMinutes()).padStart(2, '0');
    const str = `${city.name}  ${(hh % 12) || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`;
    ctx.globalAlpha = a;
    pS.text(str, 7, VH - 11, 'rgba(0,0,0,0.5)');
    pS.text(str, 6, VH - 12, '#f4f0e6');
    ctx.globalAlpha = 1;
  }

  function drawToast() {
    if (!toast) return;
    toast.t -= 1 / cfg.fps;
    if (toast.t <= 0) { toast = null; return; }
    const w = PS.textWidth(toast.msg);
    pS.rect(VW - w - 10, 4, w + 6, 9, 'rgba(0,0,0,0.55)');
    pS.text(toast.msg, VW - w - 7, 6, '#ffffff');
  }

  function drawDebug(fps) {
    if (!cfg.debug) return;
    const now = simNow();
    const lines = [
      `${now.toTimeString().slice(0, 5)} ALT ${sunInfo.alt.toFixed(1)} MOON ${moonInfo.phase.toFixed(2)}`,
      `LAT ${loc.lat.toFixed(1)} LON ${loc.lon.toFixed(1)} FPS ${fps}`,
      `EV ${events.map((e) => e.id).join(' ')}`,
    ];
    lines.forEach((l, i) => { pS.rect(3, 3 + i * 7, PS.textWidth(l) + 4, 7, 'rgba(0,0,0,0.5)'); pS.text(l, 5, 4 + i * 7, '#9fffb0'); });
  }

  // --- loop ---------------------------------------------------------------------------------
  let last = performance.now(), fpsCount = 0, fpsShown = 0, fpsT = 0;
  function frame(nowMs) {
    requestAnimationFrame(frame);
    const minDt = 1000 / cfg.fps;
    if (nowMs - last < minDt - 2) return;
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    fpsCount++; fpsT += dt; if (fpsT > 1) { fpsShown = fpsCount; fpsCount = 0; fpsT = 0; }
    t += dt;
    if (!paused) cam += cfg.pan * dt;

    const now = simNow();
    const interval = cfg.speed > 20 ? 250 : 4000;
    if (dirty || performance.now() - lastRender > interval) { renderAll(now); lastRender = performance.now(); }

    // simulate
    for (const c of cars) {
      c.x += c.v * dt;
      if (c.x > c.lane.x1) c.x = c.lane.x0; if (c.x < c.lane.x0) c.x = c.lane.x1;
    }
    nextEvent -= dt * cfg.events;
    if (nextEvent <= 0) {
      if (events.length < 4) spawn();
      nextEvent = R.range(7, 20);
    }
    for (const ev of events) if (!ev.dead) { try { if (!ev.update(dt, S)) ev.dead = true; } catch (e) { ev.dead = true; console.error(ev.id, e); } }
    for (let i = events.length - 1; i >= 0; i--) if (events[i].dead) { events[i].done && events[i].done(); events.splice(i, 1); }

    // draw
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sky, 0, 0, VW, horizon, 0, 0, VW * s, horizon * s);
    drawStars();
    drawClouds();
    drawEvents('sky');
    const far = city.layers[0], mid = city.layers[1];
    const fo = blitLayer(far, cam * far.par); drawBlinkers(far, fo.om, fo.base, pM);
    const mo = blitLayer(mid, cam * mid.par); drawBlinkers(mid, mo.om, mo.base, pM);
    drawEvents('back');
    const mm = blitLayer(main, cam);
    S._om = mm.om;
    drawBlinkers(main, mm.om, mm.base, pM);
    pM.ox = -mm.base;
    drawMainAmbient(mm.om);
    drawEvents('main');
    drawEvents('front');
    drawReflection();
    drawWaterSparkle(mm.om);
    drawEvents('water');
    drawLabel();
    drawToast();
    drawDebug(fpsShown);
  }

  // --- input --------------------------------------------------------------------------------
  let cycle = 0;
  const help = document.getElementById('help');
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e') { const ev = spawn(); toast = { msg: ev ? ev.id.toUpperCase() : 'NOTHING HAPPENED', t: 2 }; }
    else if (k === 'n') {
      for (let i = 0; i < PS.EVENTS.length; i++) {
        const def = PS.EVENTS[cycle++ % PS.EVENTS.length];
        const ev = spawn(def.id);
        if (ev) { toast = { msg: def.id.toUpperCase(), t: 2 }; break; }
      }
    } else if (k === ']') { timeOffset += 30 * 60e3; dirty = true; }
    else if (k === '[') { timeOffset -= 30 * 60e3; dirty = true; }
    else if (k === '\\') { timeOffset = 0; dirty = true; }
    else if (k === 'p' || k === ' ') paused = !paused;
    else if (k === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
    else if (k === 'h' || k === '?') help.classList.toggle('show');
    else if (k === 'd') cfg.debug = !cfg.debug;
    if (k === '[' || k === ']') { const n = simNow(); toast = { msg: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`, t: 1.5 }; }
  });
  canvas.addEventListener('dblclick', () => spawn());
  window.addEventListener('resize', () => { layout(); });

  layout();
  renderAll(simNow());
  if (cfg.event) setTimeout(() => cfg.event.split(',').forEach((id) => spawn(id)), 300);
  requestAnimationFrame(frame);
  window.pixelscapes = { spawn, S, cfg, setCam: (x) => { cam = x; }, render: () => { dirty = true; } };
})();
