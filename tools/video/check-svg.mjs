// SVG independence validator. For every repo-page SVG:
// 1. Strict XML parse (catches malformed markup)
// 2. Every url(#id) and href="#id" must resolve to a defined id in the same file
// 3. No external fetches: no http(s) references except the SVG namespace, no <image>, no @import, no @font-face
// 4. Loads the file in Chromium and collects console errors, page errors and failed requests
// Run: node tools/video/check-svg.mjs

import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const media = path.join(here, '..', '..', 'docs', 'media');
const files = fs.readdirSync(media).filter((f) => f.endsWith('.svg'));
const py = process.platform === 'win32' ? 'py' : 'python3';

let totalErrors = 0;

for (const file of files) {
  const p = path.join(media, file);
  const src = fs.readFileSync(p, 'utf8');
  const errors = [];

  // 1. strict XML wellformedness
  try {
    execFileSync(py, ['-I', '-c', `import xml.etree.ElementTree as ET, sys; ET.parse(sys.argv[1])`, p], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    errors.push('XML parse failed: ' + String(e.stderr || e.message).slice(0, 160));
  }

  // 2. reference integrity
  const ids = new Set([...src.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const refs = [...src.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
  refs.push(...[...src.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]));
  for (const ref of refs) {
    if (!ids.has(ref)) errors.push(`dangling reference #${ref}`);
  }

  // 3. external dependencies
  const external = src.match(/(?:src=|@import|url\()[\"']?https?:\/\/[^)\s]*/g) || [];
  const realExternal = external.filter((e) => !e.includes('www.w3.org'));
  if (realExternal.length) errors.push('external refs: ' + realExternal.join(', '));
  if (/<image[\s>]/.test(src)) errors.push('contains <image> tag');
  if (/@font-face/.test(src)) errors.push('contains @font-face (font fetch blocked by GitHub CSP)');

  console.log(`\n=== ${file} ===`);
  if (errors.length) {
    totalErrors += errors.length;
    errors.forEach((e) => console.log('  ERROR:', e));
  } else {
    console.log('  references OK, fully self contained');
  }

  // 4. browser load: console errors + failed requests
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  const failed = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 140)); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + String(err).slice(0, 140)));
  page.on('requestfailed', (req) => failed.push(req.url().slice(-60)));
  await page.goto('file:///' + p.replace(/\\/g, '/'));
  await page.waitForTimeout(900);
  await browser.close();
  if (consoleErrors.length || failed.length) {
    totalErrors += consoleErrors.length + failed.length;
    consoleErrors.forEach((e) => console.log('  CONSOLE ERROR:', e));
    failed.forEach((f) => console.log('  REQUEST FAILED:', f));
  } else {
    console.log('  browser load: zero console errors, zero failed requests');
  }
}

console.log(`\n${totalErrors === 0 ? 'ALL SVGs CLEAN' : totalErrors + ' ERRORS FOUND'}`);
process.exit(totalErrors ? 1 : 0);
