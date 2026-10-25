# JobForge

**An AI powered job hunt cockpit for tech job seekers in India.**

JobForge reads your resume, hunts verified tech openings from live employer job boards, scores every one with explainable matching, screens recruitment scams before they reach you, prices relocation offers honestly, and tracks every application from shortlist to offer.

Built for a single job seeker first. Runs fully on your own Windows machine. Your resume, your API keys, and your data never leave your storage unless you point an AI provider at them yourself.

* Built and tuned for Siddhant Pardeshi, Java and Spring Boot developer in Pune. Fork it, drop in your own resume, and it retargets to you.

## Why it exists

Most job hunt tools stop at a keyword search. JobForge was designed around the realities of hunting a tech job from Pune in 2026:

* Job boards bury relevant engineering roles under sales and BDA listings at the same software companies. JobForge classifies the actual work described, not the company name, and keeps a visible audit of everything it filtered out.
* Recruiters and WhatsApp forwards demand registration fees, "refundable deposits", and OTPs. JobForge screens any pasted message against 18 fraud indicators and blocks automatic action whenever payment or identity risks appear.
* Total CTC numbers hide the truth about relocation. JobForge separates fixed from variable pay, deposits from recurring rent, and joining bonuses from monthly cash, then tells you whether an offer actually clears your affordability policy.
* Applications vanish into a void. JobForge keeps an honest state machine where "submitted" only counts when a receipt backs it.

## Feature tour

### Resume intelligence
Upload a PDF, DOCX, or pasted text and get an editable structured profile with per fact confidence chips. Skills are matched through a synonym aware taxonomy of 70 plus technologies, so Java 17, SpringBoot, and Spring Data JPA all land correctly even when PDF extraction mangles the spacing. Scanned PDFs are detected and reported honestly instead of guessed at.

### Explainable matching
Every job gets a score out of 100 built from seven transparent components: demonstrated skill fit, responsibility fit, experience fit, location fit, compensation fit, employer evidence, and freshness. Weights are yours to retune in Settings with live sliders. Every card shows the reasons for, the gaps against, and the unknowns, linked to your actual resume facts. Nontechnical roles are excluded, ambiguous ones go to a review lane, and nothing is silently hidden.

### Live discovery from real employer boards
Connect any employer whose careers page runs on Greenhouse, Lever, or Ashby. JobForge verifies the board live before saving it, normalizes every posting into one schema, deduplicates across sources while preserving provenance, and shows a coverage dashboard that distinguishes "zero matching jobs" from "this source could not be checked". LinkedIn and Naukri stay deliberately manual: their terms prohibit automation, so JobForge gives you Boolean search strings and a manual handoff instead of a scraper that could cost you your account.

### Scam and impersonation screening
Paste any suspicious email, WhatsApp text, or job ad. Eighteen weighted indicators cover fee demands, UPI and OTP requests, guaranteed placement promises, shortened links, offer without interview patterns, and more. You get a risk score, a severity band, specific advice per indicator, and a private log. A WhatsApp contact alone is never declared fraudulent, and a payment demand always blocks automation, no matter how good the skill match is.

### Relocation economics
Evaluate any offer against editable city budgets. Three scenarios (cautious, base, favorable) compute monthly surplus, savings margin, and the gap over staying in Pune. Deposits and moving costs are tracked as liquidity needs, never laundered into monthly expenses. Undisclosed pay produces "relocation affordability unknown" plus the exact questions to ask the recruiter, never a fake verdict.

### Application packets, tracked honestly
Forge a packet per role: emphasis suggestions, a grounded cover letter draft, unanswered questions, and gaps stated plainly. Tailoring reorders and rewords what your resume already proves; inventing a metric or employer is a hard rule the AI prompts enforce. The tracker moves applications through a real state machine, treats a click as never enough, keeps submissions pending confirmation until a receipt exists, and blocks duplicate applications.

### Demo mode
A synthetic Pune employer set ships with the app: perfect matches, remote roles, a relocation lure, a senior stretch role, a sales listing that must be excluded, an ambiguous support listing, a bonded role, and a fee demanding scam. Every feature is explorable in ninety seconds with zero configuration.

## AI providers

JobForge works fully without any AI key. When you add one, tailoring and cover letters get sharper, and everything degrades gracefully if the provider fails. Keys are stored in a local file that git never sees.

* **OpenAI** (paid, GPT models)
* **Anthropic Claude** (paid, best writing quality)
* **Groq** (free tier, very fast open models)
* **OpenRouter** (one key, hundreds of models, several free daily options)
* **Ollama** (fully local and offline, your resume never leaves the machine)
* **Z.ai GLM** (GLM models through the Z.ai open platform)
* **Custom** (any OpenAI compatible endpoint)

Configure in Settings, hit Test, and the status dot in the sidebar turns green.

## Quick start (Windows)

Prerequisites: [Node.js 20.19 or newer](https://nodejs.org). Everything else is bundled.

```bash
# inside this folder
npm install

# run it: backend on 8787, animated UI on 5173
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), drop in your resume, and walk the onboarding. That is the whole setup.

Prefer a single process? Build once and let the server serve the finished interface:

```bash
npm run build
npm start
# open http://localhost:8787
```

Run the verification suite any time:

```bash
npm test
```

## Configuration

No `.env` is required. Optional overrides live in `.env.example`. Port defaults to 8787. All other state (profile, keys, tracked jobs, scam log) lives in `server/data/` which is git ignored on purpose. Export everything from Settings at any time.

## Project structure

```
server/            Express API: parsing, scoring, adapters, screening, tracking
  services/        scoring, scam, ats, parser, llm, relocation, tailoring
  taxonomy.js      skill synonyms, role families, nontech filters
  demo.js          synthetic Pune fixture set
client/            React 19 + Vite + Tailwind 4 + Framer Motion interface
test/              16 acceptance tests covering the hard guarantees
docs/              capability matrix and architecture notes
```

## How scoring works

| Component | Points |
| --- | --- |
| Demonstrated skill fit | 30 |
| Responsibility and project fit | 20 |
| Experience and seniority fit | 15 |
| Location and work mode fit | 15 |
| Compensation fit | 10 |
| Employer evidence | 5 |
| Freshness and deadline | 5 |

These are starting values, not hiring probabilities. Unknowns land on neutral middle scores with a visible note, so an unlisted salary never buries a great Pune role but also never triggers a confident relocation recommendation.

## Honest limitations

* Greenhouse, Lever, and Ashby listing access is read only. Applying always happens on the employer's own hosted form or by manual handoff. No tool can submit on your behalf there without employer credentials, and JobForge will never ask for those.
* LinkedIn and Naukri are manual by policy, not by omission. Scraping them risks your account, so the app invests in Boolean strings, paste import, and handoff instead.
* Relocation math uses an editable indicative net rate rather than claiming authority over tax rules. Enter a real offer's take home figure for exact numbers.
* Scanned PDFs report honestly that OCR is not built in yet; paste the text and everything works.
* The app runs while your machine runs. A scheduled background refresh needs an always on deployment, which the clean Express backend makes straightforward later.

## Verification

16 acceptance tests run on every `npm test`, covering the guarantees that matter: sales at a software company is excluded, a genuine engineering role at a bank matches, ambiguous titles go to review, synonyms match without fabricating experience, a Pune role outranks an equivalent relocation role, undisclosed pay keeps roles viable but flags affordability as unknown, overlapping employment is never double counted, payment demands block even perfect matches, a WhatsApp contact alone is not fraud, cross source duplicates merge with provenance, deposits never leak into recurring costs, and resume extraction finds the essentials.

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
