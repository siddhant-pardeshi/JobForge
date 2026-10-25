// Explainable matching engine. Deterministic rules first so every score can
// be traced to a reason. AI explanations are layered on top of these facts,
// never instead of them.

import { ROLE_FAMILIES, NEGATIVE_FAMILIES, AMBIGUOUS_TITLES, canonicalSkills, splitRequirements, normalizeCompany } from '../taxonomy.js';

export const DEFAULT_WEIGHTS = {
  skillFit: 30,
  responsibilityFit: 20,
  experienceFit: 15,
  locationFit: 15,
  compensationFit: 10,
  employerEvidence: 5,
  freshness: 5
};

const INDIA_CITIES = ['pune', 'hinjewadi', 'hinjawadi', 'kharadi', 'magarpatta', 'hadapsar', 'kothrud', 'baner', 'wakad', 'bengaluru', 'bangalore', 'mumbai', 'navi mumbai', 'thane', 'hyderabad', 'chennai', 'gurugram', 'gurgaon', 'noida', 'new delhi', 'delhi', 'kolkata', 'ahmedabad', 'jaipur', 'indore', 'nagpur', 'coimbatore', 'chandigarh', 'mohali', 'kochi', 'trivandrum', 'mysore', 'vadodara', 'surat', 'bhubaneswar', 'lucknow', 'noida'];
const REMOTE_TOKENS = ['remote', 'work from home', 'wfh', 'distributed', 'anywhere'];
const OTHER_REGION_TOKENS = ['united states', 'usa', 'san francisco', 'new york', 'seattle', 'austin', 'boston', 'chicago', 'denver', 'los angeles', 'mountain view', 'santa clara', 'bellevue', 'washington', 'california', 'texas', 'singapore', 'london', 'dublin', 'ireland', 'tokyo', 'japan', 'canada', 'toronto', 'vancouver', 'ontario', 'amsterdam', 'berlin', 'munich', 'paris', 'sydney', 'australia', 'israel', 'tel aviv', 'dubai', 'united arab', 'emea', 'apac', 'latam', 'europe', 'poland', 'spain', 'portugal', 'mexico', 'brazil', 'united kingdom', 'denmark', 'copenhagen', 'aarhus', 'sweden', 'stockholm', 'norway', 'oslo', 'finland', 'helsinki', 'netherlands', 'belgium', 'brussels', 'switzerland', 'zurich', 'austria', 'vienna', 'romania', 'bucharest', 'czech', 'prague', 'hungary', 'budapest', 'warsaw', 'krakow', 'greece', 'italy', 'milan', 'rome', 'turkey', 'istanbul', 'south africa', 'kenya', 'nigeria', 'argentina', 'chile', 'colombia', 'korea', 'seoul', 'china', 'beijing', 'shanghai', 'taiwan', 'hong kong', 'vietnam', 'thailand', 'philippines', 'malaysia', 'indonesia', 'new zealand', 'saudi', 'riyadh', 'qatar', 'doha', 'estonia', 'tallinn', 'lithuania', 'latvia', 'slovakia', 'slovenia', 'croatia'];

function locationOf(job) {
  // Short country codes are checked against the location field only, since
  // "us" and "uk" appear inside ordinary sentence text far too easily.
  const cityWork = `${job.city || ''} ${job.workMode || ''}`.toLowerCase();
  const hay = `${cityWork} ${String(job.description || '').slice(0, 200)}`.toLowerCase();
  const shortCodeHit = /\b(us|uk)\b/.test(cityWork);
  if (/\bpune\b/i.test(hay)) return { place: 'Pune', lane: 'pune' };
  if (REMOTE_TOKENS.some((t) => cityWork.includes(t))) {
    // A remote label only helps if the region includes India or is global.
    const restricted = (OTHER_REGION_TOKENS.some((t) => cityWork.includes(t)) || shortCodeHit) && !/\bindia\b/i.test(cityWork);
    if (restricted) return { place: 'Remote, restricted region', lane: 'outside_india' };
    if (/\bindia\b/i.test(hay) || INDIA_CITIES.some((t) => hay.includes(t))) return { place: 'Remote, India eligible', lane: 'remote' };
    return { place: 'Remote', lane: 'remote' };
  }
  if (/\bindia\b/i.test(hay) || INDIA_CITIES.some((t) => hay.includes(t))) {
    return { place: 'India', lane: 'india' };
  }
  if (OTHER_REGION_TOKENS.some((t) => cityWork.includes(t)) || shortCodeHit) {
    return { place: 'Outside India', lane: 'outside_india' };
  }
  return { place: null, lane: 'unknown' };
}

