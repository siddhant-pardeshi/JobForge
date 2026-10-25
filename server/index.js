import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import routes, { warmScores } from './routes.js';
import { bootstrap, load, save } from './store.js';
import { fetchAllSources } from './services/refresh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

bootstrap();

app.use(compression());
app.use(express.json({ limit: '3mb' }));

// ---------- public access gate ----------
// When the cockpit is exposed beyond this machine (JOBFORCE_PUBLIC=1), every
// API call must prove the visitor knows the access code. The owner working on
// this machine is exempt, and the helper passes through its pairing token.
function gateActive() {
  return process.env.JOBFORCE_PUBLIC === '1' || load('settings')?.publicMode === true;
}

function gateHash(code) {
  return crypto.createHmac('sha256', String(code)).update('jobforge-gate-v1').digest('hex');
}

function gateAllowed(req) {
  const settings = load('settings') || {};
  // Any tunnel or proxy header means the request arrived from outside this
  // machine, even though the tunnel client itself connects from loopback.
  const proxied = !!(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['x-forwarded-proto'] || req.headers['x-real-ip']);
  if (proxied) {
    if (req.headers['x-jobforge-token'] && req.headers['x-jobforge-token'] === settings.extensionToken) return true;
    const cookies = String(req.headers.cookie || '');
    return cookies.includes(`jf_gate=${gateHash(settings.accessCode)}`);
  }
  const loopback = /^(::1|::ffff:127\.0\.0\.1|127\.0\.0\.1)$/.test(req.socket.remoteAddress || '');
  if (loopback) return true;
  const cookies = String(req.headers.cookie || '');
  return cookies.includes(`jf_gate=${gateHash(settings.accessCode)}`);
}

app.use((req, res, next) => {
  if (!gateActive()) return next();
  if (req.path === '/api/unlock') return next();
  if (!req.path.startsWith('/api')) return next(); // the app shell loads so the lock screen can render
  if (gateAllowed(req)) return next();
  res.status(401).json({ error: 'This cockpit is private. Enter your access code to continue.', locked: true });
});

app.post('/api/unlock', (req, res) => {
  const settings = load('settings') || {};
  const code = String(req.body?.code || '').trim();
  if (!settings.accessCode || code !== settings.accessCode) {
    return res.status(403).json({ error: 'That access code is not correct' });
  }
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('set-cookie', `jf_gate=${gateHash(settings.accessCode)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`);
  res.json({ ok: true, message: 'Unlocked for 30 days on this browser' });
});

app.use('/api', routes);

// Live refresh scheduler. Polls every enabled board on a fixed cadence so new
// postings appear and vanished postings get marked closed without you asking.
const REFRESH = load('settings')?.refresh || { auto: true, intervalMinutes: 20, runOnStart: true };
let lastRun = 0;
let running = false;

async function scheduledRefresh(force = false) {
  if (running) return;
  const settings = load('settings')?.refresh || REFRESH;
  if (!settings.auto && !force) return;
  const intervalMs = Math.max(5, Number(settings.intervalMinutes) || 20) * 60000;
  if (!force && Date.now() - lastRun < intervalMs) return;
  const companies = load('companies') || [];
  if (companies.length === 0) return;
  running = true;
  try {
    console.log(`[jobforge] refreshing ${companies.length} live sources...`);
    const report = await fetchAllSources();
    lastRun = Date.now();
    const ok = report.filter((r) => r.ok).length;
    warmScores();
    console.log(`[jobforge] refresh done: ${ok}/${report.length} sources healthy`);
  } catch (err) {
    console.error(`[jobforge] refresh failed: ${err.message}`);
  } finally {
    running = false;
  }
}

setInterval(() => scheduledRefresh(), 60000);
if (REFRESH.runOnStart) setTimeout(() => scheduledRefresh(), 4000);

// In production the built frontend is served by the same server.
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// Errors are redacted on purpose. Stack traces and keys never reach the client.
app.use((err, req, res, next) => {
  const safe = ['Only PDF, DOCX, and plain text files are accepted', 'File too large'].includes(err.message) ? err.message : 'Something went wrong on the server. Check the terminal running the backend for details.';
  console.error(`[jobforge] ${new Date().toISOString()} ${req.method} ${req.path} :: ${err.message}`);
  res.status(err.status || 500).json({ error: safe });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`[jobforge] API ready on http://localhost:${PORT}`);
  if (gateActive()) {
    console.log(`[jobforge] Public mode is ON. Visitors must enter access code: ${load('settings')?.accessCode}`);
    console.log('[jobforge] Your own browser on this machine needs no code.');
  }
  if (!fs.existsSync(dist)) console.log('[jobforge] Development mode: run "npm run dev" so the Vite client serves the interface on http://localhost:5173');
});
