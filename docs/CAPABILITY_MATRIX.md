# Capability Matrix

State of every capability as of the first release, 25 October 2026. The categories are strict: something is "tested" only when an automated test or a manual end to end run actually exercised it.

## Implemented and tested

* Resume upload (PDF, DOCX, TXT) with local parsing, confidence reporting, and scanned PDF detection.
* Structured profile extraction: contact, headline, 70 plus skill taxonomy with synonyms, projects, education, certifications, city guess.
* Compressed PDF text handling through camel case reconstruction and plural tolerant matching.
* Tech only classification: nontech families excluded, ambiguous titles routed to review.
* Seven component explainable scoring with editable weights and lane assignment (Best in Pune, Remote from Pune, Relocation, Needs verification, Filtered out).
* Cross source deduplication with provenance preservation and distinct requisition protection.
* Manual job import with scam screening attached at import time.
* Demo mode with a synthetic Pune employer set exercising every lane, a bonded role, and a fee scam.
* Scam screening: 18 indicators, severity bands, blocking rules, private log.
* Relocation economics: recurring surplus, savings margin, benefit over Pune, upfront liquidity, policy checks, unknown pay handling.
* Application state machine with receipt backed submissions, confirmation pending handling, and duplicate blocking.
* Synthetic demo adapter submission with stored receipt evidence.
* Answer bank with scope and approval flags.
* Boolean search strings for LinkedIn, Naukri, and Google ATS indexed boards.
* Data export as JSON and full local reset.
* 16 automated acceptance tests via npm test.

## Implemented, needs your credentials or inputs

* AI tailoring and cover letters: implemented for every provider preset, active once you add a key in Settings. Without a key, deterministic packets are generated instead.
* Live ATS discovery: adapters are implemented and live verified at add time, but coverage depends on the boards you add. No universal company directory exists, so the registry starts empty by design.
* Real application handoff: the official apply link opens with your packet beside it; submission is yours to perform.
* Email alert import: paste based import works today; mailbox integration is a roadmap item requiring explicit narrow scopes.

## Manual handoff by policy

* LinkedIn: search strings, paste import, manual apply with tracked outcome. Automation is deliberately absent because platform terms prohibit it.
* Naukri: same posture. A paid subscription is not an automation license.
* Company career pages without a supported ATS: paste import plus the coverage dashboard's honest "could not check" states.

## Explicitly unsupported

* Solving CAPTCHAs, bypassing rate limits, or hiding automation identity.
* Solving hiring assessments or impersonating you in interviews.
* Automatic acceptance of offers, bonds, or background check attestations.
* Payments, OTP sharing, or banking credentials to anyone, ever.
* Uploading identity documents automatically anywhere.
* Claiming a universal ATS score or interview probability. Numbers shown are transparent rule outputs, not hireability promises.

## Architecture notes

One Express process serves the API and, in production, the built React interface. State is a set of JSON documents under `server/data/` written atomically. Scoring and classification are pure functions over that state, which makes every displayed judgment reproducible and testable. AI calls sit behind one provider abstraction with a strict no fabrication prompt contract and a full fallback path when no provider is configured.

Roadmap in priority order: mailbox alert ingestion with revocable scopes, Workday and SmartRecruiters adapters after verification, scheduled background refresh for always on deployments, and interview prep reports grounded in dated candidate reports.
