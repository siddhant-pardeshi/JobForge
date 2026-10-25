// Discovery adapters for documented public ATS job board listing interfaces.
// Greenhouse, Lever, and Ashby each expose a public listing endpoint keyed by
// an employer board handle. Listing access is read only and never implies
// submission permission. LinkedIn and Naukri stay manual by design.

import { canonicalSkills } from '../taxonomy.js';

const HANDLE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/;
const TIMEOUT_MS = 15000;

export const ATS_PROVIDERS = {
  greenhouse: { label: 'Greenhouse', docs: 'https://developers.greenhouse.io/job-board.html', handleHint: 'board token from careers page, for example figma', submission: 'listings only, applications happen on the employer hosted form' },
  lever: { label: 'Lever', docs: 'https://github.com/lever/postings-api', handleHint: 'posting identifier, for example plaid', submission: 'listings only, applications happen on the hosted form' },
  ashby: { label: 'Ashby', docs: 'https://developers.ashbyhq.com/docs/public-job-posting-api', handleHint: 'board name, for example OpenAI', submission: 'listings only, applications happen on the hosted form' },
  manual: { label: 'Manual import', docs: '', handleHint: 'paste or import postings yourself', submission: 'you drive, the app prepares and tracks' }
};

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers: { accept: 'application/json', 'user-agent': 'JobForge/1.0 (local job search tool)', ...(options.headers || {}) } });
    if (!res.ok) {
      const err = new Error(`The source answered with HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function salaryFromText(text) {
  const t = String(text || '');
  const lakh = t.match(/₹?\s*(\d{1,2}(?:\.\d)?)\s*(?:-|to|–)\s*(\d{1,2}(?:\.\d)?)\s*(?:LPA|lakh|lakhs)/i);
  if (lakh) return { known: true, minLPA: Number(lakh[1]), maxLPA: Number(lakh[2]) };
  const single = t.match(/₹?\s*(\d{1,2}(?:\.\d)?)\s*(?:LPA|lakh)/i);
  if (single) return { known: true, minLPA: null, maxLPA: Number(single[1]) };
  const monthly = t.match(/₹?\s*(\d{2,3})[,.]?(\d{3})\s*(?:-|to|–)?\s*(\d{2,3})?[,.]?(\d{3})?\s*(?:per month|\/month|k\/m)/i);
  if (monthly) {
    const lo = Number(monthly[1]) * 1000 + Number(monthly[2] || 0);
    const hi = monthly[3] ? Number(monthly[3]) * 1000 + Number(monthly[4] || 0) : lo;
    return { known: true, minLPA: Math.round((lo * 12) / 100000 * 10) / 10, maxLPA: Math.round((hi * 12) / 100000 * 10) / 10 };
  }
  return { known: false, minLPA: null, maxLPA: null };
}

function baseJob(overrides) {
  return {
    id: overrides.id,
    externalId: overrides.externalId || null,
    title: overrides.title || 'Untitled role',
    company: overrides.company || { name: 'Unknown employer', verified: false },
    city: overrides.city || null,
    workMode: overrides.workMode || null,
    employmentType: overrides.employmentType || 'Full time',
    description: overrides.description || '',
    requiredSkills: overrides.requiredSkills || [],
    preferredSkills: overrides.preferredSkills || [],
    experienceRange: overrides.experienceRange || { min: null, max: null, text: null },
    salary: overrides.salary || { known: false, minLPA: null, maxLPA: null },
    postedAt: overrides.postedAt || null,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    deadline: overrides.deadline || null,
    sourceUrls: overrides.sourceUrls || [],
    applyUrl: overrides.applyUrl || null,
    source: overrides.source || { type: 'unknown' },
    status: 'open',
    bond: { status: 'unknown', evidence: [] },
    scamScore: 0,
    scamFlags: []
  };
}

export async function fetchGreenhouse(handle, companyName) {
  if (!HANDLE_PATTERN.test(handle)) throw new Error('That board token contains characters Greenhouse does not use');
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(handle)}/jobs?content=true`);
  const jobs = (data.jobs || []).map((j) => {
    const description = stripHtml(j.content);
    return baseJob({
      id: `gh_${handle}_${j.id}`,
      externalId: String(j.id),
      title: j.title,
      company: { name: companyName || handle, verified: true, atsProvider: 'greenhouse' },
      city: j.location?.name || null,
      workMode: /remote/i.test(`${j.location?.name || ''} ${j.title}`) ? 'Remote' : null,
      description,
      requiredSkills: canonicalSkills(description).slice(0, 12),
      salary: salaryFromText(description),
      postedAt: j.updated_at || j.first_published || null,
      sourceUrls: [j.absolute_url].filter(Boolean),
      applyUrl: j.absolute_url || null,
      source: { type: 'greenhouse', id: handle }
    });
  });
  return { jobs, total: data.jobs?.length ?? 0 };
}

