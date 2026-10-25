import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ScanSearch, AlertTriangle, ClipboardList, Mail } from 'lucide-react';
import { api, timeAgo } from '../api.js';
import { SectionHead, Chip, Field, Reveal, Spinner, useToast, Bar } from '../ui.jsx';

const SEVERITY = {
  clear: { label: 'No strong indicators', tone: 'green' },
  low: { label: 'Low risk', tone: 'cyan' },
  medium: { label: 'Medium risk', tone: 'amber' },
  high: { label: 'High risk', tone: 'red' },
  critical: { label: 'Critical, act with care', tone: 'red' }
};

export default function Scam() {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [claimed, setClaimed] = useState('');
  const [from, setFrom] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const toast = useToast();

  const loadLog = () => api('/scam/log').then((r) => setLog(r.log)).catch(() => {});
  useEffect(() => { loadLog(); }, []);

  const analyze = async () => {
    setBusy(true);
    try {
      let res;
      if (mode === 'email') {
        const links = [...String(text).matchAll(/https?:\/\/[^\s<>"')]+/g)].map((m) => ({ text: '', href: m[0] }));
        res = await api('/mail/analyze', { method: 'POST', body: { from, replyTo, subject, body: text, links, claimedCompany: claimed || undefined } });
      } else {
        res = await api('/scam/analyze', { method: 'POST', body: { text, claimedCompany: claimed || undefined } });
      }
      setResult(res.result);
      loadLog();
      toast(res.result.severity === 'critical' || res.result.severity === 'high' ? 'Serious indicators found. Read the advice below' : 'Screen complete', res.result.severity === 'critical' ? 'err' : 'info');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const sev = result ? SEVERITY[result.severity] : null;
  const danger = result && (result.severity === 'high' || result.severity === 'critical');
  const ready = mode === 'email'
    ? (text.trim().length >= 20 || from.trim().length >= 5)
    : text.trim().length >= 20;

  return (
    <div>
      <SectionHead kicker="Fraud screen" title="Check a message before you trust it"
        sub="Paste any suspicious email, WhatsApp text, or job ad, or screen a full email with sender and link analysis. The helper extension adds a one click Check this email button inside Gmail and Outlook." />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
        <Reveal>
          <div className="card">
            <div className="tabs" style={{ marginBottom: 14 }}>
              <button className={`tab ${mode === 'text' ? 'on' : ''}`} onClick={() => { setMode('text'); setResult(null); }}><ScanSearch size={13} style={{ verticalAlign: '-2px' }} /> Message or job ad</button>
              <button className={`tab ${mode === 'email' ? 'on' : ''}`} onClick={() => { setMode('email'); setResult(null); }}><Mail size={13} style={{ verticalAlign: '-2px' }} /> Full email</button>
            </div>

            {mode === 'email' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <Field label="From (sender)"><input className="input" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="HR Team <hr@company.com>" /></Field>
                <Field label="Reply to (if visible)"><input className="input" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="different@mailbox.com" /></Field>
                <Field label="Subject"><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="URGENT: Confirm interview today" /></Field>
                <Field label="Company the sender claims"><input className="input" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="e.g. Infosys" /></Field>
              </div>
            )}
            {mode === 'text' && (
              <Field label="Company the sender claims (optional)" hint="Helps detect link and domain mismatches">
                <input className="input" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="e.g. Infosys" style={{ marginBottom: 12 }} />
              </Field>
            )}

            <Field label={mode === 'email' ? 'Email body (links in it are analyzed too)' : 'Message or job ad text'}>
              <textarea className="input" rows={mode === 'email' ? 8 : 9} placeholder={mode === 'email' ? 'Paste the full email body here, including any links exactly as they appear.' : 'Paste the full message here. Include any links exactly as they appear.'} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <button className="btn primary" style={{ marginTop: 14 }} onClick={analyze} disabled={busy || !ready}>
              {busy ? <Spinner /> : <ScanSearch size={14} />} Run the screen
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card" style={{ minHeight: 260, position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="empty" style={{ padding: '60px 20px' }}>
                  <div className="orb"><ShieldAlert size={26} color="var(--molten)" /></div>
                  <h3>Verdict appears here</h3>
                  <p style={{ fontSize: 12.5 }}>Indicators, risk band, and next steps. Never a naive safe or unsafe stamp.</p>
                </motion.div>
              ) : (
                <motion.div key={result.checkedAt} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                      style={{ width: 86, height: 86, borderRadius: '50%', display: 'grid', placeItems: 'center', background: danger ? 'rgba(251,77,77,0.12)' : 'rgba(52,211,153,0.1)', border: `1px solid ${danger ? 'rgba(251,77,77,0.5)' : 'rgba(52,211,153,0.4)'}` }}>
                      <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: danger ? '#ffa2a2' : '#8af0c8' }}>{result.score}</span>
                    </motion.div>
                    <div>
                      <Chip tone={sev.tone}>{sev.label}</Chip>
                      <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>
                        {result.flags.length} indicator{result.flags.length === 1 ? '' : 's'}{result.sender ? ` · from ${result.sender.address || 'unknown sender'}` : ''}
                      </p>
                      {result.linksChecked > 0 && <p style={{ fontSize: 11, color: 'var(--faint)' }}>{result.linksChecked} link{result.linksChecked > 1 ? 's' : ''} inspected</p>}
                    </div>
                  </div>
                  <div style={{ margin: '14px 0' }}><Bar pct={result.score} color={danger ? 'linear-gradient(90deg,#fb4d4d,#ff8a3d)' : undefined} /></div>

                  {result.flags.length > 0 && (
                    <div style={{ display: 'grid', gap: 7 }}>
                      {result.flags.map((f, i) => (
                        <motion.div key={f.id + String(i)} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="card" style={{ padding: '9px 12px', borderColor: f.critical ? 'rgba(251,77,77,0.4)' : 'var(--border)' }}>
                          <strong style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{f.critical && <AlertTriangle size={12} color="var(--red)" />}{f.label}</span>
                            <span className="mono" style={{ color: 'var(--molten)' }}>+{f.weight}</span>
                          </strong>
                          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{f.advice}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="divider" />
                  <strong style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}><ClipboardList size={13} color="var(--cyan)" /> Recommended next steps</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)', display: 'grid', gap: 5 }}>
                    {result.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  {result.blocks?.length > 0 && (
                    <div className="chip red" style={{ marginTop: 12, whiteSpace: 'normal', height: 'auto', padding: '8px 12px', display: 'block' }}>
                      {result.blocks.join(' ')}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>

      {log.length > 0 && (
        <Reveal style={{ marginTop: 26 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Private screening log</h3>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 10 }}>Stored only on this machine, never synced anywhere.</p>
            {log.map((l) => (
              <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
                <Chip tone={SEVERITY[l.result.severity]?.tone}>{l.result.score}</Chip>
                {l.kind === 'email' && <Chip tone="cyan">email</Chip>}
                <span style={{ fontSize: 12.5, color: 'var(--muted)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{(l.from ? `${l.from}: ` : '') + String(l.text).slice(0, 100)}</span>
                <span style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(l.at)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
