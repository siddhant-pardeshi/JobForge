// Builds the JobForge feature presentation (15 slides, dark premium theme).
// Run: node build.mjs   → JobForge-Presentation.pptx
const pptxgen = require("pptxgenjs");
const path = require("path");

const A = (f) => path.join(__dirname, "assets", f);

// palette — dark premium, molten brand
const BG = "0B0B15";        // near-black background (dominant)
const PANEL = "14142A";     // card surface
const TEXT = "F5F3EF";      // primary text
const MUT = "A8A3B5";       // muted text
const FAINT = "8B8496";     // faint text
const O = "FF8A3D";         // molten orange (primary emphasis)
const P = "FF2E88";         // pink
const V = "A78BFA";         // violet
const CY = "67E8F9";        // cyan
const GR = "6EE7B7";        // green
const AM = "FCD34D";        // amber
const RD = "FCA5A5";        // red
const LINE = "2A2A3E";      // hairline

const F = "Segoe UI";
const FB = "Segoe UI Black";
const FM = "Consolas";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Siddhant Pardeshi";
pres.title = "JobForge: the job hunt cockpit";
pres.subject = "Feature presentation";

const W = 13.33, H = 7.5, M = 0.6;

// helpers
const kick = (s, text, opts = {}) => s.addText(text.toUpperCase(), {
  x: opts.x ?? M, y: opts.y ?? 0.42, w: opts.w ?? 6, h: 0.3, margin: 0,
  fontFace: F, fontSize: 11, bold: true, charSpacing: 4, color: O, ...opts
});
const title = (s, text, opts = {}) => s.addText(text, {
  x: opts.x ?? M, y: opts.y ?? 0.68, w: opts.w ?? W - 2 * M, h: opts.h ?? 0.85, margin: 0,
  fontFace: FB, fontSize: opts.size ?? 30, color: TEXT, ...opts
});
const pnum = (s, n, total) => s.addText(`${n} / ${total}`, {
  x: W - 1.6, y: H - 0.52, w: 1.1, h: 0.3, margin: 0, align: "right",
  fontFace: FM, fontSize: 9, color: FAINT
});
const foot = (s, label) => s.addText(`JobForge · ${label}`, {
  x: M, y: H - 0.52, w: 6, h: 0.3, margin: 0, fontFace: F, fontSize: 9, color: FAINT
});
const card = (s, x, y, w, h) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x, y, w, h, fill: { color: PANEL }, line: { color: LINE, width: 0.75 }, rectRadius: 0.09
});
const chip = (s, x, y, w, text, color) => {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.36, fill: { color: PANEL }, line: { color, width: 1 }, rectRadius: 0.18 });
  s.addText(text, { x, y, w, h: 0.36, margin: 0, align: "center", valign: "middle", fontFace: F, fontSize: 10.5, bold: true, color });
};
const TOTAL = 15;

/* ============ S1 COVER ============ */
{
  const s = pres.addSlide();
  s.background = { path: A("glow-bg.png") };
  s.addText("THE JOB HUNT COCKPIT", { x: M, y: 2.55, w: 9, h: 0.35, margin: 0, fontFace: F, fontSize: 13, bold: true, charSpacing: 5, color: O });
  s.addText([
    { text: "Real openings.", options: { color: TEXT, breakLine: true } },
    { text: "Scored and explained.", options: { color: O, breakLine: true } },
    { text: "Zero fake data.", options: { color: V } }
  ], { x: M, y: 2.95, w: 11.5, h: 2.6, margin: 0, fontFace: FB, fontSize: 54, bold: true, lineSpacing: 62 });
  s.addText("21 verified employer boards · mail fraud screening · self organizing tracker · Chrome helper · free and open source",
    { x: M, y: 6.35, w: 12, h: 0.4, margin: 0, fontFace: F, fontSize: 13, color: MUT });
  s.addText("github.com/siddhant-pardeshi/JobForge · v1.4 · October 2026", { x: M, y: 6.85, w: 12, h: 0.35, margin: 0, fontFace: FM, fontSize: 10.5, color: FAINT });
}

