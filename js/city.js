'use strict';
// City construction kit: a Builder that emits paint "ops" (in layer space, ground at y=0, up is negative)
// and a renderer that paints those ops for the current light.
(function () {
  const PS = window.PS;
  const { hex, mix, mul, clamp } = PS;

  PS.MATS = {
    lime: '#dccfb8', cream: '#e9dcbc', brick: '#b0654c', brick2: '#8f4f40', brick3: '#c07a58', brown: '#7c5446',
    conc: '#b6b3ab', conc2: '#9c9ca4', steel: '#cfd6e0', white: '#eeebe4', stone: '#a89b89', granite: '#8a8078',
    glass: '#6f9cc4', glass2: '#4d6d90', glassG: '#6aa6a4', glassD: '#39465c', terra: '#c98b6b', wood: '#80573a',
    copper: '#62a88f', gold: '#e7b54c', dark: '#3a3844', asphalt: '#3c3a44', grass: '#4f7a45', tree: '#3f6e3c',
    red: '#b8433a', roof: '#6a6470', black: '#23222b',
  };
  const MATS = {};
  for (const k in PS.MATS) MATS[k] = hex(PS.MATS[k]);

  PS.WARM = ['#ffd57e', '#ffe6a6', '#ffc76c', '#fff1c9', '#ffcf8f', '#ffdb94'].map(hex);
  PS.COOL = ['#c4e6ff', '#a3d2ff'].map(hex);
  PS.OFFICE = ['#fff4d6', '#eef4ff', '#fff9e8'].map(hex);

  class Builder {
    constructor(W, rng) {
      this.W = W; this.rng = rng;
      this.ops = []; this.blinkers = []; this.roofs = []; this.rects = []; this.grids = []; this.lamps = [];
    }
    f(x, y, w, h, m, k, o) { if (w > 0 && h > 0) this.ops.push(Object.assign({ t: 'f', x, y, w, h, m, k: k || 'front' }, o)); }
    glass(x, y, w, h, m, k) { if (w > 0 && h > 0) this.ops.push({ t: 'g', x, y, w, h, m, k: k || 'front' }); }
    emit(x, y, w, h, m, c, k) { this.ops.push({ t: 'e', x, y, w, h, m, k: k || 'front', c: hex(c) }); }
    win(x, y, w, h, m, o) {
      const r = this.rng;
      const lc = o && o.lc ? o.lc : (r() < 0.9 ? r.pick(PS.WARM) : r() < 0.8 ? r.pick(PS.COOL) : hex('#ffb3cf'));
      this.ops.push({ t: 'w', x, y, w, h, m, th: o && o.th != null ? o.th : r(), lc, office: !!(o && o.office), side: !!(o && o.side) });
    }
    line(x0, y0, x1, y1, m, k, o) {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let n = 0; n < 1000; n++) {
        this.f(x0, y0, 1, 1, m, k, o);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    blink(x, y, o) { this.blinkers.push(Object.assign({ x, y, period: 1.6 + this.rng() * 1.4, phase: this.rng() * 10, c: '#ff3b30' }, o)); }

    // A shaded block with optional window grid. Returns the face width.
    box(x, top, w, h, m, o) {
      o = o || {};
      const sd = o.side != null ? o.side : w >= 16 ? 3 : w >= 9 ? 2 : w >= 4 ? 1 : 0;
      const fw = w - sd;
      if (o.glass) this.glass(x, top, fw, h, m, o.faceK || 'front'); else this.f(x, top, fw, h, m, o.faceK || 'front', o.glow ? { glow: hex(o.glow) } : null);
      if (sd) { if (o.glass) this.glass(x + fw, top, sd, h, m, 'sideR'); else this.f(x + fw, top, sd, h, m, 'sideR', o.glow ? { glow: hex(o.glow) } : null); }
      if (!o.noRim) this.f(x, top, w, 1, m, 'rim', o.glow ? { glow: hex(o.glow) } : null);
      if (o.mullions) for (let cx = x + 2; cx < x + fw - 1; cx += o.mullions) this.f(cx, top + 1, 1, h - 1, m, 'dark', { a: 0.35 });
      if (o.bands) for (let yy = top + 3; yy < top + h - 1; yy += o.bands) this.f(x, yy, w, 1, m, 'dark', { a: 0.25 });
      if (o.win) this.grids.push(this.winGrid(x, top, fw, h, m, o.win, sd));
      this.rects.push({ x, y: top, w, h });
      return fw;
    }

    winGrid(x, top, fw, h, m, s, sd) {
      const r = this.rng;
      const ww = s.ww || 1, wh = s.wh || 1, px = s.px || 2, py = s.py || 2, mx = s.mx != null ? s.mx : 1, my = s.my != null ? s.my : 2;
      const bottom = top + h - (s.mb != null ? s.mb : 2);
      const grid = { cols: [], rows: [], ww, wh, x, top, fw };
      const n = Math.floor((fw - 2 * mx - ww) / px) + 1;
      if (n <= 0) return grid;
      const used = (n - 1) * px + ww;
      const x0 = x + Math.floor((fw - used) / 2);
      for (let i = 0; i < n; i++) grid.cols.push(x0 + i * px);
      for (let y = top + my; y + wh <= bottom; y += py) grid.rows.push(y);
      const warm = r.pick(PS.WARM);
      if (s.office) {
        for (const y of grid.rows) {
          let cx = x + mx;
          const end = x + fw - mx;
          const lc = r.pick(PS.OFFICE);
          while (cx < end) {
            const sw = Math.min(end - cx, r.int(3, 8));
            this.win(cx, y, sw, wh, m, { office: true, lc });
            cx += sw + (s.gap || 0);
          }
        }
      } else {
        for (const y of grid.rows) for (const cx of grid.cols) this.win(cx, y, ww, wh, m, r() < 0.4 ? { lc: warm } : null);
      }
      if (sd >= 2 && !s.office) {
        for (const y of grid.rows) this.win(x + fw + (sd > 2 ? 1 : 0), y, 1, wh, m, { side: true });
      }
      return grid;
    }

    waterTower(cx, base) {
      const r = this.rng, tw = r.pick([4, 5, 5, 6]), legs = r.int(2, 3), th = r.int(4, 5);
      const x = cx - (tw >> 1);
      this.f(x, base - legs, 1, legs, 'dark', 'flat');
      this.f(x + tw - 1, base - legs, 1, legs, 'dark', 'flat');
      if (tw > 4) this.f(x + (tw >> 1), base - legs, 1, legs, 'dark', 'flat');
      this.f(x, base - legs, tw, 1, 'dark', 'flat');
      const tt = base - legs - th;
      this.f(x, tt, tw - 1, th, 'wood', 'front');
      this.f(x + tw - 1, tt, 1, th, 'wood', 'sideR');
      this.f(x, tt + 1, tw, 1, 'dark', 'flat', { a: 0.5 });
      this.f(x, tt + th - 2, tw, 1, 'dark', 'flat', { a: 0.5 });
      this.f(x + 1, tt - 1, tw - 2, 1, 'wood', 'rim');
      if (tw > 4) this.f(x + 2, tt - 2, tw - 4, 1, 'wood', 'rim');
      this.f(cx, tt - (tw > 4 ? 3 : 2), 1, 1, 'dark', 'flat');
      return { x, w: tw };
    }

    antenna(cx, top, h, o) {
      this.f(cx, top - h, 1, h, (o && o.m) || 'dark', 'flat');
      if (h > 6) this.f(cx - 1, top - Math.floor(h * 0.45), 3, 1, 'dark', 'flat');
      this.blink(cx, top - h - 1, o);
    }
  }
  PS.Builder = Builder;

  // ---------------------------------------------------------------------------------------------
  // Renderer

  function lightFor(k, P) {
    const a = P.amb, s = P.sun, sd = P.sunDir;
    switch (k) {
      case 'front': return [a[0] * 0.86 + s[0] * 0.32, a[1] * 0.86 + s[1] * 0.32, a[2] * 0.88 + s[2] * 0.32];
      case 'sideR': { const f = Math.max(0, sd) * 1.05 + 0.04; return [a[0] * 0.56 + s[0] * f, a[1] * 0.56 + s[1] * f, a[2] * 0.62 + s[2] * f]; }
      case 'sideL': { const f = Math.max(0, -sd) * 1.05 + 0.04; return [a[0] * 0.56 + s[0] * f, a[1] * 0.56 + s[1] * f, a[2] * 0.62 + s[2] * f]; }
      case 'rim': return [a[0] * 1.2 + s[0] * 0.8, a[1] * 1.2 + s[1] * 0.8, a[2] * 1.15 + s[2] * 0.8];
      case 'dark': return [a[0] * 0.5, a[1] * 0.5, a[2] * 0.55];
      case 'flat': return [a[0] * 0.85 + s[0] * 0.2, a[1] * 0.85 + s[1] * 0.2, a[2] * 0.85 + s[2] * 0.2];
      case 'glint': return [a[0] * 1.3 + s[0] * 0.9, a[1] * 1.3 + s[1] * 0.9, a[2] * 1.3 + s[2] * 0.9];
      default: return a;
    }
  }

  // Paints a layer's ops onto its canvas. opts: {groundY, haze, hour}
  PS.renderLayer = function (L, P, groundY, hour) {
    const g = L.ctx, W = L.W;
    g.clearRect(0, 0, L.canvas.width, L.canvas.height);
    const hazeCol = mix(P.hor, P.mid, 0.25);
    const haze = L.haze * (0.55 + 0.45 * P.day);
    const lights = {};
    const lf = (k) => lights[k] || (lights[k] = lightFor(k, P));
    const cache = new Map();
    const finish = (c) => (haze > 0 ? mix(c, hazeCol, haze) : c);
    const shadeRGB = (m, k) => mul(MATS[m] || hex(m), lf(k));
    const col = (m, k) => {
      const key = m + '|' + k;
      let c = cache.get(key);
      if (!c) { c = PS.css(finish(shadeRGB(m, k))); cache.set(key, c); }
      return c;
    };
    const res = PS.litFraction(hour), off = PS.officeFraction(hour);
    const dark = P.dark;
    const reflectBase = mix(P.mid, P.hor, 0.5);

    const draw = (x, y, w, h) => {
      g.fillRect(x, y, w, h);
      if (x + w > W) g.fillRect(x - W, y, w, h);
      if (x < 0) g.fillRect(x + W, y, w, h);
    };

    for (const o of L.ops) {
      const y = o.y + groundY;
      if (o.t === 'f') {
        if (o.glow && dark > 0.02) {
          const base = shadeRGB(o.m, o.k);
          const lit = mul(MATS[o.m] || hex(o.m), PS.scale(o.glow, 1 / 255 * 1.1));
          g.fillStyle = PS.css(finish(mix(base, lit, dark * 0.9)));
        } else if (o.a != null) {
          g.fillStyle = PS.cssA(finish(shadeRGB(o.m, o.k)), o.a);
        } else g.fillStyle = col(o.m, o.k);
        draw(o.x, y, o.w, o.h);
      } else if (o.t === 'w') {
        const lit = o.th < (o.office ? off : res);
        const key = 'w|' + o.m + (o.side ? 's' : '');
        let offc = cache.get(key);
        if (!offc) {
          const base = mul(shadeRGB(o.m, o.side ? 'sideR' : 'front'), [0.55, 0.57, 0.64]);
          offc = mix(base, PS.scale(reflectBase, 0.75), 0.35 * P.day);
          cache.set(key, offc);
        }
        if (lit && dark > 0.02) {
          const c = mix(offc, o.lc, dark * (o.side ? 0.55 : 1));
          g.fillStyle = PS.css(finish(c));
        } else g.fillStyle = PS.css(finish(offc));
        draw(o.x, y, o.w, o.h);
      } else if (o.t === 'g') {
        // Glass reflects the sky: per-row stepped gradient.
        const base = shadeRGB(o.m, o.k);
        const amt = 0.25 + 0.3 * P.day;
        for (let r = 0; r < o.h; r++) {
          const yy = o.y + r;
          const band = Math.floor(yy / 3) * 3;
          const t = clamp(-band / 170, 0, 1);
          const refl = mix(P.hor, P.mid, t);
          const c = mix(base, PS.scale(refl, 0.9), amt);
          g.fillStyle = PS.css(finish(c));
          draw(o.x, y + r, o.w, 1);
        }
      } else if (o.t === 'e') {
        g.fillStyle = PS.css(finish(mix(shadeRGB(o.m, o.k), o.c, Math.min(1, dark * 1.1))));
        draw(o.x, y, o.w, o.h);
      }
    }
  };
})();