export async function fetchLever(handle, companyName) {
  if (!HANDLE_PATTERN.test(handle)) throw new Error('That posting identifier contains characters Lever does not use');
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(handle)}?mode=json`);
  const jobs = (Array.isArray(data) ? data : []).map((j) => {
    const description = j.descriptionPlain || stripHtml(j.description) || '';
    return baseJob({
      id: `lv_${handle}_${j.id}`,
      externalId: String(j.id),
      title: j.text,
      company: { name: companyName || handle, verified: true, atsProvider: 'lever' },
      city: j.categories?.location || null,
      workMode: /remote/i.test(`${j.categories?.location || ''} ${j.text}`) ? 'Remote' : null,
      employmentType: j.categories?.commitment || 'Full time',
      description,
      requiredSkills: canonicalSkills(description).slice(0, 12),
      salary: salaryFromText(`${description} ${j.description || ''}`),
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      sourceUrls: [j.hostedUrl, j.applyUrl].filter(Boolean),
      applyUrl: j.hostedUrl || j.applyUrl || null,
      source: { type: 'lever', id: handle }
    });
  });
  return { jobs, total: jobs.length };
}

export async function fetchAshby(handle, companyName) {
  if (!HANDLE_PATTERN.test(handle)) throw new Error('That board name contains characters Ashby does not use');
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(handle)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const jobs = (data.jobs || []).map((j) => {
    const description = j.descriptionPlain || stripHtml(j.descriptionHtml) || '';
    return baseJob({
      id: `ab_${handle}_${j.id}`,
      externalId: String(j.id),
      title: j.title,
      company: { name: companyName || handle, verified: true, atsProvider: 'ashby' },
      city: j.location || null,
      workMode: j.isRemote ? 'Remote' : null,
      employmentType: j.employmentType || 'Full time',
      description,
      requiredSkills: canonicalSkills(description).slice(0, 12),
      salary: salaryFromText(description),
      postedAt: j.publishedAt || null,
      sourceUrls: [j.jobUrl].filter(Boolean),
      applyUrl: j.jobUrl || null,
      source: { type: 'ashby', id: handle }
    });
  });
  return { jobs, total: jobs.length };
}

export async function fetchFromProvider(provider, handle, companyName) {
  switch (provider) {
    case 'greenhouse': return fetchGreenhouse(handle, companyName);
    case 'lever': return fetchLever(handle, companyName);
    case 'ashby': return fetchAshby(handle, companyName);
    default: throw new Error(`No listing adapter exists for "${provider}". Supported adapters: greenhouse, lever, ashby.`);
  }
}

// Probe a handle to see whether a board actually exists before saving it.
export async function verifyBoard(provider, handle) {
  try {
    const { total } = await fetchFromProvider(provider, handle, handle);
    return { ok: true, total, message: `Verified, found ${total} live postings on this board` };
  } catch (err) {
    return { ok: false, total: 0, message: err.status === 404 ? 'No board exists at that identifier' : `Could not verify: ${err.message}` };
  }
}
