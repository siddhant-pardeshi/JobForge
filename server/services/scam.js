// Scam and impersonation screening. Heuristic indicators with weights, an
// honest risk band instead of a binary safe verdict, and recommended next
// steps. A real company name or a polished logo never authenticates a sender.

const INDICATORS = [
  { id: 'fee', weight: 30, critical: true, label: 'Asks for money', test: (t) => /(registration|security|training|processing|placement|documentation|verification|courier)\s*(fee|charge|deposit|cost)|fee\s*(of|is|:)\s*₹?\s*\d|pay.{0,20}₹?\s*\d{3,}/i.test(t), advice: 'No legitimate employer asks candidates to pay anything at any stage. Walk away from this one.' },
  { id: 'paymentVerbs', weight: 25, critical: true, label: 'Direct payment request', test: (t) => /(kindly\s+)?(pay|deposit|transfer|send)\s+(money|₹|rs\.?\s*\d|the (fee|amount))/i.test(t), advice: 'Direct payment requests are the signature of recruitment fraud.' },
  { id: 'upi', weight: 25, critical: true, label: 'UPI or bank details requested', test: (t) => /\b(upi|gpay|google pay|phonepe|paytm)\b/i.test(t) && /\b(pay|paid|payment|deposit|send|transfer|fee|details|amount)\b/i.test(t) || /\b(bank account|account number|ifsc)\b/i.test(t) && /\b(send|share|provide|details)\b/i.test(t), advice: 'Sharing bank details during hiring leads straight to account misuse. Never share them.' },
  { id: 'otp', weight: 25, critical: true, label: 'OTP or credential request', test: (t) => /\botp\b|\bpin\b|card number|cvv|password/i.test(t), advice: 'Nobody doing genuine hiring needs your OTP, PIN, or passwords. This is account takeover.' },
  { id: 'docs', weight: 20, critical: true, label: 'Sensitive document upload demanded', test: (t) => /(aadhaar|aadhar|pan card|passport).{0,40}(share|send|upload|submit|whatsapp)/i.test(t), advice: 'Identity documents are only collected at verified onboarding, never in a chat before an offer you signed.' },
  { id: 'attachmentRisk', weight: 20, critical: true, label: 'Executable attachment', test: (t) => /\.(exe|apk|scr|bat|msi|jar|vbs)\b/i.test(t), advice: 'Recruiters send PDFs, not installers. Executables from hiring contacts are malware.' },
  { id: 'offerNoInterview', weight: 20, critical: true, label: 'Offer without an interview', test: (t) => /(offer letter|selected|selection).{0,80}(without|no|skip).{0,20}(interview|screening|round)|direct offer|instant (offer|selection)/i.test(t), advice: 'Selection without evaluation does not happen at real companies.' },
  { id: 'guaranteed', weight: 12, label: 'Guaranteed job promise', test: (t) => /100%\s*(job|placement|selection)|guaranteed\s*(job|placement)|assured\s*(job|placement)/i.test(t), advice: 'Guarantees are a marketing hook for paid schemes. Real hiring has no guarantee.' },
  { id: 'shortLink', weight: 10, label: 'Shortened or hidden link', test: (t) => /(bit\.ly|tinyurl\.com|t\.me\/|cutt\.ly|is\.gd|rb\.gy|shorturl)/i.test(t), advice: 'Short links hide the real destination. Expand and inspect the domain before clicking.' },
  { id: 'freeMail', weight: 10, label: 'Free email address used for official contact', test: (t) => /@(gmail|yahoo|hotmail|outlook|rediffmail|proton)\./i.test(t), advice: 'Companies recruit from their own domain. A free mailbox claiming to be HR needs verification.' },
  { id: 'telegramWhatsapp', weight: 10, label: 'Moved to Telegram or WhatsApp only', test: (t) => /(telegram|whatsapp)\s*(only|par|group|number|\+)|join.{0,20}(telegram|whatsapp)/i.test(t), advice: 'Pushing hiring to private chat dodges every platform protection. Verify the company independently first.' },
  { id: 'interviewOnChat', weight: 10, label: 'Interview scheduled only on chat app', test: (t) => /(interview|screening).{0,40}(whatsapp|telegram)/i.test(t), advice: 'Real interviews happen on official meeting links or in person. Verify the interviewer identity.' },
  { id: 'urgency', weight: 8, label: 'Artificial urgency', test: (t) => /(urgent|immediately|today only|today|tonight|tomorrow|last date|limited slots|few seats|hurry|right now)/i.test(t), advice: 'Urgency pressure stops you from verifying. Slow down and check the company directly.' },
  { id: 'refundPromise', weight: 10, label: 'Refund promise attached to a fee', test: (t) => /(refundable|money back|will be refunded)/i.test(t) && /(fee|deposit|payment)/i.test(t), advice: 'Refund promises around fees are a classic paid training scheme.' },
  { id: 'dataScheme', weight: 15, label: 'Earn daily scheme wording', test: (t) => /(daily payment|paid daily|earn .{0,20}(per day|daily)|typing work|form filling job|no (skills|qualification) required)/i.test(t), advice: 'Daily payout job ads are almost always fee collection schemes.' },
  { id: 'tooGood', weight: 12, label: 'Pay far above the market for the ask', test: (t) => /(₹|rs\.?|inr)\s*\d{2,}[0-9,]{2,}\s*(per\s*|\/\s*)?(day|daily|month)/i.test(t) && /(no experience|no skills|fresher|work from home|part time)/i.test(t), advice: 'Outsized pay for low effort is bait. Cross check the salary band on the official posting.' },
  { id: 'suspiciousTld', weight: 8, label: 'Odd link destination', test: (t) => /https?:\/\/[^\s]*(\.(xyz|top|club|online|site|icu|buzz|monster|quest))(\/|$|\s)/i.test(t), advice: 'Check where this domain really points before trusting it.' },
  { id: 'personalAsk', weight: 12, label: 'Personal or family details requested', test: (t) => /(father|mother|family| caste |religion|marital).{0,30}(details|name|status)/i.test(t), advice: 'Genuine hiring never collects family, caste, or religious details. Decline.' }
];

