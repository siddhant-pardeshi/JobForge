// Market intelligence from the live postings already in the store. Every
// number here is derived from real jobs the boards returned. No estimates, no
// invented benchmarks. Sample sizes travel with every figure so the UI can
// show them honestly.

// Aggregate missing must-have skills across live, relevant lanes so the user
// learns which skills the market actually keeps asking for and who asks.
export function aggregateGaps(scoredJobs, opts = {}) {
  const counts = new Map();
  const lanes = opts.lanes || ['best_pune', 'remote', 'relocation'];
  for (const job of scoredJobs) {
    if (!job.match || job.status === 'closed') continue;
    if (!lanes.includes(job.match.lane)) continue;
    for (const m of job.match.missing || []) {
      if (m.severity !== 'mustHave' || !m.name) continue;
      const entry = counts.get(m.name) || { skill: m.name, count: 0, companies: new Set() };
      entry.count += 1;
      if (job.company?.name) entry.companies.add(job.company.name);
      counts.set(m.name, entry);
    }
  }
  return [...counts.values()]
    .map((e) => ({ skill: e.skill, count: e.count, companyCount: e.companies.size, companies: [...e.companies].slice(0, 6) }))
    .sort((a, b) => b.count - a.count || b.companyCount - a.companyCount)
    .slice(0, 10);
}

// Listed pay bands by lane and currency, straight from postings that state a
// salary. Every row carries its sample size, and bands stay in the currency
// the board listed them in. No exchange rates are ever invented.
function median(values) {
  if (!values.length) return null;
  return [...values].sort()[Math.floor(values.length / 2)];
}

export function salaryInsights(scoredJobs) {
  const buckets = new Map();
  let total = 0;
  let listed = 0;
  for (const job of scoredJobs) {
    if (!job.match || job.status === 'closed') continue;
    total += 1;
    if (!job.salary?.known) continue;
    listed += 1;
    const lane = ['best_pune', 'remote', 'relocation'].includes(job.match.lane) ? job.match.lane : 'other';
    const currency = job.salary.currency || 'INR';
    const key = lane + '|' + currency;
    const bucket = buckets.get(key) || { lane, currency, count: 0, natives: [] };
    bucket.count += 1;
    if (job.salary.native) {
      bucket.natives.push(job.salary.native);
    } else if (job.salary.minLPA != null || job.salary.maxLPA != null) {
      const lo = job.salary.minLPA ?? job.salary.maxLPA;
      const hi = job.salary.maxLPA ?? job.salary.minLPA;
      bucket.natives.push('₹' + lo + (hi && hi !== lo ? '-' + hi : '') + ' LPA');
    }
    buckets.set(key, bucket);
  }
  const rows = [...buckets.values()]
    .map((b) => ({ lane: b.lane, currency: b.currency, sample: b.count, median: median(b.natives) }))
    .filter((r) => r.median)
    .sort((a, b) => b.count - a.count);
  return { total, listed, listedPct: total ? Math.round((100 * listed) / total) : 0, rows };
}

// Interview preparation grounded in the job's own required skills and the
// resume. Deterministic: an interviewer asking about this description would
// plausibly ask these, and each one ties to something the candidate can
// actually prepare. Nothing about companies is invented.
export function buildPrep(job, profile, match) {
  const questions = [];
  const missingNames = new Set((match?.missing || []).map((m) => m.name));
  // Required skills named by the description; when the source did not tag
  // any, fall back to skills the match reasons said were satisfied.
  let required = (job.requiredSkills || []).filter(Boolean);
  if (!required.length) {
    required = (match?.reasons || [])
      .filter((r) => r.kind === 'skill')
      .map((r) => (r.text.match(/resume shows ([^.]+)/i) || [])[1])
      .filter(Boolean)
      .flatMap((chunk) => chunk.split(/,\s*|\s+and\s+/))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  required = [...new Set(required)].filter((s) => !missingNames.has(s));

  const skillSet = new Set((profile.skills || []).map((s) => s.name.toLowerCase()));
  const have = required.filter((s) => {
    if (skillSet.has(s.toLowerCase())) return true;
    return (match?.reasons || []).some((r) => r.kind === 'skill' && r.text.toLowerCase().includes(s.toLowerCase()));
  }).slice(0, 4);

  for (const s of have) {
    questions.push(`You list ${s}. Walk through exactly where you used it: which project, what you built, and one outcome you can defend with specifics.`);
  }
  for (const m of (match?.missing || []).slice(0, 3)) {
    questions.push(`The description asks for ${m.name} and your resume does not show it yet. Prepare an honest answer: closest coursework, self study, or a concrete plan to pick it up fast.`);
  }

  const topProject = (profile.projects || [])[0];
  if (topProject?.name) {
    questions.push(`Explain ${topProject.name} end to end: the schema, the APIs, one hard problem you hit, and why the architecture holds under load.`);
  }

  const body = String(job.description || '').toLowerCase();
  const behaviors = [];
  for (const [word, story] of [['own', 'owning a feature'], ['lead', 'leading a piece of work'], ['mentor', 'helping someone grow'], ['scale', 'scaling something under pressure'], ['optimi', 'optimizing something measurable'], ['deadline', 'delivering against a deadline']]) {
    if (body.includes(word) && !behaviors.includes(story)) behaviors.push(story);
    if (behaviors.length >= 2) break;
  }
  for (const story of behaviors) {
    questions.push(`The description mentions ${story}. Prepare one real story with the situation, what you did, and the result.`);
  }

  questions.push('Prepare two questions to ask them: one about the team and code review culture, one about what success looks like in the first 90 days.');

  return questions.slice(0, 8);
}
