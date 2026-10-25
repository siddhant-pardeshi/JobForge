import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { load, save, id, bootstrap, resumeDir, DATA_DIR, DEFAULT_SETTINGS, DEFAULT_ANSWERS, FILL_FIELDS } from './store.js';
import { extractText, draftProfile } from './services/parser.js';
import { scoreJob, mergeDuplicates, parseExperience, classify } from './services/scoring.js';
import { analyzeScam, analyzeEmail } from './services/scam.js';
import { fetchFromProvider, verifyBoard, ATS_PROVIDERS } from './services/ats.js';
import { PRESETS, llmStatus, testProvider } from './services/llm.js';
import { buildPacket, booleanStrings } from './services/tailoring.js';
import { evaluateOffer, DEFAULT_BUDGETS, BUDGET_CATEGORIES } from './services/relocation.js';
import { fetchAllSources, runSource } from './services/refresh.js';
import { SEED_COMPANIES, SEED_META, parseCareersUrl } from './seedRegistry.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(pdf|docx|txt|md)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, and plain text files are accepted'));
  }
});

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function getSettings() { return load('settings') || { ...DEFAULT_SETTINGS }; }
function getProfile() { return load('profile'); }

function maskSettings(settings) {
  const clone = JSON.parse(JSON.stringify(settings));
  const providers = clone.llm?.providers || {};
  for (const key of Object.keys(providers)) {
    const keyStr = providers[key]?.apiKey || '';
    providers[key].apiKeyMask = keyStr ? `•••• ${keyStr.slice(-4)}` : '';
    providers[key].apiKey = '';
  }
  return clone;
}

// ---- scoring cache: scores are pure over (job state, profile state, weights)
const scoreCache = new Map();
function profileSignature(profile) {
  if (!profile) return 'noprofile';
  return [profile.extractedAt, JSON.stringify(profile.weights), (profile.skills || []).length, (profile.resumeText || '').length, JSON.stringify(profile.roleFamilies)].join('~');
}

function assembleJobs() {
  const real = load('jobs') || [];
  return mergeDuplicates(real.map((j) => prepareJob({ ...j })));
}

function prepareJob(job) {
  if (job.scamScore === undefined || job.scamScore === null) job.scamScore = 0;
  if (job.source?.type === 'extension' || job.source?.type === 'imported') {
    if (!job.scannedAt) {
      const result = analyzeScam(job.description, { claimedCompany: job.company?.name });
      job.scamScore = result.score;
      job.scamFlags = result.flags;
      job.scannedAt = new Date().toISOString();
    }
  }
  if (!job.experienceRange?.text) {
    job.experienceRange = parseExperience(`${job.title} ${job.description}`);
  }
  if (!job.classification) job.classification = classify(job);
  return job;
}

function scoreAll(profile) {
  const sig = profileSignature(profile);
  const jobs = assembleJobs();
  return jobs
    .map((job) => {
      const key = `${job.id}:${job.lastSeen}:${job.status}:${sig}`;
      let match = scoreCache.get(key);
      if (!match) {
        match = profile ? scoreJob(job, profile, profile.weights) : null;
        if (match) scoreCache.set(key, match);
        if (scoreCache.size > 12000) scoreCache.clear();
      }
      return { ...job, match };
    })
    .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
}

// Warm the cache after refreshes so the next UI load is instant.
function warmScores() {
  try { scoreAll(getProfile()); } catch { /* warming is best effort */ }
}

// ---- bootstrap ----
router.get('/bootstrap', ah(async (req, res) => {
  const settings = getSettings();
  const companies = load('companies') || [];
  res.json({
    profile: getProfile(),
    settings: maskSettings(settings),
    answers: load('answers') || DEFAULT_ANSWERS,
    llm: llmStatus(settings),
    presets: PRESETS,
    atsProviders: ATS_PROVIDERS,
    storageDir: DATA_DIR,
    refresh: settings.refresh || DEFAULT_SETTINGS.refresh,
    extensionToken: settings.extensionToken || '',
    seedMeta: SEED_META,
    sourceCount: companies.length
  });
}));

