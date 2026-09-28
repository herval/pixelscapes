'use strict';
// Foreground promenade (think Brooklyn Heights): railing, lamps, benches and a steady stream of passers-by.
(function () {
  const PS = window.PS;
  const R = PS.R;

  const WALK = [
    ['..kk.', '..kk.', '.kkk.', '.kkkk', 'kkkk.', '.kkk.', '.k.k.', 'k...k', 'k...k'],
    ['..kk.', '..kk.', '.kkk.', '.kkk.', '.kkk.', '.kkk.', '..k..', '..k..', '.kk..'],
  ];
  const RUN = [
    ['...kk', '...kk', '.kkk.', 'k.kkk', '..kk.', '.kk..', 'k..k.', '....k', '.....'],
    ['...kk', '...kk', '..kkk', '.kkk.', 'k.kk.', '..k..', '.k.k.', '.k..k', '.....'],
  ];
  const BIKE = [
    ['.....kk..', '.....kk..', '....kkk..', '...kk.kk.', '..k.kkk..', '.kkk.k.kk', 'k..k.kk.k', 'k..kk...k', '.kk...kk.'],
    ['.....kk..', '.....kk..', '....kkk..', '...kk.kk.', '..k.kkk..', '.kkk.k.kk', 'k..kk...k', 'k..k.kk.k', '.kk...kk.'],
  ];
  const DOG = [['....kk', 'kkkkk.', 'k...k.'], ['....kk', 'kkkkk.', '.k.k..']];
  const WIENER = [['.......kk', 'kkkkkkkk.', '.k....k..'], ['.......kk', 'kkkkkkkk.', 'k......k.']];
  const SITTER = ['.kk..', '.kk..', 'kkk..', 'kkkk.', '.kkk.', '...k.', '...k.'];
  const SKATE = [['..kk.', '..kk.', '.kkk.', 'kkkkk', '.kkk.', '.k.k.', 'k...k', 'k...k', 'kkkkk', '.k.k.']];

  PS.Promenade = class {
    constructor() {
      this.W = 1500;
      this.par = 1.45;
      const r = PS.rng(4242);
      this.lamps = [];
      for (let x = 20; x < this.W; x += 95) this.lamps.push(x);
      this.benches = [];
      for (let x = 60; x < this.W; x += r.int(110, 190)) this.benches.push({ x, sitter: r() < 0.45, ph: r() * 10 });
      this.peds = [];
      this.nextPed = 0.5;
      // street trees between some of the lamps, each with its own canopy shape
      this.trees = [];
      for (let i = 0; i < this.lamps.length; i += 2) {
        const mask = [];
        for (let dy = -6; dy <= 5; dy++) for (let dx = -7; dx <= 7; dx++) {
          const v = (dx / 7.5) ** 2 + (dy / 6.2) ** 2;
          if (v < 1 - r() * 0.3) mask.push([dx, dy, r()]);
        }
        this.trees.push({ x: this.lamps[i] + 47, mask });
      }
      this.leaves = [];
    }

    wrap(x, camF) { let d = x - camF; d = ((d % this.W) + this.W) % this.W; if (d > this.W - 60) d -= this.W; return camF + d; }

    spawn(S, camF) {
      const dir = R() < 0.5 ? 1 : -1;
      const wet = S.weather.rain > 0.15 || S.weather.snow > 0.3;
      const roll = R();
      const kind = roll < 0.4 ? 'walk' : roll < 0.55 ? 'run' : roll < 0.67 ? 'dog' : roll < 0.77 ? 'bike' : roll < 0.84 ? 'couple' : roll < 0.9 ? 'balloon' : roll < 0.95 ? 'wiener' : 'skate';
      const sp = { walk: 5, run: 12, dog: 4.5, bike: 20, couple: 4, balloon: 4, wiener: 4.5, skate: 14 }[kind] * R.range(0.85, 1.15);
      const x = dir > 0 ? camF - 20 : camF + S.VW + 20;
      const umb = wet && kind !== 'run' && kind !== 'bike' && kind !== 'skate' && R() < 0.85;
      this.peds.push({ kind, dir, sp, x, t: R() * 10, umb, c: R.pick(['#ff4a5a', '#ffd23a', '#4aa0ff', '#ff7ad0', '#2a2a36', '#3ac8a0']) });
    }

    update(dt, S, camF) {
      // falling leaves / blossom petals from the street trees
      const se = S.season;
      if (se) {
        const rate = se.falling * 1.2 + (se.blossom > 0.3 ? se.blossom * 0.8 : 0);
        const w = S.weather;
        for (const tr of this.trees) {
          const X = this.wrap(tr.x, camF);
          if (X < camF - 10 || X > camF + S.VW + 10) continue;
          if (R() < dt * rate) {
            const pink = se.blossom > 0.3;
            this.leaves.push({ x: X + R.range(-6, 6), y: S.VH - 26 + R.range(0, 8), vy: R.range(4, 8), ph: R() * 6, c: pink ? '#f6b8d0' : PS.css(R.pick(se.foliage)), drift: w.wind * w.windDir * 14 });
          }
        }
      }
      for (const l of this.leaves) { l.y += l.vy * dt; l.x += (Math.sin(S.t * 2 + l.ph) * 5 + l.drift) * dt; }
      this.leaves = this.leaves.filter((l) => l.y < S.VH - 2);

      if (!this.seeded) {
        this.seeded = true;
        for (let i = 0; i < 4; i++) { this.spawn(S, camF); this.peds[this.peds.length - 1].x = camF + R.range(0.1, 0.9) * S.VW; }
      }
      this.nextPed -= dt;
      if (this.nextPed <= 0) {
        const heavy = S.weather.rain > 0.7 || S.weather.snow > 0.7;
        if (this.peds.length < (heavy ? 3 : 7)) this.spawn(S, camF);
        this.nextPed = R.range(2, 7) * (heavy ? 2 : 1);
      }
      for (const p of this.peds) { p.x += p.dir * p.sp * dt; p.t += dt; }
      this.peds = this.peds.filter((p) => p.x > camF - 60 && p.x < camF + S.VW + 60);
    }

    draw(p, S, camF) {
      const VH = S.VH, P = S.P, t = S.t;
      const base = Math.round(camF * p.s);
      p.ox = -base;
      const sil = PS.css(PS.mix(PS.hex('#06060e'), PS.hex('#1c1a2a'), P.day));
      const x0 = camF - 2, x1 = camF + S.VW + 2;
      const wrapX = (x) => { let d = x - camF; d = ((d % this.W) + this.W) % this.W; if (d > this.W - 60) d -= this.W; return camF + d; };
      const night = P.dark;
      const warm = [255, 196, 120];

      // lamp glow first (behind the railing)
      if (night > 0.05) {
        for (const lx of this.lamps) {
          const X = wrapX(lx);
          if (X < x0 - 20 || X > x1 + 20) continue;
          for (let rr = 12; rr > 0; rr -= 3) {
            const a = 0.07 * night * (1 - rr / 14);
            p.ctx.fillStyle = PS.cssA(warm, a);
            for (let j = -rr; j <= rr; j++) {
              const hw = Math.round(Math.sqrt(rr * rr - j * j));
              p.rect(X - hw, VH - 30 + j, hw * 2 + 1, 1);
            }
          }
          p.ctx.fillStyle = PS.cssA(warm, 0.18 * night);
          p.rect(X - 10, VH - 3, 21, 3);
        }
      }
      // walkway + railing (a touch lighter than the people so they read in front of it)
      const rail = PS.css(PS.mix(PS.mix(PS.hex('#06060e'), PS.hex('#1c1a2a'), P.day), P.mid, 0.28));
      p.ctx.fillStyle = sil;
      p.rect(x0, VH - 3, x1 - x0, 3);
      p.ctx.fillStyle = rail;
      p.rect(x0, VH - 9, x1 - x0, 1);
      p.rect(x0, VH - 6, x1 - x0, 1);
      const start = Math.floor(x0 / 3) * 3;
      for (let x = start; x < x1; x += 3) p.rect(x, VH - 9, 1, 6);
      p.rect(x0, VH - 10, x1 - x0, 1, PS.cssA(PS.mix(P.hor, [255, 255, 255], 0.2), 0.25 + 0.2 * P.day));
      // lamps
      for (const lx of this.lamps) {
        const X = wrapX(lx);
        if (X < x0 - 4 || X > x1 + 4) continue;
        p.ctx.fillStyle = sil;
        p.rect(X, VH - 30, 1, 27); p.rect(X - 1, VH - 5, 3, 2);
        p.rect(X - 1, VH - 32, 3, 1); p.rect(X - 1, VH - 29, 3, 1);
        p.rect(X - 1, VH - 31, 3, 2, night > 0.3 ? '#ffe2a0' : '#5a5a66');
      }
      // benches (+ the occasional person sitting, feeding pigeons, reading)
      for (const b of this.benches) {
        const X = wrapX(b.x);
        if (X < x0 - 10 || X > x1 + 10) continue;
        p.ctx.fillStyle = sil;
        p.rect(X, VH - 6, 9, 1); p.rect(X, VH - 9, 9, 1); p.rect(X, VH - 9, 1, 6); p.rect(X + 8, VH - 9, 1, 6);
        p.rect(X + 1, VH - 5, 1, 2); p.rect(X + 7, VH - 5, 1, 2);
        if (b.sitter) {
          p.sprite(SITTER, X + 2, VH - 12, { k: sil });
          if (night > 0.5 && Math.floor(t + b.ph) % 7 < 3) p.px(X + 3, VH - 9, '#9fd0ff'); // phone glow
          else if (night < 0.5) {
            const pk = Math.floor(t * 3 + b.ph) % 2;
            p.sprite(pk ? ['.k.', 'kkk'] : ['k..', 'kkk'], X + 10, VH - 5, { k: sil });
          }
        }
      }
      const se = S.season, wx = S.weather, hol = se ? se.holidays : {};
      const light = [Math.max(0.2, P.amb[0] + P.sun[0] * 0.5), Math.max(0.2, P.amb[1] + P.sun[1] * 0.5), Math.max(0.24, P.amb[2] + P.sun[2] * 0.5)];
      const snow = wx.snowCover || 0;
      const snowC = PS.css(PS.mul([246, 248, 255], [Math.min(1, light[0] + 0.1), Math.min(1, light[1] + 0.1), Math.min(1, light[2] + 0.12)]));
      // street trees
      if (se) {
        for (const tr of this.trees) {
          const X = wrapX(tr.x);
          if (X < x0 - 10 || X > x1 + 10) continue;
          p.ctx.fillStyle = sil;
          p.rect(X, VH - 16, 1, 13); p.rect(X - 1, VH - 4, 3, 1);
          if (se.bare > 0.3) {
            p.line(X, VH - 14, X - 4, VH - 20, sil); p.line(X, VH - 15, X + 4, VH - 22, sil);
            p.line(X, VH - 18, X - 1, VH - 25, sil); p.line(X - 3, VH - 18, X - 6, VH - 21, sil); p.line(X + 3, VH - 19, X + 6, VH - 23, sil);
            if (snow > 0.2) for (const [a, b] of [[-4, -21], [4, -23], [-1, -26], [-6, -22], [6, -24]]) p.px(X + a, VH + b, snowC);
          }
          const key = `${se.bare.toFixed(2)}|${se.blossom.toFixed(2)}|${snow > 0.2 ? snow.toFixed(1) : 0}|${light.map((v) => v.toFixed(2)).join()}|${se.foliage.map((c) => c.join()).join()}`;
          if (tr.key !== key) {
            tr.key = key;
            const alive = new Set(tr.mask.filter((m) => m[2] >= se.bare).map((m) => m[0] + ',' + m[1]));
            tr.px = [];
            for (const [dx, dy, h] of tr.mask) {
              if (h < se.bare) continue;
              const idx = h < 0.45 ? 0 : h < 0.8 ? 1 : 2;
              let c = se.foliage[idx];
              if (se.blossom > 0.3 && h > 1 - se.blossom * 0.45) c = [246, 184, 208];
              const top = !alive.has(dx + ',' + (dy - 1));
              if (top && snow > 0.2 && h < snow + 0.2) { tr.px.push([dx, dy, snowC]); continue; }
              const shade = dy > 2 || dx > 4 ? 0.75 : top ? 1.15 : 1;
              tr.px.push([dx, dy, PS.css(PS.mul(c, PS.scale(light, shade)))]);
            }
          }
          for (const [dx, dy, c] of tr.px) p.px(X + dx, VH - 20 + dy, c);
        }
      }
      // snow on the walkway, railing and benches
      if (snow > 0.05) {
        for (let x = Math.floor(x0); x < x1; x++) {
          const b = PS.bayer(x, 3);
          if (b < snow * 1.3) p.px(x, VH - 3, snowC);
          if (b < snow) p.px(x, VH - 10, snowC);
        }
        for (const b of this.benches) {
          const X = wrapX(b.x);
          if (X < x0 - 10 || X > x1 + 10) continue;
          p.rect(X, VH - 10, 9, 1, snowC);
          if (!b.sitter) p.rect(X + 1, VH - 7, 7, 1, snowC);
        }
        if (snow > 0.5) {
          const X = wrapX(700);
          if (X > x0 - 10 && X < x1 + 10) {
            p.sprite(['..hh..', '.hhhh.', '..ww..', '.wkww.', '.wwwwo', 'rrrrr.', 'wwwwww', 'wwkwww', 'wwwwww', '.wwww.'], X, VH - 13, { w: snowC, k: '#1a1a22', o: '#ff8a1a', r: '#d83a3a', h: sil });
          }
        }
      }
      // holiday decorations
      if (hol.xmas) {
        const X = wrapX(430);
        if (X > x0 - 12 && X < x1 + 12) {
          const pine = PS.css(PS.mul([40, 110, 60], light));
          for (let j = 0; j < 16; j++) { const w = 1 + Math.floor(j * 0.7) + (j % 4 === 3 ? -1 : 0); p.rect(X - w, VH - 20 + j, w * 2 + 1, 1, pine); }
          p.rect(X, VH - 4, 1, 1, sil);
          const cols = ['#ff3a3a', '#ffd23a', '#4ab0ff', '#ff7ad0', '#ffffff'];
          for (let i = 0; i < 14; i++) {
            const j = 2 + ((i * 7) % 13), w = Math.floor(j * 0.7);
            const dx = Math.round((PS.hash(i, 3) * 2 - 1) * w);
            if (PS.hash(i, Math.floor(t * 2)) < 0.25) continue;
            p.px(X + dx, VH - 20 + j, cols[i % cols.length]);
          }
          p.rect(X - 1, VH - 22, 3, 1, '#ffd23a'); p.rect(X, VH - 23, 1, 3, '#ffd23a');
        }
        for (const lx of this.lamps) {
          const X2 = wrapX(lx);
          if (X2 < x0 - 3 || X2 > x1 + 3) continue;
          p.rect(X2 - 1, VH - 24, 3, 2, PS.css(PS.mul([40, 120, 60], light))); p.px(X2, VH - 22, '#e83a3a');
        }
      }
      if (hol.halloween) {
        for (const b of this.benches) {
          const X = wrapX(b.x) + 10;
          if (X < x0 - 4 || X > x1 + 4) continue;
          p.sprite(['.g.', 'ooo', 'ooo'], X, VH - 6, { o: PS.css(PS.mul([255, 138, 26], light)), g: '#3a6a2a' });
          if (night > 0.4) { p.px(X, VH - 5, '#ffe060'); p.px(X + 2, VH - 5, '#ffe060'); }
        }
      }
      if (hol.july4 || hol.pride) {
        for (const lx of this.lamps) {
          const X2 = wrapX(lx);
          if (X2 < x0 - 5 || X2 > x1 + 5) continue;
          const wave = Math.round(Math.sin(t * 4 + lx) * 0.6);
          if (hol.july4) { p.rect(X2 + 1, VH - 26 + wave, 4, 1, '#d83a3a'); p.rect(X2 + 1, VH - 25 + wave, 4, 1, '#f4f0e8'); p.rect(X2 + 1, VH - 26 + wave, 2, 1, '#2a4a9a'); }
          else ['#e84040', '#f0a030', '#f0e040', '#40c060', '#4080e0'].forEach((c, i) => p.rect(X2 + 1, VH - 28 + i + wave, 4, 1, c));
        }
      }
      // falling leaves / petals
      for (const l of this.leaves) p.px(l.x, l.y, l.c);

      // passers-by
      for (const q of this.peds) {
        const f = Math.floor(q.t * (q.kind === 'run' ? 8 : q.kind === 'bike' ? 6 : 4)) % 2;
        const flip = q.dir < 0;
        const x = q.x;
        const map = { k: sil };
        switch (q.kind) {
          case 'walk': p.sprite(WALK[f], x, VH - 12, map, flip); break;
          case 'run': p.sprite(RUN[f], x, VH - 12, map, flip); break;
          case 'bike': p.sprite(BIKE[f], x, VH - 12, map, flip); if (night > 0.4) p.px(x + (flip ? 0 : 8), VH - 8, '#fff4c0'); break;
          case 'skate': p.sprite(SKATE[0], x, VH - 13, map, flip); break;
          case 'dog':
          case 'wiener': {
            p.sprite(WALK[f], x, VH - 12, map, flip);
            const dx = flip ? -9 : 7;
            const dog = q.kind === 'dog' ? DOG[f] : WIENER[f];
            p.sprite(dog, x + dx, VH - 6, map, flip);
            p.line(x + (flip ? 0 : 4), VH - 8, x + dx + (flip ? 1 : dog[0].length - 2), VH - 6, sil);
            break;
          }
          case 'couple':
            p.sprite(WALK[f], x, VH - 12, map, flip);
            p.sprite(WALK[1 - f], x + (flip ? 5 : -5), VH - 12, map, flip);
            break;
          case 'balloon': {
            p.sprite(WALK[f], x, VH - 12, map, flip);
            const hx = x + (flip ? 0 : 4);
            p.line(hx, VH - 8, hx + Math.sin(q.t * 2), VH - 20, 'rgba(200,200,200,0.7)');
            const bx = hx + Math.sin(q.t * 2) - 1, by = VH - 24;
            p.sprite(['.bb.', 'bbbb', 'bbbb', '.bb.'], bx, by, { b: q.c });
            p.px(bx + 1, by + 1, 'rgba(255,255,255,0.6)');
            break;
          }
        }
        if (q.umb) {
          const uc = PS.css(PS.mul(PS.hex(q.c), [Math.max(0.35, light[0]), Math.max(0.35, light[1]), Math.max(0.4, light[2])]));
          p.sprite(['..k..', '.uuu.', 'uuuuu', 'u.k.u', '..k..'], x, VH - 17, { u: uc, k: sil });
          if (q.kind === 'couple') p.sprite(['..k..', '.uuu.', 'uuuuu', 'u.k.u', '..k..'], x + (flip ? 5 : -5), VH - 17, { u: PS.css(PS.mul([60, 60, 70], light)), k: sil });
        }
      }
    }
  };
})();
