# JobForge

<p align="center">
  <img src="docs/media/banner.svg" alt="JobForge, an AI powered job hunt cockpit" width="880"/>
</p>

<p align="center">
  <a href="https://github.com/siddhant-pardeshi/JobForge/stargazers"><img src="https://img.shields.io/github/stars/siddhant-pardeshi/JobForge?style=for-the-badge&color=ff5c1a&labelColor=0b0b15&logo=github" alt="stars"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff2e88?style=for-the-badge&labelColor=0b0b15" alt="MIT license"/></a>
  <img src="https://img.shields.io/badge/tests-25%20passing-34d399?style=for-the-badge&labelColor=0b0b15" alt="tests"/>
  <img src="https://img.shields.io/badge/node-20%2B-8b5cf6?style=for-the-badge&labelColor=0b0b15&logo=nodedotjs&logoColor=white" alt="node 20 or newer"/>
  <a href="docs/media/jobforge-walkthrough.wav"><img src="https://img.shields.io/badge/voice%20walkthrough-8%20min-22d3ee?style=for-the-badge&labelColor=0b0b15" alt="voice walkthrough"/></a>
  <a href="extension/README.md"><img src="https://img.shields.io/badge/Chrome%20helper-capture%20%2B%20autofill-fbbf24?style=for-the-badge&labelColor=0b0b15&logo=googlechrome&logoColor=white" alt="Chrome helper"/></a>
</p>

<p align="center">
  <a href="https://readme-typing-svg.demolab.com"><img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=17&pause=1100&color=FF8A3D&center=true&vCenter=true&width=720&lines=Real+openings+from+21+verified+employer+boards;Explainable+matching+with+nothing+hidden;Mail+fraud+screening+before+you+trust+anyone;A+tracker+that+organizes+itself+and+reminds+you;Pune+first.+India+wide.+Remote+honest." alt="animated taglines"/></a>
</p>

**An AI powered job hunt cockpit for tech job seekers in India. Real companies, real openings, zero fake data.**

JobForge reads your resume, pulls genuine openings live from verified employer career boards, scores every one with explainable matching, screens recruitment scams before they reach you, prices relocation offers honestly, and tracks every application from shortlist to offer. A companion browser extension captures postings from LinkedIn, Naukri, and any company careers page with one click, and prefills application forms from your approved answers.

Everything runs on your own machine. Your resume, your keys, and your data stay yours.

* Built and tuned for Siddhant Pardeshi, Java and Spring Boot developer in Pune. Fork it, upload your own resume, and it retargets to you.

## Real data, no shortcuts

There is no demo mode and no synthetic dataset anywhere in this project. Every posting you see comes from a live employer board. On first launch, JobForge seeds itself with twenty one companies whose career boards were each verified against their public listing endpoints on 25 October 2026, chosen for genuine India hiring depth:

Zscaler (real Pune engineering center), Databricks, Meesho, Rubrik (Pune presence), Okta, Pure Storage, Cloudflare, Elastic, Stripe, GitLab, Figma, MongoDB, Coursera, Yugabyte, Spotify, OpenAI, Cursor, Supabase, PostHog, Linear, and Perplexity.

The first refresh pulls several thousand live postings. The engine classifies each one by the work it actually describes, so a sales role at a software company never masquerades as an engineering job, and postings outside India are honestly excluded instead of silently cluttering your feed. Sources with a quiet board show their emptiness honestly rather than pretending.

## How the real time updates work

This question deserves a straight answer, so here is the whole mechanism with nothing hidden.

* **A background scheduler polls every connected board on a fixed cadence, every 20 minutes by default.** You can change the interval or pause it on the Sources page. Each poll fetches the full live listing set from each board through its official public endpoint.
* **New postings appear in your cockpit automatically.** Nothing to press.
* **Closed and redacted roles are detected honestly.** A posting that vanishes from its official board gets one grace miss, because boards sometimes drop a listing for an hour. After two consecutive misses it is marked closed with a timestamp, and a dedicated Closed or redacted lane keeps it visible with an explanation. If the employer reposts it, the role reopens on its own and its miss counter resets.
* **The browser extension gives you second by second coverage of LinkedIn and Naukri.** The moment you open a posting on either platform, one click captures it into your cockpit, scored and scam screened within a second. This covers exactly the gap that polling cannot, because those two platforms do not offer public listing endpoints and their terms prohibit automated scraping. The app itself never touches LinkedIn or Naukri servers.
* **While your machine sleeps, the clock pauses.** The scheduler is part of the local server, so updates flow while it runs. An always on deployment of the same Express backend makes it continuous, and nothing in the design blocks that step.

## What about auto apply? The honest answer

JobForge deliberately does not bot LinkedIn or Naukri. Both platforms prohibit automated activity in their terms, and the realistic outcome of a bot is your own account restricted, which costs you far more than the clicks it saves. Instead JobForge compresses the legitimate path to its minimum:

