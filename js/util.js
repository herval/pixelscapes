'use strict';
// Shared helpers: seeded RNG, color math, dithering, a pixel painter and a tiny pixel font.
(function () {
  const PS = (window.PS = window.PS || {});

  PS.rng = function (seed) {
    let a = seed >>> 0;
    const r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    return r;
  };
  PS.R = PS.rng((Math.random() * 4294967296) >>> 0);

  PS.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  PS.lerp = (a, b, t) => a + (b - a) * t;
  PS.smooth = (e0, e1, x) => { const t = PS.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  const hexCache = new Map();
  PS.hex = function (h) {
    if (typeof h !== 'string') return h;
    let c = hexCache.get(h);
    if (!c) { c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; hexCache.set(h, c); }
    return c;
  };
  PS.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  PS.mul = (c, l) => [c[0] * l[0], c[1] * l[1], c[2] * l[2]];
  PS.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  PS.scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  PS.css = (c) => `rgb(${c255(c[0])},${c255(c[1])},${c255(c[2])})`;
  PS.cssA = (c, a) => `rgba(${c255(c[0])},${c255(c[1])},${c255(c[2])},${a.toFixed(3)})`;
  PS.c255 = c255;

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  PS.bayer = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

  // cheap deterministic hash noise in [0,1)
  PS.hash = function (x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // Draws "art pixels" onto the screen-resolution canvas. Coordinates are in art pixels,
  // may be fractional (smooth motion) but every art pixel is a crisp s×s block.
  PS.Painter = class {
    constructor(ctx) { this.ctx = ctx; this.s = 1; this.ox = 0; this.oy = 0; }
    rect(x, y, w, h, c) {
      const s = this.s;
      const X = Math.round(x * s) + this.ox, Y = Math.round(y * s) + this.oy;
      const X2 = Math.round((x + w) * s) + this.ox, Y2 = Math.round((y + h) * s) + this.oy;
      if (c) this.ctx.fillStyle = c;
      this.ctx.fillRect(X, Y, X2 - X, Y2 - Y);
    }
    px(x, y, c) { this.rect(x, y, 1, 1, c); }
    // rows: array of strings; map: char -> css color. '.' is transparent.
    sprite(rows, x, y, map, flip, flipY) {
      const ctx = this.ctx, s = this.s;
      const bx = Math.round(x * s) + this.ox, by = Math.round(y * s) + this.oy;
      const H = rows.length;
      for (let j = 0; j < H; j++) {
        const row = rows[flipY ? H - 1 - j : j], W = row.length;
        let i = 0;
        while (i < W) {
          const ch = row[flip ? W - 1 - i : i];
          if (ch === '.' || ch === ' ') { i++; continue; }
          let k = i + 1;
          while (k < W && row[flip ? W - 1 - k : k] === ch) k++;
          const c = map[ch];
          if (c) { ctx.fillStyle = c; ctx.fillRect(bx + i * s, by + j * s, (k - i) * s, s); }
          i = k;
        }
      }
    }
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      if (c) this.ctx.fillStyle = c;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, n = 0;
      const s = this.s;
      for (;;) {
        this.ctx.fillRect(x0 * s + this.ox, y0 * s + this.oy, s, s);
        if ((x0 === x1 && y0 === y1) || n++ > 2000) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    text(str, x, y, c) {
      let cx = x;
      for (const ch of str.toUpperCase()) {
        const g = PS.FONT[ch] || PS.FONT['?'];
        for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') this.rect(cx + i, y + j, 1, 1, c);
        cx += 4;
      }
    }
  };
  PS.textWidth = (str) => str.length * 4 - 1;

  PS.FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010',
    9: '010101011001110', ' ': '000000000000000', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010',
    ',': '000000000010100', "'": '010010000000000', '-': '000000111000000', ':': '000010000010000', '♥': '000101111111010',
    '/': '001001010100100', '#': '101111101111101', '@': '010101111100011', '*': '000101010101000',
  };
})();