// ---- resume ----
router.post('/resume', upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  const parsed = await extractText(req.file.buffer, req.file.originalname);
  const draft = draftProfile(parsed.text, req.file.originalname);
  const outPath = path.join(resumeDir(), `resume-${Date.now()}${path.extname(req.file.originalname).toLowerCase()}`);
  fs.writeFileSync(outPath, req.file.buffer);
  res.json({ draft, warning: parsed.warning, scanned: parsed.scanned, storedAs: path.basename(outPath) });
}));

router.post('/resume/text', ah(async (req, res) => {
  const text = String(req.body?.text || '');
  if (text.trim().length < 100) return res.status(400).json({ error: 'Paste at least a few real lines so extraction has something to work with' });
  const draft = draftProfile(text, null);
  res.json({ draft, warning: null, scanned: false, storedAs: null });
}));

// ---- profile ----
router.put('/profile', ah(async (req, res) => {
  const existing = getProfile();
  const incoming = { ...req.body };
  if (existing && !incoming.resumeText) incoming.resumeText = existing.resumeText;
  if (existing && !incoming.sourceFile) incoming.sourceFile = existing.sourceFile;
  if (!incoming.weights) incoming.weights = existing?.weights || undefined;
  incoming.onboarded = true;
  save('profile', incoming);
  res.json({ ok: true, profile: incoming });
}));

// ---- jobs ----
router.get('/jobs', ah(async (req, res) => {
  const profile = getProfile();
  const jobs = scoreAll(profile);
  const lanes = { best_pune: 0, remote: 0, relocation: 0, stretch: 0, needs_verification: 0, excluded: 0, closed: 0 };
  for (const j of jobs) {
    if (!j.match) continue;
    if (j.status === 'closed') lanes.closed++;
    else if (lanes[j.match.lane] !== undefined) lanes[j.match.lane]++;
  }
  res.json({ jobs, lanes, total: jobs.length, scoredAt: new Date().toISOString() });
}));

router.get('/jobs/:id', ah(async (req, res) => {
  const profile = getProfile();
  const job = scoreAll(profile).find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'That job is not in your pipeline anymore' });
  res.json({ job, booleanStrings: booleanStrings(profile || {}) });
}));

router.post('/jobs/import', ah(async (req, res) => {
  const text = String(req.body?.text || '');
  const url = req.body?.url || null;
  if (text.trim().length < 80) return res.status(400).json({ error: 'Paste the full posting text, at least a few sentences' });
  const profile = getProfile();
  const title = String(req.body?.title || '').trim() || text.split('\n')[0].slice(0, 90);
  const company = { name: String(req.body?.company || '').trim() || 'Unknown employer', verified: false };
  const job = {
    id: id('imp'),
    externalId: null,
    title,
    company,
    city: String(req.body?.city || '').trim() || null,
    workMode: /remote|work from home/i.test(text) ? 'Remote' : null,
    employmentType: 'Full time',
    description: text,
    requiredSkills: [],
    preferredSkills: [],
    experienceRange: parseExperience(text),
    salary: { known: false, minLPA: null, maxLPA: null },
    postedAt: null,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    deadline: null,
    sourceUrls: url ? [url] : [],
    applyUrl: url,
    source: { type: 'imported', id: 'manual' },
    status: 'open',
    bond: { status: /bond|service agreement|deposit/i.test(text) ? 'candidate_reported' : 'no_evidence', evidence: [] },
    scamScore: 0,
    scamFlags: []
  };
  const scan = analyzeScam(text, { claimedCompany: company.name });
  job.scamScore = scan.score;
  job.scamFlags = scan.flags;
  job.scannedAt = job.firstSeen;
  const jobs = load('jobs') || [];
  jobs.push(job);
  save('jobs', jobs);
  const match = profile ? scoreJob(prepareJob(job), profile, profile.weights) : null;
  res.json({ ok: true, id: job.id, match, scan });
}));

