// JobForge Helper content script.
// 1. Detects a job posting on the current page and extracts its facts, with
//    schema.org JobPosting structured data as the primary source and gentle
//    fallbacks per platform.
// 2. Injects a floating Send to JobForge button that captures the posting
//    into the local cockpit, where it is classified, scored and scam screened.
// 3. Offers an Autofill button on application forms that fills fields from the
//    user's JobForge profile and approved answer bank. It never clicks submit.

const SERVER = () => 'http://localhost:8787';

let token = null;
chrome.storage.local.get(['token'], (r) => { token = r.token || null; maybeInject(); });

function platform() {
  const host = location.hostname;
  if (host.includes('linkedin')) return 'linkedin';
  if (host.includes('naukri')) return 'naukri';
  if (host.includes('greenhouse')) return 'greenhouse';
  if (host.includes('lever.co')) return 'lever';
  if (host.includes('ashbyhq')) return 'ashby';
  if (host.includes('smartrecruiters')) return 'smartrecruiters';
  if (host.includes('myworkday')) return 'workday';
  return 'web';
}

function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function fromStructuredData() {
  const out = [];
  for (const tag of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      let data = JSON.parse(tag.textContent);
      const flat = [];
      const walk = (node) => {
        if (!node) return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (typeof node === 'object') {
          if (node['@type'] === 'JobPosting') flat.push(node);
          Object.values(node).forEach(walk);
        }
      };
      walk(data);
      for (const j of flat) {
        const org = j.hiringOrganization || {};
        const loc = Array.isArray(j.jobLocation) ? j.jobLocation[0] : j.jobLocation;
        const addr = loc?.address || {};
        out.push({
          title: j.title || '',
          company: typeof org === 'string' ? org : (org.name || ''),
          city: [addr.addressLocality, addr.addressRegion, addr.addressCountry && (addr.addressCountry.name || addr.addressCountry)].filter(Boolean).join(', '),
          description: stripHtml(j.description || ''),
          postedAt: j.datePosted || null,
          deadline: j.validThrough || null,
          externalId: j.identifier && (j.identifier.value || String(j.identifier)) || null,
          employmentType: j.employmentType || null,
          url: j.url || location.href,
          applyUrl: (j.applicationContact && j.applicationContact.url) || (j.directApply ? location.href : null) || location.href
        });
      }
    } catch { /* malformed structured data, ignore */ }
  }
  return out;
}

function fromPlatformFallback() {
  const p = platform();
  const pick = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
  if (p === 'linkedin') {
    const onJob = location.pathname.includes('/jobs/view/') || document.querySelector('.jobs-unified-top-card');
    if (!onJob) return null;
    return {
      title: pick('.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title h1, h1'),
      company: pick('.jobs-unified-top-card__company-name a, .jobs-unified-top-card__subtitle-name a, .job-details-jobs-unified-top-card__company-name'),
      city: pick('.jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__primary-description-container .world-class-map-pin-and-arrow path') || pick('.jobs-unified-top-card__subtitle'),
      description: pick('.jobs-description__content .show-more-less-html__markup, .jobs-box__html-content'),
      postedAt: null, deadline: null, externalId: (location.pathname.match(/(\d{8,})/) || [])[1] || null,
      url: location.href, applyUrl: location.href
    };
  }
  if (p === 'naukri') {
    const onJob = location.pathname.includes('job-listings') || document.querySelector('.jd-header');
    if (!onJob) return null;
    return {
      title: pick('h1.jd-header-title, h1[class*="styles_JDC__title"], h1'),
      company: pick('.jd-header-company a, a[class*="styles_JDC__companyName"], .jd-header-company'),
      city: pick('.jd-location, span[class*="styles_JDC__locationInfo"]'),
      description: pick('.jd-desc, div[class*="styles_JDC__dang"]') || (document.querySelector('.jd-desc')?.parentElement?.textContent || ''),
      postedAt: null, deadline: null, externalId: (location.pathname.match(/job-listings-(\d+)/) || [])[1] || null,
      url: location.href, applyUrl: location.href
    };
  }
  return null;
}

