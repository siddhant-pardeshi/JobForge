// JSON file persistence for the single user local deployment. Writes are
// atomic (temp file then rename) so a crash mid write never corrupts state.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { DEFAULT_WEIGHTS } from './services/scoring.js';
import { DEFAULT_BUDGETS } from './services/relocation.js';
import { SEED_COMPANIES } from './seedRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.JOBFORCE_DATA_DIR || path.join(__dirname, 'data');
const RESUME_DIR = path.join(DATA_DIR, 'resumes');

export function ensureDirs() {
  fs.mkdirSync(RESUME_DIR, { recursive: true });
}

export function resumeDir() {
  return RESUME_DIR;
}

const FILES = ['settings', 'profile', 'jobs', 'applications', 'companies', 'scamlog', 'answers', 'packets', 'packetsIndex', 'sourceRuns', 'filldata'];

export const FILL_FIELDS = [
  { id: 'name', label: 'Full name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'city', label: 'Current city' },
  { id: 'linkedin', label: 'LinkedIn profile URL' },
  { id: 'github', label: 'GitHub or portfolio URL' },
  { id: 'notice', label: 'Notice period answer' },
  { id: 'salary', label: 'Expected pay answer (only what you approve)' },
  { id: 'relocation', label: 'Relocation answer' },
  { id: 'experience', label: 'Total experience answer' },
  { id: 'why', label: 'Why hire me answer (long form)' }
];

export function load(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function save(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function id(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export const DEFAULT_SETTINGS = {
  llm: { providerId: 'none', providers: {} },
  autoSubmit: { enabled: false, maxPerDay: 3, allowedSources: [], excludedEmployers: [] },
  relocation: { policy: { minSurplusMonthly: null, minImprovementOverPune: null, maxUpfrontCash: null }, budgets: DEFAULT_BUDGETS, netRate: 0.8, targetMonthlySavings: null },
  refresh: { auto: true, intervalMinutes: 20, runOnStart: true },
  extensionToken: null,
  accessCode: null,
  adminCode: null,
  openAccess: true,
  onboarded: false
};

export const DEFAULT_ANSWERS = [
  { id: 'a_notice', question: 'Notice period', value: 'Available to join immediately', scope: 'global', approved: true, provenance: 'Stated in your resume summary. Verify before every use' },
  { id: 'a_reloc', question: 'Willing to relocate', value: 'Open to relocation when the offer clears my affordability policy', scope: 'jobs_with_policy_check', approved: false, provenance: 'Pending your explicit approval' },
  { id: 'a_salary', question: 'Expected CTC', value: null, scope: 'per_job', approved: false, provenance: 'Unset by design. Decide per job or leave as open to discussion' },
  { id: 'a_why', question: 'Why should we hire you', value: 'I ship complete features across the stack: BankNest and LifeDrop, two full stack Java applications where I designed the schema, wrote 8+ REST APIs with transactional integrity, and built the React dashboards on top.', scope: 'global', approved: false, provenance: 'Drafted from your real projects. Edit and approve' }
];

export function bootstrap() {
  ensureDirs();
  let settings = load('settings');
  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    if (process.env.JOBFORCE_LLM_PROVIDER && PRESET_KEYS().includes(process.env.JOBFORCE_LLM_PROVIDER)) {
      settings.llm.providerId = process.env.JOBFORCE_LLM_PROVIDER;
      settings.llm.providers = settings.llm.providers || {};
      settings.llm.providers[settings.llm.providerId] = {
        apiKey: process.env.JOBFORCE_LLM_API_KEY || '',
        model: process.env.JOBFORCE_LLM_MODEL || ''
      };
    }
    save('settings', settings);
  }
  // Issue the extension token once so the browser extension can pair safely.
  if (!settings.extensionToken) {
    settings.extensionToken = `jf_${crypto.randomBytes(16).toString('hex')}`;
    save('settings', settings);
  }
  // Access code for public exposure. Required by tunnel visitors, never
  // required for the owner working on this machine.
  if (!settings.accessCode) {
    settings.accessCode = String(100000 + crypto.randomBytes(4).readUInt32BE(0) % 900000);
    save('settings', settings);
  }
  // Admin code lets the owner flip the access switch from any browser.
  if (!settings.adminCode) {
    settings.adminCode = `adm_${crypto.randomBytes(9).toString('hex')}`;
    save('settings', settings);
  }
  if (!load('answers')) save('answers', DEFAULT_ANSWERS);
  let companies = load('companies');
  if (!companies) companies = [];
  if (companies.length === 0) {
    companies = SEED_COMPANIES.map((c) => ({
      id: id('co'),
      name: c.name,
      atsProvider: c.atsProvider,
      handle: c.handle,
      region: c.region,
      note: c.note,
      verified: true,
      seedVerifiedOn: '2026-10-25',
      lastStatus: 'Seeded from the verified registry, awaiting first live refresh',
      addedAt: new Date().toISOString(),
      lastRefresh: null
    }));
    save('companies', companies);
  }
  if (!load('jobs')) save('jobs', []);
  if (!load('applications')) save('applications', []);
  if (!load('scamlog')) save('scamlog', []);
  if (!load('packets')) save('packets', []);
  if (!load('sourceRuns')) save('sourceRuns', []);
  if (!load('filldata')) save('filldata', {});
  return settings;
}

function PRESET_KEYS() {
  return ['openai', 'anthropic', 'groq', 'openrouter', 'ollama', 'zai', 'custom'];
}

export { DEFAULT_WEIGHTS };
