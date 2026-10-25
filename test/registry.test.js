import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCareersUrl, SEED_COMPANIES } from '../server/seedRegistry.js';

test('careers URLs reveal their provider and handle automatically', () => {
  assert.deepEqual(parseCareersUrl('https://job-boards.greenhouse.io/zscaler'), { atsProvider: 'greenhouse', handle: 'zscaler' });
  assert.deepEqual(parseCareersUrl('https://boards.greenhouse.io/embed/job_board?for=meesho'), { atsProvider: 'greenhouse', handle: 'meesho' });
  assert.deepEqual(parseCareersUrl('https://jobs.lever.co/meesho'), { atsProvider: 'lever', handle: 'meesho' });
  assert.deepEqual(parseCareersUrl('https://jobs.ashbyhq.com/openai'), { atsProvider: 'ashby', handle: 'openai' });
  assert.equal(parseCareersUrl('https://careers.somethingelse.com/x').atsProvider, null);
});

test('every seeded board is a genuine supported provider with a clean handle', () => {
  assert.ok(SEED_COMPANIES.length >= 15, 'the verified registry should be substantial');
  for (const c of SEED_COMPANIES) {
    assert.ok(['greenhouse', 'lever', 'ashby'].includes(c.atsProvider), `${c.name} provider`);
    assert.match(c.handle, /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, `${c.name} handle shape`);
    assert.ok(c.region && c.note, `${c.name} carries region and note`);
  }
});
