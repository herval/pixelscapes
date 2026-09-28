'use strict';
// City kit: reusable generators shared by every city. A city passes a `style` to tune materials and
// rooftop culture (NYC water towers, Rio balconies, Berlin prefab blocks...). Defaults reproduce NYC.
(function () {
  const PS = window.PS;
  const K = (PS.kit = {});

  K.gauss = function (x, c, sigma, W) {
    let d = Math.abs(x - c); d = Math.min(d, W - d);
    return Math.exp(-(d * d) / (2 * sigma * sigma));
  };

  K.NYC_STYLE = {
    glassChance: 0.5,
    glass: ['glass', 'glass2', 'glassG', 'glassD', 'glass'],
    front: ['brick', 'brick2', 'brick3', 'brown', 'lime', 'cream', 'brick', 'conc'],
    back: ['lime', 'cream', 'conc', 'conc2', 'brick', 'brick2', 'stone', 'white', 'lime'],
    setbacks: 0.45,
    fireEscapes: 0.6,
    signs: 0.35,
    signColors: ['#ff3a7a', '#3af0ff', '#ff5a3a', '#b25aff', '#5aff8a', '#ffd23a'],
    shopGlow: 0.6,
    waterTowers: [0.55, 0.4], // chance [front row, back row]
    crowns: true,
    flags: ['us', 'us', 'ny', 'pride', 'red'],
    balconies: 0,     // chance a residential tower gets balcony bands (Rio, João Pessoa)
    plattenbau: 0,    // chance of a GDR prefab slab (Berlin)
    pitchedRoofs: 0,  // chance of a pitched/tiled roof on low buildings (Berlin, SF)
    roofMats: ['red', 'roof'],
    distantMats: [['conc2', 'stone', 'lime', 'glass2'], ['lime', 'conc', 'conc2', 'brick', 'glass', 'glass2', 'stone', 'cream']],
    distantWaterTowers: 0.2,
  };

  function st(style) { return style ? Object.assign({}, K.NYC_STYLE, style) : K.NYC_STYLE; }

  // ---------------------------------------------------------------------------------------------
  // Buildings

  K.generic = function (B, x, w, h, row, style) {
    const S = st(style);
    const r = B.rng;
    const tall = h > 58;
    let mat, glass = false, win;
    if (S.plattenbau && h > 26 && w >= 12 && r() < S.plattenbau) return K.plattenbau(B, x, w, h, row, S);
    if (tall && r() < S.glassChance) {
      mat = r.pick(S.glass); glass = true;
      win = { office: true, py: r.pick([2, 2, 3]), wh: 1, mx: 1, my: 2 };
    } else {
      mat = row === 'front' ? r.pick(S.front) : r.pick(S.back);
      win = r.pick([
        { ww: 1, wh: 1, px: 2, py: 2 }, { ww: 1, wh: 2, px: 2, py: 3 }, { ww: 2, wh: 1, px: 3, py: 2 },
        { ww: 1, wh: 1, px: 2, py: 3 }, { ww: 2, wh: 2, px: 3, py: 3 },
      ]);
      if (w < 7) win = { ww: 1, wh: 1, px: 2, py: 2, mx: 1 };
    }
    const balconies = !glass && S.balconies && h > 22 && w >= 8 && r() < S.balconies;
    const opts = { glass, win, mullions: glass && r() < 0.5 ? r.pick([2, 3]) : 0, bands: !glass && r() < 0.25 ? r.pick([6, 8, 10]) : 0 };
    if (balconies) { opts.bands = 0; opts.win = Object.assign({}, win, { py: 3, wh: 2 }); }

    // Setbacks
    const blocks = [];
    if (h > 44 && r() < S.setbacks) {
      const n = r.int(1, 3);
      let bx = x, bw = w, bottom = 0, remaining = h;
      for (let i = 0; i <= n; i++) {
        const bh = i === n ? remaining : Math.max(6, Math.floor(remaining * r.range(0.45, 0.7)));
        blocks.push({ x: bx, w: bw, top: bottom - bh, h: bh });
        bottom -= bh; remaining -= bh;
        const inset = r.int(1, Math.max(1, Math.floor(bw / 6)));
        if (bw - inset * 2 < 5) break;
        bx += inset; bw -= inset * 2;
        if (remaining <= 0) break;
      }
    } else blocks.push({ x, w, top: -h, h });

    for (const b of blocks) B.box(b.x, b.top, b.w, b.h, mat, opts);
    const top = blocks[blocks.length - 1];
    let free = { x: top.x + 1, w: top.w - 2 };

    // Balcony bands: a light slab edge + glass rail every floor
    if (balconies) {
      for (let y = -h + 4; y < -3; y += 3) {
        B.f(x, y, w, 1, 'white', 'rim', { a: 0.85 });
        B.f(x + 1, y - 1, w - 2, 1, 'glass', 'front', { a: 0.35 });
      }
    }

    // Fire escapes zig-zagging down brick walk-ups
    const brickish = mat.startsWith('brick') || mat === 'brown';
    if (row === 'front' && brickish && w >= 9 && h >= 16 && r() < S.fireEscapes) {
      const fx = x + 2 + r.int(0, Math.max(0, w - 12));
      const py = win.py || 2;
      let flip = false;
      for (let y = -h + 4; y < -6; y += (py + 1) * 2) {
        B.f(fx, y + 1, 4, 1, 'black', 'flat', { a: 0.5 });
        B.line(flip ? fx + 3 : fx, y + 2, flip ? fx : fx + 3, Math.min(-6, y + (py + 1) * 2), 'black', 'flat', { a: 0.28 });
        flip = !flip;
      }
    }
    // Neon signs at street level (animated at night)
    if (row === 'front' && w >= 6 && r() < S.signs) {
      const sw = r.int(2, Math.min(5, w - 3)), sh = r.int(1, 2);
      B.signs.push({ x: x + 1 + r.int(0, w - sw - 2), y: -r.int(4, 8), w: sw, h: sh, c: r.pick(S.signColors), flick: r() < 0.3 });
    }

    // Street-level shop glow on low buildings
    if (row === 'front' && r() < S.shopGlow) B.emit(x + 1, -2, Math.max(1, w - 3), 1, mat, r.pick(['#ffcf80', '#ffe2a8', '#ff9f6b', '#a8e0ff']), 'dark');

    // Roof features
    const roll = r();
    const wtChance = row === 'front' ? S.waterTowers[0] : S.waterTowers[1];
    if (S.pitchedRoofs && !glass && h < 40 && top.w >= 6 && roll < S.pitchedRoofs) {
      K.pitchedRoof(B, top.x, top.top, top.w, r.pick(S.roofMats));
      free = null;
    } else if (!glass && top.w >= 7 && h < 95 && roll < wtChance) {
      const left = r() < 0.5;
      const cx = left ? top.x + 3 : top.x + top.w - 4;
      const wt = B.waterTower(cx, top.top);
      free = left ? { x: wt.x + wt.w + 1, w: top.x + top.w - (wt.x + wt.w + 1) - 1 } : { x: top.x + 1, w: wt.x - top.x - 2 };
    } else if (tall && roll < 0.62) {
      const cx = top.x + (top.w >> 1);
      if (S.crowns && r() < 0.5) {
        let cw = top.w - 2, cy = top.top;
        const cm = r.pick([mat, 'steel', 'copper', 'gold']);
        while (cw > 1) { cy -= 1; B.f(cx - (cw >> 1), cy, cw, 1, cm, 'front'); B.f(cx - (cw >> 1), cy, 1, 1, cm, 'rim'); cw -= 2; }
        B.f(cx, cy - r.int(3, 8), 1, r.int(3, 8), 'steel', 'flat');
        free = null;
      } else {
        B.antenna(cx, top.top, r.int(6, 16));
        free = { x: top.x + 1, w: cx - top.x - 3 };
      }
    } else if (roll < 0.8 && top.w >= 6) {
      const bw = r.int(2, Math.min(5, top.w - 3)), bh = r.int(1, 3);
      const bx = top.x + r.int(1, top.w - bw - 1);
      B.box(bx, top.top - bh, bw, bh, 'roof', { side: 1 });
      free = bx - top.x > top.x + top.w - bx - bw ? { x: top.x + 1, w: bx - top.x - 2 } : { x: bx + bw + 1, w: top.x + top.w - bx - bw - 2 };
    }
    // Small rooftop life: steam vents, flags, gardens, AC units
    if (free && free.w >= 4) {
      const extra = r();
      if (extra < 0.18) {
        const vx = free.x + free.w - 2;
        B.f(vx, top.top - 2, 1, 2, 'dark', 'flat');
        B.vents.push({ x: vx, y: top.top - 3, ph: r() * 10 });
        free = { x: free.x, w: free.w - 3 };
      } else if (extra < 0.28 && h > 30) {
        const fx = free.x + free.w - 1;
        B.f(fx, top.top - 7, 1, 7, 'steel', 'flat');
        B.flags.push({ x: fx + 1, y: top.top - 7, kind: r.pick(S.flags), ph: r() * 10 });
        free = { x: free.x, w: free.w - 2 };
      } else if (extra < 0.38 && row === 'front') {
        for (let i = 0; i < Math.min(free.w, 6); i += 2) { B.f(free.x + i, top.top - 1, 2, 1, r.pick(['tree', 'tree2', 'tree3']), 'front'); if (r() < 0.5) B.f(free.x + i, top.top - 2, 1, 1, 'grass', 'rim'); }
      } else if (extra < 0.55) {
        B.box(free.x + free.w - 3, top.top - 2, 3, 2, 'conc2', { side: 1, noEdge: true });
        free = { x: free.x, w: free.w - 4 };
      }
    }
    if (tall && r() < 0.3) {
      const gc = r.pick(['#ffffff', '#ffd27a', '#8fd0ff', '#ff8fb8', '#b5ff9a']);
      B.emit(top.x, top.top, top.w, 1, mat, gc, 'rim');
    }
    if (row === 'front') B.lightStrings.push({ x: top.x, w: top.w, y: top.top - 1, ph: r() * 10 });
    if (free && free.w >= 5) B.roofs.push({ x: free.x, w: free.w, y: top.top, row, ri: B.rects.length });
    return { x, w, h };
  };

  // GDR prefab slab ("Plattenbau"): uniform panel grid, stair-core stripes, flat roof.
  K.plattenbau = function (B, x, w, h, row, S) {
    const r = B.rng;
    const mat = r.pick(['conc', 'conc2', 'cream', 'white']);
    B.box(x, -h, w, h, mat, { win: { ww: 2, wh: 1, px: 3, py: 2, mx: 1, my: 2 }, bands: 2 });
    // coloured balcony stack / stair core
    const cx = x + 2 + r.int(0, Math.max(0, w - 6));
    B.f(cx, -h + 2, 2, h - 3, r.pick(['terra', 'red', 'copper', 'gold']), 'front', { a: 0.55 });
    if (w >= 8 && h > 30) B.f(x, -h - 2, 3, 2, 'conc2', 'front');
    if (h > 40 && r() < 0.4) B.antenna(x + w - 3, -h, r.int(4, 8));
    B.roofs.push({ x: x + 4, w: w - 6, y: -h, row, ri: B.rects.length });
    return { x, w, h };
  };

  // Simple pitched roof sitting on a block's top edge.
  K.pitchedRoof = function (B, x, top, w, mat) {
    const rows = Math.max(2, Math.floor(w / 3));
    for (let i = 0; i < rows; i++) {
      const inset = Math.round((i * w) / (rows * 2.2));
      B.f(x + inset, top - 1 - i, w - inset * 2, 1, mat, i === rows - 1 ? 'rim' : 'front');
      B.f(x + w - inset - 1, top - 1 - i, 1, 1, mat, 'sideR');
    }
  };

  K.distant = function (B, x, w, h, far, style) {
    const S = st(style);
    const r = B.rng;
    const mat = r.pick(far ? S.distantMats[0] : S.distantMats[1]);
    const isGlass = mat.startsWith('glass');
    const win = far ? { ww: 1, wh: 1, px: 2, py: 3, my: 2 } : isGlass ? { office: true, py: 2, mx: 1 } : { ww: 1, wh: 1, px: 2, py: 2 };
    let top = -h, bx = x, bw = w;
    if (!far && h > 40 && r() < 0.35) {
      const h1 = Math.floor(h * 0.65);
      B.box(x, -h1, w, h1, mat, { glass: isGlass, win, side: w > 8 ? 1 : 0 });
      bx = x + 2; bw = w - 4; top = -h;
      B.box(bx, top, bw, h - h1, mat, { glass: isGlass, win, side: 1 });
    } else B.box(x, top, w, h, mat, { glass: isGlass, win, side: far ? 0 : w > 8 ? 1 : 0 });
    if (h > (far ? 32 : 50) && r() < 0.35) B.antenna(bx + (bw >> 1), top, r.int(4, 10));
    else if (!far && r() < S.distantWaterTowers && bw > 5) B.waterTower(bx + 3, top);
  };

  // Fill [x0, x1) with buildings from a height envelope. `fn` is K.generic or K.distant-like.
  K.fillRow = function (B, x0, x1, o) {
    const r = B.rng;
    for (let x = x0; x < x1;) {
      const w = r.int(o.minW, o.maxW);
      if (o.skip && o.skip(x, w)) { x += w; continue; }
      let h = o.height(x + w / 2, w);
      if (h >= (o.minH || 6)) o.build(x, w, Math.round(h));
      x += w + r.int(o.gapMin != null ? o.gapMin : 0, o.gapMax != null ? o.gapMax : 2);
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Terrain & nature

  // Mountain / hill silhouette from a height profile (world x -> height above ground, 0 = none).
  // Rock faces where steep, vegetation texture elsewhere; the sunny side is lighter.
  K.mountain = function (B, x0, x1, profile, o) {
    o = o || {};
    const r = B.rng;
    const veg = o.veg || ['tree', 'tree2', 'tree3'];
    const rock = o.rock || 'granite';
    let prevH = profile(x0 - 1);
    for (let x = x0; x < x1; x++) {
      const h = Math.round(profile(x));
      if (h <= 0) { prevH = 0; continue; }
      const nextH = profile(x + 1);
      const slope = Math.abs(nextH - prevH) / 2;
      const steep = slope > (o.rockSlope || 1.6);
      // column: rim, then texture down to ground
      for (let y = -h; y < 0; y += 2) {
        const depth = y + h;
        let m;
        if (steep && depth < h * 0.9) m = rock;
        else m = veg[(PS.hash(x, y) * veg.length) | 0];
        if (o.bareTop && depth < o.bareTop) m = rock;
        const k = depth === 0 ? 'rim' : nextH > prevH ? 'sideL' : nextH < prevH ? 'sideR' : 'front';
        B.f(x, y, 1, Math.min(2, -y), m, depth < 2 ? 'rim' : k);
      }
      prevH = h;
    }
    B.rects.push({ x: x0, y: -Math.round(profile((x0 + x1) / 2)), w: x1 - x0, h: 1 });
  };

  // Houses stacked up a hillside (favelas in Rio, SF hills). Returns lights for night twinkle.
  K.hillHouses = function (B, x0, x1, profile, o) {
    o = o || {};
    const r = B.rng;
    const mats = o.mats || ['terra', 'brick3', 'cream', 'white', 'red', 'copper', 'gold', 'brick'];
    const density = o.density || 0.8;
    for (let x = x0; x < x1; x += r.int(3, 5)) {
      const ground = Math.round(profile(x));
      if (ground <= 4) continue;
      for (let y = -ground + r.int(1, 3); y < -2; y += r.int(3, 5)) {
        if (r() > density) continue;
        const w = r.int(3, 5), h = r.int(2, 4);
        const m = r.pick(mats);
        B.f(x, y - h, w - 1, h, m, 'front');
        B.f(x + w - 1, y - h, 1, h, m, 'sideR');
        B.f(x, y - h, w, 1, m, 'rim');
        if (w >= 3) B.win(x + 1, y - h + 1, 1, 1, m, { th: r() * 0.9 });
      }
    }
  };

  // Palm tree: curved trunk + frond crown. `lean` in px, `h` trunk height.
  K.palm = function (B, x, base, h, lean, o) {
    o = o || {};
    const trunk = o.trunk || 'wood';
    const leaf = o.leaf || ['tree', 'tree2', 'tree3'];
    let tx = x;
    for (let i = 0; i < h; i++) {
      const k = i / h;
      tx = x + Math.round(lean * k * k);
      B.f(tx, base - i - 1, 1, 1, trunk, i % 3 ? 'front' : 'sideR');
    }
    const cy = base - h;
    const fronds = [[-5, 2], [-4, 0], [-2, -2], [2, -2], [4, 0], [5, 2], [-3, 3], [3, 3]];
    for (const [dx, dy] of fronds) B.line(tx, cy, tx + dx, cy + dy, leaf[(Math.abs(dx + dy) % leaf.length)], 'front');
    B.f(tx - 1, cy - 1, 3, 2, leaf[0], 'rim');
    if (o.coconuts) B.f(tx - 1, cy + 1, 2, 1, 'brown', 'front');
    return { x: tx, y: cy };
  };

  // ---------------------------------------------------------------------------------------------
  // Shore: the strip between the buildings (y=0) and the waterline (y=5).
  // kind: 'road' (NYC FDR), 'beach' (sand + palms), 'quay' (stone embankment).
  K.shore = function (B, W, o) {
    const r = B.rng;
    const skip = o.skip || (() => false);
    if (o.kind === 'beach') {
      B.f(0, 0, W, 1, 'conc', 'rim');           // beachfront avenue kerb
      B.f(0, 1, W, 1, 'asphalt', 'flat');
      B.f(0, 2, W, 3, 'sand', 'front');
      B.f(0, 2, W, 1, 'sand', 'rim');
      for (let x = r.int(2, 8); x < W; x += r.int(o.palmGap ? o.palmGap[0] : 7, o.palmGap ? o.palmGap[1] : 16)) {
        if (skip(x)) continue;
        K.palm(B, x, 1, r.int(7, 12), r.int(-3, 3), { coconuts: r() < 0.5 });
      }
    } else if (o.kind === 'quay') {
      B.f(0, 0, W, 1, 'stone', 'rim');
      B.f(0, 1, W, 3, 'stone', 'front');
      B.f(0, 4, W, 1, 'stone', 'dark');
      for (let x = 0; x < W; x += 6) B.f(x, 1, 1, 3, 'stone', 'dark', { a: 0.4 });
    } else {
      B.f(0, 0, W, 1, 'conc', 'rim');
      B.f(0, 1, W, 3, 'asphalt', 'flat');
      B.f(0, 4, W, 1, 'stone', 'dark');
    }
    if (o.lamps !== false) {
      for (let x = 3; x < W; x += o.lampGap || 12) {
        if (skip(x)) continue;
        B.f(x, -4, 1, 4, 'conc2', 'sideR', { a: 0.7 });
        B.emit(x - 1, -5, 2, 1, 'conc2', o.lampColor || '#ffd98a', 'sideR');
        B.lamps.push({ x, y: -5 });
      }
    }
    if (o.trees) {
      for (let x = 8; x < W; x += r.int(10, 30)) {
        if (skip(x)) continue;
        const tm = r.pick(['tree', 'tree2', 'tree3']);
        B.f(x, -3, 3, 2, tm, 'front'); B.f(x + 1, -4, 2, 1, tm, 'rim'); B.f(x + 1, -1, 1, 1, 'dark', 'flat');
      }
    }
  };

  // Rooftops for actors: prefer sky behind them, drop occluded ones and excluded spans.
  K.finalizeRoofs = function (B, exclude) {
    const bad = (x) => (exclude || []).some(([a, b]) => x > a - 4 && x < b + 4);
    B.roofs = B.roofs.filter((rf) => !bad(rf.x) && !bad(rf.x + rf.w));
    for (const rf of B.roofs) {
      const over = (q) => q.x < rf.x + rf.w + 1 && q.x + q.w > rf.x - 1;
      rf.sky = !B.rects.some((q) => over(q) && q.y < rf.y - 3);
      rf.occluded = B.rects.slice(rf.ri).some((q) => over(q) && q.y < rf.y + 1);
    }
    B.roofs = B.roofs.filter((rf) => !rf.occluded);
  };

  // Suspension / cable bridge helper: catenary cable as 1px dots. Returns the points.
  K.cable = function (B, xa, ya, xb, yb, sag, mat, o) {
    const pts = [];
    const n = Math.abs(xb - xa);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([Math.round(xa + (xb - xa) * t), Math.round(ya + (yb - ya) * t + sag * 4 * t * (1 - t))]);
    }
    let prev = null;
    for (const [x, y] of pts) {
      if (prev && Math.abs(prev[1] - y) > 1) B.f(x, Math.min(prev[1], y) + 1, 1, Math.abs(prev[1] - y) - 1, mat || 'dark', 'flat', o);
      B.f(x, y, 1, 1, mat || 'dark', 'flat', o);
      prev = [x, y];
    }
    return pts;
  };

  // ---------------------------------------------------------------------------------------------
  // City registry (for the C key / rotation)
  PS.cityList = PS.cityList || [];
  PS.registerCity = function (key, name, build) {
    PS.cities = PS.cities || {};
    PS.cities[key] = build;
    if (!PS.cityList.some((c) => c.key === key)) PS.cityList.push({ key, name });
  };
})();
