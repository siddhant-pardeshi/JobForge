import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salaryFromText } from '../server/services/ats.js';

test('indian LPA, monthly and lakh formats parse to INR LPA bands', () => {
  assert.deepEqual(salaryFromText('Pay: 6 to 9 LPA'), { known: true, minLPA: 6, maxLPA: 9, currency: 'INR' });
  const monthly = salaryFromText('Stipend ₹45,000 - ₹60,000 per month');
  assert.equal(monthly.currency, 'INR');
  assert.equal(monthly.minLPA, 5.4);
  assert.equal(monthly.maxLPA, 7.2);
});

test('international annual bands stay native and never invent an exchange rate', () => {
  const usd = salaryFromText('Total Compensation: $150,000 USD - $220,000 USD annually');
  assert.equal(usd.known, true);
  assert.equal(usd.currency, 'USD');
  assert.equal(usd.native, '$150k to $220k');
  assert.equal(usd.minLPA, null, 'no INR conversion is fabricated');
  const eur = salaryFromText('€70.000 - €90.000 per year');
  assert.equal(eur.currency, 'EUR');
  assert.equal(eur.native, '€70k to €90k');
});

test('no pay stated stays unknown', () => {
  const s = salaryFromText('We offer a great culture and coffee.');
  assert.equal(s.known, false);
});