function hitCount(text, signals) {
  let titleScore = 0;
  let bodyScore = 0;
  const title = String(text.title || '').toLowerCase();
  const body = String(text.body || '').toLowerCase();
  for (const signal of signals) {
    const pattern = new RegExp(`(^|[^a-z])${signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (pattern.test(title)) titleScore += 3;
    else if (pattern.test(body)) bodyScore += 1;
  }
  return { titleScore, bodyScore, total: titleScore + bodyScore };
}

export function classify(job) {
  const text = { title: job.title, body: `${job.company?.name || ''} ${job.description || ''}` };
  const reasons = [];

  for (const [key, family] of Object.entries(NEGATIVE_FAMILIES)) {
    const hits = hitCount(text, family.signals);
    if (hits.titleScore >= 3 || hits.total >= 4) {
      reasons.push(`Title and description read as ${family.label} work, which is outside your technical scope`);
      return { technical: false, family: key, familyLabel: family.label, status: 'excluded', reasons };
    }
  }

  let best = null;
  for (const [key, family] of Object.entries(ROLE_FAMILIES)) {
    const hits = hitCount(text, family.signals);
    if (!best || hits.total > best.hits.total) best = { key, family, hits };
  }
  if (best && (best.hits.titleScore >= 3 || best.hits.total >= 5)) {
    return { technical: true, family: best.key, familyLabel: best.family.label, status: 'technical', reasons: [`Work content signals ${best.family.label}`] };
  }

  const title = String(job.title || '').toLowerCase();
  const ambiguous = AMBIGUOUS_TITLES.find((t) => title.includes(t));
  if (ambiguous) {
    reasons.push(`The title "${job.title}" does not state the actual work clearly enough to classify`);
    reasons.push('Ambiguous roles go to review instead of being silently counted in or out');
    return { technical: null, family: null, familyLabel: 'Needs review', status: 'ambiguous', reasons };
  }

  reasons.push('No strong technical or nontechnical signals were found, so this needs a human glance');
  return { technical: null, family: null, familyLabel: 'Needs review', status: 'ambiguous', reasons };
}

export function parseExperience(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(freshers?|fresh graduate|entry level|0 to 1|0 to 2|0 2 years|no experience required)\b/.test(lower)) return { min: 0, max: 1, text: 'fresher friendly' };
  const range = lower.match(/(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\s*(?:\+)?\s*(?:years?|yrs?)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]), text: `${range[1]} to ${range[2]} years` };
  const minOnly = lower.match(/(\d{1,2})\s*\+\s*(?:years?|yrs?)/);
  if (minOnly) return { min: Number(minOnly[1]), max: null, text: `${minOnly[1]}+ years` };
  return { min: null, max: null, text: null };
}

function totalYearsOfProfile(profile) {
  const history = profile.experience || [];
  const spans = history.map((e) => {
    const start = e.start ? new Date(e.start).getTime() : null;
    const end = e.end ? new Date(e.end).getTime() : (e.current ? Date.now() : null);
    if (!start || !end || end <= start) return 0;
    return (end - start) / (365.25 * 24 * 3600 * 1000);
  });
  return Math.round(spans.reduce((a, b) => a + b, 0) * 10) / 10;
}

export function scoreJob(job, profile, weights) {
  const w = { ...DEFAULT_WEIGHTS, ...(weights || {}) };
  const components = [];
  const reasons = [];
  const missing = [];
  const notes = [];
  let gates = [];

  const classification = job.classification || classify(job);

  // Component: demonstrated skill fit
  const profileSkills = (profile.skills || []).map((s) => s.name);
  const profileCanon = new Set(profileSkills.flatMap((s) => canonicalSkills(s)));
  const { required, preferred } = splitRequirements(job.description);
  let requiredCanon = canonicalSkills(required);
  if (requiredCanon.length === 0) requiredCanon = canonicalSkills(job.description).slice(0, 12);
  const preferredCanon = canonicalSkills(preferred);
  const matched = requiredCanon.filter((s) => profileCanon.has(s));
  const missingSkills = requiredCanon.filter((s) => !profileCanon.has(s));
  const preferredMatched = preferredCanon.filter((s) => profileCanon.has(s));
  const skillRatio = requiredCanon.length ? matched.length / requiredCanon.length : 0.5;
  const preferredBonus = preferredCanon.length ? (preferredMatched.length / preferredCanon.length) * 0.15 : 0;
  const skillFit = Math.min(1, skillRatio + preferredBonus) * w.skillFit;
  components.push({ id: 'skillFit', label: 'Demonstrated skill fit', weight: w.skillFit, earned: Math.round(skillFit * 10) / 10 });
  if (matched.length) reasons.push({ kind: 'skill', text: `Your resume shows ${matched.slice(0, 6).join(', ')} which this role asks for` });
  if (missingSkills.length) {
    missing.push(...missingSkills.map((s) => ({ name: s, severity: 'mustHave' })));
    reasons.push({ kind: 'gap', text: `The description asks for ${missingSkills.slice(0, 4).join(', ')} which your resume does not show yet` });
  }

  // Component: responsibility and project fit
  const profileFamilies = profile.roleFamilies || ['backend'];
  let respEarned = 0;
  if (classification.status === 'technical') {
    if (profileFamilies.includes(classification.family)) {
      respEarned = w.responsibilityFit;
      reasons.push({ kind: 'role', text: `This is ${classification.familyLabel} work, the kind you are targeting` });
    } else if ((ROLE_FAMILIES[classification.family]?.adjacent || []).some((a) => profileFamilies.includes(a))) {
      respEarned = w.responsibilityFit * 0.6;
      reasons.push({ kind: 'role', text: `${classification.familyLabel} sits next to your target families, a reasonable adjacent move` });
    } else {
      respEarned = w.responsibilityFit * 0.2;
      reasons.push({ kind: 'role', text: `${classification.familyLabel} is different from the families you are hunting for` });
    }
  }
  components.push({ id: 'responsibilityFit', label: 'Responsibility fit', weight: w.responsibilityFit, earned: Math.round(respEarned * 10) / 10 });

  // Component: experience and seniority fit
  const myYears = totalYearsOfProfile(profile);
  const exp = job.experienceRange || parseExperience(`${job.title} ${job.description}`);
  let expEarned;
  if (exp.max === null && exp.min === null) {
    expEarned = w.experienceFit * 0.6;
    notes.push('Experience expectation is not stated');
  } else if (exp.max !== null && exp.max <= 1) {
    expEarned = w.experienceFit;
  } else if (exp.max !== null && exp.max <= 3) {
    expEarned = w.experienceFit * 0.8;
  } else if (exp.max !== null && exp.max <= 5) {
    expEarned = w.experienceFit * 0.4;
    notes.push(`Role expects around ${exp.text}, treat as a stretch`);
  } else if (exp.max === null && exp.min !== null && exp.min <= 2) {
    expEarned = w.experienceFit * 0.8;
  } else {
    expEarned = w.experienceFit * 0.15;
    notes.push(`Role expects ${exp.text || 'several years'}, well beyond your current ${myYears} years`);
  }
  components.push({ id: 'experienceFit', label: 'Experience fit', weight: w.experienceFit, earned: Math.round(expEarned * 10) / 10 });

  // Component: location and work mode fit
  const geo = locationOf(job);
  let locEarned = w.locationFit * 0.45;
  let laneLocation = 'unknown';
  if (geo.lane === 'pune') {
    locEarned = w.locationFit;
    laneLocation = 'pune';
    reasons.push({ kind: 'location', text: 'Based in Pune, your primary location' });
  } else if (geo.lane === 'remote') {
    locEarned = w.locationFit * 0.87;
    laneLocation = 'remote';
    reasons.push({ kind: 'location', text: 'Remote role, workable from Pune if India eligibility holds' });
    notes.push('Remote labels can hide country or timezone limits, verify before applying');
  } else if (geo.lane === 'india') {
    locEarned = w.locationFit * 0.4;
    laneLocation = 'relocation';
    reasons.push({ kind: 'location', text: `${geo.place} based, worth it only if the offer clears your relocation policy` });
  } else if (geo.lane === 'outside_india') {
    locEarned = 0;
    reasons.push({ kind: 'location', text: `Located outside India (${geo.place}), so it cannot be worked from Pune` });
  } else {
    notes.push('Location is not stated clearly, it stays in review until verified');
  }
  components.push({ id: 'locationFit', label: 'Location fit', weight: w.locationFit, earned: Math.round(locEarned * 10) / 10 });

  // Component: compensation fit. Unknown salary must not bury a suitable Pune
  // job, so unknowns land on a neutral middle value with a note.
  const sal = job.salary || {};
  let compEarned;
  if (!sal.known) {
    compEarned = w.compensationFit * 0.6;
    notes.push('Pay is undisclosed, relocation affordability stays unknown');
  } else if (!profile.minCompLPA) {
    compEarned = w.compensationFit * 0.75;
    notes.push(`Listed pay is ${sal.minLPA || '?'} to ${sal.maxLPA || '?'} LPA, your own floor is not set yet`);
  } else if (sal.maxLPA && sal.maxLPA >= profile.minCompLPA) {
    compEarned = w.compensationFit;
    reasons.push({ kind: 'pay', text: `Listed pay up to ${sal.maxLPA} LPA clears your minimum of ${profile.minCompLPA} LPA` });
  } else {
    compEarned = w.compensationFit * 0.2;
    reasons.push({ kind: 'pay', text: `Listed pay sits below your minimum of ${profile.minCompLPA} LPA` });
  }
  components.push({ id: 'compensationFit', label: 'Compensation fit', weight: w.compensationFit, earned: Math.round(compEarned * 10) / 10 });

  // Component: employer evidence
  const src = job.source?.type || 'unknown';
  const verified = job.company?.verified;
  const evidenceBase = verified ? 1 : src === 'greenhouse' || src === 'lever' || src === 'ashby' ? 0.9 : src === 'extension' ? 0.7 : src === 'imported' ? 0.6 : 0.4;
  const scamPenalty = (job.scamScore || 0) >= 40 ? 0.5 : 0;
  components.push({ id: 'employerEvidence', label: 'Employer evidence', weight: w.employerEvidence, earned: Math.round(w.employerEvidence * evidenceBase * (1 - scamPenalty) * 10) / 10 });

  // Component: freshness
  let freshEarned = w.freshness * 0.6;
  if (job.postedAt) {
    const days = (Date.now() - new Date(job.postedAt).getTime()) / 86400000;
    if (days <= 7) freshEarned = w.freshness;
    else if (days <= 21) freshEarned = w.freshness * 0.8;
    else if (days <= 45) freshEarned = w.freshness * 0.5;
    else freshEarned = w.freshness * 0.2;
  } else {
    notes.push('Posting date unknown, freshness cannot be verified');
  }
  components.push({ id: 'freshness', label: 'Freshness', weight: w.freshness, earned: Math.round(freshEarned * 10) / 10 });

  const total = Math.round(components.reduce((sum, c) => sum + c.earned, 0) * 10) / 10;
  const gaps = missing.length;

  // Gates and lanes
  if (classification.status === 'excluded') gates.push('nontechnical');
  if ((job.scamScore || 0) >= 70) gates.push('scamRisk');
  if (job.status === 'closed') gates.push('closed');
  if (geo.lane === 'outside_india') gates.push('outside_india');

  let lane = 'needs_verification';
  if (gates.length) lane = 'excluded';
  else if (classification.status === 'ambiguous') lane = 'needs_verification';
  else if (laneLocation === 'pune') lane = 'best_pune';
  else if (laneLocation === 'remote') lane = 'remote';
  else if (laneLocation === 'relocation') lane = 'relocation';

  const stretch = gaps >= 2 || (exp.max !== null && exp.max > 3) || (exp.min !== null && exp.min > myYears + 1);

  return {
    score: total,
    components,
    reasons,
    missing,
    notes,
    gates,
    lane,
    stretch,
    classification,
    location: geo.place,
    coverage: {
      knownFields: ['title', 'company', 'description'].filter((f) => job[f]).length + (sal.known ? 1 : 0) + (job.postedAt ? 1 : 0) + (geo.place ? 1 : 0),
      totalFields: 6
    }
  };
}

export function dedupeKey(job) {
  const company = normalizeCompany(job.company?.name);
  const title = String(job.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);
  const rawCity = String(job.city || 'na').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 30);
  return `${company}:${title}:${rawCity}`;
}

export function mergeDuplicates(jobs) {
  const byKey = new Map();
  for (const job of jobs) {
    const key = dedupeKey(job);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...job, sources: [job.source], allUrls: [...(job.sourceUrls || [])] });
      continue;
    }
    existing.sourceUrls = [...new Set([...(existing.sourceUrls || []), ...allUrlsOf(job)])];
    existing.sources = [...(existing.sources || []), job.source];
    existing.firstSeen = minDate(existing.firstSeen, job.firstSeen);
    if ((job.description || '').length > (existing.description || '').length) existing.description = job.description;
    if (job.salary?.known && !existing.salary?.known) existing.salary = job.salary;
    if (job.postedAt && (!existing.postedAt || new Date(job.postedAt) < new Date(existing.postedAt))) existing.postedAt = job.postedAt;
    if (job.company?.verified) existing.company = { ...existing.company, verified: true };
    existing.seenOnMultipleSources = true;
  }
  return [...byKey.values()];
}

function allUrlsOf(job) { return job.sourceUrls || []; }
function minDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) < new Date(b) ? a : b;
}
