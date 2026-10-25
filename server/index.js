import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes from './routes.js';
import { bootstrap } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

bootstrap();

app.use(express.json({ limit: '3mb' }));
app.use('/api', routes);

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
