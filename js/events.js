'use strict';
// Random happenings: rooftop silliness, things in the sky, things in the water.
(function () {
  const PS = window.PS;
  const R = PS.R;
  const { hex, mix, css, clamp } = PS;

  // ------------------------------------------------------------------------------------------
  // Sprites ('k' = silhouette)

  const PERSON = {
    stand: ['..k..', '.kkk.', 'k.k.k', '..k..', '.k.k.', '.k.k.'],
    armsUp: ['k.k.k', '.kkk.', '..k..', '..k..', '.k.k.', '.k.k.'],
    wave1: ['..k.k', '.kkk.', 'k.k..', '..k..', '.k.k.', '.k.k.'],
    wave2: ['..kk.', '.kkk.', 'k.k..', '..k..', '.k.k.', '.k.k.'],
    d1: ['k.k.k', '.kkk.', '..k..', '..k..', '.k.k.', 'k...k'],
    d2: ['..k..', 'kkkkk', '..k..', '..k..', '.k.k.', '.k..k'],
    d3: ['..k.k', '.kkk.', 'k.k..', '..k..', '..kk.', '..k.k'],
    d4: ['k.k..', '.kkk.', '..k.k', '..k..', '.kk..', 'k.k..'],
    tree: ['..k..', '.k.k.', '..k..', '.kkk.', '..k..', '..kk.', '..k.k', '..k..'],
    warrior: ['...k...', 'kkkkkkk', '...k...', '..k.k..', '.k...k.', 'k.....k'],
    run1: ['...k.', '.kkk.', 'k.k.k', '..k..', '.k.k.', 'k...k'],
    run2: ['...k.', '..kk.', '.kk..', '..k..', '..k..', '.kk..'],
    leap: ['....k', '.kkk.', 'k.k..', '.kk..', 'k...k', '.....'],
    fall: ['k...k', '.kkk.', '..k..', '..k..', '.k.k.', 'k...k'],
    sit: ['..k..', '.kkk.', 'k.k.k', '.kkk.', '.k..k', '.....'],
    flag1: ['kkkk.', 'kkk.k', '....k', '..k.k', '.kkk.', 'k.k..', '..k..', '.k.k.', '.k.k.'],
    flag2: ['..kkk', 'kkkkk', '....k', '..k.k', '.kkk.', 'k.k..', '..k..', '.k.k.', '.k.k.'],
    kiss: ['.k..k.', 'kkkkkk', '.kk.kk', '..k.k.', '.k.kk.', '.k.k.k'],
    guitar1: ['..k...', '.kkk.g', 'k.kkg.', '..gk..', '.k.k..', '.k.k..'],
    guitar2: ['..k...', '.kkk..', 'k.kkgg', '..gk..', '.k.k..', '.k.k..'],
    scope: ['......kk', '.....kk.', '..k.kk..', '.kkkk...', 'k.k.k...', '..k.k...', '.k.k.k..', '.k.k..k.'],
    golf1: ['..k...', '.kkk..', 'k.k.k.', '..k..k', '.k.k.k', '.k.k..'],
    golf2: ['k.k...', 'kkkk..', '..k...', '..k...', '.k.k..', '.k.k..'],
    golf3: ['..k.kk', '.kkk..', '..k...', '..k...', '.k.k..', '.k.k..'],
    selfie: ['..k.k', '.kkk.', 'k.k..', '..k..', '.k.k.', '.k.k.'],
  };
  const CAT = [['k...k.k', '.k..kkk', '..kkkk.', '..k..k.'], ['k...k.k', 'k...kkk', '.kkkkk.', '..k.k..']];
  const CAT_SIT = ['...k.k', '...kkk', '..kkk.', 'k.kkk.', '.kkkk.'];
  const COW = [
    ['kk.......', 'kwwwbbww.', '.wwbbwwww', '.wwwwbbw.', '.w.w..w.w'],
    ['kk.......', 'kwwwbbww.', '.wwbbwwww', '.wwwwbbw.', '..w.ww.w.'],
  ];
  const BIRD = [['k.k', '.k.'], ['.k.', 'k.k'], ['kkk', '...']];
  const NOTE = ['.kk', '.k.', 'kk.', 'kk.'];
  const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
  const UFO = [
    '.....ccc.....',
    '....cwccc....',
    '..sssssssss..',
    '.shhhhhhhhhs.',
    'sLsLsLsLsLsLs',
    '.sssssssssss.',
    '...dd...dd...',
  ];
  const HERO = [
    ['.rr..rr.....', 'rrrrrrrbbkk.', '.bbbbbbbbbss', 'rr....y.....'],
    ['..rrrr......', 'rrrrrrrbbkk.', '.bbbbbbbbbss', 'rr....y.....'],
    ['......rr....', 'rrrrrrrbbkk.', '.bbbbbbbbbss', 'rr....y.....'],
  ];
  const SPIDEY = [['.r.', 'rbr', '.r.', 'b.b'], ['r.r', '.r.', 'rbr', '.b.']];
  const KONG = [
    ['...kkk....', '..kkkkk...', '..kfkfk...', '...fff....', 'kkkkkkkkk.', 'k..kkk..k.', 'k..kkk..k.', '...kkk....', '..kk.kk...', '..k...k...'],
    ['k..kkk..k.', 'k.kkkkk.k.', 'kkkfkfkkk.', '...fff....', '..kkkkk...', '...kkk....', '...kkk....', '...kkk....', '..kk.kk...', '..k...k...'],
  ];
  const BIPLANE = ['..r..', 'rrrrr', '.rkr.', '..r..'];
  const PLANE = ['w..........', 'ww.........', 'wwwwwwwwwwk', '...www.....'];
  const HELI = [
    ['kkkkkkkkk', '....k....', 'k..kkkk..', 'kkkkkwwk.', '...kkkk..', '..k...k..', '.kkkkkkk.'],
    ['..kkkkk..', '....k....', 'k..kkkk..', 'kkkkkwwk.', '...kkkk..', '..k...k..', '.kkkkkkk.'],
  ];
  const WITCH = ['.....k......', '....kkk.....', '...kkkkk....', '.....kk.....', 'kkkkkkkkkkkk', 'kk....kk....', 'k.....k.....'];
  const SANTA = [
    'k.......k..............',
    '.k...k.k.k...k.........',
    '.kkkkk.kkkkkkk....kkkk.',
    '..k.k...k..k.....kkkkkk',
    '..................kkkk.',
  ];
  const DUCK = ['....yyy..', '...yyyky.', '...yyyyoo', 'y..yyyy..', 'yyyyyyyy.', 'yyyyyyyy.', '.yyyyyy..'];
  const PIZZA = ['kkkkkkk', '.k.kkk.', '.kkk.k.', '..kkk..', '..k.k..', '...k...'];
  const KAIJU = [
    '....b..b.........',
    '...bkkbkk........',
    '..bkkkkkkk.......',
    '..kkkkkkkkkk.....',
    '.bkkkkkekkkkkk...',
    '.kkkkkkkkkkkkkkk.',
    'bkkkkkkkkkwwwkk..',
    'kkkkkkkkkkkk.....',
    'kkkkkkkkkkk.kk...',
    'kkkkkkkkkkkkkk...',
    'kkkkkkkkkkkk.....',
  ];

  const PATTERNS = {
    heart: ['.11.11.', '1111111', '1111111', '.11111.', '..111..', '...1...'],
    smile: ['.11111.', '1.....1', '1.1.1.1', '1.....1', '1.111.1', '1.....1', '.11111.'],
    hi: ['1.1.111', '1.1..1.', '111..1.', '1.1..1.', '1.1.111'],
    invader: ['..1...1..', '...1.1...', '..11111..', '.11.1.11.', '111111111', '1.11111.1', '1.1...1.1'],
    ny: ['1..1.1.1', '11.1.1.1', '1.11..1.', '1..1..1.', '1..1..1.'],
  };

  const scaled = (p, rows, x, y, map, k, flip) => {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][flip ? rows[j].length - 1 - i : i];
      if (ch !== '.' && map[ch]) p.rect(x + i * k, y + j * k, k, k, map[ch]);
    }
  };

  // ------------------------------------------------------------------------------------------
  // Base helpers

  function rooftop(S, opts) {
    const rf = S.pickRoof(opts);
    if (!rf) return null;
    S.claim(rf);
    return rf;
  }

  function scrolledAway(S, wx) { return S.mx(wx) - S.om < -80; }

  // Generic rooftop actor with animation frames.
  function actor(S, kind) {
    const night = S.P.dark > 0.5;
    const rf = rooftop(S, { minW: kind === 'party' || kind === 'pigeons' || kind === 'jumper' ? 9 : 6, sky: true });
    if (!rf) return null;
    const ev = { z: 'main', space: 'main', rf, life: R.range(20, 34), age: 0, kind };
    const wx = S.mx(rf.x) + 1 + R.int(0, Math.max(0, rf.w - 7));
    const roofY = () => S.groundY + rf.y;
    ev.done = () => S.release(rf);
    let notes = [], hearts = [], puffs = [];
    const flip = R() < 0.5;

    const simple = (frames, fps, extra) => {
      ev.update = (dt) => { ev.age += dt; extra && extra.update && extra.update(dt); return ev.age < ev.life && !scrolledAway(S, wx); };
      ev.draw = (p) => {
        const f = frames[Math.floor(ev.age * fps) % frames.length];
        const x = S.mx(wx);
        p.sprite(f, x, roofY() - f.length, { k: S.sil, g: '#b0703a' }, flip);
        extra && extra.draw && extra.draw(p, x);
      };
    };

    switch (kind) {
      case 'dancer': simple([PERSON.d1, PERSON.d2, PERSON.d3, PERSON.d4, PERSON.d2], 4); break;
      case 'yoga': simple([PERSON.stand, PERSON.armsUp, PERSON.tree, PERSON.tree, PERSON.warrior, PERSON.warrior], 0.35); ev.life = 30; break;
      case 'waver': simple([PERSON.stand, PERSON.wave1, PERSON.wave2, PERSON.wave1, PERSON.wave2, PERSON.stand, PERSON.stand], 3); break;
      case 'stargazer': {
        let spawned = false;
        simple([PERSON.scope], 1, { update: () => { if (!spawned && ev.age > 4) { spawned = true; S.spawn('shootingStar'); } } });
        break;
      }
      case 'selfie': {
        simple([PERSON.selfie], 1, {
          draw: (p, x) => {
            const ph = ev.age % 4;
            if (ph > 3.2 && ph < 3.35) { p.rect(x + (flip ? 0 : 4) - 1, roofY() - 7, 3, 3, '#ffffff'); }
          },
        });
        break;
      }
      case 'guitar':
        simple([PERSON.guitar1, PERSON.guitar2], 3, {
          update: (dt) => {
            if (R() < dt * 1.3) notes.push({ x: 2 + R.range(-1, 3), y: -8, vx: R.range(-3, 5), a: 0, c: R.pick(['#ffd35a', '#ff7ab6', '#7ee0ff', '#b4ff7a']) });
            for (const n of notes) { n.a += dt; n.y -= dt * 6; n.x += n.vx * dt + Math.sin(n.a * 4) * dt * 3; }
            notes = notes.filter((n) => n.a < 3.5);
          },
          draw: (p, x) => { for (const n of notes) p.sprite(NOTE, x + n.x, roofY() + n.y, { k: n.c }); },
        });
        break;
      case 'couple':
        simple([PERSON.kiss], 1, {
          update: (dt) => {
            if (R() < dt * 0.7) hearts.push({ x: R.range(0, 2), y: -10, a: 0 });
            for (const h of hearts) { h.a += dt; h.y -= dt * 5; }
            hearts = hearts.filter((h) => h.a < 3);
          },
          draw: (p, x) => { for (const h of hearts) if (h.a < 2.6 || Math.floor(h.a * 10) % 2) p.sprite(HEART, x + h.x, roofY() + h.y, { r: '#ff5c8a' }); },
        });
        break;
      case 'bbq':
        simple([PERSON.stand, PERSON.stand, PERSON.wave1], 1, {
          update: (dt) => {
            if (R() < dt * 4) puffs.push({ x: 7 + R.range(0, 2), y: -4, a: 0 });
            for (const q of puffs) { q.a += dt; q.y -= dt * 5; q.x += dt * 2.5; }
            puffs = puffs.filter((q) => q.a < 3);
          },
          draw: (p, x) => {
            const y = roofY();
            p.rect(x + 6, y - 3, 4, 1, S.sil); p.rect(x + 7, y - 2, 1, 2, S.sil); p.rect(x + 9, y - 2, 1, 2, S.sil);
            if (S.P.dark > 0.3) p.rect(x + 7, y - 4, 2, 1, '#ff7a30');
            for (const q of puffs) { const c = PS.cssA(mix(hex('#d0d0d8'), S.P.hor, 0.3), 0.7 * (1 - q.a / 3)); p.rect(x + q.x, y + q.y, q.a > 1 ? 2 : 1, q.a > 1 ? 2 : 1, c); }
          },
        });
        break;
      case 'cat': {
        let pos = 0, dir = 1, pause = 0;
        const span = Math.max(2, rf.w - 8);
        ev.update = (dt) => {
          ev.age += dt;
          if (pause > 0) pause -= dt;
          else { pos += dir * dt * 4; if (pos > span || pos < 0) { dir = -dir; pos = clamp(pos, 0, span); pause = R.range(1, 3); } else if (R() < dt * 0.2) pause = R.range(1.5, 4); }
          return ev.age < ev.life && !scrolledAway(S, wx);
        };
        ev.draw = (p) => {
          const x = S.mx(rf.x) + 1 + pos;
          if (pause > 0) {
            p.sprite(CAT_SIT, x, roofY() - 5, { k: S.sil }, dir < 0);
            if (S.P.dark > 0.5) p.px(x + (dir < 0 ? 1 : 4), roofY() - 4, '#d8ff5a');
          } else {
            const f = CAT[Math.floor(ev.age * 6) % 2];
            p.sprite(f, x, roofY() - 4, { k: S.sil }, dir < 0);
            if (S.P.dark > 0.5) p.px(x + (dir < 0 ? 1 : 5), roofY() - 3, '#d8ff5a');
          }
        };
        break;
      }
      case 'kite': {
        let tail = [];
        simple([PERSON.wave2], 1, {
          update: (dt) => { tail.unshift(0); tail.length = 6; },
          draw: (p, x) => {
            const t = S.t;
            const hx = x + (flip ? 1 : 3), hy = roofY() - 6;
            const kx = hx + (flip ? -1 : 1) * (18 + Math.sin(t * 0.7) * 3), ky = hy - 22 + Math.sin(t * 1.3) * 3;
            p.line(hx, hy, kx, ky + 3, PS.cssA([230, 230, 230], 0.6));
            p.sprite(['.r.', 'ryr', 'yry', '.y.'], kx - 1, ky, { r: '#ff4a5a', y: '#ffd23a' });
            for (let i = 0; i < 5; i++) p.px(kx + Math.sin(t * 4 + i) * 1.2, ky + 4 + i, i % 2 ? '#4aa0ff' : '#ff4a5a');
          },
        });
        break;
      }
      case 'pigeons': {
        const birds = Array.from({ length: 8 }, (_, i) => ({ ph: (i / 8) * Math.PI * 2 + R.range(-0.2, 0.2), r: R.range(0.8, 1.15) }));
        simple([PERSON.flag1, PERSON.flag2], 2.5, {
          draw: (p, x) => {
            const cx = x + 3, cy = roofY() - 24;
            for (const b of birds) {
              const a = b.ph + S.t * 0.9;
              const bx = cx + Math.cos(a) * 22 * b.r, by = cy + Math.sin(a) * 7 * b.r;
              p.sprite(BIRD[Math.floor(S.t * 6 + b.ph * 3) % 2], bx, by, { k: S.sil });
            }
          },
        });
        break;
      }
      case 'golfer': {
        const balls = [];
        let swings = 0, st = 0;
        ev.update = (dt) => {
          ev.age += dt; st += dt;
          if (st > 3.2 && swings < 4) { st = 0; swings++; balls.push({ x: 6, y: -4, vx: R.range(28, 45), vy: R.range(-38, -24), a: 0 }); }
          for (const b of balls) { b.a += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 14 * dt; }
          return (swings < 4 || st < 4) && !scrolledAway(S, wx);
        };
        ev.draw = (p) => {
          const x = S.mx(wx);
          const f = st < 2.2 ? PERSON.golf1 : st < 2.6 ? PERSON.golf2 : PERSON.golf3;
          p.sprite(f, x, roofY() - 6, { k: S.sil });
          for (const b of balls) if (b.a < 6) p.px(x + b.x, roofY() + b.y, '#ffffff');
        };
        break;
      }
      case 'party': {
        const n = Math.min(4, Math.floor((rf.w - 2) / 4));
        const ppl = Array.from({ length: n }, (_, i) => ({ dx: 1 + i * 4, ph: R.int(0, 3), sp: R.range(3, 5) }));
        const frames = [PERSON.d1, PERSON.d2, PERSON.d3, PERSON.d4];
        const cols = ['#ff5c8a', '#ffd35a', '#6ef0ff', '#9bff6e', '#c38bff'];
        ev.update = (dt) => {
          ev.age += dt;
          if (R() < dt * 2) notes.push({ x: R.range(0, rf.w), y: -9, a: 0, c: R.pick(cols) });
          for (const q of notes) { q.a += dt; q.y -= dt * 7; }
          notes = notes.filter((q) => q.a < 3);
          return ev.age < ev.life + 10 && !scrolledAway(S, rf.x);
        };
        ev.draw = (p) => {
          const x0 = S.mx(rf.x), y = roofY();
          p.rect(x0, y - 9, rf.w, 9, 'rgba(255,190,110,0.16)');
          p.rect(x0 + 1, y - 7, rf.w - 2, 7, 'rgba(255,190,110,0.12)');
          // string lights
          const w = rf.w - 1;
          p.rect(x0, y - 9, 1, 9, S.sil); p.rect(x0 + w, y - 9, 1, 9, S.sil);
          for (let i = 0; i <= w; i++) {
            const sag = Math.round(Math.sin((i / w) * Math.PI) * 2);
            if (i % 2 === 0) p.px(x0 + i, y - 9 + sag, cols[(i / 2 + Math.floor(S.t * 2)) % cols.length]);
            else p.px(x0 + i, y - 9 + sag, S.sil);
          }
          for (const q of ppl) p.sprite(frames[Math.floor(S.t * q.sp + q.ph) % 4], x0 + q.dx, y - 6, { k: S.sil });
          for (const q of notes) p.sprite(NOTE, x0 + q.x, y + q.y, { k: q.c });
        };
        break;
      }
      case 'jumper': {
        // Runs across rooftops, leaping between buildings.
        let cur = rf, x = 0, y = 0, vy = 0, state = 'run', jumps = 0, next = null, stateT = 0;
        const roofs = S.main.B.roofs;
        let wxr = S.mx(rf.x);
        ev.update = (dt) => {
          ev.age += dt; stateT += dt;
          if (state === 'run') {
            x += dt * 14;
            if (x > cur.w - 3) {
              const cand = roofs.filter((q) => q.x > cur.x + cur.w && q.x - (cur.x + cur.w) < 26 && Math.abs(q.y - cur.y) < 16).sort((a, b) => a.x - b.x)[0];
              if (cand && jumps < 4) {
                next = cand; state = 'jump'; stateT = 0; jumps++;
                const dx = cand.x - cur.x + 2 - x;
                const T = 0.8;
                ev.jvx = dx / T; vy = (cand.y - cur.y) / T - 0.5 * 50 * T; y = 0;
              } else { state = 'stop'; stateT = 0; }
            }
          } else if (state === 'jump') {
            x += ev.jvx * dt; y += vy * dt; vy += 50 * dt;
            if (stateT >= 0.8) { wxr += next.x - cur.x; x -= next.x - cur.x; cur = next; y = 0; state = 'run'; }
          } else if (state === 'stop') {
            if (stateT > 4) return false;
          }
          return ev.age < 40 && !scrolledAway(S, wxr + x);
        };
        ev.draw = (p) => {
          const px = S.mx(wxr) + x;
          const py = S.groundY + cur.y + y;
          let f = state === 'run' ? (Math.floor(ev.age * 8) % 2 ? PERSON.run1 : PERSON.run2) : state === 'jump' ? PERSON.leap : PERSON.stand;
          p.sprite(f, px, py - 6, { k: S.sil });
          if (state === 'stop' && stateT < 2.5) p.rect(px + 2, py - 12, 1, 3, '#ffffff'), p.px(px + 2, py - 8, '#ffffff');
        };
        ev.done = () => S.release(rf);
        break;
      }
      default: return null;
    }
    return ev;
  }

  // ------------------------------------------------------------------------------------------
  // Sky stuff

  function ufo(S) {
    const rf = rooftop(S, { minW: 10, sky: true });
    if (!rf) return null;
    const victim = R.pick(['cow', 'cow', 'person', 'cat']);
    const vx = S.mx(rf.x) + Math.floor(rf.w / 2) - 4;
    const baseY = S.groundY + rf.y;
    const ev = { z: 'main', space: 'main', t: 0, done: () => S.release(rf) };
    const hoverY = baseY - 34;
    const startX = vx - 120, startY = hoverY - 70;
    let lift = 0;
    const vicSprite = () => victim === 'cow' ? COW[Math.floor(ev.t * 2) % 2] : victim === 'cat' ? CAT_SIT : PERSON.armsUp;
    ev.update = (dt) => { ev.t += dt; return ev.t < 17 && !scrolledAway(S, vx); };
    ev.draw = (p) => {
      const t = ev.t, dxw = S.mx(vx) - vx;
      let ux, uy, beam = false;
      if (t < 3) { ux = vx - 30; uy = -100; }
      else if (t < 6) { const k = PS.smooth(3, 6, t); ux = PS.lerp(startX, vx - 2, k); uy = PS.lerp(startY, hoverY, k); }
      else if (t < 12) { ux = vx - 2; uy = hoverY + Math.sin(t * 3) * 1; beam = t > 6.8 && t < 11.6; }
      else { const k = (t - 12); ux = vx - 2 + k * k * 25; uy = hoverY - k * k * 14; }
      if (t > 7.5 && t < 11.2) lift = PS.smooth(7.5, 11.2, t);
      ux += dxw;
      const vs = vicSprite();
      const vxs = vx + dxw, vys = baseY - vs.length - lift * 26;
      if (beam) {
        const flick = 0.22 + 0.06 * Math.sin(t * 30);
        for (let y = uy + 7; y < baseY; y++) {
          const k = (y - uy - 7) / (baseY - uy - 7);
          const w = 5 + k * 10;
          p.rect(Math.round(ux + 6.5 - w / 2), y, Math.round(w), 1, `rgba(170,255,190,${(y % 2 ? flick : flick * 0.6).toFixed(3)})`);
        }
      }
      if (lift < 0.99) {
        p.sprite(vs, vxs + (victim === 'cow' ? 0 : 2), vys, { k: S.sil, w: '#f2f0ea', b: '#2a2a30' });
        if (t > 3 && t < 7) p.text(victim === 'cow' ? 'MOO?' : '?!', vxs + 1, vys - 7, '#ffffff');
      }
      const lc = ['#ff5a5a', '#ffe95a', '#5affc8', '#5ab4ff'];
      const k = Math.floor(t * 8);
      p.sprite(UFO, ux, uy, { c: '#8affc4', w: '#e8fff4', s: '#a4acba', h: '#d8dee8', d: '#5a6070', L: lc[k % 4] });
      p.px(ux + 3 + (k % 5) * 2, uy + 4, lc[(k + 2) % 4]);
    };
    return ev;
  }

  function superhero(S) {
    const dir = R() < 0.5 ? 1 : -1;
    const y0 = R.range(20, S.horizon * 0.45);
    const loopAt = R() < 0.5 ? R.range(0.3, 0.7) * S.VW : -1e9;
    const ev = { z: 'front', space: 'screen', x: dir > 0 ? -20 : S.VW + 20, y: y0, t: 0, looped: false, loopT: -1, trail: [] };
    const colors = R.pick([
      { r: '#e8323c', b: '#2a5ad8', k: '#1a1a22', s: '#f2c49a', y: '#f5d142' },
      { r: '#2ad8a0', b: '#6a2ad8', k: '#f5d142', s: '#c98a5a', y: '#ffffff' },
      { r: '#ffd23a', b: '#1a1a22', k: '#1a1a22', s: '#f2c49a', y: '#ffd23a' },
    ]);
    ev.update = (dt) => {
      ev.t += dt;
      if (ev.loopT >= 0) {
        ev.loopT += dt;
        const a = ev.loopT * 3.2;
        ev.x = ev.lx + dir * Math.sin(a) * 14; ev.y = ev.ly - (1 - Math.cos(a)) * 14;
        if (a > Math.PI * 2) ev.loopT = -1;
      } else {
        ev.x += dir * 70 * dt; ev.y = y0 + Math.sin(ev.t * 1.5) * 4;
        if (!ev.looped && ((dir > 0 && ev.x > loopAt) || (dir < 0 && ev.x < S.VW - loopAt)) && loopAt > 0) { ev.looped = true; ev.loopT = 0; ev.lx = ev.x; ev.ly = ev.y; }
      }
      ev.trail.unshift([ev.x, ev.y]); ev.trail.length = Math.min(ev.trail.length, 10);
      return ev.x > -40 && ev.x < S.VW + 40;
    };
    ev.draw = (p) => {
      for (let i = 3; i < ev.trail.length; i += 2) p.rect(ev.trail[i][0] + (dir > 0 ? 0 : 11), ev.trail[i][1] + 2, 2, 1, `rgba(255,255,255,${(0.35 - i * 0.03).toFixed(2)})`);
      p.sprite(HERO[Math.floor(ev.t * 10) % 3], ev.x, ev.y, colors, dir < 0);
    };
    return ev;
  }

  function spider(S) {
    const rects = S.main.B.rects;
    const ev = { z: 'main', space: 'main', t: 0 };
    let ax, ay, L, th = 0, T = 1.3, x, y;
    const anchorNear = (wx, maxY) => {
      let best = null;
      for (const q of rects) {
        if (q.x <= wx && q.x + q.w >= wx) { const top = q.y + S.groundY; if (!best || top < best) best = top; }
      }
      return best == null ? maxY - 30 : Math.min(best + 2, maxY - 18);
    };
    // world coordinates (unwrapped, relative to spawn)
    x = S.om - 10; y = S.groundY - 60;
    const newAnchor = () => { ax = x + R.range(16, 26); ay = anchorNear(((ax % S.WM) + S.WM) % S.WM, y); ay = Math.max(8, ay); L = Math.hypot(ax - x, y - ay); th = Math.atan2(x - ax, y - ay); ev.th0 = th; ev.st = 0; };
    newAnchor();
    ev.update = (dt) => {
      ev.t += dt; ev.st += dt;
      const k = Math.min(1, ev.st / T);
      th = ev.th0 + (-ev.th0 * 2) * (0.5 - 0.5 * Math.cos(Math.PI * k));
      x = ax + Math.sin(th) * L; y = ay + Math.cos(th) * L;
      if (k >= 1) newAnchor();
      return S.mx(x) - S.om < S.VW + 30 && ev.t < 30;
    };
    ev.draw = (p) => {
      const d = S.mx(x) - x;
      p.line(x + d + 1, y, ax + d, ay, '#f0f0f0');
      p.sprite(SPIDEY[Math.abs(th) < 0.3 ? 1 : 0], x + d, y, { r: '#e0303a', b: '#2a48c8' });
    };
    return ev;
  }

  function kong(S) {
    const esb = S.lm.esb;
    if (!esb) return null;
    const X = S.mx(esb.x) - S.om;
    if (X < 30 || X > S.VW - 10) return null;
    const ev = { z: 'main', space: 'main', t: 0 };
    const planes = [0, Math.PI];
    ev.update = (dt) => { ev.t += dt; return ev.t < 32; };
    ev.draw = (p) => {
      const t = ev.t;
      const cx = S.mx(esb.x);
      const climb = PS.smooth(0, 6, t);
      const top = S.groundY + esb.mastTop;
      const feet = top + 10;
      const ky = feet - 20 + (1 - climb) * 40 + (t > 28 ? (t - 28) * 30 : 0);
      const beat = t > 6 && t < 26 && Math.floor(t * 4) % 2;
      const g = p.ctx; g.save(); g.beginPath(); g.rect(0, 0, g.canvas.width, (feet + 1) * p.s); g.clip();
      scaled(p, KONG[beat ? 1 : 0], cx - 10, ky, { k: '#5a3a28', f: '#a07a5a' }, 2);
      g.restore();
      if (beat && Math.floor(t) % 4 === 0) p.text('!', cx + 10, ky - 7, '#ffffff');
      for (const a0 of planes) {
        const a = a0 + t * 0.9;
        const px = cx - 2 + Math.cos(a) * 40, py = top - 8 + Math.sin(a) * 12;
        p.sprite(BIPLANE, px, py, { r: '#c8b27a', k: '#333' }, Math.sin(a) > 0);
      }
    };
    return ev;
  }

  function plane(S) {
    const dir = R() < 0.5 ? 1 : -1;
    const y = R.range(10, S.horizon * 0.35);
    const sp = R.range(10, 18);
    const ev = { z: 'back', space: 'screen', x: dir > 0 ? -15 : S.VW + 15, y, t: 0, trail: [] };
    ev.update = (dt) => {
      ev.t += dt; ev.x += dir * sp * dt;
      if (S.P.day > 0.5 && y < S.horizon * 0.25 && ev.t % 0.25 < dt) ev.trail.push({ x: ev.x + (dir > 0 ? 0 : 10), y: ev.y + 2, a: 0 });
      for (const q of ev.trail) q.a += dt;
      ev.trail = ev.trail.filter((q) => q.a < 8);
      return ev.x > -40 && ev.x < S.VW + 40;
    };
    ev.draw = (p) => {
      for (const q of ev.trail) p.rect(q.x, q.y, 2, 1, `rgba(255,255,255,${(0.5 * (1 - q.a / 8)).toFixed(2)})`);
      const night = S.P.dark > 0.5;
      const body = night ? PS.css(mix(S.P.top, [120, 120, 140], 0.25)) : '#e8ecf2';
      p.sprite(PLANE, ev.x, ev.y, { w: body, k: night ? body : '#4a5a78' }, dir < 0);
      const blink = Math.floor(ev.t * 1.4) % 2 === 0;
      if (night || blink) {
        p.px(ev.x + (dir > 0 ? 4 : 6), ev.y + 3, dir > 0 ? '#ff3b30' : '#3bff6a');
        if (blink) p.px(ev.x + (dir > 0 ? 0 : 10), ev.y, '#ffffff');
      }
    };
    return ev;
  }

  function helicopter(S) {
    const dir = R() < 0.5 ? 1 : -1;
    const y = R.range(S.horizon * 0.35, S.horizon * 0.55);
    const ev = { z: 'front', space: 'screen', x: dir > 0 ? -12 : S.VW + 12, y, t: 0, hover: R.range(0.3, 0.7) * S.VW, hoverT: 0 };
    ev.update = (dt) => {
      ev.t += dt;
      if (ev.hoverT < 6 && Math.abs(ev.x - ev.hover) < 2) ev.hoverT += dt;
      else ev.x += dir * 11 * dt;
      return ev.x > -30 && ev.x < S.VW + 30;
    };
    ev.draw = (p) => {
      const night = S.P.dark > 0.5;
      const bob = Math.sin(ev.t * 2) * 0.8;
      if (night) {
        const sweep = Math.sin(ev.t * 0.6) * 18;
        const x0 = ev.x + 4, y0 = ev.y + 6 + bob;
        for (let yy = Math.ceil(y0); yy < S.groundY; yy++) {
          const k = (yy - y0) / (S.groundY - y0);
          const w = 2 + k * 18;
          p.rect(Math.round(x0 + sweep * k - w / 2), yy, Math.round(w), 1, `rgba(255,248,200,${(0.16 - k * 0.08).toFixed(3)})`);
        }
      }
      p.sprite(HELI[Math.floor(ev.t * 12) % 2], ev.x, ev.y + bob, { k: night ? '#1a1c2c' : '#2c3444', w: night ? '#ffe9a0' : '#9ec8ff' }, dir < 0);
      if (Math.floor(ev.t * 1.5) % 2) p.px(ev.x + (dir > 0 ? 0 : 8), ev.y + 3 + bob, '#ff3b30');
    };
    return ev;
  }

  function blimp(S) {
    const dir = R() < 0.5 ? 1 : -1;
    const msg = R.pick(S.city.messages);
    const W = 36, H = 11;
    const ev = { z: 'back', space: 'screen', x: dir > 0 ? -W : S.VW + 2, y: R.range(18, S.horizon * 0.3), t: 0 };
    ev.update = (dt) => { ev.t += dt; ev.x += dir * 6 * dt; return ev.x > -W - 5 && ev.x < S.VW + 5; };
    ev.draw = (p) => {
      const night = S.P.dark > 0.5;
      const body = night ? '#3a3f58' : '#d6dce6', shade = night ? '#2a2e44' : '#a9b2c2', hi = night ? '#50567a' : '#f4f7fb';
      const x = ev.x, y = ev.y;
      for (let j = 0; j < H; j++) {
        const k = (j - (H - 1) / 2) / (H / 2);
        const half = Math.sqrt(1 - k * k) * (W / 2);
        p.rect(Math.round(x + W / 2 - half), y + j, Math.round(half * 2), 1, j < 3 ? hi : j > H - 4 ? shade : body);
      }
      const tx = dir > 0 ? x : x + W - 4;
      p.rect(tx, y - 1, 4, 3, shade); p.rect(tx, y + H - 2, 4, 3, shade);
      p.rect(x + W / 2 - 3, y + H, 6, 2, shade);
      // LED sign
      const sx = x + 7, sw = W - 14;
      p.rect(sx - 1, y + 2, sw + 2, 7, night ? '#101018' : '#2a2e3a');
      const tw = PS.textWidth(msg);
      const off = ((ev.t * 8) % (tw + sw));
      const g = p.ctx;
      g.save();
      g.beginPath(); g.rect(Math.round(sx * p.s) + p.ox, Math.round((y + 3) * p.s), sw * p.s, 5 * p.s); g.clip();
      p.text(msg, sx + sw - off, y + 3, night ? '#ffd35a' : '#ff5a4a');
      g.restore();
    };
    return ev;
  }

  function bannerPlane(S) {
    const dir = R() < 0.5 ? 1 : -1;
    const msg = R.pick(S.city.messages.concat(['MARRY ME JESS?', 'CALL YOUR MOM', 'HYDRATE']));
    const bw = PS.textWidth(msg) + 6;
    const ev = { z: 'back', space: 'screen', x: dir > 0 ? -bw - 20 : S.VW + 20, y: R.range(20, S.horizon * 0.35), t: 0 };
    ev.update = (dt) => { ev.t += dt; ev.x += dir * 14 * dt; return dir > 0 ? ev.x < S.VW + 20 : ev.x > -bw - 30; };
    ev.draw = (p) => {
      const px = ev.x, y = ev.y;
      p.sprite(['..k...', 'kkkkkw', '..k...'], px, y, { k: '#d84a3a', w: '#9ec8ff' }, dir < 0);
      const bx = dir > 0 ? px - 4 - bw : px + 10;
      p.rect(dir > 0 ? bx + bw : px + 6, y + 1, 4, 1, '#888');
      for (let i = 0; i < bw; i++) {
        const wob = Math.round(Math.sin(ev.t * 6 - i * 0.35) * 0.7);
        p.rect(bx + i, y - 2 + wob, 1, 7, '#f6f2e8');
      }
      p.text(msg, bx + 3, y - 1, '#d8323a');
    };
    return ev;
  }

  function birds(S) {
    const dir = R() < 0.5 ? 1 : -1;
    const n = R.int(4, 9);
    const y = R.range(15, S.horizon * 0.5);
    const flock = Array.from({ length: n }, (_, i) => { const k = Math.ceil(i / 2); return { dx: -k * 4, dy: (i % 2 ? -1 : 1) * k * 2 + R.range(-1, 1), ph: R.range(0, 6) }; });
    const ev = { z: 'back', space: 'screen', x: dir > 0 ? -10 : S.VW + 10, y, t: 0 };
    ev.update = (dt) => { ev.t += dt; ev.x += dir * 16 * dt; return ev.x > -60 && ev.x < S.VW + 60; };
    ev.draw = (p) => {
      for (const b of flock) p.sprite(BIRD[Math.floor(ev.t * 5 + b.ph) % 2], ev.x + dir * b.dx, ev.y + b.dy + Math.sin(ev.t * 2 + b.ph) * 0.8, { k: S.sil });
    };
    return ev;
  }

  function shootingStar(S) {
    const x = R.range(S.VW * 0.1, S.VW * 0.9), y = R.range(6, S.horizon * 0.3);
    const dir = R() < 0.5 ? 1 : -1;
    const ev = { z: 'sky', space: 'screen', t: 0 };
    ev.update = (dt) => { ev.t += dt; return ev.t < 1.1; };
    ev.draw = (p) => {
      const k = ev.t / 1.1;
      const hx = x + dir * ev.t * 90, hy = y + ev.t * 38;
      for (let i = 0; i < 12; i++) {
        const a = (1 - i / 12) * (1 - k);
        p.rect(Math.round(hx - dir * i * 2.2), Math.round(hy - i * 0.93), 1, 1, `rgba(255,255,240,${a.toFixed(2)})`);
      }
    };
    return ev;
  }

  function fireworks(S) {
    const ev = { z: 'main', space: 'main', t: 0, parts: [], rockets: [], next: 0 };
    const palettes = [['#ffd35a', '#fff2b0'], ['#ff4a5a', '#ffffff'], ['#5affc8', '#5ab4ff'], ['#ff7ad0', '#c38bff'], ['#9bff6e', '#ffd35a'], ['#ffffff', '#b0d8ff']];
    const x0 = S.om + S.VW * 0.2, span = S.VW * 0.6;
    ev.update = (dt) => {
      ev.t += dt; ev.next -= dt;
      if (ev.t < 24 && ev.next <= 0) {
        ev.next = R.range(0.4, 1.8);
        const tx = x0 + R.range(0, span);
        ev.rockets.push({ x: tx, y: S.horizon, vy: -R.range(55, 75), by: R.range(20, S.horizon * 0.5), pal: R.pick(palettes) });
      }
      for (const r of ev.rockets) {
        r.y += r.vy * dt;
        if (R() < 0.6) ev.parts.push({ x: r.x + R.range(-0.5, 0.5), y: r.y + 2, vx: 0, vy: 5, life: 0.4, a: 0, c: '#ffd9a0', small: true });
        if (r.y <= r.by) {
          r.dead = true;
          const n = R.int(28, 48), sp = R.range(16, 26), ring = R() < 0.4;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + R.range(-0.1, 0.1), v = ring ? sp : sp * R.range(0.3, 1);
            ev.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R.range(1.4, 2.2), a: 0, c: R.pick(r.pal) });
          }
          ev.parts.push({ x: r.x, y: r.y, flash: true, life: 0.12, a: 0 });
        }
      }
      ev.rockets = ev.rockets.filter((r) => !r.dead);
      for (const q of ev.parts) { q.a += dt; if (!q.flash) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 11 * dt; q.vx *= 1 - dt * 1.2; } }
      ev.parts = ev.parts.filter((q) => q.a < q.life);
      return ev.t < 24 || ev.parts.length || ev.rockets.length;
    };
    ev.draw = (p) => {
      const d = S.mx(x0) - x0;
      for (const r of ev.rockets) p.px(r.x + d, r.y, '#fff4d0');
      for (const q of ev.parts) {
        if (q.flash) { p.rect(q.x + d - 1, q.y - 1, 3, 3, '#ffffff'); continue; }
        const k = q.a / q.life;
        if (k > 0.7 && Math.floor(q.a * 20 + q.x) % 2) continue; // crackle
        p.rect(q.x + d, q.y, 1, 1, q.c);
      }
    };
    return ev;
  }

  function pizzaSignal(S) {
    const rf = rooftop(S, { minW: 5, sky: true });
    if (!rf) return null;
    const ox = S.mx(rf.x) + 2, oy = S.groundY + rf.y;
    const tx = ox + R.range(-40, 40), ty = R.range(18, 40);
    const ev = { z: 'main', space: 'main', t: 0, done: () => S.release(rf) };
    ev.update = (dt) => { ev.t += dt; return ev.t < 22 && !scrolledAway(S, ox); };
    ev.draw = (p) => {
      const d = S.mx(ox) - ox;
      const on = ev.t > 1 && !(ev.t > 1 && ev.t < 1.6 && Math.floor(ev.t * 20) % 2);
      p.rect(ox + d - 1, oy - 2, 3, 2, S.sil);
      if (!on) return;
      const steps = Math.ceil(oy - ty);
      for (let i = 0; i < steps; i++) {
        const k = i / steps, y = oy - 2 - i, x = PS.lerp(ox + d, tx + d, k), w = 1 + k * 13;
        p.rect(Math.round(x - w / 2), y, Math.round(w), 1, 'rgba(255,250,210,0.11)');
      }
      for (let j = -5; j <= 5; j++) {
        const hw = Math.round(Math.sqrt(1 - (j / 5.5) ** 2) * 10);
        p.rect(Math.round(tx + d - hw), Math.round(ty + j), hw * 2, 1, 'rgba(255,240,170,0.55)');
      }
      p.sprite(PIZZA, Math.round(tx + d - 3), Math.round(ty - 3), { k: 'rgba(20,20,30,0.75)' });
    };
    return ev;
  }

  function windowArt(S) {
    const grids = S.main.B.grids.filter((g) => {
      const X = S.mx(g.cols[0] || 0) - S.om;
      return g.cols.length >= 7 && g.rows.length >= 8 && X > 10 && X < S.VW - 30 && !S.claimedGrid.has(g);
    });
    if (!grids.length) return null;
    const g = R.pick(grids);
    const names = Object.keys(PATTERNS).filter((k) => PATTERNS[k][0].length <= g.cols.length && PATTERNS[k].length <= g.rows.length);
    if (!names.length) return null;
    const pat = PATTERNS[R.pick(names)];
    S.claimedGrid.add(g);
    const c0 = Math.floor((g.cols.length - pat[0].length) / 2);
    const r0 = Math.min(2, g.rows.length - pat.length);
    const ev = { z: 'main', space: 'main', t: 0, done: () => S.claimedGrid.delete(g) };
    const lit = R.pick(['#fff2b0', '#ffd35a', '#ff8fb8', '#9fe0ff']);
    ev.update = (dt) => { ev.t += dt; return ev.t < 28; };
    ev.draw = (p) => {
      // reveal row by row, blink at the end
      const shown = Math.floor(ev.t * 3);
      if (ev.t > 25 && Math.floor(ev.t * 4) % 2) return;
      for (let j = -1; j <= pat.length; j++) {
        const rr = r0 + j;
        if (rr < 0 || rr >= g.rows.length) continue;
        for (let i = -1; i <= pat[0].length; i++) {
          const cc = c0 + i;
          if (cc < 0 || cc >= g.cols.length) continue;
          const on = j >= 0 && j < pat.length && i >= 0 && i < pat[0].length && pat[j][i] === '1' && j < shown;
          p.rect(S.mx(g.cols[cc]), S.groundY + g.rows[rr], g.ww, g.wh, on ? lit : '#14131e');
        }
      }
    };
    return ev;
  }

  function moonCrosser(S, what) {
    if (!S.moon.visible) return null;
    const dir = R() < 0.5 ? 1 : -1;
    const spr = what === 'santa' ? SANTA : WITCH;
    const w = spr[0].length;
    const sp = 22;
    const ev = { z: 'sky', space: 'screen', t: 0 };
    const cx = S.moon.x, cy = S.moon.y;
    const x0 = dir > 0 ? -w - 4 : S.VW + 4;
    const slope = R.range(-0.12, 0.12);
    ev.update = (dt) => { ev.t += dt; const x = x0 + dir * sp * ev.t; return x > -w - 10 && x < S.VW + 10; };
    ev.draw = (p) => {
      const x = x0 + dir * sp * ev.t;
      const y = cy - spr.length / 2 + (x + w / 2 - cx) * slope + Math.sin(ev.t * 2) * 1.5;
      p.sprite(spr, x, y, { k: '#0a0a14' }, dir < 0);
      if (what === 'santa') p.px(x + (dir > 0 ? 1 : w - 2), y + 1, Math.floor(ev.t * 3) % 2 ? '#ff3030' : '#801010');
    };
    return ev;
  }

  function balloon(S) {
    const x = R.range(0.1, 0.8) * S.VW;
    const ev = { z: 'back', space: 'screen', t: 0, x, y: S.horizon * 0.4 };
    const cols = R.pick([['#ff5a5a', '#ffd35a'], ['#5ab4ff', '#ffffff'], ['#9bff6e', '#ff7ad0'], ['#ff9a3a', '#6a4ad8']]);
    ev.update = (dt) => { ev.t += dt; ev.y -= dt * 2.2; ev.x += dt * 2; return ev.y > -20; };
    ev.draw = (p) => {
      const rows = [3, 5, 7, 7, 7, 7, 5, 3];
      for (let j = 0; j < rows.length; j++) {
        const w = rows[j];
        for (let i = 0; i < w; i++) p.px(ev.x + 3 - (w >> 1) + i, ev.y + j, cols[(i + (7 - w) / 2) % 2 ? 1 : 0]);
      }
      p.px(ev.x + 2, ev.y + 8, S.sil); p.px(ev.x + 4, ev.y + 8, S.sil);
      p.rect(ev.x + 2, ev.y + 9, 3, 2, '#8a5a3a');
      if (Math.floor(ev.t * 2) % 5 === 0) p.px(ev.x + 3, ev.y + 8, '#ffb040');
    };
    return ev;
  }

  // ------------------------------------------------------------------------------------------
  // Water

  function waterY(S, near) {
    const h = S.VH - S.horizon;
    return S.horizon + Math.round(near ? R.range(h * 0.45, h * 0.7) : R.range(4, h * 0.4));
  }

  function boat(S, kind) {
    const dir = R() < 0.5 ? 1 : -1;
    const y = kind === 'kaiju' ? S.VH - 12 : waterY(S, kind === 'ferry' || kind === 'duck');
    const sp = { ferry: 7, tug: 6, sail: 5, yacht: 8, duck: 3, nessie: 4, kaiju: 0 }[kind];
    const x0 = kind === 'kaiju' ? S.om + R.range(0.3, 0.7) * S.VW : dir > 0 ? S.om - 40 : S.om + S.VW + 10;
    const ev = { z: 'water', space: 'main', t: 0, x: x0, puffs: [] };
    const life = kind === 'kaiju' ? 20 : 400;
    ev.update = (dt) => {
      ev.t += dt; ev.x += dir * sp * dt;
      if (kind === 'tug' && R() < dt * 3) ev.puffs.push({ x: 3, y: -8, a: 0 });
      for (const q of ev.puffs) { q.a += dt; q.y -= dt * 4; q.x -= dir * dt * 3; }
      ev.puffs = ev.puffs.filter((q) => q.a < 3);
      const X = S.mx(ev.x) - S.om;
      return ev.t < life && X > -60 && X < S.VW + 60 && !(ev.t > 5 && (X < -50 || X > S.VW + 50));
    };
    ev.draw = (p) => {
      const night = S.P.dark > 0.5;
      const x = S.mx(ev.x), t = ev.t;
      const bob = Math.round(Math.sin(t * 1.6) * 0.5);
      const wake = PS.cssA([230, 240, 255], night ? 0.35 : 0.6);
      const litW = night ? '#ffd57e' : '#3a4a60';
      const dark = (c) => PS.css(PS.mul(hex(c), PS.add(PS.add(S.P.amb, PS.scale(S.P.sun, 0.4)), [0.1, 0.1, 0.12])));
      if (kind !== 'kaiju' && kind !== 'nessie') for (let i = 0; i < 4; i++) p.rect(x + (dir > 0 ? -3 - i * 3 : 20 + i * 3), y + 1 + (i % 2), 2, 1, wake);
      if (kind === 'ferry') {
        const hull = dark('#f07a24'), white = dark('#f2eee6');
        p.ctx.globalAlpha = 0.22;
        p.rect(x, y + 6, 26, 2, hull); p.rect(x + 2, y + 8, 22, 2, white); p.rect(x + 6, y + 10, 14, 2, white);
        p.ctx.globalAlpha = 1;
        const yy = y + bob;
        p.rect(x, yy + 4, 26, 2, hull);
        p.rect(x + 2, yy + 2, 22, 2, white);
        p.rect(x + 6, yy, 14, 2, white);
        for (let i = x + 3; i < x + 23; i += 2) p.px(i, yy + 2, litW);
        for (let i = x + 7; i < x + 19; i += 2) p.px(i, yy, litW);
        p.rect(x + 12, yy - 2, 2, 2, hull);
      } else if (kind === 'tug') {
        p.rect(x, y + 3 + bob, 11, 2, dark('#b8322a')); p.rect(x, y + 5 + bob, 11, 1, dark('#222'));
        p.rect(x + (dir > 0 ? 5 : 2), y + bob, 4, 3, dark('#f2eee6')); p.px(x + (dir > 0 ? 6 : 3), y + 1 + bob, litW);
        p.rect(x + (dir > 0 ? 3 : 7), y - 2 + bob, 1, 5, dark('#222')); p.px(x + (dir > 0 ? 3 : 7), y - 1 + bob, dark('#e03030'));
        for (const q of ev.puffs) p.rect(x + (dir > 0 ? 3 : 7) + q.x - 3, y + q.y + 6, q.a > 1 ? 2 : 1, q.a > 1 ? 2 : 1, PS.cssA([200, 200, 210], 0.6 * (1 - q.a / 3)));
      } else if (kind === 'sail') {
        p.rect(x, y + 4 + bob, 9, 1, dark('#f2eee6')); p.rect(x + 1, y + 5 + bob, 7, 1, dark('#2a3a5a'));
        p.rect(x + 4, y - 6 + bob, 1, 10, dark('#5a4a3a'));
        for (let j = 0; j < 9; j++) p.rect(x + (dir > 0 ? 5 : 4 - Math.floor(j / 2)), y - 5 + j + bob, Math.floor(j / 2) + 1, 1, dark('#fbf8f0'));
        for (let j = 2; j < 9; j++) p.rect(x + (dir > 0 ? 3 - Math.floor((j - 2) / 3) : 5), y - 5 + j + bob, Math.floor((j - 2) / 3) + 1, 1, dark('#ff6a5a'));
      } else if (kind === 'yacht') {
        p.rect(x, y + 3 + bob, 18, 2, dark('#f2eee6')); p.rect(x + 1, y + 5 + bob, 16, 1, dark('#223'));
        p.rect(x + 4, y + 1 + bob, 10, 2, dark('#e6e8ee'));
        for (let i = x + 5; i < x + 13; i += 2) p.px(i, y + 1 + bob, night ? '#8fe0ff' : '#3a4a60');
        const cols = ['#ff5c8a', '#ffd35a', '#6ef0ff', '#9bff6e', '#c38bff'];
        for (let i = 0; i < 9; i++) p.px(x + 1 + i * 2, y - 1 + (i === 0 || i === 8 ? 1 : 0) + bob, cols[(i + Math.floor(t * 3)) % 5]);
        if (Math.floor(t * 2) % 2) p.sprite(NOTE, x + 8 + Math.sin(t) * 3, y - 7 - (t % 2) * 2, { k: cols[Math.floor(t) % 5] });
      } else if (kind === 'duck') {
        const b = Math.sin(t * 1.2) * 1;
        p.ctx.globalAlpha = 0.25; scaled(p, DUCK.slice().reverse(), x, y + 14 + b, { y: '#ffd21a', o: '#ff8a1a', k: '#222' }, 2, dir < 0); p.ctx.globalAlpha = 1;
        scaled(p, DUCK, x, y + b, { y: dark('#ffd21a'), o: dark('#ff8a1a'), k: '#141414' }, 2, dir < 0);
      } else if (kind === 'nessie') {
        const g = dark('#3a7a54');
        const dive = Math.max(0, Math.sin(t * 0.35));
        const sink = Math.round(dive * 5);
        const g2 = p.ctx; g2.save(); g2.beginPath(); g2.rect(0, 0, g2.canvas.width, (y + 3) * p.s); g2.clip();
        const hx = dir > 0 ? 18 : 0;
        for (const hx2 of [2, 8]) p.sprite(['.gg.', 'gggg'], x + (dir > 0 ? hx2 : 18 - hx2 - 4), y + 1 + sink, { g });
        p.sprite(['.gg', 'gg.', 'g..', 'g..', 'g..'].map((r) => (dir > 0 ? r : r.split('').reverse().join(''))), x + hx - (dir > 0 ? 1 : 0), y - 3 + sink, { g });
        p.px(x + hx + (dir > 0 ? 1 : 0), y - 3 + sink, '#111');
        g2.restore();
        for (let i = 0; i < 3; i++) p.rect(x + 1 + i * 7, y + 3, 3, 1, wake);
      } else if (kind === 'kaiju') {
        const rise = t < 4 ? t / 4 : t > 16 ? Math.max(0, 1 - (t - 16) / 4) : 1;
        const sh = Math.round(rise * 11);
        const wl = y + 6;
        const g2 = p.ctx; g2.save(); g2.beginPath(); g2.rect(0, 0, g2.canvas.width, wl * p.s); g2.clip();
        const roar = t > 7 && t < 11;
        const spikes = night || roar ? (Math.floor(t * 6) % 2 ? '#6af0ff' : '#b8faff') : '#5a7a5a';
        const skin = PS.css(PS.mix(hex('#2e4a3a'), hex('#4a6a54'), S.P.day));
        scaled(p, KAIJU, x, wl - sh * 3, { k: skin, b: spikes, e: '#ffdb3a', w: roar ? '#ffffff' : skin }, 3, dir < 0);
        g2.restore();
        if (roar) p.text('RAWR!', x + (dir < 0 ? -14 : 44), wl - sh * 3 - 2, '#ffffff');
        for (let i = 0; i < 8; i++) p.rect(x - 4 + i * 7 + Math.sin(t * 2 + i) * 2, wl, 3, 1, wake);
      }
    };
    return ev;
  }

  // ------------------------------------------------------------------------------------------
  // Registry

  const night = (S) => S.P.dark > 0.55;
  const day = (S) => S.P.day > 0.5;
  PS.EVENTS = [
    { id: 'dancer', w: 6, make: (S) => actor(S, 'dancer') },
    { id: 'yoga', w: 4, ok: (S) => !night(S) || S.hour < 22, make: (S) => actor(S, 'yoga') },
    { id: 'waver', w: 3, make: (S) => actor(S, 'waver') },
    { id: 'stargazer', w: 3, ok: night, make: (S) => actor(S, 'stargazer') },
    { id: 'selfie', w: 3, make: (S) => actor(S, 'selfie') },
    { id: 'guitar', w: 4, make: (S) => actor(S, 'guitar') },
    { id: 'couple', w: 4, make: (S) => actor(S, 'couple') },
    { id: 'bbq', w: 3, ok: (S) => S.hour > 11 && S.hour < 23, make: (S) => actor(S, 'bbq') },
    { id: 'cat', w: 5, make: (S) => actor(S, 'cat') },
    { id: 'kite', w: 3, ok: day, make: (S) => actor(S, 'kite') },
    { id: 'pigeons', w: 3, ok: day, make: (S) => actor(S, 'pigeons') },
    { id: 'golfer', w: 3, make: (S) => actor(S, 'golfer') },
    { id: 'party', w: 4, ok: night, make: (S) => actor(S, 'party') },
    { id: 'jumper', w: 4, make: (S) => actor(S, 'jumper') },
    { id: 'ufo', w: 4, make: ufo },
    { id: 'superhero', w: 4, make: superhero },
    { id: 'spider', w: 3, make: spider },
    { id: 'kong', w: 3, make: kong },
    { id: 'plane', w: 7, make: plane },
    { id: 'helicopter', w: 3, make: helicopter },
    { id: 'blimp', w: 3, ok: (S) => !day(S), make: blimp },
    { id: 'bannerPlane', w: 3, ok: day, make: bannerPlane },
    { id: 'birds', w: 5, ok: (S) => S.P.day > 0.2, make: birds },
    { id: 'shootingStar', w: 5, ok: night, make: shootingStar },
    { id: 'fireworks', w: 2, ok: night, make: fireworks },
    { id: 'pizzaSignal', w: 2, ok: night, make: pizzaSignal },
    { id: 'windowArt', w: 3, ok: night, make: windowArt },
    { id: 'witch', w: 1, ok: (S) => night(S) && S.moon.visible && (S.month === 9 || R() < 0.15), make: (S) => moonCrosser(S, 'witch') },
    { id: 'santa', w: 1, ok: (S) => night(S) && S.moon.visible && (S.month === 11 || R() < 0.15), make: (S) => moonCrosser(S, 'santa') },
    { id: 'balloon', w: 2, ok: day, make: balloon },
    { id: 'ferry', w: 5, make: (S) => boat(S, 'ferry') },
    { id: 'tug', w: 4, make: (S) => boat(S, 'tug') },
    { id: 'sail', w: 3, ok: day, make: (S) => boat(S, 'sail') },
    { id: 'yacht', w: 3, ok: (S) => S.P.dark > 0.3, make: (S) => boat(S, 'yacht') },
    { id: 'duck', w: 2, make: (S) => boat(S, 'duck') },
    { id: 'nessie', w: 2, make: (S) => boat(S, 'nessie') },
    { id: 'kaiju', w: 1, make: (S) => boat(S, 'kaiju') },
  ];
})();
