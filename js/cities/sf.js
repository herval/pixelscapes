'use strict';
// San Francisco, seen from the Bay: the Golden Gate and the Marin headlands, pastel hills (Russian Hill,
// Telegraph Hill + Coit Tower), a compact downtown (Transamerica, Salesforce, 181 Fremont), the Ferry
// Building, and the Bay Bridge with its Bay Lights. Karl the Fog rolls in most mornings.
(function () {
  const PS = window.PS;
  const { hex, mix, clamp } = PS;

  const WM = 2400;               // main layer width
  const FAR_PAR = 0.25, MID_PAR = 0.5;
  const WF = WM * FAR_PAR;       // far/mid layers repeat exactly once per main loop, so they stay aligned
  const WMID = WM * MID_PAR;
  const farX = (xm) => ((240 + (xm - 240) * FAR_PAR) % WF + WF) % WF;   // far x seen behind main x (screen centre)
  const midX = (xm) => ((240 + (xm - 240) * MID_PAR) % WMID + WMID) % WMID;

  const gauss = PS.kit.gauss;
  const kit = PS.kit;

  const STYLE = {
    glassChance: 0.55,
    glass: ['glass', 'glass2', 'glassG', 'glass', '#8fa6b8'],
    front: ['pastelY', 'pastelB', 'pastelP', 'pastelG', 'white', 'cream', 'pastelO', 'pastelL', 'white', 'lime'],
    back: ['white', 'cream', 'conc', 'lime', 'pastelB', 'pastelY', 'conc2', 'white', 'stone', 'pastelG'],
    setbacks: 0.35,
    fireEscapes: 0.15,
    signs: 0.2,
    shopGlow: 0.55,
    waterTowers: [0.04, 0.02],
    crowns: false,
    flags: ['us', 'ca', 'pride', 'pride'],
    pitchedRoofs: 0.12,
    roofMats: ['roof', 'red', '#8a6a5a'],
    distantMats: [['conc2', 'stone', 'white', 'glass2', 'pastelB', 'cream'], ['white', 'cream', 'conc', 'conc2', 'glass', 'glass2', 'pastelB', 'pastelY', 'stone', 'white']],
    distantWaterTowers: 0.02,
  };
  const PASTELS = ['pastelY', 'pastelB', 'pastelP', 'pastelG', 'pastelO', 'pastelL', 'white', 'cream', 'white'];
  const EVERGREEN = ['#3c5e3a', '#46693f', '#355636', '#4e7244'];
  const HEADLAND = ['#bba664', '#b29e5e', '#a99c5e', '#b8a86a', '#9c9a5a', '#a0a060'];
  const HILLMATS = ['white', 'white', 'cream', 'cream', 'pastelY', 'pastelB', 'pastelP', 'pastelG', 'lime', 'pastelO', 'white', 'pastelL'];

  // Smooth hill bump: height h at c, zero beyond +-hw.
  const bump = (x, c, hw, h, p) => { const d = (x - c) / hw; return Math.abs(d) >= 1 ? 0 : h * Math.pow(1 - d * d, p || 1.4); };

  // Landmark geometry shared between build() and ambient().
  const RH = { c: 858, hw: 128, h: 68 };                 // Russian Hill
  const rhProfile = (x) => bump(x, RH.c, RH.hw, RH.h, 1.25) + bump(x, RH.c + 40, 50, 6, 1);
  const TH = { c: 1066, hw: 62, h: 46 };                 // Telegraph Hill
  const thProfile = (x) => bump(x, TH.c, TH.hw, TH.h, 1.1);
  const ALCATRAZ_X = 760;
  const CABLE = { x0: RH.c - 44, x1: RH.c + 38, period: 50 };

  // ---------------------------------------------------------------------------------------------
  // Small builders

  // Victorian row house: bay window, tall windows, white trim, gable / Italianate cornice / turret.
  function victorian(B, x, w, h, mat, kind) {
    const trim = 'white';
    B.f(x, -h, w - 1, h, mat, 'front');
    B.f(x + w - 1, -h, 1, h, mat, 'sideR');
    B.f(x, -h + 1, 1, h - 1, mat, 'dark', { a: 0.15 });
    // bay window (angled faces) with cornice per floor
    const bx = x + 1;
    for (let fy = -h + 2; fy < -3; fy += 6) {
      const fh = Math.min(5, -3 - fy);
      B.f(bx, fy, 1, fh, mat, 'sideL');
      B.f(bx + 1, fy, 1, fh, mat, 'front');
      B.f(bx + 2, fy, 1, fh, mat, 'sideR');
      B.f(bx - 1 < x ? x : bx - 1, fy - 1, 5, 1, trim, 'rim');
      if (fh >= 4) for (let i = 0; i < 3; i++) B.win(bx + i, fy + 1, 1, 3, mat);
      if (w >= 7 && fh >= 4) B.win(x + w - 3, fy + 1, 1, 3, mat);
    }
    // stoop + door
    B.f(x + w - 3, -4, 1, 3, 'dark', 'flat', { a: 0.7 });
    B.f(x + w - 4, -1, 3, 1, trim, 'rim');
    // garage under the bay on some
    if (B.rng() < 0.4) B.f(bx, -3, 3, 2, 'conc2', 'front');
    B.rects.push({ x, y: -h, w, h });
    if (kind === 'gable') {
      const rows = Math.ceil(w / 2);
      for (let i = 0; i < rows; i++) {
        const ww = w - i * 2;
        if (ww <= 0) break;
        B.f(x + i, -h - 1 - i, ww, 1, mat, 'front');
        B.f(x + i, -h - 1 - i, 1, 1, trim, 'rim');
        B.f(x + i + ww - 1, -h - 1 - i, 1, 1, trim, 'rim');
      }
      B.f(x - 1, -h, w + 2, 1, trim, 'rim');
      if (w >= 6) B.win(x + (w >> 1) - (w % 2 ? 0 : 1), -h - 3, 1, 1, mat);
      B.lightStrings.push({ x, w, y: -h - 1, ph: B.rng() * 10 });
      return null;
    }
    if (kind === 'turret') {
      const tx = x + w - 3;
      B.f(tx, -h - 3, 3, 3, mat, 'sideR');
      B.win(tx + 1, -h - 2, 1, 1, mat);
      for (let i = 0; i < 4; i++) B.f(tx + (i >> 1), -h - 4 - i, 3 - (i >> 1) * 2 || 1, 1, 'roof', i === 3 ? 'rim' : 'front');
      B.f(x - 1, -h - 1, w - 2, 1, trim, 'rim');
      B.f(x, -h, w - 3, 1, 'dark', 'flat', { a: 0.3 });
      return { x: x + 1, w: w - 5, y: -h - 1 };
    }
    // Italianate false front with bracketed cornice
    B.f(x - 1, -h - 1, w + 1, 1, trim, 'rim');
    B.f(x, -h, w, 1, 'dark', 'flat', { a: 0.3 });
    for (let i = x; i < x + w; i += 2) B.f(i, -h, 1, 1, trim, 'front', { a: 0.8 });
    B.lightStrings.push({ x, w, y: -h - 2, ph: B.rng() * 10 });
    return { x: x + 1, w: w - 2, y: -h - 1 };
  }

  // A run of Victorians, contiguous (Painted Ladies) or with little gaps.
  function victorianRow(B, x0, x1, o) {
    const r = B.rng;
    let x = x0;
    let i = 0;
    while (x < x1 - 6) {
      const w = o.w ? o.w : r.int(7, 9);
      const h = o.h ? o.h + (i % 2) : r.int(13, 19);
      const mat = o.mats ? o.mats[i % o.mats.length] : r.pick(PASTELS);
      const kind = o.kind || r.pick(['gable', 'gable', 'flat', 'flat', 'turret']);
      const roof = victorian(B, x, w, h, mat, kind);
      if (roof && roof.w >= 5) B.roofs.push({ x: roof.x, w: roof.w, y: -h, row: 'front', ri: B.rects.length });
      x += w + (o.gap != null ? o.gap : r.int(0, 2));
      i++;
    }
  }

  // SF hillside: terraces of houses, drawn from the crest down so nearer rows overlap the ones behind.
  function terraceHouses(B, x0, x1, profile, o) {
    o = o || {};
    const r = B.rng;
    const mats = o.mats || PASTELS;
    const [w0, w1] = o.w || [3, 6], [h0, h1] = o.h || [3, 5], dy = o.dy || 3;
    let maxG = 0;
    for (let x = x0; x < x1; x++) maxG = Math.max(maxG, profile(x));
    for (let y = -Math.ceil(maxG) + 1; y <= -2; y += dy) {
      let x = x0 + r.int(0, 2);
      while (x < x1) {
        const w = r.int(w0, w1), h = r.int(h0, h1);
        const g = Math.min(profile(x), profile(x + w - 1));
        if (-y <= g - 1 && y - h >= -g - (o.poke != null ? o.poke : 2)) {
          if (r() < (o.tree != null ? o.tree : 0.08)) {
            const m = r.pick(EVERGREEN);
            B.f(x, y - 3, w, 3, m, 'front'); B.f(x + 1, y - 4, w - 2, 1, m, 'rim');
          } else {
            const m = r.pick(mats);
            B.f(x, y - h, w - 1, h, m, 'front');
            B.f(x + w - 1, y - h, 1, h, m, 'sideR');
            B.f(x, y - h, w, 1, m, 'rim');
            for (let wx = x + 1; wx < x + w - 1; wx += 2) B.win(wx, y - h + 2, 1, 1, m, { th: r() * 0.95 });
          }
        }
        x += w + (r() < 0.15 ? 1 : 0);
      }
    }
  }

  // Tiny far-away houses sprinkled over hills.
  function specks(B, x0, x1, profile, o) {
    const r = B.rng;
    for (let x = x0; x < x1; x += r.int(2, 4)) {
      const g = Math.round(profile(x));
      if (g < 3) continue;
      const top = Math.min(g, o.maxH || g);
      for (let y = -top + 1; y < -1; y += r.int(2, 3)) {
        if (r() > (o.density || 0.5)) continue;
        const m = r.pick(o.mats || PASTELS);
        B.f(x, y - 1, 2, 1, m, 'front');
        if (r() < 0.5) B.win(x, y, 1, 1, m, { th: r() * 0.9 });
      }
    }
  }

  // Hill silhouette like kit.mountain, but shaded from a smoothed slope so gentle slopes don't stripe.
  function hill(B, x0, x1, profile, o) {
    o = o || {};
    const veg = o.veg || EVERGREEN, rock = o.rock || 'rock', steepK = o.rockSlope || 1.6;
    for (let x = x0; x < x1; x++) {
      const h = Math.round(profile(x));
      if (h <= 0) continue;
      // slope over a wide window so light/shadow changes gradually instead of striping column by column
      const sl = (profile(x + 12) - profile(x - 12)) / 24;
      const side = sl > 0 ? 'sideL' : 'sideR', mixK = o.flat ? 0 : clamp((Math.abs(sl) - 0.15) / 0.4, 0, 1);
      const steep = Math.abs(sl) > steepK;
      for (let y = -h; y < 0; y += 2) {
        const depth = y + h;
        const k = PS.hash(x * 7 + 3, y) < mixK ? side : 'front'; // noise, not a column-aligned dither
        const m = steep && depth < h * 0.9 && PS.hash(x, y) < 0.7 ? rock : veg[(PS.hash(x, y) * veg.length) | 0];
        B.f(x, y, 1, Math.min(2, -y), m, depth < 2 ? 'rim' : k);
      }
    }
    B.rects.push({ x: x0, y: -Math.round(profile((x0 + x1) / 2)), w: x1 - x0, h: 1 });
  }

  // Tree canopy band (Presidio, parks): uses the mountain texturer with evergreen colors.
  function canopy(B, x0, x1, base, amp) {
    hill(B, x0, x1, (x) => base + amp * (0.5 + 0.5 * Math.sin(x * 0.37) * Math.sin(x * 0.11 + 1)) + (PS.hash(x, 3) < 0.3 ? 1 : 0), { veg: EVERGREEN, rock: EVERGREEN[2], rockSlope: 9, flat: true });
  }

  // ---------------------------------------------------------------------------------------------
  // Landmarks

  function goldenGate(B, xa, t1, t2, xb) {
    const O = 'orange', deck = -32, top = -128, TW = 15;
    const glow = { glow: hex('#ffc2a0') }, cglow = { glow: hex('#ffa888') };
    // Distant water under the span (reflects the sky)
    B.glass(xa + 8, -3, xb - xa - 16, 3, 'glassD', 'flat');
    // approach piers (steel lattice pylons) on the side spans
    for (const px of [xa + 32, xa + 64, xb - 40]) {
      B.f(px, deck + 4, 2, -deck - 4, O, 'front');
      B.f(px + 2, deck + 4, 1, -deck - 4, O, 'sideR');
      for (let y = deck + 6; y < -2; y += 5) B.f(px - 1, y, 4, 1, O, 'dark', { a: 0.5 });
    }
    // Towers
    const struts = [top + 1, -106, -84, -62];
    for (const tx of [t1, t2]) {
      // concrete fender pier in the water
      B.box(tx - 3, -4, TW + 6, 5, 'conc', { side: 2, noEdge: true });
      for (let y = top; y < -4; y++) {
        // legs step inwards at each portal strut: art-deco setbacks
        const step = y < struts[3] ? (y < struts[2] ? (y < struts[1] ? 3 : 2) : 1) : 0;
        const lw = 4 - (step >= 2 ? 1 : 0);
        const lxx = tx + (step >= 1 ? 1 : 0), rxx = tx + TW - lw - (step >= 1 ? 1 : 0);
        B.f(lxx, y, 1, 1, O, 'rim', glow);
        B.f(lxx + 1, y, lw - 2, 1, O, 'front', glow);
        B.f(lxx + lw - 1, y, 1, 1, O, 'sideR', glow);
        B.f(rxx, y, 1, 1, O, 'front', glow);
        B.f(rxx + 1, y, lw - 2, 1, O, 'front', glow);
        B.f(rxx + lw - 1, y, 1, 1, O, 'sideR', glow);
      }
      // vertical fluting grooves on the legs
      B.f(tx + 2, top + 6, 1, -top - 10, O, 'dark', { a: 0.28 });
      B.f(tx + TW - 3, top + 6, 1, -top - 10, O, 'dark', { a: 0.28 });
      // portal struts (recessed openings between them)
      for (let i = 0; i < struts.length; i++) {
        const y = struts[i], th = i === 0 ? 5 : 3;
        const inset = i === 0 ? 1 : i === 1 ? 1 : 1;
        B.f(tx + inset, y, TW - inset * 2, th, O, 'front', glow);
        B.f(tx + inset, y, TW - inset * 2, 1, O, 'rim', glow);
        B.f(tx + inset + 1, y + th - 1, TW - inset * 2 - 2, 1, O, 'dark', { a: 0.45 });
        // art-deco ribs on the crown strut
        if (i === 0) for (let k = tx + 3; k < tx + TW - 3; k += 2) B.f(k, y + 1, 1, 3, O, 'dark', { a: 0.3 });
      }
      // under-deck strut and the portal below the roadway
      B.f(tx + 1, deck + 3, TW - 2, 4, O, 'front', glow);
      B.f(tx + 1, deck + 3, TW - 2, 1, O, 'rim', glow);
      // tower cap
      B.f(tx + 1, top - 2, 3, 2, O, 'rim', glow);
      B.f(tx + TW - 4, top - 2, 3, 2, O, 'rim', glow);
      B.rects.push({ x: tx, y: top - 2, w: TW, h: -top + 2 });
      B.blink(tx + 2, top - 3, { period: 2.4 });
      B.blink(tx + TW - 3, top - 3, { period: 2.4, phase: 1.2 });
      B.blink(tx + 2, -84, { period: 2.4, phase: 0.6 });
      B.blink(tx + TW - 3, -84, { period: 2.4, phase: 1.8 });
    }
    // Deck: stiffening truss
    B.f(xa, deck, xb - xa, 1, O, 'rim');
    B.f(xa, deck + 1, xb - xa, 3, O, 'front');
    B.f(xa, deck + 3, xb - xa, 1, O, 'dark', { a: 0.55 });
    for (let x = xa; x < xb; x += 3) B.f(x, deck + 1, 1, 2, O, 'dark', { a: 0.35 });
    // Main cables (2px) and suspenders
    const c1 = t1 + TW - 2, c2 = t2 + 1, cy = top + 1;
    const sagMain = (deck - 3) - cy;
    const mains = [
      kit.cable(B, xa + 6, deck - 1, t1 + 1, cy, 7, O, cglow),
      kit.cable(B, c1, cy, c2, cy, sagMain, O, cglow),
      kit.cable(B, t2 + TW - 2, cy, xb - 6, deck - 1, 7, O, cglow),
    ];
    kit.cable(B, c1, cy + 1, c2, cy + 1, sagMain, O);
    kit.cable(B, xa + 6, deck, t1 + 1, cy + 1, 7, O);
    kit.cable(B, t2 + TW - 2, cy + 1, xb - 6, deck, 7, O);
    for (const pts of mains) {
      pts.forEach(([x, y], i) => {
        if (i % 2 === 0 && y < deck - 2) B.f(x, y + 2, 1, deck - y - 2, O, 'flat', { a: 0.42 });
      });
    }
    // Deck lights (sodium) and anchorages
    for (let x = xa + 4; x < xb - 4; x += 5) B.emit(x, deck - 1, 1, 1, O, '#ffd890', 'flat');
    for (let x = xa + 2; x < xb - 2; x += 5) B.emit(x, deck + 2, 1, 1, O, '#ffb070', 'dark');
    B.box(xa - 4, deck - 4, 12, -deck + 4, 'conc', { side: 2, bands: 7 });
    B.box(xb - 8, deck - 4, 12, -deck + 4, 'conc', { side: 2, bands: 7 });
    return { deckY: deck, x0: xa, x1: xb, top };
  }

  function fortPoint(B, x) {
    B.box(x, -7, 18, 7, 'brick2', { side: 2, win: { ww: 1, wh: 1, px: 2, py: 3, my: 2 } });
    B.f(x, -8, 18, 1, 'brick', 'rim');
    B.f(x + 16, -11, 1, 3, 'dark', 'flat');
    B.flags.push({ x: x + 17, y: -11, kind: 'us', ph: 2 });
  }

  function palaceOfFineArts(B, cx) {
    // colonnade wings
    B.f(cx - 16, -7, 32, 7, 'stone', 'front');
    B.f(cx - 16, -8, 32, 1, 'stone', 'rim');
    for (let x = cx - 15; x < cx + 16; x += 2) B.f(x, -6, 1, 5, 'stone', 'dark', { a: 0.4 });
    // rotunda: drum + dome
    B.f(cx - 7, -14, 14, 7, 'terra', 'front');
    B.f(cx + 5, -14, 2, 7, 'terra', 'sideR');
    for (let x = cx - 6; x < cx + 6; x += 2) B.f(x, -13, 1, 5, 'terra', 'dark', { a: 0.35 });
    const R0 = 7;
    for (let j = 0; j < R0; j++) {
      const hw = Math.round(Math.sqrt(R0 * R0 - j * j));
      B.f(cx - hw, -15 - j, hw * 2, 1, '#c98f6a', j === R0 - 1 ? 'rim' : 'front', { glow: hex('#ffd8b0') });
      B.f(cx + hw - 2, -15 - j, 2, 1, '#c98f6a', 'sideR', { glow: hex('#ffd8b0') });
    }
    B.f(cx - 8, -15, 16, 1, 'stone', 'rim');
    B.f(cx, -24, 1, 2, 'stone', 'rim');
    // lagoon reeds
    B.f(cx - 20, -2, 40, 2, 'tree2', 'front');
    B.rects.push({ x: cx - 16, y: -22, w: 32, h: 22 });
  }

  function saintsPeterPaul(B, cx) {
    B.box(cx - 7, -22, 14, 22, 'white', { side: 1, win: { ww: 1, wh: 2, px: 3, py: 5, my: 4 } });
    for (const sx of [cx - 7, cx + 4]) {
      B.box(sx, -40, 3, 18, 'white', { side: 1, noEdge: true });
      B.f(sx, -43, 3, 3, 'white', 'front');
      B.f(sx + 1, -46, 1, 3, 'white', 'rim');
      B.f(sx + 1, -48, 1, 2, 'gold', 'rim');
      B.win(sx + 1, -36, 1, 2, 'white');
    }
    B.emit(cx - 1, -18, 2, 2, 'white', '#ffe7a8', 'dark'); // rose window
    B.f(cx - 3, -25, 6, 3, 'white', 'front');
    B.f(cx - 1, -27, 2, 2, 'white', 'rim');
  }

  function coitTower(B, cx, base) {
    const g = { glowKey: 'sfCoit' };
    B.f(cx - 4, base - 2, 9, 2, 'white', 'front', g);
    B.f(cx - 4, base - 3, 9, 1, 'white', 'rim', g);
    const H = 22;
    B.f(cx - 2, base - 3 - H, 5, H, 'white', 'front', g);
    B.f(cx + 2, base - 3 - H, 1, H, 'white', 'sideR', g);
    B.f(cx - 2, base - 3 - H, 1, H, 'white', 'sideL', g);
    for (let x = cx - 1; x < cx + 2; x += 2) B.f(x, base - H - 1, 1, H - 3, 'white', 'dark', { a: 0.18 });
    // crown with arched openings
    const ct = base - 3 - H;
    B.f(cx - 3, ct - 3, 7, 3, 'white', 'front', g);
    B.f(cx - 3, ct - 3, 7, 1, 'white', 'rim', g);
    for (let x = cx - 2; x < cx + 3; x += 2) B.emit(x, ct - 2, 1, 2, 'white', '#ffe6a8', 'dark');
    B.f(cx - 2, ct - 4, 5, 1, 'white', 'rim', g);
    B.rects.push({ x: cx - 3, y: ct - 4, w: 7, h: H + 7 });
    return { top: ct - 4 };
  }

  function transamerica(B, cx) {
    const H = 124, hw0 = 11, W = '#ebe6dc';
    const halfAt = (r) => hw0 * (1 - r / H);
    for (let r = 0; r < H + 8; r++) {
      const y = -1 - r;
      const half = Math.round(halfAt(Math.min(r, H)));
      if (half <= 0) { B.f(cx, y, 1, 1, W, r > H - 22 ? 'rim' : 'front'); continue; }
      const split = cx + Math.round(half * 0.35);
      B.f(cx - half, y, split - (cx - half), 1, W, 'front');
      B.f(split, y, cx + half + 1 - split, 1, W, 'sideR');
      B.f(cx - half, y, 1, 1, W, 'rim');
      if (r % 3 === 1 && r > 7 && half > 2) {
        for (let x = cx - half + 2; x < cx + half - 1; x += 2) B.win(x, y, 1, 1, W, { office: true, lc: PS.OFFICE[r % 3] });
      }
    }
    // arcade at the base
    for (let x = cx - 10; x < cx + 10; x += 2) B.f(x, -6, 1, 5, 'dark', 'flat', { a: 0.55 });
    B.f(cx - 11, -7, 23, 1, W, 'rim');
    // the two "wings" (elevator east, stairs west) rising vertically from the sloping faces
    const rA = Math.round(H * 0.44), rB = Math.round(H * 0.64), rC = Math.round(H * 0.67);
    const hA = Math.round(halfAt(rA));
    B.f(cx - hA, -1 - rB, 2, rB - rA, W, 'front');
    B.f(cx - hA, -1 - rB, 1, rB - rA, W, 'rim');
    B.f(cx - hA, -1 - rB, 2, 1, W, 'rim');
    B.f(cx + hA - 1, -1 - rC, 2, rC - rA, W, 'sideR');
    B.f(cx + hA - 1, -1 - rC, 2, 1, W, 'rim');
    // lit crown at the tip
    B.emit(cx, -1 - H - 7, 1, 10, W, '#fff6dc', 'rim');
    B.emit(cx - 1, -1 - H + 4, 3, 4, W, '#ffe8b8', 'front');
    B.blink(cx, -2 - H - 8, { period: 1.9 });
    B.rects.push({ x: cx - hw0, y: -H, w: hw0 * 2 + 1, h: H });
    return { top: -H - 9 };
  }

  function californiaSt555(B, cx) {
    const M = '#5a3e3a';
    B.box(cx - 8, -112, 16, 112, M, { side: 3, win: { ww: 1, wh: 1, px: 2, py: 2, my: 2 } });
    for (let x = cx - 7; x < cx + 5; x += 3) B.f(x, -110, 1, 108, M, 'rim', { a: 0.35 });
    B.f(cx - 8, -113, 16, 1, 'dark', 'flat');
  }

  function embarcaderoCenter(B, x, h) {
    const w = 12;
    B.box(x, -h, w, h, 'white', { side: 2, win: { ww: 1, wh: 2, px: 2, py: 3 } });
    // stepped setbacks, lit outlines at night (they are famous for their holiday outline lights)
    B.box(x + 2, -h - 5, w - 4, 5, 'white', { side: 1 });
    B.emit(x, -h, w, 1, 'white', '#fff4d8', 'rim');
    B.emit(x + 2, -h - 5, w - 4, 1, 'white', '#fff4d8', 'rim');
    for (let y = -h; y < -4; y += 2) { B.emit(x, y, 1, 1, 'white', '#fff4d8', 'rim'); B.emit(x + w - 1, y, 1, 1, 'white', '#fff4d8', 'rim'); }
  }

  function millennium(B, cx) {
    B.box(cx - 6, -92, 12, 92, 'glass', { glass: true, mullions: 2, win: { office: true, py: 3, mx: 1 } });
    for (let r = 0; r < 4; r++) B.f(cx - 6 + r, -93 - r, 12 - r * 2, 1, 'glass', r === 3 ? 'rim' : 'sideL');
  }

  function oneRincon(B, cx) {
    B.box(cx - 6, -88, 12, 88, 'glassG', { glass: true, win: { office: true, py: 3, mx: 1 } });
    for (let y = -98; y < -88; y += 2) B.f(cx - 6, y, 12, 1, 'steel', 'front', { a: 0.85 });
    B.f(cx - 6, -98, 1, 10, 'steel', 'front');
    B.f(cx + 5, -98, 1, 10, 'steel', 'sideR');
    B.blink(cx, -99, { period: 2 });
  }

  function salesforce(B, cx) {
    const H = 156, crownH = 15, M = '#c3ccd4';
    const rows = [];
    for (let r = 0; r < H; r++) {
      const y = -1 - r, f = r / H;
      let half = 10.4 - 2.2 * f;
      const k = (r - (H - 11)) / 11;
      if (k > 0) half *= Math.sqrt(Math.max(0, 1 - k * k * 0.92));
      half = Math.round(half);
      if (half < 1) continue;
      const L = cx - half, Rr = cx + half;
      const inCrown = r >= H - crownH;
      if (inCrown) {
        B.f(L, y, Rr - L + 1, 1, 'white', 'front');
        B.f(Rr - 1, y, 2, 1, 'white', 'sideR');
        B.f(L, y, 1, 1, 'white', 'sideL');
        rows.push({ y, L: L + 1, R: Rr - 1 });
        if (r % 2 === 0) for (let x = L + 1; x < Rr; x += 2) B.f(x, y, 1, 1, 'glassD', 'dark', { a: 0.55 });
        else for (let x = L + 1; x < Rr; x += 2) B.f(x, y, 1, 1, 'glassD', 'dark', { a: 0.3 });
        continue;
      }
      B.glass(L + 1, y, Rr - L - 3, 1, M, 'front');
      B.glass(L, y, 1, 1, M, 'sideL');
      B.glass(Rr - 2, y, 3, 1, M, 'sideR');
      if (r % 3 === 1 && r > 3) {
        let x = L + 2;
        while (x < Rr - 2) { const sw = Math.min(Rr - 2 - x, B.rng.int(3, 7)); B.win(x, y, sw, 1, M, { office: true, lc: PS.OFFICE[1] }); x += sw; }
      }
    }
    // vertical sun-shade fins
    for (let x = cx - 8; x <= cx + 6; x += 3) B.f(x, -H + crownH + 2, 1, H - crownH - 4, 'white', 'front', { a: 0.22 });
    // lobby
    B.f(cx - 10, -4, 20, 3, 'glassD', 'front');
    B.emit(cx - 9, -3, 18, 2, 'glassD', '#fff0cc', 'front');
    B.blink(cx, -H - 1, { period: 2.1 });
    B.rects.push({ x: cx - 10, y: -H, w: 21, h: H });
    return { top: -H, crown: rows };
  }

  function fremont181(B, cx) {
    const H = 106;
    B.box(cx - 6, -H, 13, H, 'glass2', { glass: true, win: { office: true, py: 3, mx: 1 } });
    // mega-frame diagonals
    for (let y0 = -3; y0 > -H + 20; y0 -= 26) {
      B.line(cx - 6, y0, cx + 5, y0 - 26, 'steel', 'rim', { a: 0.55 });
      B.line(cx + 5, y0, cx - 6, y0 - 26, 'steel', 'rim', { a: 0.55 });
    }
    // sloped crown to a corner spire
    for (let i = 0; i < 12; i++) {
      const w = 13 - Math.round(i * 1.05);
      if (w <= 0) break;
      B.glass(cx - 6, -H - 1 - i, w, 1, 'glass2', i ? 'sideL' : 'front');
      B.f(cx - 6 + w - 1, -H - 1 - i, 1, 1, 'steel', 'rim');
    }
    B.f(cx - 6, -H - 24, 1, 12, 'steel', 'rim');
    B.blink(cx - 6, -H - 25, { period: 1.7 });
  }

  function ferryBuilding(B, cx) {
    const L = cx - 36, W = 72;
    B.box(L, -12, W, 12, 'cream', { side: 0, noEdge: true });
    B.f(L, -13, W, 1, 'roof', 'rim');
    // arched arcade windows
    for (let x = L + 2; x < L + W - 2; x += 3) {
      B.win(x, -9, 2, 2, 'cream', { lc: PS.WARM[1] });
      B.f(x, -10, 2, 1, 'cream', 'dark', { a: 0.25 });
      B.emit(x, -4, 2, 2, 'cream', '#ffd8a0', 'dark');
    }
    // pavilions at the ends
    for (const px of [L, L + W - 6]) { B.box(px, -15, 6, 15, 'cream', { side: 1 }); B.f(px, -16, 6, 1, 'roof', 'rim'); }
    // clock tower
    const tx = cx - 3;
    B.box(tx, -46, 7, 34, 'cream', { side: 1, win: { ww: 1, wh: 2, px: 2, py: 4, my: 2, mb: 8 }, glow: '#ffe6b8' });
    B.box(tx - 1, -48, 9, 2, 'cream', { side: 1 });
    B.box(tx, -56, 7, 8, 'cream', { side: 1, glow: '#ffe6b8' }); // clock stage (face drawn in ambient)
    B.f(tx - 1, -57, 9, 1, 'cream', 'rim');
    B.box(tx + 1, -61, 5, 4, 'cream', { side: 1, glow: '#ffe6b8' });
    for (const k of [0, 2, 4]) B.emit(tx + 1 + k, -60, 1, 2, 'cream', '#ffe0a0', 'dark');
    B.f(tx + 2, -64, 3, 3, 'copper', 'front');
    B.f(tx + 3, -68, 1, 4, 'dark', 'flat');
    B.flags.push({ x: tx + 4, y: -68, kind: 'us', ph: 1 });
    B.rects.push({ x: tx, y: -61, w: 7, h: 49 });
    return { clockX: cx - 2, clockY: -54 };
  }

  function bayBridge(B, xa, towers, ax, xb) {
    const T = '#9aa3ae', S = 'steel', deck = -30, top = -100;
    const hangers = [];
    B.glass(xa + 10, -3, xb - xa - 10, 3, 'glassD', 'flat');
    // center anchorage
    B.box(ax - 11, -62, 22, 66, 'conc', { side: 3, bands: 9 });
    B.box(ax - 8, -66, 16, 4, 'conc', { side: 2 });
    B.f(ax - 9, -68, 3, 2, S, 'rim'); B.f(ax + 6, -68, 3, 2, S, 'rim');
    // SF anchorage
    B.box(xa - 6, deck - 5, 16, -deck + 9, 'conc', { side: 2, bands: 6 });
    // towers
    for (const tx of towers) {
      B.box(tx - 6, -4, 13, 8, 'conc', { side: 2, noEdge: true });
      for (let y = top; y < -4; y++) {
        const f = (y - top) / (-4 - top);
        const spread = Math.round(3 + 2 * f);
        B.f(tx - spread - 1, y, 2, 1, S, 'front');
        B.f(tx + spread, y, 2, 1, S, 'sideR');
      }
      // X-bracing panels
      const panels = [top + 2, -80, -58, deck - 1];
      for (let i = 0; i < panels.length - 1; i++) {
        const y0 = panels[i], y1 = panels[i + 1];
        const s0 = Math.round(3 + 2 * (y0 - top) / (-4 - top)), s1 = Math.round(3 + 2 * (y1 - top) / (-4 - top));
        B.f(tx - s0, y0, s0 * 2 + 1, 1, S, 'rim');
        B.line(tx - s0, y0 + 1, tx + s1, y1 - 1, S, 'flat', { a: 0.75 });
        B.line(tx + s0, y0 + 1, tx - s1, y1 - 1, S, 'flat', { a: 0.75 });
      }
      B.f(tx - 4, top - 2, 9, 2, S, 'rim');
      B.f(tx - 1, top - 4, 3, 2, S, 'front');
      B.rects.push({ x: tx - 5, y: top - 4, w: 11, h: -top + 4 });
      B.blink(tx, top - 5, { period: 2.6 });
    }
    // double-deck truss
    B.f(xa, deck, xb - xa, 1, T, 'rim');
    B.f(xa, deck + 6, xb - xa, 1, T, 'front');
    B.f(xa, deck + 3, xb - xa, 1, T, 'dark', { a: 0.6 });
    for (let x = xa; x < xb; x += 4) {
      B.f(x, deck + 1, 1, 5, T, 'front');
      B.line(x, deck + 1, x + 3, deck + 5, T, 'flat', { a: 0.5 });
    }
    // cables
    const cy = top + 1;
    const spans = [
      [xa + 4, deck - 2, towers[0], cy, 6],
      [towers[0], cy, towers[1], cy, (deck - 3) - cy],
      [towers[1], cy, ax - 8, -67, 7],
      [ax + 8, -67, towers[2], cy, 7],
      [towers[2], cy, towers[3], cy, (deck - 3) - cy],
      [towers[3], cy, xb - 4, deck - 2, 6],
    ];
    for (const [x0, y0, x1, y1, sag] of spans) {
      const pts = kit.cable(B, x0, y0, x1, y1, sag, S);
      pts.forEach(([x, y], i) => {
        if (i % 3 === 1 && y < deck - 2) {
          B.f(x, y + 1, 1, deck - y - 1, S, 'flat', { a: 0.4 });
          hangers.push({ x, y0: y + 1, y1: deck });
        }
        if (i % 4 === 0) B.emit(x, y, 1, 1, S, '#ffffff', 'rim');
      });
    }
    // deck lights
    for (let x = xa + 2; x < xb; x += 6) B.emit(x, deck - 1, 1, 1, T, '#ffd890', 'flat');
    for (let x = xa + 4; x < xb; x += 6) B.emit(x, deck + 4, 1, 1, T, '#ffe2b0', 'dark');
    return { deckY: deck, x0: xa, x1: xb, hangers };
  }

  function sutroTower(B, cx, base, H) {
    const seg = (x0, y0, x1, y1) => {
      const n = Math.max(Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const y = Math.round(y0 + (y1 - y0) * i / n), x = Math.round(x0 + (x1 - x0) * i / n);
        B.f(x, y, 1, 1, Math.floor(-y / 4) % 2 ? 'red' : 'white', 'rim');
      }
    };
    const waist = base - Math.round(H * 0.6), tip = base - H;
    seg(cx - 5, base, cx - 2, waist);
    seg(cx + 5, base, cx + 2, waist);
    seg(cx, base, cx, waist);
    B.f(cx - 4, base - Math.round(H * 0.25), 9, 1, 'red', 'rim');
    B.f(cx - 5, waist, 11, 1, 'white', 'rim');
    B.f(cx - 4, waist + 1, 9, 1, 'red', 'front');
    seg(cx - 2, waist - 1, cx - 3, tip);
    seg(cx + 2, waist - 1, cx + 3, tip);
    seg(cx, waist - 1, cx, tip - 2);
    B.f(cx - 3, waist - 10, 7, 1, 'white', 'rim');
    B.blink(cx - 3, tip - 1, { period: 2.3 });
    B.blink(cx + 3, tip - 1, { period: 2.3, phase: 0.5 });
    B.blink(cx, tip - 3, { period: 2.3, phase: 1.1 });
    B.blink(cx - 2, waist - 2, { period: 2.3, phase: 1.6 });
  }

  // ---------------------------------------------------------------------------------------------
  // Events

  // Blue Angels: six jets in delta formation trailing smoke; sometimes a loop, sometimes a break.
  function blueAngels(S) {
    const R = PS.EV.R;
    const dir = R() < 0.5 ? 1 : -1;
    const mode = R.pick(['pass', 'loop', 'loop', 'break']);
    const v = 46;
    const ev = { z: 'front', space: 'screen', t: 0, smoke: [] };
    const lead = { x: dir > 0 ? -20 : S.VW + 20, y: R.range(S.horizon * 0.22, S.horizon * 0.4), th: dir > 0 ? 0 : Math.PI };
    const loopR = R.range(24, 32);
    const loopAt = R.range(0.35, 0.6) * S.VW;
    let loopLeft = mode === 'loop' ? Math.PI * 2 : 0, looping = false, broke = false;
    const OFF = [[0, 0], [-6, -4], [-6, 4], [-12, 0], [-12, -8], [-12, 8]];
    const jets = OFF.map(([a, l]) => ({ a, l, x: 0, y: 0, th: lead.th, spread: 0 }));
    let tick = 0;
    ev.update = (dt) => {
      ev.t += dt;
      if (mode === 'loop' && !looping && loopLeft > 0 && (dir > 0 ? lead.x > loopAt : lead.x < loopAt)) looping = true;
      if (looping) {
        const dth = (v / loopR) * dt;
        lead.th -= dir * dth; loopLeft -= dth;
        if (loopLeft <= 0) { looping = false; lead.th = dir > 0 ? 0 : Math.PI; }
      }
      if (mode === 'break' && !broke && (dir > 0 ? lead.x > loopAt : lead.x < loopAt)) broke = true;
      lead.x += Math.cos(lead.th) * v * dt; lead.y += Math.sin(lead.th) * v * dt;
      const hx = Math.cos(lead.th), hy = Math.sin(lead.th), nx = -hy, ny = hx;
      jets.forEach((j, i) => {
        if (broke) {
          // delta break: fan out, each on its own climbing heading
          const target = (dir > 0 ? 0 : Math.PI) - dir * (0.25 + (i / 5) * 1.3) * (i % 2 ? 1 : -0.6);
          j.th += (target - j.th) * Math.min(1, dt * 1.5);
          j.x += Math.cos(j.th) * v * dt; j.y += Math.sin(j.th) * v * dt;
        } else {
          j.x = lead.x + hx * j.a + nx * j.l; j.y = lead.y + hy * j.a + ny * j.l; j.th = lead.th;
        }
      });
      tick += dt;
      if (tick > 0.07) {
        tick = 0;
        for (const j of jets) ev.smoke.push({ x: j.x - Math.cos(j.th) * 3, y: j.y - Math.sin(j.th) * 3, a: 0 });
      }
      for (const s of ev.smoke) { s.a += dt; s.y += dt * 0.6; }
      if (ev.smoke.length && ev.smoke[0].a > 6) ev.smoke = ev.smoke.filter((s) => s.a < 6);
      const inView = jets.some((j) => j.x > -40 && j.x < S.VW + 40 && j.y > -40 && j.y < S.horizon + 20);
      return ev.t < 3 || inView || ev.smoke.length > 0 && ev.t < 40 && jets.some((j) => j.x > -200 && j.x < S.VW + 200);
    };
    ev.draw = (p) => {
      const P = S.P;
      const sc = mix([255, 255, 255], P.hor, 0.25);
      for (const s of ev.smoke) {
        const k = s.a / 6;
        const sz = s.a < 1.5 ? 1 : 2;
        p.rect(Math.round(s.x - (sz >> 1)), Math.round(s.y - (sz >> 1)), sz, sz, PS.cssA(sc, 0.75 * (1 - k) * (1 - k)));
      }
      const blue = PS.css(PS.mul(hex('#1c3c96'), PS.add(P.amb, PS.scale(P.sun, 0.5)))), gold = PS.css(PS.mul(hex('#f2c230'), PS.add(P.amb, PS.scale(P.sun, 0.5))));
      for (const j of jets) {
        const hx = Math.cos(j.th), hy = Math.sin(j.th);
        const px = (k, l, c) => p.rect(Math.round(j.x - hx * k - hy * l), Math.round(j.y - hy * k + hx * l), 1, 1, c);
        px(0, 0, blue); px(1, 0, gold); px(2, 0, blue); px(3, 0, blue); px(4, 0, blue);
        px(2, -1, blue); px(2, 1, blue); px(3, -2, gold); px(3, 2, gold); px(5, -1, blue); px(5, 1, blue);
      }
    };
    return ev;
  }

  // Alcatraz: a persistent island in the water (spawned by ambient when it scrolls into view).
  function alcatraz(S) {
    const X0 = ALCATRAZ_X;
    const ev = { z: 'water', space: 'main', t: 0, ambient: true };
    ev.update = (dt) => { ev.t += dt; const X = S.mx(X0) - S.om; return X > -120 && X < S.VW + 120; };
    ev.draw = (p) => {
      const P = S.P, t = ev.t;
      const x = Math.round(S.mx(X0)), wl = S.horizon + 9;
      const L = (c, k) => {
        const s = k === 'side' ? PS.add(PS.scale(P.amb, 0.6), PS.scale(P.sun, Math.max(0, P.sunDir) * 0.9 + 0.05)) : k === 'rim' ? PS.add(PS.scale(P.amb, 1.15), PS.scale(P.sun, 0.7)) : PS.add(PS.scale(P.amb, 0.86), PS.scale(P.sun, 0.32));
        const fog = (P.fog || 0) * 0.35 + 0.06;
        return PS.css(mix(PS.mul(hex(c), s), mix(P.hor, P.mid, 0.25), Math.min(0.8, fog)));
      };
      // reflection hint
      p.ctx.globalAlpha = 0.25;
      p.rect(x + 4, wl + 1, 40, 2, L('#5a524a'));
      p.rect(x + 14, wl + 3, 22, 1, L('#d8d0c0'));
      p.ctx.globalAlpha = 1;
      // rock: cliffs rising to a plateau, scrubby green on top
      for (let i = 0; i < 50; i++) {
        const d = (i - 25) / 25;
        const h = Math.round(Math.min(8, 13 * (1 - d * d)) + (PS.hash(i, 9) < 0.3 ? 1 : 0) - (i > 40 ? (i - 40) * 0.4 : 0));
        if (h <= 0) continue;
        const cliff = Math.abs(d) > 0.55;
        p.rect(x + i - 1, wl - h + 1, 1, h, L('#7a7068', cliff ? (d > 0 ? 'side' : 'front') : 'front'));
        p.rect(x + i - 1, wl - h + 1, 1, 1, L(PS.hash(i, 3) < 0.5 ? '#5a7a48' : '#8a8a5a', 'rim'));
        if (!cliff && PS.hash(i, 4) < 0.35) p.rect(x + i - 1, wl - h + 2, 1, 2, L('#4f6e44'));
      }
      p.rect(x + 1, wl, 46, 1, PS.cssA([235, 240, 255], 0.4 + 0.2 * P.day));
      // cellhouse
      const cy = wl - 7;
      p.rect(x + 13, cy - 5, 20, 5, L('#d8d0c0'));
      p.rect(x + 13, cy - 6, 20, 1, L('#e8e2d4', 'rim'));
      p.rect(x + 31, cy - 5, 2, 5, L('#d8d0c0', 'side'));
      for (let i = x + 15; i < x + 31; i += 2) p.rect(i, cy - 3, 1, 1, P.dark > 0.5 && PS.hash(i, 5) < 0.2 ? '#ffd88a' : L('#3a3844'));
      // warden's house + water tower
      p.rect(x + 34, cy - 3, 6, 3, L('#c8a888'));
      p.rect(x + 7, cy - 7, 1, 7, L('#3a3844')); p.rect(x + 11, cy - 7, 1, 7, L('#3a3844'));
      p.rect(x + 6, cy - 11, 7, 4, L('#b8b0a4')); p.rect(x + 6, cy - 11, 7, 1, L('#d0c8bc', 'rim'));
      // lighthouse
      const lx = x + 34;
      p.rect(lx, cy - 13, 2, 10, L('#eeebe4'));
      p.rect(lx + 1, cy - 13, 1, 10, L('#eeebe4', 'side'));
      p.rect(lx - 1, cy - 14, 4, 1, L('#3a3844'));
      const lamp = P.dark > 0.25;
      p.rect(lx, cy - 16, 2, 2, lamp ? '#fff2b0' : L('#cfd6e0'));
      p.rect(lx, cy - 17, 2, 1, L('#3a3844'));
      if (lamp) {
        const a = t * 1.1, c = Math.cos(a), s = Math.sin(a);
        const len = Math.round(10 + 50 * Math.abs(c));
        const dirx = c > 0 ? 1 : -1;
        const k = P.dark * (0.55 + 0.45 * (P.fog || 0));
        for (let i = 2; i < len; i += 2) {
          const f = 1 - i / len;
          const hh = 1 + Math.floor(i / 16);
          p.rect(lx + (dirx > 0 ? 2 + i : -i - 1), cy - 15 - (hh >> 1), 2, hh, PS.cssA([255, 244, 200], k * f * 0.8));
        }
        if (Math.abs(s) > 0.93) {
          const fl = (Math.abs(s) - 0.93) / 0.07;
          p.ctx.globalAlpha = 0.5 * fl * P.dark;
          p.rect(lx - 2, cy - 18, 6, 6, '#fff6d0');
          p.ctx.globalAlpha = 1;
        }
      }
    };
    return ev;
  }

  // Sea lions lounging on a floating dock (Pier 39), barking now and then.
  function seaLions(S) {
    const R = PS.EV.R;
    const X0 = S.om + R.range(0.2, 0.7) * S.VW;
    const y = S.horizon + R.int(14, 22);
    const n = R.int(4, 7);
    const lions = Array.from({ length: n }, (_, i) => ({ dx: 2 + i * 5 + R.int(-1, 1), ph: R() * 10, up: R() < 0.4 }));
    const ev = { z: 'water', space: 'main', t: 0 };
    ev.update = (dt) => { ev.t += dt; return ev.t < 40 && !PS.EV.scrolledAway(S, X0 + 40); };
    ev.draw = (p) => {
      const P = S.P, t = ev.t;
      const fade = Math.min(1, t / 2, (40 - t) / 2);
      const x = S.mx(X0);
      const lit = (c) => PS.css(PS.mul(hex(c), PS.add(PS.scale(P.amb, 0.9), PS.scale(P.sun, 0.35))));
      p.ctx.globalAlpha = fade;
      p.rect(x, y + 3, n * 5 + 4, 2, lit('#7a6a58'));
      p.rect(x, y + 5, n * 5 + 4, 1, lit('#3a3844'));
      for (const l of lions) {
        const bark = Math.sin(t * 1.3 + l.ph) > 0.92;
        const c = lit('#6a4a34');
        if (l.up || bark) { p.rect(x + l.dx, y + 1, 4, 2, c); p.rect(x + l.dx + 3, y - 1, 1, 2, c); p.px(x + l.dx + 4, y - 1, c); }
        else p.rect(x + l.dx, y + 2, 5, 1, c);
        if (bark && Math.floor(t * 6) % 2) p.text('ARF', x + l.dx - 2, y - 8, P.dark > 0.5 ? '#ffe2a0' : '#ffffff');
      }
      p.ctx.globalAlpha = 1;
    };
    return ev;
  }

  // ---------------------------------------------------------------------------------------------

  PS.registerCity('sf', 'San Francisco', function (seed) {
    const layers = [];
    const dayIdx = Math.floor(Date.now() / 864e5);

    // Far layer: Mt Tamalpais, Twin Peaks with Sutro Tower, San Bruno hills; hazy specks of houses.
    {
      const B = new PS.Builder(WF, PS.rng(seed + 11));
      const tamX = farX(250), sbX = farX(1000), eastX = farX(1900);
      const d = (x, c) => { let v = x - c; v -= Math.round(v / WF) * WF; return v; };
      const prof = (x) => {
        const g = (c, s, h) => h * Math.exp(-(d(x, c) ** 2) / (2 * s * s));
        return 10 + g(tamX, 34, 62) + g(tamX - 55, 38, 38) + g(tamX + 55, 30, 30)
          + g(sbX, 60, 30) + g(sbX + 50, 30, 16)
          + g(eastX, 70, 26) + g(eastX + 90, 40, 18) + 5 * Math.sin(x * 0.05);
      };
      hill(B, 0, WF, prof, { veg: ['#6e7c58', '#7a8660', '#8a8a62', '#6a7a56'], rock: '#8a8272', rockSlope: 2.4 });
      specks(B, 0, WF, (x) => (Math.abs(d(x, tamX)) < 110 ? Math.min(prof(x), 8) : prof(x)), { density: 0.45, maxH: 26 });
      layers.push({ name: 'far', par: FAR_PAR, W: WF, haze: 0.5, B, fogK: 0.32 });
    }

    // Mid layer: Sausalito, Pacific Heights, Nob Hill, distant downtown, SoMa and Potrero.
    {
      const B = new PS.Builder(WMID, PS.rng(seed + 22));
      const r = B.rng;
      const dist = (x, w, h) => kit.distant(B, x, w, h, false, STYLE);
      const mGG = midX(270), mPH = midX(640), mTP = midX(900), mNob = midX(1110), mDT = midX(1420), mSoma = midX(1900), mYBI = midX(2300);
      const dd = (x, c) => { let v = x - c; v -= Math.round(v / WMID) * WMID; return v; };
      const g = (x, c, s, h) => h * Math.exp(-(dd(x, c) ** 2) / (2 * s * s));
      const twin = (x) => g(x, mTP - 9, 7, 30) + g(x, mTP + 9, 7, 28) + g(x, mTP, 30, 26) + g(x, mTP - 34, 12, 34);
      const hills = (x) => g(x, mGG, 60, 50) + g(x, mGG + 70, 40, 30) + g(x, mPH, 40, 26) + twin(x) + g(x, mNob, 26, 36)
        + g(x, mSoma + 40, 26, 22) + g(x, mSoma + 110, 22, 26) + g(x, mYBI, 50, 26) + 4;
      // tall buildings first (hills paint over their feet)
      for (let x = 0; x < WMID;) {
        const w = r.int(6, 14);
        const dt = g(x, mDT, 70, 1);
        const env = 70 * dt + 34 * g(x, mNob, 18, 1) + 20 * g(x, mPH, 70, 1) + 14 * g(x, mSoma, 90, 1);
        const h = Math.round(env * r.range(0.5, 1.05));
        if (h > 12) dist(x, w, h + Math.round(hills(x + w / 2) * 0.7));
        x += w + r.int(0, dt > 0.5 ? 1 : 6);
      }
      hill(B, 0, WMID, hills, { veg: ['#5c7a4c', '#6a8454', '#7a8a58', '#4e6e44'], rock: '#8a8070' });
      terraceHouses(B, 0, WMID, (x) => (Math.abs(dd(x, mGG)) < 90 ? Math.min(hills(x), 18) : Math.abs(dd(x, mTP)) < 50 ? Math.min(hills(x), 24) : hills(x)), { mats: HILLMATS, w: [2, 4], h: [2, 3], dy: 2, tree: 0.12, poke: 0 });
      // Sutro Tower on Mt Sutro, next to Twin Peaks
      {
        const sx = Math.round(mTP - 34);
        sutroTower(B, sx, -Math.round(hills(sx)) + 1, 62);
      }
      // low city along the bottom where there are no hills
      for (let x = 0; x < WMID;) {
        const w = r.int(5, 11);
        if (Math.abs(dd(x, mGG)) < 120 || Math.abs(dd(x, mYBI)) < 60) { x += w; continue; }
        const h = r.int(8, 20);
        if (hills(x + w / 2) < h + 6) dist(x, w, h);
        x += w + r.int(0, 3);
      }
      layers.push({ name: 'mid', par: MID_PAR, W: WMID, haze: 0.32, B, groundGlow: 20, fogK: 0.42 });
    }

    // ------------------------------------------------------------------ Main layer
    const B = new PS.Builder(WM, PS.rng(seed));
    const r = B.rng;
    const generic = (x, w, h, row) => kit.generic(B, x, w, h, row, STYLE);
    const lm = {};
    const GG = { xa: 30, t1: 124, t2: 384, xb: 500 };
    const BB = { xa: 1690, towers: [1772, 1878, 2042, 2148], ax: 1960, xb: 2226 };

    // Hills behind everything: Marin headlands, Yerba Buena Island, Presidio forest.
    B.hz = 0.14;
    const headlands = (x) => {
      const h = bump(x, 440, 240, 76, 1.1) + bump(x, 300, 90, 16, 1) + bump(x, 540, 80, 12, 1) + bump(x, 470, 40, 8, 1) + bump(x, 380, 30, 5, 1);
      return x < 160 ? h * Math.max(0, (x - 138) / 22) : h;
    };
    hill(B, 138, 690, headlands, { veg: HEADLAND, rock: '#8a7a64', rockSlope: 6 }); // grassy hills: no rock streaks
    B.hz = 0.1;
    const ybi = (x) => bump(x, 2262, 92, 48, 1.2) + bump(x, 2240, 30, 5, 1);
    hill(B, 2170, 2356, ybi, { veg: EVERGREEN, rock: '#7a7060', rockSlope: 2.2 });
    B.hz = 0.06;
    canopy(B, 2330, WM, 8, 7);
    canopy(B, 0, 138, 9, 7);

    // Back row (hazier) by neighbourhood
    B.hz = 0.1;
    const lmSpans = [[1152, 1188], [1196, 1224], [1296, 1386], [1394, 1418], [1426, 1456], [1466, 1492], [1590, 1612]];
    const nearLm = (x) => lmSpans.some(([a, b]) => x > a - 5 && x < b + 5);
    const envDT = (x) => 22 + 62 * gauss(x, 1420, 80, WM) + 40 * gauss(x, 1240, 60, WM) + 30 * gauss(x, 1580, 40, WM);
    kit.fillRow(B, 548, 750, { minW: 7, maxW: 14, height: () => r.int(14, 26), build: (x, w, h) => generic(x, w, h, 'back') });
    kit.fillRow(B, 968, 1016, { minW: 7, maxW: 12, height: () => r.int(16, 28), build: (x, w, h) => generic(x, w, h, 'back') });
    kit.fillRow(B, 1118, 1740, {
      minW: 8, maxW: 18, gapMax: 1,
      height: (x) => {
        let h = envDT(x) * r.range(0.55, 1.05);
        if (x > 1640) h = Math.min(h, r.int(22, 44) - (x - 1640) * 0.2);
        if (nearLm(x)) h = Math.min(h, r.int(26, 50));
        if (x > 1296 && x < 1340) h = Math.min(h, r.int(20, 30));
        return h;
      },
      build: (x, w, h) => generic(x, w, h, 'back'),
    });

    // Russian Hill: apartment towers on the crest (feet hidden by the hill), then the hill and its houses
    B.hz = 0.07;
    for (const [x, w, h] of [[818, 9, 16], [882, 8, 13]]) {
      const base = Math.round(rhProfile(x + w / 2));
      B.box(x, -base - h, w, base + h, r.pick(['white', 'cream', 'pastelB']), { side: 1, win: { ww: 1, wh: 1, px: 2, py: 2 } });
      B.roofs.push({ x: x + 1, w: w - 2, y: -base - h, row: 'back', ri: B.rects.length });
    }
    hill(B, RH.c - RH.hw, RH.c + RH.hw, rhProfile, { veg: EVERGREEN.concat(['tree2']), rock: '#8a7a64', rockSlope: 3 });
    terraceHouses(B, RH.c - RH.hw + 4, RH.c + RH.hw - 4, rhProfile, { mats: HILLMATS });
    // Lombard Street's switchbacks with hydrangeas
    {
      const lx = 902;
      for (let i = 0; i < 7; i++) {
        const y = -Math.round(rhProfile(lx + 6)) + 6 + i * 3;
        B.f(lx + (i % 2 ? 1 : 0), y, 8, 1, 'conc2', 'front');
        B.f(lx + (i % 2 ? 0 : 8), y, 1, 3, 'conc2', 'front');
        B.f(lx + 1, y + 1, 7, 1, i % 2 ? 'pastelP' : 'tree2', 'front');
        B.f(lx + 1, y + 2, 7, 1, i % 2 ? 'tree2' : 'pastelP', 'front');
      }
    }
    // Telegraph Hill + Coit Tower
    hill(B, TH.c - TH.hw, TH.c + TH.hw, thProfile, { veg: EVERGREEN.concat(['tree', 'tree2']), rock: '#8a7a64', rockSlope: 3 });
    terraceHouses(B, TH.c - TH.hw + 4, TH.c + TH.hw - 4, (x) => thProfile(x) - 9 * Math.max(0, 1 - Math.abs(x - TH.c) / 26), { mats: HILLMATS, poke: 0 });
    lm.coit = coitTower(B, TH.c, -Math.round(thProfile(TH.c)) + 1);
    for (let x = TH.c - 16; x < TH.c + 16; x += 2) if (Math.abs(x - TH.c) > 4) B.f(x, -Math.round(thProfile(x)) - 1 - r.int(0, 1), 2, 2, r.pick(EVERGREEN), 'rim');

    // Downtown landmarks
    B.hz = 0.03;
    lm.transamerica = transamerica(B, 1170);
    californiaSt555(B, 1210);
    embarcaderoCenter(B, 1338, 50); embarcaderoCenter(B, 1356, 46); embarcaderoCenter(B, 1374, 54);
    millennium(B, 1406);
    lm.salesforce = salesforce(B, 1441);
    fremont181(B, 1479);
    oneRincon(B, 1601);

    // Bay Bridge (in front of SoMa)
    B.hz = 0.05;
    lm.bay = bayBridge(B, BB.xa, BB.towers, BB.ax, BB.xb);
    // the deck dives into Yerba Buena Island's tunnel
    B.hz = 0.1;
    hill(B, BB.xb - 3, 2356, ybi, { veg: EVERGREEN, rock: '#7a7060', rockSlope: 2.2 });
    B.f(BB.xb - 3, lm.bay.deckY - 2, 2, 9, 'conc', 'sideL');
    B.f(BB.xb - 1, lm.bay.deckY - 1, 3, 7, 'black', 'flat');
    B.f(BB.xb - 3, lm.bay.deckY - 3, 5, 1, 'conc', 'rim');

    // Front row
    B.hz = 0;
    fortPoint(B, GG.t1 - 22);
    palaceOfFineArts(B, 568);
    victorianRow(B, 588, 700, {});
    victorianRow(B, 702, 758, { gap: 0, w: 8, h: 16, kind: 'gable', mats: ['pastelB', 'pastelY', 'pastelP', 'pastelG', 'pastelL', 'pastelO', 'white'] }); // Painted Ladies
    victorianRow(B, 762, 960, {});
    saintsPeterPaul(B, 984);
    victorianRow(B, 996, 1128, {});
    lm.ferry = ferryBuilding(B, 1320);
    kit.fillRow(B, 1134, 1690, {
      minW: 6, maxW: 14, gapMin: 0, gapMax: 3,
      skip: (x, w) => x + w > 1278 && x < 1362,
      height: (x) => r.range(10, 22) + envDT(x) * r.range(0.04, 0.18),
      build: (x, w, h) => generic(x, w, h, 'front'),
    });

    // Golden Gate (in front of the headlands)
    B.hz = 0.04;
    lm.gg = goldenGate(B, GG.xa, GG.t1, GG.t2, GG.xb);
    B.hz = 0;

    // Shore: Embarcadero road, lamps, street trees, Canary palms downtown
    const bridgeSpans = [[GG.xa - 10, GG.xb + 10], [BB.xa + 20, BB.xb]];
    kit.shore(B, WM, { kind: 'road', lamps: true, trees: true, skip: (x) => (x > 1130 && x < 1690) });
    for (let x = 1138; x < 1690; x += r.int(14, 22)) {
      if (x > 1300 && x < 1340) continue;
      kit.palm(B, x, 0, r.int(8, 12), r.int(-2, 2), { trunk: 'wood', leaf: ['#3f7a3c', '#4f8a44', '#2f6434'] });
    }
    kit.finalizeRoofs(B, bridgeSpans.concat([[RH.c - 40, RH.c + 40]]));
    layers.push({ name: 'main', par: 1, W: WM, haze: 0, B, groundGlow: 30, fogK: 0.14 });

    // ------------------------------------------------------------------ Descriptor
    lm.perch = { x: 1441, top: lm.salesforce.top };
    let crownScheme = null;
    let alcEv = null;
    const hangers = lm.bay.hangers;
    const crown = lm.salesforce.crown;
    const waymos = [{ lane: 2, v: 9, off: 300 }, { lane: 3, v: -8, off: 1500 }];
    const SMILE = ['..1.1..', '..1.1..', '.......', '1.....1', '.1...1.', '..111..'];

    return {
      key: 'sf', name: 'San Francisco',
      lat: 37.77, lon: -122.42,
      layers,
      landmarks: lm,
      lanes: [
        { y: 2, x0: 0, x1: WM, dir: 1 },
        { y: 3, x0: 0, x1: WM, dir: -1 },
        { y: lm.gg.deckY, x0: lm.gg.x0 + 6, x1: lm.gg.x1 - 6, dir: 1, bridge: true },
        { y: lm.bay.deckY, x0: lm.bay.x0 + 6, x1: lm.bay.x1 - 4, dir: -1, bridge: true },
        { y: lm.bay.deckY + 6, x0: lm.bay.x0 + 6, x1: lm.bay.x1 - 4, dir: 1, bridge: true },
      ],
      holidays: ['xmas', 'halloween', 'july4', 'nye', 'thanksgiving', 'pride', 'fleetWeek', 'lunarNewYear'],
      foreground: { kind: 'promenade' },
      fogMorning: 0.45,
      glow(season) {
        crownScheme = season && season.esb ? season.esb : null;
        PS.GLOWS.sfCoit = hex(crownScheme ? crownScheme[0] : '#fff0d6');
        void dayIdx;
      },
      musicWords: [['foggy', 'golden', 'late', 'slow', 'sleepy', 'hazy', 'soft', 'bay', 'sunday', 'cold', 'pastel', 'salty', 'midnight', 'uphill', 'misty', 'mellow'],
        ['cable car', 'sourdough', 'mission', 'fog', 'ferry', 'hills', 'burrito', 'bart', 'painted ladies', 'ocean beach', 'sea lions', 'foghorn', 'bay lights', 'dolores park', 'golden gate', 'streetcar']],
      messages: ['HELLO KARL THE FOG', 'SOURDOUGH OR BUST', 'WE ARE HIRING', 'CABLE CARS: 2H WAIT', "I LEFT MY ♥ IN SF", 'BAY LIGHTS FOREVER', 'PIVOT TO FOG', 'SERIES A OR BUST', 'SEND BURRITOS', 'MIND THE HILLS', 'FOGHORN ENTHUSIAST', 'HELLO FROM THE BAY'],
      events: [
        { id: 'blueAngels', w: 1.5, ok: (S) => S.P.day > 0.35 && S.weather.rain < 0.3, make: blueAngels },
        { id: 'seaLions', w: 3, ok: (S) => S.P.day > 0.2, make: seaLions },
        { id: 'alcatraz', w: 0, make: alcatraz },
      ],
      eventWeights: { kong: 1, kaiju: 1.2, sail: 2, alcatraz: 0, paradeBalloon: 0, pizzaSignal: 0.3, nessie: 0.5 },

      ambient(p, S, dt) {
        const P = S.P, t = S.t, om = S.om, VW = S.VW, gy = S.groundY;
        const inView = (x, w) => { const X = S.mx(x) - om; return X > -(w || 4) - 2 && X < VW + 2; };
        const lit = (c, k) => {
          const s = k === 'rim' ? PS.add(PS.scale(P.amb, 1.2), PS.scale(P.sun, 0.8)) : k === 'dark' ? PS.scale(P.amb, 0.5) : PS.add(PS.scale(P.amb, 0.86), PS.scale(P.sun, 0.32));
          return PS.css(mix(PS.mul(hex(c), s), mix(P.hor, P.mid, 0.25), Math.min(0.8, (P.fog || 0) * 0.14)));
        };
        const g = p.ctx;

        // Alcatraz lives in the water in front of Russian Hill
        if ((!alcEv || alcEv.dead) && inView(ALCATRAZ_X - 60, 170)) alcEv = S.spawn('alcatraz');

        // Bay Lights: 25,000 LEDs on the Bay Bridge suspenders
        if (P.dark > 0.35 && inView(BB.xa, BB.xb - BB.xa)) {
          const a0 = clamp((P.dark - 0.35) / 0.3, 0, 1);
          const mode = Math.floor(t / 16) % 4;
          const W = '#eef4ff';
          for (const h of hangers) {
            const X = S.mx(h.x);
            if (X - om < -1 || X - om > VW + 1) continue;
            const len = h.y1 - h.y0;
            if (len < 1) continue;
            const y0 = gy + h.y0;
            g.globalAlpha = 0.14 * a0; p.rect(X, y0, 1, len, W);
            if (mode === 0) { // falling rain
              const sp = 10 + PS.hash(h.x, 1) * 14;
              const pos = ((t * sp + PS.hash(h.x, 2) * 60) % (len + 30)) - 4;
              for (let k = 0; k < 5; k++) {
                const yy = Math.round(pos - k * 1.5);
                if (yy < 0 || yy >= len) continue;
                g.globalAlpha = a0 * (1 - k / 5); p.rect(X, y0 + yy, 1, 1, W);
              }
            } else if (mode === 1) { // waves sweeping along the span
              const b = 0.5 + 0.5 * Math.sin(h.x * 0.07 - t * 2.4);
              g.globalAlpha = a0 * b * b * 0.85; p.rect(X, y0, 1, len, W);
            } else if (mode === 2) { // sparkle
              const tk = Math.floor(t * 9);
              for (let k = 0; k < 2; k++) {
                const hs = PS.hash(h.x * 3 + k, tk);
                if (hs > 0.5) continue;
                g.globalAlpha = a0 * (0.6 + hs * 0.8); p.rect(X, y0 + Math.floor(PS.hash(h.x, tk + k * 7) * len), 1, 1, W);
              }
            } else { // tide rising and falling
              const lvl = Math.round(len * (0.5 + 0.45 * Math.sin(h.x * 0.045 + t * 1.2)));
              g.globalAlpha = a0 * 0.55; p.rect(X, y0 + len - lvl, 1, lvl, W);
              g.globalAlpha = a0; p.rect(X, y0 + len - lvl, 1, 1, W);
            }
          }
          g.globalAlpha = 1;
        }

        // Salesforce Tower LED crown
        if (P.dark > 0.3 && inView(1428, 26)) {
          const a0 = clamp((P.dark - 0.3) / 0.3, 0, 1);
          const mode = Math.floor(t / 14 + 2) % 4;
          const pal = crownScheme || ['#ffffff', '#bfe4ff', '#8fd0ff', '#d8c8ff'];
          const n = crown.length;
          const top = crown[crown.length - 1].y;
          for (let i = 0; i < n; i++) {
            const row = crown[i];
            for (let x = row.L; x <= row.R; x++) {
              const X = S.mx(x);
              let c = null, a = 0;
              if (mode === 0) { const k = Math.floor((i + t * 5) / 3); a = 0.75; c = pal[((k % pal.length) + pal.length) % pal.length]; }
              else if (mode === 1) { const hs = PS.hash(x * 7 + i, Math.floor(t * 6)); if (hs < 0.35) { a = 0.5 + hs; c = pal[Math.floor(hs * 11) % pal.length]; } else { a = 0.18; c = pal[1]; } }
              else if (mode === 2) { const k = (i - t * 7) % 6; a = (k + 6) % 6 < 2 ? 0.95 : 0.15; c = pal[0]; }
              else {
                const sx = x - (1441 - 3), sy = (row.y - top) - 4;
                const on = sy >= 0 && sy < SMILE.length && sx >= 0 && sx < 7 && SMILE[sy][sx] === '1' && !(sy < 2 && Math.floor(t * 1.3) % 5 === 0);
                a = on ? 1 : 0.2; c = on ? '#ffffff' : pal[2];
              }
              if (!c) continue;
              g.globalAlpha = a * a0; p.rect(X, gy + row.y, 1, 1, c);
            }
          }
          g.globalAlpha = 0.1 * a0;
          for (const row of crown) p.rect(S.mx(row.L) - 2, gy + row.y, row.R - row.L + 5, 1, pal[0]);
          p.rect(S.mx(crown[n - 1].L) - 1, gy + top - 1, crown[n - 1].R - crown[n - 1].L + 3, 1, pal[0]);
          g.globalAlpha = 1;
        }

        // Ferry Building clock (shows the actual time)
        if (inView(lm.ferry.clockX - 2, 8)) {
          const X = S.mx(lm.ferry.clockX), Y = gy + lm.ferry.clockY;
          const face = P.dark > 0.3 ? '#fff4d0' : lit('#f4f0e6', 'rim');
          p.rect(X, Y, 5, 5, face);
          p.rect(X + 1, Y - 1, 3, 1, face); p.rect(X + 1, Y + 5, 3, 1, face);
          p.rect(X - 1, Y + 1, 1, 3, face); p.rect(X + 5, Y + 1, 1, 3, face);
          const hand = P.dark > 0.3 ? '#3a2a1a' : '#23222b';
          const hr = S.hour;
          const am = ((hr % 1) * 2 * Math.PI), ah = ((hr % 12) / 12) * 2 * Math.PI;
          p.px(X + 2, Y + 2, hand);
          p.px(X + 2 + Math.round(Math.sin(am) * 2), Y + 2 - Math.round(Math.cos(am) * 2), hand);
          p.px(X + 2 + Math.round(Math.sin(am)), Y + 2 - Math.round(Math.cos(am)), hand);
          p.px(X + 2 + Math.round(Math.sin(ah)), Y + 2 - Math.round(Math.cos(ah)), hand);
        }

        // Cable car climbing Russian Hill
        {
          const k = 0.5 - 0.5 * Math.cos((t / CABLE.period) * 2 * Math.PI);
          const x0 = CABLE.x0 + (CABLE.x1 - CABLE.x0) * k;
          if (inView(x0, 10)) {
            const X = S.mx(x0);
            const night = P.dark > 0.45;
            const maroon = lit('#8a2626'), cream = lit('#efe4c8'), roof = lit('#6a5040', 'rim'), sil = PS.css(PS.mul(hex('#2a2a36'), P.amb));
            const win = night ? '#ffd98a' : lit('#3a4a60', 'dark');
            const gold = lit('#e0b050', 'rim');
            for (let i = 0; i < 8; i++) {
              const sy = gy - Math.round(rhProfile(x0 + i)) - 1;
              const xx = Math.round(X) + i;
              if (i > 0 && i < 7) p.rect(xx, sy - 7, 1, 1, roof);
              p.rect(xx, sy - 6, 1, 1, i === 0 || i === 7 ? roof : cream);
              p.rect(xx, sy - 5, 1, 2, i === 0 || i === 7 ? (PS.hash(Math.floor(t / 20), i) < 0.7 ? sil : cream) : (i % 2 ? win : cream));
              p.rect(xx, sy - 3, 1, 1, gold);
              p.rect(xx, sy - 2, 1, 2, maroon);
            }
            const s0 = gy - Math.round(rhProfile(x0)) - 1, s7 = gy - Math.round(rhProfile(x0 + 7)) - 1;
            p.rect(Math.round(X) + 1, s0, 1, 1, '#23222b'); p.rect(Math.round(X) + 6, s7, 1, 1, '#23222b');
            if (night) {
              const up = Math.sin((t / CABLE.period) * 2 * Math.PI) > 0;
              g.globalAlpha = 0.5; p.rect(Math.round(X) + (up ? 8 : -2), (up ? s7 : s0) - 3, 2, 1, '#fff2c0'); g.globalAlpha = 1;
            }
          }
        }

        // Self-driving cars with spinning lidar
        for (const w of waymos) {
          const x = (((w.off + t * w.v) % WM) + WM) % WM;
          if (!inView(x, 4)) continue;
          const X = Math.round(S.mx(x)), Y = gy + w.lane;
          p.rect(X, Y, 3, 1, lit('#f2f2f0', 'rim'));
          const spin = Math.floor(t * 10) % 3;
          p.px(X + 1, Y - 1, spin === 0 ? '#6af0ff' : spin === 1 ? '#23222b' : '#9aa0aa');
          if (P.dark > 0.4) {
            p.px(w.v > 0 ? X + 3 : X - 1, Y, '#fff4c8');
            p.px(w.v > 0 ? X : X + 2, Y, '#ff3a2a');
          }
        }
      },
    };
  });
})();