function currentJob() {
  const cands = fromStructuredData();
  const bestStructured = cands.sort((a, b) => (b.description || '').length - (a.description || '').length)[0];
  const fallback = fromPlatformFallback();
  const job = bestStructured && (bestStructured.description || '').length > 80 ? bestStructured : (fallback || bestStructured);
  if (!job || !job.title) return null;
  return {
    title: (job.title || '').slice(0, 140),
    company: job.company || '',
    city: job.city || '',
    description: job.description || '',
    postedAt: job.postedAt || null,
    deadline: job.deadline || null,
    externalId: job.externalId || null,
    employmentType: job.employmentType || null,
    platform: platform(),
    url: job.url || location.href,
    applyUrl: job.applyUrl || location.href
  };
}

// ---------- floating UI ----------
const UI_ID = 'jobforge-helper-ui';

function styles() {
  return `
  #${UI_ID} { position: fixed; right: 22px; bottom: 22px; z-index: 2147483000; font-family: 'Inter', -apple-system, sans-serif; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
  #${UI_ID} button { border: none; cursor: pointer; border-radius: 12px; padding: 11px 16px; font-size: 13px; font-weight: 600; color: #fff; background: linear-gradient(120deg, #ff5c1a, #ff2e88 55%, #8b5cf6); box-shadow: 0 8px 28px rgba(255, 92, 26, 0.35); transition: transform .15s, box-shadow .2s; }
  #${UI_ID} button:hover { transform: translateY(-2px); box-shadow: 0 12px 34px rgba(255, 46, 136, 0.45); }
  #${UI_ID} button.secondary { background: rgba(18, 18, 28, 0.92); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
  #${UI_ID} .jf-msg { background: rgba(18, 18, 28, 0.95); color: #f5f3ef; padding: 10px 14px; border-radius: 12px; font-size: 12.5px; max-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  `;
}

function mountUI() {
  if (document.getElementById(UI_ID)) return;
  const holder = document.createElement('div');
  holder.id = UI_ID;
  const style = document.createElement('style');
  style.textContent = styles();
  document.documentElement.appendChild(style);

  const fillBtn = document.createElement('button');
  fillBtn.className = 'secondary';
  fillBtn.textContent = '⚡ Autofill with JobForge';
  fillBtn.title = 'Fill this form from your approved JobForge answers. You still press submit.';
  fillBtn.style.display = 'none';
  fillBtn.addEventListener('click', autofill);

  const btn = document.createElement('button');
  btn.textContent = '🔥 Send to JobForge';
  btn.title = 'Capture this posting into your JobForge cockpit';
  btn.addEventListener('click', capture);

  const msg = document.createElement('div');
  msg.className = 'jf-msg';
  msg.style.display = 'none';

  holder.appendChild(msg);
  holder.appendChild(fillBtn);
  holder.appendChild(btn);
  document.documentElement.appendChild(holder);
}

function say(text, ms = 3800) {
  const el = document.querySelector(`#${UI_ID} .jf-msg`);
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, ms);
}

function maybeInject() {
  const job = currentJob();
  const formLikely = document.querySelector('form input, form textarea');
  mountUI();
  const btn = document.querySelector(`#${UI_ID} button:not(.secondary)`);
  const fillBtn = document.querySelector(`#${UI_ID} button.secondary`);
  if (btn) btn.style.display = job ? 'block' : 'none';
  if (fillBtn) fillBtn.style.display = formLikely ? 'block' : 'none';
}

