import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEmail } from '../server/services/scam.js';

test('a fee demanding email with mismatched reply to is critical', () => {
  const r = analyzeEmail({
    from: 'HR Team <careers.hr2026@gmail.com>',
    replyTo: 'fee.collector@proton.me',
    subject: 'URGENT: Confirm your interview today',
    body: 'Congratulations, you are selected. Pay the registration fee of Rs 499 via UPI today to confirm your interview slot. Limited slots.',
    claimedCompany: 'Infosys'
  });
  assert.equal(r.severity, 'critical');
  const ids = r.flags.map((f) => f.id);
  assert.ok(ids.includes('replyToMismatch'), 'reply to mismatch flagged');
  assert.ok(ids.includes('senderDomainMismatch'), 'sender domain mismatch flagged');
  assert.ok(ids.includes('urgentMoney'), 'urgent money combination flagged');
});

test('a clean corporate interview email stays clear or low', () => {
  const r = analyzeEmail({
    from: 'Priya Sharma <priya.sharma@rubrik.com>',
    replyTo: '',
    subject: 'Rubrik interview invitation, Software Engineer, Pune',
    body: 'Hello, we would like to schedule your technical round on Thursday at 3 PM over Google Meet. Please confirm your availability. No documents needed at this stage.',
    claimedCompany: 'Rubrik'
  });
  assert.ok(['clear', 'low'].includes(r.severity), `got ${r.severity} with score ${r.score}`);
  assert.ok(r.score < 45);
});

test('a link whose text lies about its destination is flagged', () => {
  const r = analyzeEmail({
    from: 'Talent Team <talent@tcs-careers-portal.xyz>',
    subject: 'Offer letter attached',
    body: 'Download your offer from careers.tcs.com and confirm. TCS hiring team.',
    links: [{ text: 'careers.tcs.com', href: 'https://phishing-site.ru/offer.pdf' }],
    claimedCompany: 'TCS'
  });
  const ids = r.flags.map((f) => f.id);
  assert.ok(ids.includes('linkTextMismatch'), 'link text mismatch flagged');
  assert.ok(r.score >= 12, `expected at least low risk, got ${r.score}`);
  // And a clean link to the real domain never gets the mismatch flag.
  const clean = analyzeEmail({
    from: 'Priya <priya.sharma@rubrik.com>',
    subject: 'Offer letter attached',
    body: 'Download your offer and confirm.',
    links: [{ text: 'careers.tcs.com', href: 'https://careers.tcs.com/offer.pdf' }],
    claimedCompany: 'TCS'
  });
  assert.ok(!clean.flags.some((f) => f.id === 'linkTextMismatch'), 'matching link stays clean');
});

test('no claimed company still screens the body honestly', () => {
  const r = analyzeEmail({ from: 'someone@random.org', subject: 'Job opportunity', body: 'We saw your profile and would like to schedule a call this week to discuss a Java developer role.' });
  assert.ok(r.score < 45, `unsolicited but ordinary mail should not panic, got ${r.score}`);
});
