import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, UploadCloud, ArrowRight, ArrowLeft, Check, Sparkles, MapPin, FileText, Zap, Rocket, ShieldAlert, Plane, Radio } from 'lucide-react';
import { uploadResume, api } from '../api.js';
import { Field, Chip, ConfidenceChip, Spinner, useToast } from '../ui.jsx';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Welcome', 'Resume', 'Profile', 'Preferences', 'AI Power', 'Liftoff'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [warn, setWarn] = useState(null);
  const [prefs, setPrefs] = useState({ targetLocations: 'Pune', workModes: ['onsite', 'hybrid', 'remote'], city: '' });
  const [llm, setLlm] = useState({ providerId: 'none', apiKey: '', model: '' });
  const [testing, setTesting] = useState(null);
  const fileRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setWarn(null);
    try {
      const res = await uploadResume(file);
      setDraft(res.draft);
      setWarn(res.warning);
      setPrefs((p) => ({ ...p, city: res.draft.city || '' }));
      setTimeout(() => setStep(2), 700);
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setParsing(false);
    }
  };

  const finish = async () => {
    try {
      await api('/profile', { method: 'PUT', body: { ...draft, city: prefs.city || draft?.city, targetLocations: prefs.targetLocations.split(',').map((s) => s.trim()).filter(Boolean) } });
      if (llm.providerId !== 'none') {
        await api('/settings', { method: 'PUT', body: { llm: { providerId: llm.providerId, providers: { [llm.providerId]: { apiKey: llm.apiKey, model: llm.model } } } } });
      }
      navigate('/');
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 2 }}>
      <motion.div className="glass" style={{ width: 'min(860px, 100%)', padding: '34px 38px', borderRadius: 26, background: 'rgba(12,12,20,0.82)' }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
        {/* progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 30 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 9, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                {i <= step && <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ height: '100%', background: 'var(--grad)', transformOrigin: 'left', transition: 'all .5s' }} />}
              </div>
              <div style={{ fontSize: 9.5, marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase', color: i <= step ? 'var(--molten)' : 'var(--faint)' }}>{s}</div>
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 46 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            {step === 0 && <Welcome onGo={() => setStep(1)} />}
            {step === 1 && <UploadStep fileRef={fileRef} onFile={handleFile} parsing={parsing} onSkip={() => setStep(3)} warn={warn} />}
            {step === 2 && draft && <ConfirmStep draft={draft} setDraft={setDraft} />}
            {step === 3 && <PrefsStep prefs={prefs} setPrefs={setPrefs} />}
            {step === 4 && <LlmStep llm={llm} setLlm={setLlm} testing={testing} setTesting={setTesting} />}
            {step === 5 && <Liftoff onDone={finish} />}
          </motion.div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
          <button className="btn ghost sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={14} /> Back</button>
          {step < 5 && (
            <button className="btn primary sm" onClick={() => setStep(step === 1 && !draft ? 3 : step + 1)} disabled={step === 2 && !draft}>
              {step === 1 && !draft ? 'Continue without resume' : 'Next'} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Welcome({ onGo }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
      <motion.div className="brand-mark" style={{ width: 84, height: 84, borderRadius: 26, margin: '0 auto 24px' }}
        animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 4 }}>
        <Flame size={40} color="white" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ fontSize: 44 }}>
        Welcome to <span className="sweep">JobForge</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ color: 'var(--muted)', maxWidth: 520, margin: '14px auto 30px', fontSize: 15 }}>
        Your personal job hunt cockpit. Drop in your resume, and it hunts verified tech openings across Pune and remote India, scores every one with explainable matching, screens out recruitment scams, and tracks every application to the offer.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[[Zap, 'Explainable matching'], [ShieldAlert, 'Scam screening'], [Plane, 'Relocation math'], [Rocket, 'Application tracking']].map(([Icon, text], i) => (
          <motion.span key={text} className="chip violet" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.6, delay: i * 0.35 }}>
            <Icon size={12} /> {text}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

function UploadStep({ fileRef, onFile, parsing, onSkip, warn }) {
  const [over, setOver] = useState(false);
  return (
    <div>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Drop your resume in</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 22, fontSize: 13.5 }}>PDF or DOCX, up to 10 MB. Parsing runs entirely on this machine. Nothing is uploaded to any cloud.</p>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
      >
        {parsing ? (
          <div style={{ padding: 10 }}>
            <motion.div animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}><FileText size={42} color="var(--molten)" /></motion.div>
            <p style={{ marginTop: 14, fontWeight: 600 }}>Reading every line<span className="mono">...</span></p>
          </div>
        ) : (
          <>
            <span className="bolt"><UploadCloud size={44} /></span>
            <h3 style={{ marginTop: 12, fontSize: 18 }}>Drag it in or click to browse</h3>
            <p style={{ color: 'var(--faint)', fontSize: 12.5, marginTop: 6 }}>Extracts skills, projects, education, and contact facts with confidence scores</p>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {warn && <div className="chip amber" style={{ marginTop: 14, whiteSpace: 'normal', height: 'auto', padding: '8px 12px', display: 'block' }}>{warn}</div>}
      <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--faint)' }}>
        No file handy? <button className="btn ghost sm" onClick={onSkip}>Skip for now</button> and paste resume text later from the Resume page.
      </p>
    </div>
  );
}

function ConfirmStep({ draft, setDraft }) {
  const set = (key, value) => setDraft({ ...draft, [key]: value });
  const setSkill = (idx, value) => {
    const skills = [...draft.skills];
    skills[idx] = { ...skills[idx], name: value };
    setDraft({ ...draft, skills });
  };
  return (
    <div>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Confirm what was extracted</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 22, fontSize: 13.5 }}>Parser confidence is shown per fact. Correct anything that looks off, missing fields are normal.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label={`Name`}>
          <input className="input" value={draft.name || ''} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Email"><input className="input" value={draft.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Phone"><input className="input" value={draft.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Current city"><input className="input" value={draft.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
      </div>
      <div className="divider" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Skills detected</span>
        <ConfidenceChip level={draft.confidence?.skills} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {(draft.skills || []).map((s, i) => (
          <motion.span key={s.name + i} className="chip orange" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 18 }}>
            {s.name}
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 3 }} onClick={() => setDraft({ ...draft, skills: draft.skills.filter((_, j) => j !== i) })}>×</button>
          </motion.span>
        ))}
        {(draft.skills || []).length === 0 && <Chip tone="amber">None detected, add them on the Resume page after setup</Chip>}
      </div>
      {(draft.projects || []).length > 0 && (
        <>
          <div className="divider" />
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Projects found</span>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {draft.projects.map((p, i) => (
              <div key={i} className="card" style={{ padding: '11px 14px' }}>
                <strong style={{ fontFamily: 'var(--font-display)' }}>{p.name}</strong>
                <span style={{ color: 'var(--muted)', fontSize: 12.5 }}> · {p.blurb}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PrefsStep({ prefs, setPrefs }) {
  const modes = [['onsite', 'Onsite'], ['hybrid', 'Hybrid'], ['remote', 'Remote']];
  return (
    <div>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Where and how you want to work</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 22, fontSize: 13.5 }}>Pune first by default. Everything here stays editable later in Settings.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Field label="Target locations" hint="Comma separated. Pune is strongly preferred by default">
          <div style={{ position: 'relative' }}>
            <MapPin size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--molten)' }} />
            <input className="input" style={{ paddingLeft: 34 }} value={prefs.targetLocations} onChange={(e) => setPrefs({ ...prefs, targetLocations: e.target.value })} />
          </div>
        </Field>
        <Field label="Current city"><input className="input" value={prefs.city} onChange={(e) => setPrefs({ ...prefs, city: e.target.value })} /></Field>
      </div>
      <Field label="Work modes you accept">
        <div style={{ display: 'flex', gap: 8 }}>
          {modes.map(([id, label]) => {
            const on = prefs.workModes.includes(id);
            return (
              <button key={id} className={`tab ${on ? 'on' : ''}`} style={{ margin: 0 }} onClick={() => setPrefs({ ...prefs, workModes: on ? prefs.workModes.filter((m) => m !== id) : [...prefs.workModes, id] })}>{label}</button>
            );
          })}
        </div>
      </Field>
      <div className="divider" />
      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Radio size={16} color="var(--cyan)" />
        <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          Twenty one genuine employer boards are pre connected and a background scheduler keeps them fresh. Your cockpit will start filling with real openings the moment you land on Today.
        </p>
      </div>
    </div>
  );
}

const PROVIDER_CHOICES = [
  { id: 'none', label: 'Skip AI for now', blurb: 'Rules based matching, tracking, and packets still fully work' },
  { id: 'groq', label: 'Groq', blurb: 'Free tier, fast open models, great starting point', free: true },
  { id: 'openrouter', label: 'OpenRouter', blurb: 'One key, hundreds of models, several free daily', free: true },
  { id: 'openai', label: 'OpenAI', blurb: 'GPT models, pay per use' },
  { id: 'anthropic', label: 'Anthropic Claude', blurb: 'Claude, best writing quality for letters' },
  { id: 'ollama', label: 'Ollama local', blurb: 'Fully offline, resume never leaves the machine', free: true },
  { id: 'zai', label: 'Z.ai GLM', blurb: 'GLM models on the Z.ai open platform' },
  { id: 'custom', label: 'Custom endpoint', blurb: 'Any OpenAI compatible URL' }
];

function LlmStep({ llm, setLlm, testing, setTesting }) {
  const toast = useToast();
  const test = async () => {
    setTesting('pending');
    try {
      await api('/settings', { method: 'PUT', body: { llm: { providerId: llm.providerId, providers: { [llm.providerId]: { apiKey: llm.apiKey, model: llm.model } } } } });
      const res = await api('/settings/llm/test', { method: 'POST', body: { providerId: llm.providerId } });
      setTesting(res.ok ? 'ok' : 'fail');
      toast(res.message, res.ok ? 'ok' : 'err');
    } catch (err) {
      setTesting('fail');
      toast(err.message, 'err');
    }
  };
  return (
    <div>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Add an AI brain, or skip</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 13.5 }}>
        The engine is fully usable without any key. A provider adds smarter resume tailoring, cover letters, and match explanations. Keys are stored only on this machine.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 10 }}>
        {PROVIDER_CHOICES.map((p) => (
          <motion.button key={p.id} whileHover={{ y: -3 }} className={`card ${llm.providerId === p.id ? '' : ''}`} onClick={() => setLlm({ ...llm, providerId: p.id })}
            style={{ cursor: 'pointer', textAlign: 'left', borderColor: llm.providerId === p.id ? 'rgba(255,92,26,0.65)' : 'var(--border)', background: llm.providerId === p.id ? 'var(--grad-soft)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13.5, fontFamily: 'var(--font-display)' }}>{p.label}</strong>
              {p.free && <Chip tone="lime">free</Chip>}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>{p.blurb}</p>
          </motion.button>
        ))}
      </div>
      {llm.providerId !== 'none' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {llm.providerId !== 'ollama' && (
            <Field label="API key"><input className="input" type="password" placeholder="Paste your key, stored locally only" style={{ minWidth: 240 }} value={llm.apiKey} onChange={(e) => setLlm({ ...llm, apiKey: e.target.value })} /></Field>
          )}
          <Field label="Model (optional)"><input className="input" placeholder="provider default if empty" value={llm.model} onChange={(e) => setLlm({ ...llm, model: e.target.value })} /></Field>
          <button className="btn sm" onClick={test} disabled={testing === 'pending'}>{testing === 'pending' ? <Spinner /> : <Zap size={13} />} Test connection</button>
          {testing === 'ok' && <Chip tone="green">Connected</Chip>}
          {testing === 'fail' && <Chip tone="red">Not connected</Chip>}
        </motion.div>
      )}
    </div>
  );
}

function Liftoff({ onDone }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 0 20px' }}>
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
        <Rocket size={54} color="var(--molten)" style={{ filter: 'drop-shadow(0 0 18px rgba(255,92,26,0.6))' }} />
      </motion.div>
      <h2 style={{ fontSize: 30, margin: '18px 0 8px' }}>The forge is <span className="sweep">lit</span></h2>
      <p style={{ color: 'var(--muted)', maxWidth: 460, margin: '0 auto 26px', fontSize: 13.5 }}>
        Your cockpit is ready. Shortlist, prepare packets, screen anything that smells fishy, and track every application from one screen.
      </p>
      <button className="btn primary" onClick={onDone} style={{ fontSize: 15, padding: '13px 28px' }}>Enter the cockpit <ArrowRight size={16} /></button>
    </div>
  );
}
