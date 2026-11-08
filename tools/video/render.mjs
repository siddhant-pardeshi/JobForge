// Records each animated scene of tools/video/deck.html with Playwright's
// built in video recorder, holding each scene open for the exact duration of
// its narration wav (plus a small tail so chapter cuts breathe).
// Requires: npm i playwright (in this folder) and the deck at ../deck.html
// Output: tools/video/raw/sceneNN.webm

import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const wavDir = path.join(here, 'wav');
const rawDir = path.join(here, 'raw');
fs.mkdirSync(rawDir, { recursive: true });

const ffprobe = 'C:\\Users\\siddh\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffprobe.exe';
const TAIL_MS = 900; // breathing room after the narration ends

function wavDuration(file) {
  const out = execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
  return parseFloat(out);
}

const scenes = [];
for (let i = 1; i <= 12; i++) {
  const nn = String(i).padStart(2, '0');
  const wav = path.join(wavDir, `scene${nn}.wav`);
  const dur = wavDuration(wav);
  scenes.push({ i, nn, wav, holdMs: Math.round(dur * 1000) + TAIL_MS });
  console.log(`scene${nn}: narration ${dur.toFixed(1)}s, hold ${(dur + TAIL_MS / 1000).toFixed(1)}s`);
}

const deckUrl = 'file:///' + path.join(here, 'deck.html').replace(/\\/g, '/');
const browser = await chromium.launch();

for (const scene of scenes) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: path.join(rawDir, `s${scene.nn}`), size: { width: 1280, height: 720 } }
  });
  const page = await ctx.newPage();
  await page.goto(`${deckUrl}?scene=${scene.i}`);
  await page.waitForTimeout(600); // fonts settle, animations begin
  await page.waitForTimeout(scene.holdMs);
  await ctx.close(); // flushes the video file
  const files = fs.readdirSync(path.join(rawDir, `s${scene.nn}`)).filter((f) => f.endsWith('.webm'));
  if (files[0]) {
    fs.renameSync(path.join(rawDir, `s${scene.nn}`, files[0]), path.join(rawDir, `scene${scene.nn}.webm`));
    fs.rmSync(path.join(rawDir, `s${scene.nn}`), { recursive: true, force: true });
  }
  console.log(`scene${scene.nn}.webm recorded`);
}

await browser.close();
console.log('All scenes recorded to', rawDir);
