# Pixelscapes

A living pixel-art city skyline that slowly pans, follows the real time of day where you are, and has silly things happening in it.

Starts with **New York**: Empire State (with nightly crown colors), Chrysler, One WTC, Woolworth, Citigroup, 432 Park, Steinway, Central Park Tower, Hudson Yards, the Brooklyn Bridge and the Statue of Liberty, plus hundreds of generated buildings with water towers.

Everything is procedural (no image assets), so it's one static folder you can open straight from disk.

## Time of day

- Sun and moon positions come from real astronomy (moon phase included), using your location.
- Location comes from browser geolocation when allowed (cached). Otherwise it's guessed from your timezone. You can also set it with `?lat=..&lon=..`.
- Sky, light, cloud colors, window lights (people go to bed, offices empty out), stars and water all follow the sun.

## Events

Something new starts every few seconds, with ambient life (planes, birds, gulls, boats, shooting stars) in between.

- **Rooftops:** dancers, yoga, a cat patrol, kite flyers, a pigeon keeper with a flock, a golfer driving balls into the city, a rooftop party, a parkour runner, lovers, a guitarist, a BBQ, a kid losing a balloon, sky lanterns, a window washer on a glass tower, and a pizza drone delivery.
- **Sky:** a UFO abducting a cow, a flying superhero, a web-swinger (the web only attaches to real rooftop corners), a giant ape on the Empire State with biplanes, a jetpack guy, a dragon, hot-air balloons, planes with contrails, a helicopter searchlight, an LED blimp, a banner plane, birds, meteor showers, fireworks, a pizza signal, and pictures spelled out in building windows.
- **Weather:** rainstorms with lightning at night.
- **Water:** the Staten Island ferry, a tug, a sailboat, a party yacht, seagulls, a giant rubber duck, Nessie and a kaiju.
- **Seasonal:** a witch in October and Santa in December.
- **Always on:** a foreground promenade with walkers, joggers, cyclists, dog walkers (and the odd dachshund), people on benches, steam vents, waving flags, flickering neon, TV-lit windows and traffic.

## Use as a wallpaper

- **macOS:** [Plash](https://sindresorhus.com/plash) → add website → `file:///path/to/pixelscapes/index.html`
- **Windows:** [Lively Wallpaper](https://www.rocksdanister.com/lively/) (add `index.html`) or Wallpaper Engine (web wallpaper)
- **Linux:** any HTML wallpaper host (e.g. Komorebi, or a fullscreen browser window on the desktop layer)

## URL options

| param | default | |
|---|---|---|
| `pan` | `3.5` | pan speed (art pixels/sec, `0` = still) |
| `res` | `270` | target art-pixel height (lower = chunkier pixels) |
| `scale` | auto | force the pixel scale |
| `fps` | `30` | frame cap (lower saves battery) |
| `events` | `1` | event frequency multiplier |
| `lat`, `lon` | auto | location |
| `time` | now | start at a fixed time, e.g. `time=19:30` |
| `speed` | `1` | time multiplier (e.g. `600` for a quick day cycle) |
| `label` | `1` | `label=0` hides the city/time caption shown at start |
| `cam` | random | starting pan position |
| `event` | | spawn specific events at start, e.g. `event=ufo,kong` |
| `debug` | | show a debug overlay |

## Keys

`E` random event · `N` cycle through events · `[` / `]` move time back/forward 30 min · `\` back to now · `P` pause the pan · `F` fullscreen · `D` debug · `H` help. Double-click for a surprise.

## Code layout

- `js/util.js`: RNG, color math, dithering, the pixel painter and a 3×5 font
- `js/sky.js`: sun and moon astronomy, time-of-day palettes, window-lighting curves
- `js/city.js`: building toolkit (`Builder`) and the lighting-aware layer renderer
- `js/nyc.js`: New York (skyline envelope, landmarks, bridge, statue, shore)
- `js/events.js`: all random events and their sprites
- `js/promenade.js`: the foreground promenade and its passers-by
- `js/main.js`: engine (layers, parallax, reflections, clouds, stars, scheduler, input)

To add a city, write `PS.cities.<name>` in a file shaped like `nyc.js`, then load it with `?city=<name>`.

`tools/shot.mjs` takes Playwright screenshots for checking visuals: `node tools/shot.mjs out.png "time=19:00&event=ufo" 3000`.
