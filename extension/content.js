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

const FILL_MATCHERS = [
  { test: /first\s*name/i, key: 'firstName' },
  { test: /last\s*name|surname|family\s*name/i, key: 'lastName' },
  { test: /full\s*name|^name$|candidate\s*name|your\s*name|applicant\s*name/i, key: 'name' },
  { test: /email|mail\s*id/i, key: 'email' },
  { test: /phone|mobile|contact\s*number/i, key: 'phone' },
  { test: /current\s*city|^city$|town/i, key: 'city' },
  { test: /linkedin/i, key: 'linkedin' },
  { test: /github/i, key: 'github' },
  { test: /portfolio|website|blog/i, key: 'github' },
  { test: /notice\s*period|notice/i, key: 'notice' },
  { test: /expected\s*(ctc|salary)|salary\s*expectation|expected\s*compensation/i, key: 'salary' },
  { test: /current\s*(ctc|salary)/i, key: 'currentSalary' },
  { test: /relocat/i, key: 'relocation' },
  { test: /experience.*years|total\s*experience|years\s*of\s*experience|experience\s*\(?\s*in\s*years\s*\)?/i, key: 'experience' },
  { test: /why.*hire|why.*you|cover\s*letter|about\s*yourself|summary/i, key: 'why', textarea: true }
];

// Merge locally saved corrections over the server packet, then remember every
// value actually used so a fill is never lost or repeated wrongly.
async function resolveFillValues() {
  const local = await new Promise((r) => chrome.storage.local.get(['fields', 'lastUsed'], (s) => r(s)));
  const localFields = local.fields || {};
  let server = null;
  try {
    const res = await fetch(`${SERVER()}/api/extension/packet`, { headers: { 'x-jobforge-token': token } });
    if (res.ok) server = (await res.json()).contact || {};
  } catch { /* offline: local values still work */ }
  const values = {};
  for (const key of ['name', 'email', 'phone', 'city', 'linkedin', 'github', 'notice', 'salary', 'relocation', 'experience', 'why']) {
    values[key] = localFields[key] || server?.[key] || local.lastUsed?.[key] || '';
  }
  values.firstName = (values.name || '').split(' ')[0] || '';
  values.lastName = (values.name || '').split(' ').slice(1).join(' ') || '';
  return { values, usedLocal: Object.keys(localFields || {}).length > 0 };
}