// Refresh every enabled board now.
router.post('/jobs/fetch', ah(async (req, res) => {
  const report = await fetchAllSources();
  const added = report.reduce((a, r) => a + (r.added || 0), 0);
  const closed = report.reduce((a, r) => a + (r.closed || 0), 0);
  if (report.length === 0) {
    report.push({ company: 'No live sources yet', at: new Date().toISOString(), ok: false, found: 0, added: 0, message: 'The verified registry seeds itself on first launch. Give it a moment, or add a Greenhouse, Lever, or Ashby board on the Sources page' });
  }
  warmScores();
  res.json({ ok: true, report, added, closed });
}));

// Refresh one source now.
router.post('/jobs/fetch/:companyId', ah(async (req, res) => {
  const company = (load('companies') || []).find((c) => c.id === req.params.companyId);
  if (!company) return res.status(404).json({ error: 'Source not found' });
  if (!['greenhouse', 'lever', 'ashby'].includes(company.atsProvider)) return res.status(400).json({ error: 'This source has no listing adapter' });
  const run = await runSource(company);
  res.json({ ok: run.ok, run });
}));

router.post('/jobs/:id/action', ah(async (req, res) => {
  const { action, note } = req.body || {};
  const jobs = load('jobs') || [];
  const job = jobs.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Only imported and captured jobs accept stored actions' });
  job.userAction = action;
  job.userNote = note || null;
  job.actionAt = new Date().toISOString();
  save('jobs', jobs);
  res.json({ ok: true });
}));

router.post('/jobs/:id/packet', ah(async (req, res) => {
  const profile = getProfile();
  if (!profile) return res.status(400).json({ error: 'Upload and confirm a resume first' });
  const job = assembleJobs().find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const match = scoreJob(job, profile, profile.weights);
  const packet = await buildPacket({ job, profile, settings: getSettings(), match });
  const packets = load('packets') || [];
  const stored = { id: id('pkt'), jobId: job.id, createdAt: packet.generatedAt, packet };
  packets.push(stored);
  save('packets', packets.slice(-100));

  // Auto organize: preparing documents is a fact once a packet is forged, so
  // the tracker reflects it without a manual drag. Creating the application
  // here also means a role never gets lost between Jobs and Tracker.
  const apps = load('applications') || [];
  let app = apps.find((a) => a.jobId === job.id && !['skipped', 'rejected', 'withdrawn'].includes(a.state));
  let autoOrganized = null;
  if (!app) {
    const now = new Date().toISOString();
    app = {
      id: id('app'),
      jobId: job.id,
      jobSnapshot: { title: job.title, company: job.company?.name, city: job.city, applyUrl: job.applyUrl },
      state: 'preparing',
      mode: 'manual',
      receipt: null,
      events: [],
      history: [
        { state: 'discovered', at: now },
        { state: 'shortlisted', at: now, note: 'Auto organized: a packet was forged for this role' },
        { state: 'preparing', at: now, note: 'Auto organized: packet ready' }
      ],
      createdAt: now,
      updatedAt: now
    };
    apps.push(app);
    autoOrganized = 'created';
  } else {
    const path = findTransitionPath(TRANSITIONS, app.state, 'preparing');
    if (path) {
      for (const step of path) {
        app.state = step;
        app.history.push({ state: step, at: new Date().toISOString(), note: 'Auto organized: packet forged' });
      }
      autoOrganized = 'preparing';
    }
  }
  app.updatedAt = new Date().toISOString();
  save('applications', apps);

  res.json({ ok: true, packetId: stored.id, packet, autoOrganized, applicationId: app.id });
}));

// ---- companies and sources ----
router.get('/companies', ah(async (req, res) => {
  const companies = load('companies') || [];
  const runs = load('sourceRuns') || [];
  const jobs = load('jobs') || [];
  res.json({
    companies: companies.map((c) => {
      const lastRun = [...runs].reverse().find((r) => r.companyId === c.id);
      const sourceJobs = jobs.filter((j) => j.source?.id === c.handle);
      return {
        ...c,
        lastRun: lastRun || null,
        openJobs: sourceJobs.filter((j) => j.status !== 'closed').length,
        closedJobs: sourceJobs.filter((j) => j.status === 'closed').length
      };
    }),
    providers: ATS_PROVIDERS,
    seedMeta: SEED_META
  });
}));

