'use strict';
// Seasons & holidays for the depicted city: foliage colors, snow likelihood, decorations, landmark lighting.
(function () {
  const PS = window.PS;
  const { hex, mix, clamp } = PS;

  const FOLIAGE = {
    winter: ['#6e5e58', '#7a6a62', '#5e504c'],
    spring: ['#7ab85a', '#9ad06a', '#f2a6c8'],
    summer: ['#3f7a3c', '#4f9444', '#2f6434'],
    autumn: ['#e07a2a', '#f0b432', '#c0402a'],
  };

  function dayOfYear(d) {
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);
  }

  function nthWeekday(year, month, weekday, n) {
    const first = new Date(year, month, 1).getDay();
    return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  }

  // Easter Sunday (anonymous Gregorian algorithm) -> Date
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const LUNAR_NEW_YEAR = { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3], 2031: [0, 23], 2032: [1, 11] };

  // `allowed` (optional): the holidays the depicted city celebrates; others are switched off.
  PS.season = function (date, lat, allowed) {
    const m = date.getMonth(), d = date.getDate(), y = date.getFullYear();
    let doy = dayOfYear(date);
    if (lat < 0) doy = (doy + 182) % 365;
    const tropical = Math.abs(lat) < 23.5;

    // Foliage: blend between seasonal palettes through the year (northern-hemisphere day numbers).
    // bare: 0 = full canopy, 1 = leafless. blossom: amount of pink. falling: leaf drop intensity.
    let name, pal, bare = 0, blossom = 0, falling = 0;
    const blend = (a, b, t) => FOLIAGE[a].map((c, i) => mix(hex(c), hex(FOLIAGE[b][i]), clamp(t, 0, 1)));
    const P0 = (k) => FOLIAGE[k].map(hex);
    if (tropical) { name = 'summer'; pal = P0('summer'); }
    else if (doy < 75 || doy >= 345) { name = 'winter'; pal = P0('winter'); bare = 1; }
    else if (doy < 100) { name = 'spring'; pal = blend('winter', 'spring', (doy - 75) / 25); bare = 1 - (doy - 75) / 25; blossom = (doy - 80) / 20; }
    else if (doy < 130) { name = 'spring'; pal = P0('spring'); blossom = 1 - (doy - 115) / 15; }
    else if (doy < 160) { name = 'spring'; pal = blend('spring', 'summer', (doy - 130) / 30); }
    else if (doy < 265) { name = 'summer'; pal = P0('summer'); }
    else if (doy < 295) { name = 'autumn'; pal = blend('summer', 'autumn', (doy - 265) / 30); falling = (doy - 275) / 20; }
    else if (doy < 320) { name = 'autumn'; pal = P0('autumn'); falling = 1; }
    else { name = 'autumn'; pal = blend('autumn', 'winter', (doy - 320) / 25); bare = (doy - 320) / 25; falling = 1 - bare * 0.6; }
    blossom = clamp(blossom, 0, 1); falling = clamp(falling, 0, 1); bare = clamp(bare, 0, 1);

    const thanksgiving = m === 10 && d === nthWeekday(y, 10, 4, 4);
    const h = {
      xmas: (m === 11) || (m === 0 && d <= 6),
      halloween: m === 9 && d >= 20,
      july4: m === 6 && d === 4,
      nye: (m === 11 && d === 31) || (m === 0 && d === 1),
      valentine: m === 1 && d === 14,
      stpatrick: m === 2 && d === 17,
      thanksgiving: thanksgiving || (m === 10 && d === nthWeekday(y, 10, 4, 4) - 1),
      pride: m === 5,
      // Brazil: Carnaval runs Saturday before Ash Wednesday through Ash Wednesday
      carnaval: (() => { const e = easter(y).getTime(), t = new Date(y, m, d).getTime(), days = Math.round((e - t) / 864e5); return days >= 46 && days <= 50; })(),
      saoJoao: m === 5 && d >= 20 && d <= 30,         // festas juninas peak (João Pessoa / Campina Grande)
      outubroRosa: m === 9,                          // Christ the Redeemer lit pink for breast-cancer awareness
      novembroAzul: m === 10,
      unity: m === 9 && d === 3,                     // German Unity Day
      festivalOfLights: m === 9 && d >= 3 && d <= 13, // Berlin Festival of Lights
      fleetWeek: m === 9 && d >= nthWeekday(y, 9, 0, 2) - 5 && d <= nthWeekday(y, 9, 0, 2), // SF, ends 2nd Sunday of October
      lunarNewYear: !!LUNAR_NEW_YEAR[y] && m === LUNAR_NEW_YEAR[y][0] && Math.abs(d - LUNAR_NEW_YEAR[y][1]) <= 3,
    };
    if (allowed) for (const k in h) if (!allowed.includes(k)) h[k] = false;

    // Landmark lighting (Empire State tiers: [upper, crown, mast])
    let esb = null;
    if (h.nye) esb = ['#ffd24a', '#ffffff', '#ffd24a'];
    else if (h.xmas) esb = ['#ff3a3a', '#3aff6a', '#ff3a3a'];
    else if (h.halloween) esb = ['#ff8a1a', '#a040ff', '#ff8a1a'];
    else if (h.july4) esb = ['#ff4a4a', '#ffffff', '#4a7cff'];
    else if (h.valentine) esb = ['#ff3a6a', '#ff8ab8', '#ff3a6a'];
    else if (h.stpatrick) esb = ['#3aff6a', '#3aff6a', '#ffffff'];
    else if (h.thanksgiving) esb = ['#ff9a3a', '#ffd24a', '#c05a2a'];
    else if (h.pride) esb = ['#ff4a4a', '#ffd24a', '#4ab0ff'];
    else if (h.carnaval) esb = ['#ff4ab0', '#ffd24a', '#4affc0'];
    else if (h.saoJoao) esb = ['#ff7a1a', '#ffd24a', '#ff3a3a'];
    else if (h.unity) esb = ['#303030', '#ff3a3a', '#ffd24a'];
    else if (h.lunarNewYear) esb = ['#ff3a3a', '#ffd24a', '#ff3a3a'];
    else if (h.fleetWeek) esb = ['#4a7cff', '#ffffff', '#ffd24a'];
    else if (h.festivalOfLights) esb = ['#b04aff', '#4ab0ff', '#ff4ab0'];
    else if (h.outubroRosa) esb = ['#ff6ab8', '#ff6ab8', '#ff6ab8'];
    else if (h.novembroAzul) esb = ['#4a8cff', '#4a8cff', '#4a8cff'];

    return { name, foliage: pal, bare, blossom, falling, holidays: h, esb, tropical, doy };
  };
})();
