import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes, { warmScores } from './routes.js';
import { bootstrap, load, save } from './store.js';
import { fetchAllSources } from './services/refresh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

bootstrap();

app.use(express.json({ limit: '3mb' }));
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
  if (!fs.existsSync(dist)) console.log('[jobforge] Development mode: run "npm run dev" so the Vite client serves the interface on http://localhost:5173');
});
