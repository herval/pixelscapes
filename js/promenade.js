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
    }

    spawn(S, camF) {
      const dir = R() < 0.5 ? 1 : -1;
      const roll = R();
      const kind = roll < 0.4 ? 'walk' : roll < 0.55 ? 'run' : roll < 0.67 ? 'dog' : roll < 0.77 ? 'bike' : roll < 0.84 ? 'couple' : roll < 0.9 ? 'balloon' : roll < 0.95 ? 'wiener' : 'skate';
      const sp = { walk: 5, run: 12, dog: 4.5, bike: 20, couple: 4, balloon: 4, wiener: 4.5, skate: 14 }[kind] * R.range(0.85, 1.15);
      const x = dir > 0 ? camF - 20 : camF + S.VW + 20;
      this.peds.push({ kind, dir, sp, x, t: R() * 10, c: R.pick(['#ff4a5a', '#ffd23a', '#4aa0ff', '#ff7ad0']) });
    }

    update(dt, S, camF) {
      if (!this.seeded) {
        this.seeded = true;
        for (let i = 0; i < 4; i++) { this.spawn(S, camF); this.peds[this.peds.length - 1].x = camF + R.range(0.1, 0.9) * S.VW; }
      }
      this.nextPed -= dt;
      if (this.nextPed <= 0) {
        if (this.peds.length < 7) this.spawn(S, camF);
        this.nextPed = R.range(2, 7);
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
      }
    }
  };
})();