/* ============ S2 WHY ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "The problem it solves");
  title(s, "Job hunting is broken. This fixes the workflow.");
  const rows = [
    ["Boards bury engineering roles", "Sales and BDA listings at software companies crowd out real engineering work. JobForge classifies the work described, not the company name, and keeps every exclusion auditable.", O],
    ["Fraud mails drain accounts", "Fee demands, UPI traps and fake HR domains reach candidates daily. 23 indicators screen posts, full emails, and the open mail inside Gmail and Outlook.", P],
    ["Applications vanish", "Clicks are not proof. A tracker with a real state machine counts a submission only when a receipt backs it, and blocks duplicates.", V],
    ["Relocation math is opaque", "Fixed versus variable, deposits versus rent, bonuses versus monthly cash. Three scenarios answer: would the move actually pay?", CY]
  ];
  rows.forEach((r, i) => {
    const y = 1.75 + i * 1.28;
    card(s, M, y, W - 2 * M, 1.14);
    s.addText(r[0], { x: M + 0.35, y: y + 0.12, w: 4.6, h: 0.4, margin: 0, fontFace: FB, fontSize: 15, color: TEXT });
    s.addText(r[1], { x: M + 5.1, y: y + 0.1, w: 6.9, h: 0.95, margin: 0, fontFace: F, fontSize: 11.5, color: MUT, valign: "middle" });
  });
  foot(s, "Why"); pnum(s, 2, TOTAL);
}

/* ============ S3 HOW IT WORKS ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Architecture");
  title(s, "One machine, one cockpit, one click that submits.");
  const nodes = [
    ["Your resume", "parsed locally into a verified profile"],
    ["21 live boards", "polled every 20 min, closures detected"],
    ["Scoring engine", "seven components, every reason shown"],
    ["Scam shield", "23 indicators on posts and open emails"],
    ["Packets", "cover letter, referral note, prep kit"],
    ["Chrome helper", "capture, autofill, mail screening"],
    ["Self moving board", "rounds scheduled, reminders, receipts"]
  ];
  const nx = 0.62, nw = 1.62, gap = 0.14, ny = 1.9, nh = 1.5;
  nodes.forEach((n, i) => {
    const x = nx + i * (nw + gap);
    card(s, x, ny, nw, nh);
    s.addText(n[0], { x: x + 0.12, y: ny + 0.14, w: nw - 0.24, h: 0.55, margin: 0, fontFace: FB, fontSize: 11.5, color: TEXT });
    s.addText(n[1], { x: x + 0.12, y: ny + 0.72, w: nw - 0.24, h: 0.7, margin: 0, fontFace: F, fontSize: 9, color: MUT });
    if (i < nodes.length - 1) s.addText("→", { x: x + nw - 0.06, y: ny + 0.55, w: 0.3, h: 0.4, margin: 0, align: "center", fontFace: F, fontSize: 14, color: O });
  });
  // final node: submit click
  card(s, nx, 3.85, W - 2 * M - 0.0, 0.85);
  s.addText("Your submit click", { x: nx + 0.3, y: 3.98, w: 3.4, h: 0.55, margin: 0, fontFace: FB, fontSize: 15, color: AM });
  s.addText("The one step that always stays with you. Prefill yes, submit no: LinkedIn and Naukri ban automated activity and the ban lands on the user's account, so the helper stops one click short everywhere.",
    { x: nx + 3.9, y: 3.92, w: 8.2, h: 0.75, margin: 0, fontFace: F, fontSize: 10.5, color: MUT, valign: "middle" });
  s.addText("All of it runs on one machine: Express API, JSON store, React 19 client. No database, no cloud, no telemetry.",
    { x: M, y: 5.1, w: 12, h: 0.4, margin: 0, fontFace: F, fontSize: 12, color: MUT });
  // stat chips
  const stats = [["5,843", "live postings"], ["21", "verified boards"], ["23", "fraud indicators"], ["38", "tests passing"]];
  stats.forEach((st, i) => {
    const x = M + i * 3.08;
    s.addText(st[0], { x, y: 5.75, w: 2.8, h: 0.75, margin: 0, fontFace: FM, fontSize: 40, bold: true, color: O });
    s.addText(st[1].toUpperCase(), { x, y: 6.5, w: 2.8, h: 0.3, margin: 0, fontFace: F, fontSize: 9.5, charSpacing: 2, color: FAINT });
  });
  foot(s, "Architecture"); pnum(s, 3, TOTAL);
}

/* ============ S4 RESUME ENGINE ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 1 · Resume engine");
  title(s, "Your resume becomes a verified profile.");
  s.addImage({ path: A("feat-resume.png"), x: M, y: 1.75, w: 12.13, h: 3.03 });
  const cols = [
    ["Built for Indian resumes", "Space eating PDF fonts are repaired by camel case reconstruction: SpringBoot maps to Spring Boot, RESTAPIs to REST APIs. A 70 skill synonym taxonomy means Java 17 counts as Core Java while JavaScript never counts as Java."],
    ["Confidence, not blind trust", "Every extracted fact carries a confidence chip. Skills, projects, education and certifications are all editable before anything counts, and the original file is never modified."],
    ["The highest leverage edit", "Skills drive 30 of the 100 score points. Saving the profile re-ranks every job instantly, so ten careful minutes here upgrade every score, packet and referral note the engine produces."]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 5.05, 3.91, 1.85);
    s.addText(c[0], { x: x + 0.25, y: 5.25, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 12.5, color: O });
    s.addText(c[1], { x: x + 0.25, y: 5.68, w: 3.45, h: 1.1, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  foot(s, "Resume engine"); pnum(s, 4, TOTAL);
}

/* ============ S5 BOARDS ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 2 · Live boards");
  title(s, "Real postings, refreshing themselves.");
  s.addImage({ path: A("feat-boards.png"), x: M, y: 1.75, w: 12.13, h: 3.03 });
  const cols = [
    ["Verified, then polled", "Every board in the registry was probed against its live endpoint before shipping. The scheduler polls all of them on your interval and logs every run."],
    ["The two miss rule", "A posting that vanishes gets one grace miss, because boards drop listings transiently. Two consecutive misses mark it closed with a timestamp; reposts reopen automatically."],
    ["Grow your coverage", "Paste any Greenhouse, Lever or Ashby careers URL: the provider and handle are detected and the board probed before saving. Coverage honesty is a feature, not a bug."]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 5.05, 3.91, 1.85);
    s.addText(c[0], { x: x + 0.25, y: 5.25, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 12.5, color: O });
    s.addText(c[1], { x: x + 0.25, y: 5.68, w: 3.45, h: 1.1, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  foot(s, "Live boards"); pnum(s, 5, TOTAL);
}

/* ============ S6 SCORING ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 3 · Scoring engine");
  title(s, "A score you can argue with.");
  const comps = [
    ["Demonstrated skill fit", 30], ["Responsibility and project fit", 20],
    ["Experience and seniority fit", 15], ["Location and work mode fit", 15],
    ["Compensation fit", 10], ["Employer evidence", 5], ["Freshness and deadline", 5]
  ];
  s.addChart(pres.charts.BAR, [{
    name: "Points", labels: comps.map((c) => c[0]).reverse(), values: comps.map((c) => c[1]).reverse()
  }], {
    x: M, y: 1.8, w: 7.6, h: 4.6, barDir: "bar",
    chartColors: ["FF5C1A"], chartArea: { fill: { color: BG } },
    catAxisLabelColor: TEXT, catAxisLabelFontFace: F, catAxisLabelFontSize: 11,
    valAxisLabelColor: FAINT, valAxisLabelFontSize: 10, valAxisMaxVal: 30, valAxisMajorUnit: 5,
    valGridLine: { color: LINE, size: 0.5 }, catGridLine: { style: "none" },
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: O, dataLabelFontFace: FM, dataLabelFontSize: 11,
    showLegend: false, showTitle: false, barGapWidthPct: 60
  });
  s.addText("0 to 100, fully explainable", { x: 8.6, y: 1.9, w: 4.1, h: 0.5, margin: 0, fontFace: FB, fontSize: 17, color: TEXT });
  s.addText("Open any card and see which skills matched, which are missing, and why it landed in its lane. Unknowns stay neutral: an unlisted salary never buries a great Pune role and never fakes a relocation verdict.",
    { x: 8.6, y: 2.5, w: 4.1, h: 1.7, margin: 0, fontFace: F, fontSize: 11.5, color: MUT });
  s.addText("Lanes", { x: 8.6, y: 4.3, w: 4, h: 0.35, margin: 0, fontFace: FB, fontSize: 13, color: TEXT });
  const lanes = [["Best in Pune", GR], ["Remote from Pune", CY], ["Relocation", V], ["Needs verification", AM], ["Filtered out · reason shown", RD], ["Closed or redacted", FAINT]];
  lanes.forEach((l, i) => {
    s.addText(l[0], { x: 8.6, y: 4.7 + i * 0.34, w: 4.1, h: 0.3, margin: 0, fontFace: F, fontSize: 11, color: MUT, bullet: { code: "25B8", indent: 10 } });
  });
  s.addText("Weights are sliders in Settings. Drag them and the board re-ranks live.", { x: M, y: 6.6, w: 12, h: 0.4, margin: 0, fontFace: F, fontSize: 12, color: MUT });
  foot(s, "Scoring engine"); pnum(s, 6, TOTAL);
}

/* ============ S7 SCAM ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 4 · Defense");
  title(s, "Fraud screening that earns its keep.");
  s.addImage({ path: A("feat-scam.png"), x: M, y: 1.75, w: 12.13, h: 3.03 });
  const cols = [
    ["Three screens", "Paste any message, analyze a full email with sender, reply-to and link inspection, or pair the helper and check the open mail inside Gmail and Outlook with one click."],
    ["Calibrated, not paranoid", "A WhatsApp contact alone is never declared fraudulent. A payment demand blocks automation regardless of the skill match. Every verdict shows the evidence behind it."],
    ["Private by design", "The screen reads exactly one email, the one you clicked on. Nothing is read in the background, and the log stays on your machine."]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 5.05, 3.91, 1.85);
    s.addText(c[0], { x: x + 0.25, y: 5.25, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 12.5, color: O });
    s.addText(c[1], { x: x + 0.25, y: 5.68, w: 3.45, h: 1.1, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  foot(s, "Scam shield"); pnum(s, 7, TOTAL);
}

/* ============ S8 PACKETS ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 5 · Documents");
  title(s, "Packets that sound like you.");
  s.addImage({ path: A("feat-packets.png"), x: M, y: 1.75, w: 12.13, h: 3.03 });
  const cols = [
    ["Grounded, always", "The cover letter connects your real projects to this description's requirements. Nothing is invented: if the resume does not support a claim, the packet asks you about it instead."],
    ["The referral edge", "A ~100 character referral message per company, ready to send. Referred applications convert several times better than cold applies, and the message is already written."],
    ["Prep kit included", "Five to eight questions this interviewer would plausibly ask, grounded in required skills and real projects. Practice them aloud before the call."]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 5.05, 3.91, 1.85);
    s.addText(c[0], { x: x + 0.25, y: 5.25, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 12.5, color: O });
    s.addText(c[1], { x: x + 0.25, y: 5.68, w: 3.45, h: 1.1, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  foot(s, "Packets"); pnum(s, 8, TOTAL);
}

/* ============ S9 TRACKER ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 6 · Pipeline");
  title(s, "A tracker that organizes itself.");
  s.addImage({ path: A("feat-tracker.png"), x: M, y: 1.75, w: 12.13, h: 3.03 });
  const cols = [
    ["Moves on facts", "Packet forged moves a role to preparing. Round scheduled moves it to interview with a reminder an hour before. Receipt attached makes the submission count."],
    ["Live by the second", "The board re-renders every five seconds with spring animations. Leave it open on a second screen and watch the pipeline breathe."],
    ["Honest bookkeeping", "Submissions count only with receipt evidence, duplicates are blocked, and the funnel shows what is actually working for you."]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 5.05, 3.91, 1.85);
    s.addText(c[0], { x: x + 0.25, y: 5.25, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 12.5, color: O });
    s.addText(c[1], { x: x + 0.25, y: 5.68, w: 3.45, h: 1.1, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  foot(s, "Tracker"); pnum(s, 9, TOTAL);
}

/* ============ S10 RELOCATION ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 7 · Decisions");
  title(s, "Would the move actually pay?");
  const scn = [
    ["Cautious", [["Net", "₹61,200"], ["Costs", "₹33,600"], ["Surplus", "₹27,600"], ["vs Pune", "+₹8,100"]], AM],
    ["Base", [["Net", "₹68,000"], ["Costs", "₹30,000"], ["Surplus", "₹38,000"], ["vs Pune", "+₹9,000"]], CY],
    ["Favorable", [["Net", "₹73,440"], ["Costs", "₹27,600"], ["Surplus", "₹45,840"], ["vs Pune", "+₹11,700"]], V]
  ];
  scn.forEach((sc, i) => {
    const x = M + i * 4.11;
    card(s, x, 1.8, 3.91, 2.6);
    s.addText(sc[0], { x: x + 0.25, y: 1.98, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 14, color: sc[2] });
    sc[1].forEach((r, j) => {
      s.addText(r[0], { x: x + 0.25, y: 2.44 + j * 0.44, w: 1.7, h: 0.35, margin: 0, fontFace: F, fontSize: 11, color: MUT });
      s.addText(r[1], { x: x + 1.95, y: 2.44 + j * 0.44, w: 1.7, h: 0.35, margin: 0, align: "right", fontFace: FM, fontSize: 12, bold: true, color: TEXT });
    });
  });
  const cols = [
    ["Separate the truth", "Fixed versus variable pay, deposits as liquidity never monthly cost, joining bonuses excluded from every recurring figure, and a Pune baseline for comparison."],
    ["Unknown stays unknown", "Undisclosed pay returns affordability unknown plus the exact questions to ask the recruiter. The role stays visible; the guess never happens."],
    ["Your budgets win", "Six city default budgets across nine categories, all editable. Your numbers override every default the moment you save them."]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 4.7, 3.91, 2.0);
    s.addText(c[0], { x: x + 0.25, y: 4.9, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 12.5, color: O });
    s.addText(c[1], { x: x + 0.25, y: 5.33, w: 3.45, h: 1.25, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  foot(s, "Relocation"); pnum(s, 10, TOTAL);
}

/* ============ S11 AI KEYS ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 8 · Optional brain");
  title(s, "Works free. Sharper with a key.");
  s.addText("Everything runs with no key at all. A provider only polishes the cover letters and bullets. Keys live in a git ignored local file and travel only to the provider you chose.",
    { x: M, y: 1.7, w: 12, h: 0.6, margin: 0, fontFace: F, fontSize: 12.5, color: MUT });
  const providers = [
    ["Groq", "console.groq.com/keys", "Free tier", "Fastest start, generous limits, the recommended first key", GR],
    ["Anthropic Claude", "console.anthropic.com/settings/keys", "Pay per use", "Best cover letter writing. Haiku is cheap, Sonnet is the finest", V],
    ["OpenAI", "platform.openai.com/api-keys", "Pay per use", "Solid all rounder. gpt-4o-mini is inexpensive for this workload", CY],
    ["Ollama", "ollama.com/download", "Free, local", "Runs offline on your machine. The resume never leaves it", O],
    ["OpenRouter", "openrouter.ai/keys", "Free daily models", "One key, hundreds of models to experiment with", P],
    ["Z.ai GLM", "z.ai/manage-apikey/apikey-list", "Pay per use", "GLM models through an OpenAI compatible endpoint", AM]
  ];
  providers.forEach((p, i) => {
    const y = 2.5 + i * 0.72;
    card(s, M, y, W - 2 * M, 0.62);
    s.addText(p[0], { x: M + 0.3, y: y + 0.13, w: 2.6, h: 0.36, margin: 0, fontFace: FB, fontSize: 12.5, color: TEXT });
    s.addText(p[1], { x: M + 3.0, y: y + 0.15, w: 3.6, h: 0.32, margin: 0, fontFace: FM, fontSize: 10, color: CY });
    s.addText(p[2], { x: M + 6.7, y: y + 0.15, w: 1.5, h: 0.32, margin: 0, fontFace: F, fontSize: 10, bold: true, color: p[2] === "Free tier" || p[2] === "Free, local" ? GR : MUT });
    s.addText(p[3], { x: M + 8.3, y: y + 0.1, w: 4.0, h: 0.45, margin: 0, fontFace: F, fontSize: 10, color: MUT, valign: "middle" });
  });
  s.addText("Settings, AI provider, paste the key, press Test. The sidebar dot turns green with the model name.",
    { x: M, y: 6.95, w: 12, h: 0.35, margin: 0, fontFace: F, fontSize: 11, color: MUT });
  foot(s, "AI keys"); pnum(s, 11, TOTAL);
}

/* ============ S12 HELPER ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 9 · Chrome helper");
  title(s, "LinkedIn and Naukri, on your team.");
  const cards = [
    ["Send to JobForge", "One click on any posting you are viewing on LinkedIn, Naukri, Greenhouse, Lever, Ashby, SmartRecruiters or Workday. It lands in your cockpit scored and scam screened within a second."],
    ["Autofill with JobForge", "Application forms fill from your saved data: name, contact, links, notice period, approved answers. Every value is remembered and editable, so a wrong fill never repeats."],
    ["Check this email", "Inside Gmail and Outlook, the open mail is screened in place with a color coded verdict panel. It reads exactly one email, the one you clicked on, and nothing else."]
  ];
  cards.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 1.85, 3.91, 2.5);
    s.addText(String(i + 1).padStart(2, "0"), { x: x + 0.25, y: 2.0, w: 1.2, h: 0.6, margin: 0, fontFace: FM, fontSize: 26, bold: true, color: O });
    s.addText(c[0], { x: x + 0.25, y: 2.62, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 13, color: TEXT });
    s.addText(c[1], { x: x + 0.25, y: 3.05, w: 3.45, h: 1.2, margin: 0, fontFace: F, fontSize: 10, color: MUT });
  });
  card(s, M, 4.65, W - 2 * M, 0.95);
  s.addText("The one line that matters", { x: M + 0.3, y: 4.78, w: 3.4, h: 0.35, margin: 0, fontFace: FB, fontSize: 12.5, color: AM });
  s.addText("The helper never presses submit. Not on any site. LinkedIn and Naukri ban automated activity and the ban lands on your account, so the helper stops one click short and leaves that click to you. Prefill yes, submit no.",
    { x: M + 3.9, y: 4.72, w: 8.1, h: 0.85, margin: 0, fontFace: F, fontSize: 10.5, color: MUT, valign: "middle" });
  const steps = [["1", "Copy the token from Settings"], ["2", "Load unpacked the extension folder"], ["3", "Pair, Test, browse as always"]];
  steps.forEach((st, i) => {
    const x = M + i * 4.11;
    s.addShape(pres.shapes.OVAL, { x, y: 5.95, w: 0.42, h: 0.42, fill: { color: PANEL }, line: { color: O, width: 1.25 } });
    s.addText(st[0], { x, y: 5.95, w: 0.42, h: 0.42, margin: 0, align: "center", valign: "middle", fontFace: FM, fontSize: 13, bold: true, color: O });
    s.addText(st[1], { x: x + 0.55, y: 5.98, w: 3.4, h: 0.4, margin: 0, fontFace: F, fontSize: 11, color: TEXT, valign: "middle" });
  });
  foot(s, "Chrome helper"); pnum(s, 12, TOTAL);
}

/* ============ S13 ACCESS + HOSTING ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Feature 10 · Sharing");
  title(s, "Open to everyone. Private on demand.");
  const modes = [
    ["Open access", "The default. Anyone with the link uses the full hunt free: live boards, scored matches, scam screening, pay insights, relocation math.", GR],
    ["Private with code", "One flip in Settings and visitors need the six digit code. Flip back and the link is open again. Instant, both ways.", AM],
    ["You are the admin", "Flip it on the host machine with one click, or from any browser with the admin code. Guests can never flip it: they get a 403.", V]
  ];
  modes.forEach((m, i) => {
    const x = M + i * 4.11;
    card(s, x, 1.85, 3.91, 2.1);
    s.addText(m[0], { x: x + 0.25, y: 2.05, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 14, color: m[2] });
    s.addText(m[1], { x: x + 0.25, y: 2.5, w: 3.45, h: 1.3, margin: 0, fontFace: F, fontSize: 10.5, color: MUT });
  });
  card(s, M, 4.2, W - 2 * M, 1.35);
  s.addText("Guests stay read only", { x: M + 0.3, y: 4.35, w: 4, h: 0.4, margin: 0, fontFace: FB, fontSize: 13, color: TEXT });
  s.addText("The server enforces it, not a promise: settings, profile, tracker changes, imports, exports and resets all require the owner. Secrets, the resume text and the host filesystem path never appear in a guest response. Verified by the test suite over the live tunnel.",
    { x: M + 0.3, y: 4.78, w: 11.9, h: 0.7, margin: 0, fontFace: F, fontSize: 10.5, color: MUT });
  card(s, M, 5.8, W - 2 * M, 0.85);
  s.addText("Hosting in two lines", { x: M + 0.3, y: 5.92, w: 3, h: 0.35, margin: 0, fontFace: FB, fontSize: 12, color: CY });
  s.addText("npm start  ·  cloudflared tunnel --url http://localhost:8787  ·  share the URL. A permanent home is the same server on any VPS behind HTTPS.",
    { x: M + 3.4, y: 5.87, w: 8.7, h: 0.7, margin: 0, fontFace: FM, fontSize: 10.5, color: MUT, valign: "middle" });
  foot(s, "Sharing"); pnum(s, 13, TOTAL);
}

/* ============ S14 UNDER THE HOOD ============ */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kick(s, "Engineering");
  title(s, "Built like a product, not a script.");
  const cols = [
    ["Stack", ["Express API over a JSON store, atomic writes", "React 19, Vite 7, Tailwind 4, Framer Motion 12", "Chrome MV3 extension, vanilla, no build step", "No database, no cloud, no telemetry"]],
    ["Quality gates", ["38 tests covering the hard guarantees", "Classification edges and fraud blocking", "Closure detection and dedupe provenance", "Salary parser across four formats"]],
    ["Honest limits", ["Listing access is read only", "LinkedIn and Naukri stay capture only", "Relocation math is a planning aid", "Refresh runs while your machine runs"]]
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.11;
    card(s, x, 1.85, 3.91, 3.4);
    s.addText(c[0], { x: x + 0.25, y: 2.05, w: 3.4, h: 0.4, margin: 0, fontFace: FB, fontSize: 14, color: O });
    const items = c[1].map((t, j) => ({ text: t, options: { bullet: { code: "25B8", indent: 10 }, breakLine: true, color: MUT } }));
    s.addText(items, { x: x + 0.25, y: 2.55, w: 3.45, h: 2.6, margin: 0, fontFace: F, fontSize: 10.5, paraSpaceAfter: 8 });
  });
  s.addText("Exports include everything: profile, tracked jobs, packets, logs. Reset wipes it all locally. The repo carries a full build context document so any developer or AI tool can extend it without breaking the invariants.",
    { x: M, y: 5.5, w: 12, h: 0.7, margin: 0, fontFace: F, fontSize: 12, color: MUT });
  s.addText("38 tests · MIT · zero telemetry", { x: M, y: 6.35, w: 12, h: 0.4, margin: 0, fontFace: FM, fontSize: 13, bold: true, color: O });
  foot(s, "Engineering"); pnum(s, 14, TOTAL);
}

/* ============ S15 CLOSING ============ */
{
  const s = pres.addSlide();
  s.background = { path: A("cover-banner.png") };
  s.addText("Forge your applications.", { x: M, y: 2.3, w: 12, h: 1.0, margin: 0, fontFace: FB, fontSize: 52, bold: true, color: TEXT });
  s.addText("Land the role.", { x: M, y: 3.35, w: 12, h: 1.0, margin: 0, fontFace: FB, fontSize: 52, bold: true, color: O });
  s.addText("Star the repo. Fork it. Break it. Improve it.", { x: M, y: 4.75, w: 12, h: 0.45, margin: 0, fontFace: F, fontSize: 16, color: MUT });
  s.addText("github.com/siddhant-pardeshi/JobForge", { x: M, y: 5.35, w: 12, h: 0.5, margin: 0, fontFace: FM, fontSize: 18, bold: true, color: CY });
  s.addText("MIT · free forever · built in Pune by Siddhant Pardeshi", { x: M, y: 6.0, w: 12, h: 0.4, margin: 0, fontFace: F, fontSize: 12, color: FAINT });
}

pres.writeFile({ fileName: path.join(__dirname, "JobForge-Presentation.pptx") }).then(() => console.log("deck written"));
