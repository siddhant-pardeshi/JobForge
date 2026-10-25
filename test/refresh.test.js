import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// The refresh engine writes through the shared store, so point it at a
// throwaway data directory for the duration of this test file.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jobforge-test-'));
process.env.JOBFORCE_DATA_DIR = tmp;

const { applyFetchToStore } = await import('../server/services/refresh.js');
const { load } = await import('../server/store.js');

const job = (ext, over = {}) => ({
  id: `t_${ext}`,
  externalId: String(ext),
  title: 'Backend Engineer',
  company: { name: 'Test Co', verified: true },
  city: 'Pune',
  description: 'Java Spring Boot REST APIs MySQL, 0 to 2 years.',
  source: { type: 'greenhouse', id: 'testco' },
  sourceUrls: [`https://boards.greenhouse.io/testco/jobs/${ext}`],
  applyUrl: `https://boards.greenhouse.io/testco/jobs/${ext}`,
  status: 'open',
  scamScore: 0,
  scamFlags: [],
  ...over
});

test('a posting that vanishes from the board once is not yet closed', () => {
  // Seed one job, then fetch a board that no longer lists it.
  const store = { jobs: [job('A')] };
  fs.writeFileSync(path.join(tmp, 'jobs.json'), JSON.stringify(store.jobs));
  applyFetchToStore({ atsProvider: 'greenhouse', handle: 'testco' }, []);
  let after = load('jobs')[0];
  assert.equal(after.status, 'open', 'one miss must never close a role');
  assert.equal(after.missCount, 1);
  // Second consecutive fetch without it: now the closure is honest.
  applyFetchToStore({ atsProvider: 'greenhouse', handle: 'testco' }, []);
  after = load('jobs')[0];
  assert.equal(after.status, 'closed');
  assert.ok(after.closedAt, 'closure timestamp recorded');
});

test('a reposted role reopens automatically and misses reset', () => {
  const store = { jobs: [job('B', { status: 'closed', closedAt: '2026-10-01T00:00:00Z', missCount: 3 })] };
  fs.writeFileSync(path.join(tmp, 'jobs.json'), JSON.stringify(store.jobs));
  applyFetchToStore({ atsProvider: 'greenhouse', handle: 'testco' }, [job('B')]);
  const after = load('jobs')[0];
  assert.equal(after.status, 'open', 'reappearing postings reopen');
  assert.equal(after.missCount, 0);
});

test('new board postings enter the pipeline exactly once', () => {
  fs.writeFileSync(path.join(tmp, 'jobs.json'), JSON.stringify([]));
  applyFetchToStore({ atsProvider: 'greenhouse', handle: 'testco' }, [job('C1'), job('C2')]);
  applyFetchToStore({ atsProvider: 'greenhouse', handle: 'testco' }, [job('C1'), job('C2')]);
  const jobs = load('jobs');
  assert.equal(jobs.length, 2, 'no duplicates across refreshes');
});
