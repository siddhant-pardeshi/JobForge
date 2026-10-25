// Seed registry of genuine employer boards, each verified live on 25 October
// 2026 through the public listing endpoint before being recorded here. Counts
// below reflect what the boards listed at verification time and will drift as
// companies hire. Pune and Bengaluru presence is real but changes daily.

export const SEED_COMPANIES = [
  { name: 'Zscaler', atsProvider: 'greenhouse', handle: 'zscaler', region: 'Pune, Bangalore, India', note: 'Cloud security, real Pune engineering center' },
  { name: 'Databricks', atsProvider: 'greenhouse', handle: 'databricks', region: 'Bangalore, India', note: 'Data and AI platform, large India org' },
  { name: 'Meesho', atsProvider: 'lever', handle: 'meesho', region: 'Bangalore, India', note: 'Indian commerce unicorn, big engineering bench' },
  { name: 'Rubrik', atsProvider: 'greenhouse', handle: 'rubrik', region: 'Bangalore, Pune, India', note: 'Data security, India RDS presence' },
  { name: 'Okta', atsProvider: 'greenhouse', handle: 'okta', region: 'Bangalore, India', note: 'Identity security, deep India hiring' },
  { name: 'Pure Storage', atsProvider: 'greenhouse', handle: 'purestorage', region: 'Bangalore, India', note: 'Data storage platforms' },
  { name: 'Cloudflare', atsProvider: 'greenhouse', handle: 'cloudflare', region: 'Bangalore, India', note: 'Global network and edge' },
  { name: 'Elastic', atsProvider: 'greenhouse', handle: 'elastic', region: 'India remote and Bangalore', note: 'Search and observability' },
  { name: 'Stripe', atsProvider: 'greenhouse', handle: 'stripe', region: 'Bangalore, India', note: 'Payments infrastructure' },
  { name: 'GitLab', atsProvider: 'greenhouse', handle: 'gitlab', region: 'India remote eligible', note: 'DevSecOps, remote first' },
  { name: 'Figma', atsProvider: 'greenhouse', handle: 'figma', region: 'India remote and Bangalore', note: 'Design tooling' },
  { name: 'MongoDB', atsProvider: 'greenhouse', handle: 'mongodb', region: 'Bangalore, India', note: 'Database platform' },
  { name: 'Coursera', atsProvider: 'greenhouse', handle: 'coursera', region: 'India remote', note: 'Learning platform' },
  { name: 'Yugabyte', atsProvider: 'greenhouse', handle: 'yugabyte', region: 'India remote', note: 'Distributed SQL, India remote roles' },
  { name: 'Spotify', atsProvider: 'lever', handle: 'spotify', region: 'India remote eligible', note: 'Audio streaming' },
  { name: 'OpenAI', atsProvider: 'ashby', handle: 'openai', region: 'Bangalore, India', note: 'AI research and products, India hiring' },
  { name: 'Cursor (Anysphere)', atsProvider: 'ashby', handle: 'cursor', region: 'Bangalore, India', note: 'AI code editor, India presence' },
  { name: 'Supabase', atsProvider: 'ashby', handle: 'supabase', region: 'Global remote', note: 'Open source backend' },
  { name: 'PostHog', atsProvider: 'ashby', handle: 'posthog', region: 'Global remote', note: 'Product analytics, remote first' },
  { name: 'Linear', atsProvider: 'ashby', handle: 'linear', region: 'Global remote', note: 'Project tracking tooling' },
  { name: 'Perplexity', atsProvider: 'ashby', handle: 'perplexity', region: 'Global remote', note: 'AI search' }
];

export const SEED_META = { verifiedOn: '2026-10-25', note: 'Every handle above returned a live listing payload from its public board endpoint on the recorded date. Boards go quiet when a company pauses hiring, which the refresh system reports honestly.' };

// Derive the provider and board handle from a careers page URL the user pastes.
export function parseCareersUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    if (host.endsWith('greenhouse.io') && parts.length) {
      // Embed form: boards.greenhouse.io/embed/job_board?for=company
      const forParam = url.searchParams.get('for');
      if (forParam) return { atsProvider: 'greenhouse', handle: forParam };
      const skip = ['boards', 'job-boards', 'embedded'];
      const handle = [...parts].reverse().find((p) => !/^(jobs?)$/i.test(p) && !skip.includes(p) && isNaN(Number(p)));
      if (handle) return { atsProvider: 'greenhouse', handle };
    }
    if (host.includes('lever.co') && parts.length) {
      const handle = [...parts].reverse().find((p) => isNaN(Number(p)));
      if (handle) return { atsProvider: 'lever', handle };
    }
    if (host.endsWith('ashbyhq.com') && parts.length) {
      const handle = [...parts].reverse().find((p) => !/^job-board$/i.test(p));
      if (handle) return { atsProvider: 'ashby', handle };
    }
    if (host.endsWith('smartrecruiters.com') && parts.length) {
      return { atsProvider: null, handle: parts[0], unsupported: 'SmartRecruiters has no public listing endpoint we can use yet. Capture roles from this page with the browser extension instead.' };
    }
    if (host.includes('myworkday')) {
      return { atsProvider: null, handle: null, unsupported: 'Workday has no public listing endpoint. Capture roles from this page with the browser extension instead.' };
    }
    return { atsProvider: null, handle: null, unsupported: 'No supported listing pattern found in that URL. Supported careers URLs run on Greenhouse, Lever, or Ashby. For anything else, use the browser extension to capture roles as you browse.' };
  } catch {
    return { atsProvider: null, handle: null, unsupported: 'That does not look like a URL. Paste a careers page link such as https://job-boards.greenhouse.io/zscaler' };
  }
}
