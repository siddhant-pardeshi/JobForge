import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { load, save, id, bootstrap, resumeDir, DATA_DIR, DEFAULT_SETTINGS, DEFAULT_ANSWERS } from './store.js';
import { extractText, draftProfile } from './services/parser.js';
import { scoreJob, mergeDuplicates, classify, parseExperience } from './services/scoring.js';
import { analyzeScam } from './services/scam.js';
import { fetchFromProvider, verifyBoard, ATS_PROVIDERS } from './services/ats.js';
import { PRESETS, llmStatus, testProvider } from './services/llm.js';
import { buildPacket, booleanStrings } from './services/tailoring.js';
import { evaluateOffer, DEFAULT_BUDGETS, BUDGET_CATEGORIES } from './services/relocation.js';
import { buildDemoJobs, DEMO_INTERVIEW_REPORTS, DEMO_COMPANY_NOTES } from './demo.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(pdf|docx|txt|md)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, and plain text files are accepted'));
  }
});

// async handler wrapper
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

// Scan unverified text sources for fraud indicators once per job instance.
function prepareJob(job) {
  if (!job.scamScore && job.scamScore !== 0) job.scamScore = 0;
  if (job.source?.type === 'demo' || job.source?.type === 'imported') {
    const result = analyzeScam(job.description, { claimedCompany: job.company?.name });
    job.scamScore = result.score;
    job.scamFlags = result.flags;
  }
  if (!job.experienceRange?.text) {
    const parsed = parseExperience(`${job.title} ${job.description}`);
    job.experienceRange = parsed;
  }
  return job;
}

function assembleJobs() {
  const settings = getSettings();
  const real = (load('jobs') || []).map((j) => prepareJob({ ...j }));
  const demo = settings.demoMode ? buildDemoJobs().map((j) => prepareJob(j)) : [];
  return mergeDuplicates([...real, ...demo]);
}

function scoreAll(profile) {
  if (!profile) {
    return assembleJobs().map((job) => ({ ...job, match: null, unscorable: true }));
  }
  return assembleJobs()
    .map((job) => {
      const match = scoreJob(job, profile, profile.weights);
      return { ...job, match };
    })
    .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
}

// ---------- bootstrap ----------
router.get('/bootstrap', ah(async (req, res) => {
  const settings = getSettings();
  res.json({
    profile: getProfile(),
    settings: maskSettings(settings),
    answers: load('answers') || DEFAULT_ANSWERS,
    llm: llmStatus(settings),
    demoMode: !!settings.demoMode,
    presets: PRESETS,
    atsProviders: ATS_PROVIDERS,
    storageDir: DATA_DIR
  });
}));

// ---------- resume ----------
router.post('/resume', upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  const parsed = await extractText(req.file.buffer, req.file.originalname);
  const draft = draftProfile(parsed.text, req.file.originalname);
  // Keep the original file locally under the private data folder.
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

// ---------- profile ----------
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

// ---------- jobs ----------
router.get('/jobs', ah(async (req, res) => {
  const profile = getProfile();
  const jobs = scoreAll(profile);
  const lanes = { best_pune: 0, remote: 0, relocation: 0, stretch: 0, needs_verification: 0, excluded: 0 };
  for (const j of jobs) if (j.match && lanes[j.match.lane] !== undefined) lanes[j.match.lane]++;
  res.json({ jobs, lanes, total: jobs.length });
}));

router.get('/jobs/:id', ah(async (req, res) => {
  const profile = getProfile();
  const job = scoreAll(profile).find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'That job is not in your pipeline anymore' });
  const reports = job.source?.type === 'demo' ? DEMO_INTERVIEW_REPORTS.filter((r) => r.companyId === job.companyRef || job.company?.domain?.startsWith(r.companyId)) : [];
  const dossier = job.source?.type === 'demo' ? DEMO_COMPANY_NOTES[job.companyRef] || null : null;
  res.json({ job, interviewReports: reports, dossier, booleanStrings: booleanStrings(profile || {}) });
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
  const jobs = load('jobs') || [];
  jobs.push(job);
  save('jobs', jobs);
  const match = profile ? scoreJob(prepareJob(job), profile, profile.weights) : null;
  res.json({ ok: true, id: job.id, match, scan });
}));

router.post('/jobs/fetch', ah(async (req, res) => {
  const companies = (load('companies') || []).filter((c) => ['greenhouse', 'lever', 'ashby'].includes(c.atsProvider));
  const report = [];
  const allJobs = load('jobs') || [];
  let added = 0;
  for (const company of companies) {
    const run = { companyId: company.id, company: company.name, at: new Date().toISOString(), ok: false, found: 0, added: 0, message: '' };
    try {
      const { jobs } = await fetchFromProvider(company.atsProvider, company.handle, company.name);
      const existingIds = new Set(allJobs.map((j) => j.externalId));
      for (const job of jobs) {
        if (existingIds.has(job.externalId)) continue;
        allJobs.push(job);
        added++;
      }
      run.ok = true;
      run.found = jobs.length;
      run.added = added;
      run.message = `${jobs.length} live postings, ${added} new`;
    } catch (err) {
      run.message = err.message || 'The source could not be checked';
    }
    report.push(run);
    const allRuns = load('sourceRuns') || [];
    allRuns.push(run);
    save('sourceRuns', allRuns.slice(-200));
  }
  if (companies.length === 0) {
    report.push({ company: 'No live sources yet', at: new Date().toISOString(), ok: false, found: 0, added: 0, message: 'Add a Greenhouse, Lever, or Ashby board on the Sources page to start real discovery' });
  }
  save('jobs', allJobs);
  res.json({ ok: true, report, added });
}));