router.post('/companies', ah(async (req, res) => {
  const body = req.body || {};
  let atsProvider = body.atsProvider;
  let handle = body.handle;

  // Paste a careers URL and the provider plus handle are derived automatically.
  if (!atsProvider && body.url) {
    const parsed = parseCareersUrl(body.url);
    if (parsed.unsupported) return res.status(400).json({ error: parsed.unsupported, hint: parsed.handle ? `Provider detected as ${parsed.atsProvider}` : null });
    atsProvider = parsed.atsProvider;
    handle = parsed.handle;
  }
  if (!body.name || !atsProvider || !handle) return res.status(400).json({ error: 'Company name plus a careers URL, or provider and board identifier, are required' });
  if (!ATS_PROVIDERS[atsProvider] || atsProvider === 'manual') return res.status(400).json({ error: 'Pick greenhouse, lever, or ashby as the provider' });

  const companies = load('companies') || [];
  if (companies.some((c) => c.handle === handle && c.atsProvider === atsProvider)) {
    return res.status(409).json({ error: 'That board is already in your sources' });
  }
  const verification = await verifyBoard(atsProvider, handle);
  const company = {
    id: id('co'),
    name: String(body.name).trim(),
    atsProvider,
    handle: String(handle).trim(),
    verified: verification.ok,
    lastStatus: verification.message,
    addedAt: new Date().toISOString(),
    lastRefresh: verification.ok ? new Date().toISOString() : null
  };
  companies.push(company);
  save('companies', companies);
  res.json({ ok: true, company, verification });
}));

router.post('/companies/:id/refresh', ah(async (req, res) => {
  const companies = load('companies') || [];
  const company = companies.find((c) => c.id === req.params.id);
  if (!company) return res.status(404).json({ error: 'Source not found' });
  if (!['greenhouse', 'lever', 'ashby'].includes(company.atsProvider)) return res.status(400).json({ error: 'This source has no listing adapter' });
  const verification = await verifyBoard(company.atsProvider, company.handle);
  company.verified = verification.ok;
  company.lastStatus = verification.message;
  if (verification.ok) company.lastRefresh = new Date().toISOString();
  save('companies', companies);
  res.json({ ok: true, company, verification });
}));

router.delete('/companies/:id', ah(async (req, res) => {
  const companies = (load('companies') || []).filter((c) => c.id !== req.params.id);
  save('companies', companies);
  res.json({ ok: true });
}));

router.get('/sources/health', ah(async (req, res) => {
  const runs = load('sourceRuns') || [];
  const recent = runs.slice(-60);
  res.json({
    runs: recent,
    summary: { total: recent.length, ok: recent.filter((r) => r.ok).length, failing: recent.filter((r) => !r.ok).length }
  });
}));

// ---- scam ----
router.post('/scam/analyze', ah(async (req, res) => {
  const text = String(req.body?.text || '');
  if (text.trim().length < 20) return res.status(400).json({ error: 'Paste the actual message text so the screen has something to inspect' });
  const result = analyzeScam(text, { claimedCompany: req.body?.claimedCompany });
  const log = load('scamlog') || [];
  log.push({ id: id('scm'), text: text.slice(0, 4000), result, at: result.checkedAt });
  save('scamlog', log.slice(-100));
  res.json({ ok: true, result });
}));

router.get('/scam/log', ah(async (req, res) => {
  res.json({ log: (load('scamlog') || []).slice(-50).reverse() });
}));

// Full email screening, fed by the helper on an open email or by pasted
// envelope facts. One email per check, always user initiated.
router.post('/mail/analyze', ah(async (req, res) => {
  const input = req.body || {};
  const text = `${input.subject || ''}\n${input.body || ''}`;
  if (String(text).trim().length < 20 && !input.from) return res.status(400).json({ error: 'Open the email in the helper, or paste at least the subject and body' });
  const result = analyzeEmail(input);
  const log = load('scamlog') || [];
  log.push({ id: id('scm'), kind: 'email', text: String(input.subject || input.body || '').slice(0, 4000), from: input.from || null, result, at: result.checkedAt });
  save('scamlog', log.slice(-100));
  res.json({ ok: true, result });
}));

