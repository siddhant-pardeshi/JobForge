import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Calculator, TrendingUp, Wallet, Landmark } from 'lucide-react';
import { api, inr } from '../api.js';
import { SectionHead, Chip, Field, Reveal, Spinner, useToast, Bar, CountUp } from '../ui.jsx';

export default function Relocation() {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({ city: 'Bengaluru', inputMode: 'ctc', fixedGrossAnnual: '', variableAnnual: '', monthlyTakeHome: '', joiningBonus: '', deposit: '', movingCost: '', employerAssistance: '', emergencyBuffer: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [budgets, setBudgets] = useState(null);
  const [editCity, setEditCity] = useState('Pune');
  const toast = useToast();

  useEffect(() => {
    api('/relocation').then((r) => { setCfg(r); setBudgets(r.budgets); }).catch((e) => toast(e.message, 'err'));
  }, []);

  const evaluate = async () => {
    setBusy(true);
    try {
      const body = { ...form };
      for (const k of ['fixedGrossAnnual', 'variableAnnual', 'monthlyTakeHome', 'joiningBonus', 'deposit', 'movingCost', 'employerAssistance', 'emergencyBuffer']) {
        body[k] = form[k] === '' ? null : Number(form[k]);
      }
      const res = await api('/relocation/evaluate', { method: 'POST', body });
      setResult(res.result);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const saveBudgets = async () => {
    try {
      await api('/relocation', { method: 'PUT', body: { budgets } });
      toast('Budgets saved', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };

  if (!cfg || !budgets) return <div className="shimmer" style={{ height: 300 }} />;

  const cats = cfg.categories;

  return (
    <div>
      <SectionHead kicker="Offer economics" title="Would the move actually pay?"
        sub="Recurring surplus and upfront liquidity are computed separately. Deposits never masquerade as monthly costs and joining bonuses never masquerade as salary." />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1.1fr)', gap: 16, alignItems: 'start' }}>
        <Reveal>
          <div className="card">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}><Calculator size={16} color="var(--molten)" /><h3>Evaluate an offer</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Destination city">
                <select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  {Object.keys(budgets).map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="How is pay quoted?">
                <select className="input" value={form.inputMode} onChange={(e) => setForm({ ...form, inputMode: e.target.value })}>
                  <option value="ctc">Fixed gross annual</option>
                  <option value="takehome">Monthly take home</option>
                </select>
              </Field>
              {form.inputMode === 'ctc' ? (
                <>
                  <Field label="Fixed gross per year (₹)"><input className="input mono" type="number" value={form.fixedGrossAnnual} onChange={(e) => setForm({ ...form, fixedGrossAnnual: e.target.value })} placeholder="900000" /></Field>
                  <Field label="Variable pay per year (₹)"><input className="input mono" type="number" value={form.variableAnnual} onChange={(e) => setForm({ ...form, variableAnnual: e.target.value })} placeholder="100000" /></Field>
                </>
              ) : (
                <Field label="Monthly take home (₹)"><input className="input mono" type="number" value={form.monthlyTakeHome} onChange={(e) => setForm({ ...form, monthlyTakeHome: e.target.value })} placeholder="62000" /></Field>
              )}
              <Field label="Joining bonus (₹)"><input className="input mono" type="number" value={form.joiningBonus} onChange={(e) => setForm({ ...form, joiningBonus: e.target.value })} /></Field>
              <Field label="Security deposit (₹)"><input className="input mono" type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} placeholder="80000" /></Field>
              <Field label="Moving and setup (₹)"><input className="input mono" type="number" value={form.movingCost} onChange={(e) => setForm({ ...form, movingCost: e.target.value })} placeholder="25000" /></Field>
              <Field label="Employer assistance (₹)"><input className="input mono" type="number" value={form.employerAssistance} onChange={(e) => setForm({ ...form, employerAssistance: e.target.value })} /></Field>
              <Field label="Emergency buffer (₹)" hint="Defaults to half the deposit if empty"><input className="input mono" type="number" value={form.emergencyBuffer} onChange={(e) => setForm({ ...form, emergencyBuffer: e.target.value })} /></Field>
            </div>
            <button className="btn primary" style={{ marginTop: 16 }} onClick={evaluate} disabled={busy}>{busy ? <Spinner /> : <TrendingUp size={14} />} Run the numbers</button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card" style={{ minHeight: 300 }}>
            {!result ? (
              <div className="empty" style={{ padding: '80px 20px' }}>
                <div className="orb"><Plane size={26} color="var(--molten)" /></div>
                <h3>Scenarios land here</h3>
                <p style={{ fontSize: 12.5 }}>Cautious, base, and favorable cases for surplus, savings margin, and the gap over staying in Pune.</p>
              </div>
            ) : result.verdict === 'unknown' ? (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <Chip tone="amber">Affordability unknown</Chip>
                <h3 style={{ margin: '12px 0 8px', fontSize: 20 }}>{result.headline || 'Not enough numbers yet'}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{result.basis}</p>
                {result.questions && (
                  <>
                    <div className="divider" />
                    <strong style={{ fontSize: 12.5 }}>Ask the recruiter</strong>
                    <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)' }}>{result.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Chip tone={result.verdict === 'worth_considering' ? 'green' : 'amber'}>
                  {result.verdict === 'worth_considering' ? 'Clears your policy' : 'Does not clear your policy'}
                </Chip>
                <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}>{result.basis}</p>
                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                  {result.scenarios.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="card" style={{ padding: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <strong style={{ fontSize: 13 }}>{s.label}</strong>
                        <span className="mono" style={{ color: s.benefit >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 12.5 }}>
                          {s.benefit >= 0 ? '+' : ''}{inr(s.benefit)}/mo over Pune
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 9, fontSize: 11.5, color: 'var(--muted)' }}>
                        <div>net <span className="mono" style={{ color: 'var(--text)' }}>{inr(s.net)}</span></div>
                        <div>costs <span className="mono" style={{ color: 'var(--text)' }}>{inr(s.costs)}</span></div>
                        <div>surplus <span className="mono" style={{ color: s.surplus >= 0 ? 'var(--green)' : 'var(--red)' }}>{inr(s.surplus)}</span></div>
                      </div>
                      <div style={{ marginTop: 8 }}><Bar pct={Math.max(4, (s.surplus / Math.max(1, s.net)) * 100)} delay={i * 0.08} color={s.surplus >= 0 ? undefined : 'linear-gradient(90deg,#fb4d4d,#ff8a3d)'} /></div>
                    </motion.div>
                  ))}
                </div>
                <div className="divider" />
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div className="stat-label" style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Wallet size={11} /> upfront cash needed</div>
                    <div className="stat-num" style={{ fontSize: 22 }}><CountUp to={result.upfrontCash} /></div>
                    <p style={{ fontSize: 10.5, color: 'var(--faint)' }}>deposit {inr(result.upfrontBreakdown.deposit)} + moving {inr(result.upfrontBreakdown.movingCost)} + buffer {inr(result.upfrontBreakdown.emergencyBuffer)} − help {inr(result.upfrontBreakdown.assistance)}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div className="stat-label" style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Landmark size={11} /> savings margin (base)</div>
                    <div className="stat-num" style={{ fontSize: 22, color: result.scenarios[1].savingsMargin >= 0 ? 'var(--green)' : 'var(--red)' }}><CountUp to={result.scenarios[1].savingsMargin} /></div>
                  </div>
                </div>
                {result.checks?.length > 0 && (
                  <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--muted)' }}>
                    {result.checks.map((c, i) => <li key={i} style={{ color: c.ok ? 'var(--green)' : 'var(--amber)' }}>{c.ok ? '✓' : '✗'} {c.label} · actual {inr(c.actual)}</li>)}
                  </ul>
                )}
                {(result.joiningBonusNote || result.variableNote) && (
                  <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 10 }}>{[result.joiningBonusNote, result.variableNote].filter(Boolean).join(' ')}</p>
                )}
              </motion.div>
            )}
          </div>
        </Reveal>
      </div>

      <Reveal style={{ marginTop: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <h3>City budgets, yours to edit</h3>
            <select className="input" style={{ width: 160 }} value={editCity} onChange={(e) => setEditCity(e.target.value)}>
              {Object.keys(budgets).map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="btn primary sm" onClick={saveBudgets}>Save budgets</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {cats.map((cat) => (
              <Field key={cat.id} label={cat.label}>
                <input className="input mono" type="number" value={budgets[editCity]?.[cat.id] ?? 0}
                  onChange={(e) => setBudgets({ ...budgets, [editCity]: { ...(budgets[editCity] || {}), [cat.id]: Number(e.target.value) } })} />
              </Field>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
