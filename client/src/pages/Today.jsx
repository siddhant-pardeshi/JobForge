import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, CalendarClock, Crosshair, TrendingUp, Radio, ChevronRight, Gauge } from 'lucide-react';
import { api, daysUntil } from '../api.js';
import { useApp } from '../App.jsx';
import { CountUp, Reveal, SectionHead, Chip, Bar, Empty, Spinner } from '../ui.jsx';
import { JobCard, LANE_META } from '../jobCard.jsx';
import { useNavigate } from 'react-router-dom';

export default function Today() {
  const { boot } = useApp();
  const [data, setData] = useState(null);
  const [apps, setApps] = useState([]);
  const [health, setHealth] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api('/jobs').then(setData).catch(() => {});
    api('/applications').then((r) => setApps(r.applications)).catch(() => {});
    api('/sources/health').then(setHealth).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const jobs = data?.jobs || [];
  const live = jobs.filter((j) => j.match && j.match.lane !== 'excluded');
  const top = live.slice(0, 4);
  const deadlines = live
    .filter((j) => j.deadline && daysUntil(j.deadline) !== null && daysUntil(j.deadline) >= 0)
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
    .slice(0, 4);
  const review = live.filter((j) => j.match.lane === 'needs_verification').slice(0, 4);
  const name = boot?.profile?.name?.split(' ')[0] || 'hunter';

  const funnel = {};
  for (const a of apps) funnel[a.state] = (funnel[a.state] || 0) + 1;

  const stats = [
    { label: 'Live opportunities', value: live.length, icon: Crosshair },
    { label: 'Top match score', value: live[0]?.match?.score || 0, icon: Gauge, decimals: 0 },
    { label: 'In the tracker', value: apps.length, icon: TrendingUp },
    { label: 'Closing soon', value: deadlines.length, icon: CalendarClock }
  ];

  return (
    <div>
      <Reveal>
        <div className="glass" style={{ padding: '30px 32px', position: 'relative', overflow: 'hidden', marginBottom: 26 }}>
          <motion.div style={{ position: 'absolute', inset: '-40%', background: 'var(--grad)', opacity: 0.07, filter: 'blur(70px)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--molten)', fontWeight: 700, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 10 }}>
              <Flame size={13} /> {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.08 }}>
              {greeting}, <span className="sweep">{name}</span>.<br />
              <span style={{ color: 'var(--muted)', fontSize: '0.62em', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Here is what the forge turned up for you today.</span>
            </motion.h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 26 }}>
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--faint)', marginBottom: 4 }}><s.icon size={12} /><span className="stat-label">{s.label}</span></div>
                  <div className="stat-num"><CountUp to={s.value} decimals={s.decimals || 0} /></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {!data && <div className="shimmer" style={{ height: 200 }} />}

      {data && (
        <>
          <SectionHead kicker="Hunt deck" title="Top opportunities right now" right={<button className="btn sm" onClick={() => navigate('/jobs')}>See all {live.length} <ChevronRight size={13} /></button>} />
          {top.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 34 }}>
              {top.map((job, i) => <JobCard key={job.id} job={job} index={i} onOpen={() => navigate('/jobs', { state: { openJob: job.id } })} />)}
            </div>
          ) : (
            <Empty icon={<Flame size={24} color="var(--molten)" />} title="No live matches yet" sub="Import a job description or connect a source on the Jobs and Sources pages, the engine takes it from there." />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
            <Reveal>
              <div className="card" style={{ height: '100%' }}>
                <SectionHead kicker="Clock" title="Deadline radar" />
                {deadlines.length ? deadlines.map((j) => {
                  const d = daysUntil(j.deadline);
                  return (
                    <motion.div key={j.id} whileHover={{ x: 5 }} onClick={() => navigate('/jobs', { state: { openJob: j.id } })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px dashed rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{j.company?.name}</div>
                      </div>
                      <Chip tone={d <= 3 ? 'red' : d <= 7 ? 'amber' : 'green'}>{d === 0 ? 'closes today' : `${d}d left`}</Chip>
                    </motion.div>
                  );
                }) : <p style={{ color: 'var(--faint)', fontSize: 12.5 }}>Nothing closing this week. Breathe.</p>}
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="card" style={{ height: '100%' }}>
                <SectionHead kicker="Second look" title="Needs your decision" />
                {review.length ? review.map((j) => (
                  <motion.div key={j.id} whileHover={{ x: 5 }} onClick={() => navigate('/jobs', { state: { openJob: j.id } })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px dashed rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{j.match?.classification?.familyLabel}</div>
                    </div>
                    <Chip tone="amber">review</Chip>
                  </motion.div>
                )) : <p style={{ color: 'var(--faint)', fontSize: 12.5 }}>No ambiguous roles waiting. The classifier is confident.</p>}
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="card" style={{ height: '100%' }}>
                <SectionHead kicker="Pipeline" title="Application funnel" />
                {apps.length ? Object.entries(funnel).map(([state, count]) => (
                  <div key={state} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{state.replace(/_/g, ' ')}</span>
                      <span className="mono" style={{ color: 'var(--molten)' }}>{count}</span>
                    </div>
                    <Bar pct={(count / apps.length) * 100} />
                  </div>
                )) : <p style={{ color: 'var(--faint)', fontSize: 12.5 }}>No applications yet. Shortlist a role and open its tracker entry to begin.</p>}
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="card" style={{ height: '100%' }}>
                <SectionHead kicker="Plumbing" title="Source health" />
                {health && health.summary.total > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <Chip tone="green">{health.summary.ok} healthy runs</Chip>
                      {health.summary.failing > 0 && <Chip tone="red">{health.summary.failing} failures</Chip>}
                    </div>
                    {health.runs.slice(-4).reverse().map((r, i) => (
                      <div key={i} className="log-line">{r.ok ? '●' : '○'} {r.company} · {r.message}</div>
                    ))}
                  </>
                ) : (
                  <p style={{ color: 'var(--faint)', fontSize: 12.5 }}>No live sources connected yet. Demo mode is feeding the cockpit{boot?.demoMode ? '' : ' and demo is off, so the deck is empty until you add a source'}.</p>
                )}
                <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => navigate('/sources')}><Radio size={13} /> Manage sources</button>
              </div>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
