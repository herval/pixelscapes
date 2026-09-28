// Usage: node tools/perf.mjs [--gpu] [--dpr=2] [--size=1920x1080] "query" ...
import { chromium, webkit } from 'playwright';
import path from 'path';
const root = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const gpu = args.includes('--gpu');
const dpr = +(args.find((a) => a.startsWith('--dpr=')) || '--dpr=1').slice(6);
const [w, h] = (args.find((a) => a.startsWith('--size=')) || '--size=1920x1080').slice(7).split('x').map(Number);
const queries = args.filter((a) => !a.startsWith('--'));
const browser = await (args.includes('--webkit') ? webkit : chromium).launch({ args: gpu ? ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [] });
for (const q of queries.length ? queries : ['']) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.goto('file://' + root + '/index.html?nogeo&label=0&fps=240&profile&weather=clear&lat=40.7&lon=-74&' + q);
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => ({ fps: window.pixelscapes.fps, prof: window.pixelscapes.profile() }));
  const total = Object.entries(r.prof).filter(([k]) => k !== 'frames' && k !== 'renderMax').reduce((a, [, v]) => a + v, 0);
  console.log(`\n${q || '(default)'}  ${w}x${h}@${dpr}x  fps=${r.fps}  cpu/frame=${total.toFixed(1)}ms  full-repaint spike=${(r.prof.renderMax || 0).toFixed(0)}ms`);
  console.log(Object.entries(r.prof).filter(([k]) => k !== 'frames' && k !== 'renderMax').sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k.padEnd(11)} ${v.toFixed(2)}ms`).join('\n'));
  await page.close();
}
await browser.close();
