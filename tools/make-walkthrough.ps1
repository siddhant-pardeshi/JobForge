# Generates docs/media/jobforge-walkthrough.wav using the Windows built in
# speech engine with the female Microsoft Zira voice. Run from the project
# root:  powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-walkthrough.ps1

Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $PSScriptRoot
$mediaDir = Join-Path $root 'docs\media'
New-Item -ItemType Directory -Force -Path $mediaDir | Out-Null
$outPath = Join-Path $mediaDir 'jobforge-walkthrough.wav'

$steps = @(
  "Welcome to JobForge, your personal job hunt cockpit. This is your Today view, the mission control of your entire job search. Everything the forge finds for you lands right here: your strongest matches, deadlines closing soon, roles waiting on your decision, and the health of every connected source. The engine talks to real employer career boards around the clock while this window is open, so new genuine openings appear on their own. No demo data, no filler. Every role you see is a real posting from a real company, pulled live from its official board.",

  "This is the opportunity explorer. Only genuine postings live here, pulled straight from employer boards like Zscaler with its Pune engineering center, Databricks, Meesho, OpenAI, and twenty more verified companies. Every role carries a score out of one hundred, built from seven transparent components: skill fit, responsibility fit, experience fit, location fit, pay fit, employer evidence, and freshness. Nothing is a black box. Open any card and you will see exactly why it fits you, what is missing, and whether anything about it looks suspicious.",

  "Inside a job, press Forge application packet. With an A I key connected, JobForge writes a tailored cover letter that reads both your resume and this specific job description, connecting real projects to the exact requirements the employer listed. And because many openings move faster when someone inside vouches for you, the same packet includes a referral request message of about one hundred characters, ready to send to any employee at that company. Both documents are grounded strictly in your resume facts. If your resume does not support something, the packet says so plainly instead of inventing a line.",

  "Your resume, structured and verified. Upload it once and it becomes an editable profile with confidence chips on every fact. The parser is tuned for Indian tech resumes, even P D F files whose fonts drop spaces between words. When anything in the profile changes, every job in your pipeline re-ranks instantly, because the whole engine reads from this one verified profile.",

  "Genuine sources, live refresh. Twenty one employer boards ship pre verified, and you can add any Greenhouse, Lever, or Ashby company by simply pasting its careers link. The background scheduler polls every board on a fixed cadence. New postings appear on their own, and when a role vanishes from its official board, it is marked closed only after two consecutive checks confirm it is really gone. If the employer reposts it, it reopens automatically. The app itself never scrapes LinkedIn or Naukri, by design, and the last step shows how those platforms are covered instead.",

  "Fraud screening, before you trust anything. Paste any WhatsApp forward or email here. Eighteen indicators cover registration fee demands, U P I traps, guaranteed placement hooks, shortened links, and fake sender patterns. A payment demand blocks automated action no matter how perfect the job looks. And a WhatsApp contact alone is never declared fraudulent, because the screen is calibrated, not paranoid. This tool exists because in India, the first person to spot a fake job should be you, not your bank statement.",

  "Would the move actually pay? For offers outside Pune, this calculator separates fixed pay from variable, deposits from rent, and joining bonuses from monthly cash. Three scenarios, cautious, base, and favorable, tell you the honest monthly surplus and whether the offer clears your own affordability policy. If the pay is undisclosed, it says affordability unknown and hands you the exact questions to ask the recruiter. Numbers here are planning aids, never guesses dressed as facts.",

  "Every application, honestly tracked. Applications move through a real state machine, from shortlisted through preparing, review, and submitted, all the way to offer. A submission only counts when a receipt backs it. Duplicates are blocked automatically. This is the pipeline that remembers everything, so you never apply twice to the same role or lose track of an interview.",

  "Add an A I brain, or stay free forever. JobForge works completely without any key. Matching, scoring, screening, tracking, and packet drafting all run on transparent local rules. When you want finer writing, connect a provider in Settings. The best free choice is Groq. Its key is free, its models are fast, and setup takes one minute. The best writing quality is Anthropic Claude, especially Claude Haiku, for cover letters that sound genuinely human. OpenAI is the solid all round paid option. Keys stay on this machine and travel only to the provider you chose.",

  "Pair the JobForge Helper extension, and your LinkedIn and Naukri Premium subscriptions join the team. Copy the token from Settings, load the extension folder into Chrome, paste the token, and press pair. From then on, browsing works exactly as always, with one addition: a small button on every posting captures it into this cockpit instantly. When you reach an application form, the helper prefills your name, contact, links, notice period, and everything you have approved. Here is the part people love: the helper remembers. Every value it fills is stored, every value is editable in its options panel, and any correction you make sticks, so a wrong fill can never repeat. Fix it once, and every future form is right. And it never presses submit for you. That final click stays yours, on every platform, always, because protecting your accounts matters more than saving one click. From a new posting appearing to a prepared application in front of you, the whole loop is minutes.",

  "That is JobForge. Real companies, real openings, explainable scores, scam protection, honest economics, a tracker that never lies to you, and documents written in your voice. Forge your applications, and land the role."
)

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Prefer the soft female voice when installed.
$zira = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like '*Zira*' } | Select-Object -First 1
if ($zira) { $synth.SelectVoice($zira.VoiceInfo.Name) }
$synth.Rate = -1
$synth.Volume = 100

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth.SetOutputToWaveFile($outPath, $format)

for ($i = 0; $i -lt $steps.Count; $i++) {
  if ($i -eq 0) { $synth.Speak("JobForge walkthrough. Eleven parts, about eight minutes. Narrated by your machine, for your machine.") }
  else { $synth.Speak("Part $($i + 1).") }
  $synth.Speak($steps[$i])
  $synth.Speak("")
}

$synth.Dispose()
$size = (Get-Item $outPath).Length / 1MB
Write-Output ("Written: " + $outPath)
Write-Output ("Size: " + [math]::Round($size, 1) + " MB")
