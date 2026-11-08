// Rasterizes the repo showcase SVGs into high res PNGs for the presentation.
// Run from tools/video (has playwright): node rasterize-deck.mjs
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const media = path.join(here, '..', '..', 'docs', 'media');
const out = path.join(here, '..', 'presentation', 'assets');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  { file: 'banner.svg', out: 'cover-banner.png', w: 1280, h: 320 },
  { file: 'feature-resume.svg', out: 'feat-resume.png', w: 1280, h: 320 },
  { file: 'feature-boards.svg', out: 'feat-boards.png', w: 1280, h: 320 },
  { file: 'feature-scoring.svg', out: 'feat-scoring.png', w: 1280, h: 320 },
  { file: 'feature-scam.svg', out: 'feat-scam.png', w: 1280, h: 320 },
  { file: 'feature-packets.svg', out: 'feat-packets.png', w: 1280, h: 320 },
  { file: 'feature-tracker.svg', out: 'feat-tracker.png', w: 1280, h: 320 },
  { file: 'feature-flow.svg', out: 'feat-flow.png', w: 1280, h: 320 }
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 320 }, deviceScaleFactor: 2 });

// flame mark with transparent background
const markHtml = `<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:160px;height:160px;border-radius:46px;background:linear-gradient(115deg,#ff5c1a,#ff2e88 55%,#8b5cf6);display:grid;place-items:center;">
<svg width="96" height="96" viewBox="0 0 32 32"><path d="M16 4 C21 12 26 15 26 21.5 C26 26.5 21.5 29 16 29 C10.5 29 6 26.5 6 21.5 C6 16.5 12 14 13.5 9.5 C14.8 12.6 17.5 13 16 4 Z" fill="#0a0a14"/></svg>
</div></body></html>`;
fs.writeFileSync(path.join(out, '_mark.html'), markHtml);
await page.goto('file:///' + path.join(out, '_mark.html').replace(/\\/g, '/'));
await page.waitForTimeout(600);
await page.locator('div').first().screenshot({ path: path.join(out, 'mark.png'), omitBackground: true });
console.log('mark.png');

for (const j of jobs) {
  await page.setViewportSize({ width: j.w, height: j.h });
  await page.goto('file:///' + path.join(media, j.file).replace(/\\/g, '/'));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(out, j.out), clip: { x: 0, y: 0, width: 1200, height: 300 } });
  console.log(j.out);
}
await browser.close();
console.log('all assets in', out);
