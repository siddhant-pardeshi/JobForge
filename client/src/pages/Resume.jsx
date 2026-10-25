import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, UploadCloud, Save, ClipboardPaste, Check, ShieldCheck, Trash2 } from 'lucide-react';
import { api, uploadResume } from '../api.js';
import { useApp } from '../App.jsx';
import { SectionHead, Chip, Field, Reveal, Spinner, useToast, Modal, ConfidenceChip, Empty } from '../ui.jsx';

export default function Resume() {
  const { boot, refresh } = useApp();
  const toast = useToast();
  const profile = boot?.profile;
  const [draft, setDraft] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setDraft(profile || null); }, [profile?.extractedAt]);

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadResume(file);
      setDraft(res.draft);
      if (res.warning) toast(res.warning, 'err');
      else toast('Extraction complete. Review the facts and save', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const saveDraft = async () => {
    try {
      await api('/profile', { method: 'PUT', body: draft });
      await refresh();
      toast('Profile saved. The engine scores against this instantly', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };

  const savePaste = async () => {
    setBusy(true);
    try {
      const res = await api('/resume/text', { method: 'POST', body: { text: pasteText } });
      setDraft(res.draft);
      setPasteOpen(false);
      toast('Text parsed into a draft. Review and save', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const set = (key, value) => setDraft({ ...draft, [key]: value });
  const conf = draft?.confidence || {};

  return (
    <div>
      <SectionHead
        kicker="Verified profile"
        title="Your resume, structured"
        sub="Extraction happens locally. Parser confidence is shown per fact and nothing is trusted blindly, edit anything that looks off."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={() => setPasteOpen(true)}><ClipboardPaste size={13} /> Paste text</button>
            {draft && <button className="btn primary sm" onClick={saveDraft}><Save size={13} /> Save profile</button>}
          </div>
        }
      />

      {!draft && (
        <Reveal>
          <div className={`dropzone ${over ? 'over' : ''}`} onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}>
            {busy ? (
              <div><motion.div animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 1.6, display: 'inline-block' }} style={{ display: 'inline-block' }}><FileText size={44} color="var(--molten)" /></motion.div><p style={{ marginTop: 12, fontWeight: 600 }}>Reading every line...</p></div>
            ) : (
              <>
                <span className="bolt"><UploadCloud size={44} /></span>
                <h3 style={{ marginTop: 12, fontSize: 18 }}>Drop your resume here</h3>
                <p style={{ color: 'var(--faint)', fontSize: 12.5, marginTop: 6 }}>PDF, DOCX, or TXT up to 10 MB. Scanned PDFs are detected and reported honestly.</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </Reveal>
      )}

      {draft && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16, alignItems: 'start' }}>
          <Reveal>
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Extracted facts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <Field label="Name"><input className="input" value={draft.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
                <Field label="Headline"><input className="input" value={draft.headline || ''} onChange={(e) => set('headline', e.target.value)} /></Field>
                <Field label="Email"><input className="input" value={draft.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
                <Field label="Phone"><input className="input" value={draft.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
                <Field label="Current city"><input className="input" value={draft.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
                <Field label="Minimum acceptable pay (LPA, optional)" hint="Leave empty if undecided, the engine treats it as unknown instead of guessing">
                  <input className="input mono" type="number" value={draft.minCompLPA ?? ''} onChange={(e) => set('minCompLPA', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
              </div>

              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>Skills with evidence</strong>
                <ConfidenceChip level={conf.skills} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                <AnimatePresence>
                  {(draft.skills || []).map((s, i) => (
                    <motion.span key={s.name} className="chip orange" layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }}>
                      {s.name}
                      <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 3 }} onClick={() => set('skills', draft.skills.filter((_, j) => j !== i))}>×</button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                <input className="input" style={{ width: 130, padding: '3px 10px', fontSize: 12, borderRadius: 999 }}
                  placeholder="add skill + Enter" onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      set('skills', [...(draft.skills || []), { name: e.target.value.trim(), evidence: 'Added manually' }]);
                      e.target.value = '';
                    }
                  }} />
              </div>

              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>Role families you are targeting</strong>
                <span style={{ fontSize: 11, color: 'var(--faint)' }}>drives the responsibility score</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['backend', 'fullstack', 'frontend', 'mobile', 'qa', 'data', 'ml', 'cloud', 'security', 'database', 'techsupport'].map((f) => {
                  const on = (draft.roleFamilies || []).includes(f);
                  return <button key={f} className={`tab ${on ? 'on' : ''}`} style={{ margin: 0 }} onClick={() => set('roleFamilies', on ? draft.roleFamilies.filter((x) => x !== f) : [...(draft.roleFamilies || []), f])}>{f}</button>;
                })}
              </div>

              <div className="divider" />
              <strong style={{ fontSize: 13 }}>Projects detected</strong>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {(draft.projects || []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input className="input" style={{ width: 180 }} value={p.name} onChange={(e) => { const projects = [...draft.projects]; projects[i] = { ...p, name: e.target.value }; set('projects', projects); }} />
                    <input className="input" value={p.blurb} onChange={(e) => { const projects = [...draft.projects]; projects[i] = { ...p, blurb: e.target.value }; set('projects', projects); }} />
                  </div>
                ))}
                {(draft.projects || []).length === 0 && <p style={{ fontSize: 12.5, color: 'var(--faint)' }}>None detected. Add them for stronger responsibility scoring.</p>}
              </div>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gap: 16 }}>
            <Reveal delay={0.1}>
              <div className="card">
                <h3 style={{ marginBottom: 10 }}>Extraction quality</h3>
                <div style={{ display: 'grid', gap: 7 }}>
                  {Object.entries(conf).map(([field, level]) => (
                    <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{field}</span>
                      <ConfidenceChip level={level} />
                    </div>
                  ))}
                </div>
                {draft.sourceFile && <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 12 }}>Source file kept privately at <code className="mono">server/data/resumes/{draft.sourceFile}</code>, git ignored by design.</p>}
              </div>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="card">
                <h3 style={{ marginBottom: 10 }}>Privacy posture</h3>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--muted)', display: 'grid', gap: 6 }}>
                  <li style={{ display: 'flex', gap: 7 }}><ShieldCheck size={13} color="var(--green)" flexShrink={0} /> Parsing runs on your machine, never a cloud OCR service.</li>
                  <li style={{ display: 'flex', gap: 7 }}><ShieldCheck size={13} color="var(--green)" /> Your resume text leaves the machine only if you configure an AI provider, and only that provider sees it.</li>
                  <li style={{ display: 'flex', gap: 7 }}><ShieldCheck size={13} color="var(--green)" /> Nothing is used for training. Export or delete everything from Settings.</li>
                </ul>
                <button className="btn danger sm" style={{ marginTop: 12 }} onClick={async () => { if (confirm('Remove the extracted resume from your profile?')) { set('resumeText', ''); setDraft(null); } }}><Trash2 size={12} /> Remove parsed resume</button>
              </div>
            </Reveal>
          </div>
        </div>
      )}

      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)}>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Paste resume text</h2>
        <Field label="Full resume text"><textarea className="input" rows={10} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste everything, contact details to certifications" /></Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn primary sm" onClick={savePaste} disabled={busy || pasteText.trim().length < 100}>{busy ? <Spinner /> : null} Parse text</button>
        </div>
      </Modal>
    </div>
  );
}
