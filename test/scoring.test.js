import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, scoreJob, mergeDuplicates, parseExperience } from '../server/services/scoring.js';
import { analyzeScam } from '../server/services/scam.js';
import { evaluateOffer } from '../server/services/relocation.js';
import { draftProfile } from '../server/services/parser.js';

const PROFILE = {
  name: 'Test Candidate',
  city: 'Pune',
  targetLocations: ['Pune'],
  roleFamilies: ['backend'],
  minCompLPA: null,
  skills: [
    { name: 'Core Java' }, { name: 'Spring Boot' }, { name: 'MySQL' }, { name: 'REST APIs' }, { name: 'React' }, { name: 'SQL' }, { name: 'Git' }
  ],
  experience: [],
  weights: undefined
};

const baseJob = (over = {}) => ({
  id: 't1',
  title: 'Java Backend Developer',
  company: { name: 'Acme Systems', verified: false },
  city: 'Pune, Hinjewadi',
  workMode: 'Hybrid',
  description: 'You will build Spring Boot REST APIs with MySQL. Must have Java, Spring Boot, SQL, REST API design. Nice to have: Docker, React. Experience 0 to 2 years.',
  salary: { known: true, minLPA: 6, maxLPA: 9 },
  postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  source: { type: 'imported' },
  scamScore: 0,
  scamFlags: [],
  ...over
});

test('a sales role at a software company is excluded, not matched', () => {
  const c = classify({ title: 'Sales Executive', company: { name: 'CloudNine Software' }, description: 'Selling our SaaS product, cold calling, lead generation, targets and incentives. No coding.' });
  assert.equal(c.status, 'excluded');
  assert.equal(c.technical, false);
});

test('a genuine engineering role at a nontechnology employer matches', () => {
  const c = classify({ title: 'Software Engineer', company: { name: 'Union Bank of India' }, description: 'Develop and maintain Java Spring Boot services for our core banking platform, REST APIs, MySQL, unit testing.' });
  assert.equal(c.status, 'technical');
});

test('an ambiguous support listing goes to review instead of silently qualifying', () => {
  const c = classify({ title: 'Customer Support Executive', company: { name: 'Some Services' }, description: 'Handle customer calls, log tickets, maintain CSAT, rotational shifts, walk in interviews.' });
  assert.equal(c.status, 'ambiguous');
});

test('valid synonyms match without fabricating experience', () => {
  const result = scoreJob(baseJob({ title: 'Backend Engineer', description: 'Requirements: Java 17, SpringBoot, MySQL queries, RESTful services. 1 year experience.' }), PROFILE, undefined);
  const skill = result.components.find((c) => c.id === 'skillFit');
  assert.ok(skill.earned >= skill.weight * 0.7, `expected strong skill fit, got ${skill.earned}/${skill.weight}`);
  assert.ok(result.missing.every((m) => !/Java|Spring Boot|MySQL/i.test(m.name)));
});

test('a suitable Pune role outranks an equivalent relocation role under comparable conditions', () => {
  const pune = scoreJob(baseJob(), PROFILE, undefined);
  const bengaluru = scoreJob(baseJob({ city: 'Bengaluru, Koramangala' }), PROFILE, undefined);
  assert.ok(pune.score > bengaluru.score, `pune ${pune.score} should beat bengaluru ${bengaluru.score}`);
  assert.equal(pune.match ? pune.match.lane : pune.lane, 'best_pune');
});

test('an undisclosed salary keeps the role viable but flags relocation affordability as unknown', () => {
  const result = scoreJob(baseJob({ salary: { known: false, minLPA: null, maxLPA: null }, city: 'Bengaluru' }), PROFILE, undefined);
  const comp = result.components.find((c) => c.id === 'compensationFit');
  assert.ok(comp.earned > 0, 'unknown pay should not zero the component');
  assert.ok(result.notes.some((n) => /unknown|undisclosed/i.test(n)));
});

test('overlapping employment dates are not double counted', () => {
  const profile = { ...PROFILE, experience: [
    { start: '2024-01-01', end: '2024-12-31' },
    { start: '2024-06-01', end: null, current: true }
  ] };
  const result = scoreJob(baseJob({ title: 'Engineering Lead', description: 'Needs 8+ years of Java and Spring Boot at scale. Deep microservices experience.' }), profile, undefined);
  const exp = result.components.find((c) => c.id === 'experienceFit');
  assert.ok(exp.earned < exp.weight * 0.5, 'a 1.5 year profile should not score near full on an 8+ year role');
});

test('experience parser reads common formats', () => {
  assert.deepEqual(parseExperience('0-2 years experience'), { min: 0, max: 2, text: '0 to 2 years' });
  assert.deepEqual(parseExperience('requires 4+ years'), { min: 4, max: null, text: '4+ years' });
  assert.deepEqual(parseExperience('open to freshers'), { min: 0, max: 1, text: 'fresher friendly' });
});

