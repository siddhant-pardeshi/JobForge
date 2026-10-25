// Relocation and offer economics. Recurring surplus and upfront liquidity are
// computed separately, deposits never count as a monthly expense, and joining
// bonuses never count as recurring income. Numbers here are planning aids,
// not tax advice.

export const DEFAULT_BUDGETS = {
  Pune: { rent: 12000, food: 5000, utilities: 1500, internet: 800, transport: 2000, insurance: 1500, family: 0, debt: 0, other: 2000 },
  Bengaluru: { rent: 18000, food: 5500, utilities: 1600, internet: 800, transport: 2200, insurance: 1500, family: 0, debt: 0, other: 2200 },
  Mumbai: { rent: 24000, food: 6000, utilities: 1800, internet: 800, transport: 2500, insurance: 1500, family: 0, debt: 0, other: 2500 },
  Hyderabad: { rent: 14000, food: 5000, utilities: 1500, internet: 800, transport: 2000, insurance: 1500, family: 0, debt: 0, other: 2000 },
  'Delhi NCR': { rent: 16000, food: 5500, utilities: 1700, internet: 800, transport: 2500, insurance: 1500, family: 0, debt: 0, other: 2200 },
  Chennai: { rent: 13000, food: 5000, utilities: 1500, internet: 800, transport: 2000, insurance: 1500, family: 0, debt: 0, other: 2000 }
};

export const BUDGET_CATEGORIES = [
  { id: 'rent', label: 'Rent or shared housing' },
  { id: 'food', label: 'Food and groceries' },
  { id: 'utilities', label: 'Electricity and water' },
  { id: 'internet', label: 'Internet and phone' },
  { id: 'transport', label: 'Daily commute' },
  { id: 'insurance', label: 'Health insurance' },
  { id: 'family', label: 'Family obligations' },
  { id: 'debt', label: 'Loan payments' },
  { id: 'other', label: 'Everything else' }
];

function sumBudget(b) {
  return BUDGET_CATEGORIES.reduce((sum, c) => sum + (Number(b?.[c.id]) || 0), 0);
}

// Indicative net rate: monthly take home from fixed gross pay. Editable in the
// UI because real slips differ. Deliberately simple, no tax tables claimed.
const DEFAULT_NET_RATE = 0.8;

export function evaluateOffer(input) {
  const city = input.city || 'Bengaluru';
  const netRate = Number(input.netRate) || DEFAULT_NET_RATE;

  let baseNet;
  let basis;
  if (input.inputMode === 'takehome' && input.monthlyTakeHome) {
    baseNet = Number(input.monthlyTakeHome);
    basis = 'You entered the monthly take home figure directly';
  } else if (input.fixedGrossAnnual) {
    const fixed = Number(input.fixedGrossAnnual);
    baseNet = Math.round((fixed * netRate) / 12);
    basis = `Estimated from fixed gross of ₹${fixed.toLocaleString('en-IN')} at an indicative ${Math.round(netRate * 100)} percent net rate. Check a real offer slip for the true figure`;
  } else {
    return {
      verdict: 'unknown',
      headline: 'Relocation affordability unknown',
      basis: 'Pay is undisclosed or only total CTC was quoted, so no confident affordability call is possible',
      questions: ['What is the fixed gross annual component?', 'How much of the CTC is variable and when is it actually paid?', 'What are typical monthly deductions for this band?'],
      note: 'This role can stay a promising lead, but automatic relocation approval waits for real numbers'
    };
  }

  const targetSavings = Number(input.targetMonthlySavings) || 0;
  const otherObligations = Number(input.otherMonthlyObligations) || 0;
  const destBudget = input.budgets?.[city] || DEFAULT_BUDGETS[city] || DEFAULT_BUDGETS.Bengaluru;
  const puneBudget = input.budgets?.Pune || DEFAULT_BUDGETS.Pune;

  const scenarios = [
    { id: 'low', label: 'Cautious', netFactor: 0.9, costFactor: 1.12 },
    { id: 'base', label: 'Base', netFactor: 1, costFactor: 1 },
    { id: 'high', label: 'Favorable', netFactor: 1.08, costFactor: 0.92 }
  ].map((s) => {
    const net = Math.round(baseNet * s.netFactor);
    const costs = Math.round(sumBudget(destBudget) * s.costFactor);
    const surplus = net - costs - otherObligations;
    const puneCosts = Math.round(sumBudget(puneBudget) * s.costFactor);
    const puneSurplus = net - puneCosts - otherObligations;
    return {
      ...s,
      net, costs, surplus,
      savingsMargin: surplus - targetSavings,
      puneCosts, puneSurplus,
      benefit: surplus - puneSurplus
    };
  });

  const deposit = Number(input.deposit) || 0;
  const movingCost = Number(input.movingCost) || 0;
  const assistance = Number(input.employerAssistance) || 0;
  const emergencyBuffer = Number(input.emergencyBuffer) || Math.round(deposit * 0.5);
  const upfrontCash = deposit + movingCost + emergencyBuffer - assistance;

  const policy = input.policy || {};
  const base = scenarios[1];
  const checks = [];
  let verdict = 'worth_considering';
  const verdictNotes = [];

  if (policy.minSurplusMonthly) {
    const ok = base.surplus >= policy.minSurplusMonthly;
    checks.push({ label: `Monthly surplus at least ₹${policy.minSurplusMonthly.toLocaleString('en-IN')}`, ok, actual: base.surplus });
    if (!ok) verdict = 'does_not_meet_policy';
  }
  if (policy.minImprovementOverPune) {
    const ok = base.benefit >= policy.minImprovementOverPune;
    checks.push({ label: `Improves on Pune by ₹${policy.minImprovementOverPune.toLocaleString('en-IN')} monthly`, ok, actual: base.benefit });
    if (!ok) verdict = 'does_not_meet_policy';
  }
  if (policy.maxUpfrontCash) {
    const ok = upfrontCash <= policy.maxUpfrontCash;
    checks.push({ label: `Upfront cash within ₹${policy.maxUpfrontCash.toLocaleString('en-IN')}`, ok, actual: upfrontCash });
    if (!ok) verdict = 'does_not_meet_policy';
  }

  if (verdict === 'worth_considering') verdictNotes.push('Every configured policy check passes on the base scenario');
  else verdictNotes.push('One or more policy checks fail on the base scenario. The role stays visible but relocation is not a confident yes');
  verdictNotes.push('Refundable deposits and moving costs are liquidity needs, not recurring expenses. They are tracked separately on purpose');

  return {
    verdict,
    city,
    basis,
    scenarios,
    upfrontCash,
    upfrontBreakdown: { deposit, movingCost, emergencyBuffer, assistance },
    recurring: { net: base.net, costs: base.costs, otherObligations, targetSavings },
    checks,
    verdictNotes,
    joiningBonusNote: input.joiningBonus ? `The ₹${Number(input.joiningBonus).toLocaleString('en-IN')} joining bonus is one time money and is deliberately excluded from every monthly figure` : null,
    variableNote: input.variableAnnual ? `₹${Number(input.variableAnnual).toLocaleString('en-IN')} is variable pay. It is excluded from the guaranteed monthly cash estimate` : null
  };
}

export function formatLakh(value) {
  if (value === null || value === undefined) return null;
  return `₹${value} LPA`;
}