// Upcoming rounds across every tracked application, for the Today radar and
// the browser reminders.
router.get('/agenda', ah(async (req, res) => {
  const apps = load('applications') || [];
  const now = Date.now();
  const horizon = now + 14 * 86400000;
  const items = [];
  for (const app of apps) {
    for (const ev of app.events || []) {
      const at = new Date(ev.at).getTime();
      if (!at) continue;
      if (at <= horizon) {
        items.push({
          appId: app.id,
          jobTitle: app.jobSnapshot?.title || 'Role',
          company: app.jobSnapshot?.company || '',
          state: app.state,
          eventId: ev.id,
          label: ev.label,
          at: ev.at,
          mode: ev.mode || null,
          note: ev.note || null,
          overdue: at < now
        });
      }
    }
  }
  items.sort((a, b) => new Date(a.at) - new Date(b.at));
  res.json({ ok: true, items });
}));

// Interview rounds and reminders attached to a tracked application.
router.post('/applications/:id/events', ah(async (req, res) => {
  const { label, at, mode, note } = req.body || {};
  if (!label || !at) return res.status(400).json({ error: 'A round label and a date and time are both required' });
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: 'That date and time could not be read' });
  const apps = load('applications') || [];
  const app = apps.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  app.events = app.events || [];
  const event = { id: id('ev'), label: String(label).slice(0, 80), at: when.toISOString(), mode: String(mode || '').slice(0, 40) || null, note: String(note || '').slice(0, 300) || null };
  app.events.push(event);
  app.updatedAt = new Date().toISOString();

  // Auto organize: scheduling an interview round is a fact, so the board
  // reflects it without a manual drag.
  let autoMoved = null;
  if (/interview|round|discussion|screening/i.test(event.label)) {
    const path = findTransitionPath(TRANSITIONS, app.state, 'interview');
    if (path) {
      for (const step of path) {
        app.state = step;
        app.history.push({ state: step, at: new Date().toISOString(), note: 'Auto organized: this round was scheduled' });
      }
      autoMoved = 'interview';
    }
  }
  save('applications', apps);
  res.json({ ok: true, application: app, autoMoved });
}));

router.delete('/applications/:id/events/:eventId', ah(async (req, res) => {
  const apps = load('applications') || [];
  const app = apps.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  app.events = (app.events || []).filter((e) => e.id !== req.params.eventId);
  save('applications', apps);
  res.json({ ok: true, application: app });
}));

// ---- relocation ----
router.get('/relocation', ah(async (req, res) => {
  const settings = getSettings();
  res.json({
    budgets: settings.relocation?.budgets || DEFAULT_BUDGETS,
    categories: BUDGET_CATEGORIES,
    policy: settings.relocation?.policy || {},
    netRate: settings.relocation?.netRate || 0.8,
    targetMonthlySavings: settings.relocation?.targetMonthlySavings ?? null
  });
}));

router.put('/relocation', ah(async (req, res) => {
  const settings = getSettings();
  settings.relocation = { ...settings.relocation, ...req.body };
  save('settings', settings);
  res.json({ ok: true });
}));

router.post('/relocation/evaluate', ah(async (req, res) => {
  const settings = getSettings();
  const result = evaluateOffer({ ...req.body, budgets: settings.relocation?.budgets || DEFAULT_BUDGETS, policy: settings.relocation?.policy || {}, targetMonthlySavings: settings.relocation?.targetMonthlySavings, netRate: settings.relocation?.netRate });
  res.json({ ok: true, result });
}));

