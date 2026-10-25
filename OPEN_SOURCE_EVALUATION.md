# Open Source Evaluation

Research date: 25 October 2026. Each candidate below was assessed against the actual needs of this project: resume parsing, job discovery, matching, tracking, and a Windows friendly local setup. Decisions favor small focused dependencies over absorbing large unrelated applications.

## 1. Reactive Resume

* Repository: https://github.com/reactive-resume/reactive-resume
* Purpose: full featured resume builder with import, export, and sharing.
* License observed: MIT. Status checked 25 October 2026: actively maintained.
* What it would have contributed: resume editing UI and document export.
* Decision: not integrated. It is a complete application with its own database, server, and editor ecosystem. Embedding it would add a second stack to maintain for one screen of functionality. JobForge instead parses resumes into an editable profile and generates application packets, which covers the actual workflow (tailoring toward specific jobs) more directly.
* Revisit when: standalone resume authoring and PDF design templates become a priority.

## 2. OpenResume

* Repository: https://github.com/xitanggg/open-resume
* Purpose: browser local resume building and PDF parsing.
* License observed: AGPL 3.0. Status checked 25 October 2026: maintained.
* What it would have contributed: PDF text extraction approach.
* Decision: not integrated, for two reasons. First, the AGPL license would impose copyleft obligations on distribution that the MIT core of this project avoids. Second, its parser targets standard western resume layouts, while the target user's PDF uses fonts that drop space glyphs, which required a purpose built extractor with camel case reconstruction and a synonym taxonomy tuned to Indian tech resumes. That extractor now lives in `server/services/parser.js` and is covered by tests.

## 3. JobSpy

* Repository: https://github.com/speedyapply/JobSpy
* Purpose: scrapes and normalizes results across multiple job boards, including Naukri.
* License observed: MIT. Status checked 25 October 2026: maintained.
* What it would have contributed: instant broad multi board coverage.
* Decision: not integrated. The existence of a scraper establishes nothing about permission to use it against a platform. LinkedIn prohibits third party automation in its user agreement, and direct retrieval of Naukri terms was blocked during preparation, so permission was not established. A paid subscription is not evidence of automation access either. JobForge instead builds discovery on documented public ATS listing interfaces where the access rules are explicit, and treats LinkedIn and Naukri as manual sources with Boolean string support. This is slower to cover companies but honest about what is permitted, which matters when your own accounts are the collateral.

## 4. Playwright

* Repository: https://github.com/microsoft/playwright
* Purpose: browser automation for tests and permitted form filling.
* License observed: Apache 2.0. Status checked 25 October 2026: maintained by Microsoft.
* What it would have contributed: automated form filling and end to end UI tests.
* Decision: deferred. Browser automation tooling grants no permission to automate LinkedIn, Naukri, or any specific service, and the current application modes (discover, prepare, manual handoff, synthetic demo submission) do not require a browser driver. Adding it now would ship attack surface and weight for capability the policy layer does not yet allow. The demo adapter demonstrates the full submission path without touching real employers. Playwright becomes relevant the day a specific employer route is verified and the standing policy authorizes it.

## 5. Public ATS listing interfaces (adopted)

* Greenhouse Job Board API: https://developers.greenhouse.io/job-board.html. Public read only listing endpoint keyed by employer board token. Adopted as a discovery adapter with live verification before a board is saved.
* Lever Postings API: https://github.com/lever/postings-api. Public postings endpoint with hosted application URLs. Adopted as a discovery adapter. The authenticated application POST is a different capability that requires employer credentials, which JobForge never requests.
* Ashby Job Postings API: https://developers.ashbyhq.com/docs/public-job-posting-api. Public board listing endpoint. Adopted as a discovery adapter with the same read only posture.

Listing access is treated strictly as discovery permission. Application submission happens on employer hosted forms or by manual handoff, and the capability matrix in `docs/CAPABILITY_MATRIX.md` records this separation.

## 6. npm dependencies actually used

* express (MIT): HTTP API server.
* multer (MIT): upload handling with type and size limits.
* pdf parse (MIT): PDF text extraction.
* mammoth (MIT): DOCX text extraction.
* react, react dom (MIT): interface.
* react router dom (MIT): navigation.
* framer motion (MIT): the animation system.
* lucide react (ISC): interface icons.
* vite, @vitejs/plugin-react (MIT): build tooling.
* tailwindcss, @tailwindcss/vite (MIT): utility styling layer.
* concurrently (MIT): runs backend and frontend in one command.

Full license texts ship in node_modules for each package and in THIRD_PARTY_NOTICES.md.

## Lessons applied

* Prefer a narrow dependency you can explain line by line over a broad platform you cannot.
* Public API existence never implies submission permission. Capability and permission are tracked separately in this project's design.
* Local extraction tuned to the user's real documents beats a generic parser that fails quietly on them.
