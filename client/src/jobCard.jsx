import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe2, Clock3, Ban, ShieldAlert, Link2, Layers3, Flame } from 'lucide-react';
import { TiltCard, ScoreRing, Chip, Stagger } from './ui.jsx';
import { lpa, timeAgo } from './api.js';

export const LANE_META = {
  best_pune: { label: 'Best in Pune', tone: 'green' },
  remote: { label: 'Remote from Pune', tone: 'cyan' },
  relocation: { label: 'Relocation worth a look', tone: 'violet' },
  needs_verification: { label: 'Needs verification', tone: 'amber' },
  excluded: { label: 'Filtered out', tone: 'red' }
};

export function LaneChip({ lane, stretch }) {
  const meta = LANE_META[lane] || { label: lane, tone: 'amber' };
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <Chip tone={meta.tone}>{meta.label}</Chip>
      {stretch && <Chip tone="orange">stretch</Chip>}
    </span>
  );
}

export function JobCard({ job, onOpen, index = 0 }) {
  const match = job.match;
  const score = match?.score ?? 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <TiltCard onClick={() => onOpen(job)} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--grad-soft)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#ffb28a', flexShrink: 0 }}>
            {(job.company?.name || '?').slice(0, 1)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 15.5, lineHeight: 1.3 }}>{job.title}</h3>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 3 }}>{job.company?.name}{job.seenOnMultipleSources && <span title="Seen on more than one source"> · <Layers3 size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> {job.sources?.length || 2} sources</span>}</div>
          </div>
          <ScoreRing score={score} size={64} label="match" />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Chip><MapPin size={10} /> {job.location || job.city || 'location unclear'}</Chip>
          {job.workMode && <Chip>{job.workMode}</Chip>}
          {lpa(job.salary) && <Chip tone="lime">{lpa(job.salary)}</Chip>}
          <Chip><Clock3 size={10} /> {timeAgo(job.postedAt)}</Chip>
        </div>

        {match && match.reasons?.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
            {match.reasons.slice(0, 2).map((r, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 6 }}>
                <span style={{ color: r.kind === 'gap' ? 'var(--amber)' : 'var(--green)' }}>{r.kind === 'gap' ? '△' : '✓'}</span>
                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.text}</span>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 8, flexWrap: 'wrap' }}>
          <LaneChip lane={match?.lane} stretch={match?.stretch} />
          {job.source?.type === 'demo' && <Chip tone="violet">demo</Chip>}
          {(job.scamScore || 0) >= 40 && <Chip tone="red"><ShieldAlert size={10} /> scam risk</Chip>}
          {job.bond?.status === 'employer_confirmed' && <Chip tone="amber">bond</Chip>}
        </div>
      </TiltCard>
    </motion.div>
  );
}