// ---- tracker ----
const TRANSITIONS = {
  discovered: ['shortlisted', 'skipped'],
  shortlisted: ['preparing', 'skipped'],
  preparing: ['ready_for_review', 'needs_input', 'skipped'],
  needs_input: ['preparing', 'ready_for_review'],
  ready_for_review: ['authorized', 'needs_input', 'skipped'],
  authorized: ['submitting', 'ready_for_review'],
  submitting: ['submitted', 'confirmation_pending', 'failed'],
  confirmation_pending: ['submitted', 'failed'],
  failed: ['preparing', 'ready_for_review'],
  submitted: ['assessment', 'interview', 'rejected', 'withdrawn'],
  assessment: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['accepted', 'rejected', 'withdrawn'],
  accepted: [],
  rejected: [],
  withdrawn: [],
  skipped: ['discovered']
};

// Breadth first path through the legal transitions, used by the auto
// organize rules. Returns the intermediate states to walk through, excluding
// the current state, or null when no legal path exists.
function findTransitionPath(table, from, to) {
  if (from === to) return [];
  const queue = [[from, []]];
  const seen = new Set([from]);
  while (queue.length) {
    const [current, path] = queue.shift();
    for (const next of table[current] || []) {
      if (next === to) return [...path, next];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, [...path, next]]);
      }
    }
  }
  return null;
}

router.get('/applications', ah(async (req, res) => {
  res.json({ applications: load('applications') || [], transitions: TRANSITIONS });
}));

router.post('/applications', ah(async (req, res) => {
  const jobId = req.body?.jobId;
  const job = assembleJobs().find((j) => j.id === jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const apps = load('applications') || [];
  if (apps.some((a) => a.jobId === jobId && !['skipped', 'rejected', 'withdrawn'].includes(a.state))) {
    return res.status(409).json({ error: 'This role already has an active application in the tracker' });
  }
  const now = new Date().toISOString();
  const app = {
    id: id('app'),
    jobId,
    jobSnapshot: { title: job.title, company: job.company?.name, city: job.city, applyUrl: job.applyUrl },
    state: 'discovered',
    mode: 'manual',
    receipt: null,
    events: [],
    history: [{ state: 'discovered', at: now }],
    createdAt: now,
    updatedAt: now
  };
  apps.push(app);
  save('applications', apps);
  res.json({ ok: true, application: app });
}));

router.patch('/applications/:id', ah(async (req, res) => {
  const { state, note } = req.body || {};
  const apps = load('applications') || [];
  const app = apps.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  const allowed = TRANSITIONS[app.state] || [];
  if (!allowed.includes(state)) return res.status(400).json({ error: `Moving from ${app.state} to ${state} is not a valid transition. Allowed: ${allowed.join(', ') || 'none'}` });
  if (state === 'submitted' && !app.receipt) {
    app.state = 'confirmation_pending';
    app.history.push({ state: 'confirmation_pending', at: new Date().toISOString(), note: 'Marked submitted without a receipt. The tracker keeps this pending confirmation instead of trusting the click' });
  } else {
    app.state = state;
    app.history.push({ state, at: new Date().toISOString(), note: note || null });
  }
  app.updatedAt = new Date().toISOString();
  save('applications', apps);
  res.json({ ok: true, application: app });
}));

router.post('/applications/:id/receipt', ah(async (req, res) => {
  const apps = load('applications') || [];
  const app = apps.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  app.receipt = { reference: String(req.body?.reference || ''), channel: String(req.body?.channel || 'manual confirmation'), submittedAt: new Date().toISOString(), note: req.body?.note || null };
  if (['confirmation_pending', 'submitting'].includes(app.state)) {
    app.state = 'submitted';
    app.history.push({ state: 'submitted', at: app.receipt.submittedAt, note: 'Confirmed by receipt evidence' });
  }
  save('applications', apps);
  res.json({ ok: true, application: app });
}));

// ---- settings ----
router.put('/settings', ah(async (req, res) => {
  const settings = getSettings();
  const incoming = req.body || {};
  for (const key of Object.keys(incoming)) {
    if (key === 'llm') {
      settings.llm = { ...settings.llm, ...incoming.llm, providers: { ...(settings.llm?.providers || {}), ...(incoming.llm?.providers || {}) } };
      for (const p of Object.keys(incoming.llm?.providers || {})) {
        const merged = { ...(settings.llm.providers[p] || {}), ...incoming.llm.providers[p] };
        if (!merged.apiKey) merged.apiKey = settings.llm.providers[p]?.apiKey || '';
        settings.llm.providers[p] = merged;
      }
    } else {
      settings[key] = incoming[key];
    }
  }
  save('settings', settings);
  res.json({ ok: true, settings: maskSettings(settings), llm: llmStatus(settings) });
}));

router.post('/settings/llm/test', ah(async (req, res) => {
  const settings = getSettings();
  const providerId = req.body?.providerId || settings.llm?.providerId;
  const result = await testProvider(settings, providerId);
  res.json({ ok: result.ok, message: result.message, providerId });
}));

router.get('/answers', ah(async (req, res) => {
  res.json({ answers: load('answers') || DEFAULT_ANSWERS });
}));

router.put('/answers/:id', ah(async (req, res) => {
  const answers = load('answers') || DEFAULT_ANSWERS;
  const idx = answers.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Answer not found' });
  answers[idx] = { ...answers[idx], ...req.body, id: req.params.id };
  save('answers', answers);
  res.json({ ok: true, answers });
}));

// Editable autofill data. These values override everything the helper fills,
// so a wrong value is fixed once here and never autofills wrong again.
router.get('/filldata', ah(async (req, res) => {
  res.json({ filldata: load('filldata') || {}, fields: FILL_FIELDS });
}));

router.put('/filldata', ah(async (req, res) => {
  const existing = load('filldata') || {};
  const incoming = req.body || {};
  const merged = { ...existing };
  for (const field of FILL_FIELDS) {
    if (incoming[field.id] !== undefined) {
      const value = String(incoming[field.id] ?? '').trim();
      if (value) merged[field.id] = value;
      else delete merged[field.id];
    }
  }
  merged.updatedAt = new Date().toISOString();
  save('filldata', merged);
  res.json({ ok: true, filldata: merged });
}));

// ---- browser extension bridge (token gated, localhost only) ----
function extensionAuth(req, res) {
  const settings = getSettings();
  const token = req.get('x-jobforge-token') || req.body?.token || req.query?.token;
  if (!settings.extensionToken || token !== settings.extensionToken) {
    res.status(403).json({ error: 'Token mismatch. Open JobForge Settings and copy the current extension token' });
    return false;
  }
  return true;
}

router.options('/extension/*', ah(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-jobforge-token');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.json({});
}));

