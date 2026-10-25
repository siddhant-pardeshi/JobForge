// Resume text extraction and structured profile drafting. Parsing happens in
// isolation with size and type limits. Scanned PDFs get an honest fallback
// instead of a fake extraction.

import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { canonicalSkills } from '../taxonomy.js';

const MAX_BYTES = 10 * 1024 * 1024;

export async function extractText(buffer, filename) {
  if (buffer.length > MAX_BYTES) throw new Error('That file is larger than the 10 MB limit');
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.pdf')) {
    const result = await pdfParse(buffer);
    const text = (result.text || '').replace(/\u00AD/g, '').replace(/[ \t]+/g, ' ').trim();
    // Scanned PDFs produce almost no text. Say so instead of guessing.
    if (text.length < 200) {
      return { text, scanned: true, warning: 'This PDF looks scanned because almost no selectable text was found. Type or paste your resume text so the extraction can work on real content.' };
    }
    return { text, scanned: false, warning: null };
  }
  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value.trim(), scanned: false, warning: null };
  }
  if (lower.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported here. Save it as .docx or PDF and upload again.');
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    return { text: buffer.toString('utf8').trim(), scanned: false, warning: null };
  }
  throw new Error('Supported uploads are PDF, DOCX, and plain text');
}

function pick(re, text, group = 0) {
  const m = text.match(re);
  if (!m) return null;
  const value = group > 0 && m[group] ? m[group] : m[0];
  return value.trim();
}

export function draftProfile(text, sourceFile) {
  const clean = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).join('\n');
  // Rebuild spaces lost by PDF extraction so section and skill patterns match.
  const splitClean = clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2');
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  const lower = clean.toLowerCase();

  const email = pick(/[\w.+-]+@[\w-]+\.[\w.]{2,}/, clean);
  const phone = pick(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, clean);
  const linkedin = pick(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+/, clean);
  const github = pick(/https?:\/\/(?:www\.)?github\.com\/[\w-]+/, clean);

  // Name heuristic: the first short line near the top that is not contact info
  // and reads like two or three capitalized words.
  let name = null;
  for (const line of lines.slice(0, 8)) {
    const isContact = /@|linkedin|github|\d{6,}|resume|curriculum/i.test(line);
    const words = line.split(/\s+/);
    const nameLike = words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w));
    if (!isContact && nameLike) { name = line; break; }
  }

  const headline = lines.slice(0, 6).find((l) => /\|/.test(l) && !/@/.test(l)) || null;

  const skillSet = [...new Set(canonicalSkills(clean))];
  // Catch plain named skills the taxonomy may not canonicalize.
  const extras = [];
  for (const extra of ['React Router', 'Hibernate', 'Axios', 'Maven', 'Postman', 'Bootstrap', 'Tailwind', 'Figma', 'Jira', 'VS Code', 'Eclipse']) {
    if (new RegExp(extra.replace(/[.+]/g, '\\$&'), 'i').test(clean) && !skillSet.includes(extra)) extras.push(extra);
  }
  const skills = [...skillSet, ...extras].map((s) => ({ name: s, level: null, evidence: 'Mentioned in your resume', source: 'resume' }));

  const education = [];
  const eduRe = /(b\.?e\.?|b\.?tech|bachelor(?:\s+of)?\s+\w+|m\.?e\.?|m\.?tech|master(?:\s+of)?\s+\w+|mca|bca|diploma)[^\n]{0,120}/gi;
  let match;
  while ((match = eduRe.exec(splitClean)) !== null) {
    const line = match[0].replace(/\s+/g, ' ').trim();
    if (!education.some((e) => e.raw === line)) {
      education.push({ raw: line, institution: null, year: pick(/(20\d{2})/, line) || null, cgpa: pick(/(cgpa|c\.?g\.?p\.?a\.?)\s*[:\-]?\s*(\d{1,2}\.?\d*)/i, line, 2) || null, confirmed: false });
    }
    if (education.length >= 6) break;
  }

  const certifications = [];
  const certRe = /^.*(?:certif|nptel|aws cloud practitioner|gate\s*20\d\d).*$/gim;
  while ((match = certRe.exec(splitClean)) !== null) {
    const line = match[0].replace(/\s+/g, ' ').trim();
    if (line.length > 8 && line.length < 160 && !certifications.some((c) => c === line)) certifications.push(line);
    if (certifications.length >= 8) break;
  }

  const projects = [];
  const projectRe = /^([A-Z][\w &+.-]{2,40})\s*\|\s*([^\n]{10,160})$/gm;
  while ((match = projectRe.exec(clean)) !== null) {
    const name = match[1].trim();
    if (/^(software|resume|curriculum|summary|skills|education|certifications|achievements|technical)/i.test(name)) continue;
    projects.push({ name, blurb: match[2].trim(), confirmed: true });
    if (projects.length >= 8) break;
  }

  // Some PDF fonts emit no space glyphs, so match cities against a squashed copy too.
  const squashed = lower.replace(/\s+/g, '');
  const cityGuess = ['pune', 'mumbai', 'nagpur', 'nashik', 'bengaluru', 'bangalore', 'hyderabad', 'delhi', 'noida', 'chennai'].find((c) => lower.includes(`based in ${c}`) || squashed.includes(`${c},maharashtra`) || lower.includes(`${c}, maharashtra`)) || null;

  const confidence = {
    name: name ? 'high' : 'low',
    email: email ? 'high' : 'none',
    phone: phone ? 'high' : 'none',
    skills: skillSet.length > 4 ? 'high' : 'medium',
    education: education.length ? 'medium' : 'low',
    projects: projects.length ? 'high' : 'low',
    city: cityGuess ? 'medium' : 'low'
  };

  return {
    name,
    headline,
    email,
    phone,
    linkedin,
    github,
    city: cityGuess,
    targetLocations: cityGuess ? [cityGuess[0].toUpperCase() + cityGuess.slice(1)] : [],
    summary: null,
    skills,
    education,
    projects,
    certifications,
    experience: [],
    roleFamilies: [],
    minCompLPA: null,
    noticePeriodDays: null,
    resumeText: clean,
    sourceFile: sourceFile || null,
    extractedAt: new Date().toISOString(),
    confidence
  };
}
