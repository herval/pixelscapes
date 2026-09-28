'use strict';
// João Pessoa ("Jampa"), Paraíba — seen from the Atlantic. On the left the red Cabo Branco cliff
// (the barreira) with its agave-leaf lighthouse and Niemeyer's flying-saucer Estação; then the urban
// beaches (Cabo Branco, Tambaú, Manaíra, Bessa). A height rule keeps the beachfront low and lets the
// towers climb inland, so the skyline steps up like an amphitheatre behind the coconut palms.
// Easternmost point of the Americas: where the sun rises first.
(function () {
  const PS = window.PS;
  const { hex } = PS;
  const K = PS.kit;
  const gauss = K.gauss;

  const WM = 2200;
  const CLIFF = [40, 400];
  const FAROL_X = 150;
  const EST_X = 240;
  const HOTEL_X = 1010, HOTEL_W = 64;
  const BUST_X = 1072;
  const REEF_X = 1080;
  const BEACH = [400, 2168];
  const LANTERN_DY = 29; // lantern height above the cliff top at the lighthouse

  // ---------------------------------------------------------------------------------------------
  // Terrain

  function cliffH(x) {
    if (x < CLIFF[0] || x > CLIFF[1]) return 0;
    let h;
    if (x < 102) h = 26 * PS.smooth(CLIFF[0], 102, x); // Seixas side: wooded slope
    else if (x < 322) h = 26;
    else h = 26 * (1 - PS.smooth(322, CLIFF[1], x)); // down to Cabo Branco beach
    const n = 1.3 * Math.sin(x * 0.071) + 1.1 * Math.sin(x * 0.023 + 1.3);
    return h > 0.5 ? h + n * Math.min(1, h / 12) : 0;
  }
  const cliffTop = (x) => -Math.round(cliffH(x));

  // The barreira: Barreiras-formation sediments in reds, ochres and pale clay; Atlantic forest on top.
  const STRATA = ['#b85a3c', '#d68a50', '#e8b674', '#c96f42', '#eed3a0', '#c0643e', '#a84a30'];
  function drawCliff(B) {
    const veg = ['tree', 'tree2', 'tree3'];
    for (let x = CLIFF[0]; x < CLIFF[1]; x++) {
      const h = Math.round(cliffH(x));
      if (h < 1) continue;
      const faceL = 104, faceR = 336; // exposed cliff face; wooded slopes either side
      const edge = Math.min(x - faceL, faceR - x);
      const gentle = edge < 0;
      const capH = gentle ? h : Math.min(h, 3 + Math.round(PS.hash(x >> 1, 3) * 3) + (edge < 6 ? 6 - edge : 0));
      const bump = Math.round(Math.max(0, Math.sin(x * 0.29) + Math.sin(x * 0.11 + 2)) * 1.3 + PS.hash(x >> 1, 5) * 1.6);
      const top = -h - bump;
      const capBot = -h + capH;
      // canopy
      const m = veg[(PS.hash(x >> 1, 2) * 3) | 0];
      B.f(x, top, 1, 1, veg[(PS.hash(x, 1) * 3) | 0], 'rim');
      B.f(x, top + 1, 1, capBot - top - 1, m, 'front');
      if (PS.hash(x, 7) < 0.35) B.f(x, top + 1 + ((PS.hash(x, 8) * 3) | 0), 1, 1, 'tree2', 'rim', { a: 0.6 });
      if (!gentle) B.f(x, capBot - 1, 1, 1, 'tree3', 'dark', { a: 0.45 });
      else for (let y = top + 2; y < 0; y += 2) {
        const hsh = PS.hash((x + (y & 2)) >> 1, y >> 1);
        if (hsh < 0.3) B.f(x, y, 1, 2, 'tree3', 'front');
        else if (hsh > 0.8) B.f(x, y, 1, 1, 'tree2', 'rim', { a: 0.7 });
      }
      if (gentle) continue;
      // exposed face: strata bands that wander a little
      const off = Math.sin(x * 0.05) * 0.8 + PS.hash(x >> 3, 9) * 0.6;
      const band = (y) => Math.max(0, Math.min(STRATA.length - 1, Math.floor(((y + h) / h) * STRATA.length + off)));
      // talus of fallen sand at the foot
      const talus = 2 + Math.round(PS.hash(x >> 2, 13) * 2 + Math.sin(x * 0.09) * 1.2);
      let y = capBot;
      while (y < -talus) {
        const bi = band(y);
        let y2 = y + 1;
        while (y2 < -talus && band(y2) === bi) y2++;
        B.f(x, y, 1, y2 - y, STRATA[bi], 'front');
        y = y2;
      }
      B.f(x, -talus, 1, talus, '#dcc08e', 'front');
      B.f(x, -talus, 1, 1, '#e8d2a4', 'rim', { a: 0.7 });
      // erosion runnels: shaded V-cuts of varying depth from the top edge
      const gx = x % 9, gseed = Math.floor(x / 9);
      const gd = Math.round((h - capH - talus) * (0.3 + 0.6 * PS.hash(gseed, 17)));
      if (PS.hash(gseed, 19) < 0.7) {
        const cxg = 3 + ((PS.hash(gseed, 20) * 3) | 0);
        const dd = gx === cxg ? gd : gx === cxg + 1 ? Math.round(gd * 0.7) : 0;
        if (dd > 1) {
          B.f(x, capBot, 1, dd, gx === cxg ? '#8a3a24' : '#f0d8a8', gx === cxg ? 'dark' : 'rim', { a: gx === cxg ? 0.35 : 0.3 });
        }
      }
      if (PS.hash(x >> 1, 23) < 0.1) { const sy = capBot + 2 + ((PS.hash(x, 24) * (h - capH - 6)) | 0); B.f(x, sy, 1, 2, 'tree', 'front'); }
    }
    for (let x = CLIFF[0]; x < CLIFF[1]; x += 12) {
      const h = Math.round(cliffH(x + 6));
      if (h > 2) B.rects.push({ x, y: -h, w: 12, h });
    }
  }

  // Beach strip under the cliff: sand, dark reef rocks, no avenue.
  function cliffBase(B) {
    const r = B.rng;
    const x0 = CLIFF[0] + 34, x1 = CLIFF[1] - 34;
    B.f(x0, 0, x1 - x0, 3, 'sand', 'front');
    B.f(x0, 0, x1 - x0, 1, '#dcc08e', 'front');
    B.f(x0, 3, x1 - x0, 2, 'sand2', 'front');
    for (let x = x0 + 4; x < x1 - 4; x += r.int(3, 9)) {
      const w = r.int(2, 6);
      B.f(x, 3, w, 2, '#5e5048', 'front');
      B.f(x + 1, 2, Math.max(1, w - 2), 1, '#6e6056', 'rim');
      if (r() < 0.5) B.f(x - 1, 4, w + 2, 1, '#f4f4f0', 'rim', { a: 0.45 });
    }
  }

  function tree(B, cx, base, rx, ry, m) {
    const r = B.rng;
    m = m || r.pick(['tree', 'tree2', 'tree3', 'tree']);
    B.f(cx, base - 2, 1, 2, 'wood', 'dark');
    const cy = base - 2 - ry;
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.6)) ** 2)));
      if (hw <= 0) continue;
      const y = cy + dy;
      B.f(cx - hw, y, hw * 2 + 1, 1, m, dy === -ry ? 'rim' : 'front');
      B.f(cx + hw, y, 1, 1, m, 'sideR');
      if (dy > 0) B.f(cx - hw, y, hw * 2 + 1, 1, 'tree3', 'dark', { a: 0.22 });
      else if (hw > 1 && r() < 0.6) B.f(cx - hw + 1 + r.int(0, hw), y, 1, 1, 'tree2', 'rim', { a: 0.7 });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Buildings

  const TMATS = ['white', 'white', 'white', 'cream', 'lime', 'conc', 'white', 'cream', '#e8e4da', '#dcd6c8', '#d2dde2', '#e2d4b4', '#d8c8a4', '#e8d8c0', '#d8b898', 'white'];
  const ACCENT = ['terra', 'glass2', 'pastelB', '#7a8290', 'copper', '#c8a070', 'glassG'];

  // Residential tower: white/cream with glass-railed balconies on every floor, a machine-room box and
  // a caixa d'água on the roof. o.row: 'back' | 'mid'.
  function tower(B, x, w, h, row) {
    const r = B.rng;
    const mat = r.pick(TMATS);
    const sd = w >= 14 ? 3 : w >= 9 ? 2 : 1;
    const fw = w - sd;
    const top = -h;
    if (r() < 0.12 && h > 50) {
      // occasional glass-clad tower
      const gm = r.pick(['glassG', 'glass', 'glass2']);
      B.box(x, top, w, h, gm, { glass: true, mullions: r.pick([2, 3]), win: { office: false, ww: 1, wh: 1, px: 2, py: 3, my: 3 }, side: sd });
    } else {
      B.box(x, top, w, h, mat, { side: sd });
      const v = r();
      const bal = v < 0.46 ? [x, fw] : v < 0.74 ? [x + Math.round(fw * 0.22), Math.max(3, Math.round(fw * 0.56))] : null;
      const rail = r.pick(['glassG', 'glass', 'glassG', 'glass2']);
      if (bal) {
        if (bal[1] < fw) B.f(bal[0], top + 2, bal[1], h - 4, 'dark', 'flat', { a: 0.12 });
        for (let y = top + 3; y < -3; y += 3) {
          B.f(bal[0], y, bal[1], 1, rail, 'front', { a: 0.55 });
          B.f(bal[0] - (bal[1] === fw ? 1 : 0), y + 1, bal[1] + (bal[1] === fw ? 1 + sd : 0), 1, 'white', 'rim', { a: 0.9 });
        }
      } else if (r() < 0.5) {
        for (let y = top + 4; y < -3; y += 6) B.f(x, y, w, 1, mat, 'dark', { a: 0.18 });
      }
      B.grids.push(B.winGrid(x, top, fw, h, mat, { ww: 1, wh: 1, px: 2, py: 3, my: 3, mb: 3 }, sd));
      if (v >= 0.74 || r() < 0.2) {
        const sx = r() < 0.5 ? x + 1 : x + fw - 3;
        B.f(sx, top + 2, 2, h - 3, r.pick(ACCENT), 'front');
      }
    }
    // pilotis / lobby
    B.f(x, -3, fw, 3, 'dark', 'flat', { a: 0.3 });
    B.emit(x + 2, -2, Math.max(1, fw - 4), 1, mat, '#ffe2a8', 'dark');
    // crown
    const cr = r();
    if (cr < 0.1 && fw >= 8 && h > 40) {
      // slim pyramid cap
      let cw2 = fw - 2, cy = top;
      while (cw2 > 1) { cy--; const px0 = x + ((fw - cw2) >> 1); B.f(px0, cy, cw2, 1, mat, 'front'); B.f(px0 + cw2 - 1, cy, 1, 1, mat, 'sideR'); B.f(px0, cy, 1, 1, mat, 'rim'); cw2 -= 2; }
      B.f(x + (fw >> 1) - 1, cy - 3, 1, 3, 'steel', 'flat');
      if (h > 78) B.blink(x + (fw >> 1) - 1, cy - 4, { period: 2 + r() });
      if (r() < 0.5) B.emit(x, top, w, 1, mat, r.pick(['#ffffff', '#8fd0ff', '#ffd27a']), 'rim');
      return { x, w, h };
    }
    if (cr < 0.17 && fw >= 8) {
      // arched frame over the roof terrace
      for (let i = 0; i < fw; i++) {
        const hh = 1 + Math.round(Math.sin((i / (fw - 1)) * Math.PI) * 4);
        B.f(x + i, top - hh, 1, 1, mat, 'rim');
        if (i === 0 || i === fw - 1) B.f(x + i, top - hh, 1, hh, mat, i ? 'sideR' : 'front');
      }
      B.roofs.push({ x: x + 2, w: fw - 4, y: top, row, ri: B.rects.length });
      if (r() < 0.4) B.emit(x + 1, top - 1, fw - 2, 1, mat, r.pick(['#8fd0ff', '#ffd27a', '#ffffff']), 'rim');
      return { x, w, h };
    }
    // roof: machine room + water tank
    const cw = Math.max(3, Math.round(fw * r.range(0.32, 0.55))), ch = r.int(3, 5);
    const cxo = x + 1 + r.int(0, Math.max(0, fw - cw - 2));
    B.box(cxo, top - ch, cw, ch, mat, { side: 1, noEdge: true });
    if (r() < 0.35) B.f(cxo, top - ch - 1, cw, 1, 'conc2', 'rim');
    if (r() < 0.08 && cw >= 4) { for (let px = cxo; px < cxo + cw; px += 2) B.f(px, top - ch - 3, 1, 3, mat, 'rim'); B.f(cxo - 1, top - ch - 3, cw + 2, 1, mat, 'rim'); }
    if (h > 78) B.blink(cxo + (cw >> 1), top - ch - 1, { period: 2 + r() });
    else if (r() < 0.25) B.antenna(cxo + cw - 1, top - ch, r.int(3, 6));
    if (r() < 0.32) B.emit(x, top, w, 1, mat, r.pick(['#ffffff', '#8fd0ff', '#ffd27a', '#b5ff9a', '#ff9ad0']), 'rim');
    // free roof for rooftop actors (keep a 1px gap from the machine room)
    const lw = cxo - x - 3, rw = x + fw - (cxo + cw) - 2;
    const rf = lw >= rw ? { x: x + 1, w: lw } : { x: cxo + cw + 2, w: rw };
    if (rf.w >= 4) {
      if (rf.w >= 8 && r() < 0.18) { B.f(rf.x + rf.w - 1, top - 7, 1, 7, 'steel', 'flat'); B.flags.push({ x: rf.x + rf.w, y: top - 7, kind: r.pick(['br', 'br', 'pb']), ph: r() * 10 }); rf.w -= 2; }
      B.roofs.push({ x: rf.x, w: rf.w, y: top, row, ri: B.rects.length });
    }
    return { x, w, h };
  }

  const LOW_MATS = ['white', 'cream', 'pastelY', 'pastelB', 'pastelP', 'pastelG', 'pastelO', 'white', 'terra', '#f0e6d0', 'white', 'pastelL', 'mint'];
  const AWNING = ['#e8503a', '#2a8ac0', '#f2b22a', '#3aa060', '#f4f0e8', '#e86a9a'];

  // Beachfront: 3-4 storey apartments, pousadas, bars and restaurants.
  function lowBuilding(B, x, w, h) {
    const r = B.rng;
    const mat = r.pick(LOW_MATS);
    const top = -h;
    const sd = w >= 12 ? 2 : 1;
    const fw = w - sd;
    B.box(x, top, w, h, mat, { side: sd });
    if (r() < 0.45) {
      for (let y = top + 3; y < -4; y += 3) {
        B.f(x, y, fw, 1, 'glassG', 'front', { a: 0.4 });
        B.f(x - 1, y + 1, w + 1, 1, 'white', 'rim', { a: 0.85 });
      }
    }
    const win = w >= 10 ? { ww: 2, wh: 1, px: 3, py: 3, my: 3, mb: 4 } : { ww: 1, wh: 1, px: 2, py: 3, my: 3, mb: 4 };
    B.grids.push(B.winGrid(x, top, fw, h, mat, win, sd));
    // ground floor: awning + shop glow
    B.f(x, -3, fw, 1, r.pick(AWNING), 'front');
    B.emit(x + 1, -2, Math.max(1, fw - 2), 2, 'dark', r.pick(['#ffcf80', '#ffe2a8', '#ff9f6b', '#ffd27a']), 'flat');
    if (r() < 0.22 && w >= 7) {
      const sw = r.int(2, Math.min(5, w - 3));
      B.signs.push({ x: x + 1 + r.int(0, w - sw - 2), y: top + r.int(1, 3), w: sw, h: 1, c: r.pick(['#ff3a7a', '#3af0ff', '#ffd23a', '#5aff8a', '#ff8a3a']), flick: r() < 0.25 });
    }
    // roof
    const roll = r();
    if (roll < 0.22) { K.pitchedRoof(B, x, top, w, r.pick(['red', 'terra', 'red'])); }
    else if (roll < 0.32 && w <= 13) {
      // thatched palhoça (beach bar)
      for (let i = 0; i < 3; i++) B.f(x - 1 + i, top - 1 - i, w + 2 - i * 2, 1, 'sand2', i === 2 ? 'rim' : 'front');
      B.f(x - 1, top, w + 2, 1, 'wood', 'dark', { a: 0.6 });
    } else {
      B.f(x, top - 1, w, 1, mat, 'rim');
      let fx = x + 1, fwid = w - 2;
      if (r() < 0.6 && w >= 7) {
        // blue fibreglass caixa d'água
        const tx = r() < 0.5 ? x + 1 : x + w - 4;
        B.f(tx, top - 3, 3, 2, '#3a7ac0', 'front'); B.f(tx, top - 3, 3, 1, '#5a9ad8', 'rim'); B.f(tx + 2, top - 2, 1, 1, '#3a7ac0', 'sideR');
        if (tx === x + 1) { fx = x + 5; fwid = w - 6; } else fwid = w - 6;
      }
      if (fwid >= 4) B.roofs.push({ x: fx, w: fwid, y: top - 1, row: 'front', ri: B.rects.length });
      B.lightStrings.push({ x, w, y: top - 2, ph: r() * 10 });
    }
  }

  // Low fishermen's houses (Penha / Seixas)
  function house(B, x, w, h) {
    const r = B.rng;
    const mat = r.pick(['white', 'pastelY', 'pastelB', 'pastelP', 'pastelG', 'terra', 'cream', 'mint']);
    B.box(x, -h, w, h, mat, { side: 1, noEdge: true });
    B.win(x + 1, -h + 2, 1, 1, mat, { th: r() * 0.8 });
    if (w > 5) B.f(x + w - 3, -2, 1, 2, 'wood', 'dark');
    K.pitchedRoof(B, x - 1, -h, w + 2, r.pick(['red', 'terra']));
  }

  // ---------------------------------------------------------------------------------------------
  // Landmarks

  // Farol do Cabo Branco (1972): a white triangular tower whose three edges rise into
  // sisal/agave-leaf blades around the lantern.
  function farol(B, cx, b) {
    const g = { glowKey: 'jpFarol' };
    // keeper's pavilion + plinth
    B.box(cx + 5, b - 4, 9, 4, 'white', { side: 1, noEdge: true });
    B.f(cx - 8, b - 2, 16, 2, 'conc', 'front'); B.f(cx - 8, b - 2, 16, 1, 'conc', 'rim');
    // triangular tower with concave faces: the corners read as tapering agave leaves
    const H = 31;
    for (let i = 0; i < H; i++) {
      const y = b - 3 - i, k = i / (H - 1);
      const hw = 1.6 + 5 * (1 - k) * (1 - k);
      const L = Math.round(cx - hw), Rr = Math.round(cx + hw);
      const w = Rr - L;
      B.f(L, y, w, 1, 'white', 'front', g);
      B.f(L, y, 1, 1, 'white', 'rim', g);                              // left blade edge
      const sh = Math.max(1, Math.round(w * 0.3));
      B.f(Rr - sh, y, sh, 1, 'white', 'sideR', g);                    // the face turning away
      if (w >= 6) B.f(cx - 1, y, 1, 1, 'white', 'dark', { a: 0.14 });   // concave face
      if (i > 3 && i % 6 === 4 && i < H - 6) B.win(cx - 1, y, 1, 1, 'white', { th: 0.35 });
    }
    // blade tips rising past the gallery
    const ty = b - 3 - H;
    B.f(cx - 3, ty - 3, 1, 3, 'white', 'rim', g);
    B.f(cx + 2, ty - 3, 1, 3, 'white', 'sideR', g);
    // gallery + lantern
    B.f(cx - 3, ty, 6, 1, 'white', 'rim', g);
    B.f(cx - 1, ty - 3, 2, 3, 'glassD', 'dark');
    B.emit(cx - 1, ty - 3, 2, 3, 'glassD', '#fff4c8', 'dark');
    B.f(cx - 2, ty - 4, 4, 1, 'red', 'rim');
    B.f(cx - 1, ty - 5, 2, 1, 'red', 'front');
    B.f(cx - 1, ty - 7, 1, 2, 'dark', 'flat');
    B.rects.push({ x: cx - 7, y: ty - 4, w: 14, h: H + 7 });
    return { x: cx, top: ty - 7, lanternY: ty - 2 };
  }

  // Estação Cabo Branco – Ciência, Cultura e Artes (Oscar Niemeyer, 2008): a white round tower
  // like a flying saucer on a single column, a long curving ramp, and a low exhibition block.
  function estacao(B, cx, b) {
    // exhibition block with a vaulted white roof (left)
    const ex = cx - 42, ew = 24;
    B.box(ex, b - 6, ew, 6, 'white', { side: 1, win: { ww: 2, wh: 1, px: 3, py: 3, my: 2, mb: 2 } });
    for (let i = 0; i < ew; i++) {
      const hh = Math.round(Math.sin((i / (ew - 1)) * Math.PI) * 2.4);
      if (hh > 0) B.f(ex + i, b - 6 - hh, 1, hh, 'white', i > ew * 0.7 ? 'sideR' : 'front');
      B.f(ex + i, b - 7 - hh, 1, 1, 'white', 'rim');
    }
    // column
    B.f(cx - 2, b - 11, 4, 11, 'white', 'front'); B.f(cx + 1, b - 11, 1, 11, 'white', 'sideR');
    // saucer: flared underside, continuous glass ribbon, white parapet
    const rows = [[12, 'u'], [18, 'u'], [24, 'u'], [28, 'u'], [30, 'g'], [30, 'g'], [30, 'g'], [30, 'p'], [30, 'p'], [28, 'r']];
    rows.forEach(([w, t], i) => {
      const y = b - 12 - i, x = cx - (w >> 1);
      if (t === 'u') { B.f(x, y, w, 1, 'white', 'flat', { glowKey: 'jpEstU' }); B.f(x, y, 2, 1, 'white', 'sideL', { glowKey: 'jpEstU' }); B.f(x + w - 2, y, 2, 1, 'white', 'sideR', { glowKey: 'jpEstU' }); }
      else if (t === 'g') {
        B.f(x, y, w, 1, 'glassD', 'front');
        for (let k = x + 1; k < x + w - 1; k += 2) B.win(k, y, 1, 1, 'glassD', { lc: hex('#fff0d0'), th: 0 });
        B.f(x, y, 1, 1, 'white', 'sideL'); B.f(x + w - 1, y, 1, 1, 'white', 'sideR');
      } else if (t === 'p') { B.f(x, y, w, 1, 'white', 'front', { glowKey: 'jpEst' }); B.f(x + w - 3, y, 3, 1, 'white', 'sideR', { glowKey: 'jpEst' }); B.f(x, y, 2, 1, 'white', 'sideL', { glowKey: 'jpEst' }); }
      else B.f(x, y, w, 1, 'white', 'rim', { glowKey: 'jpEst' });
    });
    // the ramp sweeping down to the right
    const rx0 = cx + 15, ry0 = b - 14, rx1 = cx + 44;
    for (let x = rx0; x <= rx1; x++) {
      const k = (x - rx0) / (rx1 - rx0);
      const y = Math.round(ry0 + (b - 1 - ry0) * (1 - (1 - k) * (1 - k)));
      B.f(x, y, 1, 1, 'white', 'rim');
      B.f(x, y + 1, 1, 1, 'white', 'sideR', { a: 0.8 });
      if ((x - rx0) % 6 === 3 && y < b - 2) B.f(x, y + 2, 1, b - y - 2, 'white', 'flat', { a: 0.75 });
      if ((x - rx0) % 5 === 0) B.emit(x, y - 1, 1, 1, 'white', '#ffe6b0', 'flat');
    }
    B.rects.push({ x: cx - 15, y: b - 22, w: 30, h: 22 });
    B.roofs.push({ x: cx - 12, w: 24, y: b - 22, row: 'lm', ri: B.rects.length });
    return { x: cx, top: b - 22 };
  }

  // Hotel Tambaú (Sérgio Bernardes, 1971): the round hotel standing in the surf at Tambaú.
  function hotelTambau(B, cx) {
    const w = HOTEL_W, x0 = cx - (w >> 1), T = -13, H = 16;
    const r = B.rng;
    for (let i = 0; i < w; i++) {
      const nx = (i + 0.5 - w / 2) / (w / 2), an = Math.abs(nx);
      const x = x0 + i;
      // rounded ends (a drum seen from the sea) and a low dome of roof behind the parapet
      const rnd = an > 0.985 ? 3 : an > 0.955 ? 2 : an > 0.9 ? 1 : 0;
      const dome = Math.round(2 * Math.sqrt(Math.max(0, 1 - (nx / 0.92) ** 2)));
      const yT = T + rnd;
      const k = nx < -0.8 ? 'sideL' : nx > 0.66 ? 'sideR' : 'front';
      if (dome > 0) { B.f(x, T - dome, 1, dome, 'conc', 'flat'); B.f(x, T - dome, 1, 1, 'conc', 'rim'); }
      B.f(x, yT, 1, H - rnd, 'white', k, { glowKey: 'jpHotel' });
      if (k === 'front' && an > 0.35) B.f(x, yT, 1, H - rnd, 'dark', 'flat', { a: an > 0.66 ? 0.2 : an > 0.5 ? 0.12 : 0.06 });
      if (k === 'sideR' && an > 0.85) B.f(x, yT, 1, H - rnd, 'dark', 'flat', { a: 0.12 });
      if (nx > -0.32 && nx < -0.08) B.f(x, yT + 1, 1, H - 6, 'white', 'glint', { a: 0.18 });
      B.f(x, yT, 1, 1, 'white', 'rim');
      // two floors of rooms behind brise-soleil, then the open pilotis
      if (an < 0.95) {
        for (const fy of [T + 3, T + 7]) B.f(x, fy, 1, 2, 'glass2', k, { a: i % 2 ? 0.7 : 0.4 });
        if (i % 2 === 1) for (const fy of [T + 3, T + 7]) B.win(x, fy, 1, 2, 'glass2', { side: an > 0.66, lc: hex(r.pick(['#ffd57e', '#ffe6a6', '#ffc76c'])), th: r() * 0.9 });
        B.f(x, T + 11, 1, 3, 'dark', 'flat', { a: i % 6 === 0 ? 0.15 : 0.62 });
        if (i % 3 === 0) B.emit(x, T + 12, 1, 1, 'dark', '#ffd08a', 'flat');
      }
      B.f(x, T + 10, 1, 1, 'white', 'rim', { a: 0.6 });
    }
    // breakwater rocks around its foot
    for (let x = x0 - 6; x < x0 + w + 6; x += r.int(2, 4)) {
      const rw = r.int(2, 4), rh = r.int(1, 2);
      B.f(x, 4 - rh, rw, rh + 1, '#5e5048', 'front'); B.f(x, 4 - rh, rw, 1, '#7a6a5c', 'rim');
    }
    B.rects.push({ x: x0, y: T - 2, w, h: H + 2 });
    B.roofs.push({ x: x0 + 6, w: 11, y: T - 1, row: 'lm', ri: B.rects.length });
    B.roofs.push({ x: x0 + w - 17, w: 11, y: T - 1, row: 'lm', ri: B.rects.length });
  }

  // Busto de Tamandaré at the tip of Tambaú
  function bust(B, x) {
    B.f(x - 3, 0, 7, 2, 'conc', 'front'); B.f(x - 3, 0, 7, 1, 'conc', 'rim');
    B.f(x - 1, -8, 3, 8, 'stone', 'front'); B.f(x + 1, -8, 1, 8, 'stone', 'sideR'); B.f(x - 2, -8, 5, 1, 'stone', 'rim');
    B.f(x - 1, -10, 3, 2, '#5a4a3a', 'front'); B.f(x, -12, 1, 2, '#5a4a3a', 'front'); B.f(x - 1, -10, 3, 1, '#7a6a4a', 'rim');
  }

  // Historic centre on the hill: Igreja de São Francisco (tower with a tiled cupola) + Cathedral.
  function churches(B, cx) {
    // hill
    for (let x = cx - 40; x < cx + 50; x++) {
      const h = Math.round(9 * Math.exp(-((x - cx - 5) ** 2) / (2 * 26 * 26)));
      if (h > 0) B.f(x, -h, 1, h, PS.hash(x, 3) < 0.5 ? 'tree' : 'tree3', 'front');
    }
    const b = -8;
    // São Francisco: nave + baroque gable + tower
    B.box(cx, b - 9, 14, 9, 'white', { side: 1, noEdge: true });
    for (let i = 0; i < 4; i++) B.f(cx + 2 + i, b - 10 - i, 10 - i * 2, 1, 'white', i === 3 ? 'rim' : 'front');
    B.f(cx + 6, b - 15, 1, 2, 'dark', 'flat');
    B.box(cx - 5, b - 22, 5, 22, 'white', { side: 1, noEdge: true });
    B.f(cx - 5, b - 23, 5, 1, 'stone', 'rim');
    B.f(cx - 4, b - 25, 3, 2, 'terra', 'front'); B.f(cx - 3, b - 26, 1, 1, 'terra', 'rim');
    B.f(cx - 3, b - 29, 1, 3, 'dark', 'flat'); B.f(cx - 4, b - 28, 3, 1, 'dark', 'flat');
    B.win(cx - 3, b - 19, 1, 2, 'white', { th: 0.2 });
    // Basílica de N. S. das Neves: two towers
    const c2 = cx + 30;
    B.box(c2, b - 11, 16, 11, 'cream', { side: 1, noEdge: true });
    for (const tx of [c2 - 1, c2 + 13]) { B.box(tx, b - 18, 4, 18, 'cream', { side: 1, noEdge: true }); B.f(tx + 1, b - 20, 2, 2, 'stone', 'front'); B.f(tx + 1, b - 22, 1, 2, 'dark', 'flat'); }
  }

  // ---------------------------------------------------------------------------------------------
  // Event sprites and helpers

  const litC = (S, c, k) => {
    const P = S.P;
    const f = k || 1;
    return PS.css([hex(c)[0] * (P.amb[0] + P.sun[0] * 0.45 + 0.08) * f, hex(c)[1] * (P.amb[1] + P.sun[1] * 0.45 + 0.08) * f, hex(c)[2] * (P.amb[2] + P.sun[2] * 0.45 + 0.1) * f]);
  };
  const SAILS = [['#f6f2e6', null], ['#f6f2e6', '#e0463a'], ['#f6f2e6', '#2a7ac8'], ['#f2c230', '#e0463a'], ['#e0463a', '#f6f2e6'], ['#3a8ae0', '#f6f2e6'], ['#f6f2e6', '#2aa06a'], ['#ff8a3a', '#f6f2e6']];
  const SANF = [['.k....', 'kkk...', 'kaaa..', '.aaa..', '.k.k..', '.k.k..'], ['.k....', 'kkk...', 'kawaa.', '.awaa.', '.k.k..', '.k.k..']];
  const COUPLE = [
    ['.k..k.', 'kkkkkk', '.kkkk.', 'sss.k.', 'sss.kk', '.k.k.k'],
    ['.k..k.', 'kkkkkk', '.kkkk.', 'sss.k.', 'sss.k.', 'k.k.kk'],
  ];
  const NOTE_COLS = ['#ffd35a', '#ff7ab6', '#7ee0ff', '#b4ff7a'];
  const FLAGS_SJ = ['#ff3a3a', '#ffd23a', '#2a8aff', '#3ad06a', '#ff7ad0', '#ff8a1a', '#ffffff'];
  // festa colours: daylight-lit, or warmly lit by the party at night
  const flagC = (S, c) => (S.P.dark > 0.45 ? PS.css(PS.mix(PS.scale(hex(c), 0.62), [255, 200, 120], 0.12)) : litC(S, c, 1.1));

  function drawJangada(p, S, x, y, dir, sail, t, ph) {
    const bob = Math.round(Math.sin(t * 1.4 + ph) * 0.5);
    const yy = y + bob;
    const night = S.P.dark;
    p.ctx.globalAlpha = 0.22;
    p.rect(x, yy + 3, 13, 1, litC(S, '#6a4a30')); p.rect(dir > 0 ? x + 1 : x + 3, yy + 4, 9, 1, litC(S, sail[0], 0.8));
    p.ctx.globalAlpha = 1;
    const wake = PS.cssA([230, 240, 255], night > 0.5 ? 0.3 : 0.55);
    for (let i = 0; i < 3; i++) p.rect(dir > 0 ? x - 2 - i * 3 : x + 14 + i * 3, yy + 2 + (i % 2), 2, 1, wake);
    p.rect(x, yy + 1, 13, 1, litC(S, '#9a6a42'));
    p.rect(x + 1, yy + 2, 11, 1, litC(S, '#5a3a24'));
    const mx = dir > 0 ? x + 9 : x + 3;
    const mast = litC(S, '#4a3424');
    p.rect(mx, yy - 15, 1, 16, mast);
    const sc = litC(S, sail[0]), st = sail[1] ? litC(S, sail[1]) : null;
    for (let j = 0; j < 14; j++) {
      const w = Math.max(1, Math.round(9 * Math.pow(j / 13, 0.85)));
      const sx = dir > 0 ? mx - w : mx + 1;
      p.rect(sx, yy - 14 + j, w, 1, st && (j === 7 || j === 8 || j === 11) ? st : sc);
    }
    p.rect(dir > 0 ? mx - 9 : mx + 1, yy, 9, 1, mast);
    p.rect(dir > 0 ? x + 2 : x + 10, yy - 2, 1, 3, S.sil);
    p.px(dir > 0 ? x + 2 : x + 10, yy - 3, S.sil);
    if (night > 0.5) p.px(mx, yy - 16, '#ffd57e');
  }

  function lowTide(S) {
    const day = Math.floor(Date.now() / 864e5);
    const ph = (((S.hour + day * 0.84) % 12.42) + 12.42) % 12.42 / 12.42;
    return 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
  }

  // ---------------------------------------------------------------------------------------------

  PS.registerCity('jampa', 'João Pessoa', function (seed) {
    const layers = [];
    const DSTYLE = {
      distantMats: [['white', 'cream', 'conc', 'lime', 'white'], ['white', 'cream', 'lime', 'conc', 'white', 'pastelY', 'conc2', 'cream', 'glassG', 'white']],
      distantWaterTowers: 0,
    };

    // Far layer: inland neighbourhoods, the historic centre on its hill, Mata do Buraquinho
    {
      const W = 1300, B = new PS.Builder(W, PS.rng(seed + 11));
      const r = B.rng;
      const envF = (x) => 8 + 30 * gauss(x, 170, 70, W) + 24 * gauss(x, 480, 110, W) + 16 * gauss(x, 1120, 90, W);
      for (let x = 0; x < W;) {
        const w = r.int(5, 11);
        const h = Math.round(envF(x + w / 2) * r.range(0.45, 1.05));
        if (!(x > 760 && x < 900) && h > 7 && r() < 0.85) K.distant(B, x, w, h, true, DSTYLE);
        x += w + r.int(0, 6);
      }
      churches(B, 800);
      // tabuleiro canopy; the big dome of green is Mata do Buraquinho
      for (let x = 0; x < W; x += 2) {
        const h = Math.round(3 + 1.5 * Math.sin(x * 0.09) + PS.hash(x, 4) * 2 + 9 * gauss(x, 620, 80, W));
        const m = ['tree', 'tree2', 'tree3'][(PS.hash(x >> 2, 6) * 3) | 0];
        B.f(x, -h, 2, h, m, 'front'); B.f(x, -h, 2, 1, m, 'rim');
      }
      for (const mx of [300, 1000]) { B.f(mx, -46, 1, 46, 'dark', 'flat', { a: 0.7 }); B.blink(mx, -47, { period: 2.4 }); }
      layers.push({ name: 'far', par: 0.22, W, haze: 0.6, B, fogK: 0.36 });
    }
    // Mid layer: more towers, lots of trees
    {
      const W = 1700, B = new PS.Builder(W, PS.rng(seed + 22));
      const r = B.rng;
      const envM = (x) => 16 + 36 * gauss(x, 300, 140, W) + 50 * gauss(x, 900, 180, W) + 30 * gauss(x, 1420, 140, W);
      for (let x = 0; x < W;) {
        const w = r.int(7, 15);
        const h = Math.round(envM(x + w / 2) * r.range(0.45, 1.05));
        if (h > 10) K.distant(B, x, w, h, false, DSTYLE);
        x += w + r.int(1, 7);
      }
      for (let x = 0; x < W; x += 2) {
        const h = Math.round(4 + 1.6 * Math.sin(x * 0.13) + PS.hash(x, 8) * 2.5);
        const m = ['tree', 'tree2', 'tree3'][(PS.hash(x >> 2, 9) * 3) | 0];
        B.f(x, -h, 2, h, m, 'front'); B.f(x, -h, 2, 1, m, 'rim');
      }
      for (let x = 10; x < W; x += r.int(20, 50)) K.palm(B, x, 0, r.int(9, 14), r.int(-2, 2), {});
      layers.push({ name: 'mid', par: 0.5, W, haze: 0.34, B, groundGlow: 24, fogK: 0.4 });
    }

    // Main layer
    const B = new PS.Builder(WM, PS.rng(seed));
    const r = B.rng;
    const env = (x) => 26 + 40 * gauss(x, 640, 170, WM) + 24 * gauss(x, 1010, 90, WM) + 66 * gauss(x, 1420, 220, WM) + 36 * gauss(x, 1900, 170, WM);
    const nearHotel = (x) => x > HOTEL_X - (HOTEL_W >> 1) - 8 && x < HOTEL_X + (HOTEL_W >> 1) + 8;

    // Altiplano towers on the plateau behind the cliff (seen over the treetops)
    B.hz = 0.18;
    for (let x = 286; x < 392;) { const w = r.int(9, 13); tower(B, x, w, r.int(56, 92), 'back'); x += w + r.int(3, 8); }
    B.hz = 0.02;
    drawCliff(B);
    const lm = {};
    B.hz = 0;
    lm.farol = farol(B, FAROL_X, cliffTop(FAROL_X));
    lm.estacao = estacao(B, EST_X, cliffTop(EST_X) + 1);
    // lamps along the cliff-top road
    for (let x = 112; x < 320; x += 16) if (Math.abs(x - FAROL_X) > 10 && Math.abs(x - EST_X) > 50) { const b = cliffTop(x); B.f(x, b - 4, 1, 4, 'conc2', 'sideR', { a: 0.7 }); B.emit(x - 1, b - 5, 2, 1, 'conc2', '#ffd98a', 'sideR'); }

    // Inland towers (the height rule lets them rise only away from the beach)
    B.hz = 0.14;
    for (let x = BEACH[0] + 4; x < BEACH[1] - 10;) {
      const w = r.int(9, 16);
      const bessa = x > 1760;
      if (r() < (bessa ? 0.3 : 0.07)) { x += r.int(12, 26); continue; } // parks and squares
      let h = env(x + w / 2) * r.range(0.72, 1.08);
      if (r() < 0.08) h *= 1.18;
      tower(B, x, w, Math.round(h), 'back');
      x += w + r.int(2, bessa ? 12 : 9);
    }
    // green between the rows
    B.hz = 0.1;
    for (let x = BEACH[0]; x < BEACH[1]; x += r.int(6, 14)) tree(B, x, 0, r.int(3, 5), r.int(3, 5));
    // mid-rise row
    B.hz = 0.07;
    for (let x = BEACH[0] + 2; x < BEACH[1] - 8;) {
      const w = r.int(10, 18);
      const h = Math.round(15 + env(x + w / 2) * r.range(0.18, 0.36));
      if (nearHotel(x + w / 2)) { x += w; continue; }
      tower(B, x, w, h, 'back');
      x += w + r.int(1, 7);
    }
    // tall coconut palms and big trees rising behind the beachfront
    B.hz = 0.03;
    for (let x = BEACH[0] + 3; x < BEACH[1]; x += r.int(8, 20)) {
      if (r() < 0.3) tree(B, x, 0, r.int(4, 6), r.int(4, 6));
      else K.palm(B, x, 0, r.int(13, 21), r.int(-3, 3), { coconuts: r() < 0.6 });
    }
    // the hotel's grounds
    for (let x = HOTEL_X - 40; x < HOTEL_X + 42; x += r.int(5, 9)) tree(B, x, 0, r.int(3, 5), r.int(4, 6));
    // beachfront row: 3-4 storeys max
    B.hz = 0;
    for (let x = BEACH[0]; x < BEACH[1] - 6;) {
      const w = r.int(7, 16);
      if (nearHotel(x) || nearHotel(x + w)) { x += 4; continue; }
      lowBuilding(B, x, w, r.int(8, 14));
      const gap = r.int(0, 4);
      if (gap >= 3 && r() < 0.6) tree(B, x + w + 1, 0, 1, 2);
      x += w + gap;
    }
    // Penha / Seixas fishing village (wraps around the world seam)
    for (let x = BEACH[1] + 2; x < WM + CLIFF[0] + 8;) {
      const w = r.int(5, 8);
      if (r() < 0.65) house(B, x, w, r.int(4, 6)); else tree(B, x + 2, 0, r.int(2, 4), r.int(3, 4));
      x += w + r.int(1, 4);
    }
    for (let x = BEACH[1] + 4; x < WM + CLIFF[0]; x += r.int(7, 14)) K.palm(B, x % WM, 0, r.int(10, 16), r.int(-3, 3), { coconuts: true });

    // Shore: orla avenue, sand strip, palms, lamps
    const skip = (x) => (x > CLIFF[0] - 2 && x < CLIFF[1] - 4) || nearHotel(x) || Math.abs(x - BUST_X) < 5;
    K.shore(B, WM, { kind: 'beach', palmGap: [8, 18], lampGap: 13, skip });
    cliffBase(B);
    // surf line along the sand
    for (let x = BEACH[0] - 20; x < WM + CLIFF[0] - 10; x += r.int(3, 8)) {
      if (nearHotel(x)) continue;
      B.f(x % WM, 4, r.int(2, 6), 1, '#f4f6f8', 'rim', { a: 0.35 });
    }
    hotelTambau(B, HOTEL_X);
    bust(B, BUST_X);

    K.finalizeRoofs(B, [[CLIFF[0], FAROL_X + 20]]);
    layers.push({ name: 'main', par: 1, W: WM, haze: 0, B, groundGlow: 30, fogK: 0.12 });

    // ---------------------------------------------------------------------------------------------
    // City events

    function jangadas(S) {
      const R = PS.EV.R;
      const dir = R() < 0.5 ? 1 : -1;
      const n = R() < 0.4 ? R.int(2, 3) : 1;
      const wh = S.VH - S.horizon;
      const boats = Array.from({ length: n }, (_, i) => ({ dx: -dir * i * R.int(22, 40), y: S.horizon + Math.round(R.range(5, wh * 0.4)), sail: R.pick(SAILS), ph: R() * 6 }));
      const sp = R.range(3.5, 6);
      const ev = { z: 'water', space: 'main', t: 0, x: dir > 0 ? S.om - 20 : S.om + S.VW + 8 };
      ev.update = (dt) => {
        ev.t += dt; ev.x += dir * sp * dt;
        const X = S.mx(ev.x) - S.om;
        return ev.t < 300 && (dir > 0 ? X < S.VW + 100 : X > -100);
      };
      ev.draw = (p) => { for (const b of boats) drawJangada(p, S, S.mx(ev.x + b.dx), b.y, dir, b.sail, ev.t, b.ph); };
      return ev;
    }

    function kitesurf(S) {
      const R = PS.EV.R;
      const dir = R() < 0.5 ? 1 : -1;
      const y = S.horizon + Math.round(R.range(8, (S.VH - S.horizon) * 0.4));
      const sp = R.range(16, 24);
      const kc = R.pick([['#ff4a5a', '#ffd23a'], ['#2ad8c8', '#1a3a8a'], ['#ff8a1a', '#ffffff'], ['#b04aff', '#ff7ad0'], ['#9bff6e', '#1a6a3a']]);
      const board = R.pick(['#ffd23a', '#ffffff', '#ff5a4a', '#4ab0ff']);
      const ev = { z: 'water', space: 'main', t: 0, x: dir > 0 ? S.om - 30 : S.om + S.VW + 30, spray: [] };
      ev.update = (dt) => {
        ev.t += dt; ev.x += dir * sp * dt;
        const jp = ev.t % 7;
        if (jp > 1.3 && PS.EV.R() < dt * 30) ev.spray.push({ x: ev.x - dir * 2, a: 0 });
        for (const q of ev.spray) q.a += dt;
        ev.spray = ev.spray.filter((q) => q.a < 0.8);
        const X = S.mx(ev.x) - S.om;
        return ev.t < 120 && (dir > 0 ? X < S.VW + 60 : X > -60);
      };
      ev.draw = (p) => {
        const x = S.mx(ev.x), jp = ev.t % 7;
        const jump = jp < 1.3 ? Math.sin((jp / 1.3) * Math.PI) * 7 : 0;
        const ry = y - jump;
        for (const q of ev.spray) p.px(S.mx(q.x) - dir * q.a * 6, y + 1 - q.a * 2, PS.cssA([240, 248, 255], 0.7 * (1 - q.a / 0.8)));
        p.rect(x - 1, ry + 1, 5, 1, litC(S, board));
        p.sprite(dir > 0 ? ['.k.', 'kkk', 'k.k', '.k.', 'k.k'] : ['.k.', 'kkk', 'k.k', '.k.', 'k.k'], x, ry - 4, { k: S.sil });
        const kx = x + dir * 16 + Math.sin(ev.t * 0.9) * 2, ky = y - 38 + Math.sin(ev.t * 1.3) * 2 - jump * 0.5;
        const line = PS.cssA([30, 30, 40], 0.4);
        p.line(x + 1, ry - 3, kx - 6, ky + 4, line); p.line(x + 1, ry - 3, kx + 6, ky + 4, line);
        p.sprite(['...kkkkkkk...', '.kkaaaaaaakk.', 'kabbbbbbbbbak', 'bb.........bb', 'b...........b'], Math.round(kx - 6), Math.round(ky), { k: S.sil, a: litC(S, kc[0], 1.15), b: litC(S, kc[1], 1.15) });
      };
      return ev;
    }

    function catamaran(S) {
      const R = PS.EV.R;
      const dir = R() < 0.5 ? 1 : -1;
      const y = S.horizon + Math.round(R.range(6, (S.VH - S.horizon) * 0.35));
      const canopy = R.pick(['#2a8ac0', '#e8503a', '#f2b22a', '#3aa060']);
      const ev = { z: 'water', space: 'main', t: 0, x: dir > 0 ? S.om - 30 : S.om + S.VW + 10 };
      ev.update = (dt) => { ev.t += dt; ev.x += dir * 6 * dt; const X = S.mx(ev.x) - S.om; return ev.t < 200 && (dir > 0 ? X < S.VW + 40 : X > -40); };
      ev.draw = (p) => {
        const x = S.mx(ev.x), bob = Math.round(Math.sin(ev.t * 1.5) * 0.5), yy = y + bob;
        const wake = PS.cssA([230, 240, 255], S.P.dark > 0.5 ? 0.3 : 0.55);
        for (let i = 0; i < 4; i++) p.rect(dir > 0 ? x - 3 - i * 3 : x + 20 + i * 3, yy + 2 + (i % 2), 2, 1, wake);
        p.rect(x, yy + 1, 19, 1, litC(S, '#f4f2ec')); p.rect(x + 1, yy + 2, 4, 1, litC(S, '#c8ccd4')); p.rect(x + 14, yy + 2, 4, 1, litC(S, '#c8ccd4'));
        p.rect(x + 3, yy - 4, 1, 5, litC(S, '#d8dce4')); p.rect(x + 15, yy - 4, 1, 5, litC(S, '#d8dce4'));
        p.rect(x + 2, yy - 5, 15, 1, litC(S, canopy));
        for (let i = 5; i < 14; i += 2) p.rect(x + i, yy - 2, 1, 3, S.sil);
        p.rect(x + 9, yy - 9, 1, 4, litC(S, '#d8dce4')); p.rect(x + 10, yy - 9, 2, 2, litC(S, '#1f9a4a'));
        if (S.P.dark > 0.4) { p.px(x + 4, yy - 3, '#ffd57e'); p.px(x + 12, yy - 3, '#ffd57e'); }
        const cols = ['#ff5c8a', '#ffd35a', '#6ef0ff'];
        if (S.P.dark > 0.4) for (let i = 0; i < 7; i++) p.px(x + 3 + i * 2, yy - 6, cols[(i + Math.floor(ev.t * 3)) % 3]);
      };
      return ev;
    }

    // Picãozinho: the reef pools off Tambaú. Tour catamarans anchor there at low tide.
    function picaozinho(S) {
      const ev = { z: 'water', space: 'main', t: 0, ambient: true };
      const reefs = [[0, 0, 13], [17, 1, 8], [29, 0, 12], [-13, 1, 7], [45, 2, 6], [8, 3, 5]];
      const boats = [[-4, -1, '#2a8ac0'], [22, -2, '#e8503a'], [40, 0, '#f2b22a']];
      ev.update = (dt) => { ev.t += dt; return true; };
      ev.draw = (p) => {
        const x = S.mx(REEF_X);
        if (x - S.om > S.VW + 70 || x - S.om < -70) return;
        const y = S.horizon + 10;
        const low = lowTide(S), day = S.P.day;
        for (const [dx, dy, w] of reefs) {
          const X = x + dx, Y = y + dy;
          if (day > 0.2) { p.ctx.globalAlpha = (0.18 + 0.2 * low) * day; p.rect(X - 3, Y - 1, w + 6, 3, '#5ad8c8'); p.ctx.globalAlpha = 1; }
          p.ctx.globalAlpha = 0.3 + 0.45 * low;
          p.rect(X, Y, w, 1, litC(S, '#5a5244'));
          if (low > 0.55) { p.rect(X + 1, Y - 1, w - 2, 1, litC(S, '#8a7a5c')); p.px(X + (w >> 1), Y - 1, litC(S, '#b8a680')); }
          p.ctx.globalAlpha = 1;
        }
        if (low > 0.5 && day > 0.4) {
          for (const [dx, dy, c] of boats) {
            const bx = x + dx, by = y + dy - 3 + Math.round(Math.sin(ev.t * 1.3 + dx) * 0.5);
            p.rect(bx, by + 2, 11, 1, litC(S, '#f4f2ec')); p.rect(bx + 1, by + 3, 3, 1, litC(S, '#9aa0aa')); p.rect(bx + 7, by + 3, 3, 1, litC(S, '#9aa0aa'));
            for (let i = 2; i < 9; i += 2) p.rect(bx + i, by, 1, 2, S.sil);
            p.rect(bx + 1, by - 1, 9, 1, litC(S, c));
          }
          for (let i = 0; i < 5; i++) { const px = x + [2, 6, 19, 31, 35][i], py = y - 2 + (i % 2); p.rect(px, py, 1, 2, S.sil); }
        }
      };
      return ev;
    }

    // Forró pé-de-serra on a rooftop: sanfoneiro + a couple dancing xote
    function forro(S) {
      const EV = PS.EV, R = EV.R;
      const rf = EV.rooftop(S, { minW: 12, sky: true });
      if (!rf) return null;
      const wx = S.mx(rf.x) + 1 + R.int(0, Math.max(0, rf.w - 13));
      const ev = { z: 'main', space: 'main', t: 0, done: () => S.release(rf) };
      const life = R.range(26, 38);
      const skirt = R.pick(['#e0463a', '#f2c230', '#3a8ae0', '#ff7ab8', '#ff8a1a']);
      let notes = [];
      ev.update = (dt) => {
        ev.t += dt;
        if (R() < dt * 1.4) notes.push({ x: R.range(0, 3), y: -9, vx: R.range(-2, 4), a: 0, c: R.pick(NOTE_COLS) });
        for (const n of notes) { n.a += dt; n.y -= dt * 6; n.x += n.vx * dt; }
        notes = notes.filter((n) => n.a < 3);
        return ev.t < life && !EV.scrolledAway(S, wx);
      };
      ev.draw = (p) => {
        const x = S.mx(wx), y = S.groundY + rf.y;
        const beat = Math.floor(ev.t * 2.6);
        if (S.P.dark > 0.4) { p.ctx.globalAlpha = 0.14 * S.P.dark; p.rect(x - 2, y - 9, 16, 9, '#ffc070'); p.ctx.globalAlpha = 1; }
        p.sprite(SANF[beat % 2], x, y - 6, { k: S.sil, a: litC(S, '#c8403a', 1.2), w: litC(S, '#f0ece0') });
        const sway = [0, 1, 2, 1][Math.floor(ev.t * 1.3) % 4];
        p.sprite(COUPLE[beat % 2], x + 6 + sway, y - 6, { k: S.sil, s: litC(S, skirt, 1.2) });
        for (const n of notes) p.sprite(PS.EV.NOTE, x + 2 + n.x, y + n.y, { k: n.c });
      };
      return ev;
    }

    // São João: fogueira + bandeirinhas + quadrilha on a rooftop
    function fogueira(S) {
      const EV = PS.EV, R = EV.R;
      const rf = EV.rooftop(S, { minW: 11 });
      if (!rf) return null;
      const wx = S.mx(rf.x);
      const ev = { z: 'main', space: 'main', t: 0, done: () => S.release(rf) };
      let sparks = [];
      const P = PS.EV.PERSON;
      const frames = [P.d1, P.d2, P.d3, P.d4];
      ev.update = (dt) => {
        ev.t += dt;
        if (R() < dt * 8) sparks.push({ x: R.range(-1, 2), y: -5, vx: R.range(-2, 2), a: 0 });
        for (const s of sparks) { s.a += dt; s.y -= dt * 10; s.x += s.vx * dt; }
        sparks = sparks.filter((s) => s.a < 1.6);
        return ev.t < 45 && !EV.scrolledAway(S, wx);
      };
      ev.draw = (p) => {
        const x0 = S.mx(rf.x), y = S.groundY + rf.y, w = rf.w;
        const fx = w >= 20 ? x0 + (w >> 1) : x0 + 3;
        const night = S.P.dark;
        // glow
        if (night > 0.3) {
          const fl = 0.8 + 0.2 * Math.sin(ev.t * 11);
          p.ctx.globalAlpha = 0.16 * night * fl; p.rect(fx - 9, y - 12, 19, 12, '#ff9a40');
          p.ctx.globalAlpha = 0.14 * night * fl; p.rect(fx - 5, y - 16, 11, 16, '#ffb050');
          p.ctx.globalAlpha = 1;
        }
        // bandeirinhas string between two poles
        p.rect(x0, y - 11, 1, 11, S.sil); p.rect(x0 + w - 1, y - 11, 1, 11, S.sil);
        for (let i = 1; i < w - 1; i++) {
          const sag = Math.round(Math.sin((i / (w - 1)) * Math.PI) * 2);
          const yy = y - 11 + sag;
          if (i % 2) p.rect(x0 + i, yy + 1, 1, 2, flagC(S, FLAGS_SJ[(i >> 1) % FLAGS_SJ.length]));
          else p.px(x0 + i, yy, night > 0.45 && i % 4 === 0 ? '#ffe6a0' : S.sil);
        }
        // fire: logs + flickering flames
        p.rect(fx - 2, y - 1, 5, 1, litC(S, '#6a3a1a')); p.rect(fx - 1, y - 2, 3, 1, litC(S, '#5a2a10'));
        const k = Math.floor(ev.t * 10);
        for (let i = -1; i <= 1; i++) {
          const fh = 2 + Math.round(PS.hash(k, i + 5) * 3) - Math.abs(i);
          p.rect(fx + i, y - 2 - fh, 1, fh, i === 0 ? '#ffd23a' : '#ff8a1a');
          p.px(fx + i, y - 3 - fh, '#e0401a');
        }
        for (const s of sparks) if (Math.floor(s.a * 8) % 3) p.px(fx + s.x, y + s.y, s.a < 0.8 ? '#ffd27a' : '#ff7a30');
        // quadrilha dancers around the fire
        let i = 0;
        for (let dx = x0 + 1; dx + 5 <= x0 + w - 1 && i < 4; dx += 5) {
          if (dx + 5 > fx - 2 && dx < fx + 3) continue;
          p.sprite(frames[(Math.floor(ev.t * 3) + i) % 4], dx, y - 6, { k: S.sil }, dx < fx);
          i++;
        }
      };
      return ev;
    }

    // ---------------------------------------------------------------------------------------------

    let reefEv = null;
    const farolX = FAROL_X, lanternY = lm.farol.lanternY;
    return {
      key: 'jampa',
      name: 'Joao Pessoa',
      lat: -7.12, lon: -34.86,
      layers,
      landmarks: lm,
      lanes: [
        { y: 1, x0: BEACH[0] - 6, x1: HOTEL_X - (HOTEL_W >> 1) - 2, dir: 1 },
        { y: 1, x0: HOTEL_X + (HOTEL_W >> 1) + 2, x1: BEACH[1], dir: 1 },
      ],
      holidays: ['xmas', 'nye', 'carnaval', 'saoJoao', 'outubroRosa', 'novembroAzul'],
      // Seen from the open Atlantic (not across a river): sea foreground, ocean water with surf.
      foreground: { kind: 'sea', deep: '#1a5a86' },
      water: { kind: 'ocean', shallow: '#3cc4b4', deep: '#1d5f8e' },
      flags: 'br',
      glow(season) {
        const e = season && season.esb;
        PS.GLOWS.jpFarol = hex(e ? e[1] : '#eef2ff');
        PS.GLOWS.jpEst = hex(e ? e[0] : '#fff4de');
        PS.GLOWS.jpEstU = hex(e ? e[2] : '#ffe2b0');
        PS.GLOWS.jpHotel = hex('#ffd9a8');
      },
      musicWords: [['salty', 'slow', 'golden', 'sunrise', 'warm', 'sleepy', 'breezy', 'late', 'soft', 'easternmost', 'barefoot', 'humid', 'lazy', 'sunday', 'coconut'],
        ['jangada', 'coconut', 'tambau', 'cabo branco', 'forro', 'tapioca', 'sunrise', 'orla', 'picaozinho', 'caju', 'sanfona', 'lighthouse', 'reef', 'trade winds', 'rede', 'maresia']],
      messages: ['ONDE O SOL NASCE PRIMEIRO', 'OI JAMPA!', 'EU ♥ JAMPA', 'TAPIOCA QUENTINHA', 'FORRO HOJE', 'VAI BELO!', 'AGUA DE COCO GELADA', 'OXE!', 'EITA, MAINHA!', 'BORA PRO PICAOZINHO', 'SAUDADE DE JAMPA', 'PONTA DO SEIXAS', 'ARRETADO!'],
      events: [
        { id: 'jangada', w: 7, ok: (S) => S.P.day > 0.15, make: jangadas },
        { id: 'kitesurf', w: 4, ok: (S) => S.P.day > 0.45 && S.weather.rain < 0.3, make: kitesurf },
        { id: 'catamaran', w: 3, ok: (S) => S.P.day > 0.3 || S.hour < 22, make: catamaran },
        { id: 'forro', w: 6, make: forro },
        { id: 'fogueira', w: 10, ok: (S) => S.P.dark > 0.35 && !!S.season && (S.season.holidays.saoJoao || S.month === 5), make: fogueira },
        { id: 'picaozinho', w: 0, make: picaozinho },
      ],
      eventWeights: { kong: 0, ferry: 0, tug: 0.2, sail: 1.5, yacht: 1.2, nessie: 0.3, duck: 0.6, kaiju: 0.4, pizzaSignal: 0.2, snowballs: 0, paradeBalloon: 0, windowWasher: 0.6, golfer: 0.5, bats: 0, witch: 0.3, blimp: 0.5 },
      ambient(p, S) {
        const P = S.P, t = S.t;
        if (!reefEv || reefEv.dead) { reefEv = S.spawn('picaozinho'); if (reefEv) reefEv.ambient = true; }
        // Cabo Branco lighthouse: rotating beam, flash as it sweeps toward us
        if (P.dark > 0.2) {
          const lx = S.mx(farolX), ly = S.groundY + lanternY;
          if (lx - S.om > -220 && lx - S.om < S.VW + 220) {
            const th = t * (Math.PI * 2 / 10);
            const c = Math.cos(th), s = Math.sin(th);
            const a0 = 0.3 * Math.min(1, (P.dark - 0.2) / 0.4) * (1 - 0.5 * (S.weather.fog || 0));
            const L = 10 + 190 * Math.abs(c);
            const dir = c >= 0 ? 1 : -1;
            for (let d = 2; d < L; d += 2) {
              const k = d / L;
              const hw = 0.6 + d * 0.03;
              const a = a0 * (1 - k) * (0.35 + 0.65 * Math.abs(c));
              if (a < 0.012) break;
              p.rect(lx + dir * d - (dir < 0 ? 1 : 0), ly - hw, 2, hw * 2 + 1, PS.cssA([255, 246, 210], a));
            }
            if (s > 0.75) {
              const f = (s - 0.75) / 0.25, fc = PS.cssA([255, 246, 210], 0.1 * f * a0 / 0.3);
              for (const rr of [7, 4, 2]) { p.rect(lx - rr, ly - rr / 2, rr * 2, rr, fc); p.rect(lx - rr / 2, ly - rr, rr, rr * 2, fc); }
            }
            p.rect(lx - 1, ly, 2, 1, '#fffbe8');
          }
        }
        // São João: bandeirinhas strung over the beachfront rooftops
        const hol = S.season && S.season.holidays;
        if (hol && hol.saoJoao) {
          for (const L of S.main.B.lightStrings) {
            if (PS.hash(L.x, 31) > 0.6 || L.w < 6) continue;
            const X = S.mx(L.x);
            if (X - S.om < -L.w || X - S.om > S.VW + 2) continue;
            const y0 = S.groundY + L.y - 4;
            p.rect(X, y0, 1, 5, S.sil); p.rect(X + L.w - 1, y0, 1, 5, S.sil);
            for (let i = 1; i < L.w - 1; i++) {
              const yy = y0 + Math.round(Math.sin((i / (L.w - 1)) * Math.PI) * 1.5);
              if (i % 2) p.rect(X + i, yy + 1, 1, 2, flagC(S, FLAGS_SJ[(i + (L.x >> 1)) % FLAGS_SJ.length]));
              else p.px(X + i, yy, P.dark > 0.45 && (i + (L.x >> 1)) % 4 === 0 ? '#ffe6a0' : S.sil);
            }
          }
        }
      },
    };
  });
})();
