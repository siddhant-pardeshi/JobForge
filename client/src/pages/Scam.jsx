import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ScanSearch, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
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
  const [text, setText] = useState('');
  const [claimed, setClaimed] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const toast = useToast();

  const loadLog = () => api('/scam/log').then((r) => setLog(r.log)).catch(() => {});
  useEffect(() => { loadLog(); }, []);

  const analyze = async () => {
    setBusy(true);
    try {
      const res = await api('/scam/analyze', { method: 'POST', body: { text, claimedCompany: claimed || undefined } });
      setResult(res.result);
      loadLog();
      toast(res.result.severity === 'critical' || res.result.severity === 'high' ? 'Serious indicators found. Read the advice below' : 'Screen complete', res.result.severity === 'critical' ? 'err' : 'info');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const sev = result ? SEVERITY[result.severity] : null;
  const danger = result && (result.severity === 'high' || result.severity === 'critical');

  return (
    <div>
      <SectionHead kicker="Fraud screen" title="Check a message before you trust it"
        sub="Paste any suspicious email, WhatsApp text, or job ad. Nothing is sent to any third party, the heuristics run locally on your own backend." />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
        <Reveal>
          <div className="card">
            <Field label="Message or job ad text">
              <textarea className="input" rows={9} placeholder={'Paste the full message here. Include any links exactly as they appear.\n\nExample: Congratulations! You are selected. Pay the registration fee of Rs 499 to confirm...'} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <div style={{ marginTop: 12 }}>
              <Field label="Company the sender claims to be (optional)" hint="Helps detect link domains that do not match the claimed employer">
                <input className="input" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="e.g. Infosys" />
              </Field>
            </div>
            <button className="btn primary" style={{ marginTop: 14 }} onClick={analyze} disabled={busy || text.trim().length < 20}>
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
                      <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>{result.flags.length} indicator{result.flags.length === 1 ? '' : 's'} out of 18 checked</p>
                    </div>
                  </div>
                  <div style={{ margin: '14px 0' }}><Bar pct={result.score} color={danger ? 'linear-gradient(90deg,#fb4d4d,#ff8a3d)' : undefined} /></div>

                  {result.flags.length > 0 && (
                    <div style={{ display: 'grid', gap: 7 }}>
                      {result.flags.map((f, i) => (
                        <motion.div key={f.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="card" style={{ padding: '9px 12px', borderColor: f.critical ? 'rgba(251,77,77,0.4)' : 'var(--border)' }}>
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
                  {result.blocks.length > 0 && (
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
                <span style={{ fontSize: 12.5, color: 'var(--muted)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{l.text.slice(0, 110)}</span>
                <span style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(l.at)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
