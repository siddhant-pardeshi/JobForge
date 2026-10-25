# JobForge Helper: the complete setup and application manual

This guide takes you from zero to a submitted application in the least possible clicks, and explains exactly what happens at each step. Everything runs on your machine. Read section 1 once, and sections 3 and 4 become a two minute routine you can repeat all day.

## 1. One time setup, five minutes

### Step 1: start JobForge

Open a terminal in the project folder and run:

```bash
npm run dev
```

Two things start: the engine on port 8787 and the interface on port 5173. Open http://localhost:5173. For a lighter setup you can instead run `npm run build` once and then `npm start`, which serves everything from http://localhost:8787 alone. The helper works with either.

### Step 2: load the extension into Chrome

1. Open Chrome and type `chrome://extensions` in the address bar.
2. Switch on **Developer mode** using the toggle in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension` folder inside the JobForge project.
5. The JobForge Helper card appears. Click the puzzle icon in Chrome's toolbar and pin it.

Edge works identically through `edge://extensions`.

### Step 3: pair it with your cockpit

1. In JobForge, open **Settings** and copy the long token shown in the Helper extension card.
2. Click the pinned JobForge Helper icon. The options panel opens.
3. Paste the token into **Extension token** and press **Pair**.
4. Press **Test**. You should see *Connected to JobForge. You are live.*

If the test fails: make sure the server terminal is still running, and confirm the server address reads `http://localhost:8787` (or `http://localhost:5173` proxies work too, but 8787 is direct).

### Step 4: review your autofill data once

In the helper panel, scroll to **Your autofill data** and press **Sync from JobForge**. Your name, email, phone, city, links, and approved answers load into the editor. Read every field once. Anything wrong, correct it right there and press **Save autofill data**. These saved values are what the helper fills from now on, so one careful minute here prevents every future wrong fill. The same editor exists in JobForge under **Settings, Autofill data**, and values saved there are picked up by the helper's sync button.

Expected pay stays empty unless you deliberately fill it, because you should never let a form guess your number.

## 2. What the helper does on any job page

Open any individual job posting. A floating gradient button appears in the bottom right corner of the page:

* **Send to JobForge**: captures the posting's title, company, location, full description, and links into your cockpit. Within a second it is classified, scored against your resume, and scam screened. You will see a small confirmation with its score and any scam indicators.
* **Autofill with JobForge**: appears on pages containing application forms. It fills recognized fields from your saved data: name, email, phone, city, LinkedIn, GitHub, notice period, experience answer, relocation answer, expected pay only if you saved one, and the long "why hire me" text. Every filled field is remembered automatically, and the helper tells you how many fields it filled.

The helper never presses submit. Not on any platform, ever. The final click that sends your application to an employer is always yours.

## 3. Applying through Naukri, the focused loop

Your Naukri Premium stays exactly as it is. The helper adds capture and prefill on top of it.

**Capture and prepare, about thirty seconds:**

1. Browse Naukri as you always do. On any job listing page that interests you, click through to the full job description page.
2. Press **Send to JobForge**. The posting lands in your cockpit, scored.
3. Keep browsing. Repeat for five or ten roles. Nothing else to do at this stage.

**Review in the cockpit, about a minute:**

4. Open JobForge, go to **Jobs**. Your captured roles sit in the deck with their scores, reasons, gaps, and scam flags. Shortlist the ones worth your time and skip the rest with one click, which also teaches your filters.
5. For each shortlisted role, open it and press **Forge application packet**. You get a tailored cover letter, a referral message under about one hundred characters to send to any employee you know at that company, and the questions you must answer yourself before applying.

**Apply, about a minute per role:**

6. From the job drawer in JobForge, press **Open official posting** to return to the Naukri page, or just go back to your open Naukri tab.
7. Press Naukri's own **Apply** button. When their application form opens, press **Autofill with JobForge**. Name, contact, experience, notice period, and your approved answers fill in.
8. Read the form once. Answer anything Naukri specific that the helper did not recognize, usually screening questions like certifications or preferred shift. Attach your resume where the form asks for it.
9. Press Naukri's submit yourself. Then, in JobForge, open the **Tracker**, find the role, and move it forward. Mark it submitted and paste the confirmation reference Naukri shows you, so your tracker stays receipt backed.

## 4. Applying through LinkedIn, the focused loop

Same shape, one platform specific note about Easy Apply.

**Capture:**

1. Browse LinkedIn Jobs as you always do with your Premium filters.
2. On any posting's detail page, press **Send to JobForge**. Scored and screened instantly.
3. Note the score and lane. A "Needs verification" tag on a captured role usually means the posting hid its location, so glance at it before applying.

**Prepare:**

4. Shortlist in the cockpit, forge the packet, copy the referral message if you have any first or second degree connection at that company. Send it to them with your resume. Referrals remain the highest conversion channel in Indian hiring and the message is already written for you.

**Apply with Easy Apply:**

5. On the LinkedIn posting, click **Easy Apply**.
6. LinkedIn opens its modal form. Press **Autofill with JobForge**. Contact details, links, notice period, and approved answers fill in.
7. Review each step of the LinkedIn modal. LinkedIn's screening questions vary by employer, so answer those yourself honestly. Upload your resume where asked.
8. Reviewing matters doubly here: LinkedIn shows your submission to the employer exactly as entered, and a careless autofill reflects on you. The helper fills, you verify.
9. Press **Submit** yourself. LinkedIn shows a confirmation. Mark the application submitted in your JobForge Tracker with a note of the date.

For postings without Easy Apply, LinkedIn routes you to the employer's own site, often Greenhouse or Workday. Capture works there too, and the autofill button appears on Greenhouse and most hosted forms.

## 5. If something filled wrong

That is exactly why the memory exists, and there are two places to fix it:

* **Immediately**: edit the field in the form before submitting. The helper only pre-fills; nothing is locked.
* **For the future**: fix it at the source in JobForge under **Settings, Autofill data**, or in the helper panel's own editor. Saved corrections override everything, so the wrong value never autofills again. The helper also remembered the last values it used, so you can always see what it will do next.

## 6. Common questions

* **Does the helper read my LinkedIn feed or messages?** No. The content script only activates on job pages you open, extracts the posting you are looking at, and does nothing until you click.
* **Does it violate LinkedIn or Naukri terms?** The terms prohibit automated account activity and bulk scraping. The helper is per posting, per click, on pages you chose to open, and never submits anything. That is the same category as a bookmarks or notes tool, not an automation bot. This restraint is deliberate and non negotiable in this project's design.
* **Can it auto submit while I sleep?** No, and no safe tool can. What it does instead is the closest honest thing: new roles surface automatically from connected boards, packets are prebuilt, and forms are prefilled, so your total effort per application is a review and one click.
* **Where is my data?** Your cockpit lives in `server/data/` on your machine. The helper keeps a small editable copy in Chrome's local storage, paired to your localhost server by token. Nothing is sent anywhere except your own machine.

## 7. The daily rhythm, condensed

1. Morning: open JobForge. The scheduler refreshed the boards overnight. Scan Today, shortlist.
2. Browse LinkedIn and Naukri with your premium filters; capture every decent posting with one click each.
3. Forge packets for shortlisted roles, send referral messages.
4. Apply through prefilled forms, one final click each, mark submitted in the tracker.
5. Attach receipts. Sleep. Repeat.

The whole loop runs in well under an hour a day for a dozen quality applications, with every number and every word traceable back to something true.