export function analyzeScam(text, meta = {}) {
  const body = String(text || '');
  const flags = [];
  let score = 0;
  for (const ind of INDICATORS) {
    if (ind.test(body)) {
      score += ind.weight;
      flags.push({ id: ind.id, label: ind.label, weight: ind.weight, advice: ind.advice, critical: !!ind.critical });
    }
  }
  // A claimed employer whose contact channel does not match its name.
  if (meta.claimedCompany) {
    const company = meta.claimedCompany.toLowerCase().replace(/[^a-z]/g, '');
    const urls = body.match(/https?:\/\/[^\s]+/g) || [];
    const mismatch = urls.length > 0 && !urls.some((u) => u.toLowerCase().includes(company) || company.length < 4);
    if (mismatch) {
      score += 12;
      flags.push({ id: 'domainMismatch', label: 'Link domain does not match the claimed employer', weight: 12, critical: false, advice: 'Open the company website yourself and find its careers page instead of trusting the link.' });
    }
  }
  score = Math.min(100, score);
  const criticalHit = flags.some((f) => f.critical);
  let severity = 'clear';
  if (score >= 70 || (criticalHit && score >= 45)) severity = 'critical';
  else if (score >= 45 || criticalHit) severity = 'high';
  else if (score >= 22) severity = 'medium';
  else if (score >= 12) severity = 'low';

  const blocks = [];
  if (severity === 'high' || severity === 'critical') {
    blocks.push('Automatic actions are blocked for this contact. Nothing will be submitted or disclosed.');
    blocks.push('Verify the employer through its official careers page found by searching the company name yourself, not through links in this message.');
  }
  const steps = [];
  if (score === 0) steps.push('No strong fraud indicators found in the text. Caution is still wise with any unverified contact.');
  for (const f of flags.slice(0, 6)) steps.push(f.advice);
  steps.push('A real company name, an HTTPS link, and a polished logo do not by themselves authenticate the sender.');
  steps.push('Keep this record in your suspicious contact log for future reference.');
  steps.push('If this arrived on a job platform, report it through that platform, for example the Naukri jobseeker alert page or LinkedIn reporting.');

  return {
    score,
    severity,
    flags: flags.sort((a, b) => b.weight - a.weight),
    blocks,
    steps,
    checkedAt: new Date().toISOString(),
    inputLength: body.length
  };
}