async function capture() {
  if (!token) { say('Pair first: open the JobForge Helper options and paste your token from JobForge Settings.'); return; }
  const job = currentJob();
  if (!job) { say('No posting detected on this page. Open a specific job and try again.'); return; }
  say('Capturing into JobForge...');
  try {
    const res = await fetch(`${SERVER()}/api/extension/capture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-jobforge-token': token },
      body: JSON.stringify({ job })
    });
    const data = await res.json();
    if (!res.ok) { say(data.error || 'Capture failed. Is JobForge running?'); return; }
    if (data.duplicate) { say('Already in your cockpit. Nothing duplicated.'); return; }
    const bits = [];
    if (data.match) bits.push(`score ${Math.round(data.match.score)}`);
    if (data.scan && data.scan.flags > 0) bits.push(`${data.scan.flags} scam indicator${data.scan.flags > 1 ? 's' : ''}`);
    say(`Captured${bits.length ? ` · ${bits.join(' · ')}` : ''}. Open JobForge to review it.`);
  } catch {
    say('Could not reach JobForge on localhost:8787. Start it with npm run dev or npm start.');
  }
}

// ---------- autofill ----------
const FIELD_MATCHERS = [
  { test: /first\s*name/i, key: 'firstName' },
  { test: /last\s*name|surname|family\s*name/i, key: 'lastName' },
  { test: /full\s*name|^name$|candidate\s*name|your\s*name/i, key: 'name' },
  { test: /email|mail\s*id/i, key: 'email' },
  { test: /phone|mobile|contact\s*number/i, key: 'phone' },
  { test: /current\s*city|city|town/i, key: 'city' },
  { test: /linkedin/i, key: 'linkedin' },
  { test: /github/i, key: 'github' },
  { test: /portfolio|website|blog/i, key: 'github' },
  { test: /notice\s*period|notice/i, key: 'notice' },
  { test: /expected\s*(ctc|salary)|salary\s*expectation|ctc/i, key: 'salary' },
  { test: /current\s*(ctc|salary)/i, key: 'currentSalary' },
  { test: /relocat/i, key: 'relocation' },
  { test: /experience.*years|total\s*experience|years\s*of\s*experience/i, key: 'experience' },
  { test: /why.*hire|why.*you|cover\s*letter|about\s*yourself|summary/i, key: 'why', textarea: true }
];

function labelFor(el) {
  const id = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : null;
  return [el.closest('label')?.textContent, id, el.getAttribute('aria-label'), el.placeholder, el.name, el.id]
    .filter(Boolean).join(' ').trim();
}

function setValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function autofill() {
  if (!token) { say('Pair first: paste your JobForge token in the helper options.'); return; }
  say('Fetching your approved answers...');
  let packet;
  try {
    const res = await fetch(`${SERVER()}/api/extension/packet`, { headers: { 'x-jobforge-token': token } });
    packet = await res.json();
    if (!res.ok) { say(packet.error || 'Could not fetch your profile from JobForge.'); return; }
  } catch {
    say('Could not reach JobForge on localhost:8787. Start it first.');
    return;
  }
  const profile = packet.contact || {};
  const answers = {};
  for (const a of packet.answers || []) {
    const q = a.question.toLowerCase();
    if (q.includes('notice')) answers.notice = a.value;
    else if (q.includes('salary') || q.includes('ctc')) answers.salary = a.value;
    else if (q.includes('relocat')) answers.relocation = a.value;
    else if (q.includes('why')) answers.why = a.value;
  }
  answers.firstName = (profile.name || '').split(' ')[0] || '';
  answers.lastName = (profile.name || '').split(' ').slice(1).join(' ') || '';
  Object.assign(answers, profile);

  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea')];
  let filled = 0;
  for (const el of fields) {
    if (el.dataset.jfFilled) continue;
    const label = labelFor(el);
    if (!label && !el.name && !el.id) continue;
    for (const m of FIELD_MATCHERS) {
      if (m.textarea && !(el instanceof HTMLTextAreaElement)) continue;
      if (m.test.test(label)) {
        const value = answers[m.key];
        if (value !== undefined && value !== null && String(value).trim() && String(value) !== 'null') {
          setValue(el, String(value));
          el.dataset.jfFilled = '1';
          filled++;
        }
        break;
      }
    }
  }
  say(filled ? `Filled ${filled} field${filled > 1 ? 's' : ''} from your approved answers. Review everything, then press submit yourself.` : 'No recognizable fields matched here. Nothing was changed.');
}

// Watch single page apps: LinkedIn and Naukri swap content without navigation.
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const el = document.querySelector(`#${UI_ID} .jf-msg`);
    if (el) el.style.display = 'none';
  }
  maybeInject();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
maybeInject();