test('payment demand blocks the role even with an excellent skill match', () => {
  const scammy = baseJob({ title: 'Java Backend Developer', description: 'Great Java Spring Boot MySQL role. Just pay a registration fee of ₹499 to confirm your interview slot. Kindly deposit the amount via UPI today.' });
  const scan = analyzeScam(scammy.description);
  assert.ok(scan.score >= 70, `expected critical score, got ${scan.score}`);
  const result = scoreJob({ ...scammy, scamScore: scan.score, scamFlags: scan.flags }, PROFILE, undefined);
  assert.ok(result.gates.includes('scamRisk'));
  assert.equal(result.lane, 'excluded');
});

test('a WhatsApp contact alone is not declared fraudulent', () => {
  const scan = analyzeScam('Our HR will coordinate the interview on WhatsApp +91 98765 43210. Reach out anytime between 10am and 6pm.');
  assert.ok(scan.severity === 'low' || scan.severity === 'clear' || scan.severity === 'medium', `got ${scan.severity}`);
  assert.ok(scan.score < 70, 'mild channel signals must never auto block');
});

test('the same requisition from two sources merges into one with preserved provenance', () => {
  const a = baseJob({ id: 'a', source: { type: 'greenhouse', id: 'acme' }, sourceUrls: ['https://boards.greenhouse.io/acme/jobs/1'], firstSeen: '2026-10-20T00:00:00Z' });
  const b = baseJob({ id: 'b', source: { type: 'lever', id: 'acme' }, sourceUrls: ['https://jobs.lever.co/acme/1'], firstSeen: '2026-10-22T00:00:00Z' });
  const merged = mergeDuplicates([a, b]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sources.length, 2);
  assert.equal(merged[0].firstSeen, '2026-10-20T00:00:00Z');
  assert.equal(merged[0].sourceUrls.length, 2);
});

test('different requisitions stay distinct even with similar titles', () => {
  const a = baseJob({ id: 'a', city: 'Pune, Hinjewadi' });
  const b = baseJob({ id: 'b', city: 'Pune, Kharadi', title: 'Java Backend Developer' });
  const merged = mergeDuplicates([a, b]);
  assert.equal(merged.length, 2);
});

test('deposits and moving costs stay distinct from recurring living expenses', () => {
  const result = evaluateOffer({
    city: 'Bengaluru',
    inputMode: 'ctc',
    fixedGrossAnnual: 900000,
    deposit: 90000,
    movingCost: 25000,
    employerAssistance: 30000
  });
  assert.notEqual(result.scenarios[1].costs, 0);
  assert.equal(result.upfrontCash, 90000 + 25000 + 45000 - 30000);
  assert.ok(!JSON.stringify(result.recurring).includes('90000'), 'deposit must not leak into recurring figures');
});

test('joining bonus is excluded from monthly figures', () => {
  const result = evaluateOffer({ city: 'Bengaluru', inputMode: 'ctc', fixedGrossAnnual: 900000, joiningBonus: 100000 });
  assert.ok(/one time|excluded/i.test(result.joiningBonusNote));
});

test('only total CTC quoted means affordability stays unknown', () => {
  const result = evaluateOffer({ city: 'Bengaluru', inputMode: 'ctc', fixedGrossAnnual: null, variableAnnual: 200000 });
  assert.equal(result.verdict, 'unknown');
  assert.ok(result.questions.length >= 3);
});

test('resume draft extraction finds the essentials', () => {
  const resume = `SIDDHANT PARDESHI
  Software Developer | Java, Spring Boot, SQL & AWS
  Pune, Maharashtra | 7721917549 | siddhant@example.com
  linkedin.com/in/siddhant-pardeshi | github.com/siddhant-pardeshi
  Skills: Core Java (Java 17), Spring Boot, Spring Data JPA, MySQL, React, AWS
  BankNest | Full Stack Banking Web Application
  Java 17, Spring Boot, MySQL, React
  Education: Bachelor of Engineering, Computer Engineering, CGPA: 8.13 / 10
  AWS Cloud Practitioner Essentials, NPTEL Programming in Java`;
  const draft = draftProfile(resume, 'resume.pdf');
  assert.equal(draft.name, 'SIDDHANT PARDESHI');
  assert.equal(draft.email, 'siddhant@example.com');
  assert.ok(draft.skills.some((s) => s.name === 'Spring Boot'));
  assert.ok(draft.skills.some((s) => s.name === 'Core Java'));
  assert.ok(draft.projects.length >= 1);
  assert.ok(draft.confidence.email === 'high');
});
