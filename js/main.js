'use strict';
// Pixelscapes engine: sky, parallax skyline, water reflections, ambient life and the event scheduler.
(function () {
  const PS = window.PS;
  const { hex, mix, css, clamp, smooth } = PS;
  const R = PS.R;

  const q = new URLSearchParams(location.search);
  const num = (k, d) => (q.has(k) && !isNaN(parseFloat(q.get(k))) ? parseFloat(q.get(k)) : d);
  const cfg = {
    city: q.get('city'),               // nyc | rio | berlin | sf | jampa | rotate (daily); default: last chosen, else nyc
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
    weather: q.get('weather') || 'live',   // live | city | off | clear | cloudy | overcast | fog | drizzle | rain | storm | snow | blizzard | windy
    date: q.get('date'),                   // YYYY-MM-DD, to preview seasons and holidays
    music: q.get('music'),                 // 1/on: play lo-fi radio (needs a click/keypress if autoplay is blocked); 0: never
    nowplaying: q.get('nowplaying') || 'auto', // music widget: auto (on mouse move / new song), always, off
    units: q.get('units') || (/^en-US|^en-LR|^my/.test(navigator.language || '') ? 'f' : 'c'),
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
          refreshWeather();
        }, () => {}, { timeout: 15000, maximumAge: 6 * 3600e3 });
      } catch (e) { /* ignore */ }
    }
  }

  const realStart = Date.now();
  let simStart = realStart;
  if (cfg.time || cfg.date) {
    const d = new Date();
    if (cfg.date) { const [y, mo, da] = cfg.date.split('-').map(Number); if (y) d.setFullYear(y, (mo || 1) - 1, da || 1); }
    if (cfg.time) { const [h, m] = cfg.time.split(':').map(Number); d.setHours(h || 0, m || 0, 0, 0); }
    simStart = d.getTime();
  }
  let timeOffset = 0;
  const simNow = () => new Date(simStart + (Date.now() - realStart) * cfg.speed + timeOffset);

  // --- scene state --------------------------------------------------------------------------
  // --- city ---------------------------------------------------------------------------------
  function pickCity() {
    let key = cfg.city;
    if (!key) { try { key = localStorage.getItem('pixelscapes.city'); } catch (e) { /* ignore */ } }
    if (key === 'rotate') key = PS.cityList[Math.floor(Date.now() / 864e5) % PS.cityList.length].key;
    return PS.cities[key] ? key : 'nyc';
  }
  const cityKey = pickCity();
  const city = PS.cities[cityKey](1337);
  city.key = city.key || cityKey;
  const EVENTS = PS.EVENTS.concat(city.events || []);
  // Switch city: remembered, applied by reloading (the scene is built once per page load).
  function switchCity(dir) {
    const list = PS.cityList, i = list.findIndex((c) => c.key === city.key);
    const next = list[(i + dir + list.length) % list.length].key;
    try { localStorage.setItem('pixelscapes.city', next); } catch (e) { /* ignore */ }
    const u = new URL(location.href);
    if (u.searchParams.has('city')) u.searchParams.set('city', next);
    location.href = u.toString();
  }
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
  let nextEvent = 2, nextAmbient = 6;
  const promenade = city.foreground && city.foreground.kind === 'beach' && PS.Beach ? new PS.Beach(city.foreground) : new PS.Promenade(city.foreground);
  const claimed = new Set();
  const claimedGrid = new Set();
  let toast = null;
  let lastRain = -1e9;
  let season = null, builtCover = -1, cloudOff = 0, lastSig = '';
  const weather = new PS.Weather({ preset: ['live', 'city', 'off'].includes(cfg.weather) ? null : cfg.weather, off: cfg.weather === 'off' });
  function refreshWeather() {
    const at = cfg.weather === 'city' ? { lat: city.lat, lon: city.lon } : loc;
    if (at) weather.refresh(at.lat, at.lon).then(() => { dirty = true; });
  }
  setInterval(refreshWeather, 15 * 60e3);

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
    const cover = weather.known ? weather.cur.cloud : r();
    builtCover = cover;
    const n = Math.round((1 + 6 * cover + 22 * cover ** 3) * (VW / 480));
    clouds = [];
    const span = VW + 300;
    for (let i = 0; i < n; i++) {
      const streak = r() < 0.25;
      const w = streak ? r.int(40, 110) : r.int(22, Math.round(70 + cover * 50));
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
      clouds.push({ w, h, mask, x: r() * span, y: Math.round(ys * (1 - cover * 0.35)), drift: r.range(0.6, 1.4), par: streak ? 0.03 : 0.06, canvas: document.createElement('canvas') });
    }
  }

  function renderClouds() {
    const lit = P.cl, body = P.cb, sh = P.cs;
    const rim = mix(lit, P.day > 0.5 ? [255, 255, 255] : mix(P.glow, [255, 255, 255], 0.3), 0.35 + 0.3 * P.golden);
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
        if (!up1 && (!side || b > 0.3)) col = rim;
        else if (!up1 || (!up2 && b > 0.4) || (!side && b > 0.5)) col = lit;
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
    const glowR = 36 + 90 * P.golden + 16 * P.day, glowS = P.sunHidden ? 0 : 0.12 + 0.62 * P.golden;
    const lp = 0.4 * P.stars; // city light pollution glow
    const mGlow = moon && moon.visible && !P.moonHidden ? 0.16 * P.stars * (0.3 + 0.7 * Math.sin(moon.phase * Math.PI)) : 0;
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
        if (lp > 0) {
          const k = (y - h * 0.55) / (h * 0.45);
          if (k > 0) { const qg = Math.floor(k * k * lp * 6 + b) / 6; if (qg > 0) c = mix(c, [120, 70, 110], qg); }
        }
        const i = (y * w + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    // sun disc
    if (sun.alt > -3 && !P.sunHidden) {
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
    if (moon && moon.visible && !P.moonHidden) {
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
    // steady stars are baked in; twinkling ones are drawn per frame
    if (P.stars > 0.01) {
      for (const st of stars) {
        if (st.tw || st.big) continue;
        if (moon && moon.visible && Math.abs(st.x - moon.x) < 9 && Math.abs(st.y - moon.y) < 9) continue;
        const a = st.b * P.stars * (1 - smooth(h * 0.5, h * 0.9, st.y));
        if (a < 0.05) continue;
        const i = (st.y * w + st.x) * 4;
        d[i] += (st.c[0] - d[i]) * a; d[i + 1] += (st.c[1] - d[i + 1]) * a; d[i + 2] += (st.c[2] - d[i + 2]) * a;
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
    // Some cities have their own weather habits (SF's summer-morning fog).
    weather.extraFog = city.fogMorning ? city.fogMorning * Math.max(0, 1 - Math.abs(hour - 8) / 3.5) * (1 - weather.cur.rain) : 0;
    weather.applyToPalette(P);
    season = PS.season(now, city.lat, city.holidays);
    PS.setMat('tree', season.foliage[0]); PS.setMat('tree2', season.foliage[1]); PS.setMat('tree3', season.foliage[2]);
    PS.setMat('grass', mix(hex('#4f7a45'), hex('#8a7a5a'), season.bare * 0.7));
    if (city.glow) city.glow(season, now);
  }

  function renderAll(now) {
    updateSun(now);
    if (weather.known && Math.abs(weather.cur.cloud - builtCover) > 0.12) makeClouds();
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
    get sil() { return P.sil; }, get moon() { return moonInfo.visible && !P.moonHidden ? moonInfo : { visible: false }; }, claimedGrid,
    weather: weather.cur, get season() { return season; },
    mx: (wx) => layerMx(main, S._om, wx),
    claim: (rf) => claimed.add(rf), release: (rf) => claimed.delete(rf),
    pickRoof(o) {
      const minW = (o && o.minW) || 6;
      const cands = [];
      for (const rf of main.B.roofs) {
        if (claimed.has(rf) || rf.w < minW) continue;
        const X = S.mx(rf.x) - S._om;
        if (X < VW * 0.12 || X + rf.w > VW - 6) continue;
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

  // Events that need decent weather / a clear sky, and holiday boosts.
  const OUTDOOR = new Set(['yoga', 'kite', 'pigeons', 'bbq', 'party', 'golfer', 'lanterns', 'hotAirBalloons', 'balloonRelease', 'windowWasher', 'bannerPlane', 'sail', 'fireworks', 'couple', 'guitar', 'selfie', 'stargazer', 'dancer', 'jumper', 'paradeBalloon']);
  const CLEARSKY = new Set(['stargazer', 'meteorShower', 'shootingStar', 'witch', 'santa']);
  function weatherOk(id) {
    const w = weather.cur;
    if (OUTDOOR.has(id) && (w.rain > 0.2 || w.snow > 0.5 || w.wind > 0.8)) return false;
    if (CLEARSKY.has(id) && w.cloud > 0.6) return false;
    if (id === 'rain' && weather.known) return false; // real weather owns precipitation
    return true;
  }
  function weightOf(e) {
    const h = season ? season.holidays : {};
    let w = e.w;
    if (city.eventWeights && city.eventWeights[e.id] != null) w *= city.eventWeights[e.id];
    if (h.carnaval && (e.id === 'party' || e.id === 'dancer' || e.id === 'fireworks')) w *= 4;
    if (h.saoJoao && (e.id === 'fireworks' || e.id === 'lanterns' || e.id === 'party')) w *= 4;
    if (h.fleetWeek && e.id === 'blueAngels') w *= 6;
    if (h.thanksgiving && e.id === 'paradeBalloon') w *= 8;
    if (h.halloween && (e.id === 'bats' || e.id === 'ghost' || e.id === 'witch')) w *= 5;
    if ((h.july4 || h.nye) && e.id === 'fireworks') w *= 6;
    if (h.valentine && (e.id === 'couple' || e.id === 'windowArt')) w *= 4;
    if (h.xmas && e.id === 'santa') w *= 3;
    if (weather.cur.snow > 0.2 && e.id === 'snowballs') w *= 3;
    return w;
  }
  function spawn(id) {
    const cands = id ? EVENTS.filter((e) => e.id === id) : EVENTS.filter((e) => (!e.ok || e.ok(S)) && weatherOk(e.id) && weightOf(e) > 0);
    if (!cands.length) return null;
    for (let attempt = 0; attempt < 6; attempt++) {
      let def;
      if (id) def = cands[0];
      else {
        const tot = cands.reduce((a, e) => a + weightOf(e), 0);
        let r = R() * tot;
        def = cands.find((e) => (r -= weightOf(e)) <= 0) || cands[0];
      }
      if (!id && events.some((e) => e.id === def.id) && def.id !== 'plane' && def.id !== 'birds') continue;
      if (!id && def.id === 'rain' && t - lastRain < 600) continue;
      if (def.id === 'rain') lastRain = t;
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
      if (!st.tw && !st.big) continue;
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
      let x = (c.x - cloudOff * c.drift - cam * c.par) % span;
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

  const FLAGS = {
    us: [['#c83a3a', '#f4f0e8', '#c83a3a'], '#2a4a9a'],
    ny: [['#2a4a9a', '#e8a030', '#2a4a9a'], null],
    pride: [['#e84040', '#f0c030', '#40a0e0'], null],
    red: [['#d83a3a', '#d83a3a', '#d83a3a'], null],
    br: [['#1f9a4a', '#f2d22a', '#1f9a4a'], '#2a4aa0'],
    de: [['#1a1a1a', '#d8302a', '#f2c22a'], null],
    eu: [['#2a4aa0', '#2a4aa0', '#2a4aa0'], '#f2d22a'],
    ca: [['#f4f0e8', '#f4f0e8', '#c8302a'], '#6a4a2a'],
    rio: [['#f4f0e8', '#2a5ac0', '#f4f0e8'], null],
    pb: [['#c8302a', '#c8302a', '#1a1a1a'], null],
  };
  function drawMainAmbient(om) {
    const night = P.dark > 0.4;
    const B = main.B;
    // steam vents
    const steam = mix(hex('#e8eaf0'), P.hor, 0.35);
    for (const v of B.vents) {
      const X = S.mx(v.x);
      if (X - om < -10 || X - om > VW + 10) continue;
      for (let i = 0; i < 6; i++) {
        const age = (t * 0.35 + i / 6 + v.ph) % 1;
        const a = (1 - age) * (0.5 + 0.2 * P.dark);
        const sz = age < 0.3 ? 1 : age < 0.7 ? 2 : 3;
        pM.rect(Math.round(X + age * (7 + weather.cur.wind * weather.cur.windDir * 10) + Math.sin(age * 6 + v.ph) * 1.2), Math.round(groundY + v.y - age * 13), sz, sz > 1 ? sz - 1 : 1, PS.cssA(steam, a));
      }
    }
    // flags
    for (const f of B.flags) {
      const X = S.mx(f.x);
      if (X - om < -6 || X - om > VW + 6) continue;
      const [stripes, canton] = FLAGS[f.kind];
      const lit = PS.add(P.amb, PS.scale(P.sun, 0.5));
      for (let i = 0; i < 5; i++) {
        const wy = Math.round(Math.sin(t * (3 + weather.cur.wind * 8) - i * 0.9 + f.ph) * (i / 4) * (0.5 + weather.cur.wind));
        for (let j = 0; j < 3; j++) {
          const c = canton && i < 2 && j < 2 ? canton : stripes[j];
          pM.rect(X + i, groundY + f.y + j + wy, 1, 1, css(PS.mul(hex(c), lit)));
        }
      }
    }
    // holiday string lights along rooftops
    const hol = season ? season.holidays : {};
    const strCols = hol.xmas ? ['#ff3a3a', '#3aff6a', '#ffd23a', '#4ab0ff'] : hol.halloween ? ['#ff8a1a', '#b060ff'] : hol.july4 ? ['#ff4a4a', '#ffffff', '#4a7cff'] : hol.pride ? ['#ff4a4a', '#ff9a2a', '#ffe04a', '#4aff7a', '#4ab0ff', '#b060ff'] : null;
    if (strCols && P.dark > 0.25) {
      for (const L of B.lightStrings) {
        if (PS.hash(L.x, 7) > (hol.xmas ? 0.6 : 0.3)) continue;
        const X = S.mx(L.x);
        if (X - om < -L.w || X - om > VW + 2) continue;
        for (let i = 0; i < L.w; i += 2) {
          const k = (i / 2 + Math.floor(t * 1.5 + L.ph)) % strCols.length;
          if (PS.hash(i + L.x, Math.floor(t * 2 + L.ph)) < 0.15) continue;
          pM.rect(X + i, groundY + L.y, 1, 1, strCols[k]);
        }
      }
    }
    // neon signs
    for (const n of B.signs) {
      const X = S.mx(n.x);
      if (X - om < -6 || X - om > VW + 6) continue;
      const on = P.dark > 0.2 && !(n.flick && PS.hash(Math.floor(t * 7), n.x) < 0.25);
      if (on) {
        ctx.globalAlpha = 0.3 * P.dark;
        pM.rect(X - 1, groundY + n.y - 1, n.w + 2, n.h + 2, n.c);
        ctx.globalAlpha = 1;
        pM.rect(X, groundY + n.y, n.w, n.h, n.c);
      } else pM.rect(X, groundY + n.y, n.w, n.h, css(PS.mul(hex(n.c), PS.scale(P.amb, 0.5))));
    }
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

  // The reflection samples the band just above the waterline once per frame (a single snapshot
  // into a small art-resolution buffer), then draws rippled rows from that buffer.
  const reflBuf = document.createElement('canvas'), reflCtx = reflBuf.getContext('2d');
  function drawReflection() {
    const wh = VH - horizon;
    const band = Math.min(wh, horizon);
    if (reflBuf.width !== VW || reflBuf.height !== band) { reflBuf.width = VW; reflBuf.height = band; }
    reflCtx.imageSmoothingEnabled = false;
    reflCtx.clearRect(0, 0, VW, band);
    reflCtx.drawImage(canvas, 0, (horizon - band) * s, VW * s, band * s, 0, 0, VW, band);
    ctx.fillStyle = css(P.wat);
    ctx.fillRect(0, horizon * s, SW, wh * s);
    // mirror the band once, then draw runs of rows that share a ripple offset in a single call
    if (!reflBuf.flip) { reflBuf.flip = document.createElement('canvas'); }
    const fl = reflBuf.flip;
    if (fl.width !== VW || fl.height !== band) { fl.width = VW; fl.height = band; }
    const fctx = fl.getContext('2d');
    fctx.setTransform(1, 0, 0, -1, 0, band);
    fctx.clearRect(0, 0, VW, band);
    fctx.drawImage(reflBuf, 0, 0);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    const offs = [];
    for (let r = 0; r < band; r++) {
      const amp = 0.4 + r * 0.07;
      offs.push(Math.round(Math.sin(r * 0.9 + t * 1.8 + Math.sin(r * 0.37 - t * 0.7) * 2) * amp));
    }
    for (let r = 0; r < band;) {
      let e = r + 1;
      while (e < band && offs[e] === offs[r]) e++;
      ctx.drawImage(fl, 0, r, VW, e - r, offs[r] * s, (horizon + r) * s, VW * s, (e - r) * s);
      r = e;
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
    const src = P.sunHidden ? null : sunInfo.alt > -2 ? { x: sunInfo.x, c: mix(P.sunDisc, [255, 255, 255], 0.4), a: 0.5 + 0.4 * P.golden } :
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
    const wx = weather.label(cfg.units === 'f');
    const str = `${city.name}  ${(hh % 12) || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}${wx ? '  ' + wx : ''}`;
    ctx.globalAlpha = a;
    pS.text(str, 7, 7, 'rgba(0,0,0,0.5)');
    pS.text(str, 6, 6, '#f4f0e6');
    ctx.globalAlpha = 1;
  }

  // --- music: Pixelscapes FM -----------------------------------------------------------------
  const musicState = { actx: null, engine: null, on: false, blocked: false, now: null, queue: [], lastAmb: 0 };
  const musicPref = () => { if (cfg.music === '0') return false; if (cfg.music) return true; try { return localStorage.getItem('pixelscapes.music') === '1'; } catch (e) { return false; } };
  const musicMood = () => ({ night: P.dark, rain: weather.cur.rain, snow: weather.cur.snow, season: season ? season.name : null });
  function musicOn() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!musicState.actx) {
      musicState.actx = new AC();
      musicState.engine = new PS.Lofi(musicState.actx, {
        words: city.musicWords,
        getMood: musicMood,
        volume: (() => { try { return +(localStorage.getItem('pixelscapes.volume') || 0.6); } catch (e) { return 0.6; } })(),
        // tracks are generated slightly ahead; queue them and switch the title when each one starts
        onTrack: (tr, at) => { musicState.queue.push({ title: tr.title, at: performance.now() + (at - musicState.actx.currentTime) * 1000 }); },
      });
    }
    musicState.on = true;
    musicState.actx.resume().then(() => { musicState.blocked = false; }).catch(() => {});
    musicState.engine.start();
    musicState.blocked = musicState.actx.state !== 'running';
    try { localStorage.setItem('pixelscapes.music', '1'); } catch (e) { /* ignore */ }
  }
  function musicOff() {
    musicState.on = false;
    if (musicState.actx) { musicState.engine.stop(); musicState.actx.suspend(); }
    try { localStorage.setItem('pixelscapes.music', '0'); } catch (e) { /* ignore */ }
  }
  function musicTick() {
    if (!musicState.on || !musicState.engine) return;
    if (musicState.blocked && musicState.actx.state === 'running') musicState.blocked = false;
    if (performance.now() - musicState.lastAmb > 1000) { musicState.lastAmb = performance.now(); musicState.engine.setAmbience(musicMood()); }
  }
  // Corner widget: [speaker] [equalizer] [song name] [skip]. Appears on mouse movement or when a
  // new song starts, then fades away so the wallpaper stays clean.
  const SPK_ON = ['..k....', '.kk..k.', 'kkk.k.k', 'kkk.k.k', 'kkk.k.k', '.kk..k.', '..k....'];
  const SPK_OFF = ['..k....', '.kk....', 'kkk.k.k', 'kkk..k.', 'kkk.k.k', '.kk....', '..k....'];
  const SKIP = ['k...k..k', 'kk..kk.k', 'kkk.kkkk', 'kk..kk.k', 'k...k..k'];
  const mouse = { x: -1, y: -1, moved: -1e9, over: null };
  const widget = { alpha: 0, rects: {}, volShown: -1e9, eq: [0, 0, 0, 0] };
  function currentTitle() {
    const q = musicState.queue, now = performance.now();
    while (q.length && q[0].at <= now) { musicState.now = q.shift(); musicState.now.shown = now; }
    return musicState.now;
  }
  function drawMusic(dt) {
    if (cfg.nowplaying === 'off') return;
    const now = performance.now();
    const np = musicState.on ? currentTitle() : null;
    const playing = musicState.on && !musicState.blocked;
    const hover = !!mouse.over;
    const wantVisible = cfg.nowplaying === 'always' || hover || now - mouse.moved < 3000 || now - widget.volShown < 2000 ||
      (musicState.on && musicState.blocked) || (playing && np && now - np.shown < 8000);
    widget.alpha += ((wantVisible ? 1 : 0) - widget.alpha) * Math.min(1, dt * (wantVisible ? 8 : 2.5));
    if (widget.alpha < 0.02) { widget.rects = {}; return; }

    let label;
    if (musicState.on && musicState.blocked) label = 'CLICK TO PLAY';
    else if (!musicState.on) label = 'PLAY LO-FI RADIO';
    else label = np ? np.title : 'TUNING IN...';
    const showVol = musicState.engine && now - widget.volShown < 2000;
    const textW = showVol ? 23 : PS.textWidth(label);
    const H = 11, pad = 3;
    const W = pad + 7 + 3 + (playing ? 10 : 0) + textW + 5 + (playing ? 8 : 0) + pad;
    const x0 = VW - W - 4, y0 = VH - H - 4;
    ctx.globalAlpha = widget.alpha;
    pS.rect(x0, y0, W, H, 'rgba(8,10,24,0.88)');
    pS.rect(x0, y0, W, 1, 'rgba(255,255,255,0.14)'); pS.rect(x0, y0 + H - 1, W, 1, 'rgba(0,0,0,0.35)');
    const hi = (name) => mouse.over === name;
    let x = x0 + pad;
    const iconCol = (name) => (hi(name) ? '#ffd57e' : '#e8e6f4');
    pS.sprite(musicState.on && !musicState.blocked ? SPK_ON : SPK_OFF, x, y0 + 2, { k: iconCol('toggle') });
    widget.rects.toggle = [x0, y0, (x + 7 + 3) - x0 + textW + (playing ? 10 : 0), H];
    x += 7 + 3;
    if (playing) {
      const lv = musicState.engine.levels(4);
      for (let i = 0; i < 4; i++) {
        widget.eq[i] += (lv[i] - widget.eq[i]) * 0.5;
        const h = 1 + Math.round(widget.eq[i] * 5);
        pS.rect(x + i * 2, y0 + 8 - h, 1, h, i % 2 ? '#8fd0ff' : '#ffd57e');
      }
      x += 10;
    }
    if (showVol) {
      const v = Math.round(musicState.engine.volume * 10);
      for (let i = 0; i < 10; i++) pS.rect(x + i * 2 + (i > 4 ? 1 : 0), y0 + 3, 1, 5, i < v ? '#ffd57e' : 'rgba(255,255,255,0.2)');
    } else {
      const blink = musicState.on && musicState.blocked && Math.floor(t * 1.5) % 2;
      pS.text(label, x, y0 + 3, blink ? 'rgba(244,240,230,0.45)' : hi('toggle') ? '#ffffff' : '#f4f0e6');
    }
    x += textW + 5;
    if (playing) {
      pS.sprite(SKIP, x, y0 + 3, { k: iconCol('next') });
      widget.rects.next = [x - 2, y0, 8 + 2 + pad, H];
    } else delete widget.rects.next;
    widget.rects.panel = [x0, y0, W, H];
    ctx.globalAlpha = 1;
  }
  const inRect = (r) => r && mouse.x >= r[0] && mouse.x < r[0] + r[2] && mouse.y >= r[1] && mouse.y < r[1] + r[3];
  function hitWidget() {
    if (widget.alpha < 0.3) return null;
    if (inRect(widget.rects.next)) return 'next';
    if (inRect(widget.rects.toggle)) return 'toggle';
    if (inRect(widget.rects.panel)) return 'panel';
    return null;
  }
  function setMouse(e) {
    const dpr = window.devicePixelRatio || 1;
    mouse.x = (e.clientX * dpr) / s; mouse.y = (e.clientY * dpr) / s;
    mouse.over = hitWidget();
    canvas.style.cursor = mouse.over === 'toggle' || mouse.over === 'next' ? 'pointer' : '';
  }
  canvas.addEventListener('pointermove', (e) => { mouse.moved = performance.now(); setMouse(e); });
  canvas.addEventListener('pointerleave', () => { mouse.over = null; mouse.x = mouse.y = -1; canvas.style.cursor = ''; });
  canvas.addEventListener('pointerdown', (e) => {
    mouse.moved = performance.now(); setMouse(e);
    if (mouse.over === 'toggle') { if (musicState.on && !musicState.blocked) musicOff(); else musicOn(); }
    else if (mouse.over === 'next' && musicState.on) musicState.engine.next();
  });
  canvas.addEventListener('wheel', (e) => {
    setMouse(e);
    if (!mouse.over || !musicState.engine) return;
    e.preventDefault();
    const v = Math.max(0, Math.min(1, musicState.engine.volume + (e.deltaY < 0 ? 0.05 : -0.05)));
    musicState.engine.setVolume(v);
    widget.volShown = performance.now();
    try { localStorage.setItem('pixelscapes.volume', String(v)); } catch (err) { /* ignore */ }
  }, { passive: false });
  const gesture = () => { if (musicState.on && musicState.blocked) musicOn(); };
  window.addEventListener('pointerdown', gesture);
  window.addEventListener('keydown', gesture, true);

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
      `WX ${weather.source} ${weather.label(false)} CLD ${weather.cur.cloud.toFixed(2)} RN ${weather.cur.rain.toFixed(2)} SN ${weather.cur.snow.toFixed(2)} FOG ${weather.cur.fog.toFixed(2)} COVER ${weather.cur.snowCover.toFixed(2)}`,
      `SEASON ${season ? season.name.toUpperCase() : ''} ${season ? Object.keys(season.holidays).filter((k) => season.holidays[k]).join(' ').toUpperCase() : ''}`,
      `EV ${events.map((e) => e.id).join(' ')}`,
    ];
    lines.forEach((l, i) => { pS.rect(3, 3 + i * 7, PS.textWidth(l) + 4, 7, 'rgba(0,0,0,0.5)'); pS.text(l, 5, 4 + i * 7, '#9fffb0'); });
  }

  // --- profiling (?profile): per-section CPU time --------------------------------------------
  const prof = { on: q.has('profile'), acc: {}, frames: 0, last: 0 };
  const mark = (name) => {
    if (!prof.on) return;
    const now = performance.now();
    if (prof.cur) prof.acc[prof.cur] = (prof.acc[prof.cur] || 0) + now - prof.last;
    prof.cur = name; prof.last = now;
  };

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

    prof.frames++; mark('renderAll');
    const now = simNow();
    // Repaint the (expensive) static layers only when what they depict has actually changed.
    let due = dirty;
    if (!due && performance.now() - lastRender > (cfg.speed > 20 ? 250 : 1000)) {
      const sun = PS.sunPos(now, loc.lat, loc.lon), w = weather.cur;
      const sig = [Math.round(sun.alt * 4), Math.floor((now.getHours() * 60 + now.getMinutes()) / 3),
        Math.round(w.cloud * 30), Math.round(w.rain * 30), Math.round(w.snow * 30), Math.round(w.fog * 30), Math.round(w.snowCover * 20), VW, VH].join();
      if (sig !== lastSig) { lastSig = sig; due = true; } else lastRender = performance.now();
    }
    if (due) {
      const t0 = performance.now();
      renderAll(now); lastRender = performance.now();
      if (prof.on) { const d = lastRender - t0; prof.renderMax = Math.max(prof.renderMax || 0, d); prof.renders = (prof.renders || 0) + 1; }
    }
    mark('simulate');

    // simulate
    for (const c of cars) {
      c.x += c.v * dt;
      if (c.x > c.lane.x1) c.x = c.lane.x0; if (c.x < c.lane.x0) c.x = c.lane.x1;
    }
    nextEvent -= dt * cfg.events;
    if (nextEvent <= 0) {
      if (events.filter((e) => !e.ambient).length < 6) spawn();
      nextEvent = R.range(3, 9);
    }
    // background life that doesn't count against the event budget
    nextAmbient -= dt * cfg.events;
    if (nextAmbient <= 0) {
      const pool = P.day > 0.4 ? ['plane', 'birds', 'birds', 'seagulls', 'tug', 'ferry'] : P.dark > 0.6 ? ['plane', 'plane', 'shootingStar', 'helicopter', 'ferry'] : ['plane', 'birds', 'ferry'];
      // respect per-city weights (e.g. no Staten Island ferry in João Pessoa)
      const ok = pool.filter((id) => !(city.eventWeights && city.eventWeights[id] === 0));
      const id = ok.length ? R.pick(ok) : null;
      const ev = !id || events.some((e) => e.id === id && id !== 'plane' && id !== 'birds') ? null : spawn(id);
      if (ev) ev.ambient = true;
      nextAmbient = R.range(8, 18);
    }
    promenade.update(dt, S, cam * promenade.par);
    weather.update(dt);
    cloudOff += dt * (0.3 + weather.cur.wind * 3) * weather.cur.windDir;
    if (season && P.dark > 0.6 && weather.cur.rain < 0.6) {
      const h = season.holidays, hr = hour;
      const show = (h.july4 && hr >= 21 && hr < 23.5) || (h.nye && (hr >= 23.9 || hr < 0.6)) || (h.saoJoao && hr >= 20 && hr < 23);
      if (show && !events.some((e) => e.id === 'fireworks')) spawn('fireworks');
    }
    for (const ev of events) if (!ev.dead) { try { if (!ev.update(dt, S)) ev.dead = true; } catch (e) { ev.dead = true; console.error(ev.id, e); } }
    for (let i = events.length - 1; i >= 0; i--) if (events[i].dead) { events[i].done && events[i].done(); events.splice(i, 1); }

    // draw
    ctx.imageSmoothingEnabled = false;
    mark('sky');
    ctx.drawImage(sky, 0, 0, VW, horizon, 0, 0, VW * s, horizon * s);
    mark('stars');
    drawStars();
    mark('clouds');
    drawClouds();
    mark('events');
    drawEvents('sky');
    mark('layers');
    const far = city.layers[0], mid = city.layers[1];
    const fo = blitLayer(far, cam * far.par); drawBlinkers(far, fo.om, fo.base, pM);
    const mo = blitLayer(mid, cam * mid.par); drawBlinkers(mid, mo.om, mo.base, pM);
    // 'back' events may live in main-layer coordinates: give them the main layer's offset
    S._om = ((cam % WM) + WM) % WM;
    pM.ox = -Math.round(S._om * s);
    drawEvents('back');
    const mm = blitLayer(main, cam);
    S._om = mm.om;
    drawBlinkers(main, mm.om, mm.base, pM);
    pM.ox = -mm.base;
    mark('ambient');
    drawMainAmbient(mm.om);
    // City-specific animated details (cable cars, trains, LED crowns...) in main-layer coordinates.
    if (city.ambient) { try { city.ambient(pM, S, dt); } catch (e) { console.error('city ambient', e); city.ambient = null; } }
    mark('events');
    drawEvents('main');
    drawEvents('front');
    mark('reflection');
    drawReflection();
    mark('water');
    drawWaterSparkle(mm.om);
    mark('events');
    drawEvents('water');
    mark('fog');
    weather.draw(pS, S, dt, 'fog');
    mark('promenade');
    promenade.draw(pM, S, cam * promenade.par);
    pM.ox = -mm.base;
    mark('events');
    drawEvents('top');
    mark('precip');
    weather.draw(pS, S, dt, 'precip');
    mark('hud');
    drawLabel();
    drawToast();
    musicTick();
    drawMusic(dt);
    drawDebug(fpsShown);
    mark(null);
  }

  // --- input --------------------------------------------------------------------------------
  let cycle = 0, wxCycle = 0;
  const help = document.getElementById('help');
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e') { const ev = spawn(); toast = { msg: ev ? ev.id.toUpperCase() : 'NOTHING HAPPENED', t: 2 }; }
    else if (k === 'n') {
      for (let i = 0; i < EVENTS.length; i++) {
        const def = EVENTS[cycle++ % EVENTS.length];
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
    else if (k === 'c') switchCity(e.shiftKey ? -1 : 1);
    else if (k === 'm') {
      if (musicState.on && !musicState.blocked) { musicOff(); toast = { msg: 'MUSIC OFF', t: 1.5 }; }
      else { musicOn(); toast = { msg: 'PIXELSCAPES FM', t: 1.5 }; }
    } else if (k === 't' && musicState.on) { musicState.engine.next(); toast = { msg: 'NEXT TRACK', t: 1.5 }; }
    else if ((k === '-' || k === '=' || k === '+') && musicState.engine) {
      const v = Math.max(0, Math.min(1, musicState.engine.volume + (k === '-' ? -0.1 : 0.1)));
      musicState.engine.setVolume(v);
      try { localStorage.setItem('pixelscapes.volume', String(v)); } catch (e) { /* ignore */ }
      widget.volShown = performance.now();
    } else if (k === 'w') {
      const names = ['live', 'clear', 'cloudy', 'overcast', 'fog', 'drizzle', 'rain', 'storm', 'snow', 'blizzard', 'windy'];
      wxCycle = (wxCycle + 1) % names.length;
      weather.setPreset(names[wxCycle]);
      if (names[wxCycle] === 'live') refreshWeather();
      toast = { msg: 'WEATHER: ' + names[wxCycle].toUpperCase(), t: 2 };
    }
    if (k === '[' || k === ']') { const n = simNow(); toast = { msg: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`, t: 1.5 }; }
  });
  canvas.addEventListener('dblclick', () => { if (!mouse.over) spawn(); });
  window.addEventListener('resize', () => { layout(); });

  layout();
  refreshWeather();
  renderAll(simNow());
  if (cfg.event) setTimeout(() => cfg.event.split(',').forEach((id) => spawn(id)), 300);
  requestAnimationFrame(frame);
  if (musicPref()) musicOn();
  window.pixelscapes = {
    music: musicState,
    get fps() { return fpsShown; },
    profile() { const out = {}; for (const k in prof.acc) out[k] = +(prof.acc[k] / prof.frames).toFixed(2); out.frames = prof.frames; out.renderMax = prof.renderMax; return out; }, spawn, S, cfg, setCam: (x) => { cam = x; }, render: () => { dirty = true; } };
})();
