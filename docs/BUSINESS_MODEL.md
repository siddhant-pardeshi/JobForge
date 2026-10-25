# Business Model and Admin Playbook

JobForge is open core. This document states the model plainly so contributors and users always know what is free, what a hosted edition could charge for later, and what running that hosted edition involves. Written for the project owner, Siddhant Pardeshi, who would be the sole admin of any hosted service.

## What is free, forever

The entire local application in this repository: the engine, the interface, the browser helper, live board discovery, scam screening, relocation math, packets, tracker, and the guided tour. MIT licensed. Self hosting is and always will be free, including for every feature listed here. A user who runs `npm install && npm run dev` owes nothing, forever. This is a permanent commitment, because trust is the product in a category full of bots and paid scams.

## The future paid layer, only when it is earned

The plan is simple and user friendly:

1. Ship free and open source. Grow the user base and the repository stars through genuine usefulness.
2. Once there is real demand for convenience, offer an optional hosted edition: the same software running on always on servers, so refresh, reminders, and board polling continue while the user's laptop is closed.
3. Price it at a subsidized rate, not a SaaS premium. The honest anchor: roughly the price of one coffee per month, in INR, far below what job platforms charge for services that do far less. Students and active job seekers are the audience; squeezing them would be self defeating.
4. The hosted edition buys convenience, never exclusivity. Nothing is removed from the local edition to force an upgrade.

## Why nobody is locked in

Every byte of user data exports as JSON with one click. The hosted edition, if it launches, must support one click export and deletion to the same standard. A user who leaves takes everything. This is stated here so it can be held against the project later.

## Admin responsibilities for a hosted edition

If and when the hosted edition launches, the admin (you) owns:

* **Accounts and access.** Email or GitHub sign in, session management, and the rule that one account equals one person. No shared logins, since tokens and reminders are personal.
* **Quotas and fairness.** Board polling costs bandwidth; hosted users get fair per account polling intervals with an admin tunable default, so one heavy user cannot degrade everyone.
* **Keys.** Users bring their own AI keys in the hosted edition too, stored encrypted at rest, never visible to the admin, never logged.
* **Data lifecycle.** Automated backups every six hours with thirty day retention, deletion on request within seventy two hours, and a documented export path. Deletion means everything: profile, parsed resume text, generated documents, embeddings if any, and tokens.
* **Payments.** When the subsidized tier launches, use an Indian first processor such as Razorpay or Cashfree, GST compliant invoices, no automatic renewals without notice, and prorated refunds within seven days. Payment never gates scam screening or tracker basics; those must remain available on the free tier even hosted.
* **Moderation.** The board registry is curated. Admin reviews new source submissions so the hosted edition never lists a scraper target or a shady board. User reports of scam postings are reviewed and reflected in the shared screening heuristics.
* **Incidents.** A simple status page, a changelog, and honest downtime notices. The credibility of this project comes from never pretending.
* **Compliance.** Indian data protection obligations, a plain language privacy page, and no sale of user data in any form, ever.

## What the admin does not do

* Read user resumes, emails, packets, or scam logs. The hosted architecture must be designed so content is inaccessible without the user's session, and this document commits to it in writing.
* Sell, share, or train on user data.
* Introduce dark patterns: no fake scarcity, no nagging paywalls, no removal of already free features.

## Milestones

* Now: local edition, MIT, free, this document.
* Next: community building, issue triage, contributions welcome, focus on starred quality over marketing.
* Later, when demand justifies it: hosted edition with the admin playbook above and subsidized INR pricing.
* Never: selling data, bots that violate platform terms, or guarantees about hiring outcomes.

The measure of success is user outcomes and trust, measured by retention and stars from real usage, not by extraction.
