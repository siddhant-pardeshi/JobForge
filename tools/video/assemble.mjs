// Assembles the final video tour: muxes each recorded scene with its
// narration, concatenates in order, adds a fade in/out, and writes
// docs/media/jobforge-video-tour.mp4
// Requires ffmpeg/ffprobe (winget Gyan.FFmpeg build) and the raw webms.

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = path.join(here, 'raw');
const wav = path.join(here, 'wav');
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });

const FF = 'C:\\Users\\siddh\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe';
const run = (args) => { execFileSync(FF, args, { stdio: ['ignore', 'pipe', 'pipe'] }); };

const parts = [];
for (let i = 1; i <= 12; i++) {
  const nn = String(i).padStart(2, '0');
  const mp4 = path.join(out, `scene${nn}.mp4`);
  console.log(`mux scene${nn}`);
  run(['-y', '-i', path.join(raw, `scene${nn}.webm`), '-i', path.join(wav, `scene${nn}.wav`),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', mp4]);
  parts.push(mp4);
}

const listFile = path.join(out, 'list.txt');
fs.writeFileSync(listFile, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));

const concatV = path.join(out, 'concat.mp4');
console.log('concatenating');
run(['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatV]);

const final = path.join(here, '..', '..', 'docs', 'media', 'jobforge-video-tour.mp4');
console.log('master with fades');
run(['-y', '-i', concatV,
  '-vf', 'fade=t=in:st=0:d=0.8,fade=t=out:st=283:d=1.2',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', final]);

const size = (fs.statSync(final).size / 1024 / 1024).toFixed(1);
console.log(`Final: ${final} (${size} MB)`);
