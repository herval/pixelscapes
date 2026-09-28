// Render Pixelscapes FM offline to a WAV and print level stats per section.
// Usage: node tools/render-music.mjs out.wav [seconds=120] [seed=1] [mood JSON]
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [,, out = 'lofi.wav', secs = '120', seed = '1', moodJson = '{}'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('file://' + root + '/tools/blank.html');
await page.addScriptTag({ path: root + '/js/util.js' });
await page.addScriptTag({ path: root + '/js/music.js' });

const res = await page.evaluate(async ({ secs, seed, mood }) => {
  const sr = 44100, n = Math.floor(sr * secs);
  const ctx = new OfflineAudioContext(2, n, sr);
  const tracks = [];
  const eng = new PS.Lofi(ctx, { seed, getMood: () => mood, onTrack: (t, at) => tracks.push({ title: t.title, at: +at.toFixed(1), bpm: t.bpm, key: t.key, minor: t.minor, lead: t.leadInst, bars: t.bars }) });
  eng.setAmbience(mood);
  eng.scheduleUntil(secs);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  // stats in 5 s windows
  const win = sr * 5, stats = [];
  let peak = 0, nan = 0;
  for (let w = 0; w < n; w += win) {
    let s = 0, p = 0;
    for (let i = w; i < Math.min(n, w + win); i++) {
      const v = L[i];
      if (!Number.isFinite(v)) { nan++; continue; }
      s += v * v; p = Math.max(p, Math.abs(v), Math.abs(R[i]));
    }
    stats.push([+(20 * Math.log10(Math.sqrt(s / win) + 1e-9)).toFixed(1), +(20 * Math.log10(p + 1e-9)).toFixed(1)]);
    peak = Math.max(peak, p);
  }
  // 16-bit PCM WAV
  const bytes = new DataView(new ArrayBuffer(44 + n * 4));
  const wstr = (o, str) => { for (let i = 0; i < str.length; i++) bytes.setUint8(o + i, str.charCodeAt(i)); };
  wstr(0, 'RIFF'); bytes.setUint32(4, 36 + n * 4, true); wstr(8, 'WAVE'); wstr(12, 'fmt ');
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 2, true); bytes.setUint32(24, sr, true);
  bytes.setUint32(28, sr * 4, true); bytes.setUint16(32, 4, true); bytes.setUint16(34, 16, true); wstr(36, 'data'); bytes.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    bytes.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] || 0)) * 32767, true);
    bytes.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] || 0)) * 32767, true);
  }
  const u8 = new Uint8Array(bytes.buffer);
  let bin = '';
  for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { tracks, stats, peak: +(20 * Math.log10(peak)).toFixed(2), nan, wav: btoa(bin) };
}, { secs: +secs, seed: +seed, mood: JSON.parse(moodJson) });

fs.writeFileSync(out, Buffer.from(res.wav, 'base64'));
console.log('tracks', JSON.stringify(res.tracks));
console.log('peak dBFS', res.peak, 'nan', res.nan);
console.log('rms/peak per 5s:', res.stats.map(([r, p]) => `${r}/${p}`).join('  '));
await browser.close();
