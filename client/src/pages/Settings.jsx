import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Zap, KeyRound, Download, Trash2, ShieldAlert, SlidersHorizontal, Sparkles, Puzzle, Copy, RefreshCw } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { SectionHead, Chip, Field, Reveal, Spinner, useToast, Toggle, Bar } from '../ui.jsx';

export default function SettingsPage() {
  const { boot, refresh } = useApp();
  const toast = useToast();
  const [llm, setLlm] = useState(null);
  const [testing, setTesting] = useState(null);
  const [weights, setWeights] = useState(null);
  const [auto, setAuto] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!boot) return;
    setLlm(JSON.parse(JSON.stringify(boot.settings.llm || { providerId: 'none', providers: {} })));
    setWeights(boot.profile?.weights || null);
    setAuto(boot.settings.autoSubmit || { enabled: false, maxPerDay: 3 });
  }, [boot]);

  if (!llm || !auto) return <div className="shimmer" style={{ height: 300 }} />;
  const presets = boot.presets;

  const saveLlm = async (next = llm) => {
    try {
      const res = await api('/settings', { method: 'PUT', body: { llm: next } });
      await refresh();
      toast(res.llm.ready ? res.llm.message : 'AI provider off. Rules mode active', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };

  const test = async (pid) => {
    setTesting(pid);
    try {
      const res = await api('/settings/llm/test', { method: 'POST', body: { providerId: pid } });
      toast(res.message, res.ok ? 'ok' : 'err');
    } catch (e) { toast(e.message, 'err'); }
    finally { setTesting(null); }
  };

  const setProviderConf = (pid, key, value) => {
    setLlm({ ...llm, providers: { ...llm.providers, [pid]: { ...(llm.providers?.[pid] || {}), [key]: value } } });
  };

  const saveWeights = async (w) => {
    setWeights(w);
    try {
      await api('/profile', { method: 'PUT', body: { ...(boot.profile || {}), weights: w } });
    } catch (e) { toast(e.message, 'err'); }
  };

  const totalWeight = weights ? Object.values(weights).reduce((a, b) => a + Number(b || 0), 0) : 100;

  return (
    <div>
      <SectionHead kicker="Control room" title="Settings that stay on your machine"
        sub="Keys, weights, limits, and data. The Settings store is a local JSON file that git never sees." />

      {/* AI providers */}
      <Reveal>
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 6 }}><Zap size={17} color="var(--molten)" /><h3>AI provider</h3>
            {boot.llm.ready ? <Chip tone="green">{boot.llm.provider} · {boot.llm.model}</Chip> : <Chip tone="amber">rules mode</Chip>}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
            Works with paid keys, free tier keys, or a fully local model. The core app never requires any of this. Best free start: <strong style={{ color: 'var(--lime)' }}>Groq</strong>. Best drafting quality: <strong style={{ color: 'var(--violet)' }}>Anthropic Claude</strong>. Fastest all round paid option: <strong style={{ color: 'var(--cyan)' }}>OpenAI</strong>.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 11 }}>
            {Object.entries(presets).map(([pid, p]) => {
              const active = llm.providerId === pid;
              return (
                <motion.div key={pid} whileHover={{ y: -3 }} className="card" onClick={() => setLlm({ ...llm, providerId: pid })}
                  style={{ cursor: 'pointer', padding: 14, borderColor: active ? 'rgba(255,92,26,0.65)' : 'var(--border)', background: active ? 'var(--grad-soft)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13.5, fontFamily: 'var(--font-display)' }}>{p.label}</strong>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {p.freeTier && <Chip tone="lime">free tier</Chip>}
                      {p.local && <Chip tone="cyan">local</Chip>}
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{p.blurb}</p>
                  {p.models?.length > 0 && <p className="mono" style={{ fontSize: 10, color: 'var(--faint)', marginTop: 6 }}>{p.models.slice(0, 2).join(' · ')}</p>}
                  {active && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      {pid !== 'ollama' && (
                        <input className="input" type="password" placeholder={boot.settings.llm.providers?.[pid]?.apiKeyMask || 'API key'} value={llm.providers?.[pid]?.apiKey || ''} onChange={(e) => setProviderConf(pid, 'apiKey', e.target.value)} />
                      )}
                      {(p.models.length > 0 || pid === 'custom') && (
                        <input className="input mono" placeholder="model name" list={`models-${pid}`} value={llm.providers?.[pid]?.model || ''} onChange={(e) => setProviderConf(pid, 'model', e.target.value)} />
                      )}
                      {p.models?.length > 0 && (
                        <datalist id={`models-${pid}`}>{p.models.map((m) => <option key={m} value={m} />)}</datalist>
                      )}
                      {pid === 'custom' && (
                        <input className="input mono" placeholder="https://your-endpoint/v1" value={llm.providers?.[pid]?.baseUrl || ''} onChange={(e) => setProviderConf(pid, 'baseUrl', e.target.value)} />
                      )}
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button className="btn primary sm" onClick={() => saveLlm()}><KeyRound size={12} /> Save</button>
                        <button className="btn sm" onClick={() => test(pid)} disabled={testing === pid}>{testing === pid ? <Spinner /> : null} Test</button>
                        {p.keyUrl && <a className="btn ghost sm" href={p.keyUrl} target="_blank" rel="noreferrer">Get a key</a>}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 14 }}>Keys are stored in <code className="mono">server/data/settings.json</code> on this machine only, git ignored, and sent nowhere except the provider you chose.</p>
        </div>
      </Reveal>

      {/* browser extension */}
      <Reveal>
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 4 }}><Puzzle size={17} color="var(--violet)" /><h3>JobForge Helper extension</h3></div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
            The helper lives in the <code className="mono">extension/</code> folder of this project. Load it once in Chrome through Manage Extensions and Developer Mode, then pair it with the token below. It captures any posting you are viewing on LinkedIn, Naukri, or a company career page, scores it instantly, and prefills application forms from your approved answers. It never submits anything for you.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <code className="mono" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', fontSize: 12.5, letterSpacing: '0.03em' }}>{boot.extensionToken || 'token not ready'}</code>
            <button className="btn sm" onClick={() => { navigator.clipboard.writeText(boot.extensionToken || ''); toast('Extension token copied', 'ok'); }}><Copy size={13} /> Copy token</button>
            <button className="btn ghost sm" onClick={async () => {
              try { await refresh(); toast('Token state refreshed', 'ok'); } catch (e) { toast(e.message, 'err'); }
            }}><RefreshCw size={13} /></button>
          </div>
          <ol style={{ margin: '14px 0 0', paddingLeft: 20, fontSize: 12.5, color: 'var(--muted)', display: 'grid', gap: 5 }}>
            <li>Open <code className="mono">chrome://extensions</code> and enable Developer mode.</li>
            <li>Click Load unpacked and select the <code className="mono">extension</code> folder inside this project.</li>
            <li>Click the JobForge Helper icon, open its options, and paste the token.</li>
            <li>Browse any job posting and press the Send to JobForge button on the page.</li>
          </ol>
        </div>
      </Reveal>

      {/* weights */}
      {weights && (
        <Reveal>
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 4 }}><SlidersHorizontal size={17} color="var(--cyan)" /><h3>Matching weights</h3>
              <Chip tone={totalWeight === 100 ? 'green' : 'amber'}>total {totalWeight}</Chip>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>Seven transparent components. Change them and every score recomputes on the next Jobs load.</p>
            {Object.entries(weights).map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '190px 1fr 52px', gap: 12, alignItems: 'center', marginBottom: 9 }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', textTransform: 'capitalize' }}>{k.replace(/Fit$/, ' fit')}</span>
                <input type="range" min="0" max="45" value={v} onChange={(e) => saveWeights({ ...weights, [k]: Number(e.target.value) })} />
                <span className="mono" style={{ color: 'var(--molten)', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
            {totalWeight !== 100 && <p style={{ fontSize: 11.5, color: 'var(--amber)' }}>Scores normalize to 100 automatically, but the classic split sums to exactly 100.</p>}
          </div>
        </Reveal>
      )}

      {/* auto submit policy */}
      <Reveal>
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}><Sparkles size={17} color="var(--violet)" /><h3>Automatic submission policy</h3>
            <Toggle on={!!auto.enabled} onChange={(v) => setAuto({ ...auto, enabled: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
            <ShieldAlert size={15} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              Auto submit stays off by default and no platform currently allows unattended submission without risking your account. JobForge gets you to the finish line instead: instant alerts on new roles, a prepared packet, and the Helper extension prefilling forms on the employer's own page. Your final click is what submits, everywhere, always.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Field label="Max applications per day"><input className="input mono" type="number" min="1" max="20" value={auto.maxPerDay} onChange={(e) => setAuto({ ...auto, maxPerDay: Number(e.target.value) })} /></Field>
          </div>
          <button className="btn primary sm" style={{ marginTop: 12 }} onClick={async () => { await api('/settings', { method: 'PUT', body: { autoSubmit: auto } }); await refresh(); toast('Policy saved', 'ok'); }}>Save policy</button>
        </div>
      </Reveal>

      {/* data */}
      <Reveal>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Your data</h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
            Everything lives in <code className="mono">server/data/</code>: profile, parsed resume text, tracked jobs, scam log, keys, receipts. Export it any time, delete it any time.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="btn sm" href="/api/export" download><Download size={13} /> Export everything as JSON</a>
            <button className="btn danger sm" onClick={async () => {
              if (!confirm('This wipes profile, jobs, tracker history, scam log, and settings on this machine. Resume files too. Continue?')) return;
              setBusy(true);
              try { await api('/reset', { method: 'POST', body: { confirm: true } }); await refresh(); toast('Everything cleared. Onboarding starts fresh', 'ok'); }
              catch (e) { toast(e.message, 'err'); }
              finally { setBusy(false); }
            }} disabled={busy}>{busy ? <Spinner /> : <Trash2 size={13} />} Reset all data</button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
