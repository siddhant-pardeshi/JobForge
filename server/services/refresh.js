// Live refresh engine. Fetches every enabled board, adds new postings,
// refreshes seen ones, and marks jobs closed only after they vanish from the
// official board on two consecutive checks. One missed check is never enough,
// because boards sometimes omit a posting transiently.

import { fetchFromProvider } from './ats.js';
import { load, save } from '../store.js';
import { analyzeScam } from './scam.js';

export function diffBoard(storedForSource, fetchedExternalIds) {
  const added = [];
  const refreshed = [];
  const missed = [];
  for (const job of storedForSource) {
    if (fetchedExternalIds.has(job.externalId)) refreshed.push(job);
    else missed.push(job);
  }
  return { added, refreshed, missed };
}

export function applyFetchToStore(company, fetchedJobs) {
  const jobs = load('jobs') || [];
  const storedForSource = jobs.filter((j) => j.source?.type === company.atsProvider && j.source?.id === company.handle);
  const fetchedIds = new Set(fetchedJobs.map((j) => j.externalId));
  const { added, refreshed, missed } = diffBoard(storedForSource, fetchedIds);

  const now = new Date().toISOString();
  let newCount = 0;
  let closedCount = 0;
  let reopenedCount = 0;

  // Existing jobs: refresh what is still live, close what vanished twice.
  for (const job of refreshed) {
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx === -1) continue;
    jobs[idx].lastSeen = now;
    jobs[idx].missCount = 0;
    if (jobs[idx].status === 'closed') {
      jobs[idx].status = 'open';
      jobs[idx].closedAt = null;
      reopenedCount++;
    }
  }
  for (const job of missed) {
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx === -1) continue;
    jobs[idx].missCount = (jobs[idx].missCount || 0) + 1;
    jobs[idx].lastSeen = jobs[idx].lastSeen || now;
    if (jobs[idx].missCount >= 2 && jobs[idx].status !== 'closed') {
      jobs[idx].status = 'closed';
      jobs[idx].closedAt = now;
      closedCount++;
    }
  }

  // Brand new postings from this board.
  const knownIds = new Set(storedForSource.map((j) => j.externalId));
  for (const fetched of fetchedJobs) {
    if (knownIds.has(fetched.externalId)) continue;
    const scan = analyzeScam(fetched.description || '', { claimedCompany: fetched.company?.name });
    fetched.scamScore = scan.score;
    fetched.scamFlags = scan.flags;
    jobs.push(fetched);
    newCount++;
  }

  save('jobs', jobs);
  return { newCount, closedCount, reopenedCount, stillLive: refreshed.length, totalLive: fetchedJobs.length };
}

// Fetch one source and fold results into the store. Returns a run record.
export async function runSource(company) {
  const run = { companyId: company.id, company: company.name, at: new Date().toISOString(), ok: false, found: 0, added: 0, closed: 0, message: '' };
  try {
    const { jobs } = await fetchFromProvider(company.atsProvider, company.handle, company.name);
    const outcome = applyFetchToStore(company, jobs);
    run.ok = true;
    run.found = outcome.totalLive;
    run.added = outcome.newCount;
    run.closed = outcome.closedCount;
    run.message = `${outcome.totalLive} live now, ${outcome.newCount} new, ${outcome.closedCount} closed since last check`;
    if (outcome.closedCount > 0) run.message += ` (${outcome.closedCount} postings left the board and were marked closed)`;
  } catch (err) {
    run.message = err.message || 'The source could not be checked';
  }
  const runs = load('sourceRuns') || [];
  runs.push(run);
  save('sourceRuns', runs.slice(-300));
  return run;
}

export async function fetchAllSources() {
  const companies = (load('companies') || []).filter((c) => ['greenhouse', 'lever', 'ashby'].includes(c.atsProvider));
  const report = [];
  for (const company of companies) {
    const run = await runSource(company);
    report.push(run);
    if (run.ok) {
      const all = load('companies') || [];
      const idx = all.findIndex((c) => c.id === company.id);
      if (idx !== -1) {
        all[idx].verified = true;
        all[idx].lastRefresh = run.at;
        all[idx].lastStatus = run.message;
        save('companies', all);
      }
    }
  }
  return report;
}
