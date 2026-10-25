# Contributing

Glad you want to help. A few ground rules so patches land fast.

## Getting set up

```bash
git clone https://github.com/siddhant-pardeshi/JobForge.git
cd JobForge
npm install
npm test
npm run dev
```

Node 20 or newer. If the 30 tests pass locally, you are good.

## What helps most right now

* **More boards.** The seed registry in `server/seedRegistry.js` lists verified Greenhouse, Lever and Ashby handles. Found a company hiring in India that is missing? Verify the handle against its public endpoint, add a line with the region note, and open a PR. Please only add boards you have actually checked.
* **Location parsing.** Real boards throw every format at us (`Bengaluru, KA, IN`, `Remote, US`, `Distributed`). Improvements to `locationOf` in `server/services/scoring.js` with test cases attached are always welcome.
* **Scam indicators.** New fraud patterns go in `server/services/scam.js`. Include the message text that triggered it (with phone numbers and names stripped) and the expected verdict.
* **Extension coverage.** Naukri and LinkedIn keep changing their DOM. If capture breaks on a page, open an issue with the URL pattern and what you expected.

## Rules of the house

* **No scraping of LinkedIn or Naukri.** Not in core, not in the extension, not behind a flag. Their terms prohibit it and the ban lands on the user, not on us.
* **No auto submit.** The final click on every application stays with the user. Prefill yes, submit no.
* **Nothing invented in application documents.** If a feature could hallucinate an employer, a metric or a date, it does not ship.
* Keep new code covered by a test. `npm test` runs in seconds.

## Pull requests

Small and focused beats large and ambitious. Describe what changed and why, and note anything you could not test. I review within a couple of days.

## Reporting a scam pattern

If you hit a recruitment fraud the screen misses, paste the message into an issue. These get priority because they protect real money.
