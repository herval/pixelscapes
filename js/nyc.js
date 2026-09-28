'use strict';
// New York City, seen across the East River.
(function () {
  const PS = window.PS;
  PS.cities = PS.cities || {};
  const { hex } = PS;

  const WM = 2400;

  const gauss = PS.kit.gauss;
  const generic = (B, x, w, h, row) => PS.kit.generic(B, x, w, h, row);
  const distant = (B, x, w, h, far) => PS.kit.distant(B, x, w, h, far);

  // ---------------------------------------------------------------------------------------------
  // Landmarks

  function empireState(B, cx, schemeIdx) {
    const schemes = [
      ['#ffffff', '#ffffff', '#ffffff'], ['#ff4a4a', '#ffffff', '#4a7cff'], ['#58ff9a', '#58ff9a', '#ffffff'],
      ['#ff6fc8', '#ff6fc8', '#ffffff'], ['#ffa640', '#ffa640', '#ffffff'], ['#b070ff', '#ffd24a', '#ffd24a'], ['#4ab0ff', '#ffffff', '#4ab0ff'],
    ];
    const sc = schemes[schemeIdx % schemes.length];
    const win = { ww: 1, wh: 1, px: 2, py: 2, my: 2 };
    B.box(cx - 22, -20, 44, 20, 'lime', { win, bands: 5 });
    B.box(cx - 18, -32, 36, 12, 'lime', { win });
    // main shaft with vertical piers
    B.f(cx - 13, -100, 23, 68, 'lime', 'front');
    B.f(cx + 10, -100, 3, 68, 'lime', 'sideR');
    B.f(cx - 13, -100, 26, 1, 'lime', 'rim');
    B.f(cx - 7, -98, 1, 66, 'lime', 'dark', { a: 0.35 });
    B.f(cx + 6, -98, 1, 66, 'lime', 'dark', { a: 0.35 });
    const grid = { cols: [], rows: [], ww: 1, wh: 1 };
    for (let x = cx - 12; x < cx + 10; x += 2) { if (x === cx - 7 || x === cx + 6) continue; grid.cols.push(x); }
    for (let y = -98; y < -33; y += 2) grid.rows.push(y);
    for (const y of grid.rows) for (const x of grid.cols) B.win(x, y, 1, 1, 'lime');
    B.grids.push(grid);
    B.rects.push({ x: cx - 13, y: -100, w: 26, h: 68 });
    // crown tiers (floodlit at night)
    PS.GLOWS.esb0 = hex(sc[0]); PS.GLOWS.esb1 = hex(sc[1]); PS.GLOWS.esb2 = hex(sc[2]);
    B.box(cx - 10, -106, 20, 6, 'lime', { glowKey: 'esb0', win: { ww: 1, wh: 1, px: 2, py: 2, my: 1, mb: 1 } });
    B.box(cx - 7, -111, 14, 5, 'lime', { glowKey: 'esb0' });
    B.box(cx - 5, -115, 10, 4, 'lime', { glowKey: 'esb1' });
    for (let x = cx - 4; x < cx + 4; x += 2) B.emit(x, -114, 1, 2, 'lime', '#fff6d0');
    B.box(cx - 3, -121, 6, 6, 'steel', { glowKey: 'esb2', side: 1 });
    B.box(cx - 2, -126, 4, 5, 'steel', { glowKey: 'esb2', side: 1 });
    B.box(cx - 1, -131, 2, 5, 'steel', { glowKey: 'esb2', side: 0 });
    B.f(cx, -150, 1, 19, 'dark', 'flat');
    B.blink(cx, -151, { period: 2.2 });
    B.roofs.push({ x: cx - 21, w: 5, y: -20, row: 'lm', ri: B.rects.length });
    return { spireX: cx, spireTop: -150, mastTop: -131, scheme: sc.map(hex) };
  }

  function chrysler(B, cx) {
    B.box(cx - 13, -20, 26, 20, 'lime', { win: { ww: 1, wh: 1, px: 2, py: 2 } });
    B.box(cx - 10, -30, 20, 10, 'white', { win: { ww: 1, wh: 1, px: 2, py: 2 } });
    B.box(cx - 8, -80, 16, 50, 'white', { win: { ww: 1, wh: 2, px: 2, py: 3 }, side: 2 });
    B.f(cx - 8, -80, 16, 1, 'dark', 'flat');
    // eagles
    B.f(cx - 9, -81, 1, 1, 'steel', 'rim'); B.f(cx + 8, -81, 1, 1, 'steel', 'rim');
    // stacked sunburst arches
    const widths = [14, 12, 10, 8, 6, 4];
    let y = -81;
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i], x = cx - w / 2, th = 3;
      B.f(x, y - th + 1, w - 1, th - 1, 'steel', 'front');
      B.f(x + w - 1, y - th + 1, 1, th - 1, 'steel', 'sideR');
      B.f(x + 1, y - th, w - 2, 1, 'steel', 'rim');
      for (let k = x + 1; k < x + w - 1; k += 2) B.emit(k, y - 1, 1, 1, 'steel', '#eaf6ff', 'dark');
      if (w > 6) { B.emit(x + 2, y - 2, 1, 1, 'steel', '#eaf6ff', 'dark'); B.emit(x + w - 3, y - 2, 1, 1, 'steel', '#eaf6ff', 'dark'); }
      y -= th;
    }
    B.f(cx - 1, y - 4, 2, 4, 'steel', 'rim');
    B.f(cx, y - 18, 1, 14, 'steel', 'rim');
    return { top: y - 18 };
  }

  function oneWTC(B, cx) {
    B.box(cx - 15, -18, 30, 18, 'glass2', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1 } });
    const H = 116, bottom = -18;
    for (let r = 0; r < H; r++) {
      const f = r / (H - 1), y = bottom - 1 - r;
      const half = Math.round(15 - 8 * f);
      const cHalf = Math.round(half * (1 - f));
      const l = cx - half, rr = cx + half;
      if (cHalf < half) {
        B.glass(l, y, half - cHalf, 1, 'glass', 'sideL');
        B.glass(cx + cHalf, y, half - cHalf, 1, 'glass', 'sideR');
      }
      if (cHalf > 0) B.glass(cx - cHalf, y, cHalf * 2, 1, 'glass', 'front');
      if (r % 3 === 1 && r < H - 3) {
        const w = rr - l - 2;
        let x = l + 1;
        while (x < l + 1 + w) { const sw = Math.min(l + 1 + w - x, B.rng.int(3, 7)); B.win(x, y, sw, 1, 'glass', { office: true, lc: PS.OFFICE[0] }); x += sw; }
      }
    }
    // a glint up the center facet
    for (let k = 0; k < 26; k++) B.f(cx - 6 + (k >> 1), bottom - 20 - k * 2, 1, 2, 'glass', 'glint', { a: 0.55 });
    B.rects.push({ x: cx - 15, y: bottom - H, w: 30, h: H });
    const top = bottom - H;
    B.box(cx - 7, top - 3, 14, 3, 'glass2', { side: 1 });
    B.f(cx - 2, top - 6, 4, 3, 'steel', 'front');
    B.f(cx - 1, top - 10, 2, 4, 'steel', 'front');
    B.f(cx, top - 32, 1, 22, 'steel', 'rim');
    for (let y = top - 30; y < top - 10; y += 4) B.emit(cx, y, 1, 1, 'steel', '#ffffff');
    B.blink(cx, top - 33, { c: '#ffffff', period: 1.5 });
    return { top: top - 33 };
  }

  function woolworth(B, cx) {
    B.box(cx - 12, -40, 24, 40, 'cream', { win: { ww: 1, wh: 2, px: 2, py: 3 } });
    B.box(cx - 7, -64, 14, 24, 'cream', { win: { ww: 1, wh: 2, px: 2, py: 3 } });
    B.box(cx - 5, -73, 10, 9, 'cream', { win: { ww: 1, wh: 1, px: 2, py: 2 } });
    B.box(cx - 4, -79, 8, 6, 'cream', {});
    for (const px of [cx - 7, cx + 6]) B.f(px, -67, 1, 3, 'cream', 'rim');
    for (const px of [cx - 5, cx + 4]) B.f(px, -76, 1, 3, 'cream', 'rim');
    let w = 8, y = -80;
    while (w > 0) { B.f(cx - w / 2, y, w, 1, 'copper', 'front'); B.f(cx - w / 2, y, 1, 1, 'copper', 'rim'); y--; w -= 2; }
    B.f(cx - 1, y, 1, 4, 'gold', 'rim');
    B.emit(cx - 4, -79, 8, 1, 'cream', '#fff0c0', 'rim');
  }

  function goldPyramid(B, cx) {
    B.box(cx - 10, -60, 20, 60, 'lime', { win: { ww: 1, wh: 2, px: 2, py: 3 } });
    B.box(cx - 7, -68, 14, 8, 'lime', { win: { ww: 1, wh: 1, px: 2, py: 2 } });
    let w = 14, y = -69;
    while (w > 1) { B.f(cx - w / 2, y - 1, w - 1, 2, 'gold', 'front', { glow: '#ffd070' }); B.f(cx + w / 2 - 1, y - 1, 1, 2, 'gold', 'sideR', { glow: '#ffd070' }); y -= 2; w -= 2; }
    B.f(cx - 1, y - 3, 1, 4, 'gold', 'rim');
  }

  function citigroup(B, cx) {
    B.f(cx - 8, -12, 2, 12, 'white', 'front'); B.f(cx + 6, -12, 2, 12, 'white', 'sideR'); B.f(cx - 2, -12, 3, 12, 'white', 'front');
    B.box(cx - 8, -96, 16, 84, 'white', { win: { office: true, py: 2, mx: 1, my: 2, mb: 1 }, side: 2 });
    for (let r = 0; r < 15; r++) {
      const w = 16 - r;
      B.f(cx - 8, -97 - r, w, 1, 'white', 'front');
      B.f(cx - 8 + w - 1, -97 - r, 1, 1, 'white', 'rim');
    }
  }

  function park432(B, cx) {
    B.f(cx - 4, -138, 8, 138, 'white', 'front');
    B.f(cx + 4, -138, 1, 138, 'white', 'sideR');
    B.f(cx - 4, -138, 9, 1, 'white', 'rim');
    const grid = { cols: [cx - 3, cx - 1, cx + 1], rows: [], ww: 1, wh: 1 };
    for (let y = -136; y < -2; y += 2) {
      grid.rows.push(y);
      if (y === -104 || y === -70 || y === -36) { B.f(cx - 3, y, 7, 1, 'dark', 'flat'); continue; }
      for (const x of grid.cols) B.win(x, y, 1, 1, 'glassD');
    }
    B.grids.push(grid);
    B.rects.push({ x: cx - 4, y: -138, w: 9, h: 138 });
  }

  function steinway(B, cx) {
    B.box(cx - 10, -24, 20, 24, 'lime', { win: { ww: 1, wh: 2, px: 2, py: 3 } });
    for (let y = -24; y > -142; y--) {
      const f = y < -104 ? Math.max(1, 7 - Math.floor((-104 - y) / 6)) : 7;
      for (let i = 0; i < f; i++) B.f(cx - 3 + i, y - 1, 1, 1, i % 2 ? 'terra' : 'glass2', i === f - 1 ? 'sideR' : 'front');
    }
    B.f(cx - 3, -143, 1, 1, 'terra', 'rim');
    B.rects.push({ x: cx - 3, y: -142, w: 7, h: 118 });
  }

  function centralParkTower(B, cx) {
    B.box(cx - 6, -148, 12, 148, 'glass2', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1 } });
    B.box(cx + 1, -80, 7, 80, 'glass2', { glass: true, win: { office: true, py: 3, mx: 1 } });
    B.f(cx - 6, -152, 12, 4, 'glass2', 'dark');
    for (let x = cx - 5; x < cx + 6; x += 2) B.f(x, -152, 1, 4, 'steel', 'flat');
    B.emit(cx - 6, -149, 12, 1, 'glass2', '#bfe8ff', 'rim');
  }

  function hudsonYards(B, cx) {
    B.box(cx - 10, -118, 20, 118, 'glassG', { glass: true, mullions: 3, win: { office: true, py: 2, mx: 1 } });
    for (let r = 0; r < 10; r++) B.f(cx - 10 + r * 2, -119 - r, 20 - r * 2, 1, 'glassG', r ? 'sideL' : 'rim');
    // The Edge observation deck
    B.f(cx + 10, -106, 6, 1, 'steel', 'rim'); B.f(cx + 10, -105, 5, 1, 'glassG', 'dark');
    B.f(cx + 11, -104, 3, 1, 'glassG', 'dark');
    for (let x = cx + 11; x < cx + 16; x += 2) B.f(x, -108, 1, 2, 'steel', 'flat', { a: 0.6 });
    B.box(cx + 14, -80, 16, 80, 'glass', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1 } });
    for (let r = 0; r < 6; r++) B.f(cx + 14, -81 - r, 16 - r * 2, 1, 'glass', r ? 'sideL' : 'rim');
  }

  function statueOfLiberty(B, cx) {
    // island
    B.f(cx - 26, 2, 52, 3, 'grass', 'flat');
    B.f(cx - 22, 1, 44, 1, 'grass', 'front');
    for (let i = -20; i <= 20; i += 5) B.f(cx + i, -1, 2, 2, 'tree', 'front');
    // star fort + pedestal
    B.f(cx - 12, -2, 24, 3, 'stone', 'front'); B.f(cx - 12, -2, 24, 1, 'stone', 'rim');
    B.f(cx - 6, -4, 12, 2, 'stone', 'front');
    B.f(cx - 4, -15, 8, 11, 'granite', 'front'); B.f(cx + 3, -15, 1, 11, 'granite', 'sideR');
    B.f(cx - 5, -15, 10, 1, 'granite', 'rim'); B.f(cx - 5, -9, 10, 1, 'granite', 'rim');
    // statue (copper green)
    B.f(cx - 2, -27, 5, 12, 'copper', 'front');
    B.f(cx + 2, -27, 1, 12, 'copper', 'sideR');
    B.f(cx - 3, -19, 2, 4, 'copper', 'front');
    B.f(cx - 3, -24, 1, 3, 'copper', 'rim'); // tablet
    B.f(cx - 1, -30, 3, 3, 'copper', 'front');
    B.f(cx - 2, -31, 1, 1, 'copper', 'rim'); B.f(cx, -32, 1, 1, 'copper', 'rim'); B.f(cx + 2, -31, 1, 1, 'copper', 'rim');
    B.f(cx + 2, -35, 1, 8, 'copper', 'front'); // raised arm
    B.f(cx + 1, -37, 3, 2, 'gold', 'front', { glow: '#ffcf60' });
    B.emit(cx + 2, -39, 1, 2, 'gold', '#ffb040', 'rim');
    return { torchX: cx + 2, torchY: -39 };
  }

  function brooklynBridge(B, x0, x1, t1, t2) {
    const deck = -21;
    // Anchorages
    for (const ax of [x0, x1 - 22]) {
      B.box(ax, deck - 4, 22, 9 - deck, 'stone', { side: 2, bands: 4 });
    }
    // Deck
    B.f(x0 + 22, deck, x1 - x0 - 44, 1, 'stone', 'rim');
    B.f(x0 + 22, deck + 1, x1 - x0 - 44, 2, 'dark', 'flat');
    // Cables
    const towerTop = -64;
    const cable = (xa, ya, xb, yb, sag) => {
      const pts = [];
      const n = Math.abs(xb - xa);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = Math.round(xa + (xb - xa) * t);
        const y = Math.round(ya + (yb - ya) * t + sag * 4 * t * (1 - t));
        pts.push([x, y]);
      }
      let prev = null;
      for (const [x, y] of pts) {
        if (prev && Math.abs(prev[1] - y) > 1) B.f(x, Math.min(prev[1], y) + 1, 1, Math.abs(prev[1] - y) - 1, 'dark', 'flat');
        B.f(x, y, 1, 1, 'dark', 'flat');
        prev = [x, y];
      }
      return pts;
    };
    const spans = [
      cable(x0 + 20, deck - 3, t1, towerTop + 2, 8),
      cable(t1 + 11, towerTop + 2, t2, towerTop + 2, (deck - 2 - (towerTop + 2))),
      cable(t2 + 11, towerTop + 2, x1 - 20, deck - 3, 8),
    ];
    for (const pts of spans) {
      pts.forEach(([x, y], i) => {
        if (i % 3 === 0 && y < deck - 1) B.f(x, y + 1, 1, deck - y - 1, 'dark', 'flat', { a: 0.45 });
        if (i % 5 === 2) B.emit(x, y, 1, 1, 'dark', '#fff4d8', 'flat');
      });
    }
    // diagonal stays
    for (const tx of [t1, t2]) {
      for (const d of [14, 26, 38]) {
        B.line(tx + 1, towerTop + 6, tx + 1 - d, deck - 1, 'dark', 'flat', { a: 0.55 });
        B.line(tx + 10, towerTop + 6, tx + 10 + d, deck - 1, 'dark', 'flat', { a: 0.55 });
      }
    }
    // Towers with gothic arches
    for (const tx of [t1, t2]) {
      const w = 11, top = towerTop, base = 5;
      B.f(tx, top, w - 2, base - top, 'stone', 'front');
      B.f(tx + w - 2, top, 2, base - top, 'stone', 'sideR');
      B.f(tx - 1, top - 1, w + 2, 2, 'stone', 'rim');
      B.f(tx - 1, top + 12, w + 2, 1, 'stone', 'rim');
      B.f(tx - 1, deck + 4, w + 2, 1, 'stone', 'rim');
      // arches are drawn as dark "openings" showing the city through them (sky-tinted)
      for (const ax of [tx + 2, tx + 6]) {
        B.f(ax, top + 18, 3, deck - top - 16, 'glassD', 'dark', { a: 0.6 });
        B.f(ax + 1, top + 16, 1, 2, 'glassD', 'dark', { a: 0.6 });
      }
      B.blink(tx + 5, top - 2, { period: 2.8 });
    }
    // deck lamps
    for (let x = x0 + 24; x < x1 - 24; x += 7) B.emit(x, deck - 1, 1, 1, 'dark', '#ffd27a', 'flat');
    return { deckY: deck, x0: x0 + 22, x1: x1 - 22 };
  }

  // ---------------------------------------------------------------------------------------------

  PS.registerCity('nyc', 'New York', function (seed) {
    const layers = [];
    const dayIdx = Math.floor(Date.now() / 864e5);

    // Far layer: Brooklyn/Queens/Jersey haze
    {
      const W = 1500, B = new PS.Builder(W, PS.rng(seed + 11));
      const r = B.rng;
      for (let x = 0; x < W;) {
        const w = r.int(6, 18);
        const env = 14 + 40 * gauss(x, 300, 140, W) + 30 * gauss(x, 1000, 200, W);
        distant(B, x, w, Math.max(6, Math.round(env * r.range(0.4, 1))), true);
        x += w + r.int(-2, 1);
      }
      layers.push({ name: 'far', par: 0.22, W, haze: 0.62, B, fogK: 0.36 });
    }
    // Mid layer
    {
      const W = 1900, B = new PS.Builder(W, PS.rng(seed + 22));
      const r = B.rng;
      for (let x = 0; x < W;) {
        const w = r.int(7, 20);
        const env = 20 + 55 * gauss(x, 420, 160, W) + 70 * gauss(x, 1250, 260, W);
        distant(B, x, w, Math.max(10, Math.round(env * r.range(0.45, 1.05))), false);
        x += w + r.int(-3, 1);
      }
      layers.push({ name: 'mid', par: 0.5, W, haze: 0.36, B, groundGlow: 24, fogK: 0.4 });
    }

    // Main layer
    const B = new PS.Builder(WM, PS.rng(seed));
    const r = B.rng;
    const env = (x) => 24 + 72 * gauss(x, 560, 150, WM) + 30 * gauss(x, 760, 80, WM) + 88 * gauss(x, 1560, 300, WM) + 40 * gauss(x, 2120, 120, WM);
    const harbor = [120, 260];
    const bridge = [720, 1180];
    const lmSpans = [[480, 510], [620, 660], [1290, 1330], [1390, 1440], [1545, 1580], [1640, 1665], [1710, 1730], [1760, 1790], [1810, 1830], [2100, 2150]];
    const nearLm = (x) => lmSpans.some(([a, b]) => x > a - 6 && x < b + 6);

    // back row (slightly hazier than the front: depth)
    B.hz = 0.14;
    for (let x = 0; x < WM;) {
      const w = r.int(8, 22);
      let h = env(x + w / 2) * r.range(0.5, 1.02);
      if (r() < 0.06) h *= 1.3;
      if (x + w > harbor[0] && x < harbor[1]) h = r.int(10, 22);
      if (nearLm(x + w / 2)) h = Math.min(h, r.int(24, 50));
      generic(B, x, w, Math.round(Math.max(14, h)), 'back');
      x += w + r.int(0, 2);
    }
    // landmarks
    B.hz = 0.05;
    const lm = {};
    lm.owtc = oneWTC(B, 495);
    woolworth(B, 640);
    lm.gold = goldPyramid(B, 1310);
    lm.esb = empireState(B, 1415, dayIdx);
    lm.esb.x = 1415;
    lm.chrysler = chrysler(B, 1562);
    citigroup(B, 1652);
    park432(B, 1720);
    centralParkTower(B, 1775);
    steinway(B, 1820);
    hudsonYards(B, 2115);
    // front row
    B.hz = 0;
    for (let x = 0; x < WM;) {
      const w = r.int(6, 16);
      if (x + w > harbor[0] - 4 && x < harbor[1] + 4) { x = harbor[1] + 4; continue; }
      const h = Math.round(r.range(10, 26) + env(x) * r.range(0.05, 0.22));
      generic(B, x, w, h, 'front');
      x += w + r.int(0, 3);
    }
    // bridge and statue in front
    lm.bridge = brooklynBridge(B, bridge[0], bridge[1], 820, 1060);
    // Shore: FDR railing, road, seawall, lamps, trees
    B.f(0, 0, WM, 1, 'conc', 'rim');
    B.f(0, 1, WM, 3, 'asphalt', 'flat');
    B.f(0, 4, WM, 1, 'stone', 'dark');
    for (let x = 3; x < WM; x += 12) {
      if (x > harbor[0] && x < harbor[1]) continue;
      B.f(x, -4, 1, 4, 'conc2', 'sideR', { a: 0.7 });
      B.emit(x - 1, -5, 2, 1, 'conc2', '#ffd98a', 'sideR');
      B.lamps.push({ x, y: -5 });
    }
    for (let x = 8; x < WM; x += r.int(10, 30)) {
      if (x > harbor[0] - 10 && x < harbor[1] + 10) continue;
      const tm = r.pick(['tree', 'tree2', 'tree3']);
      B.f(x, -3, 3, 2, tm, 'front'); B.f(x + 1, -4, 2, 1, tm, 'rim'); B.f(x + 1, -1, 1, 1, 'dark', 'flat');
    }
    lm.liberty = statueOfLiberty(B, 190);

    // Roofs whose background is sky (nothing taller right behind them) are preferred for actors.
    PS.kit.finalizeRoofs(B, [bridge]);

    layers.push({ name: 'main', par: 1, W: WM, haze: 0, B, groundGlow: 34, fogK: 0.12 });

    lm.perch = { x: lm.esb.x, top: lm.esb.mastTop }; // where the giant ape climbs
    return {
      key: 'nyc',
      name: 'New York',
      lat: 40.71, lon: -74.01,
      layers,
      landmarks: lm,
      holidays: ['xmas', 'halloween', 'july4', 'nye', 'valentine', 'stpatrick', 'thanksgiving', 'pride'],
      foreground: { kind: 'promenade' },
      flags: 'us',
      // Landmark floodlights: the Empire State's crown follows holidays, otherwise a daily scheme.
      glow(season) {
        const c = season && season.esb ? season.esb.map(hex) : lm.esb.scheme;
        PS.GLOWS.esb0 = c[0]; PS.GLOWS.esb1 = c[1]; PS.GLOWS.esb2 = c[2];
      },
      musicWords: [['rainy', 'late', 'blue', 'neon', 'quiet', 'sleepy', 'golden', 'foggy', 'midnight', 'rooftop', 'slow', 'hazy', 'warm', 'lonely', 'soft', 'last', 'sunday', 'cold'],
        ['bodega', 'ferry', 'fire escape', 'steam vents', 'pigeons', 'subway', 'puddles', 'stoop', 'window', 'bridge', 'taxi', 'radiator', 'laundromat', 'coffee', 'skyline', 'streetlights', 'harbor', 'elevator']],
      lanes: [
        { y: 2, x0: 0, x1: WM, dir: 1 },
        { y: 3, x0: 0, x1: WM, dir: -1 },
        { y: lm.bridge.deckY, x0: lm.bridge.x0, x1: lm.bridge.x1, dir: 1, bridge: true },
      ],
      harbor,
      messages: ["I ♥ NY", 'BAGELS 4 LIFE', 'PIZZA RAT FOR MAYOR', "EAT AT JOE'S", 'FUGGEDABOUTIT', 'HONK IF U R LOST', 'NO PARKING ANYTIME', 'THE CITY NEVER SLEEPS', 'HELLO FROM ABOVE', 'SUBWAY DELAYED'],
    };
  });
})();
