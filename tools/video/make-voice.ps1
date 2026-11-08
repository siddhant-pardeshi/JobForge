# Generates per scene narration wavs for the video tour using the Windows
# speech engine with the female Microsoft Zira voice, pitched up and slowed
# slightly for a soft, cute delivery. Output: tools/video/wav/sceneNN.wav
# Run from the project root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/video/make-voice.ps1

Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outDir = Join-Path $root 'tools\video\wav'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$scenes = @(
  "Meet JobForge, your personal job hunt cockpit. It watches real employer career boards around the clock, scores every opening against your resume, screens recruitment fraud before it reaches you, and keeps your whole pipeline organized. You press the only button that matters: submit.",

  "Getting started takes four commands. Clone the project, install, and run. The engine starts on port eighty seven eighty seven, the interface on fifty one seventy three. Twenty one employer boards seed themselves right away. Open localhost five one seven three, drop in your resume, and the forge is lit.",

  "Your resume becomes a verified profile with confidence chips on every fact. The parser is built for Indian resumes, so space eating P D F files still work perfectly. Spring Boot maps to Spring Boot, Java seventeen counts as Core Java, and JavaScript is never mistaken for Java. Save once, and every job in your pipeline re-ranks instantly.",

  "This is your Today view, mission control. Fourteen hundred live opportunities, your top match score, closing deadlines, and a round radar that counts down to your interviews. Browser reminders fire one hour before every scheduled round. The hunt deck shows your strongest matches so you always know where to start.",

  "Every job gets a score out of one hundred, built from seven transparent components. Skill fit, responsibility fit, experience, location, pay, employer evidence, and freshness. Open any card to see exactly which skills matched, which are missing, and why it landed in its lane. Nothing is hidden, ever.",

  "Forge a packet, and ten seconds later you hold a tailored cover letter built from your resume against this exact job description, plus a referral message of about one hundred characters, ready to send to anyone at that company. Nothing is invented. If your resume does not support something, the packet asks you about it instead.",

  "Every packet also carries an interview prep kit. Five to eight questions this interviewer would plausibly ask, grounded in the required skills, your real projects, and honest answers for your gaps. Practice them out loud, and walk in prepared.",

  "Twenty one employer boards ship pre-verified, and the scheduler refreshes every one every twenty minutes. New postings appear on their own. A role only leaves the board after two consecutive checks confirm it is gone, and if the employer reposts it, it reopens automatically. You can add any Greenhouse, Lever, or Ashby company by simply pasting its careers link.",

  "Recruitment fraud ends here. Paste a WhatsApp forward, screen a full email, or use the helper inside Gmail and Outlook with one click. Twenty three indicators hunt fee demands, U P I traps, reply to mismatches, fake sender domains, and lying links. A payment demand blocks everything, no matter how perfect the job looks.",

  "Considering an offer outside Pune? The relocation calculator separates fixed pay from variable, deposits from rent, and bonuses from monthly cash. Three scenarios tell you the honest monthly surplus and whether the offer clears your own policy. Undisclosed pay stays unknown, and hands you the exact questions to ask.",

  "The tracker is a board that moves itself. Forge a packet, the card slides to preparing. Schedule an interview round, it slides to interview and joins your radar with a reminder an hour before. Attach the confirmation receipt, and the submission finally counts. Duplicates are blocked automatically.",

  "And that is JobForge. Everything you saw works completely free, with no A I key at all. Add a Groq key for sharper writing, or Claude for the finest cover letters. With the Chrome helper, every posting you browse lands in your cockpit with one click. Forge your applications, and land the role."
)

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$zira = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like '*Zira*' } | Select-Object -First 1
if ($zira) { $synth.SelectVoice($zira.VoiceInfo.Name) }
$synth.Rate = -1
$synth.Volume = 100

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

for ($i = 0; $i -lt $scenes.Count; $i++) {
  $n = '{0:d2}' -f ($i + 1)
  $out = Join-Path $outDir "scene$n.wav"
  $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">' +
          '<prosody pitch="+16%" rate="-8%">' + $scenes[$i] + '</prosody></speak>'
  $synth.SetOutputToWaveFile($out, $format)
  $synth.SpeakSsml($ssml)
  $synth.SetOutputToNull()
  Write-Output ("scene$n.wav written")
}
$synth.Dispose()
Write-Output "All scene wavs generated in $outDir"
