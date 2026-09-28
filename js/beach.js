'use strict';
// Beach foreground (Rio, João Pessoa): surf rolling onto the sand, a beachfront walk (Copacabana's
// wave mosaic optional), palms, kiosks, umbrellas, sunbathers, footvolley and passers-by.
(function () {
  const PS = window.PS;
  const R = PS.R;
  const { hex, mix, css, mul, scale } = PS;

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
  const LYING = ['..kkkkk.', 'kkkkkkkk'];
  const SITTING = ['.kk..', '.kk..', 'kkkk.', 'kkkkk'];
  const KICK = [['..kk..', '..kk..', '.kkkk.', 'k.kk.k', '..kk..', '.k..k.', 'k...k.'], ['..kk..', '..kk..', '.kkkk.', '..kk..', '..kkk.', '.k...k', 'k.....']];

  PS.Beach = class {
    constructor(o) {
      this.o = Object.assign({ mosaic: false, kiosks: true, jangadas: false, palmGap: [70, 140] }, o || {});
      this.W = 1600;
      this.par = 1.45;
      const r = PS.rng(777);
      this.palms = [];
      for (let x = 30; x < this.W; x += r.int(this.o.palmGap[0], this.o.palmGap[1])) {
        this.palms.push({ x, h: r.int(24, 38), lean: r.int(-7, 7), ph: r() * 6, coco: r() < 0.6 });
      }
      this.kiosks = [];
      if (this.o.kiosks) for (let x = 180; x < this.W; x += r.int(360, 520)) this.kiosks.push({ x, c: r.pick(['#e8503a', '#2a8ac0', '#f2b22a', '#3aa060']) });
      this.umbrellas = [];
      for (let x = 20; x < this.W; x += r.int(26, 70)) this.umbrellas.push({ x, c: r.pick([['#ff5a4a', '#ffffff'], ['#2a8ae0', '#ffffff'], ['#ffd23a', '#2a8ae0'], ['#3ac070', '#ffe04a'], ['#ff7ab8', '#ffffff']]), lying: r() < 0.7, flip: r() < 0.5 });
      this.jangadas = [];
      if (this.o.jangadas) for (let x = 90; x < this.W; x += r.int(220, 380)) this.jangadas.push({ x, c: r.pick(['#f4f0e8', '#ffd23a', '#ff6a4a', '#4ab0ff']) });
      this.footvolley = { x: 640 };
      this.peds = [];
      this.nextPed = 0.5;
    }

    wrap(x, camF) { let d = x - camF; d = ((d % this.W) + this.W) % this.W; if (d > this.W - 80) d -= this.W; return camF + d; }

    spawn(S, camF) {
      const dir = R() < 0.5 ? 1 : -1;
      const roll = R();
      const kind = roll < 0.45 ? 'walk' : roll < 0.65 ? 'run' : roll < 0.8 ? 'bike' : roll < 0.9 ? 'couple' : 'vendor';
      const sp = { walk: 5, run: 12, bike: 18, couple: 4, vendor: 3.5 }[kind] * R.range(0.85, 1.15);
      this.peds.push({ kind, dir, sp, x: dir > 0 ? camF - 20 : camF + S.VW + 20, t: R() * 10 });
    }

    update(dt, S, camF) {
      if (!this.seeded) {
        this.seeded = true;
        for (let i = 0; i < 3; i++) { this.spawn(S, camF); this.peds[this.peds.length - 1].x = camF + R.range(0.1, 0.9) * S.VW; }
      }
      this.nextPed -= dt;
      const wet = S.weather.rain > 0.3;
      if (this.nextPed <= 0) {
        if (this.peds.length < (wet || S.P.dark > 0.7 ? 2 : 6)) this.spawn(S, camF);
        this.nextPed = R.range(2, 6);
      }
      for (const p of this.peds) { p.x += p.dir * p.sp * dt; p.t += dt; }
      this.peds = this.peds.filter((p) => p.x > camF - 60 && p.x < camF + S.VW + 60);
    }

    draw(p, S, camF) {
      const VH = S.VH, P = S.P, t = S.t, night = P.dark;
      p.ox = -Math.round(camF * p.s);
      const x0 = camF - 2, x1 = camF + S.VW + 2;
      const wrapX = (x) => this.wrap(x, camF);
      const light = [Math.max(0.16, P.amb[0] + P.sun[0] * 0.55), Math.max(0.16, P.amb[1] + P.sun[1] * 0.55), Math.max(0.22, P.amb[2] + P.sun[2] * 0.55)];
      const lit = (h, k) => css(mul(hex(h), scale(light, k || 1)));
      const sil = css(mix(hex('#06060e'), hex('#1c1a2a'), P.day));
      const walkTop = VH - (this.o.mosaic ? 7 : 5);
      const sandTop = walkTop - 12;
      const busy = P.day > 0.45 && S.weather.rain < 0.2;

      // --- surf: foam lines rolling in, washing up the sand ---
      const foam = mix([236, 242, 250], P.hor, 0.25 + 0.35 * night);
      for (let k = 0; k < 3; k++) {
        const ph = ((t / 5.5 + k / 3) % 1);
        const y = sandTop - 14 + ph * 14;
        const a = Math.sin(ph * Math.PI) * (0.8 - 0.3 * night);
        p.ctx.fillStyle = PS.cssA(foam, a);
        for (let x = Math.floor(x0); x < x1; x += 3) {
          const n = PS.hash(Math.floor(x / 3), k * 97 + Math.floor(t / 5.5 + k / 3));
          if (n < 0.25) continue;
          p.rect(x, Math.round(y + (n - 0.5) * 1.5), 3 + (n > 0.7 ? 2 : 0), 1);
        }
      }
      // --- sand ---
      const sand = lit('#e6cf9c'), sandDark = lit('#cfb27a'), wetSand = lit('#b89c6a');
      p.rect(x0, sandTop, x1 - x0, walkTop - sandTop, sand);
      const wash = (Math.sin((t / 5.5) * Math.PI * 2) + 1) / 2;
      p.rect(x0, sandTop, x1 - x0, 1 + Math.round(wash * 2.5), wetSand);
      p.ctx.fillStyle = sandDark;
      for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) if (PS.hash(x, 5) < 0.5) p.rect(x + (PS.hash(x, 9) * 3 | 0), sandTop + 3 + (PS.hash(x, 7) * 4 | 0), 1, 1);
      // --- beachfront walk ---
      if (this.o.mosaic) {
        // Copacabana's wave mosaic (Burle Marx): black & white bands
        const w1 = lit('#f2f0ea'), w2 = lit('#23222a');
        p.rect(x0, walkTop, x1 - x0, VH - walkTop, w1);
        p.ctx.fillStyle = w2;
        for (let x = Math.floor(x0); x < x1; x++) {
          const y = Math.round(Math.sin(x * 0.32) * 2);
          p.rect(x, walkTop + 2 + y, 1, 2);
        }
      } else {
        p.rect(x0, walkTop, x1 - x0, VH - walkTop, lit('#b8b0a4'));
        p.rect(x0, walkTop, x1 - x0, 1, lit('#d8d0c4'));
      }

      // --- jangadas (João Pessoa's traditional sail rafts) resting on the sand ---
      for (const j of this.jangadas) {
        const X = wrapX(j.x);
        if (X < x0 - 16 || X > x1 + 16) continue;
        p.rect(X, sandTop + 3, 12, 2, lit('#8a5a3a'));
        p.rect(X + 5, sandTop - 12, 1, 15, lit('#6a4a2a'));
        for (let i = 0; i < 11; i++) p.rect(X + 6, sandTop - 11 + i, Math.max(1, Math.round(i * 0.6)), 1, lit(j.c));
      }
      // --- umbrellas & sunbathers (daytime) ---
      for (const u of this.umbrellas) {
        const X = wrapX(u.x);
        if (X < x0 - 10 || X > x1 + 10) continue;
        if (busy) {
          p.rect(X + 4, sandTop - 7, 1, 9, lit('#e8e4dc', 0.8));
          for (let i = 0; i < 9; i++) p.rect(X + i, sandTop - 8 + (i === 0 || i === 8 ? 1 : 0), 1, 1 + (i > 1 && i < 7 ? 1 : 0), lit(u.c[(i >> 1) % 2]));
          if (u.lying) p.sprite(LYING, X + (u.flip ? -3 : 3), sandTop + 3, { k: lit('#8a5a44', 0.8) }, u.flip);
          else p.sprite(SITTING, X + 6, sandTop, { k: lit('#8a5a44', 0.8) });
        } else if (night < 0.5) {
          p.rect(X + 4, sandTop - 7, 1, 9, lit('#e8e4dc', 0.7)); p.rect(X + 3, sandTop - 8, 3, 3, lit(u.c[0], 0.8)); // furled
        }
      }
      // --- footvolley ---
      if (busy) {
        const X = wrapX(this.footvolley.x);
        if (X > x0 - 30 && X < x1 + 30) {
          p.rect(X + 10, sandTop - 6, 1, 8, sil); p.rect(X + 10, sandTop - 6, 1, 3, lit('#f4f0e8'));
          const f = Math.floor(t * 2) % 2;
          p.sprite(KICK[f], X, sandTop - 4, { k: sil });
          p.sprite(KICK[1 - f], X + 15, sandTop - 4, { k: sil }, true);
          const ph = (t * 0.8) % 2, dir = ph < 1 ? 1 : -1, k = ph % 1;
          const bx = dir > 0 ? X + 4 + k * 13 : X + 17 - k * 13, by = sandTop - 5 - Math.sin(k * Math.PI) * 12;
          p.rect(bx, by, 1, 1, '#ffe04a');
        }
      }
      // --- kiosks ---
      for (const kq of this.kiosks) {
        const X = wrapX(kq.x);
        if (X < x0 - 20 || X > x1 + 20) continue;
        if (night > 0.3) {
          p.ctx.fillStyle = PS.cssA([255, 200, 120], 0.12 * night);
          p.rect(X - 8, walkTop - 16, 30, 16);
        }
        p.rect(X, walkTop - 10, 14, 10, lit('#f4f0e8', 0.9));
        p.rect(X - 1, walkTop - 12, 16, 2, lit(kq.c));
        p.rect(X + 2, walkTop - 8, 10, 3, night > 0.4 ? '#ffd88a' : lit('#3a4050'));
        if (night > 0.4) for (let i = 0; i < 8; i++) p.px(X - 6 + i * 3, walkTop - 14 + (i % 2), ['#ff5a4a', '#ffd23a', '#4ab0ff', '#6aff8a'][(i + Math.floor(t * 2)) % 4]);
        p.rect(X + 16, walkTop - 3, 2, 3, sil); p.rect(X + 19, walkTop - 3, 2, 3, sil); // chairs
      }
      // --- palms (tall, frame the view) ---
      for (const pm of this.palms) {
        const X = wrapX(pm.x);
        if (X < x0 - 20 || X > x1 + 20) continue;
        const trunk = lit('#7a5a3a', 0.9), trunkL = lit('#9a7a52', 0.9);
        let tx = X, ty = walkTop;
        for (let i = 0; i < pm.h; i++) {
          const k = i / pm.h;
          tx = X + Math.round(pm.lean * k * k);
          ty = walkTop - i - 1;
          p.rect(tx, ty, 2, 1, i % 3 ? trunk : trunkL);
        }
        const sway = Math.sin(t * 0.9 + pm.ph) * (1 + S.weather.wind * 2);
        const leaf = [lit('#2f7a3c'), lit('#3f9444'), lit('#255e30')];
        const fronds = [[-9, 3], [-7, -1], [-3, -4], [3, -4], [7, -1], [9, 3], [-6, 6], [6, 6], [0, -5]];
        fronds.forEach(([dx, dy], i) => {
          const ex = tx + dx + Math.round(sway * (Math.abs(dx) / 9)), ey = ty + dy + Math.abs(dx) / 3;
          p.line(tx, ty, ex, ey, leaf[i % 3]);
          p.line(tx + (dx > 0 ? 1 : 0), ty + 1, ex, ey + 1, leaf[(i + 1) % 3]);
        });
        if (pm.coco) { p.rect(tx - 1, ty + 1, 1, 1, lit('#6a4a2a')); p.rect(tx + 2, ty + 1, 1, 1, lit('#6a4a2a')); }
      }
      // --- passers-by on the walk ---
      for (const q of this.peds) {
        const f = Math.floor(q.t * (q.kind === 'run' ? 8 : q.kind === 'bike' ? 6 : 4)) % 2;
        const flip = q.dir < 0, x = q.x, y = VH - 12, map = { k: sil };
        if (q.kind === 'walk') p.sprite(WALK[f], x, y, map, flip);
        else if (q.kind === 'run') p.sprite(RUN[f], x, y, map, flip);
        else if (q.kind === 'bike') { p.sprite(BIKE[f], x, y, map, flip); if (night > 0.4) p.px(x + (flip ? 0 : 8), y + 4, '#fff4c0'); }
        else if (q.kind === 'couple') { p.sprite(WALK[f], x, y, map, flip); p.sprite(WALK[1 - f], x + (flip ? 5 : -5), y, map, flip); }
        else if (q.kind === 'vendor') {
          // beach vendor with a big parasol of snacks
          p.sprite(WALK[f], x, y, map, flip);
          p.rect(x + 2, y - 8, 1, 8, sil);
          p.rect(x - 1, y - 10, 7, 2, lit('#ff8a3a'));
          p.rect(x, y - 11, 5, 1, lit('#ffd23a'));
        }
      }
    }
  };
})();