async function autofill() {
  if (!token) { say('Pair first: paste your JobForge token in the helper options.'); return; }
  say('Reading your saved autofill data...');
  const { values } = await resolveFillValues();

  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea')];
  let filled = 0;
  const used = {};
  for (const el of fields) {
    if (el.dataset.jfFilled) continue;
    const label = labelFor(el);
    if (!label && !el.name && !el.id) continue;
    for (const m of FILL_MATCHERS) {
      if (m.textarea && !(el instanceof HTMLTextAreaElement)) continue;
      if (m.test.test(label)) {
        const value = values[m.key];
        if (value && String(value).trim() && String(value) !== 'null') {
          setValue(el, String(value));
          el.dataset.jfFilled = '1';
          used[m.key] = String(value);
          filled++;
        }
        break;
      }
    }
  }
  if (filled > 0) {
    chrome.storage.local.set({ lastUsed: { ...values, ...used } });
    say(`Filled ${filled} field${filled > 1 ? 's' : ''} from your saved data, which is now remembered. Review everything, then press submit yourself.`);
  } else {
    say('No recognizable fields matched here. Nothing was changed. Edit your values in the helper options if needed.');
  }
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

// ---------- email screening on Gmail and Outlook web ----------
// Reads only the single email currently open on screen, when the user presses
// the check button. No background reading, no history access, no scraping.

function isMailSite() {
  const host = location.hostname;
  return host.includes('mail.google.com') || host.includes('outlook.') || host.includes('.mail.');
}

function currentEmail() {
  if (!isMailSite()) return null;
  let from = '';
  let subject = '';
  let bodyEl = null;

  if (location.hostname.includes('mail.google.com')) {
    subject = document.querySelector('h2.hP')?.textContent?.trim() || '';
    const fromEl = document.querySelector('.gD');
    from = fromEl?.getAttribute('email') || fromEl?.getAttribute('name') || fromEl?.textContent || '';
    const senderName = document.querySelector('.gD')?.textContent?.trim() || '';
    bodyEl = document.querySelector('.a3s.aiL, .a3s');
    if (senderName && !/@/.test(from)) from = `${senderName} <${from}>`;
  } else {
    // Outlook web: best effort across its frequent markup changes.
    subject = document.querySelector('[role="heading"][aria-level="2"], .AllowTextSelection span[aria-hidden="false"]')?.textContent?.trim() || '';
    from = document.querySelector('[aria-label^="From"], .PersonalWellBeing span[title*="@"]')?.getAttribute('title')
      || document.querySelector('[class*="ItemHeader"] [title*="@"]')?.getAttribute('title') || '';
    bodyEl = document.querySelector('[aria-label="Message body"], [class*="MessageBody"], [role="document"]');
  }

  const body = bodyEl ? (bodyEl.innerText || '').trim() : '';
  const links = bodyEl
    ? [...bodyEl.querySelectorAll('a')].slice(0, 30).map((a) => ({ text: (a.textContent || '').trim().slice(0, 90), href: a.href }))
    : [];
  if (!subject && !body) return null;
  return { from, replyTo: '', subject, body: body.slice(0, 8000), links, platform: 'email' };
}

async function checkEmail() {
  if (!token) { say('Pair first: paste your JobForge token in the helper options.'); return; }
  const mail = currentEmail();
  if (!mail) { say('Open the email you want checked, then press the button again.'); return; }
  say('Screening this email...');
  try {
    const res = await fetch(`${SERVER()}/api/mail/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-jobforge-token': token },
      body: JSON.stringify(mail)
    });
    const data = await res.json();
    if (!res.ok) { say(data.error || 'The screen failed. Is JobForge running?'); return; }
    showEmailVerdict(data.result);
  } catch {
    say('Could not reach JobForge on localhost:8787. Start it with npm run dev or npm start.');
  }
}

const VERDICT_COLORS = { clear: '#34d399', low: '#22d3ee', medium: '#fbbf24', high: '#fb4d4d', critical: '#fb4d4d' };
const VERDICT_LABELS = { clear: 'No strong indicators', low: 'Low risk', medium: 'Medium risk', high: 'High risk', critical: 'Critical: likely fraud' };

function showEmailVerdict(result) {
  let panel = document.getElementById('jf-mail-verdict');
  if (panel) panel.remove();
  panel = document.createElement('div');
  panel.id = 'jf-mail-verdict';
  const color = VERDICT_COLORS[result.severity] || '#fbbf24';
  const topFlags = result.flags.slice(0, 4);
  panel.style.cssText = `position:fixed;right:22px;bottom:120px;z-index:2147483000;width:330px;background:rgba(14,14,22,0.96);border:1px solid ${color}66;border-radius:16px;padding:14px;font-family:'Inter',-apple-system,sans-serif;color:#f5f3ef;box-shadow:0 16px 48px rgba(0,0,0,0.5);`;
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="font-size:13px;color:${color};">${VERDICT_LABELS[result.severity] || result.severity} · ${result.score}/100</strong>
      <span id="jf-mail-close" style="cursor:pointer;color:#6b6779;font-size:14px;">×</span>
    </div>
    ${result.replyTo ? `<div style="font-size:10.5px;color:#8b8496;margin-bottom:6px;">Reply-to: ${result.replyTo}</div>` : ''}
    ${topFlags.length ? topFlags.map((f) => `
      <div style="margin:6px 0;padding:7px 9px;background:rgba(255,255,255,0.045);border-radius:9px;">
        <div style="font-size:11.5px;font-weight:600;">${f.critical ? '<span style="color:#ffa2a2;">⚠ </span>' : ''}${f.label}</div>
        <div style="font-size:10.5px;color:#a09bae;margin-top:2px;">${f.advice}</div>
      </div>`).join('')
      : '<div style="font-size:11.5px;color:#8af0c8;margin:8px 0;">No fraud indicators found in this email. Stay alert with links as usual.</div>'}
    <div style="font-size:10px;color:#6b6779;margin-top:8px;">Checked locally by JobForge. Nothing left your machine except this screening run. Full log in the app.</div>
  `;
  document.documentElement.appendChild(panel);
  panel.querySelector('#jf-mail-close').addEventListener('click', () => panel.remove());
  setTimeout(() => { const el = document.getElementById('jf-mail-verdict'); if (el) el.remove(); }, 60000);
}

// Swap the floating button into email mode on mail sites.
const originalMaybeInject = maybeInject;
maybeInject = function () {
  if (isMailSite()) {
    const mail = currentEmail();
    mountUI();
    const btn = document.querySelector(`#${UI_ID} button:not(.secondary)`);
    const fillBtn = document.querySelector(`#${UI_ID} button.secondary`);
    if (btn) {
      btn.textContent = '🛡 Check this email';
      btn.title = 'Screen the open email for recruitment fraud with JobForge';
      btn.style.display = mail ? 'block' : 'none';
      // Rebind click: replace node to drop the job capture handler.
      if (!btn.dataset.mailMode) {
        const fresh = btn.cloneNode(true);
        fresh.dataset.mailMode = '1';
        fresh.addEventListener('click', checkEmail);
        btn.replaceWith(fresh);
      }
    }
    if (fillBtn) fillBtn.style.display = 'none';
    return;
  }
  originalMaybeInject();
};
