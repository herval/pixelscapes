'use strict';
// Berlin, seen along the Spree: long rows of Altbau, GDR Plattenbau, cranes, copper domes and the
// Fernsehturm towering over everything. The yellow U1 rattles across the Oberbaum Bridge.
(function () {
  const PS = window.PS;
  const { hex } = PS;
  const gauss = (x, c, s) => PS.kit.gauss(x, c, s, WM);

  const WM = 2400;

  // Stucco facades of the Gruenderzeit blocks: cream, ochre, grey, rose, sand...
  const STUCCO = ['#e4d6b4', '#dcc08e', '#cdc6b6', '#d9ab94', '#bdb9aa', '#ebe2cf', '#aaa49a', '#c9aa7e', '#a8b0ab', '#e2c77c', '#bcc6a4', '#d4b8a8', '#e8d8c0', '#c4b49c'];
  const ZINC = '#6f7682', SLATE = '#5d5a64', TILE = '#a8483a', TILE2 = '#b8603f';
  const SHOP = ['#ffcf80', '#ffe2a8', '#ff9f6b', '#a8e0ff', '#ffd27a'];
  const BRICK_R = '#a4503a', SAND = '#c9bb9c', DOMSTONE = '#b3aa96';

  const STYLE = {
    glassChance: 0.4,
    glass: ['glass2', 'glassD', 'glass', 'glassG'],
    front: STUCCO,
    back: ['#cdc6b6', '#bdb9aa', '#c9aa7e', '#aaa49a', '#d9c9a8', '#b8b0a0', 'conc', 'conc2', '#a8b0ab', '#c4b49c'],
    setbacks: 0.12,
    fireEscapes: 0,
    signs: 0,
    shopGlow: 0,
    waterTowers: [0, 0],
    crowns: false,
    flags: ['de', 'de', 'eu', 'pride', 'red'],
    balconies: 0.15,
    plattenbau: 0,
    pitchedRoofs: 0.6,
    roofMats: [TILE, ZINC, SLATE, TILE2, 'copper', ZINC],
    distantMats: [['conc2', 'stone', '#a8a39a', '#9a8a80', 'glass2', '#b0aca4'], ['#c9c2b4', '#b8b0a0', 'conc', 'conc2', '#a86050', 'glass2', '#d9c9a8', 'stone', '#b4b0a6']],
    distantWaterTowers: 0,
  };

  // ---------------------------------------------------------------------------------------------
  // Shape helpers

  // Half-ellipse dome standing on baseY, lit from the sides; returns the row spans.
  function dome(B, cx, baseY, rw, rh, mat, o) {
    o = o || {};
    const gl = o.glowKey ? { glowKey: o.glowKey } : null;
    const rows = [];
    for (let i = 0; i < rh; i++) {
      const t = (i + 0.5) / rh;
      const hw = rw * Math.sqrt(Math.max(0, 1 - t * t));
      rows.push([Math.round(cx - hw), Math.round(cx + hw), baseY - 1 - i, hw]);
    }
    for (let i = 0; i < rows.length; i++) {
      const [x0, x1, y] = rows[i];
      const w = x1 - x0;
      if (w <= 0) continue;
      if (w <= 2) { B.f(x0, y, w, 1, mat, 'rim', gl); continue; }
      const l = Math.max(1, Math.round(w * 0.28)), r = Math.max(1, Math.round(w * 0.28));
      B.f(x0, y, l, 1, mat, 'sideL', gl);
      B.f(x0 + l, y, w - l - r, 1, mat, 'front', gl);
      B.f(x1 - r, y, r, 1, mat, 'sideR', gl);
      const nx = rows[i + 1];
      const n0 = nx && nx[1] > nx[0] ? nx[0] : x1, n1 = nx && nx[1] > nx[0] ? nx[1] : x1;
      if (n0 > x0) B.f(x0, y, Math.min(n0 - x0, w), 1, mat, 'rim', gl);
      if (n1 < x1 && nx && nx[1] > nx[0]) B.f(n1, y, x1 - n1, 1, mat, 'rim', gl);
    }
    if (o.ribs) {
      for (const f of o.ribs) for (let i = 1; i < rows.length - 1; i++) {
        const [, , y, hw] = rows[i];
        B.f(Math.round(cx + f * hw - 0.5), y, 1, 1, o.ribMat || mat, o.ribK || 'dark', { a: o.ribA || 0.3 });
      }
    }
    return rows;
  }

  // Full pixel circle (the Fernsehturm sphere, balloons...). Returns row spans.
  function sphere(B, cx, cy, r, mat, o) {
    o = o || {};
    const gl = o.glowKey ? { glowKey: o.glowKey } : null;
    const rows = [];
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.floor(Math.sqrt((r + 0.5) * (r + 0.5) - dy * dy));
      rows.push([cx - hw, cx + hw + 1, cy + dy, dy]);
    }
    for (let i = 0; i < rows.length; i++) {
      const [x0, x1, y, dy] = rows[i];
      const w = x1 - x0;
      const l = Math.max(1, Math.round(w * 0.3)), rr = Math.max(1, Math.round(w * 0.3));
      if (w <= 3) { B.f(x0, y, w, 1, mat, dy < 0 ? 'rim' : 'sideR', gl); continue; }
      B.f(x0, y, l, 1, mat, 'sideL', gl);
      B.f(x0 + l, y, w - l - rr, 1, mat, 'front', gl);
      B.f(x1 - rr, y, rr, 1, mat, 'sideR', gl);
      if (dy < 0) {
        const up = rows[i - 1];
        if (up) {
          if (up[0] > x0) B.f(x0, y, up[0] - x0, 1, mat, 'rim', gl);
          if (up[1] < x1) B.f(up[1], y, x1 - up[1], 1, mat, 'rim', gl);
        }
      }
      if (dy > r * 0.3) B.f(x0, y, w, 1, 'dark', 'flat', { a: 0.12 + 0.3 * (dy / r) });
    }
    return rows;
  }

  // Shaded vertical strip with a simple left/right light split (round towers, shafts).
  function roundCol(B, x, y, w, h, mat, o) {
    const gl = o && o.glowKey ? { glowKey: o.glowKey } : null;
    if (w <= 2) { B.f(x, y, w, h, mat, 'front', gl); return; }
    const l = Math.max(1, Math.round(w * 0.3));
    B.f(x, y, l, h, mat, 'sideL', gl);
    B.f(x + l, y, w - 2 * l, h, mat, 'front', gl);
    B.f(x + w - l, y, l, h, mat, 'sideR', gl);
  }

  function chimney(B, x, top, h) {
    B.f(x, top - h, 1, h, 'brick2', 'front');
    B.f(x, top - h, 1, 1, 'conc2', 'rim');
  }

  // ---------------------------------------------------------------------------------------------
  // Roofs

  // Mansard: steep zinc/slate slope with dormers, flat top (actors can stand on it).
  function mansard(B, x, top, w, mat) {
    const r = B.rng;
    const ins = [0, 1, 1, 2];
    for (let i = 0; i < 4; i++) {
      const y = top - 1 - i, a = x + ins[i], b = x + w - ins[i];
      B.f(a, y, b - a, 1, mat, i === 3 ? 'rim' : 'front');
      B.f(b - 1, y, 1, 1, mat, 'sideR');
      if (i < 3 && ins[i + 1] > ins[i]) { B.f(a, y, 1, 1, mat, 'rim'); B.f(b - 1, y, 1, 1, mat, 'rim'); }
    }
    // dormers with (sometimes lit) attic windows
    const step = r.pick([3, 4, 4, 5]);
    for (let dx = x + 2 + r.int(0, 1); dx < x + w - 3; dx += step) {
      if (r() < 0.2) continue;
      B.f(dx, top - 3, 2, 1, mat, 'rim');
      B.win(dx, top - 2, 1, 1, '#d8d0c0');
      B.f(dx + 1, top - 2, 1, 1, '#d8d0c0', 'sideR');
    }
    if (r() < 0.7) chimney(B, x + r.int(2, Math.max(2, w - 3)), top - 4, 2);
    return { x: x + 2, w: w - 4, y: top - 4 };
  }

  // Hip roof of red tiles, with chimneys.
  function hipRoof(B, x, top, w, mat) {
    const r = B.rng;
    const n = Math.max(3, Math.min(5, Math.floor(w / 3.2)));
    let prev = null;
    for (let i = 0; i < n; i++) {
      const inset = Math.round((i * w * 0.4) / n);
      const a = x + inset, b = x + w - inset, y = top - 1 - i;
      if (b - a < 1) break;
      B.f(a, y, b - a, 1, mat, i === n - 1 ? 'rim' : 'front');
      B.f(b - 1, y, 1, 1, mat, 'sideR');
      prev = [a, b, y];
      const nIn = Math.round(((i + 1) * w * 0.4) / n);
      if (i < n - 1 && nIn > inset) { B.f(a, y, nIn - inset, 1, mat, 'rim'); B.f(b - (nIn - inset), y, nIn - inset, 1, mat, 'rim'); }
    }
    if (r() < 0.8) chimney(B, x + r.int(2, Math.max(2, w - 3)), top - 2, r.int(3, 4));
    if (r() < 0.5) chimney(B, x + r.int(2, Math.max(2, w - 3)), top - 2, 3);
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Buildings

  // Gruenderzeit block front: stucco, tall windows, shops at street level, mansard or tile roof.
  function altbau(B, x, w, h, o) {
    o = o || {};
    const r = B.rng;
    const kind = o.kind || (r() < 0.1 ? 'brick' : r() < 0.08 ? 'modern' : 'stucco');
    const mat = kind === 'brick' ? r.pick(['#b8664c', '#a85a44', '#c07a58']) : kind === 'modern' ? r.pick(['#e8e6e0', '#d8dadc', '#c8ccd0']) : r.pick(STUCCO);
    if (kind === 'modern') {
      B.box(x, -h, w, h, mat, { win: { office: true, py: 3, mx: 1, my: 2, mb: 4 }, side: 1, noEdge: true });
      B.f(x, -4, w - 1, 4, 'glass2', 'front');
      B.emit(x + 1, -3, w - 3, 2, 'glass2', '#ffe8c0', 'front');
      B.f(x + 1, -h - 2, Math.min(w - 2, 5), 2, 'glass', 'front', { a: 0.8 });
      const rf = { x: x + 7, w: w - 8, y: -h, row: 'front', ri: B.rects.length };
      if (rf.w >= 5) B.roofs.push(rf);
      B.lightStrings.push({ x, w, y: -h - 1, ph: r() * 10 });
      return;
    }
    const px = w >= 12 && r() < 0.45 ? 3 : 2;
    B.box(x, -h, w, h, mat, { win: { ww: 1, wh: 2, px, py: 3, mx: 1, my: 2, mb: 5 }, side: 1, noEdge: true });
    B.f(x, -h + 1, w, 1, 'dark', 'flat', { a: 0.22 });                   // cornice shadow
    B.f(x, -5, w, 1, mat, 'rim', { a: 0.55 });                           // string course over the shops
    B.f(x, -4, w - 1, 4, 'dark', 'flat', { a: 0.16 });
    for (let sx = x + 1; sx < x + w - 3; sx += r.pick([3, 4])) {
      if (r() < 0.25) continue;
      B.emit(sx, -3, 2, 2, mat, r.pick(SHOP), 'dark');
    }
    if (kind === 'stucco' && r() < 0.3 && w >= 10) {                     // cast-iron balconies
      const bx = x + (w >> 1) - 2;
      for (let y = -h + 4; y < -6; y += 3) B.f(bx, y + 1, 5, 1, 'black', 'flat', { a: 0.45 });
    }
    if (r() < 0.12) B.signs.push({ x: x + 1 + r.int(0, Math.max(0, w - 5)), y: -4, w: r.int(2, 3), h: 1, c: r.pick(['#ff3a7a', '#3af0ff', '#ffd23a', '#5aff8a']), flick: r() < 0.3 });
    // roof
    const roll = r();
    let flat = null;
    if (o.flatRoof || roll < 0.08) {
      B.f(x + 1, -h - 1, w - 2, 1, 'conc2', 'rim');
      flat = { x: x + 1, w: w - 2, y: -h - 1 };
      if (r() < 0.5) { for (let i = 0; i < Math.min(w - 2, 6); i += 2) B.f(x + 1 + i, -h - 2, 2, 1, r.pick(['tree', 'tree2', 'tree3']), 'front'); flat = null; }
    } else if (roll < 0.62) flat = mansard(B, x, -h, w, r.pick([ZINC, ZINC, SLATE, '#7a7470']));
    else hipRoof(B, x, -h, w, r.pick([TILE, TILE2, TILE, '#9a4a3a']));
    if (flat && flat.w >= 5) B.roofs.push({ x: flat.x, w: flat.w, y: flat.y, row: 'front', ri: B.rects.length });
    B.lightStrings.push({ x, w, y: -h - 1, ph: r() * 10 });
  }

  // Corner turret with a little onion/helmet dome (Eckturm).
  function eckturm(B, x, h, mat) {
    B.box(x, -h - 6, 5, h + 6, mat, { win: { ww: 1, wh: 2, px: 2, py: 3, mx: 1, my: 2, mb: 5 }, side: 1 });
    dome(B, x + 2.5, -h - 6, 3, 4, 'copper');
    B.f(x + 2, -h - 12, 1, 2, 'gold', 'rim');
  }

  function altbauRow(B, x0, x1, hBase) {
    const r = B.rng;
    let x = x0, block = 0;
    while (x < x1 - 5) {
      if (block > 3 && r() < 0.12) { x += r.int(3, 5); block = 0; continue; }  // side street
      const w = Math.min(x1 - x, r.int(9, 17));
      if (w < 6) break;
      const h = hBase + r.int(-1, 2);
      altbau(B, x, w, h);
      if (block === 0 && r() < 0.35) eckturm(B, x, h, r.pick(STUCCO));
      x += w; block++;
    }
  }

  // GDR prefab slab: panel grid, coloured loggia stacks, stair core, rooftop kit.
  function platte(B, x, w, h, o) {
    o = o || {};
    const r = B.rng;
    const mat = o.mat || r.pick(['#d6d2c6', '#cfcabb', '#bdbab2', '#e2ddd0', '#c8c0ae', '#d0d4d6']);
    B.box(x, -h, w, h, mat, { win: { ww: 2, wh: 1, px: 3, py: 2, mx: 1, my: 2, mb: 2 }, side: w >= 14 ? 2 : 1 });
    for (let y = -h + 3; y < -1; y += 2) B.f(x, y, w, 1, mat, 'dark', { a: 0.1 });         // panel joints
    const fw = w - (w >= 14 ? 2 : 1);
    const cols = ['#d8844a', '#5aa8a0', '#e8c050', '#6a8ac8', '#c85a4a', '#8ab870'];
    const nStack = fw >= 18 ? 2 : fw >= 11 ? 1 : 0;
    const c = r.pick(cols);
    for (let s = 0; s < nStack; s++) {
      const sx = x + Math.round(((s + 1) * fw) / (nStack + 1)) - 1;
      for (let y = -h + 3; y < -2; y += 2) B.f(sx, y, 3, 1, c, 'front', { a: 0.85 });
    }
    B.f(x + 1, -h - 2, 3, 2, mat, 'front');                                                // lift housing
    if (h > 34 && r() < 0.5) B.antenna(x + w - 3, -h, r.int(4, 8));
    if (o.sign) {
      B.f(x + 3, -h - 4, 1, 4, 'dark', 'flat'); B.f(x + w - 5, -h - 4, 1, 4, 'dark', 'flat');
      B.emit(x + 2, -h - 5, w - 5, 2, 'dark', o.sign, 'flat');
    }
    B.roofs.push({ x: x + 5, w: w - 8, y: -h, row: 'back', ri: B.rects.length });
  }

  function backBuilding(B, x, w, h) {
    const r = B.rng;
    if (h >= 28 && w >= 12 && r() < 0.35) return platte(B, x, w, h, { sign: r() < 0.08 ? r.pick(['#ff5a4a', '#5ae0ff', '#ffd24a']) : null });
    return PS.kit.generic(B, x, w, h, 'back', STYLE);
  }

  // ---------------------------------------------------------------------------------------------
  // Landmarks

  // Fernsehturm: tapering concrete shaft, faceted steel sphere with its window ring, red/white antenna.
  function fernsehturm(B, cx) {
    const cy = -94, R = 9;
    // shaft (grouped rows of equal width)
    const shaftTop = cy + R - 1;
    let yy = 0;
    while (yy > shaftTop) {
      const f = -yy / -shaftTop;
      const w = Math.max(4, Math.round(7.4 - 3.6 * f));
      let y2 = yy;
      while (y2 > shaftTop && Math.max(4, Math.round(7.4 - 3.6 * (-y2 / -shaftTop))) === w) y2--;
      const hgt = yy - y2;
      roundCol(B, cx - (w >> 1), y2 + 1, w, hgt, '#dcdad4', { glowKey: 'bShaft' });
      yy = y2;
    }
    B.rects.push({ x: cx - 3, y: shaftTop, w: 7, h: -shaftTop });
    // collar under the sphere
    B.f(cx - 3, cy + R - 1, 7, 2, '#c8c8c4', 'front');
    // the sphere
    const rows = sphere(B, cx, cy, R, '#c9d0da', { glowKey: 'bTV' });
    // facet lines (steel panels)
    for (const [x0, x1, y, dy] of rows) {
      if (Math.abs(dy) >= R - 1) continue;
      for (const f of [-0.62, -0.25, 0.25, 0.62]) B.f(Math.round(cx + f * (x1 - x0) / 2), y, 1, 1, '#9aa2ae', 'dark', { a: 0.35 });
    }
    // window ring (observation deck + restaurant), glowing at night
    for (const dy of [-2, -1]) {
      const row = rows[dy + R];
      B.f(row[0] + 1, cy + dy, row[1] - row[0] - 2, 1, 'glassD', dy === -2 ? 'dark' : 'front');
      for (let x = row[0] + 1; x < row[1] - 1; x += 2) B.emit(x, cy + dy, 1, 1, 'glassD', dy === -2 ? '#ffe6a8' : '#ffd07a', 'dark');
    }
    const r1 = rows[1 + R];
    B.f(r1[0] + 1, cy + 1, r1[1] - r1[0] - 2, 1, 'steel', 'rim', { a: 0.5 });
    // sunlight cross ("Rache des Papstes")
    B.f(cx - 4, cy - 5, 1, 3, 'steel', 'glint', { a: 0.9 }); B.f(cx - 5, cy - 4, 3, 1, 'steel', 'glint', { a: 0.9 });
    B.rects.push({ x: cx - R, y: cy - R, w: 2 * R + 1, h: 2 * R + 1 });
    // upper shaft + antenna
    const top0 = cy - R;
    B.f(cx - 1, top0 - 8, 3, 8, '#e6e4de', 'front'); B.f(cx + 1, top0 - 8, 1, 8, '#e6e4de', 'sideR');
    B.f(cx - 2, top0 - 9, 5, 1, '#e6e4de', 'rim');
    let y = top0 - 9;
    let k = 0;
    while (y > top0 - 36) { B.f(cx - 1, y - 3, 2, 3, k % 2 ? '#f2f0ea' : '#d23a30', 'front'); B.f(cx, y - 3, 1, 3, k % 2 ? '#f2f0ea' : '#d23a30', 'sideR'); y -= 3; k++; }
    while (y > top0 - 56) { B.f(cx, y - 3, 1, 3, k % 2 ? '#f2f0ea' : '#d23a30', 'front'); y -= 3; k++; }
    B.blink(cx, y - 1, { period: 1.9 });
    B.blink(cx, top0 - 30, { period: 2.3 });
    B.blink(cx - 2, top0 - 9, { period: 2.7 });
    return { x: cx, cy, R, sphereTop: cy - R, tip: y - 1, rows };
  }

  function parkInn(B, cx) {
    B.box(cx - 24, -28, 48, 28, '#c9c4b8', { win: { office: true, py: 3, mx: 1, my: 3 }, side: 3 });
    B.box(cx - 11, -68, 22, 68, '#c8cbcc', { win: { ww: 1, wh: 1, px: 2, py: 2, mx: 1, my: 3 }, side: 3 });
    B.f(cx - 11, -68, 22, 2, 'glassD', 'dark', { a: 0.7 });
    B.f(cx - 11, -69, 22, 1, '#c8cbcc', 'rim');
    B.f(cx - 7, -72, 14, 3, '#c8cbcc', 'front'); B.f(cx - 7, -72, 14, 1, '#c8cbcc', 'rim');
    B.emit(cx - 6, -71, 12, 1, 'dark', '#ff4a4a', 'flat');
    B.antenna(cx + 5, -72, 6);
    B.roofs.push({ x: cx - 23, w: 10, y: -28, row: 'lm', ri: B.rects.length });
  }

  function rotesRathaus(B, cx) {
    const W = 52, H = 30;
    B.box(cx - W / 2, -H, W, H, BRICK_R, { win: { ww: 1, wh: 2, px: 3, py: 4, mx: 2, my: 3 }, side: 3, glowKey: 'bRath' });
    for (const y of [-H + 1, -18, -9]) B.f(cx - W / 2, y, W, 1, SAND, 'rim', { a: 0.6 });
    for (let x = cx - W / 2 + 1; x < cx + W / 2 - 1; x += 3) B.f(x, -H - 1, 1, 1, BRICK_R, 'rim', { glowKey: 'bRath' });
    // tower
    B.box(cx - 5, -52, 10, 22, BRICK_R, { side: 2, glowKey: 'bRath' });
    for (const y of [-51, -44, -38]) B.f(cx - 5, y, 10, 1, SAND, 'rim', { a: 0.7 });
    B.f(cx - 3, -49, 1, 4, 'glassD', 'dark'); B.f(cx, -49, 1, 4, 'glassD', 'dark'); B.f(cx + 2, -49, 1, 4, 'glassD', 'dark');
    B.emit(cx - 1, -42, 2, 2, 'cream', '#fff0c0', 'rim'); // clock
    B.box(cx - 4, -58, 8, 6, BRICK_R, { side: 1, glowKey: 'bRath' });
    B.f(cx - 2, -57, 1, 3, 'glassD', 'dark'); B.f(cx + 1, -57, 1, 3, 'glassD', 'dark');
    for (const px of [cx - 5, cx + 4]) { B.f(px, -61, 1, 4, BRICK_R, 'rim'); B.f(px, -62, 1, 1, 'copper', 'rim'); }
    B.f(cx - 4, -59, 8, 1, SAND, 'rim');
    B.f(cx, -68, 1, 9, 'steel', 'flat');
    B.flags.push({ x: cx + 1, y: -68, kind: 'de', ph: 1.3 });
    return { x: cx - W / 2, y: -H, w: W, h: H };
  }

  function marienkirche(B, cx) {
    B.box(cx - 4, -40, 8, 40, BRICK_R, { side: 2 });
    B.f(cx - 2, -36, 1, 3, 'glassD', 'dark'); B.f(cx + 1, -36, 1, 3, 'glassD', 'dark');
    B.f(cx - 5, -41, 10, 1, 'copper', 'rim');
    B.box(cx - 3, -46, 6, 5, 'copper', { side: 1 });
    B.f(cx - 2, -48, 4, 2, 'copper', 'front'); B.f(cx - 2, -48, 4, 1, 'copper', 'rim');
    B.f(cx - 1, -53, 2, 5, 'copper', 'front'); B.f(cx, -53, 1, 5, 'copper', 'sideR');
    B.f(cx, -60, 1, 7, 'copper', 'rim');
    B.f(cx, -62, 1, 2, 'gold', 'rim'); B.f(cx - 1, -61, 3, 1, 'gold', 'rim');
  }

  function nikolaikirche(B, cx) {
    B.box(cx - 8, -26, 16, 26, SAND, { side: 2 });
    for (const tx of [cx - 7, cx + 3]) {
      B.box(tx, -36, 4, 10, SAND, { side: 1 });
      B.f(tx + 1, -34, 1, 2, 'glassD', 'dark');
      for (let i = 0; i < 10; i++) {
        const w = i < 3 ? 4 : i < 7 ? 2 : 1;
        const xx = tx + ((4 - w) >> 1) + (w === 1 ? 1 : 0);
        B.f(xx, -37 - i, w, 1, 'copper', i === 9 ? 'rim' : 'front');
        if (w > 1) B.f(xx + w - 1, -37 - i, 1, 1, 'copper', 'sideR');
      }
    }
  }

  function humboldtForum(B, cx) {
    const W = 54, H = 27, mat = '#d9c6a0';
    B.box(cx - W / 2, -H, W, H, mat, { win: { ww: 1, wh: 2, px: 3, py: 4, mx: 2, my: 3 }, side: 3, glowKey: 'bHum' });
    B.f(cx - W / 2, -H - 1, W, 1, mat, 'rim', { glowKey: 'bHum' });
    B.f(cx - W / 2, -8, W, 1, mat, 'rim', { a: 0.5 });
    B.box(cx - 7, -H - 6, 14, H + 6, mat, { side: 2, glowKey: 'bHum', win: { ww: 1, wh: 2, px: 3, py: 4, mx: 2, my: 3 } });
    for (let x = cx - 6; x < cx + 6; x += 2) B.f(x, -H - 5, 1, H - 2, mat, 'rim', { a: 0.35 });
    B.f(cx - 2, -8, 4, 8, 'glassD', 'dark', { a: 0.7 });
    B.box(cx - 5, -H - 10, 10, 4, mat, { side: 1, glowKey: 'bHum' });
    dome(B, cx, -H - 10, 5.5, 7, 'copper', { glowKey: 'bDomC', ribs: [-0.5, 0.5] });
    B.f(cx - 1, -H - 19, 2, 2, 'copper', 'front');
    B.f(cx - 1, -H - 22, 1, 3, 'gold', 'rim'); B.f(cx - 2, -H - 21, 3, 1, 'gold', 'rim');
    return { x: cx - W / 2, y: -H, w: W, h: H };
  }

  function berlinerDom(B, cx) {
    const W = 62, H = 30, mat = DOMSTONE;
    const x0 = cx - W / 2;
    B.box(x0, -H, W, H, mat, { side: 3, glowKey: 'bDom', win: { ww: 1, wh: 3, px: 4, py: 7, mx: 3, my: 4 } });
    B.f(x0, -H - 1, W, 1, mat, 'rim', { glowKey: 'bDom' });
    B.f(x0, -11, W, 1, mat, 'rim', { a: 0.5 });
    // portal + arched window above it, flanked by columns
    B.f(cx - 3, -9, 6, 9, 'glassD', 'dark', { a: 0.75 }); B.f(cx - 2, -10, 4, 1, 'glassD', 'dark', { a: 0.75 });
    B.f(cx - 3, -24, 6, 11, 'glassD', 'dark', { a: 0.55 }); B.f(cx - 2, -25, 4, 1, 'glassD', 'dark', { a: 0.55 });
    for (const x of [cx - 9, cx - 6, cx + 5, cx + 8]) B.f(x, -26, 1, 24, mat, 'rim', { a: 0.6 });
    // pediment
    for (let i = 0; i < 4; i++) B.f(cx - 9 + i * 2, -H - 2 - i, 18 - i * 4, 1, mat, 'rim', { glowKey: 'bDom' });
    // corner towers with small domes
    for (const tx of [x0, x0 + W - 10]) {
      B.box(tx, -H - 12, 10, H + 12, mat, { side: 2, glowKey: 'bDom' });
      B.f(tx + 3, -H - 9, 1, 4, 'glassD', 'dark'); B.f(tx + 6, -H - 9, 1, 4, 'glassD', 'dark');
      B.f(tx - 1, -H - 13, 12, 1, mat, 'rim', { glowKey: 'bDom' });
      dome(B, tx + 5, -H - 13, 4.6, 6, 'copper', { glowKey: 'bDomC', ribs: [0] });
      B.f(tx + 4, -H - 21, 2, 2, 'copper', 'front');
      B.f(tx + 4, -H - 23, 1, 2, 'gold', 'rim');
    }
    // drum with columns, then the great copper dome
    B.box(cx - 13, -H - 10, 26, 10, mat, { side: 3, glowKey: 'bDom' });
    for (let x = cx - 12; x < cx + 11; x += 2) B.f(x, -H - 8, 1, 7, 'glassD', 'dark', { a: 0.55 });
    B.f(cx - 14, -H - 11, 28, 1, mat, 'rim', { glowKey: 'bDom' });
    const top = -H - 11;
    dome(B, cx, top, 14.2, 15, 'copper', { glowKey: 'bDomC', ribs: [-0.75, -0.4, 0, 0.4, 0.75], ribMat: 'gold', ribK: 'front', ribA: 0.45 });
    // lantern + cross
    B.box(cx - 2, top - 20, 4, 5, mat, { side: 1, glowKey: 'bDom' });
    dome(B, cx, top - 20, 2.4, 3, 'copper', { glowKey: 'bDomC' });
    B.f(cx - 1, top - 27, 1, 4, 'gold', 'rim'); B.f(cx - 2, top - 26, 3, 1, 'gold', 'rim');
    return { x: x0, y: -H, w: W, h: H, top: top - 27 };
  }

  function bodeMuseum(B, cx) {
    const mat = '#c2b69c';
    B.box(cx - 22, -24, 44, 24, mat, { side: 3, win: { ww: 1, wh: 2, px: 3, py: 4, mx: 2, my: 3 }, glowKey: 'bBode' });
    B.f(cx - 22, -25, 44, 1, mat, 'rim');
    roundCol(B, cx - 9, -30, 18, 30, mat, { glowKey: 'bBode' });
    for (let x = cx - 8; x < cx + 8; x += 3) B.f(x, -28, 1, 6, 'glassD', 'dark', { a: 0.55 });
    B.f(cx - 10, -31, 20, 1, mat, 'rim');
    dome(B, cx, -31, 9.4, 9, 'copper', { glowKey: 'bDomC', ribs: [-0.5, 0, 0.5] });
    B.f(cx - 1, -43, 2, 3, mat, 'front');
    B.f(cx - 1, -45, 1, 2, 'gold', 'rim');
  }

  function reichstag(B, cx) {
    const W = 76, H = 23, mat = '#bfb193';
    const x0 = cx - W / 2;
    B.box(x0, -H, W, H, mat, { side: 3, glowKey: 'bReich', win: { ww: 1, wh: 2, px: 3, py: 5, mx: 2, my: 3 } });
    B.f(x0, -H - 1, W, 1, mat, 'rim', { glowKey: 'bReich' });
    B.f(x0, -8, W, 1, mat, 'rim', { a: 0.5 });
    // corner towers
    for (const tx of [x0 - 2, x0 + W - 10]) {
      B.box(tx, -H - 8, 12, H + 8, mat, { side: 2, glowKey: 'bReich', win: { ww: 1, wh: 2, px: 3, py: 5, mx: 2, my: 4 } });
      B.f(tx - 1, -H - 9, 14, 1, mat, 'rim', { glowKey: 'bReich' });
      B.f(tx + 5, -H - 16, 1, 7, 'steel', 'flat');
      B.flags.push({ x: tx + 6, y: -H - 16, kind: tx < cx ? 'de' : 'eu', ph: tx * 0.1 });
    }
    // portico: columns in front of a shadowed hall, pediment with the inscription
    const pw = 30, px0 = cx - pw / 2;
    B.f(px0, -H + 3, pw, H - 3, 'dark', 'flat', { a: 0.45 });
    for (let x = px0 + 1; x < px0 + pw - 1; x += 5) { B.f(x, -H + 3, 2, H - 4, mat, 'front', { glowKey: 'bReich' }); B.f(x, -H + 3, 1, H - 4, mat, 'rim', { glowKey: 'bReich', a: 0.6 }); }
    B.f(px0 - 1, -H + 1, pw + 2, 2, mat, 'front', { glowKey: 'bReich' });
    for (let x = px0 + 6; x < px0 + pw - 6; x += 2) B.f(x, -H + 1, 1, 1, 'dark', 'flat', { a: 0.5 });
    for (let i = 0; i < 5; i++) B.f(px0 + i * 3, -H - 1 - i, pw - i * 6, 1, mat, 'rim', { glowKey: 'bReich' });
    B.f(px0 - 1, -H, pw + 2, 1, mat, 'rim', { glowKey: 'bReich' });
    // glass dome (Foster): lit from inside at night, steel ribs and rings, mirror cone
    const base = -H - 2;
    B.f(cx - 13, base, 26, 2, mat, 'front', { glowKey: 'bReich' }); B.f(cx - 13, base, 26, 1, mat, 'rim');
    const rw = 11.6, rh = 11;
    const rows = [];
    for (let i = 0; i < rh; i++) {
      const t = (i + 0.5) / rh, hw = rw * Math.sqrt(1 - t * t);
      const a = Math.round(cx - hw), b = Math.round(cx + hw), y = base - 1 - i;
      rows.push([a, b, y, hw]);
      B.emit(a, y, b - a, 1, 'glass', i % 3 === 1 ? '#ffe2a0' : '#fff2c8', i === rh - 1 ? 'rim' : 'front');
      if (i % 3 === 0) B.f(a, y, b - a, 1, 'steel', 'rim', { a: 0.55 });
    }
    for (const f of [-0.8, -0.45, 0, 0.45, 0.8]) for (const [, , y, hw] of rows) B.f(Math.round(cx + f * hw - 0.5), y, 1, 1, 'steel', 'front', { a: 0.5 });
    for (let i = 0; i < 7; i++) B.f(cx - 1 - (i >> 2), base - 8 + i, 2 + ((i >> 2) << 1), 1, 'steel', 'glint', { a: 0.35 });
    for (let i = 0; i < rows.length; i++) { const [a, b, y] = rows[i]; const nx = rows[i + 1]; if (nx && nx[0] > a) { B.f(a, y, nx[0] - a, 1, 'glass', 'rim'); B.f(nx[1], y, b - nx[1], 1, 'glass', 'rim'); } }
    B.f(cx - 2, base - rh - 1, 5, 1, 'steel', 'rim');
    B.rects.push({ x: cx - 12, y: base - rh, w: 24, h: rh });
    return { x: x0, y: -H, w: W, h: H };
  }

  function brandenburgerTor(B, cx) {
    const mat = '#d6c49a';
    const W = 44, x0 = cx - W / 2;
    // side wings (guard houses)
    for (const wx of [x0 - 9, x0 + W + 1]) {
      B.box(wx, -9, 8, 9, mat, { side: 1, glowKey: 'bGate2' });
      for (let x = wx + 1; x < wx + 7; x += 2) B.f(x, -7, 1, 6, 'dark', 'flat', { a: 0.35 });
      B.f(wx - 1, -10, 10, 1, mat, 'rim', { glowKey: 'bGate2' });
    }
    // six Doric columns (five passages)
    const colH = 14;
    B.f(x0, -colH - 1, W, colH + 1, 'dark', 'flat', { a: 0.28 });
    for (let i = 0; i < 6; i++) {
      const x = x0 + 1 + Math.round((i * (W - 4)) / 5);
      B.f(x, -colH, 2, colH, mat, 'front', { glowKey: 'bGate2' });
      B.f(x, -colH, 1, colH, mat, 'rim', { glowKey: 'bGate2', a: 0.5 });
      B.f(x - 1, -1, 4, 1, mat, 'front', { glowKey: 'bGate2' });
    }
    // entablature, attic, reliefs
    B.f(x0 - 1, -colH - 4, W + 2, 4, mat, 'front', { glowKey: 'bGate1' });
    B.f(x0 - 1, -colH - 4, W + 2, 1, mat, 'rim', { glowKey: 'bGate1' });
    for (let x = x0; x < x0 + W; x += 3) B.f(x, -colH - 2, 1, 1, 'dark', 'flat', { a: 0.4 });
    B.f(x0 + 6, -colH - 8, W - 12, 4, mat, 'front', { glowKey: 'bGate0' });
    B.f(x0 + 6, -colH - 8, W - 12, 1, mat, 'rim', { glowKey: 'bGate0' });
    B.f(x0 + 10, -colH - 7, W - 20, 2, 'dark', 'flat', { a: 0.22 });
    B.f(x0 + W - 7, -colH - 8, 1, 4, mat, 'sideR', { glowKey: 'bGate0' });
    // quadriga: four horses, chariot, Victoria with her staff
    const qy = -colH - 8, qx = cx - 6;
    const Q = [
      '......k.....',
      '.....kkk....',
      '......k.....',
      '..k.k.kk....',
      '.kkkkkkkk...',
      'kkkkkkkkkkk.',
      '.kkkkkkkkk..',
      '.k.k.k.k.k..',
    ];
    for (let j = 0; j < Q.length; j++) {
      let i = 0;
      while (i < Q[j].length) {
        if (Q[j][i] !== 'k') { i++; continue; }
        let e = i; while (e < Q[j].length && Q[j][e] === 'k') e++;
        B.f(qx + i, qy - Q.length + j, e - i, 1, 'copper', j < 3 ? 'rim' : 'front', { glowKey: 'bDomC' });
        i = e;
      }
    }
    B.f(qx + 6, qy - 11, 1, 3, 'copper', 'rim');
    B.f(qx + 5, qy - 12, 3, 1, 'gold', 'rim');
    B.rects.push({ x: x0, y: -colH - 8, w: W, h: colH + 8 });
    return { x: x0, y: -colH - 8, w: W, h: colH + 8 };
  }

  function siegessaeule(B, cx) {
    B.box(cx - 5, -12, 10, 12, 'granite', { side: 2 });
    B.box(cx - 3, -18, 6, 6, '#b04a3a', { side: 1 });
    roundCol(B, cx - 1, -50, 3, 32, SAND);
    for (const y of [-26, -34, -42]) { B.f(cx - 2, y, 5, 2, 'gold', 'front', { glow: '#ffd070' }); B.f(cx - 2, y, 5, 1, 'gold', 'rim'); }
    B.f(cx - 2, -51, 5, 1, SAND, 'rim');
    // Goldelse
    B.f(cx, -56, 1, 5, 'gold', 'front', { glowKey: 'bSieg' });
    B.f(cx - 1, -55, 3, 1, 'gold', 'rim', { glowKey: 'bSieg' });
    B.f(cx - 2, -57, 1, 2, 'gold', 'rim', { glowKey: 'bSieg' }); B.f(cx + 2, -57, 1, 2, 'gold', 'rim', { glowKey: 'bSieg' });
    B.f(cx, -58, 1, 1, 'gold', 'rim', { glowKey: 'bSieg' });
  }

  function hauptbahnhof(B, cx) {
    // glass barrel vault
    const rw = 34, rh = 12, base = -8;
    B.box(cx - rw, base, 2 * rw, 8, 'glass2', { glass: true, side: 0, noEdge: true });
    for (let i = 0; i < rh; i++) {
      const t = (i + 0.5) / rh, hw = rw * Math.sqrt(1 - t * t);
      const a = Math.round(cx - hw), b = Math.round(cx + hw), y = base - 1 - i;
      B.glass(a, y, b - a, 1, 'glass', i > rh - 3 ? 'front' : 'sideL');
      if (i % 3 === 2) B.emit(a + 1, y, b - a - 2, 1, 'glass', '#dff0ff', 'rim');
    }
    for (let x = cx - rw + 4; x < cx + rw - 3; x += 6) B.f(x, base - 10, 1, 10, 'steel', 'flat', { a: 0.35 });
    // the two office "bows" bridging the hall
    for (const bx of [cx - 20, cx + 8]) B.box(bx, -44, 12, 44, 'glass2', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1, my: 2 } });
    B.box(cx - 20, -44, 40, 8, 'glass2', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1, my: 2 } });
    B.f(cx - 20, -45, 40, 1, 'steel', 'rim');
    B.emit(cx - 4, -42, 8, 2, 'glass2', '#f4f8ff', 'front');
    B.rects.push({ x: cx - 20, y: -44, w: 40, h: 44 });
  }

  function kollhoff(B, cx) {
    const mat = '#7a3e30';
    const win = { ww: 1, wh: 1, px: 2, py: 2, mx: 1, my: 2 };
    B.box(cx - 11, -52, 22, 52, mat, { win, side: 3 });
    B.box(cx - 9, -62, 18, 10, mat, { win, side: 2 });
    B.box(cx - 7, -70, 14, 8, mat, { win, side: 2 });
    B.box(cx - 4, -73, 8, 3, mat, { side: 1 });
    for (const y of [-52, -62, -70]) B.f(cx - 11 + (y === -52 ? 0 : y === -62 ? 2 : 4), y, y === -52 ? 22 : y === -62 ? 18 : 14, 1, 'copper', 'rim');
    B.f(cx, -80, 1, 7, 'steel', 'flat');
    B.flags.push({ x: cx + 1, y: -80, kind: 'de', ph: 3.1 });
  }

  function bahnTower(B, cx) {
    const H = 80, W = 18, x0 = cx - W / 2;
    const kinds = ['sideL', 'sideL', 'sideL', 'front', 'front', 'front', 'front', 'front', 'front', 'front', 'front', 'front', 'front', 'sideR', 'sideR', 'sideR', 'sideR', 'sideR'];
    let i = 0;
    while (i < W) { let e = i; while (e < W && kinds[e] === kinds[i]) e++; B.glass(x0 + i, -H, e - i, H, 'glass', kinds[i]); i = e; }
    for (let x = x0 + 2; x < x0 + W - 1; x += 3) B.f(x, -H + 1, 1, H - 1, 'glass2', 'dark', { a: 0.3 });
    const grid = { cols: [], rows: [], ww: 1, wh: 1 };
    for (let y = -H + 4; y < -2; y += 3) {
      let x = x0 + 1;
      while (x < x0 + W - 1) { const sw = Math.min(x0 + W - 1 - x, B.rng.int(3, 7)); B.win(x, y, sw, 1, 'glass', { office: true, lc: PS.OFFICE[1] }); x += sw; }
    }
    B.grids.push(grid);
    B.f(x0, -H - 1, W, 1, 'steel', 'rim');
    for (let r = 0; r < 4; r++) B.f(x0 + 2 + r * 2, -H - 2 - r, W - 4 - r * 3, 1, 'steel', r ? 'front' : 'rim', { a: 0.8 });
    B.f(x0 + 4, -H - 6, W - 11, 1, 'steel', 'rim');
    B.rects.push({ x: x0, y: -H, w: W, h: H });
    B.blink(x0 + 5, -H - 7, { period: 2.1 });
  }

  function sonyCenter(B, cx) {
    B.box(cx - 26, -30, 20, 30, 'glass2', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1 } });
    B.box(cx - 6, -26, 14, 26, 'glass', { glass: true, win: { office: true, py: 3, mx: 1 } });
    B.box(cx + 8, -33, 20, 33, 'glassD', { glass: true, mullions: 3, win: { office: true, py: 3, mx: 1 } });
    // the tent roof: concave cone on a ring, peak off-centre
    const peakX = cx + 3, peakY = -56, rimY = -34, hwMax = 28;
    const rows = [];
    for (let y = peakY; y <= rimY; y++) {
      const k = (y - peakY) / (rimY - peakY);
      const hw = hwMax * Math.pow(k, 1.55);
      const a = Math.round(peakX - hw - (1 - k) * 0), b = Math.round(peakX + hw) + 1;
      rows.push({ x: a, w: b - a, y });
      B.f(a, y, b - a, 1, '#eef0f2', y === rimY ? 'rim' : 'front', { a: 0.55 });
      B.f(a, y, 1, 1, 'steel', 'rim'); B.f(b - 1, y, 1, 1, 'steel', 'rim');
    }
    for (const dx of [-21, -12, -5, 5, 12, 21]) B.line(peakX, peakY + 1, peakX + dx, rimY, 'steel', 'flat', { a: 0.45 });
    B.f(cx - 26, rimY + 1, 56, 1, 'steel', 'rim');
    B.f(peakX, peakY - 8, 1, 8, 'steel', 'flat');
    B.blink(peakX, peakY - 9, { period: 2.5 });
    return rows;
  }

  function treptowers(B, cx) {
    B.box(cx - 16, -30, 12, 30, 'conc2', { win: { office: true, py: 3, mx: 1 }, side: 2 });
    B.box(cx + 6, -26, 12, 26, 'conc2', { win: { office: true, py: 3, mx: 1 }, side: 2 });
    B.box(cx - 7, -64, 14, 64, 'glass2', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1 } });
    B.f(cx - 7, -65, 14, 1, 'steel', 'rim');
    B.antenna(cx + 3, -65, 8);
  }

  // Oberhafen "Narva" tower with its glowing glass cube.
  function narvaTower(B, cx) {
    B.box(cx - 6, -44, 12, 44, '#b86a50', { win: { ww: 1, wh: 2, px: 2, py: 3, mx: 1, my: 2 }, side: 2 });
    B.f(cx - 7, -45, 14, 1, SAND, 'rim');
    B.glass(cx - 5, -55, 10, 10, 'glass', 'front');
    B.f(cx - 5, -55, 10, 1, 'steel', 'rim');
    for (let y = -53; y < -45; y += 2) B.emit(cx - 4, y, 8, 1, 'glass', '#bfe0ff', 'front');
    for (let x = cx - 5; x < cx + 5; x += 3) B.f(x, -55, 1, 10, 'steel', 'flat', { a: 0.5 });
    return { x: cx - 5, y: -55, w: 10, h: 10 };
  }

  function edgeEastSide(B, cx) {
    B.box(cx - 8, -40, 16, 40, 'glassG', { glass: true, mullions: 2, win: { office: true, py: 2, mx: 1 } });
    B.box(cx - 7, -62, 15, 22, 'glass', { glass: true, mullions: 3, win: { office: true, py: 2, mx: 1 } });
    B.box(cx - 8, -84, 16, 22, 'glassG', { glass: true, mullions: 2, win: { office: true, py: 2, mx: 1 } });
    B.f(cx - 8, -85, 16, 1, 'steel', 'rim');
    B.blink(cx, -86, { period: 2.4 });
  }

  function arena(B, cx) {
    B.box(cx - 30, -18, 60, 18, 'glassD', { glass: true, side: 3 });
    B.f(cx - 31, -19, 62, 1, 'steel', 'rim');
    B.emit(cx - 29, -15, 56, 3, 'glassD', '#4ab0ff', 'front');
    B.emit(cx - 29, -8, 56, 1, 'glassD', '#ffffff', 'front');
    B.rects.push({ x: cx - 30, y: -18, w: 60, h: 18 });
  }

  // Frankfurter Tor: the twin domed towers of Karl-Marx-Allee.
  function frankfurterTor(B, cx) {
    const mat = '#e2d8c2';
    for (const tx of [cx - 22, cx + 12]) {
      B.box(tx, -40, 10, 40, mat, { side: 2, win: { ww: 1, wh: 1, px: 2, py: 2, mx: 1, my: 2 } });
      B.box(tx + 2, -45, 6, 5, mat, { side: 1 });
      dome(B, tx + 5, -45, 3.4, 6, 'copper', { ribs: [0] });
      B.f(tx + 5, -53, 1, 2, 'gold', 'rim');
    }
    B.box(cx - 12, -30, 24, 30, mat, { side: 2, win: { ww: 1, wh: 1, px: 2, py: 2, mx: 1, my: 2 } });
  }

  function heizkraftwerk(B, cx) {
    B.box(cx - 18, -30, 36, 30, '#a86a50', { side: 3, win: { ww: 1, wh: 3, px: 3, py: 5, mx: 2, my: 3 } });
    for (const [x, h] of [[cx - 9, 76], [cx + 7, 70]]) {
      B.f(x - 1, -h, 4, h, 'conc', 'front'); B.f(x + 2, -h, 1, h, 'conc', 'sideR');
      for (let y = -h; y < -h + 10; y += 4) B.f(x - 1, y, 4, 2, '#c83a30', 'front');
      B.f(x - 1, -h, 4, 1, 'conc2', 'rim');
      B.blink(x + 1, -h - 1, { period: 2 + x * 0.001 });
      B.vents.push({ x: x, y: -h - 1, ph: x * 0.3 });
    }
  }

  function springerTower(B, cx) {
    B.box(cx - 9, -64, 18, 64, 'gold', { glass: true, mullions: 2, win: { office: true, py: 2, mx: 1 } });
    B.box(cx - 18, -34, 10, 34, 'glassD', { glass: true, win: { office: true, py: 3, mx: 1 } });
    B.f(cx - 9, -65, 18, 1, 'gold', 'rim');
    B.box(cx - 5, -69, 10, 4, 'glassD', { side: 1 });
    B.antenna(cx + 2, -69, 7);
  }

  function heiligKreuz(B, cx) {
    B.box(cx - 12, -22, 24, 22, BRICK_R, { side: 2, win: { ww: 1, wh: 3, px: 4, py: 6, mx: 2, my: 4 } });
    for (let i = 0; i < 6; i++) B.f(cx - 12 + i * 2, -23 - i, 24 - i * 4, 1, TILE, i === 5 ? 'rim' : 'front');
    B.box(cx + 4, -44, 7, 44, BRICK_R, { side: 1 });
    B.f(cx + 6, -40, 1, 4, 'glassD', 'dark'); B.f(cx + 8, -40, 1, 4, 'glassD', 'dark');
    B.emit(cx + 6, -32, 2, 2, 'cream', '#fff0c0', 'rim');
    for (let i = 0; i < 12; i++) {
      const w = Math.max(1, 7 - Math.floor(i / 2));
      B.f(cx + 4 + ((7 - w) >> 1), -45 - i, w, 1, 'copper', i === 11 ? 'rim' : 'front');
    }
    B.f(cx + 7, -59, 1, 2, 'gold', 'rim');
  }

  function gedaechtniskirche(B, cx) {
    // broken west tower
    const mat = '#6a625a';
    B.box(cx - 6, -40, 12, 40, mat, { side: 2 });
    B.f(cx - 3, -34, 2, 6, 'dark', 'flat'); B.f(cx + 1, -34, 2, 6, 'dark', 'flat');
    B.f(cx - 2, -20, 4, 8, 'dark', 'flat', { a: 0.6 });
    const jag = [[-6, 3], [-5, 5], [-4, 4], [-3, 8], [-2, 9], [-1, 7], [0, 6], [1, 10], [2, 7], [3, 4], [4, 5], [5, 2]];
    for (const [dx, h] of jag) B.f(cx + dx, -40 - h, 1, h, mat, dx > 2 ? 'sideR' : 'front');
    for (const [dx, h] of jag) B.f(cx + dx, -40 - h, 1, 1, mat, 'rim');
    // the new blue glass octagon + hexagonal bell tower
    B.box(cx + 8, -20, 16, 20, '#2a3668', { side: 2 });
    for (let y = -18; y < -1; y += 2) for (let x = cx + 9; x < cx + 22; x += 2) B.emit(x, y, 1, 1, '#2a3668', '#3a6cff', 'front');
    B.f(cx + 8, -21, 16, 1, 'conc2', 'rim');
    B.box(cx - 16, -36, 7, 36, '#2a3668', { side: 1 });
    for (let y = -34; y < -1; y += 2) for (let x = cx - 15; x < cx - 10; x += 2) B.emit(x, y, 1, 1, '#2a3668', '#3a6cff', 'front');
    B.f(cx - 16, -37, 7, 1, 'conc2', 'rim');
    B.f(cx - 13, -41, 1, 4, 'gold', 'rim');
  }

  function europaCenter(B, cx) {
    B.box(cx - 26, -18, 52, 18, 'conc', { win: { office: true, py: 3, mx: 1 }, side: 3 });
    B.box(cx - 8, -66, 16, 66, '#9aa8b4', { win: { office: true, py: 2, mx: 1, my: 2 }, side: 2 });
    B.f(cx - 8, -67, 16, 1, 'steel', 'rim');
    B.f(cx, -70, 1, 3, 'steel', 'flat');
    return { x: cx, y: -75 };
  }

  function upperWest(B, cx) {
    B.box(cx - 7, -86, 14, 86, 'glass', { glass: true, mullions: 2, win: { office: true, py: 2, mx: 1 } });
    for (let r = 0; r < 6; r++) B.glass(cx - 7, -87 - r, 14 - r * 2, 1, 'glass', r ? 'sideL' : 'front');
    B.f(cx - 7, -86, 14, 1, 'steel', 'rim', { a: 0.6 });
    B.box(cx + 7, -78, 12, 78, '#8a8680', { win: { office: true, py: 2, mx: 1 }, side: 2 });
    for (let x = cx + 8; x < cx + 17; x += 3) B.f(x, -77, 1, 76, 'cream', 'rim', { a: 0.5 });
    B.f(cx + 7, -79, 12, 1, 'cream', 'rim');
    B.blink(cx - 5, -93, { period: 2.2 });
  }

  // Tower crane mast (the jib is animated in ambient()).
  function craneMast(B, x, jibY, col) {
    B.f(x, jibY + 2, 2, -jibY - 2, col, 'front');
    B.f(x + 1, jibY + 2, 1, -jibY - 2, col, 'sideR');
    for (let y = jibY + 3; y < -2; y += 3) B.f(x + ((y / 3) & 1), y, 1, 1, 'dark', 'flat', { a: 0.55 });
    B.f(x - 1, jibY + 2, 3, 2, col, 'front');                  // slewing ring
    B.f(x, jibY - 6, 1, 8, col, 'front');                      // tower head
    B.f(x + 1, jibY - 4, 1, 6, col, 'sideR');
  }

  function oberbaum(B, x0, x1) {
    const BR = '#a84e38', ST = '#cdbd9c';
    const mid = Math.round((x0 + x1) / 2);
    const tw = 9, t1 = mid - 7 - tw, t2 = mid + 7;
    // --- river level: piers and seven low arches (openings left unpainted: you see the far quay)
    const nA = 7, pier = 6;
    const span = (x1 - x0 - pier * (nA + 1)) / nA;
    const cols = [];
    for (let x = x0; x < x1; x++) {
      const rel = x - x0;
      const k = Math.floor(rel / (span + pier));
      const inA = rel - k * (span + pier);
      let top = 4; // deepest brick row (4 = pier all the way down)
      if (k < nA && inA >= pier) {
        const u = (inA - pier + 0.5 - span / 2) / (span / 2);
        top = -1 - Math.round(4 * Math.sqrt(Math.max(0, 1 - u * u)));
      }
      cols.push(top);
    }
    let i = 0;
    while (i < cols.length) {
      let e = i; while (e < cols.length && cols[e] === cols[i]) e++;
      const bottom = cols[i];
      B.f(x0 + i, -7, e - i, bottom === 4 ? 12 : bottom + 7 - 0, BR, 'front', { glowKey: 'bOber' });
      if (bottom !== 4) {
        B.f(x0 + i, bottom, e - i, 1, ST, 'front');                         // voussoir ring
        B.f(x0 + i, bottom + 1, e - i, 4 - bottom, 'glassD', 'dark', { a: 0.5 }); // shade under the arch
      }
      else B.f(x0 + e - 1, -6, 1, 11, BR, 'sideR', { glowKey: 'bOber' });
      i = e;
    }
    B.f(x0, 0, x1 - x0, 1, 'dark', 'flat', { a: 0.15 });
    // deck cornice and parapet
    B.f(x0 - 2, -8, x1 - x0 + 4, 1, ST, 'rim');
    B.f(x0, -7, x1 - x0, 1, 'dark', 'flat', { a: 0.25 });
    // --- arcade gallery carrying the U-Bahn
    B.f(x0, -17, x1 - x0, 9, BR, 'front', { glowKey: 'bOber' });
    for (let x = x0 + 2; x < x1 - 5; x += 6) {
      if (x + 4 > t1 - 1 && x < t2 + tw + 1) continue;
      B.f(x, -14, 4, 5, 'glassD', 'dark', { a: 0.72 });
      if (((x - x0) / 6) % 3 === 1) B.emit(x + 1, -11, 2, 2, 'glassD', '#ffcf8a', 'dark');
      B.f(x + 1, -15, 2, 1, 'glassD', 'dark', { a: 0.72 });
      B.f(x - 1, -16, 1, 1, ST, 'front', { a: 0.6 });
    }
    B.f(x0, -9, x1 - x0, 1, ST, 'front', { a: 0.5 });
    B.f(x0 - 1, -18, x1 - x0 + 2, 1, ST, 'rim');
    for (let x = x0 + 1; x < x1; x += 10) B.emit(x, -10, 1, 1, BR, '#ffd48a', 'dark');
    // abutments
    for (const ax of [x0 - 6, x1 - 1]) {
      B.box(ax, -18, 7, 23, BR, { side: 1 });
      B.f(ax - 1, -19, 9, 1, ST, 'rim');
    }
    // --- the two towers
    for (const tx of [t1, t2]) {
      B.box(tx, -40, tw, 45, BR, { side: 2, glowKey: 'bOber' });
      for (const y of [-18, -8]) B.f(tx - 1, y, tw + 2, 1, ST, 'rim');
      for (const y of [-34, -27]) { B.f(tx + 2, y, 1, 4, 'glassD', 'dark'); B.f(tx + 5, y, 1, 4, 'glassD', 'dark'); }
      B.f(tx + 3, -14, 2, 5, 'glassD', 'dark', { a: 0.8 });
      B.f(tx - 1, -41, tw + 2, 1, ST, 'rim');
      B.f(tx - 1, -42, tw + 2, 1, BR, 'front');
      for (let k = 0; k < tw + 2; k += 2) B.f(tx - 1 + k, -43, 1, 1, BR, 'rim');
      B.box(tx + 2, -49, 5, 7, BR, { side: 1, glowKey: 'bOber' });
      B.emit(tx + 3, -47, 1, 3, BR, '#ffd89a', 'dark');
      const roof = [[2, 5], [3, 3], [3, 3], [4, 1], [4, 1], [4, 1]];
      roof.forEach(([dx, w], j) => { B.f(tx + dx, -50 - j, w, 1, SLATE, j === roof.length - 1 ? 'rim' : 'front'); if (w > 1) B.f(tx + dx, -50 - j, 1, 1, SLATE, 'rim'); });
      B.f(tx + 4, -58, 1, 2, 'gold', 'rim');
    }
    B.rects.push({ x: x0, y: -18, w: x1 - x0, h: 23 });
    return { x0, x1, t1, t2, tw, rail: -18 };
  }

  // Molecule Man: three aluminium figures leaning together, standing in the river.
  function moleculeMan(B, cx) {
    const m = '#dfe6ee';
    const figs = [[-14, 10], [0, 0], [14, -10]];
    const H = 30;
    for (const [bx, lean] of figs) {
      const at = (y) => cx + bx + Math.round((lean * (4 - y)) / H); // x of the figure's axis at row y
      for (let y = 4; y > 4 - H; y--) {
        const k = 4 - y, x = at(y);
        if (k < 13) {                       // legs, apart
          const sp = k < 6 ? 2 : 1;
          B.f(x - sp, y, 1, 1, m, 'front'); B.f(x + sp, y, 1, 1, m, 'sideR');
        } else if (k < 24) {                // torso, pierced with holes
          const hole = k % 4 === 1;
          B.f(x - 1, y, 1, 1, m, 'sideL');
          if (!hole) B.f(x, y, 1, 1, m, 'front');
          B.f(x + 1, y, 1, 1, m, 'sideR');
          if (k === 19) { B.f(x - 3, y, 2, 1, m, 'front'); B.f(x + 2, y, 2, 1, m, 'front'); } // arms
        } else if (k === 24) {
          B.f(x, y, 1, 1, m, 'front');      // neck
        } else {                            // head
          B.f(x - 1, y, 3, 1, m, k === H - 1 ? 'rim' : 'front');
        }
      }
    }
  }

  // East Side Gallery: the longest surviving stretch of the Wall, covered in murals.
  function eastSideGallery(B, x0, x1) {
    const r = B.rng;
    B.f(x0, -5, x1 - x0, 5, '#e6e2d8', 'front');
    B.f(x0, -6, x1 - x0, 1, '#d8d4cc', 'rim');
    const C = ['#e84a3a', '#f2c230', '#3a8ae8', '#58c060', '#e87ac8', '#1a1a1a', '#f08a30', '#8a5ae0', '#2ac0c0', '#ffffff'];
    for (let x = x0; x < x1;) {
      const w = r.int(5, 12);
      const bg = r() < 0.6 ? r.pick(C) : null;
      if (bg) B.f(x, -5, Math.min(w, x1 - x), 5, bg, 'front', { a: 0.85 });
      for (let k = 0; k < 3; k++) {
        const bw = r.int(1, 4), bh = r.int(1, 3);
        B.f(x + r.int(0, Math.max(0, w - bw)), -5 + r.int(0, 5 - bh), bw, bh, r.pick(C), 'front');
      }
      x += w;
    }
    for (let x = x0 + 3; x < x1; x += 4) B.f(x, -5, 1, 5, 'dark', 'flat', { a: 0.08 });
  }

  // Lush linden along the quays (bare in winter: the tree mats are seasonal).
  function linden(B, x, o) {
    o = o || {};
    const r = B.rng;
    const w = o.w || r.int(5, 8), h = o.h || r.int(5, 7), base = o.base != null ? o.base : -2;
    const cx = x + w / 2;
    B.f(Math.floor(cx), base, 1, -base, 'wood', 'front');
    const m = r.pick(['tree', 'tree2', 'tree3']), m2 = m === 'tree3' ? 'tree' : 'tree3';
    for (let j = 0; j < h; j++) {
      const t = ((j + 0.5) / h) * 2 - 1;
      const hw = (w / 2) * Math.sqrt(Math.max(0, 1 - t * t)) + 0.4;
      const a = Math.round(cx - hw), b = Math.round(cx + hw);
      const y = base - h + j;
      if (b - a <= 0) continue;
      B.f(a, y, b - a, 1, m, j === 0 ? 'rim' : 'front');
      if (j > h / 2) B.f(b - 2, y, 2, 1, m2, 'sideR');
      else if (j > 0) B.f(a, y, 1, 1, m, 'rim');
    }
  }

  // ---------------------------------------------------------------------------------------------

  PS.registerCity('berlin', 'Berlin', function (seed) {
    const layers = [];

    // Far layer: Lichtenberg/Marzahn slabs and the flat outskirts, in the haze
    {
      const W = 1500, B = new PS.Builder(W, PS.rng(seed + 11));
      const r = B.rng;
      const env = (x) => 24 + 30 * PS.kit.gauss(x, 250, 90, W) + 40 * PS.kit.gauss(x, 800, 120, W) + 26 * PS.kit.gauss(x, 1250, 80, W);
      for (let x = 0; x < W;) {
        const w = r.int(6, 20);
        let h = Math.round(env(x) * r.range(0.45, 1.05));
        if (r() < 0.12) h = Math.round(h * 1.4);
        PS.kit.distant(B, x, w, Math.max(8, h), true, STYLE);
        x += w + r.int(-2, 2);
      }
      // Mueggelberge ridge far away
      for (let x = 1320; x < 1480; x++) { const h = Math.round(10 + 8 * Math.sin(((x - 1320) / 160) * Math.PI)); B.f(x, -h, 1, h, 'tree3', 'front'); }
      layers.push({ name: 'far', par: 0.22, W, haze: 0.62, B, fogK: 0.36 });
    }
    // Mid layer: Prenzlauer Berg / Neukoelln roofs, the Funkturm, Klingenberg chimneys
    {
      const W = 1900, B = new PS.Builder(W, PS.rng(seed + 22));
      const r = B.rng;
      const env = (x) => 32 + 24 * PS.kit.gauss(x, 420, 140, W) + 32 * PS.kit.gauss(x, 1150, 180, W) + 20 * PS.kit.gauss(x, 1650, 90, W);
      for (let x = 0; x < W;) {
        const w = r.int(7, 20);
        const h = Math.round(env(x) * r.range(0.5, 1.05));
        if (h > 30 && w >= 12 && r() < 0.3) platte(B, x, w, h);
        else PS.kit.distant(B, x, w, Math.max(10, h), false, STYLE);
        x += w + r.int(-3, 1);
      }
      // Funkturm (radio tower): tapered lattice with a restaurant platform
      {
        const cx = 1500, H = 96;
        for (let y = -H; y < 0; y++) {
          const k = (y + H) / H, hw = Math.round(1 + 7 * k * k);
          B.f(cx - hw, y, 1, 1, 'steel', 'front'); B.f(cx + hw, y, 1, 1, 'steel', 'sideR');
          if ((y & 3) === 0) B.f(cx - hw, y, hw * 2 + 1, 1, 'steel', 'flat', { a: 0.4 });
        }
        for (let y = -H + 4; y < -2; y += 6) { B.line(cx - Math.round(1 + 7 * ((y + H) / H) ** 2), y, cx + Math.round(1 + 7 * ((y + 6 + H) / H) ** 2), y + 6, 'steel', 'flat', { a: 0.35 }); }
        B.box(cx - 5, -66, 11, 3, 'steel', { side: 1 });
        B.box(cx - 4, -H - 3, 9, 3, 'steel', { side: 1 });
        B.f(cx, -H - 14, 1, 11, 'steel', 'flat');
        B.blink(cx, -H - 15, { period: 2.2 });
      }
      // Klingenberg power station chimneys
      for (const x of [300, 312]) { B.f(x, -58, 3, 58, 'conc', 'front'); B.f(x + 2, -58, 1, 58, 'conc', 'sideR'); B.f(x, -58, 3, 3, '#c83a30', 'front'); B.blink(x + 1, -59, { period: 2.6 }); }
      layers.push({ name: 'mid', par: 0.5, W, haze: 0.36, B, groundGlow: 24, fogK: 0.4 });
    }

    // ------------------------------------------------------------------------------------------
    // Main layer
    const B = new PS.Builder(WM, PS.rng(seed));
    const r = B.rng;
    const lm = {};

    // Places along the panorama (world x)
    const X = {
      trep: 66, bridge: [104, 336], narva: 376, esg: [404, 650], ftor: 470, arena: 560, crane1: 598, edge: 636,
      hkw: 690, nikolai: 740, rathaus: 790, marien: 836, tv: 868, parkInn: 942,
      humboldt: 1040, dom: 1114, bode: 1196, hbf: 1290, reich: 1404, gate: 1512, sieg: 1586,
      kollhoff: 1650, bahn: 1690, sony: 1742, crane2: 1812, leipziger: [1848, 1896], springer: 1950, heilig: 1996, ballon: 2040, crane3: 2092,
      europa: 2196, gkirche: 2254, upper: 2310,
    };
    const lowSpans = [[X.bridge[0] - 8, X.bridge[1] + 8], [1004, 1232], [1250, 1336], [1356, 1612]];
    const inLow = (x) => lowSpans.some(([a, b]) => x > a && x < b);
    const env = (x) => 28 + 12 * gauss(x, 800, 110) + 14 * gauss(x, 1720, 90) + 10 * gauss(x, 2250, 80) + 8 * gauss(x, 500, 80) + 6 * gauss(x, 1960, 60);

    // back row
    B.hz = 0.14;
    for (let x = 0; x < WM;) {
      const w = r.int(9, 20);
      let h = env(x + w / 2) * r.range(0.72, 1.12);
      if (inLow(x + w / 2)) h = r.int(22, 30);
      if (x + w > 1440 && x < 1600) { x += w; continue; } // Tiergarten
      backBuilding(B, x, w, Math.round(h));
      x += w + r.int(0, 1);
    }
    // Leipziger Strasse slabs
    for (const lx of X.leipziger) platte(B, lx - 8, 17, 58, { sign: lx === X.leipziger[0] ? '#ffd24a' : null });

    // Landmarks set back from the river
    B.hz = 0.07;
    treptowers(B, X.trep);
    frankfurterTor(B, X.ftor);
    edgeEastSide(B, X.edge);
    const cranes = [];
    const craneDefs = [[X.crane1, -82, '#e8b82a', 34, 12], [X.crane2, -94, '#d83a30', 40, 14], [X.crane3, -74, '#e8b82a', 30, 11]];
    for (const [cx, jy, col, L, C] of craneDefs) { craneMast(B, cx, jy, col); cranes.push({ x: cx, jy, col, L, C, ph: cx * 0.37 }); }
    heizkraftwerk(B, X.hkw);
    B.hz = 0.04;
    nikolaikirche(B, X.nikolai);
    const rath = rotesRathaus(B, X.rathaus);
    lm.tv = fernsehturm(B, X.tv);
    marienkirche(B, X.marien);
    parkInn(B, X.parkInn);
    B.hz = 0.06;
    kollhoff(B, X.kollhoff);
    bahnTower(B, X.bahn);
    const sonyRows = sonyCenter(B, X.sony);
    springerTower(B, X.springer);
    heiligKreuz(B, X.heilig);
    const star = europaCenter(B, X.europa);
    upperWest(B, X.upper);
    gedaechtniskirche(B, X.gkirche);
    // Tiergarten canopy behind the gate, the Victory Column rising out of it
    B.hz = 0.1;
    siegessaeule(B, X.sieg);
    for (let x = 1436; x < 1612; x += r.int(4, 7)) linden(B, x, { w: r.int(8, 13), h: r.int(8, 12), base: -r.int(6, 12) });
    for (let x = 1436; x < 1612; x += r.int(5, 8)) linden(B, x, { w: r.int(7, 11), h: r.int(6, 9), base: -2 });

    // Front row: the Altbau blocks along the river
    B.hz = 0;
    const narva = narvaTower(B, X.narva);
    const frontSkip = [[X.bridge[0] - 4, X.bridge[1] + 4], [X.esg[0] - 2, X.esg[1] + 4], [1004, 1232], [1250, 1336], [1356, 1612]];
    let fx = 0;
    for (const [a, b] of frontSkip) {
      altbauRow(B, fx, a, r.int(20, 22));
      fx = b;
    }
    altbauRow(B, fx, WM, 21);
    // arena & slabs of Friedrichshain behind the Wall
    arena(B, X.arena);
    // Riverfront landmarks
    const hum = humboldtForum(B, X.humboldt);
    const dom = berlinerDom(B, X.dom);
    bodeMuseum(B, X.bode);
    hauptbahnhof(B, X.hbf);
    const reich = reichstag(B, X.reich);
    const gate = brandenburgerTor(B, X.gate);
    // Pariser Platz flanks
    B.box(X.gate - 44, -16, 12, 16, '#d8ccb4', { win: { ww: 1, wh: 2, px: 2, py: 3, mx: 1, my: 2, mb: 3 }, side: 1 });
    B.box(X.gate + 34, -16, 12, 16, '#c8c0b0', { win: { ww: 1, wh: 2, px: 2, py: 3, mx: 1, my: 2, mb: 3 }, side: 1 });
    // Oberbaum Bridge
    const bridge = oberbaum(B, X.bridge[0], X.bridge[1]);
    // East Side Gallery with trees behind it
    for (let x = X.esg[0] + 4; x < X.esg[1] - 6; x += r.int(10, 22)) linden(B, x, { base: -5, h: r.int(6, 8), w: r.int(6, 9) });
    eastSideGallery(B, X.esg[0], X.esg[1]);

    // Shore: stone quay, lamps, trees along the embankment
    const noTree = [[X.bridge[0] - 8, X.bridge[1] + 8], [X.esg[0], X.esg[1]], [X.gate - 26, X.gate + 26], [X.bridge[1] - 60, X.bridge[1] - 30]];
    const skipShore = (x) => noTree.slice(0, 1).some(([a, b]) => x > a && x < b);
    PS.kit.shore(B, WM, { kind: 'quay', lamps: true, lampGap: 16, lampColor: '#ffe0a0', skip: skipShore });
    for (let x = 6; x < WM; x += r.int(9, 20)) {
      if (noTree.some(([a, b]) => x > a - 6 && x < b)) continue;
      if (r() < 0.2) continue;
      linden(B, x);
    }
    moleculeMan(B, X.bridge[1] - 46);

    PS.kit.finalizeRoofs(B, [X.bridge, [X.tv - 12, X.tv + 12], [1004, 1232], [1356, 1612], [X.crane1 - 4, X.crane1 + 4], [X.crane2 - 4, X.crane2 + 4], [X.crane3 - 4, X.crane3 + 4]]);
    layers.push({ name: 'main', par: 1, W: WM, haze: 0, B, groundGlow: 30, fogK: 0.12 });

    // Festival of Lights projection surfaces
    const proj = [gate, dom, reich, hum, { x: rath.x, y: rath.y, w: rath.w, h: rath.h }];
    lm.perch = { x: lm.tv.x, top: lm.tv.sphereTop - 9 };
    lm.bridge = bridge;

    // --------------------------------------------------------------------------------------------
    // Animated details
    const train = { run: null, next: 0 };
    let festival = false, xmasTree = false;

    function drawTrain(p, S, dt) {
      const t = S.t, R = PS.R;
      if (!train.run) {
        if (t < train.next) return;
        const dir = R() < 0.5 ? 1 : -1, n = R.int(2, 4), len = n * 12 - 1;
        const first = train.next === 0;
        train.run = { dir, n, len, sp: R.range(18, 24), x: first ? (bridge.x0 + bridge.x1 - len) / 2 - dir * 30 : dir > 0 ? bridge.x0 - len - 2 : bridge.x1 + 2 };
      }
      const run = train.run;
      run.x += run.dir * run.sp * dt;
      if ((run.dir > 0 && run.x > bridge.x1 + 2) || (run.dir < 0 && run.x + run.len < bridge.x0 - 2)) { train.run = null; train.next = t + R.range(10, 30); return; }
      const X0 = S.mx(bridge.x0);
      if (X0 - S.om > S.VW + 4 || X0 + (bridge.x1 - bridge.x0) - S.om < -4) return;
      const g = p.ctx, s = p.s;
      g.save();
      g.beginPath();
      const segs = [[bridge.x0, bridge.t1], [bridge.t1 + bridge.tw, bridge.t2], [bridge.t2 + bridge.tw, bridge.x1]];
      for (const [a, b] of segs) g.rect(Math.round((X0 + a - bridge.x0) * s) + p.ox, 0, (b - a) * s, g.canvas.height);
      g.clip();
      const P = S.P, night = P.dark > 0.45;
      const lit = PS.add(P.amb, PS.scale(P.sun, 0.45));
      const body = PS.css(PS.mul(hex('#f2c02a'), lit)), roof = PS.css(PS.mul(hex('#c89a1a'), lit));
      const winC = night ? '#ffe9a8' : PS.css(PS.mul(hex('#3a4050'), lit));
      const y0 = S.groundY + bridge.rail - 4;
      const x = X0 + (run.x - bridge.x0);
      for (let i = 0; i < run.n; i++) {
        const cx = Math.round(x + i * 12);
        p.rect(cx, y0, 11, 1, roof);
        p.rect(cx, y0 + 1, 11, 2, body);
        for (let k = 1; k < 10; k += 2) p.px(cx + k, y0 + 1, winC);
        p.rect(cx + 1, y0 + 3, 9, 1, '#26262c');
      }
      if (night) {
        const head = run.dir > 0 ? Math.round(x + run.len) : Math.round(x) - 1;
        const tail = run.dir > 0 ? Math.round(x) - 1 : Math.round(x + run.len);
        p.px(head, y0 + 2, '#fff6d8');
        g.globalAlpha = 0.35; p.rect(head + (run.dir > 0 ? 1 : -3), y0 + 2, 3, 1, '#fff6d8'); g.globalAlpha = 1;
        p.px(tail, y0 + 2, '#ff3a2a');
      }
      g.restore();
    }

    function drawCranes(p, S) {
      const P = S.P, t = S.t;
      const lit = PS.add(P.amb, PS.scale(P.sun, 0.45));
      const night = P.dark > 0.4;
      for (const c of cranes) {
        const X0 = S.mx(c.x);
        if (X0 - S.om < -60 || X0 - S.om > S.VW + 60) continue;
        const col = PS.css(PS.mul(hex(c.col), lit)), dk = PS.css(PS.mul(hex('#3a3844'), lit)), cw = PS.css(PS.mul(hex('#9a9aa0'), lit));
        const th = c.ph + t * 0.035 + 0.5 * Math.sin(t * 0.021 + c.ph);
        const k = Math.cos(th);
        const jy = S.groundY + c.jy;
        const tip = X0 + Math.round(c.L * k), back = X0 + 1 - Math.round(c.C * k);
        const a = Math.min(X0 + 1, tip), b = Math.max(X0 + 1, tip);
        p.rect(a, jy, b - a + 1, 1, col);
        for (let x = a; x <= b; x += 2) p.px(x, jy + 1, col);
        const ca = Math.min(X0, back), cb = Math.max(X0, back);
        p.rect(ca, jy, cb - ca + 1, 1, col);
        p.rect(back - 1, jy - 1, 3, 3, cw);
        p.rect(X0 + (k > 0 ? -2 : 2), jy + 1, 2, 2, col);        // cab
        p.line(X0, jy - 6, Math.round(X0 + c.L * 0.7 * k), jy, dk);
        p.line(X0, jy - 6, back, jy - 1, dk);
        // trolley, hook and a swinging load
        const f = 0.45 + 0.35 * Math.sin(t * 0.05 + c.ph * 2);
        const tx = Math.round(X0 + c.L * f * k);
        const drop = Math.round(18 + 22 * (0.5 + 0.5 * Math.sin(t * 0.07 + c.ph)));
        p.rect(tx, jy + 2, 1, drop, dk);
        p.rect(tx - 1, jy + 2 + drop, 3, 2, PS.css(PS.mul(hex(c.col === '#d83a30' ? '#6a8ac8' : '#a86a50'), lit)));
        if (night || P.dark > 0.2) {
          const on = Math.floor(t * 1.1 + c.ph) % 2 === 0;
          if (on) { p.px(X0, jy - 7, '#ff3b30'); p.px(tip, jy - 1, '#ff3b30'); p.px(back, jy - 2, '#ff3b30'); }
        }
      }
    }

    function drawStar(p, S) {
      const X0 = S.mx(star.x);
      if (X0 - S.om < -10 || X0 - S.om > S.VW + 10) return;
      const P = S.P, t = S.t;
      const night = P.dark > 0.35;
      const c = night ? '#e8f4ff' : PS.css(PS.mul(hex('#dfe6ee'), PS.add(P.amb, PS.scale(P.sun, 0.5))));
      const th = t * 0.9, k = Math.cos(th), cy = S.groundY + star.y;
      if (night) { p.ctx.globalAlpha = 0.25; p.rect(X0 - 5, cy - 5, 11, 11, '#9fd0ff'); p.ctx.globalAlpha = 1; }
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        p.px(Math.round(X0 + 4 * Math.cos(a) * k), Math.round(cy + 4 * Math.sin(a)), c);
      }
      for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) p.line(X0, cy, Math.round(X0 + 4 * Math.cos(a) * k), Math.round(cy + 4 * Math.sin(a)), c);
    }

    function drawSony(p, S) {
      const P = S.P;
      if (P.dark < 0.3) return;
      const X0 = S.mx(sonyRows[0].x);
      if (X0 - S.om < -60 || X0 - S.om > S.VW + 30) return;
      const g = p.ctx, t = S.t;
      g.globalAlpha = 0.45 * P.dark;
      for (const rw of sonyRows) {
        const hue = (t * 18 + (rw.y + 60) * 5) % 360;
        p.rect(X0 + rw.x - sonyRows[0].x, S.groundY + rw.y, rw.w, 1, `hsl(${hue.toFixed(0)},85%,62%)`);
      }
      g.globalAlpha = 1;
    }

    function drawNarva(p, S) {
      const P = S.P;
      if (P.dark < 0.3) return;
      const X0 = S.mx(narva.x);
      if (X0 - S.om < -12 || X0 - S.om > S.VW + 2) return;
      const hue = (S.t * 12) % 360;
      p.ctx.globalAlpha = 0.5 * P.dark;
      p.rect(X0, S.groundY + narva.y + 1, narva.w, narva.h - 1, `hsl(${hue.toFixed(0)},80%,60%)`);
      p.ctx.globalAlpha = 1;
    }

    // Festival of Lights: moving colour projections on the landmark facades.
    function drawProjections(p, S) {
      const P = S.P;
      if (!festival || P.dark < 0.35) return;
      const g = p.ctx, t = S.t;
      const mode = Math.floor(t / 8) % 4;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.34 * P.dark;
      for (let n = 0; n < proj.length; n++) {
        const q = proj[n];
        const X0 = S.mx(q.x);
        if (X0 - S.om > S.VW + 2 || X0 + q.w - S.om < -2) continue;
        const Y0 = S.groundY + q.y;
        if (mode === 0) {
          for (let i = 0; i < q.w; i += 3) p.rect(X0 + i, Y0, 3, q.h, `hsl(${((i * 7 + t * 60 + n * 70) % 360).toFixed(0)},90%,55%)`);
        } else if (mode === 1) {
          for (let j = 0; j < q.h; j += 2) p.rect(X0, Y0 + j, q.w, 2, `hsl(${((j * 14 - t * 80 + n * 50) % 360 + 360) % 360},90%,55%)`);
        } else if (mode === 2) {
          const hue = (t * 40 + n * 90) % 360, beat = 0.5 + 0.5 * Math.sin(t * 3);
          p.rect(X0, Y0, q.w, q.h, `hsla(${hue.toFixed(0)},90%,${(40 + 25 * beat).toFixed(0)}%,1)`);
        } else {
          for (let i = 0; i < q.w; i += 4) for (let j = 0; j < q.h; j += 4) {
            if (((i + j) / 4 + Math.floor(t * 2)) % 2) p.rect(X0 + i, Y0 + j, 4, 4, `hsl(${((t * 30 + n * 60 + i) % 360).toFixed(0)},90%,58%)`);
          }
        }
      }
      // the TV tower shaft becomes a colour ladder
      const tx = S.mx(lm.tv.x);
      if (tx - S.om > -20 && tx - S.om < S.VW + 20) {
        for (let y = -8; y > lm.tv.cy + lm.tv.R; y -= 4) p.rect(tx - 3, S.groundY + y - 3, 7, 3, `hsl(${((y * -6 + t * 90) % 360).toFixed(0)},95%,55%)`);
        for (const [a, b, y] of lm.tv.rows) p.rect(tx + (a - lm.tv.x), S.groundY + y, b - a, 1, `hsl(${((y * 9 + t * 70) % 360 + 360) % 360},95%,58%)`);
      }
      g.restore();
    }

    // Christmas: a big tree in front of the Brandenburg Gate.
    function drawXmasTree(p, S) {
      const X0 = S.mx(gate.x + gate.w / 2);
      if (X0 - S.om < -10 || X0 - S.om > S.VW + 10) return;
      const P = S.P, t = S.t, gy = S.groundY;
      const lit = PS.add(P.amb, PS.scale(P.sun, 0.45));
      const glowK = P.dark * 0.35;
      const tone = (c) => PS.css(PS.mix(PS.mul(hex(c), lit), hex(c), glowK));
      const g1 = tone('#3a7a44'), g2 = tone('#2a5a32');
      p.rect(X0 - 1, gy - 2, 2, 2, tone('#6a4a30'));
      const H = 17;
      const hwAt = (j) => Math.round(1 + (j / H) * 6 + ((j % 5) / 5) * 1.5 - Math.floor(j / 5) * 0.5);
      for (let j = 0; j < H; j++) {
        const hw = hwAt(j), y = gy - 2 - H + j;
        p.rect(X0 - hw, y, hw, 1, g1); p.rect(X0, y, hw, 1, g2);
      }
      const cols = ['#ff4a4a', '#ffd23a', '#ffffff', '#4ab8ff'];
      const bright = P.dark > 0.3;
      for (let j = 3; j < H; j += 2) {
        const hw = hwAt(j);
        for (let x = -hw + ((j >> 1) & 1); x < hw; x += 3) {
          const i = j * 7 + x;
          if (bright && PS.hash(i, Math.floor(t * 1.5 + (i & 3))) < 0.2) continue;
          const c = cols[(i + 16) % 4];
          p.px(X0 + x, gy - 2 - H + j, bright ? c : PS.css(PS.mul(hex(c), lit)));
        }
      }
      p.px(X0, gy - 3 - H, '#ffe070'); p.px(X0 - 1, gy - 2 - H, '#ffe070'); p.px(X0 + 1, gy - 2 - H, '#ffe070');
    }

    // Glow palettes
    const warm = hex('#ffd9a0'), gold = hex('#ffcf78'), copperLit = hex('#a8e8c8');
    const FEST = ['#ff4ab0', '#4ab0ff', '#b04aff', '#4affc0', '#ffb04a', '#ff5a5a', '#5affff'];

    // --------------------------------------------------------------------------------------------
    // Events
    const events = [];

    // Welt-Ballon: the tethered helium balloon near Checkpoint Charlie rising and sinking again.
    events.push({
      id: 'weltBallon', w: 3,
      ok: (S) => S.weather.wind < 0.55 && S.weather.rain < 0.3,
      make: (S) => {
        const X = S.mx(X_BALLON) - S.om;
        if (X < 20 || X > S.VW - 20) return null;
        const ev = { z: 'back', space: 'main', t: 0 };
        ev.update = (dt) => { ev.t += dt; return ev.t < 50; };
        ev.draw = (p) => {
          // 'back' events are drawn while pM still carries the mid layer's offset: use the main one.
          const ox0 = p.ox;
          p.ox = -Math.round(S.om * p.s);
          try { drawBallon(p); } finally { p.ox = ox0; }
        };
        const drawBallon = (p) => {
          const t = ev.t, P = S.P;
          const k = t < 16 ? PS.smooth(0, 16, t) : t > 34 ? 1 - PS.smooth(34, 50, t) : 1;
          const x = S.mx(X_BALLON) + Math.round(Math.sin(t * 0.4) * 2 * k);
          const baseY = S.groundY - 10;
          const gy = Math.round(baseY - k * 104);
          const lit = PS.add(P.amb, PS.scale(P.sun, 0.5));
          const glowK = P.dark * 0.6;
          const col = (c) => PS.css(PS.mix(PS.mul(hex(c), lit), hex(c), glowK));
          const line = PS.cssA(PS.mul(hex('#555a66'), lit), 0.8);
          p.rect(S.mx(X_BALLON), gy + 2, 1, baseY - gy, line);
          // gondola ring with passengers
          p.rect(x - 4, gy, 9, 1, col('#e8e8ea'));
          p.rect(x - 3, gy + 1, 7, 1, col('#8a8e98'));
          for (let i = -3; i <= 3; i += 2) p.px(x + i, gy - 1, S.sil);
          // net lines up to the envelope
          const cy = gy - 21, R = 12;
          p.line(x - 4, gy, x - 8, cy + 6, line); p.line(x + 4, gy, x + 8, cy + 6, line); p.line(x, gy, x, cy + R, line);
          // envelope
          const light = col('#9ad8f0'), mid = col('#48b0d8'), shade = col('#2a7ca8'), band = col('#f4f4f0');
          for (let dy = -R; dy <= R; dy++) {
            const hw = Math.floor(Math.sqrt((R + 0.5) ** 2 - dy * dy));
            const w = 2 * hw + 1, l = Math.round(w * 0.3);
            const y = cy + dy;
            if (Math.abs(dy) <= 3) { p.rect(x - hw, y, w, 1, band); continue; }
            p.rect(x - hw, y, l, 1, light);
            p.rect(x - hw + l, y, w - 2 * l, 1, mid);
            p.rect(x + hw - l + 1, y, l, 1, shade);
          }
          p.text('BERLIN', x - 11, cy - 2, col('#2a7ca8'));
          if (P.dark > 0.4 && Math.floor(t * 1.5) % 2) p.px(x, cy - R - 1, '#ff3b30');
        };
        return ev;
      },
    });

    // Techno on the roof: strobes, lasers and a crowd jumping on the kick drum.
    events.push({
      id: 'techno', w: 5,
      ok: (S) => S.P.dark > 0.55 && S.weather.rain < 0.4,
      make: (S) => {
        const EV = PS.EV, R = PS.R;
        const rf = EV.rooftop(S, { minW: 10 });
        if (!rf) return null;
        const ev = { z: 'main', space: 'main', t: 0, life: R.range(24, 36) };
        const bpm = 132 / 60;
        const n = Math.min(4, Math.floor((rf.w - 4) / 3));
        const ppl = Array.from({ length: n }, (_, i) => ({ dx: 2 + i * 3, ph: R() }));
        const laserCols = ['#3aff6a', '#ff3aa0', '#3ad0ff'];
        ev.done = () => S.release(rf);
        ev.update = (dt) => { ev.t += dt; return ev.t < ev.life && !EV.scrolledAway(S, rf.x); };
        ev.draw = (p) => {
          const t = ev.t, x0 = S.mx(rf.x), y = S.groundY + rf.y;
          const beat = (t * bpm) % 1, onBeat = beat < 0.18;
          const g = p.ctx;
          // lasers fanning into the sky
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + Math.sin(t * (0.7 + i * 0.3) + i * 2) * 0.9;
            g.globalAlpha = 0.5;
            p.line(x0 + (rf.w >> 1), y - 8, Math.round(x0 + (rf.w >> 1) + Math.cos(a) * 60), Math.round(y - 8 + Math.sin(a) * 60), laserCols[(i + Math.floor(t / 4)) % 3]);
          }
          g.restore();
          if (onBeat) { g.globalAlpha = 0.4; p.rect(x0 - 2, y - 12, rf.w + 4, 12, '#ffffff'); g.globalAlpha = 1; }
          // speaker stacks + DJ booth
          p.rect(x0, y - 4, 2, 4, S.sil); p.rect(x0 + rf.w - 2, y - 4, 2, 4, S.sil);
          p.rect(x0 + (rf.w >> 1) - 2, y - 3, 5, 3, S.sil);
          p.px(x0 + (rf.w >> 1), y - 3, onBeat ? '#ff3aa0' : '#3aff6a');
          for (const q of ppl) {
            const jump = ((t * bpm + q.ph * 0.2) % 1) < 0.3 ? 1 : 0;
            p.sprite(jump ? EV.PERSON.armsUp : EV.PERSON.d2, x0 + q.dx, y - 6 - jump, { k: onBeat ? '#1a1a2a' : S.sil });
          }
        };
        return ev;
      },
    });

    // Sightseeing boat on the Spree: long, low, glass-roofed, flag at the stern.
    events.push({
      id: 'spreeBoat', w: 6,
      make: (S) => {
        const EV = PS.EV, R = PS.R;
        const dir = R() < 0.5 ? 1 : -1;
        const y = EV.waterY(S, R() < 0.5);
        const ev = { z: 'water', space: 'main', t: 0, x: dir > 0 ? S.om - 40 : S.om + S.VW + 10 };
        const tourists = Array.from({ length: 7 }, () => R.pick(['#ff4a5a', '#ffd23a', '#4aa0ff', '#f4f0e8', '#3ac8a0']));
        ev.update = (dt) => {
          ev.t += dt; ev.x += dir * 5.5 * dt;
          const X = S.mx(ev.x) - S.om;
          return ev.t < 300 && !(ev.t > 5 && (X < -50 || X > S.VW + 50));
        };
        ev.draw = (p) => {
          const P = S.P, night = P.dark > 0.5;
          const x = S.mx(ev.x), bob = Math.round(Math.sin(ev.t * 1.4) * 0.5);
          const lit = PS.add(PS.add(P.amb, PS.scale(P.sun, 0.4)), [0.1, 0.1, 0.12]);
          const d = (c) => PS.css(PS.mul(hex(c), lit));
          const wake = PS.cssA([230, 240, 255], night ? 0.35 : 0.6);
          for (let i = 0; i < 4; i++) p.rect(x + (dir > 0 ? -3 - i * 3 : 32 + i * 3), y + 3 + (i % 2), 2, 1, wake);
          p.ctx.globalAlpha = 0.2; p.rect(x, y + 6, 30, 2, d('#f2eee6')); p.ctx.globalAlpha = 1;
          const yy = y + bob;
          p.rect(x, yy + 3, 30, 2, d('#f2eee6'));
          p.rect(x + 1, yy + 5, 28, 1, d('#2a4a8a'));
          p.rect(x + 3, yy + 1, 24, 2, d('#9ab8d0'));
          for (let i = x + 4; i < x + 26; i += 2) p.px(i, yy + 1, night ? '#ffe2a0' : d('#3a4a60'));
          p.rect(x + 3, yy, 24, 1, d('#dfe6ee'));
          tourists.forEach((c, i) => p.px(x + 5 + i * 3, yy - 1, night ? S.sil : d(c)));
          const sx = dir > 0 ? x + 1 : x + 28;
          p.rect(sx, yy - 4, 1, 4, d('#555'));
          p.rect(sx + (dir > 0 ? -3 : 1), yy - 4, 3, 1, '#1a1a1a'); p.rect(sx + (dir > 0 ? -3 : 1), yy - 3, 3, 1, '#d8302a'); p.rect(sx + (dir > 0 ? -3 : 1), yy - 2, 3, 1, '#f2c22a');
          if (night) { p.px(dir > 0 ? x + 29 : x, yy + 2, '#3bff6a'); }
        };
        return ev;
      },
    });
    const X_BALLON = X.ballon;

    return {
      key: 'berlin',
      name: 'Berlin',
      lat: 52.52, lon: 13.40,
      layers,
      landmarks: lm,
      lanes: [
        { y: 0, x0: 0, x1: WM, dir: 1 },
        { y: 0, x0: 0, x1: WM, dir: -1 },
        { y: -9, x0: bridge.x0 + 2, x1: bridge.x1 - 2, dir: 1, bridge: true },
        { y: -9, x0: bridge.x0 + 2, x1: bridge.x1 - 2, dir: -1, bridge: true },
      ],
      holidays: ['xmas', 'nye', 'halloween', 'unity', 'festivalOfLights'],
      foreground: { kind: 'promenade' },
      flags: 'de',
      glow(season, date) {
        const G = PS.GLOWS;
        const h = season ? season.holidays : {};
        festival = !!h.festivalOfLights;
        xmasTree = !!h.xmas && !h.nye;
        G.bTV = hex('#aab6d0'); G.bShaft = null;
        G.bGate0 = gold; G.bGate1 = gold; G.bGate2 = gold;
        G.bDom = warm; G.bDomC = copperLit; G.bRath = hex('#ffc890'); G.bReich = warm; G.bHum = warm; G.bBode = warm;
        G.bSieg = hex('#ffd060'); G.bOber = hex('#ffb070');
        if (season && season.esb && !xmasTree) {
          const e = season.esb.map(hex);
          G.bGate0 = e[0]; G.bGate1 = e[1]; G.bGate2 = e[2];
          if (!h.unity) G.bTV = e[1];
        }
        if (festival) {
          const day = Math.floor(date.getTime() / 864e5);
          const pick = (i) => hex(FEST[(day + i) % FEST.length]);
          G.bGate0 = pick(0); G.bGate1 = pick(1); G.bGate2 = pick(2);
          G.bDom = pick(3); G.bDomC = hex(['#a8ffe8', '#d0b8ff', '#90d8ff', '#ffc8f0'][day % 4]); G.bRath = pick(5); G.bReich = pick(6); G.bHum = pick(2); G.bBode = pick(4);
          G.bTV = pick(1); G.bShaft = pick(3); G.bOber = pick(5);
        }
      },
      musicWords: [
        ['grey', 'late', 'slow', 'cold', 'sleepy', 'soft', 'foggy', 'hazy', 'sunday', 'night', 'warm', 'yellow', 'quiet', 'last', 'lazy', 'rainy', 'golden', 'endless'],
        ['spaeti', 'spree', 'u-bahn', 'altbau', 'tempelhof', 'kiez', 'balcony', 'tram', 'kreuzberg', 'club', 'courtyard', 'kebab', 'flea market', 'canal', 'cranes', 'mauerpark', 'rooftop', 'bicycle'],
      ],
      messages: ['ICH BIN EIN BERLINER', 'SPAETI OPEN 24H', 'NO PHOTOS INSIDE', 'BITTE ABSTAND', 'CURRYWURST NOW', 'ARM ABER SEXY', 'U1 DELAYED', 'CLUB MATE PLS', 'KEIN BIER VOR VIER', 'TSCHUESS!', 'MAUERPARK SUNDAY', 'FEIERABEND!', 'BERLIN ♥ YOU'],
      events,
      eventWeights: { sail: 0.4, ferry: 0.3, duck: 0.5, kaiju: 0.4, nessie: 0.3, pizzaSignal: 0, paradeBalloon: 0, yacht: 0.6, kong: 1.2, blimp: 0.6 },
      ambient(p, S, dt) {
        drawProjections(p, S);
        if (xmasTree) drawXmasTree(p, S);
        drawSony(p, S);
        drawNarva(p, S);
        drawCranes(p, S);
        drawStar(p, S);
        drawTrain(p, S, dt);
      },
    };
  });
})();
