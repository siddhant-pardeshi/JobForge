# JobForge

<p align="center">
  <img src="docs/media/banner.svg" alt="JobForge" width="880"/>
</p>

<p align="center">
  <a href="https://github.com/siddhant-pardeshi/JobForge/stargazers"><img src="https://img.shields.io/github/stars/siddhant-pardeshi/JobForge?style=for-the-badge&color=ff5c1a&labelColor=0b0b15&logo=github" alt="stars"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff2e88?style=for-the-badge&labelColor=0b0b15" alt="MIT license"/></a>
  <img src="https://img.shields.io/badge/tests-30%20passing-34d399?style=for-the-badge&labelColor=0b0b15" alt="tests"/>
  <img src="https://img.shields.io/badge/node-20%2B-8b5cf6?style=for-the-badge&labelColor=0b0b15&logo=nodedotjs&logoColor=white" alt="node 20 or newer"/>
  <a href="docs/media/jobforge-walkthrough.wav"><img src="https://img.shields.io/badge/voice%20walkthrough-8%20min-22d3ee?style=for-the-badge&labelColor=0b0b15" alt="voice walkthrough"/></a>
  <a href="extension/README.md"><img src="https://img.shields.io/badge/Chrome%20helper-capture%20%2B%20autofill-fbbf24?style=for-the-badge&labelColor=0b0b15&logo=googlechrome&logoColor=white" alt="Chrome helper"/></a>
</p>

<p align="center">
  <a href="https://readme-typing-svg.demolab.com"><img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=17&pause=1100&color=FF8A3D&center=true&vCenter=true&width=720&lines=Real+openings+from+21+verified+employer+boards;Every+match+scored+and+explained;Mail+fraud+screening+inside+Gmail+and+Outlook;A+tracker+that+organizes+itself;Pune+first.+India+wide.+Remote+honest." alt="typing"/></a>
</p>

JobForge is a job hunt cockpit for software engineers in India. Point it at your resume, and it pulls live openings from 21 employer career boards (Zscaler Pune, Databricks, Meesho, Rubrik, Okta, Stripe, GitLab, Figma, MongoDB, OpenAI and more), scores each one against your actual skills, flags scam mails before you reply, drafts your cover letter and referral note, and keeps the whole pipeline on a board that updates itself.

It runs on your machine. Your resume and keys never leave it.

```bash
git clone https://github.com/siddhant-pardeshi/JobForge.git
cd JobForge
npm install
npm run dev
```

Open http://localhost:5173, drop in your resume, done. Want the single process version? `npm run build && npm start` and use http://localhost:8787.

## Why engineers are starring this

**Every posting is real.** The 21 boards in the registry were each verified against their live endpoints before shipping. First refresh pulls ~5,700 openings. A scheduler rechecks every board every 20 minutes; a role that leaves its board is marked closed after two consecutive misses and reopens if it comes back. No filler listings, no scraped garbage.

**Scores you can argue with.** Each job gets a 0 to 100 score from seven weighted components: skill fit 30, responsibility 20, experience 15, location 15, pay 10, employer evidence 5, freshness 5. Open any card to see which skills matched, which are missing, and why it landed in its lane. Tune the weights live in Settings and the whole board re ranks.

**It reads your resume properly.** PDF, DOCX or pasted text. The parser handles the space eating fonts Indian resume templates love: SpringBoot still maps to Spring Boot, Java 17 still counts as Core Java, and JavaScript never gets mistaken for Java. Every extracted fact carries a confidence chip you can correct.

**Scam screening that earns its keep.** Paste any WhatsApp forward, or use the Chrome helper to screen the mail you are reading inside Gmail and Outlook with one click. It checks fee demands, UPI traps, reply to mismatches, sender domains against the claimed employer, and link text that points somewhere else. Fee demand plus great skills match still equals blocked.

**Documents that sound like you.** Forge a packet and get a cover letter built from your resume against that specific job description, plus a ~100 character referral message ready to send to anyone at the company. Nothing gets invented. If the resume does not back a claim, the packet asks you about it instead.

**A tracker that does the dragging for you.** Forge a packet, the card moves to Preparing. Schedule a round, it moves to Interview and shows up on your Today radar with a countdown and a browser reminder an hour before. Attach the receipt, the submission finally counts. The board refreshes itself every five seconds.

## The Chrome helper

The extension in `extension/` pairs with your cockpit in two minutes and works on LinkedIn, Naukri, Greenhouse, Lever, Ashby, SmartRecruiters, Workday, plus Gmail and Outlook:

* **Send to JobForge** captures the posting you are viewing, scored and scam screened within a second.
* **Autofill with JobForge** fills application forms from your saved data. It remembers every value, you can edit any of them in the extension or in the app, and a correction never repeats.
* **Check this email** screens the open mail inline with a color coded verdict panel.

It never presses submit. Not anywhere. LinkedIn and Naukri ban automated activity and the ban lands on your account, so the helper stops one click short and leaves that click to you. That is also why JobForge itself never scrapes those platforms: boards with public APIs get polled, everything else gets captured when you browse it.

Full setup walk through: [docs/EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md).

## AI keys, optional

Everything above works with no key at all. Add one and the cover letters and bullets get sharper:

| Provider | Why | Cost |
| --- | --- | --- |
| Groq | Fastest start, generous limits | Free tier |
| Anthropic Claude | Best cover letter writing | Pay per use |
| OpenAI | Solid all rounder | Pay per use |
| Ollama | Fully offline, resume never leaves the machine | Free |
| OpenRouter, Z.ai, custom | Everything else | Varies |

Settings, add key, press Test. Keys sit in a git ignored local file.

## Hosting it for others

Public mode turns your instance into a shared deployment:

1. `npm start` with `"publicMode": true` in `server/data/settings.json`
2. `cloudflared tunnel --url http://localhost:8787`
3. Share the URL

By default it opens with **free access for everyone**. Settings, Access holds the switch: flip to private and visitors need a six digit code, flip back and the link is open to all. Only you can flip it, using the host machine or the admin code printed at startup, and the access code, admin code and pairing token are never sent to guests.

## What it deliberately does not do

* No CAPTCHA solving, no rate limit evasion, no hidden automation
* No unattended submission on any platform
* No guaranteed interview percentages or magic ATS scores
* Your data never trains anything and never gets sold

## Project layout

```
server/     Express API, scoring, board refresh, fraud engine, access control
client/     React 19, Vite, Tailwind 4, Framer Motion
extension/  Chrome MV3 helper
test/       30 tests, npm test
docs/       guides, walkthrough audio, capability matrix
```

30 tests cover the guarantees that matter: sales roles at software companies stay excluded, engineering roles at banks get matched, Pune beats equal relocation offers, fee demands block automation, closed detection needs two misses, duplicates merge with provenance.

Pull requests welcome, see [CONTRIBUTING.md](CONTRIBUTING.md). Found it useful? A star helps more engineers find it.

## License

MIT. Built in Pune by [Siddhant Pardeshi](https://github.com/siddhant-pardeshi).