router.post('/extension/ping', ah(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-jobforge-token');
  if (!extensionAuth(req, res)) return;
  res.json({ ok: true, message: 'Connected to JobForge' });
}));

router.post('/extension/capture', ah(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-jobforge-token');
  if (!extensionAuth(req, res)) return;
  const j = req.body?.job || {};
  if (!j.title || String(j.title).length < 3) return res.status(400).json({ error: 'No job title found on this page' });
  const text = String(j.description || '');
  const jobs = load('jobs') || [];
  const dupe = jobs.find((x) => j.url && x.sourceUrls?.includes(j.url));
  if (dupe) return res.json({ ok: true, duplicate: true, id: dupe.id, message: 'Already captured earlier' });

  const job = {
    id: id('ext'),
    externalId: j.externalId || null,
    title: String(j.title).slice(0, 140),
    company: { name: String(j.company || 'Unknown employer').slice(0, 90), verified: false, atsProvider: j.platform || null },
    city: j.city ? String(j.city).slice(0, 90) : null,
    workMode: /remote|work from home/i.test(`${j.city || ''} ${text}`) ? 'Remote' : null,
    employmentType: j.employmentType || 'Full time',
    description: text || `Captured from ${j.platform || 'the web'} on ${new Date().toLocaleDateString('en-IN')}. ${j.url || ''}`.trim(),
    requiredSkills: [],
    preferredSkills: [],
    experienceRange: parseExperience(text),
    salary: { known: false, minLPA: null, maxLPA: null },
    postedAt: j.postedAt || null,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    deadline: j.deadline || null,
    sourceUrls: j.url ? [j.url] : [],
    applyUrl: j.applyUrl || j.url || null,
    source: { type: 'extension', id: `extension:${j.platform || 'web'}` },
    status: 'open',
    bond: { status: /bond|service agreement/i.test(text) ? 'candidate_reported' : 'no_evidence', evidence: [] },
    scamScore: 0,
    scamFlags: []
  };
  const scan = analyzeScam(job.description, { claimedCompany: job.company.name });
  job.scamScore = scan.score;
  job.scamFlags = scan.flags;
  job.scannedAt = job.firstSeen;
  jobs.push(job);
  save('jobs', jobs);
  const profile = getProfile();
  const match = profile ? scoreJob(job, profile, profile.weights) : null;
  res.json({ ok: true, id: job.id, match: match ? { score: match.score, lane: match.lane } : null, scan: { severity: scan.severity, flags: scan.flags.length } });
}));

