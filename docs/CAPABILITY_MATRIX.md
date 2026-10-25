# Capability Matrix

State of every capability as of the real data release, 25 October 2026. The categories are strict: something is "tested" only when an automated test or a manual end to end run actually exercised it.

## Implemented and tested

* Resume upload (PDF, DOCX, TXT) with local parsing, confidence reporting, and scanned PDF detection.
* Structured profile extraction with a seventy technology synonym taxonomy, camel case reconstruction for space starved PDFs, projects, education, and certifications.
* Tech only classification: nontech families excluded, ambiguous titles routed to review, geography aware location lanes.
* Live discovery from twenty one pre verified employer boards (Zscaler, Databricks, Meesho, Rubrik, Okta, Pure Storage, Cloudflare, Elastic, Stripe, GitLab, Figma, MongoDB, Coursera, Yugabyte, Spotify, OpenAI, Cursor, Supabase, PostHog, Linear, Perplexity), each verified live against its public endpoint on 25 October 2026.
* Careers URL auto detection: paste any Greenhouse, Lever, or Ashby link and the provider plus handle are derived and probed before saving.
* Scheduled live refresh with honest closed detection: one missed check never closes a role, two consecutive misses mark it closed with a timestamp, reposts reopen automatically, and new postings never duplicate. Covered by automated tests.
* Explainable scoring with editable weights and lanes: Best in Pune, Remote from Pune, Relocation, Needs verification, Filtered out, Closed or redacted.
* Cross source deduplication with provenance preservation.
* Manual job import and browser extension capture, both scam screened at intake.
* Scam screening: 18 indicators, severity bands, blocking rules, private log.
* Relocation economics: recurring surplus, savings margin, benefit over Pune, upfront liquidity, policy checks, unknown pay handling.
* Application state machine with receipt backed submissions, confirmation pending handling, and duplicate blocking.
* Answer bank with scope and approval flags, surfaced to the extension autofill.
* Boolean search strings for LinkedIn, Naukri, and Google indexed ATS boards.
* JobForge Helper browser extension: capture on LinkedIn, Naukri, Greenhouse, Lever, Ashby, SmartRecruiters, Workday, and structured data pages; form autofill from approved answers with persistent editable memory (app side editor, extension side editor with sync, and last used value tracking); token gated pairing to localhost only.
* Application packets with tailored cover letter (AI or rules drafted, resume grounded), a roughly one hundred character referral request message with character count, and copy buttons for both.
* Narrated voice walkthrough audio shipped at docs/media/jobforge-walkthrough.wav plus the in app tour and recording script.
* Guided in app tour with spoken narration through the browser speech engine and a matching recording script in docs/WALKTHROUGH.md.
* Data export as JSON and full local reset.
* 21 automated acceptance tests via npm test.

## Implemented, needs your credentials or inputs

* AI tailoring and cover letters: implemented for OpenAI, Anthropic Claude, Groq, OpenRouter, Ollama, Z.ai, and custom endpoints. Recommended order: Groq free tier first, Claude for quality, OpenAI for all round paid. Without a key, deterministic packets are generated.
* Live board coverage: adapters and the seed registry are real, but coverage equals the boards connected. There is no universal company directory and none is claimed.
* Real application handoff: the official apply link opens with your packet beside it; the Helper prefills forms; your click submits.

## Manual handoff by policy

* LinkedIn and Naukri: capture through the extension when you browse, Boolean strings for your subscriptions, manual apply with tracked outcome. Unattended automation is deliberately absent because both platforms prohibit it in their terms.
* Company career pages without a supported ATS: capture with the extension, or paste import.

## Explicitly unsupported

* Solving CAPTCHAs, bypassing rate limits, or hiding automation identity.
* Bulk scraping of LinkedIn, Naukri, or any platform whose terms prohibit it.
* Unattended submission on any platform. The final click is always yours.
* Solving hiring assessments or impersonating you in interviews.
* Automatic acceptance of offers, bonds, or background check attestations.
* Payments, OTP sharing, or banking credentials to anyone, ever.
* Claiming a universal ATS score or interview probability. Numbers shown are transparent rule outputs, not hireability promises.

## Architecture notes

One Express process serves the API and, in production, the built React interface. State is a set of JSON documents under `server/data/` written atomically. Scoring, classification, and closed detection are pure functions over that state, cached per job and profile signature, which makes every displayed judgment reproducible and testable even across five thousand live postings. The refresh scheduler lives in the same process and warms the score cache after every run so the UI stays instant.

Roadmap in priority order: mailbox alert ingestion with revocable scopes, Workday and SmartRecruiters listing adapters if public endpoints appear, an always on deployment guide for continuous refresh, and interview prep reports grounded in dated candidate reports.
