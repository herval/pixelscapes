'use strict';
// Live weather from Open-Meteo (free, no key) with smooth transitions and pixel rain/snow/fog/lightning.
(function () {
  const PS = window.PS;
  const { hex, mix, clamp } = PS;
  const R = PS.R;

  const CLEAR = { cloud: 0.1, rain: 0, snow: 0, fog: 0, storm: 0, wind: 0.2, windDir: 1, temp: null, desc: '' };

  const PRESETS = {
    clear: { cloud: 0.05 }, cloudy: { cloud: 0.55 }, overcast: { cloud: 0.95 },
    fog: { cloud: 0.8, fog: 0.85 }, drizzle: { cloud: 0.9, rain: 0.25 }, rain: { cloud: 0.95, rain: 0.65, wind: 0.4 },
    storm: { cloud: 1, rain: 1, storm: 1, wind: 0.8 }, snow: { cloud: 0.95, snow: 0.6, wind: 0.3, snowCover: 1, temp: -2 },
    blizzard: { cloud: 1, snow: 1, wind: 1, fog: 0.4, snowCover: 1, temp: -6 }, windy: { cloud: 0.4, wind: 1 },
  };
  const DESC = { clear: 'CLEAR', cloudy: 'CLOUDY', overcast: 'OVERCAST', fog: 'FOG', drizzle: 'DRIZZLE', rain: 'RAIN', storm: 'THUNDERSTORM', snow: 'SNOW', blizzard: 'BLIZZARD', windy: 'WINDY' };

  // WMO weather interpretation codes -> our effect intensities
  function fromCurrent(c) {
    const code = c.weather_code | 0;
    const w = { cloud: (c.cloud_cover != null ? c.cloud_cover : 30) / 100, rain: 0, snow: 0, fog: 0, storm: 0 };
    let desc = 'CLEAR';
    const set = (k, v, d) => { w[k] = Math.max(w[k], v); desc = d; };
    if (code === 1) desc = 'MOSTLY CLEAR';
    else if (code === 2) desc = 'PARTLY CLOUDY';
    else if (code === 3) desc = 'OVERCAST';
    else if (code === 45 || code === 48) set('fog', 0.8, 'FOG');
    else if (code >= 51 && code <= 57) set('rain', 0.15 + (code - 51) * 0.05, 'DRIZZLE');
    else if (code >= 61 && code <= 67) set('rain', { 61: 0.4, 63: 0.65, 65: 1, 66: 0.5, 67: 0.85 }[code] || 0.5, code >= 65 ? 'HEAVY RAIN' : 'RAIN');
    else if (code >= 71 && code <= 77) set('snow', { 71: 0.35, 73: 0.65, 75: 1, 77: 0.25 }[code] || 0.5, 'SNOW');
    else if (code >= 80 && code <= 82) set('rain', [0.45, 0.75, 1][code - 80], 'SHOWERS');
    else if (code === 85 || code === 86) set('snow', code === 85 ? 0.5 : 0.9, 'SNOW SHOWERS');
    else if (code >= 95) { set('rain', code === 95 ? 0.8 : 1, 'THUNDERSTORM'); w.storm = 1; }
    if (w.rain > 0 && c.precipitation > 0) w.rain = Math.max(w.rain, clamp(c.precipitation / 5, 0.2, 1));
    if (w.rain > 0 || w.snow > 0) w.cloud = Math.max(w.cloud, 0.85);
    if (c.visibility != null && c.visibility < 3000) w.fog = Math.max(w.fog, clamp(1 - c.visibility / 3000, 0, 0.9));
    w.wind = clamp((c.wind_speed_10m || 0) / 45, 0, 1);
    // wind_direction is where it blows FROM; westerly wind pushes things to the right on screen
    w.windDir = c.wind_direction_10m != null ? (-Math.sin((c.wind_direction_10m * Math.PI) / 180) >= 0 ? 1 : -1) : 1;
    w.temp = c.temperature_2m != null ? c.temperature_2m : null;
    w.snowDepth = c.snow_depth || 0;
    w.desc = desc;
    return w;
  }

  PS.Weather = class {
    constructor(opts) {
      this.opts = opts;
      this.cur = Object.assign({}, CLEAR, { snowCover: 0 });
      this.target = Object.assign({}, CLEAR);
      this.live = false;
      this.source = 'none';
      this.drops = []; this.flakes = [];
      this.flash = 0; this.bolt = null; this.nextBolt = 5;
      this.mistT = 0;
      if (opts.preset && PRESETS[opts.preset]) {
        this.target = Object.assign({}, CLEAR, PRESETS[opts.preset], { desc: DESC[opts.preset] });
        this.cur = Object.assign({ snowCover: 0 }, this.target);
        this.cur.snowCover = this.target.snowCover || 0;
        this.live = true; this.source = 'preset';
      }
    }

    // Switch to a preset (transitions smoothly) or back to live data.
    setPreset(name) {
      if (name === 'live' || name === 'city' || name === 'here') { this.source = 'none'; this.live = false; return; }
      this.target = Object.assign({}, CLEAR, PRESETS[name], { desc: DESC[name] });
      this.source = 'preset'; this.live = true;
    }

    // Returns true once live data (or a preset) is in effect.
    get known() { return this.live; }

    async refresh(lat, lon) {
      if (this.source === 'preset' || this.opts.off) return;
      this.source = 'live';
      const key = 'pixelscapes.wx';
      try {
        const cached = JSON.parse(localStorage.getItem(key) || 'null');
        if (cached && Date.now() - cached.at < 15 * 60e3 && Math.abs(cached.lat - lat) < 0.5 && Math.abs(cached.lon - lon) < 0.5) {
          this.apply(cached.current, !this.live);
          return;
        }
      } catch (e) { /* ignore */ }
      const vars = 'temperature_2m,weather_code,cloud_cover,precipitation,snowfall,wind_speed_10m,wind_direction_10m,visibility,snow_depth';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=${vars}&timezone=auto`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (!json.current) throw new Error('no current');
        try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), lat, lon, current: json.current })); } catch (e) { /* ignore */ }
        this.apply(json.current, !this.live);
      } catch (e) {
        console.warn('weather unavailable', e);
      }
    }

    apply(current, instant) {
      this.target = fromCurrent(current);
      this.source = 'live';
      this.live = true;
      if (instant) Object.assign(this.cur, this.target, { snowCover: this.target.snowDepth > 0.004 ? clamp(this.target.snowDepth * 30, 0.4, 1) : 0 });
    }

    // Ease current conditions toward the target over a couple of minutes.
    update(dt) {
      const c = this.cur, g = this.target;
      const k = 1 - Math.exp(-dt / 40);
      for (const f of ['cloud', 'rain', 'snow', 'fog', 'storm', 'wind']) c[f] += ((g[f] || 0) - c[f]) * k;
      c.windDir = g.windDir || 1; c.temp = g.temp; c.desc = g.desc;
      // snow accumulates while snowing, melts slowly when warm
      if (g.snowCover != null) c.snowCover = g.snowCover;
      else if (c.snow > 0.15) c.snowCover = Math.min(1, c.snowCover + dt / 120);
      else if (g.snowDepth > 0.004) c.snowCover += (clamp(g.snowDepth * 30, 0.4, 1) - c.snowCover) * k;
      else if (c.temp == null || c.temp > 2) c.snowCover = Math.max(0, c.snowCover - dt / 1800);
      this.mistT += dt * (0.5 + c.wind * 3) * c.windDir;
    }

    // Grey the sky, hide the sun, dim the light according to cloud and precipitation.
    applyToPalette(P) {
      const c = Object.assign({}, this.cur, { fog: Math.max(this.cur.fog, this.extraFog || 0) });
      const oc = clamp((c.cloud - 0.35) / 0.6, 0, 1);
      const dim = Math.max(oc * 0.85, c.rain * 0.95, c.snow * 0.85, c.fog * 0.95);
      const grey = (col, k) => { const l = col[0] * 0.3 + col[1] * 0.55 + col[2] * 0.15; return PS.scale([l * 0.96, l, l * 1.07], k); };
      for (const key of ['top', 'mid', 'hor']) P[key] = mix(P[key], grey(P[key], 0.92 - 0.1 * c.rain), dim * 0.72);
      const cg = (col, k) => mix(col, grey(col, k), Math.max(dim, c.rain) * 0.8);
      P.cl = cg(P.cl, 0.95 - c.rain * 0.3); P.cb = cg(P.cb, 0.85 - c.rain * 0.3); P.cs = cg(P.cs, 0.75 - c.rain * 0.3);
      P.sun = PS.scale(P.sun, 1 - 0.8 * dim);
      P.amb = PS.scale(P.amb, 1 - 0.12 * dim);
      P.golden *= 1 - dim;
      P.stars *= 1 - clamp(c.cloud * 1.15 - 0.1, 0, 1);
      P.wat = mix(P.wat, grey(P.wat, 0.9), dim * 0.5);
      P.sunHidden = dim > 0.7;
      P.moonHidden = c.cloud > 0.85;
      P.fog = c.fog;
      P.snowCover = c.snowCover;
      P.wet = c.rain;
    }

    // Particles etc. drawn on top of the whole scene (screen space).
    draw(p, S, dt, pass) {
      const c = this.cur, g = p.ctx;
      const VW = S.VW, VH = S.VH;
      const slant = c.wind * c.windDir;
      if (pass === 'fog') { this.drawFog(p, S); return; }
      this.drawPrecip(p, S, dt, slant);
    }

    drawFog(p, S) {
      const c = Object.assign({}, this.cur, { fog: Math.max(this.cur.fog, this.extraFog || 0) });
      const g = p.ctx, VW = S.VW, VH = S.VH;
      // fog: a veil hugging the water and streets, plus drifting wisps
      if (c.fog > 0.02) {
        const fogCol = mix(S.P.hor, [200, 204, 214], 0.5 * S.P.day);
        // an overall veil that swallows the distance, then a denser band on the water
        g.fillStyle = PS.cssA(fogCol, 0.28 * c.fog);
        g.fillRect(0, 0, g.canvas.width, S.horizon * p.s);
        const top = S.horizon - 90;
        for (let y = Math.max(0, top); y < VH; y += 2) {
          const k = 1 - Math.abs(y - (S.horizon - 6)) / 95;
          if (k <= 0) continue;
          g.fillStyle = PS.cssA(fogCol, clamp(k * k * c.fog * 0.7, 0, 0.75));
          g.fillRect(0, y * p.s, g.canvas.width, 2 * p.s);
        }
        for (let i = 0; i < 7; i++) {
          const w = 60 + (i * 37) % 70, y = S.horizon - 50 + ((i * 23) % 60);
          let x = ((i * 131 + this.mistT * (4 + i)) % (VW + w)); if (x < 0) x += VW + w;
          p.rect(Math.round(x - w), y, w, 2, PS.cssA(fogCol, 0.22 * c.fog));
        }
      }
    }

    drawPrecip(p, S, dt, slant) {
      const c = this.cur, g = p.ctx, VW = S.VW, VH = S.VH;
      // rain
      const nRain = Math.round(VW * 0.9 * c.rain);
      while (this.drops.length < nRain) this.drops.push({ x: R.range(-40, VW + 40), y: R.range(-VH, VH), v: R.range(200, 270), l: R() < 0.5 ? 4 : 3 });
      if (this.drops.length > nRain) this.drops.length = nRain;
      if (nRain) {
        g.fillStyle = PS.cssA(mix([185, 200, 235], S.P.hor, 0.2), 0.22 + 0.15 * c.rain);
        for (const d of this.drops) {
          d.y += d.v * dt; d.x += slant * d.v * 0.35 * dt;
          if (d.y > VH) { d.y = R.range(-20, -2); d.x = R.range(-40, VW + 40); }
          const x = Math.round(d.x), y = Math.round(d.y);
          p.rect(x, y, 1, d.l);
          if (Math.abs(slant) > 0.3) p.rect(x + (slant > 0 ? 1 : -1), y + d.l, 1, 2);
        }
        // splashes on the water
        const tick = Math.floor(S.t * 8);
        for (let i = 0; i < nRain / 5; i++) {
          const hx = PS.hash(i, tick), hy = PS.hash(i * 7, tick);
          p.rect(Math.floor(hx * VW), S.horizon + 2 + Math.floor(hy * (VH - S.horizon - 3)), 2, 1);
        }
      }
      // snow: two depths of flakes drifting in the wind
      const nSnow = Math.round(VW * 0.7 * c.snow);
      while (this.flakes.length < nSnow) this.flakes.push({ x: R.range(-20, VW + 20), y: R.range(-VH, VH), v: R.range(9, 26), ph: R() * 6, big: R() < 0.3 });
      if (this.flakes.length > nSnow) this.flakes.length = nSnow;
      if (nSnow) {
        const fc = PS.css(mix([250, 252, 255], S.P.hor, 0.15 + 0.4 * S.P.dark));
        g.fillStyle = fc;
        for (const f of this.flakes) {
          const v = f.big ? f.v * 1.4 : f.v;
          f.y += v * dt; f.x += (Math.sin(S.t * 1.3 + f.ph) * 6 + slant * 30) * dt;
          if (f.y > VH) { f.y = R.range(-10, -1); f.x = R.range(-20, VW + 20); }
          if (f.x < -25) f.x += VW + 45; else if (f.x > VW + 25) f.x -= VW + 45;
          p.rect(Math.round(f.x), Math.round(f.y), f.big ? 2 : 1, f.big ? 2 : 1);
        }
      }
      // lightning
      if (c.storm > 0.3) {
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) {
          this.nextBolt = R.range(5, 18);
          this.flash = 1;
          const bx = R.range(0.1, 0.9) * VW;
          const pts = [[bx, 0]];
          let y = 0, x = bx;
          const end = S.horizon - R.range(40, 100);
          while (y < end) { y += R.range(4, 10); x += R.range(-6, 6); pts.push([x, y]); }
          this.bolt = pts;
        }
      }
      if (this.flash > 0) {
        this.flash = Math.max(0, this.flash - dt * 3);
        const a = this.flash * (0.2 + 0.25 * S.P.dark);
        g.fillStyle = `rgba(225,230,255,${a.toFixed(3)})`;
        g.fillRect(0, 0, g.canvas.width, g.canvas.height);
        if (this.bolt && this.flash > 0.45) for (let i = 1; i < this.bolt.length; i++) p.line(this.bolt[i - 1][0], this.bolt[i - 1][1], this.bolt[i][0], this.bolt[i][1], '#f4f6ff');
      }
    }

    label(useF) {
      const c = this.cur;
      if (!this.live) return '';
      const temp = c.temp == null ? '' : useF ? `${Math.round(c.temp * 9 / 5 + 32)}F ` : `${Math.round(c.temp)}C `;
      return `${temp}${c.desc || ''}`.trim();
    }
  };
})();