router.get('/extension/packet', ah(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-jobforge-token');
  if (!extensionAuth(req, res)) return;
  const profile = getProfile() || {};
  const answers = (load('answers') || []).filter((a) => a.approved && a.value);
  const filldata = load('filldata') || {};
  // Fill data edited in the app always wins over derived values, so a wrong
  // value is corrected once and never autofills wrong again.
  const answersMap = {};
  for (const a of answers) {
    const q = a.question.toLowerCase();
    if (q.includes('notice')) answersMap.notice = a.value;
    else if (q.includes('salary') || q.includes('ctc')) answersMap.salary = a.value;
    else if (q.includes('relocat')) answersMap.relocation = a.value;
    else if (q.includes('why')) answersMap.why = a.value;
  }
  const merged = {
    name: filldata.name || profile.name || '',
    email: filldata.email || profile.email || '',
    phone: filldata.phone || profile.phone || '',
    city: filldata.city || profile.city || '',
    linkedin: filldata.linkedin || profile.linkedin || '',
    github: filldata.github || profile.github || '',
    notice: filldata.notice || answersMap.notice || '',
    salary: filldata.salary || answersMap.salary || '',
    relocation: filldata.relocation || answersMap.relocation || '',
    experience: filldata.experience || '',
    why: filldata.why || answersMap.why || ''
  };
  res.json({
    ok: true,
    contact: merged,
    answers: Object.entries(merged)
      .filter(([key, value]) => value && !['name', 'email', 'phone', 'city', 'linkedin', 'github'].includes(key))
      .map(([key, value]) => ({ question: key, value })),
    fillOverrides: Object.keys(filldata).filter((k) => k !== 'updatedAt')
  });
}));

// ---- data ----
router.get('/export', ah(async (req, res) => {
  const bundle = {};
  for (const name of ['settings', 'profile', 'jobs', 'applications', 'companies', 'scamlog', 'answers', 'packets', 'sourceRuns', 'filldata']) {
    bundle[name] = load(name);
  }
  bundle.exportedAt = new Date().toISOString();
  bundle.note = 'Your complete JobForge data. The bundle includes your extension token and API keys, so keep the file private.';
  res.setHeader('content-type', 'application/json');
  res.setHeader('content-disposition', `attachment; filename="jobforge-export-${Date.now()}.json"`);
  res.json(bundle);
}));

router.post('/reset', ah(async (req, res) => {
  if (!req.body?.confirm) return res.status(400).json({ error: 'Pass confirm true. This wipes profile, jobs, tracker, logs, and settings' });
  for (const name of ['settings', 'profile', 'jobs', 'applications', 'companies', 'scamlog', 'answers', 'packets', 'sourceRuns', 'filldata']) {
    try { fs.unlinkSync(path.join(DATA_DIR, `${name}.json`)); } catch { /* already gone */ }
  }
  try { fs.rmSync(resumeDir(), { recursive: true, force: true }); } catch { /* already gone */ }
  scoreCache.clear();
  bootstrap();
  res.json({ ok: true });
}));

export default router;
export { warmScores };
