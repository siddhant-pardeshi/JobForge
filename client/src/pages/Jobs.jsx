import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, RefreshCw, ClipboardPaste, Search, X, Sparkles, ShieldAlert, ScrollText, ExternalLink, ThumbsDown, Star, Copy, Wand2, FileDown, GraduationCap, Layers3, Ban, Clock3, CalendarClock } from 'lucide-react';
import { api, lpa, timeAgo, daysUntil, inr } from '../api.js';
import { useApp } from '../App.jsx';
import { SectionHead, Chip, Bar, Empty, Drawer, Modal, Spinner, useToast, Field, Reveal } from '../ui.jsx';
import { JobCard, LANE_META } from '../jobCard.jsx';

const TABS = [
  { id: 'all', label: 'All live' },
  { id: 'best_pune', label: 'Best in Pune' },
  { id: 'remote', label: 'Remote from Pune' },
  { id: 'relocation', label: 'Relocation' },
  { id: 'stretch', label: 'Stretch' },
  { id: 'needs_verification', label: 'Needs verification' },
  { id: 'excluded', label: 'Filtered out' }
];

export default function Jobs() {
  const { boot } = useApp();
  const toast = useToast();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [packet, setPacket] = useState(null);
  const [packetBusy, setPacketBusy] = useState(false);

  const load = useCallback(() => api('/jobs').then(setData).catch((e) => toast(e.message, 'err')), [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (location.state?.openJob) { setOpenId(location.state.openJob); loadDetail(location.state.openJob); }
  }, [location.state]);

  const loadDetail = async (id) => {
    try { setDetail(await api(`/jobs/${id}`)); } catch (e) { toast(e.message, 'err'); }
  };
  const openJob = (job) => { setOpenId(job.id); loadDetail(job.id); };
  const close = () => { setOpenId(null); setDetail(null); setPacket(null); };

  const fetchSources = async () => {
    setFetching(true);
    try {
      const res = await api('/jobs/fetch', { method: 'POST' });
      for (const r of res.report) toast(`${r.company}: ${r.message}`, r.ok ? 'ok' : 'err');
      await load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setFetching(false); }
  };

  const jobs = (data?.jobs || []).filter((j) => {
    if (!j.match) return tab === 'excluded';
    let pass = true;
    if (tab === 'all') pass = j.match.lane !== 'excluded';
    else if (tab === 'stretch') pass = j.match.lane !== 'excluded' && j.match.stretch;
    else pass = j.match.lane === tab;
    if (pass && q) pass = `${j.title} ${j.company?.name} ${j.city || ''}`.toLowerCase().includes(q.toLowerCase());
    if (pass && minScore > 0) pass = (j.match?.score || 0) >= minScore;
    return pass;
  });

  const laneCount = (id) => {
    const list = data?.jobs || [];
    if (id === 'all') return list.filter((j) => j.match && j.match.lane !== 'excluded').length;
    if (id === 'stretch') return list.filter((j) => j.match && j.match.lane !== 'excluded' && j.match.stretch).length;
    return list.filter((j) => j.match?.lane === id).length;
  };

  const applyDemo = async (job) => {
    try {
      const res = await api(`/jobs/${job.id}/apply-demo`, { method: 'POST' });
      toast(`Synthetic submission recorded. Receipt ${res.application.receipt.reference}`, 'ok');
      close();
    } catch (e) { toast(e.message, 'err'); }
  };

  const makePacket = async (job) => {
    setPacketBusy(true);
    try {
      const res = await api(`/jobs/${job.id}/packet`, { method: 'POST' });
      setPacket(res.packet);
      toast(res.packet.aiUsed ? 'Packet forged with AI, grounded in your resume facts' : 'Packet forged with deterministic rules, add an AI key for finer wording', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setPacketBusy(false); }
  };

  return (
    <div>
      <SectionHead
        kicker="Opportunity explorer"
        title="Every opening, scored and explained"
        sub="Ranked by seven transparent components. Filtered out lanes are never hidden, so you can always audit why something was excluded."
        right={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => setImportOpen(true)}><ClipboardPaste size={14} /> Paste a job</button>
            <button className="btn primary sm" onClick={fetchSources} disabled={fetching}>{fetching ? <Spinner /> : <RefreshCw size={14} />} Fetch from sources</button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--faint)' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search title, company, or city" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
          min score <input type="range" min="0" max="90" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} style={{ width: 110 }} /> <span className="mono" style={{ color: 'var(--molten)' }}>{minScore}</span>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}<span className="cnt">{laneCount(t.id)}</span>
          </button>
        ))}
      </div>

      {!data && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>{[1, 2, 3, 4].map((i) => <div key={i} className="shimmer" style={{ height: 190 }} />)}</div>}

      {data && jobs.length === 0 && (
        <Empty icon={<Compass size={24} color="var(--molten)" />} title="Nothing in this lane" sub="Fetch from sources, paste a job description, or relax the filters. Demo mode may also be off." action={<button className="btn primary sm" onClick={() => setImportOpen(true)}><ClipboardPaste size={13} /> Import a job</button>} />
      )}

      <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        <AnimatePresence>
          {jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} onOpen={openJob} />)}
        </AnimatePresence>
      </motion.div>

      {/* search strings */}
      {detail?.booleanStrings && (
        <Reveal style={{ marginTop: 34 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}><Sparkles size={16} color="var(--molten)" /><h3>Boolean strings for your paid subscriptions</h3></div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>Get more out of the LinkedIn Premium and Naukri plans you already pay for. Paste these into their keyword boxes.</p>
            {detail.booleanStrings.map((s) => (
              <div key={s.platform} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
                <Chip tone="cyan" style={{ flexShrink: 0 }}>{s.platform}</Chip>
                <code className="mono" style={{ flex: 1, fontSize: 11.5, color: 'var(--muted)', wordBreak: 'break-all' }}>{s.value}</code>
                <button className="btn ghost sm" onClick={() => { navigator.clipboard.writeText(s.value); toast(`${s.platform} string copied`, 'ok'); }}><Copy size={12} /></button>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <Drawer open={!!openId} onClose={close}>
        {detail ? <JobDetail detail={detail} packet={packet} packetBusy={packetBusy} onPacket={() => makePacket(detail.job)} onApplyDemo={() => applyDemo(detail.job)} onFeedback={async (action, note) => {
          try { await api(`/jobs/${detail.job.id}/action`, { method: 'POST', body: { action, note } }); toast('Feedback recorded. Actions on imported jobs are stored', 'ok'); } catch (e) { toast(e.message, 'err'); }
        }} onClose={close} /> : <div className="shimmer" style={{ height: 400 }} />}
      </Drawer>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={(r) => { toast(r.scan.severity === 'critical' ? 'Imported, but the scam screen found serious indicators' : 'Job imported and scored', r.scan.severity === 'critical' ? 'err' : 'ok'); load(); }} />
    </div>
  );
}

function JobDetail({ detail, packet, packetBusy, onPacket, onApplyDemo, onFeedback, onClose }) {
  const { job, interviewReports, dossier } = detail;
  const m = job.match;
  const toast = useToast();
  const deadline = daysUntil(job.deadline);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 23, lineHeight: 1.2 }}>{job.title}</h2>
          <p style={{ color: 'var(--muted)', marginTop: 5 }}>{job.company?.name} {job.company?.atsProvider && <Chip tone="cyan">{job.company.atsProvider}</Chip>}</p>
        </div>
        <button className="btn ghost sm" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '16px 0' }}>
        <Chip><Layers3 size={10} /> {job.location || job.city || 'location unclear'}</Chip>
        {job.workMode && <Chip>{job.workMode}</Chip>}
        {lpa(job.salary) && <Chip tone="lime">{lpa(job.salary)}</Chip>}
        <Chip><Clock3 /> {timeAgo(job.postedAt)}</Chip>
        {deadline !== null && <Chip tone={deadline <= 3 ? 'red' : 'amber'}><CalendarClock size={10} /> {deadline >= 0 ? `${deadline} days to deadline` : 'deadline passed'}</Chip>}
        {job.seenOnMultipleSources && <Chip tone="violet"><Layers3 size={10} /> merged from {job.sources?.length} sources</Chip>}
      </div>

      {(job.scamScore || 0) >= 40 && (
        <div className="card" style={{ borderColor: 'rgba(251,77,77,0.55)', background: 'rgba(251,77,77,0.07)', marginBottom: 16 }}>
          <strong style={{ color: '#ffa2a2', display: 'flex', gap: 7, alignItems: 'center' }}><ShieldAlert size={15} /> Scam screen raised {job.scamScore}/100 risk</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)' }}>
            {(job.scamFlags || []).slice(0, 4).map((f, i) => <li key={i}>{f.label}</li>)}
          </ul>
        </div>
      )}

      {m && (
        <>
          <h3 style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', margin: '20px 0 12px' }}>Score breakdown</h3>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 16 }}>
            {m.components.map((c, i) => (
              <div key={c.id} style={{ flex: 1, minWidth: 130 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>{c.label}</span>
                  <span className="mono" style={{ color: 'var(--molten)' }}>{c.earned}/{c.weight}</span>
                </div>
                <Bar pct={(c.earned / c.weight) * 100} delay={i * 0.08} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <strong style={{ fontSize: 12.5, color: 'var(--green)' }}>Why it fits</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12.5, color: 'var(--muted)', display: 'grid', gap: 5 }}>
                {(m.reasons || []).filter((r) => r.kind !== 'gap').map((r, i) => <li key={i}>{r.text}</li>)}
                {m.notes?.map((n, i) => <li key={`n${i}`} style={{ color: 'var(--faint)' }}>· {n}</li>)}
              </ul>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <strong style={{ fontSize: 12.5, color: 'var(--amber)' }}>Gaps and unknowns</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12.5, color: 'var(--muted)', display: 'grid', gap: 5 }}>
                {m.missing?.length ? m.missing.slice(0, 5).map((x, i) => <li key={i}>△ {x.name} ({x.severity === 'mustHave' ? 'must have' : x.severity})</li>) : <li>None detected</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      {job.bond && job.bond.status !== 'no_evidence' && (
        <div className="card" style={{ borderColor: 'rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.06)', marginTop: 16 }}>
          <strong style={{ color: '#ffd884', display: 'flex', gap: 7, alignItems: 'center' }}><ScrollText size={15} /> Service terms reported: {job.bond.status.replace(/_/g, ' ')}</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)' }}>
            {job.bond.evidence.map((e, i) => <li key={i}>{e.text} <em style={{ color: 'var(--faint)' }}>({e.source})</em></li>)}
          </ul>
          <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 8 }}>Absence of evidence is never treated as absence of a bond. Read the actual agreement before joining.</p>
        </div>
      )}

      {(interviewReports?.length > 0 || dossier) && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8 }}><GraduationCap size={15} color="var(--cyan)" /> Interview intel {job.source?.type === 'demo' && <Chip tone="violet">synthetic</Chip>}</strong>
          {dossier && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>{dossier.sector} · {dossier.engineering}</p>}
          {interviewReports.map((r, i) => (
            <p key={i} style={{ fontSize: 12.5, color: 'var(--muted)' }}>· {r.stages} <em style={{ color: 'var(--faint)' }}>({r.mode}, {r.reportedBy})</em></p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '22px 0 8px' }}>
        <button className="btn primary sm" onClick={onPacket} disabled={packetBusy}>{packetBusy ? <Spinner /> : <Wand2 size={13} />} Forge application packet</button>
        {job.applyUrl && <a className="btn sm" href={job.applyUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open official posting</a>}
        {job.source?.type === 'demo' && <button className="btn sm" onClick={onApplyDemo}><FileDown size={13} /> Apply via demo adapter</button>}
        <button className="btn ghost sm" onClick={() => onFeedback('skip')}><Ban size={13} /> Not for me</button>
      </div>
      {job.source?.type === 'demo' && <p style={{ fontSize: 11.5, color: 'var(--faint)' }}>Demo mode: the apply button runs a synthetic form adapter and touches no real employer.</p>}

      {packet && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ display: 'flex', gap: 7, alignItems: 'center' }}><ScrollText size={15} color="var(--molten)" /> Application packet</strong>
            {packet.aiUsed ? <Chip tone="violet">AI drafted, resume grounded</Chip> : <Chip tone="cyan">rules drafted</Chip>}
          </div>
          {packet.summarySuggestion && <p style={{ fontSize: 13, marginTop: 10 }}><strong>Summary idea:</strong> {packet.summarySuggestion}</p>}
          <p style={{ fontSize: 13, marginTop: 10, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{packet.coverLetter}</p>
          {packet.bulletSuggestions?.length > 0 && (
            <>
              <div className="divider" />
              <strong style={{ fontSize: 12.5 }}>Bullet suggestions grounded in your resume</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)' }}>{packet.bulletSuggestions.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </>
          )}
          <div className="divider" />
          <strong style={{ fontSize: 12.5, color: 'var(--amber)' }}>Before you submit, answer these</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)' }}>{(packet.questions || []).map((qq, i) => <li key={i}>{qq}</li>)}</ul>
          <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 10 }}>{packet.factsLocked}</p>
        </motion.div>
      )}

      <div className="divider" />
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--faint)' }}>Full job description</summary>
        <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--muted)', marginTop: 10 }}>{job.description}</p>
      </details>
    </div>
  );
}

function ImportModal({ open, onClose, onDone }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async () => {
    setBusy(true);
    try {
      const res = await api('/jobs/import', { method: 'POST', body: { text, title, company, city } });
      onDone(res);
      onClose();
      setText('');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} wide>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Import a job description</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Paste any posting from LinkedIn, Naukri, a company site, or a WhatsApp forward. It gets classified, scored, and scam screened exactly like everything else.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="Job title (optional)"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Company (optional)"><input className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
        <Field label="City (optional)"><input className="input" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
      </div>
      <Field label="Full posting text">
        <textarea className="input" rows={9} placeholder="Paste the entire description here" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn primary sm" onClick={submit} disabled={busy || text.trim().length < 80}>{busy ? <Spinner /> : null} Import and score</button>
      </div>
    </Modal>
  );
}
