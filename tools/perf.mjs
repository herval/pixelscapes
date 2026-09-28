import { chromium } from 'playwright';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const browser = await chromium.launch();
for (const q of process.argv.slice(2)) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + root + '/index.html?nogeo&label=0&fps=60&' + q);
  await page.waitForTimeout(4000);
  const fps = await page.evaluate(() => window.pixelscapes.fps);
  console.log(fps, q);
  await page.close();
}
await browser.close();