1. A new relevant role appears (board refresh or extension capture) and lands in your cockpit already scored.
2. The Helper extension prefills the application form on the employer's own page from your approved answers, including your name, contact, notice period, and anything else you have approved.
3. You review the prefilled form and press the final submit button yourself, everywhere, always.

That is the fastest safe pipeline that exists, and it is fully automatic right up to the one click that must stay yours.

## Which API key is best

JobForge works completely without any key, and the rules engine handles matching, scoring, screening, tracking, and packets on its own. A key only upgrades the writing quality of cover letters and bullet suggestions. Tested recommendation order for this project:

* **Best free tier: Groq.** A free console key, extremely fast open models, and a generous rate limit. Recommended if you want AI drafting at zero cost. Model suggestion: llama 3.3 70b versatile.
* **Best writing quality: Anthropic Claude.** Cover letters that sound human. Claude Haiku is cheap and excellent, Claude Sonnet if you want the finest output. Recommended if you want the best possible letters and do not mind paying per use.
* **Best all round paid: OpenAI.** gpt-4o-mini is inexpensive and reliable for this workload.
* **Fully private: Ollama.** Runs on your own machine, zero cost, your resume never leaves it. Slower and blunter writing.
* **One key, many models: OpenRouter.** Handy if you want to experiment, with several free daily models.
* **Z.ai GLM** also works through its OpenAI compatible endpoint.

Configure in Settings with a live Test button. Keys are stored in a local file that git never sees, and they travel only to the provider you chose.

## Feature tour

### Resume intelligence
Upload a PDF, DOCX, or pasted text and get an editable structured profile with per fact confidence chips. The parser is tuned for Indian tech resumes, including PDFs whose fonts drop space glyphs: camel case reconstruction and a seventy technology synonym taxonomy mean Java 17, SpringBoot, and REST APIs all land correctly. Scanned PDFs are detected and reported honestly.

### Explainable matching
Every job carries a score out of 100 built from seven transparent components with weights you can retune live. Every card shows the reasons for, the gaps against, and the unknowns. Lanes: Best in Pune, Remote from Pune, Relocation, Needs verification, Filtered out, and Closed or redacted. Nothing is silently hidden, including what the engine rejected and why.

### Genuine discovery with coverage you can audit
Add any Greenhouse, Lever, or Ashby company by pasting its careers URL: the provider and board handle are detected automatically and the board is probed live before saving. A coverage dashboard distinguishes zero matching jobs from a source that could not be checked, and every refresh run is logged with what changed.

### Scam and impersonation screening
Paste any suspicious message, or screen a full email with sender, reply to, and link analysis: eighteen plus weighted indicators including reply to mismatches, free mailbox recruiters, lookalike sender domains, and link text that lies about its destination. The Helper adds a one click Check this email button inside Gmail and Outlook that shows a verdict on the open email, right there in the mailbox. Payment demands block automated action regardless of how good the role looks. A WhatsApp contact alone is never declared fraudulent.

### Relocation economics
Cautious, base, and favorable scenarios compute monthly surplus, savings margin, and the gap over staying in Pune. Deposits and moving costs are liquidity, never laundered into monthly expenses. Undisclosed pay produces affordability unknown plus the exact questions to ask the recruiter.

### Honest tracking with rounds and reminders
A kanban that organizes itself live: forging a packet moves a role to preparing on its own, scheduling an interview round moves it to interview, and a receipt makes the submission count. Every round joins the Today radar with a countdown, and a browser reminder fires an hour before. Submissions count only with receipt evidence, duplicates are blocked, and pause semantics are real.

### Cover letters, referral messages, and autofill memory
Forge a packet per role and get a tailored cover letter that reads your resume against the job description, plus a referral request message of about one hundred characters ready to send to any employee at that company on LinkedIn or Naukri. Both are grounded strictly in your resume facts, both copy with one click, and anything your resume cannot support becomes a question instead of an invention. The Helper extension remembers every value it fills, and the saved autofill data is editable in the app under Settings and inside the extension itself, so a wrong value is fixed once and never autofills wrong again.

### Guided tour with voice
Press Guided tour in the sidebar. A ten step walkthrough navigates the real product and narrates aloud through your browser's built in speech engine, preferring a soft female voice such as Microsoft Zira or Aria. A speaker icon mutes it. Prefer just listening? A full narrated walkthrough recorded with a soft female voice ships in the repo at `docs/media/jobforge-walkthrough.wav`, and the matching script for recording your own video lives in docs/WALKTHROUGH.md.

## Quick start (Windows)

Prerequisites: Node.js 20.19 or newer.

```bash
npm install

# run it: backend on 8787, animated UI on 5173
npm run dev
```

