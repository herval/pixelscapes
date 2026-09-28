'use strict';
// Rio de Janeiro, seen across Guanabara Bay from Niterói: granite domes rising out of a white city,
// Christ the Redeemer on Corcovado, the Sugarloaf with its cable car, favelas twinkling on the hills.
(function () {
  const PS = window.PS;
  const K = PS.kit;
  const { hex } = PS;

  const WM = 2400;      // main layer
  const WMID = 1200;    // mid layer: par 0.5 x 2400 -> stays in step with the main layer
  const WFAR = 1584;    // far layer: par 0.22 x 2400 x 3

  // Rio: white / cream / pastel concrete with balconies, no brick walk-ups or water towers.
  const RIO = {
    glassChance: 0.3,
    glass: ['glass', 'glass2', 'glassG', 'glass', 'glassD'],
    front: ['white', 'cream', 'white', 'pastelY', 'pastelB', 'pastelP', 'pastelG', 'pastelO', 'conc', 'lime', 'white', 'cream', '#e8d6c0', '#d9e2e4'],
    back: ['white', 'cream', 'conc', 'lime', 'white', 'pastelY', 'pastelB', 'conc2', '#e8d6c0', 'white', '#d9e2e4'],
    setbacks: 0.2,
    fireEscapes: 0,
    signs: 0.08,
    signColors: ['#ff3a7a', '#3af0ff', '#ffd23a', '#5aff8a'],
    shopGlow: 0.65,
    waterTowers: [0, 0],
    crowns: false,
    flags: ['br', 'br', 'rio', 'br'],
    balconies: 0.7,
    distantMats: [['white', 'cream', 'conc', 'lime'], ['white', 'cream', 'conc', 'lime', 'pastelY', 'conc2', 'white', '#e8d6c0']],
    distantWaterTowers: 0,
  };
  const CENTRO = Object.assign({}, RIO, { glassChance: 0.65, balconies: 0.15, setbacks: 0.4, front: ['white', 'conc', 'cream', 'conc2', 'lime', 'white'], back: ['conc', 'white', 'conc2', 'lime', 'cream', 'stone'] });

  const FAV_MATS = ['terra', 'terra', '#b8704e', 'brick3', '#c98b6b', 'cream', 'white', 'pastelY', 'pastelB', 'pastelP', 'pastelG', 'pastelO', 'conc', '#d8c8a8', 'terra', '#e0a878'];

  // ---------------------------------------------------------------------------------------------
  // Shape helpers

  // Smooth curve through [[x,h],...] (cubic Hermite, Catmull-Rom tangents).
  function spline(pts) {
    const n = pts.length;
    const m = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      return (b[1] - a[1]) / ((b[0] - a[0]) || 1);
    });
    return (x) => {
      if (x <= pts[0][0]) return pts[0][1];
      if (x >= pts[n - 1][0]) return pts[n - 1][1];
      let i = 1;
      while (pts[i][0] < x) i++;
      const [x0, h0] = pts[i - 1], [x1, h1] = pts[i];
      const d = x1 - x0, t = (x - x0) / d, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * h0 + (t3 - 2 * t2 + t) * d * m[i - 1] + (-2 * t3 + 3 * t2) * h1 + (t3 - t2) * d * m[i];
    };
  }
  // Same, seamless across a layer's wrap (first and last points should share a height).
  function wrapSpline(pts, W) {
    const n = pts.length;
    const ext = [[pts[n - 2][0] - W, pts[n - 2][1]]].concat(pts, [[pts[1][0] + W, pts[1][1]]]);
    const f = spline(ext);
    return (x) => f(((x % W) + W) % W);
  }
  // Granite dome: superellipse bump with separate left/right half-widths.
  const dome = (cx, H, hwL, hwR, p, q) => (x) => {
    const a = Math.abs((x - cx) / (x < cx ? hwL : hwR));
    return a >= 1 ? 0 : H * Math.pow(1 - Math.pow(a, p), q);
  };
  const hash = PS.hash;
  const DITHER = [0.06, 0.56, 0.31, 0.81, 0.18, 0.68, 0.43, 0.93];
  // 1D value noise in [0,1), smooth over `sc` pixels
  const vnoise = (x, sc, seed) => {
    const f = x / sc, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
    return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
  };

  // ---------------------------------------------------------------------------------------------
  // Terrain: forest-clad hills and bare granite faces, drawn column by column with merged runs.
  //   o.rockAt(x, depth, h, slope, y) -> true where the column shows bare rock
  //   o.bottom: lowest row to fill (5 reaches the waterline), o.spots: canopy texture density
  function massif(B, x0, x1, prof, o) {
    o = o || {};
    const veg = o.veg || ['tree', 'tree2', 'tree3'];
    const rock = o.rock || '#a0978c', rockD = o.rockD || '#7d756d', rockL = o.rockL || '#b9b0a4';
    const bottom = o.bottom || 0;
    const spots = o.spots != null ? o.spots : 0.45;
    const rockSlope = o.rockSlope || 1.5;
    const shLo = o.shLo != null ? o.shLo : 0.3, shHi = o.shHi || 0.9, shMax = o.shMax || 1;
    const rockAt = o.rockAt || ((x, d, h, sl) => Math.abs(sl) > rockSlope && d < h * 0.85 && hash(x, d >> 2) < 0.9);
    let rx = x0, rTop = 0;
    for (let x = x0; x < x1; x++) {
      const h = Math.round(prof(x));
      if (h > rTop) rTop = h;
      if (x - rx === 7 || x === x1 - 1) { if (rTop > 0) B.rects.push({ x: rx, y: -rTop, w: x - rx + 1, h: rTop }); rx = x + 1; rTop = 0; }
      if (h <= 0 || -h >= bottom) continue;
      const sl = (prof(x + 1) - prof(x - 1)) / 2;
      const nextH = x + 1 < x1 ? Math.round(prof(x + 1)) : 0;
      // slope shading: faces turn toward / away from the sun, with an ordered-dither transition
      const side = sl > 0 ? 'sideL' : 'sideR';
      const shade = Math.max(0, Math.min(1, (Math.abs(sl) - shLo) / (shHi - shLo))) * shMax;
      // classify 2px cells: rock?, lit kind
      const cells = [], kinds = [];
      for (let y = -h; y < bottom; y += 2) {
        cells.push(rockAt(x, y + h, h, sl, y));
        kinds.push(shade <= 0 ? 'front' : PS.bayer(x, (y >> 1) + 64) < shade ? side : 'front');
      }
      // base runs
      let start = 0;
      for (let i = 1; i <= cells.length; i++) {
        if (i === cells.length || cells[i] !== cells[start] || kinds[i] !== kinds[start]) {
          const ya = -h + start * 2, yb = Math.min(bottom, -h + i * 2);
          B.f(x, ya, 1, yb - ya, cells[start] ? rock : veg[0], kinds[start]);
          start = i;
        }
      }
      // texture: canopy blobs on forest, streaks and highlights on rock
      for (let i = 1; i < cells.length; i++) {
        const y = -h + i * 2;
        const hh = Math.min(2, bottom - y);
        const k = kinds[i];
        if (cells[i]) {
          const streak = hash(x, 11) < (o.streaks || 0.16) && hash(x, (y >> 3) + 50) < 0.6;
          if (streak) B.f(x, y, 1, hh, rockD, k);
          else if (hash(x >> 1, y >> 1) < (o.rockSpots != null ? o.rockSpots : 0.16)) B.f(x, y, 1, hh, rockL, k);
        } else if (!(x & 1)) {
          // 2x2 canopy blobs, one op for this column and the next
          const n = hash((x >> 1) + 7, (y >> 1));
          if (n < spots) B.f(x, y, -y >= nextH ? 1 : 2, n < spots * 0.45 ? 1 : hh, n < spots * 0.5 ? veg[1] : veg[2], k);
        }
      }
      const k = kinds[0];
      // crest: rim light and a bumpy tree line on forest tops
      if (cells[0]) B.f(x, -h, 1, 1, rockL, Math.abs(sl) < 1 ? 'rim' : k);
      else {
        B.f(x, -h, 1, 1, veg[1], 'front');
        if (!o.smooth && hash(x, 9) < 0.4) B.f(x, -h - 1, 1, 1, veg[hash(x, 3) < 0.5 ? 1 : 0], 'front');
      }
    }
  }

  // Favela: small brick & pastel houses stacked up a hillside, lower rows in front. Windows twinkle
  // warm at night; blue water tanks on the slab roofs.
  //   o.cap(x): rows below the crest left to forest; o.bottom: lowest base row; o.dens
  function favela(B, x0, x1, prof, o) {
    o = o || {};
    const r = B.rng;
    const mats = o.mats || FAV_MATS;
    const bottom = o.bottom != null ? o.bottom : 0;
    const houses = [];
    for (let x = x0; x < x1; x += r.int(2, 4)) {
      const surf = prof(x);
      if (surf < 5) continue;
      const edge = Math.min(1, (x - x0) / 14, (x1 - x) / 14);
      const top = -surf + (o.cap ? o.cap(x) : 2);
      for (let y = Math.round(top) + r.int(1, 3); y <= bottom; y += r.int(2, 3)) {
        const dens = (o.dens || 0.9) * edge * Math.min(1, (y - top) / 10 + 0.35);
        if (r() > dens) continue;
        const w = r.int(3, 6), h = r.int(2, 4);
        const s2 = Math.min(prof(x), prof(x + w - 1));
        if (y - h < -s2 - 1) continue;
        houses.push({ x, y, w, h, m: r.pick(mats) });
      }
    }
    houses.sort((a, b) => a.y - b.y);
    for (const q of houses) {
      const { x, y, w, h, m } = q;
      const top = y - h;
      B.f(x, top, w - 1, h, m, 'front');
      B.f(x + w - 1, top, 1, h, m, 'sideR');
      B.f(x, top, w, 1, r() < 0.4 ? 'conc2' : m, 'rim');
      if (r() < 0.22) B.f(x + r.int(0, w - 2), top - 1, 2, 1, '#3a78c8', 'front');   // caixa d'água
      else if (r() < 0.12) B.f(x + 1, top - 2, 1, 2, 'dark', 'flat', { a: 0.6 });  // rebar / antenna
      if (h >= 2) {
        const wy = top + (h >= 3 ? 1 : 0);
        for (let wx = x + 1; wx < x + w - 1; wx += 2) {
          if (r() < 0.25) continue;
          B.win(wx, wy, 1, 1, m, { th: r() * 0.8, lc: r() < 0.25 ? hex(r.pick(['#e8f4ff', '#d8ffe0', '#fff8e8'])) : undefined });
        }
      }
      if (r() < 0.035) B.emit(x + (w >> 1), top - 1, 1, 1, 'dark', '#ffb45a', 'flat');  // street light on the alley
    }
    return houses.length;
  }

  // ---------------------------------------------------------------------------------------------
  // Landmarks

  // Christ the Redeemer. `cx` is the statue's axis, `base` the summit row. All white stone, floodlit
  // (glowKey 'christ'). Returns the pixel cells (for the night projection show) and the head position.
  const CHRIST = [
    '.......HH.......',
    '.......HH.......',
    'AAAAAAAAAAAAAAAa',
    '.aaaaaaBBbaaaaa.',
    '......BBBb......',
    '......BBBb......',
    '......BBBb......',
    '......BBBb......',
    '.....BBBBbb.....',
    '.....BBBBbb.....',
    '.....BBBBbb.....',
    '.....BBBBbb.....',
    '.....BBBBbb.....',
    '....PPPPPPpp....',
    '....PPPPPPpp....',
    '....PPPPPPpp....',
  ];
  function christ(B, cx, base) {
    const g = { glowKey: 'christ' };
    const kinds = { H: 'front', A: 'rim', a: 'front', B: 'front', b: 'sideR', P: 'front', p: 'sideR' };
    const mats = { H: 'white', A: 'white', a: 'white', B: 'white', b: 'white', P: '#d6d2c8', p: '#d6d2c8' };
    const H = CHRIST.length, x0 = cx - 8, cells = [];
    for (let j = 0; j < H; j++) {
      const row = CHRIST[j], y = base - H + j;
      let i = 0;
      while (i < row.length) {
        const ch = row[i];
        if (ch === '.') { i++; continue; }
        let k = i + 1;
        while (k < row.length && row[k] === ch) k++;
        B.f(x0 + i, y, k - i, 1, mats[ch], kinds[ch], g);
        for (let q = i; q < k; q++) cells.push([x0 + q, y, ch]);
        i = k;
      }
    }
    // viewing terrace under the statue
    B.f(cx - 9, base, 18, 1, 'conc', 'rim');
    B.f(cx - 8, base + 1, 16, 1, 'conc2', 'front');
    B.emit(cx - 9, base, 1, 1, 'conc', '#ffe0a0', 'rim');
    B.emit(cx + 8, base, 1, 1, 'conc', '#ffe0a0', 'rim');
    B.blink(cx + 6, base - H - 1, { period: 2.6 });
    return { x: cx, top: base - H, base, cells, headY: base - H };
  }

  // Sugarloaf + Morro da Urca at the bay entrance, down to the waterline, with the bondinho cables.
  function sugarloaf(B) {
    const urca = dome(118, 50, 74, 82, 1.9, 0.62);
    const sug = dome(262, 106, 44, 34, 1.7, 0.62);
    const skirtS = (x) => 24 * Math.exp(-(((x - 256) / 52) ** 2));
    const saddle = (x) => (x > 150 && x < 240 ? 14 + 4 * Math.sin((x - 150) / 90 * Math.PI) : 0);
    const shore = (x) => (x >= 42 && x < 338 ? 3 : 0);
    const prof = (x) => Math.max(urca(x), sug(x), skirtS(x), saddle(x), shore(x));
    // Urca: forest with bare rock faces toward the sea
    massif(B, 40, 196, prof, {
      bottom: 5,
      rockAt: (x, d, h, sl, y) => {
        if (y > 1) return true;
        return Math.abs(sl) > 1.2 && d < h * 0.7;
      },
    });
    // Sugarloaf: bare granite with a forested cap and talus skirt
    massif(B, 196, 340, prof, {
      bottom: 5, smooth: true, shMax: 0.75, shLo: 1.1, shHi: 3.2, streaks: 0.22, rockSpots: 0.05, rock: '#b3aba0', rockL: '#c8c0b4', rockD: '#8e867c',
      rockAt: (x, d, h, sl, y) => {
        if (y > 1) return true;
        if (-y <= skirtS(x) + 1 + hash(x, 5) * 3) return false;  // forested talus
        if (Math.abs(x - 258) < 12 && d < 4) return false;         // green cap
        if (x < 236 && d < 7 && hash(x >> 1, y >> 2) < 0.5) return false; // shrubs on the shoulder
        return true;
      },
    });
    // Praia Vermelha beach + seawall between Leme and Urca
    B.f(20, 0, 26, 5, 'sand', 'front');
    B.f(20, 0, 26, 1, 'sand', 'rim');
    B.f(336, 1, 14, 4, 'sand', 'front');
    B.f(336, 1, 14, 1, 'sand', 'rim');
    // rocks at the waterline
    for (let x = 42; x < 340; x += 2) if (hash(x, 44) < 0.5) B.f(x, 3 + (hash(x, 45) < 0.5 ? 1 : 0), 2, 2 - (hash(x, 45) < 0.5 ? 1 : 0), '#5f5850', 'front');

    // Urca: a few low houses along the bay at the foot of the hills
    for (let x = 176; x < 222;) {
      const w = B.rng.int(5, 8), h = B.rng.int(5, 9);
      const m = B.rng.pick(['white', 'cream', 'pastelY', 'terra', 'pastelB']);
      B.box(x, -h + 1, w, h, m, { side: 1, win: { ww: 1, wh: 1, px: 2, py: 2, my: 2, mb: 1 } });
      B.f(x, -h + 1, w, 1, B.rng() < 0.5 ? 'red' : 'conc2', 'rim');
      x += w + B.rng.int(0, 2);
    }
    // cable-car stations
    const stat = (x, y, w, h) => {
      B.box(x, y - h, w, h, 'white', { side: 1, noEdge: true });
      B.f(x, y - h, w, 1, 'conc2', 'rim');
      for (let i = 1; i < w - 1; i += 2) B.emit(x + i, y - h + 2, 1, 1, 'glass2', '#ffe2a0', 'front');
    };
    const uTop = -Math.round(prof(122)), sTop = -Math.round(prof(262));
    stat(28, 0, 9, 6);                 // Praia Vermelha
    stat(118, uTop + 1, 10, 5);        // Morro da Urca
    stat(258, sTop + 1, 9, 5);         // Pão de Açúcar
    B.blink(262, sTop - 5, { period: 2.2 });
    const c1 = K.cable(B, 36, -6, 118, uTop - 3, 5, 'dark', { a: 0.75 });
    const c2 = K.cable(B, 127, uTop - 3, 258, sTop - 3, 10, 'dark', { a: 0.75 });
    // second cable of each pair, one pixel below, fainter
    for (const pts of [c1, c2]) for (const [x, y] of pts) B.f(x, y + 1, 1, 1, 'dark', 'flat', { a: 0.25 });
    return { cables: [c1, c2], top: sTop, x: 262 };
  }

  function petrobras(B, cx) {
    const w = 32, h = 88, x = cx - 16, m = '#8f8a82';
    B.box(x, -h, w, h, m, { win: { office: true, py: 2, mx: 2, my: 3, mb: 3 }, side: 4 });
    for (let yy = -h + 4; yy < -4; yy += 2) B.f(x + 1, yy + 1, w - 5, 1, m, 'front', { a: 0.5 });
    const r = B.rng;
    for (const [vy, vx, vw] of [[-74, 3, 11], [-55, 15, 12], [-34, 5, 12], [-17, 16, 10]]) {
      B.f(x + vx, vy, vw, 6, 'dark', 'dark', { a: 0.9 });
      for (let i = 0; i < vw; i += 2) B.f(x + vx + i, vy + 3 + (i % 4 ? 0 : 1), 2, 3 - (i % 4 ? 0 : 1), r.pick(['tree', 'tree2', 'tree3']), 'front');
      B.f(x + vx, vy, 1, 6, m, 'sideR');
    }
    B.box(x + 8, -h - 3, 14, 3, 'conc2', { side: 1 });
    B.antenna(x + 26, -h, 9);
  }

  // Metropolitan Cathedral: a truncated cone with four stained-glass ribbons from base to crown.
  function cathedral(B, cx) {
    const H = 46, wb = 40, wt = 18, m = '#a8a194';
    for (let r = 0; r < H; r++) {
      const f = r / (H - 1);
      const w = Math.round(wb + (wt - wb) * f);
      const y = -1 - r, x = cx - (w >> 1);
      const sd = Math.round(w * 0.3);
      B.f(x, y, w - sd, 1, m, 'front');
      B.f(x + w - sd, y, sd, 1, m, 'sideR');
      if (r % 3 === 0) B.f(x, y, w, 1, m, 'dark', { a: 0.28 });
      else for (let i = x + 2 + (r % 2); i < x + w - 2; i += 3) B.f(i, y, 1, 1, m, 'dark', { a: 0.22 });
      // stained glass: centre ribbon + two on the curving flanks
      const cols = ['#4ab4ff', '#58e08a', '#ffd23a', '#ff5a4a'];
      B.emit(cx - 1, y, 2, 1, 'glassD', cols[Math.floor(f * 3.99)], 'front');
      B.emit(x + 2, y, 1, 1, 'glassD', cols[(Math.floor(f * 3.99) + 1) % 4], 'sideL');
      B.emit(x + w - 3, y, 1, 1, 'glassD', cols[(Math.floor(f * 3.99) + 3) % 4], 'sideR');
    }
    B.f(cx - (wt >> 1), -H - 1, wt, 1, m, 'rim');
    B.f(cx - 5, -H - 2, 10, 1, 'glassD', 'front');
    B.f(cx, -H - 8, 1, 6, 'steel', 'rim');
    B.f(cx - 2, -H - 6, 5, 1, 'steel', 'rim');
    B.rects.push({ x: cx - (wb >> 1), y: -H, w: wb, h: H });
  }

  // Outeiro da Glória: little white baroque church on its knoll.
  function gloria(B, cx, base) {
    const g = { glow: '#ffe2b0' };
    B.f(cx - 6, base - 6, 11, 6, 'white', 'front', g);
    B.f(cx + 5, base - 6, 2, 6, 'white', 'sideR', g);
    B.f(cx - 7, base - 7, 14, 1, '#6a8ab0', 'rim');      // azulejo-blue roof edge
    B.f(cx - 5, base - 8, 11, 1, 'roof', 'rim');
    B.f(cx - 3, base - 14, 4, 8, 'white', 'front', g);   // bell tower
    B.f(cx + 1, base - 14, 1, 8, 'white', 'sideR', g);
    B.f(cx - 3, base - 15, 5, 1, 'white', 'rim', g);
    B.f(cx - 2, base - 17, 3, 2, '#6a8ab0', 'front');
    B.f(cx - 1, base - 19, 1, 2, 'gold', 'rim');
    B.emit(cx - 2, base - 12, 1, 2, 'dark', '#ffd27a', 'flat');
    for (let i = cx - 4; i < cx + 4; i += 3) B.emit(i, base - 4, 1, 2, 'dark', '#ffd27a', 'flat');
    B.rects.push({ x: cx - 7, y: base - 14, w: 14, h: 14 - base });
  }

  // Museu do Amanhã: long white hall under a cantilevered, finned roof that tapers to points.
  function museu(B, x0) {
    const L = 76;
    B.f(x0 - 6, -1, L + 12, 1, 'conc', 'rim');
    B.f(x0 + 2, -2, L - 4, 1, '#5a8ab0', 'front');                 // reflecting pools
    B.glass(x0 + 14, -9, L - 28, 7, 'glassD', 'front');
    for (let i = x0 + 16; i < x0 + L - 16; i += 3) B.emit(i, -6, 2, 3, 'glassD', '#cfeaff', 'front');
    for (let i = 0; i <= L; i++) {
      const u = Math.abs(i / L - 0.5) * 2;
      const lift = Math.round(u * u * u * 9);
      const y = -10 - lift;
      // the long white roof, thick in the middle and tapering to two raised points
      const th = u < 0.55 ? 3 : u < 0.85 ? 2 : 1;
      B.f(x0 + i, y, 1, 1, 'white', 'rim');
      if (th > 1) B.f(x0 + i, y + 1, 1, th - 1, 'white', 'sideR');
      // solar fins along the spine
      if (i % 3 === 0 && u < 0.7) {
        const fh = Math.round(4 - u * 4);
        if (fh > 0) B.f(x0 + i, y - fh, 2, fh, 'white', 'front');
      }
    }
    for (const sx of [x0 + 14, x0 + L - 15]) B.f(sx, -9, 1, 8, 'white', 'sideR');
    B.rects.push({ x: x0, y: -16, w: L, h: 16 });
  }

  // Yup Star wheel at the port: static frame, gondolas animated in ambient().
  function wheel(B, cx, R) {
    const hy = -(R + 5);
    B.line(cx, hy, cx - 7, 0, 'steel', 'flat');
    B.line(cx, hy, cx + 7, 0, 'steel', 'sideR');
    B.f(cx - 9, -1, 19, 1, 'conc', 'rim');
    const leds = ['#ff4ab0', '#4ab0ff', '#ffd23a', '#58e08a'];
    let n = 0;
    for (let a = 0; a < Math.PI * 2; a += 1 / R) {
      const x = Math.round(cx + Math.cos(a) * R), y = Math.round(hy + Math.sin(a) * R);
      if (n++ % 3 === 0) B.emit(x, y, 1, 1, 'steel', leds[(n / 3 | 0) % 4], 'rim');
      else B.f(x, y, 1, 1, 'steel', 'rim');
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      B.line(cx, hy, Math.round(cx + Math.cos(a) * (R - 1)), Math.round(hy + Math.sin(a) * (R - 1)), 'steel', 'flat', { a: 0.4 });
    }
    B.f(cx - 1, hy - 1, 3, 3, 'steel', 'front');
    return { x: cx, y: hy, R };
  }

  // Aterro do Flamengo: big round park trees and tall imperial palms.
  function parkTree(B, x, h) {
    const w = h + 2;
    const m = B.rng.pick(['tree', 'tree2', 'tree3']);
    B.f(x + (w >> 1), -2, 1, 2, 'wood', 'flat');
    for (let j = 0; j < h; j++) {
      const k = Math.sin(((j + 0.5) / h) * Math.PI);
      const hw = Math.max(1, Math.round((w / 2) * Math.sqrt(k)));
      B.f(x + (w >> 1) - hw, -2 - h + j, hw * 2, 1, m, j === 0 ? 'rim' : j < h / 2 ? 'front' : 'sideR');
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Events

  const HANG = [
    '....ab....',
    '..aaabbb..',
    'aaaa..bbbb',
    '....kk....',
    '....kk....',
    '...kkkk...',
  ];
  const PARA = [
    '..aabbaabb..',
    '.bb......aa.',
    'a..l....l..b',
    '...l....l...',
    '....l..l....',
    '.....kk.....',
    '.....kk.....',
  ];

  function hangGliders(S) {
    const R = PS.R;
    const n = R.int(2, 4);
    const dir = R() < 0.5 ? 1 : -1;
    const cols = [['#ff5a4a', '#ffd23a'], ['#3ab0ff', '#ffffff'], ['#b05aff', '#ff7ab8'], ['#3ac070', '#ffe04a'], ['#ff8a2a', '#2a6ae0'], ['#ffffff', '#ff4a6a']];
    const fl = Array.from({ length: n }, (_, i) => ({
      kind: R() < 0.55 ? 'hang' : 'para',
      x: ((i + R.range(0.1, 0.8)) / n) * S.VW,
      y: R.range(S.horizon * 0.12, S.horizon * 0.38),
      vx: dir * R.range(3.5, 6.5), vy: R.range(0.4, 1.0),
      c: R.pick(cols), ph: R() * 6, r: R.range(5, 12), w: R.range(0.25, 0.5) * (R() < 0.5 ? 1 : -1),
    }));
    const ev = { z: 'back', space: 'screen', t: 0 };
    const pos = (f) => [f.x + Math.cos(ev.t * f.w + f.ph) * f.r, f.y + Math.sin(ev.t * f.w + f.ph) * f.r * 0.35];
    ev.update = (dt) => {
      ev.t += dt;
      for (const f of fl) { f.x += f.vx * dt; f.y += f.vy * dt; }
      return ev.t < 160 && fl.some((f) => (dir > 0 ? f.x < S.VW + 30 : f.x > -30) && f.y < S.horizon - 20);
    };
    ev.draw = (p) => {
      const P = S.P;
      const light = [Math.min(1.1, P.amb[0] + P.sun[0] * 0.6), Math.min(1.1, P.amb[1] + P.sun[1] * 0.6), Math.min(1.1, P.amb[2] + P.sun[2] * 0.6)];
      for (const f of fl) {
        const [x, y] = pos(f);
        const vx = f.vx - Math.sin(ev.t * f.w + f.ph) * f.r * f.w;
        const c0 = PS.css(PS.mul(hex(f.c[0]), light)), c1 = PS.css(PS.mul(hex(f.c[1]), light));
        const map = { a: c0, b: c1, k: S.sil, l: PS.cssA(hex('#303040'), 0.45) };
        p.sprite(f.kind === 'hang' ? HANG : PARA, x, y, map, vx < 0);
      }
    };
    return ev;
  }

  // ---------------------------------------------------------------------------------------------

  PS.registerCity('rio', 'Rio de Janeiro', function (seed) {
    const layers = [];
    const lm = {};

    // ---- Far layer: Tijuca massif, Pedra da Gávea, Dois Irmãos (hazy blue-green) -------------
    {
      const W = WFAR, B = new PS.Builder(W, PS.rng(seed + 11));
      const ridge = wrapSpline([
        [0, 72], [70, 88], [140, 70], [210, 96], [260, 112], [300, 110], [330, 84], [390, 74], [430, 98], [455, 104], [470, 92], [490, 100], [510, 84], [560, 64],
        [640, 78], [720, 92], [800, 118], [860, 104], [920, 110], [990, 84], [1060, 70], [1130, 90], [1200, 100], [1260, 82], [1330, 66], [1420, 86], [1500, 74], [1584, 72],
      ], W);
      // Pedra da Gávea: a flat-topped granite block
      const gavea = dome(282, 110, 28, 24, 2.6, 0.45);
      const prof = (x) => Math.max(ridge(x), gavea(x));
      massif(B, 0, W, prof, {
        spots: 0.3, bottom: -34,   // the mid layer always hides the far range's feet
        shMax: 0.7,
        rockAt: (x, d, h, sl) => Math.abs(sl) > 1.1 && d < h * 0.5 && d > 2,
      });
      layers.push({ name: 'far', par: 0.22, W, haze: 0.56, B, fogK: 0.36 });
    }

    // ---- Mid layer: Corcovado with Christ the Redeemer, Tijuca forest, Zona Sul below ----------
    {
      const W = WMID, B = new PS.Builder(W, PS.rng(seed + 22));
      const r = B.rng;
      const CX = 600;
      const ridge = wrapSpline([
        [0, 46], [70, 58], [130, 44], [200, 66], [260, 52], [330, 70], [400, 62], [460, 80], [520, 92], [556, 104], [584, 116], [594, 121],
        [606, 121], [614, 112], [624, 88], [634, 66], [650, 52], [690, 44], [760, 40], [830, 56], [890, 74], [940, 64], [1000, 50], [1070, 62], [1140, 50], [1200, 46],
      ], W);
      massif(B, 0, W, ridge, {
        spots: 0.4, shMax: 0.85,
        rockAt: (x, d, h, sl) => (x > 604 && x < 640 && d < h * 0.75 && d > 1) || (Math.abs(sl) > 1.6 && d < h * 0.6),
      });
      // favelas on the lower slopes (Rocinha-ish, Santa Marta-ish)
      favela(B, 150, 290, ridge, { cap: (x) => 12 + 8 * hash(x >> 3, 2), dens: 0.8, bottom: -2 });
      favela(B, 820, 930, ridge, { cap: (x) => 16 + 6 * hash(x >> 3, 3), dens: 0.75, bottom: -2 });
      // Christ the Redeemer on the summit
      B.hz = -0.22;
      lm.christ = christ(B, CX, -121);
      B.hz = 0;
      // the city at the mountains' feet
      B.hz = 0.06;
      for (let x = 0; x < W;) {
        const w = r.int(5, 12);
        const env = 12 + 16 * K.gauss(x, 700, 120, W) + 10 * K.gauss(x, 330, 90, W);
        if (!(x > 150 && x < 290 && r() < 0.6) && !(x > 820 && x < 930 && r() < 0.6)) K.distant(B, x, w, Math.max(5, Math.round(env * r.range(0.4, 1.1))), false, RIO);
        x += w + r.int(-1, 2);
      }
      B.hz = 0;
      layers.push({ name: 'mid', par: 0.5, W, haze: 0.3, B, groundGlow: 22, fogK: 0.4 });
    }

    // ---- Main layer ----------------------------------------------------------------------------
    const B = new PS.Builder(WM, PS.rng(seed));
    const r = B.rng;
    const zoneS = [0, 345];            // Sugarloaf & Urca: no buildings
    const inS = (x) => x < zoneS[1] || x >= 2392;

    // Hills behind the city, each with its favela
    B.hz = 0.1;
    const donaMarta = dome(560, 82, 120, 100, 1.6, 0.9);
    massif(B, 440, 662, donaMarta, {});
    favela(B, 560, 655, donaMarta, { cap: (x) => 10 + 10 * hash(x >> 3, 5), dens: 0.95 });
    const provid = dome(1650, 52, 80, 70, 1.7, 0.8);
    massif(B, 1570, 1720, provid, {});
    favela(B, 1576, 1716, provid, { cap: (x) => 4 + 6 * hash(x >> 3, 6), dens: 0.95 });
    const cantagalo = (x) => Math.max(dome(2010, 78, 130, 110, 1.6, 0.9)(x), dome(2100, 66, 60, 60, 1.8, 0.8)(x));
    massif(B, 1880, 2162, cantagalo, {});
    favela(B, 1935, 2150, cantagalo, { cap: (x) => 14 + 12 * hash(x >> 3, 7), dens: 0.9 });
    // Morro da Babilônia / Leme, straddling the wrap
    const lemeP = (x) => dome(2368, 66, 86, 54, 1.7, 0.85)(x < 1200 ? x + WM : x);
    const lemeRock = (x, d, h, sl, y) => y > 1 || (Math.abs(sl) > 1.4 && d > 2 + 5 * vnoise(x, 4, 9) && d < h * 0.75);
    massif(B, 2282, WM, lemeP, { rockAt: lemeRock, bottom: 0 });
    massif(B, 0, 22, lemeP, { rockAt: lemeRock, bottom: 5 });
    favela(B, 2300, 2372, lemeP, { cap: (x) => 12 + 8 * hash(x >> 3, 8), dens: 0.85 });
    const gloriaH = dome(1022, 24, 34, 30, 1.8, 0.9);
    B.hz = 0.04;
    massif(B, 988, 1052, gloriaH, { spots: 0.55 });

    // Back row
    const env = (x) => 26 + 16 * K.gauss(x, 480, 70, WM) + 22 * K.gauss(x, 880, 90, WM) + 72 * K.gauss(x, 1300, 140, WM) + 24 * K.gauss(x, 2020, 220, WM)
      - 18 * K.gauss(x, 1022, 22, WM) - 14 * K.gauss(x, 1700, 90, WM) - 10 * K.gauss(x, 360, 20, WM);
    const lmSpans = [[1234, 1268], [1330, 1382], [1612, 1692], [1742, 1790]];
    const nearLm = (x, pad) => lmSpans.some(([a, b]) => x > a - pad && x < b + pad);
    B.hz = 0.12;
    for (let x = zoneS[1] + 6; x < 2386;) {
      const w = r.int(8, 18);
      if (x > 1004 && x < 1040) { x = 1040; continue; }
      let h = env(x + w / 2) * r.range(0.6, 1.05);
      if (r() < 0.06) h *= 1.25;
      if (nearLm(x + w / 2, 4)) h = Math.min(h, r.int(16, 28));
      if (x + w > 2386) break;
      const centro = x > 1100 && x < 1520;
      K.generic(B, x, w, Math.round(Math.max(14, h)), 'back', centro ? CENTRO : RIO);
      x += w + r.int(0, 2);
    }
    // Landmarks
    B.hz = 0.05;
    petrobras(B, 1251);
    cathedral(B, 1356);
    gloria(B, 1022, -Math.round(gloriaH(1022)));
    lm.wheel = wheel(B, 1766, 19);
    // Front row
    B.hz = 0;
    const noFront = [[770, 994], [1606, 1792]];
    for (let x = zoneS[1] + 12; x < 2380;) {
      const w = r.int(7, 15);
      const blocked = noFront.some(([a, b]) => x + w > a && x < b);
      if (blocked) { x = noFront.find(([a, b]) => x + w > a && x < b)[1] + 2; continue; }
      if (x + w > 2380) break;
      let h = Math.round(r.range(14, 26) + env(x) * r.range(0.08, 0.3));
      if (nearLm(x + w / 2, 2)) h = Math.min(h, 16);
      K.generic(B, x, w, h, 'front', x > 1100 && x < 1520 ? CENTRO : RIO);
      x += w + r.int(0, 3);
    }
    museu(B, 1614);

    // Shore: beachfront avenue, sand, palms and lamps (the Sugarloaf zone has its own rocky shore)
    const road = [zoneS[1], 2392];
    B.f(road[0], 0, road[1] - road[0], 1, 'conc', 'rim');
    B.f(road[0], 1, road[1] - road[0], 1, 'asphalt', 'flat');
    B.f(road[0], 2, road[1] - road[0], 3, 'sand', 'front');
    B.f(road[0], 2, road[1] - road[0], 1, 'sand', 'rim');
    B.f(2392, 0, 8, 5, '#6a625a', 'front');
    for (let x = road[0] + 6; x < road[1] - 4; x += 14) {
      if (x > 1606 && x < 1700) continue;
      B.f(x, -4, 1, 4, 'conc2', 'sideR', { a: 0.7 });
      B.emit(x - 1, -5, 2, 1, 'conc2', '#ffd98a', 'sideR');
      B.lamps.push({ x, y: -5 });
    }
    // Aterro do Flamengo park: round trees and imperial palms
    for (let x = 776; x < 990;) {
      if (r() < 0.3) { K.palm(B, x + 2, 0, r.int(15, 20), 0, {}); x += r.int(6, 9); }
      else { const h = r.int(5, 9); parkTree(B, x, h); x += h + r.int(0, 3); }
    }
    // beach palms along the avenue
    for (let x = road[0] + 8; x < road[1] - 6; x += r.int(12, 26)) {
      if ((x > 770 && x < 994) || (x > 1600 && x < 1794)) continue;
      K.palm(B, x, 1, r.int(8, 13), r.int(-3, 3), { coconuts: r() < 0.5 });
    }

    // Sugarloaf last: nothing stands in front of it
    B.hz = 0.03;
    lm.sugar = sugarloaf(B);
    B.hz = 0;

    K.finalizeRoofs(B, [zoneS, [2280, WM], [1606, 1792]]);
    layers.push({ name: 'main', par: 1, W: WM, haze: 0, B, groundGlow: 34, fogK: 0.12 });

    lm.perch = { x: lm.sugar.x, top: lm.sugar.top - 10 };

    // --- ambient: bondinho cabins, the port wheel, and the Christ's floodlight halo -------------
    const cab = ['.k..', '.k..', 'cccc', 'cwwc', 'cccc'];
    let halo = null;
    function ambient(p, S) {
      if (!halo || halo.dead) S.spawn('christHalo');
      const P = S.P, t = S.t, om = S.om, VW = S.VW, gy = S.groundY;
      const light = PS.add(P.amb, PS.scale(P.sun, 0.5));
      const night = P.dark > 0.45;
      // cable cars (jig-back: two cabins per span, crossing mid-way)
      const body = PS.css(PS.mul(hex('#efe6cf'), light));
      const glass = night ? '#ffe6a0' : PS.css(PS.mul(hex('#6fa8d0'), light));
      const map = { c: body, w: glass, k: PS.css(PS.mul(hex('#3a3844'), light)) };
      lm.sugar.cables.forEach((pts, ci) => {
        const X0 = S.mx(pts[0][0]);
        if (X0 - om > VW + 10 || X0 + pts.length - om < -10) return;
        const T = ci ? 26 : 20, dwell = 5;
        const ph = ((t + ci * 7) % ((T + dwell) * 2));
        const leg = ph < T + dwell ? 0 : 1, lt = ph - leg * (T + dwell);
        let u = Math.min(1, lt / T);
        u = u * u * (3 - 2 * u);
        for (const k of [u, 1 - u]) {
          const uu = leg ? 1 - k : k;
          const i = Math.max(0, Math.min(pts.length - 1, Math.round(uu * (pts.length - 1))));
          const [x, y] = pts[i];
          p.sprite(cab, S.mx(x) - 1, gy + y + 1, map);
        }
      });
      // Ferris wheel gondolas
      const wh = lm.wheel;
      const WX = S.mx(wh.x);
      if (WX - om > -30 && WX - om < VW + 30) {
        const cols = ['#ff5a7a', '#4ab0ff', '#ffd23a', '#58e08a', '#ff9a3a', '#b07aff'];
        for (let k = 0; k < 12; k++) {
          const a = t * 0.12 + (k / 12) * Math.PI * 2;
          const gx = WX + Math.cos(a) * wh.R, gyy = gy + wh.y + Math.sin(a) * wh.R;
          p.rect(Math.round(gx) - 1, Math.round(gyy) + 1, 2, 2, night ? cols[k % 6] : PS.css(PS.mul(hex(cols[k % 6]), light)));
        }
      }
    }

    // Halo around the floodlit statue (screen space, drawn between the mid and main layers)
    function haloEvent(S) {
      if (halo && !halo.dead) return null;
      const ev = { z: 'back', space: 'screen', t: 0, ambient: true };
      halo = ev;
      ev.update = (dt) => { ev.t += dt; return true; };
      ev.draw = (p) => {
        const dark = S.P.dark;
        if (dark < 0.15) return;
        const c = lm.christ;
        let X = ((c.x - S.om * 0.5) % WMID + WMID) % WMID;
        if (X > WMID - 60) X -= WMID;
        if (X < -40 || X > S.VW + 40) return;
        const Y = S.groundY + c.top + 7;
        const g = PS.GLOWS.christ || [255, 255, 255];
        for (let rad = 26; rad >= 4; rad -= 2) {
          p.ctx.fillStyle = PS.cssA(g, (0.012 + 0.006 * (26 - rad) / 22) * dark);
          for (let dy = -rad; dy <= rad; dy++) {
            const hw = Math.round(Math.sqrt(rad * rad - dy * dy) * 1.2);
            p.rect(X - hw, Y + dy, hw * 2, 1);
          }
        }
      };
      return ev;
    }

    // Night show: the statue gets a projection (Brazil colours, rainbow, hearts...) for a while.
    function projection(S) {
      const c = lm.christ;
      let X = ((c.x - S.om * 0.5) % WMID + WMID) % WMID;
      if (X > WMID - 60) X -= WMID;
      if (X < 20 || X > S.VW - 20) return null;
      const R = PS.R;
      const mode = R.pick(['brasil', 'rainbow', 'hearts', 'pink']);
      const ev = { z: 'back', space: 'screen', t: 0 };
      ev.update = (dt) => { ev.t += dt; return ev.t < 30; };
      ev.draw = (p) => {
        let X0 = ((-S.om * 0.5) % WMID + WMID) % WMID;
        let cx = c.x + X0; if (cx > WMID - 60) cx -= WMID;
        const off = cx - c.x;
        const fade = Math.min(1, ev.t / 2, (30 - ev.t) / 2) * Math.min(1, S.P.dark * 1.5);
        const t = ev.t;
        const rb = ['#ff4a4a', '#ff9a2a', '#ffe04a', '#4aff7a', '#4ab0ff', '#b060ff'];
        for (const [x, y, ch] of c.cells) {
          if (ch === 'P' || ch === 'p') continue;
          let col;
          const j = y - c.top;
          if (mode === 'brasil') col = ch === 'A' || ch === 'a' ? '#ffd23a' : j < 2 ? '#2a4ab8' : (Math.floor(t * 2) + j) % 5 === 0 ? '#ffd23a' : '#1fa050';
          else if (mode === 'rainbow') col = rb[((j + Math.floor(t * 6)) % 6 + 6) % 6];
          else if (mode === 'hearts') col = Math.sin(t * 3 + j * 0.5) > 0.3 ? '#ff3a6a' : '#ff9ac0';
          else col = (x + j + Math.floor(t * 4)) % 3 ? '#ff6ab8' : '#ffffff';
          p.ctx.globalAlpha = 0.85 * fade;
          p.rect(x + off, S.groundY + y, 1, 1, col);
        }
        p.ctx.globalAlpha = 1;
      };
      return ev;
    }

    return {
      key: 'rio',
      name: 'Rio de Janeiro',
      lat: -22.91, lon: -43.17,
      layers,
      landmarks: lm,
      lanes: [{ y: 1, x0: road[0] + 2, x1: road[1] - 2, dir: 1 }],
      holidays: ['xmas', 'nye', 'carnaval', 'outubroRosa', 'novembroAzul'],
      foreground: { kind: 'beach', mosaic: true, kiosks: true },
      flags: 'br',
      glow(season) {
        const h = season ? season.holidays : {};
        let c = '#fff6e6';
        if (h.outubroRosa) c = '#ff6ab8';
        else if (h.novembroAzul) c = '#4a8cff';
        else if (h.nye) c = '#fff2c0';
        else if (h.carnaval) c = ['#ff4ab0', '#ffd24a', '#4affc0'][new Date().getDate() % 3];
        else if (h.xmas) c = new Date().getDate() % 2 ? '#ff4a4a' : '#5aff7a';
        else if (season && season.esb) c = season.esb[0];
        PS.GLOWS.christ = hex(c);
      },
      musicWords: [
        ['saudade', 'ipanema', 'sunset', 'slow', 'salty', 'warm', 'late', 'golden', 'hazy', 'sleepy', 'tropical', 'sunday', 'barefoot', 'humid', 'breezy', 'rainy', 'blue'],
        ['bossa', 'copacabana', 'bondinho', 'favela lights', 'coconut', 'samba', 'tide', 'caipirinha', 'balcony', 'arpoador', 'corcovado', 'sugarloaf', 'kiosk', 'flip-flops', 'mate gelado', 'guanabara', 'lapa', 'hang glider'],
      ],
      messages: ['OI RIO!', 'BISCOITO GLOBO', 'MATE GELADO', 'CIDADE MARAVILHOSA', 'VAI BRASIL!', 'OLHA O MATE!', 'PARTIU PRAIA', 'BOM DIA RIO!', 'SAMBA NO PE', 'CHOPP GELADO', 'SAUDADE ♥'],
      events: [
        { id: 'christHalo', w: 0, make: haloEvent },
        { id: 'hangGliders', w: 5, ok: (S) => S.P.day > 0.45 && S.weather.rain < 0.2 && S.weather.wind < 0.7, make: hangGliders },
        { id: 'christLights', w: 2, ok: (S) => S.P.dark > 0.55, make: projection },
      ],
      eventWeights: { kong: 0.4, pizzaSignal: 0, paradeBalloon: 0, witch: 0.3, bats: 0.3, snowballs: 0 },
      ambient,
    };
  });
})();
