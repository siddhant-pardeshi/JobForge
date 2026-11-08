// Generates a clean glow background (no text) for deck cover/closing slides.
// Run from tools/video: node make-glow.mjs
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'presentation', 'assets');
fs.mkdirSync(out, { recursive: true });

const html = `<!doctype html><html><head><style>
* { margin: 0; } html, body { width: 2560px; height: 1440px; overflow: hidden; background: #0b0b15; }
.g1 { position: absolute; width: 1600px; height: 1100px; left: -300px; top: -350px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(139,92,246,0.22), transparent 70%); }
.g2 { position: absolute; width: 1500px; height: 1000px; right: -350px; bottom: -300px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,92,26,0.20), transparent 70%); }
.g3 { position: absolute; width: 900px; height: 700px; left: 38%; top: 30%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,46,136,0.10), transparent 70%); }
.grid { position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 90px 90px; }
</style></head><body><div class="g1"></div><div class="g2"></div><div class="g3"></div><div class="grid"></div></body></html>`;

fs.writeFileSync(path.join(out, '_glow.html'), html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
await page.goto('file:///' + path.resolve(out, '_glow.html').replace(/\\/g, '/'));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(out, 'glow-bg.png') });
await browser.close();
fs.rmSync(path.join(out, '_glow.html'));
console.log('glow-bg.png generated');
