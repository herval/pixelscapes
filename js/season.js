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

  PS.season = function (date, lat) {
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
    };

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

    return { name, foliage: pal, bare, blossom, falling, holidays: h, esb, tropical, doy };
  };
})();
