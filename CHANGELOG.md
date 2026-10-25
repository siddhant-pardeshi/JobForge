# Changelog

## 1.3.0

* Access switch in Settings: open the cockpit to everyone or make it private with a six digit code, flippable instantly. Free access is now the default in public mode.
* Jobs view renders 60 cards at a time with a Show 60 more control, instead of mounting the whole board.
* Careers URL detection handles deep Lever, Ashby and Greenhouse posting links.
* Profile edits re rank the board immediately; the score cache signature now covers every scoring input.
* Tracker modal binds to the live record instead of the click time snapshot.
* Gzip compression on all responses; the jobs payload drops from 57 MB to under 9 MB on the wire.

## 1.2.0

* Email fraud screening: reply to mismatches, sender domain against the claimed employer, link text versus real destination, shorteners, urgent plus money combinations. One click screening of the open mail inside Gmail and Outlook.
* Interview rounds with date, time and mode on every tracked application. Today radar with countdowns and browser reminders an hour before each round.
* Self organizing tracker: forging a packet moves a role to Preparing, scheduling a round promotes it to Interview, receipts make submissions count. Live five second refresh.
* Tailored cover letters and ~100 character referral messages in every packet, with copy buttons.
* Autofill memory: values editable in the app and in the extension, last used values remembered, corrections never repeat.
* Narrated voice walkthrough at docs/media/jobforge-walkthrough.wav with the recording script in docs/WALKTHROUGH.md.

## 1.1.0

* Demo dataset removed. 21 verified employer boards seed the registry, ~5,700 live postings on first refresh.
* Scheduled refresh with closure detection: two consecutive misses close a role, reposts reopen it.
* Geography aware lanes: India roles ranked, out of country postings excluded with reasons.
* Chrome helper: capture from LinkedIn, Naukri, Greenhouse, Lever, Ashby, SmartRecruiters, Workday; form autofill; token gated pairing.
* Guided tour with narration through the browser speech engine.

## 1.0.0

* Resume parsing with confidence chips, PDF space loss recovery, 70 skill synonyms.
* Seven component explainable scoring, editable weights, review lanes.
* Scam screening with 18 indicators, relocation economics with Pune comparison, receipt backed application tracker.
* Works fully offline of any AI provider.
