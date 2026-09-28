'use strict';
// Astronomy (sun/moon) + time-of-day palettes.
(function () {
  const PS = window.PS;
  const { hex, mix, clamp, smooth } = PS;
  const RAD = Math.PI / 180;

  // Low-precision solar position (good to ~0.1°), returns altitude and hour angle.
  PS.sunPos = function (date, lat, lon) {
    const d = date.getTime() / 864e5 - 10957.5; // days since J2000
    const g = (357.529 + 0.98560028 * d) * RAD;
    const q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const e = (23.439 - 0.00000036 * d) * RAD;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = 18.697374558 + 24.06570982441908 * d;
    let H = ((gmst * 15 + lon) * RAD - ra) % (2 * Math.PI);
    if (H > Math.PI) H -= 2 * Math.PI;
    if (H < -Math.PI) H += 2 * Math.PI;
    return { alt: altitude(lat, dec, H), H, dec };
  };

  function altitude(lat, dec, H) {
    const la = lat * RAD;
    return Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H)) / RAD;
  }

  // 0 = new, 0.5 = full
  PS.moonPhase = function (date) {
    const synodic = 29.530588853;
    const ref = Date.UTC(2000, 0, 6, 18, 14) / 864e5;
    const p = ((date.getTime() / 864e5 - ref) / synodic) % 1;
    return p < 0 ? p + 1 : p;
  };

  // Approximate moon: trails the sun by phase*360° in hour angle.
  PS.moonPos = function (sun, phase, lat) {
    let H = sun.H - phase * 2 * Math.PI;
    while (H < -Math.PI) H += 2 * Math.PI;
    const dec = sun.dec * Math.cos(phase * 2 * Math.PI);
    return { alt: altitude(lat, dec, H), H };
  };

  // Keyframes by sun altitude.
  const K = [
    { a: -30, top: '#03041a', mid: '#0a0c2e', hor: '#1d1a4a', amb: [0.16, 0.18, 0.34], sun: [0, 0, 0], cl: '#2c3060', cb: '#1b1e46', cs: '#121436', wat: '#04061a', glow: '#000000' },
    { a: -13, top: '#060925', mid: '#10164a', hor: '#2c2862', amb: [0.18, 0.2, 0.38], sun: [0, 0, 0], cl: '#353a70', cb: '#22275a', cs: '#171a45', wat: '#060a24', glow: '#000000' },
    { a: -7, top: '#0f1a4e', mid: '#2e3680', hor: '#76579a', amb: [0.27, 0.27, 0.48], sun: [0.05, 0.02, 0.04], cl: '#8a6fb0', cb: '#554d8c', cs: '#353668', wat: '#0c1440', glow: '#b0609a' },
    { a: -2.5, top: '#1b2c6c', mid: '#61509a', hor: '#f0808a', amb: [0.38, 0.32, 0.5], sun: [0.35, 0.14, 0.12], cl: '#ffa58a', cb: '#b0628e', cs: '#5c4282', wat: '#1a2152', glow: '#ff7070' },
    { a: 0.5, top: '#28418a', mid: '#a0628e', hor: '#ffa060', amb: [0.46, 0.38, 0.5], sun: [0.95, 0.5, 0.28], cl: '#ffc080', cb: '#d4788a', cs: '#744d88', wat: '#2a2d62', glow: '#ff9450' },
    { a: 4, top: '#3a64ad', mid: '#d08c88', hor: '#ffc67e', amb: [0.56, 0.5, 0.58], sun: [1.0, 0.72, 0.45], cl: '#ffe2b0', cb: '#f0ae94', cs: '#9a7aa0', wat: '#34487a', glow: '#ffc070' },
    { a: 10, top: '#4682cc', mid: '#8fb6de', hor: '#f0dcb8', amb: [0.66, 0.66, 0.74], sun: [0.95, 0.86, 0.7], cl: '#ffffff', cb: '#eef0f4', cs: '#b8c2d8', wat: '#35628e', glow: '#ffe8b0' },
    { a: 25, top: '#3a7ed6', mid: '#78b2e8', hor: '#cbe5f5', amb: [0.72, 0.76, 0.84], sun: [0.75, 0.72, 0.64], cl: '#ffffff', cb: '#eaf2fa', cs: '#b4c8e0', wat: '#2f6594', glow: '#fff4d8' },
    { a: 90, top: '#3072d0', mid: '#6aaaea', hor: '#c2e1f6', amb: [0.74, 0.78, 0.86], sun: [0.75, 0.72, 0.64], cl: '#ffffff', cb: '#eaf2fa', cs: '#b4c8e0', wat: '#2d6394', glow: '#fff8e8' },
  ];
  const HEXKEYS = ['top', 'mid', 'hor', 'cl', 'cb', 'cs', 'wat', 'glow'];

  PS.palette = function (alt, rising) {
    let i = 0;
    while (i < K.length - 2 && alt > K[i + 1].a) i++;
    const A = K[i], B = K[i + 1];
    const t = clamp((alt - A.a) / (B.a - A.a), 0, 1);
    const p = {};
    for (const k of HEXKEYS) p[k] = mix(hex(A[k]), hex(B[k]), t);
    p.amb = mix(A.amb, B.amb, t);
    p.sun = mix(A.sun, B.sun, t);
    // Sunrise leans pink/lavender, sunset leans orange.
    const golden = 1 - smooth(0, 14, Math.abs(alt - 1));
    if (rising) {
      p.hor = mix(p.hor, hex('#f4a0b0'), 0.35 * golden);
      p.mid = mix(p.mid, hex('#b28ac0'), 0.25 * golden);
    }
    p.alt = alt;
    p.dark = 1 - smooth(-5, 7, alt);        // how visible lit windows are
    p.stars = 1 - smooth(-12, -3, alt);     // star visibility
    p.day = smooth(-4, 10, alt);
    p.golden = golden;
    p.sunDisc = mix(hex('#ff6a3a'), hex('#fff6d8'), smooth(-1, 20, alt));
    return p;
  };

  // Fraction of residential/office windows lit at a local hour (0..24).
  const RES = [[0, 0.3], [2, 0.16], [4, 0.09], [5.5, 0.12], [7, 0.32], [9, 0.18], [12, 0.15], [16, 0.2], [18, 0.46], [20, 0.56], [22, 0.46], [24, 0.3]];
  const OFF = [[0, 0.1], [5, 0.08], [7, 0.4], [9, 0.8], [17, 0.8], [19, 0.5], [21, 0.25], [24, 0.1]];
  function curve(pts, h) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (h <= pts[i + 1][0]) { const t = (h - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; }
    }
    return pts[pts.length - 1][1];
  }
  PS.litFraction = (h) => curve(RES, h);
  PS.officeFraction = (h) => curve(OFF, h);

  // Guess a location from the timezone when geolocation isn't available.
  PS.guessLocation = function () {
    const y = new Date().getFullYear();
    const std = Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
    const lonFromOffset = -std / 4;
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    // [zone prefix, lat, lon]: named zones pin both coordinates (the zone's reference city);
    // continent fallbacks only give a latitude, longitude then comes from the UTC offset.
    const table = [
      ['America/Sao_Paulo', -23.55, -46.63], ['America/Fortaleza', -3.73, -38.52], ['America/Recife', -8.05, -34.9], ['America/Bahia', -12.97, -38.5],
      ['America/Belem', -1.46, -48.5], ['America/Manaus', -3.12, -60.02], ['America/Maceio', -9.67, -35.74], ['America/Araguaina', -7.19, -48.2],
      ['America/Argentina', -34.6, -58.38], ['America/Santiago', -33.45, -70.67], ['America/Lima', -12.05, -77.04], ['America/Bogota', 4.71, -74.07],
      ['America/Mexico_City', 19.43, -99.13], ['America/Los_Angeles', 34.05, -118.24], ['America/Vancouver', 49.28, -123.12], ['America/Chicago', 41.88, -87.63],
      ['America/Denver', 39.74, -104.99], ['America/New_York', 40.71, -74.01], ['America/Toronto', 43.65, -79.38],
      ['Europe/London', 51.51, -0.13], ['Europe/Berlin', 52.52, 13.4], ['Europe/Paris', 48.86, 2.35], ['Europe/Madrid', 40.42, -3.7], ['Europe/Lisbon', 38.72, -9.14],
      ['Europe/Rome', 41.9, 12.5], ['Europe/Amsterdam', 52.37, 4.9], ['Asia/Tokyo', 35.68, 139.69], ['Asia/Shanghai', 31.23, 121.47], ['Asia/Kolkata', 22.57, 88.36],
      ['Asia/Singapore', 1.35, 103.82], ['Asia/Dubai', 25.2, 55.27], ['Australia/Sydney', -33.87, 151.21], ['Pacific/Auckland', -36.85, 174.76],
      ['America/', 38], ['Europe/', 48.5], ['Asia/', 30], ['Australia/', -33.8], ['Africa/', 5],
    ];
    let lat = 40, lon = lonFromOffset;
    for (const [k, la, lo] of table) if (tz.startsWith(k)) { lat = la; if (lo != null) lon = lo; break; }
    return { lat, lon, guessed: true };
  };
})();
