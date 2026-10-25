import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

// Guided product tour. Every step navigates somewhere real and narrates out
// loud through the browser's built in speech engine, preferring a soft female
// voice such as Microsoft Zira or Aria when Windows provides one.

const STEPS = [
  {
    route: '/',
    title: 'Welcome to your cockpit',
    body: 'This is your Today view. Everything the forge found for you lands here: the strongest matches for your profile, deadlines that are closing, roles waiting on your decision, and the health of every connected source. The engine refreshes real company boards around the clock while this window is open.'
  },
  {
    route: '/jobs',
    title: 'Every opening, scored and explained',
    body: 'The explorer shows only genuine postings pulled live from employer career boards like Zscaler, Databricks, Meesho, OpenAI and twenty more. Each role carries a score out of one hundred built from seven transparent components. Open any card to see exactly why it fits, what is missing, and whether anything looks suspicious.'
  },
  {
    route: '/jobs',
    title: 'Packets, without the lies',
    body: 'Inside a job, press Forge application packet. JobForge drafts a cover letter and bullet suggestions grounded strictly in your own resume facts, plus a checklist of everything you still need to answer yourself. Nothing is ever invented. With an AI key connected, the wording gets sharper, but the truth rules never change.'
  },
  {
    route: '/resume',
    title: 'Your resume, structured and verified',
    body: 'Upload once and your resume becomes an editable profile with confidence chips on every fact. Twenty four skills were detected from the last file you fed it. This profile is what the scoring engine reads, so keeping it current instantly re-ranks every job in your pipeline.'
  },
  {
    route: '/sources',
    title: 'Genuine sources, live refresh',
    body: 'Twenty one employer boards ship pre-verified, and you can add any Greenhouse, Lever or Ashby company by pasting its careers link. The background scheduler polls every board on a fixed cadence, so new postings appear on their own and roles that vanish from a board are marked closed only after two consecutive misses. Nothing is scraped from LinkedIn or Naukri by the app itself, by design.'
  },
  {
    route: '/scam',
    title: 'Fraud screening before you trust anything',
    body: 'Paste any WhatsApp forward or email here. Eighteen indicators cover fee demands, UPI traps, guaranteed placement hooks and fake links. A payment demand blocks automated action no matter how perfect the job looks. This screen has already saved people from real money loss.'
  },
  {
    route: '/relocation',
    title: 'Would the move actually pay?',
    body: 'For offers outside Pune this calculator separates fixed pay from variable, deposits from rent, and bonuses from monthly cash. Three scenarios tell you the honest surplus and whether the offer clears your own affordability policy. Undisclosed pay stays unknown, never guessed.'
  },
  {
    route: '/tracker',
    title: 'Every application, honestly tracked',
    body: 'Applications move through a real state machine. A submission only counts when a receipt backs it, duplicates are blocked, and revoking authorization stops everything queued. Your pipeline, your proof.'
  },
  {
    route: '/settings',
    title: 'Add an AI brain, or stay free forever',
    body: 'JobForge works fully without any key in rules mode. When you want finer drafting, connect a provider. The best free start is Groq, whose key is free and fast. The best writing quality is Anthropic Claude Haiku. OpenAI works beautifully too. Keys stay on this machine and travel nowhere except the provider you chose.'
  },
  {
    route: '/settings',
    title: 'Pair the browser extension',
    body: 'Copy the extension token from Settings, load the JobForge Helper folder into Chrome, and browse LinkedIn or Naukri as you always do. A single click on any posting captures it into this cockpit, scored and scam screened instantly. The helper also prefills application forms from your approved answers, and it never presses submit for you, because keeping your accounts safe matters more than saving one click.'
  }
];

export default function Tour({ onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voicesReady, setVoicesReady] = useState(false);
  const spokenRef = useRef(-1);

  useEffect(() => {
    const load = () => setVoicesReady(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = load;
      setTimeout(load, 300);
    }
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, []);

  const femaleVoice = useMemo(() => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.filter((v) => /^en/i.test(v.lang));
    const preferred = en.find((v) => /(zira|aria|jenny|ana|emma|ava|samantha|female)/i.test(v.name))
      || en.find((v) => /google uk english female/i.test(v.name))
      || en.find((v) => /en-in/i.test(v.lang))
      || en[0] || voices[0] || null;
    return preferred;
  }, [voicesReady]);

  useEffect(() => {
    navigate(STEPS[step].route);
  }, [step, navigate]);

  useEffect(() => {
    if (!voiceOn || !window.speechSynthesis || !femaleVoice) return;
    if (spokenRef.current === step) return;
    spokenRef.current = step;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`${STEPS[step].title}. ${STEPS[step].body}`);
    utter.voice = femaleVoice;
    utter.rate = 0.97;
    utter.pitch = 1.06;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  }, [step, voiceOn, femaleVoice]);

  const stopVoice = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); spokenRef.current = -1; };
  const toggleVoice = () => { if (voiceOn) stopVoice(); setVoiceOn(!voiceOn); };
  const go = (delta) => {
    stopVoice();
    const next = Math.min(STEPS.length - 1, Math.max(0, step + delta));
    if (next === step && delta > 0) { onClose(); return; }
    setStep(next);
  };

  const s = STEPS[step];

  return (
    <div className="drawer-scrim" style={{ zIndex: 80, display: 'grid', placeItems: 'end center', padding: '0 26px 30px', alignItems: 'end', justifyContent: 'center' }}>
      <motion.div className="glass" initial={{ opacity: 0, y: 60, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{ width: 'min(640px, 96%)', padding: 24, borderRadius: 22, background: 'rgba(13,13,22,0.94)', position: 'relative', overflow: 'hidden' }}>
        <motion.div style={{ position: 'absolute', inset: '-60%', background: 'var(--grad)', opacity: 0.08, filter: 'blur(60px)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="var(--molten)" />
              <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>STEP {step + 1} OF {STEPS.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn ghost sm" onClick={toggleVoice} title={voiceOn ? 'Mute narration' : 'Unmute narration'}>
                {voiceOn ? <Volume2 size={13} color="var(--cyan)" /> : <VolumeX size={13} />}
              </button>
              <button className="btn ghost sm" onClick={() => { stopVoice(); onClose(); }}><X size={13} /></button>
            </div>
          </div>
          <AnimatePresence mode="popLayout">
            <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
              <h3 style={{ fontSize: 21, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7 }}>{s.body}</p>
            </motion.div>
          </AnimatePresence>
          <div style={{ display: 'flex', gap: 5, margin: '16px 0' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3.5, borderRadius: 9, background: i <= step ? 'var(--grad)' : 'rgba(255,255,255,0.09)', transition: 'background .4s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn ghost sm" onClick={() => go(-1)} disabled={step === 0}><ChevronLeft size={13} /> Back</button>
            {step === 0 && voiceOn && <span className="chip cyan" style={{ fontSize: 10.5 }}>narrating aloud, speaker icon mutes</span>}
            <button className="btn primary sm" onClick={() => go(1)}>{step === STEPS.length - 1 ? 'Finish tour' : 'Next'} <ChevronRight size={13} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
