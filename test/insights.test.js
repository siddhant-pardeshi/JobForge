import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateGaps, salaryInsights, buildPrep } from '../server/services/insights.js';

const job = (over = {}) => ({
  id: 'j',
  title: 'Java Backend Developer',
  company: { name: 'Acme', verified: true },
  city: 'Pune',
  status: 'open',
  salary: { known: false, minLPA: null, maxLPA: null },
  description: 'Java Spring Boot REST APIs MySQL, 0 to 2 years.',
  requiredSkills: ['Core Java', 'Spring Boot', 'REST APIs'],
  match: { lane: 'best_pune', missing: [], reasons: [{ kind: 'skill', text: 'Your resume shows Core Java, Spring Boot which this role asks for' }], components: [] },
  ...over
});

test('gap aggregation counts recurring missing skills and who asks', () => {
  const jobs = [
    job({ id: '1', match: { lane: 'best_pune', missing: [{ name: 'Docker', severity: 'mustHave' }, { name: 'Redis', severity: 'mustHave' }], reasons: [] } }),
    job({ id: '2', match: { lane: 'remote', missing: [{ name: 'Docker', severity: 'mustHave' }], reasons: [] }, company: { name: 'Globex' } }),
    job({ id: '3', match: { lane: 'needs_verification', missing: [{ name: 'Docker', severity: 'mustHave' }], reasons: [] } }),
    job({ id: '4', status: 'closed', match: { lane: 'best_pune', missing: [{ name: 'Docker', severity: 'mustHave' }], reasons: [] } })
  ];
  const gaps = aggregateGaps(jobs);
  assert.equal(gaps[0].skill, 'Docker');
  assert.equal(gaps[0].count, 2, 'review lane and closed roles must not inflate gaps');
  assert.equal(gaps[0].companyCount, 2);
  assert.equal(gaps[1].skill, 'Redis');
});

test('salary insights report native bands with honest sample sizes', () => {
  const jobs = [
    job({ salary: { known: true, minLPA: 6, maxLPA: 9, currency: 'INR' } }),
    job({ salary: { known: true, minLPA: 8, maxLPA: 12, currency: 'INR' } }),
    job({ salary: { known: true, minLPA: 7, maxLPA: 10, currency: 'INR' } }),
    job({ salary: { known: false, minLPA: null, maxLPA: null } })
  ];
  const ins = salaryInsights(jobs);
  assert.equal(ins.total, 4);
  assert.equal(ins.listed, 3);
  assert.equal(ins.listedPct, 75);
  const row = ins.rows.find((r) => r.lane === 'best_pune' && r.currency === 'INR');
  assert.equal(row.sample, 3);
  assert.equal(row.median, '₹7-10 LPA');
});

test('foreign currency bands surface natively without exchange rates', () => {
  const jobs = [
    job({ salary: { known: true, minLPA: null, maxLPA: null, currency: 'USD', native: '$150k to $220k' } }),
    job({ salary: { known: true, minLPA: null, maxLPA: null, currency: 'USD', native: '$140k to $170k' } }),
    job({ salary: { known: true, minLPA: 6, maxLPA: 9, currency: 'INR' } })
  ];
  const ins = salaryInsights(jobs);
  const usd = ins.rows.find((r) => r.currency === 'USD');
  assert.equal(usd.sample, 2);
  assert.ok(['$140k to $170k', '$150k to $220k'].includes(usd.median));
  assert.equal(ins.rows.find((r) => r.currency === 'INR').sample, 1);
});

test('interview prep is grounded in required skills the resume has', () => {
  const profile = { skills: [{ name: 'Core Java' }, { name: 'Spring Boot' }], projects: [{ name: 'BankNest' }] };
  const match = {
    missing: [{ name: 'Redis', severity: 'mustHave' }],
    reasons: [{ kind: 'skill', text: 'Your resume shows Core Java, Spring Boot which this role asks for' }]
  };
  const prep = buildPrep(job(), profile, match);
  assert.ok(prep.length >= 4, `expected at least 4 questions, got ${prep.length}`);
  assert.ok(prep.some((q) => q.includes('Core Java')), 'matched skill becomes a question');
  assert.ok(prep.some((q) => q.includes('Redis')), 'gap becomes an honest prep item');
  assert.ok(prep.some((q) => q.includes('BankNest')), 'project walkthrough included');
  assert.ok(prep.every((q) => q.length > 20), 'no stub questions');
});

test('prep falls back to match reasons when the source tagged no skills', () => {
  const profile = { skills: [{ name: 'Core Java' }], projects: [] };
  const prep = buildPrep(job({ requiredSkills: [] }), profile, {
    missing: [],
    reasons: [{ kind: 'skill', text: 'Your resume shows Core Java, MySQL which this role asks for' }]
  });
  assert.ok(prep.some((q) => q.includes('Core Java')));
});
