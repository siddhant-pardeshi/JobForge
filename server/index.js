import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes, { warmScores } from './routes.js';
import { bootstrap, load, save } from './store.js';
import { fetchAllSources } from './services/refresh.js';
import { gateAllowed, gateHash, isAdminReq } from './services/access.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

bootstrap();

app.use(compression());
app.use(express.json({ limit: '3mb' }));

// ---------- public access gate ----------
// When the cockpit is exposed beyond this machine, every API call passes the
// gate. Private mode requires the access code from tunnel visitors, open
// access mode lets everyone in. The owner on this machine is always exempt,
// and the helper passes through its pairing token.
function gateActive() {
  const settings = load('settings') || {};
  return settings.publicMode === true;
}

app.use((req, res, next) => {
  if (!gateActive()) return next();
  if (req.path === '/api/unlock' || req.path === '/api/access') return next();
  if (!req.path.startsWith('/api')) return next(); // the app shell loads so the lock screen can render
  if (gateAllowed(load('settings') || {}, req)) return next();
  res.status(401).json({ error: 'This cockpit is private. Enter your access code to continue.', locked: true });
});

app.post('/api/unlock', (req, res) => {
  const settings = load('settings') || {};
  if (settings.openAccess) return res.json({ ok: true, message: 'Open access is on, no code needed' });
  const code = String(req.body?.code || '').trim();
  if (!settings.accessCode || code !== settings.accessCode) {
    return res.status(403).json({ error: 'That access code is not correct' });
  }
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('set-cookie', `jf_gate=${gateHash(settings.accessCode)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`);
  res.json({ ok: true, message: 'Unlocked for 30 days on this browser' });
});

// The access switch. Reading is open to anyone past the gate, but the state
// only reveals codes to the owner. Flipping requires the owner: loopback or
// the admin code header.
app.get('/api/access', (req, res) => {
  const settings = load('settings') || {};
  const admin = isAdminReq(settings, req);
  res.json({
    ok: true,
    publicMode: settings.publicMode === true,
    openAccess: settings.openAccess === true,
    accessCode: admin ? settings.accessCode : null,
    adminCode: admin ? settings.adminCode : null,
    youAreAdmin: admin
  });
});

app.put('/api/access', (req, res) => {
  const settings = load('settings') || {};
  if (!isAdminReq(settings, req)) {
    return res.status(403).json({ error: 'Only the owner can change access. On the host machine it just works; from elsewhere paste your admin code.' });
  }
  const { openAccess, publicMode } = req.body || {};
  if (typeof openAccess === 'boolean') settings.openAccess = openAccess;
  if (typeof publicMode === 'boolean') settings.publicMode = publicMode;
  save('settings', settings);
  console.log(`[jobforge] access switched: ${settings.openAccess ? 'open to everyone' : 'private with access code'}`);
  res.json({
    ok: true,
    publicMode: settings.publicMode === true,
    openAccess: settings.openAccess === true,
    accessCode: settings.accessCode,
    adminCode: settings.adminCode,
    youAreAdmin: true,
    message: settings.openAccess ? 'Open access is on. Anyone with the link can now use this cockpit.' : 'Private again. Visitors need the access code.'
  });
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
  const settings = load('settings') || {};
  if (settings.publicMode) {
    if (settings.openAccess) console.log('[jobforge] OPEN ACCESS: everyone with the link can use this cockpit. Flip to private anytime in Settings, Access.');
    else console.log(`[jobforge] PRIVATE: visitors must enter access code ${settings.accessCode}.`);
    console.log(`[jobforge] Admin code for the access switch: ${settings.adminCode}`);
  }
  if (!fs.existsSync(dist)) console.log('[jobforge] Development mode: run "npm run dev" so the Vite client serves the interface on http://localhost:5173');
});
