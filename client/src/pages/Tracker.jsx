import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KanbanSquare, CheckCircle2, Clock, XCircle, FileSignature } from 'lucide-react';
import { api, timeAgo, daysUntil } from '../api.js';
import { SectionHead, Chip, Modal, Empty, useToast, Field, Reveal, Spinner } from '../ui.jsx';

const COLUMNS = [
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready_for_review', label: 'Ready for review' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'closed', label: 'Closed' }
];
const CLOSED_STATES = ['rejected', 'withdrawn', 'skipped', 'accepted'];

const STATE_TONE = {
  discovered: 'amber', shortlisted: 'orange', preparing: 'violet', ready_for_review: 'cyan',
  authorized: 'green', submitting: 'violet', submitted: 'green', confirmation_pending: 'amber',
  failed: 'red', assessment: 'cyan', interview: 'violet', offer: 'lime', accepted: 'green',
  rejected: 'red', withdrawn: 'red', skipped: 'red', needs_input: 'amber'
};

export default function Tracker() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const toast = useToast();

  const load = () => api('/applications').then(setData).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);

  const move = async (app, state) => {
    try {
      await api(`/applications/${app.id}`, { method: 'PATCH', body: { state } });
      toast(state === 'submitted' && !app.receipt ? 'Marked pending confirmation. A submission without a receipt is never called submitted here' : `Moved to ${state.replace(/_/g, ' ')}`, 'ok');
      load();
      setOpen(null);
    } catch (e) { toast(e.message, 'err'); }
  };

  const confirmReceipt = async (app) => {
    const reference = prompt('Paste the confirmation number, email reference, or page text that proves submission');
    if (!reference) return;
    try {
      await api(`/applications/${app.id}/receipt`, { method: 'POST', body: { reference, channel: 'manual confirmation' } });
      toast('Receipt stored. Application marked submitted on evidence', 'ok');
      load();
      setOpen(null);
    } catch (e) { toast(e.message, 'err'); }
  };

  if (!data) return <div className="shimmer" style={{ height: 300 }} />;
  const { applications, transitions } = data;
  const closed = applications.filter((a) => CLOSED_STATES.includes(a.state));
  const inCols = applications.filter((a) => !CLOSED_STATES.includes(a.state) || a.state === 'accepted');

  return (
    <div>
      <SectionHead kicker="Pipeline" title="Every application, one honest timeline"
        sub="A submission only counts when a receipt backs it. Clicks and generic HTTP responses are never treated as proof." />

      {applications.length === 0 && (
        <Empty icon={<KanbanSquare size={24} color="var(--molten)" />} title="The board is clear"
          sub="Open any job on the Jobs page and start tracking it, Shortlist, prepare, submit with the Helper extension, and attach the receipt." />
      )}

      <div className="kan">
        {COLUMNS.map((col) => {
          const cards = applications.filter((a) => col.id === 'closed' ? closed.includes(a) : col.id === 'submitted' ? ['submitted', 'confirmation_pending', 'assessment'].includes(a.state) : col.id === 'interview' ? a.state === 'interview' : a.state === col.id);
          if (col.id === 'closed' && closed.length === 0) return null;
          return (
            <div key={col.id} className="kan-col">
              <h4>{col.label} <span>{cards.length}</span></h4>
              <AnimatePresence>
                {cards.map((a) => (
                  <motion.div key={a.id} layout className="kan-card" onClick={() => setOpen(a)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <strong style={{ fontSize: 12.5, lineHeight: 1.3 }}>{a.jobSnapshot?.title || 'Role'}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--faint)', margin: '4px 0 7px' }}>{a.jobSnapshot?.company}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip tone={STATE_TONE[a.state]}>{a.state.replace(/_/g, ' ')}</Chip>
                      <span style={{ fontSize: 10, color: 'var(--faint)' }}>{a.mode === 'extension_assisted' ? 'helper' : 'manual'}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {closed.length > 0 && (
        <Reveal style={{ marginTop: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Closed outcomes</h3>
            {closed.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)', fontSize: 12.5 }}>
                <span><strong>{a.jobSnapshot?.title}</strong> · {a.jobSnapshot?.company}</span>
                <Chip tone={STATE_TONE[a.state]}>{a.state}</Chip>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} wide>
        {open && (
          <>
            <h2 style={{ fontSize: 21 }}>{open.jobSnapshot?.title}</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 14 }}>{open.jobSnapshot?.company} {open.jobSnapshot?.city ? `· ${open.jobSnapshot.city}` : ''}</p>
            {open.receipt && (
              <div className="card" style={{ borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.05)', padding: 12, marginBottom: 14 }}>
                <strong style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}><CheckCircle2 size={14} color="var(--green)" /> Receipt {open.receipt.reference}</strong>
                <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{open.receipt.channel} · {new Date(open.receipt.submittedAt).toLocaleString('en-IN')}{open.receipt.note ? ` · ${open.receipt.note}` : ''}</p>
              </div>
            )}
            <h4 style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Timeline</h4>
            {open.history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', minWidth: 130 }}>{new Date(h.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <Chip tone={STATE_TONE[h.state]}>{h.state.replace(/_/g, ' ')}</Chip>
                {h.note && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{h.note}</span>}
              </div>
            ))}
            <div className="divider" />
            <h4 style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Move to</h4>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {(transitions[open.state] || []).map((s) => (
                <button key={s} className="btn sm" onClick={() => move(open, s)}>{s.replace(/_/g, ' ')}</button>
              ))}
              {(transitions[open.state] || []).length === 0 && <span style={{ fontSize: 12, color: 'var(--faint)' }}>This state is terminal.</span>}
            </div>
            {['submitting', 'confirmation_pending'].includes(open.state) && (
              <button className="btn primary sm" style={{ marginTop: 12 }} onClick={() => confirmReceipt(open)}><FileSignature size={13} /> Attach confirmation receipt</button>
            )}
            {open.state === 'ready_for_review' && (
              <p style={{ fontSize: 11.5, color: 'var(--amber)', marginTop: 12 }}>Authorize only when every answer in the packet is truthful and approved. Authorization is scoped to this application.</p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
