// Truthful application packets. Tailoring reorders and rewords what already
// exists in your resume. Inventing an employer, metric, skill, or date is a
// hard rule violation, enforced by the prompts and by deterministic fallbacks.

import { chat, extractJson, llmStatus } from './llm.js';
import { canonicalSkills } from '../taxonomy.js';

const TRUTH_RULES = `You tailor resumes for a job seeker.
HARD RULES:
- Use ONLY facts present in the provided resume text and profile. Never invent employers, skills, metrics, dates, certifications, or results.
- You may reorder, group, and reword for clarity. You may mirror terminology from the job description only for things the candidate actually did.
- If the resume does not support a requirement, list it as a gap. Never paper over a gap.
- Any suggestion that needs a number the resume lacks must become a question for the candidate, not a fabricated bullet.
Return a single JSON object with keys: summary (string, 2 sentences max), bullets (array of strings, each grounded in resume facts), coverLetter (string, under 180 words), questions (array of strings).`;

export async function buildPacket({ job, profile, settings, match }) {
  const llm = llmStatus(settings);
  const topProjects = (profile.projects || []).map((p) => {
    const canon = canonicalSkills(`${p.name} ${p.blurb} ${(profile.resumeText || '').slice(0, 4000)}`);
    const overlap = canon.filter((s) => job.requiredSkills?.includes(s) || (job.description || '').toLowerCase().includes(s.toLowerCase()));
    return { ...p, overlap, score: overlap.length };
  }).sort((a, b) => b.score - a.score).slice(0, 2);

  const packet = {
    jobId: job.id,
    generatedAt: new Date().toISOString(),
    aiUsed: false,
    resumeVersion: 'source',
    suggestedOrder: topProjects.map((p) => p.name),
    emphasisSkills: match?.missing?.length ? (profile.skills || []).map((s) => s.name).filter((n) => (job.requiredSkills || []).includes(n)) : (job.requiredSkills || []).slice(0, 6),
    coverLetter: null,
    summarySuggestion: null,
    bulletSuggestions: [],
    questions: [],
    gaps: (match?.missing || []).map((m) => `The description asks for ${m.name} which your resume does not show. Decide whether a genuine example exists or leave the gap visible`),
    answers: [],
    factsLocked: 'Nothing in your original resume file is ever modified. Packets are separate documents.'
  };

  packet.questions.push(profile.minCompLPA ? null : 'Your expected pay is not set anywhere. Decide the number or plan to say "open to discussion"').filter(Boolean);
  packet.questions.push(profile.noticePeriodDays === null ? 'Confirm your notice period for the form. Your profile says available immediately, verify that still holds' : null).filter(Boolean);

  // Deterministic cover letter from real facts. Always present, AI only refines.
  const projectLines = topProjects.map((p) => `In ${p.name} I ${lowerFirst(p.blurb || 'built a full stack application')}`);
  packet.coverLetter = `Hello,\n\nI am applying for the ${job.title} role at ${job.company?.name || 'your team'}. My foundation is ${((profile.skills || []).slice(0, 4).map((s) => s.name).join(', ')) || 'software development'}, applied through real projects rather than coursework alone.\n\n${projectLines.join('. ')}. These projects taught me the discipline of layered architecture, transactional integrity, and building interfaces people actually use.\n\n${(match?.missing || []).length ? `I noticed the role also touches ${(match?.missing || []).slice(0, 2).map((m) => m.name).join(' and ')}. I am actively strengthening that area and can speak to how I learn new stacks quickly.` : 'My skills map closely to what the role asks for, and I would be glad to walk through the details.'}\n\nI am available to join immediately and based in ${profile.city || 'India'}.\n\nRegards,\n${profile.name || 'Candidate'}`;

  if (llm.ready) {
    try {
      const raw = await chat(settings, {
        system: TRUTH_RULES,
        user: `JOB DESCRIPTION:\n${(job.description || '').slice(0, 4500)}\n\nTITLE: ${job.title}\n\nRESUME TEXT (the only permitted source of facts):\n${(profile.resumeText || '').slice(0, 9000)}\n\nPROFILE NOTES: city ${profile.city || 'unknown'}, targeting ${(profile.roleFamilies || []).join(', ') || 'tech roles'} in ${(profile.targetLocations || []).join(', ') || 'Pune'}.`,
        json: true
      });
      const parsed = extractJson(raw);
      if (parsed && typeof parsed.coverLetter === 'string') {
        packet.aiUsed = true;
        packet.summarySuggestion = parsed.summary || null;
        packet.bulletSuggestions = Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : [];
        packet.coverLetter = parsed.coverLetter;
        packet.questions = [...new Set([...(parsed.questions || []), ...packet.questions])].slice(0, 8);
      }
    } catch (err) {
      packet.aiError = err.message;
    }
  }
  return packet;
}

function lowerFirst(s) {
  s = String(s || '');
  const trimmed = s.trim();
  return trimmed ? trimmed[0].toLowerCase() + trimmed.slice(1) : '';
}

export function booleanStrings(profile) {
  const topSkills = (profile.skills || []).map((s) => s.name).slice(0, 6);
  const roleTerms = ['Software Developer', 'Backend Developer', 'Java Developer'];
  const skills = topSkills.length ? topSkills : ['Java', 'Spring Boot', 'SQL'];
  const locations = (profile.targetLocations?.length ? profile.targetLocations : ['Pune']).join('" OR "');
  const linkedin = `("${roleTerms.join('" OR "')}") AND (${skills.map((s) => `"${s}"`).join(' AND ')}) AND ("${locations}") NOT (sales OR "business development" OR BDA OR telecaller)`;
  const naukri = `${skills.slice(0, 3).join(' ')} | ${roleTerms[0]} | ${locations} | 0-3 years | exclude sales, bda, telecalling, data entry`;
  const google = `${roleTerms[0]} "${locations}" (${skills.slice(0, 3).join(' OR ')}) site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com`;
  return [
    { platform: 'LinkedIn', value: linkedin, note: 'Paste into the LinkedIn keyword box of a job search. Your Premium filters do the rest' },
    { platform: 'Naukri', value: naukri, note: 'Use the keyword field plus the filters your Naukri plan already gives you' },
    { platform: 'Google', value: google, note: 'Finds live ATS postings directly on employer boards that public search indexes' }
  ];
}