router.post('/jobs/:id/action', ah(async (req, res) => {
  const { action, note } = req.body || {};
  const jobs = load('jobs') || [];
  const job = jobs.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Only imported jobs accept stored actions. Demo and ATS listings are read only and refresh from source' });
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
  res.json({ ok: true, packetId: stored.id, packet });
}));

// Synthetic submission through the demo adapter. Never contacts a real employer.
router.post('/jobs/:id/apply-demo', ah(async (req, res) => {
  const job = assembleJobs().find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if ((job.scamScore || 0) >= 70) return res.status(403).json({ error: 'Scam screen blocks this action. Resolve the payment or identity indicators first' });
  const apps = load('applications') || [];
  if (apps.some((a) => a.jobId === job.id && ['submitted', 'authorized', 'submitting', 'confirmation_pending'].includes(a.state))) {
    return res.status(409).json({ error: 'An application for this role already exists in the tracker. Duplicates stay blocked' });
  }
  const now = new Date().toISOString();
  const app = {
    id: id('app'),
    jobId: job.id,
    jobSnapshot: { title: job.title, company: job.company?.name, city: job.city, applyUrl: job.applyUrl, score: null },
    state: 'submitted',
    mode: 'demo_adapter',
    receipt: { reference: `DEMO-${Date.now().toString(36).toUpperCase()}`, channel: 'synthetic form adapter', submittedAt: now, note: 'Demonstration submission to a synthetic form. No real employer received anything' },
    history: [
      { state: 'discovered', at: job.firstSeen },
      { state: 'submitted', at: now, note: 'Demo adapter submission with approved packet' }
    ],
    createdAt: now,
    updatedAt: now
  };
  apps.push(app);
  save('applications', apps);
  res.json({ ok: true, application: app });
}));

// ---------- companies and sources ----------
router.get('/companies', ah(async (req, res) => {
  const companies = load('companies') || [];
  const runs = load('sourceRuns') || [];
  const jobs = load('jobs') || [];
  res.json({
    companies: companies.map((c) => {
      const lastRun = [...runs].reverse().find((r) => r.companyId === c.id);
      return { ...c, lastRun: lastRun || null, jobCount: jobs.filter((j) => j.source?.id === c.handle).length };
    }),
    providers: ATS_PROVIDERS
  });
}));

router.post('/companies', ah(async (req, res) => {
  const { name, atsProvider, handle } = req.body || {};
  if (!name || !atsProvider || !handle) return res.status(400).json({ error: 'Company name, provider, and board identifier are all required' });
  if (!ATS_PROVIDERS[atsProvider] || atsProvider === 'manual') return res.status(400).json({ error: 'Pick greenhouse, lever, or ashby as the provider' });
  const verification = await verifyBoard(atsProvider, handle);
  const companies = load('companies') || [];
  const company = {
    id: id('co'),
    name: String(name).trim(),
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
  const recent = runs.slice(-50);
  res.json({
    runs: recent,
    summary: {
      total: recent.length,
      ok: recent.filter((r) => r.ok).length,
      failing: recent.filter((r) => !r.ok).length
    }
  });
}));

// ---------- scam ----------
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

// ---------- relocation ----------
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

// ---------- tracker ----------
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

// ---------- settings ----------
router.put('/settings', ah(async (req, res) => {
  const settings = getSettings();
  const incoming = req.body || {};
  for (const key of Object.keys(incoming)) {
    if (key === 'llm') {
      settings.llm = { ...settings.llm, ...incoming.llm, providers: { ...(settings.llm?.providers || {}), ...(incoming.llm?.providers || {}) } };
      // Merge per provider so saving one provider does not wipe others.
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

// ---------- data ----------
router.get('/export', ah(async (req, res) => {
  const bundle = {};
  for (const name of ['settings', 'profile', 'jobs', 'applications', 'companies', 'scamlog', 'answers', 'packets', 'sourceRuns']) {
    bundle[name] = load(name);
  }
  bundle.exportedAt = new Date().toISOString();
  bundle.note = 'Your complete JobForge data. API keys are included only if this file stays private.';
  res.setHeader('content-type', 'application/json');
  res.setHeader('content-disposition', `attachment; filename="jobforge-export-${Date.now()}.json"`);
  res.json(bundle);
}));

router.post('/demo', ah(async (req, res) => {
  const settings = getSettings();
  settings.demoMode = !!req.body?.enabled;
  save('settings', settings);
  res.json({ ok: true, demoMode: settings.demoMode });
}));

router.post('/reset', ah(async (req, res) => {
  if (!req.body?.confirm) return res.status(400).json({ error: 'Pass confirm true. This wipes profile, jobs, tracker, logs, and settings' });
  for (const name of ['settings', 'profile', 'jobs', 'applications', 'companies', 'scamlog', 'answers', 'packets', 'sourceRuns']) {
    try { fs.unlinkSync(path.join(DATA_DIR, `${name}.json`)); } catch { /* already gone */ }
  }
  try { fs.rmSync(resumeDir(), { recursive: true, force: true }); } catch { /* already gone */ }
  bootstrap();
  res.json({ ok: true });
}));

export default router;