Open http://localhost:5173 and either walk the onboarding or, if you are Siddhant, land straight in a cockpit that already knows your resume. Prefer one process? `npm run build` then `npm start` serves everything from port 8787. Run `npm test` any time for the 21 test verification suite.

### Pair the browser extension (two minutes)

1. Copy the extension token from the Settings page.
2. Open chrome://extensions, enable Developer mode, click Load unpacked, and select the `extension` folder inside this project.
3. Click the JobForge Helper icon, paste the token, press Pair, then Test connection.
4. Open any posting on LinkedIn, Naukri, Greenhouse, Lever, Ashby, SmartRecruiters, Workday, or any page with structured job data, and press Send to JobForge on the page. The posting lands in your cockpit scored. On application forms, press Autofill with JobForge and review before you submit.

The helper remembers every value it fills. Your saved autofill data is editable both in the app under Settings, Autofill data, and inside the helper's own options panel, so a wrong value is corrected once and never autofills wrong again. The complete focused manual, including step by step Naukri and LinkedIn application loops, lives in [docs/EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md).

## Running it on the internet

The cockpit is a personal tool, but sharing it is one command away thanks to public mode:

1. `npm run build` then `npm start`, and flip public mode on by setting `"publicMode": true` inside `server/data/settings.json` (or start with `JOBFORGE_PUBLIC=1`). The server prints a six digit access code in the terminal.
2. Expose it with any HTTPS tunnel, for example cloudflared: `cloudflared tunnel --url http://localhost:8787`.
3. Share the resulting URL. Visitors meet a lock screen and must enter the access code; a correct entry unlocks that browser for thirty days.
4. You on the host machine never see the lock screen, and the browser helper authenticates through its own pairing token.

The gate is deliberately simple and honest: the access code is the only secret, the cookie is HttpOnly and Secure on HTTPS, and every endpoint including exports sits behind it. If you need to revoke access, change the code in settings and restart. For a permanently deployed instance, run the same server on any small VPS behind a reverse proxy with HTTPS.

## Running it without a key

Everything except AI word polish works from the first minute: resume parsing, live board discovery, scheduled refresh, closed detection, scam screening, explainable scoring, relocation math, tracker, extension capture, and rules drafted packets. The sidebar shows AI off, rules mode so you always know.

## Running it with a key

Add the key in Settings, press Test, and the sidebar dot turns green with the model name. From then on, forged packets include an AI drafted summary, bullets, and a cover letter grounded strictly in your resume text, plus a questions list for anything the resume cannot honestly support. Every AI output is labeled as such, and a provider failure falls back to the rules draft with a notice.

## Project structure

```
server/            Express API: parsing, scoring, adapters, refresh, screening, tracking
  services/        scoring, scam, ats, parser, llm, relocation, tailoring, refresh
  seedRegistry.js  the 21 pre verified genuine boards and URL auto detection
client/            React 19 + Vite + Tailwind 4 + Framer Motion interface
extension/         Chrome MV3 helper: capture, autofill with memory, never auto submit
test/              21 acceptance tests covering the hard guarantees
docs/              capability matrix, extension guide, walkthrough script
docs/media/        narrated voice walkthrough audio
tools/             voice generation scripts for regenerating the audio
```

## Scoring weights

Demonstrated skill fit 30, responsibility fit 20, experience fit 15, location fit 15, compensation fit 10, employer evidence 5, freshness 5. Unknowns land on neutral middle scores with a visible note: an unlisted salary never buries a great Pune role, and it never triggers a confident relocation recommendation either.

## Honest limitations

* Listing access is read only. Submission always happens on the employer's own page with your click. No public API allows a job seeker to submit on their behalf without employer credentials, and JobForge will never ask for those.
* LinkedIn and Naukri coverage comes through the extension when you browse, not through scraping. That is a policy choice to protect your accounts.
* Boards go quiet when companies pause hiring. The dashboard says so plainly.
* Relocation math uses an editable indicative net rate rather than claiming tax authority.
* The refresh scheduler runs while your machine does.

## Verification

21 tests run on every npm test: classification edges (sales at a software company excluded, engineering at a bank matched, ambiguous titles routed to review), synonym matching without fabrication, Pune outranking equal relocation roles, unknown pay handling, scam blocking, duplicate protection, cross source merge with provenance, deposit separation, and the new refresh engine: one missed check never closes a role, two do, reposts reopen automatically, and new postings never duplicate. The seeded registry itself is test asserted to be structurally genuine.

## License and the road ahead

MIT. See LICENSE and THIRD_PARTY_NOTICES.md. This project is open core: the local edition is free forever, and a subsidized hosted edition may arrive once the community asks for it, with the full commitment in [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md), including the written promise that self hosting stays free and user data is never sold, read, or trained on. If JobForge saved you time, a star on the repository is the best support there is.
