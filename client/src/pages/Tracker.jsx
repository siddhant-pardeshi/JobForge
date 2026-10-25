import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KanbanSquare, CheckCircle2, XCircle, FileSignature, CalendarClock, Plus, Trash2, Radio } from 'lucide-react';
import { api } from '../api.js';
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

function nextEvent(app) {
  const now = Date.now();
  return (app.events || [])
    .filter((e) => new Date(e.at).getTime() >= now - 3600000)
    .sort((a, b) => new Date(a.at) - new Date(b.at))[0] || null;
}

function untilLabel(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

export default function Tracker() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const toast = useToast();
  const liveRef = useRef(null);

  const load = () => api('/applications').then((r) => { setData(r); setLastSync(new Date()); }).catch(() => {});
  useEffect(() => { load(); }, []);

  // The board organizes itself live: the server moves cards as facts happen
  // (packet forged, round scheduled, receipt attached) and this poll paints
  // every change without a refresh.
  useEffect(() => {
    liveRef.current = setInterval(load, 5000);
    return () => clearInterval(liveRef.current);
  }, []);

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
  // The modal always shows the live record from the latest sync, never a
  // stale snapshot taken when the card was clicked.
  const openApp = open ? applications.find((a) => a.id === open.id) || null : null;

  return (
    <div>
      <SectionHead kicker="Pipeline" title="Your pipeline, organized"
        sub="The board moves cards on its own: forging a packet moves a role to preparing, scheduling a round moves it to interview, a receipt makes the submission count. Manual moves still work whenever you want them."
        right={
          <span className="chip cyan" style={{ gap: 7 }}>
            <Radio size={11} className="live-dot" /> live · synced {lastSync?.toLocaleTimeString('en-IN', { timeStyle: 'short' })}
          </span>
        }
      />

      {applications.length === 0 && (
        <Empty icon={<KanbanSquare size={24} color="var(--molten)" />} title="The board is clear"
          sub="Open any job on the Jobs page and start tracking it. Forging a packet even places the card on the board for you." />
      )}

      <div className="kan">
        {COLUMNS.map((col) => {
          const cards = applications.filter((a) => col.id === 'closed' ? closed.includes(a) : col.id === 'submitted' ? ['submitted', 'confirmation_pending', 'assessment'].includes(a.state) : col.id === 'interview' ? a.state === 'interview' : a.state === col.id);
          if (col.id === 'closed' && closed.length === 0) return null;
          return (
            <div key={col.id} className="kan-col">
              <h4>{col.label} <span>{cards.length}</span></h4>
              <AnimatePresence>
                {cards.map((a) => {
                  const ev = nextEvent(a);
                  return (
                    <motion.div key={a.id} layout className="kan-card" onClick={() => setOpen(a)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <strong style={{ fontSize: 12.5, lineHeight: 1.3 }}>{a.jobSnapshot?.title || 'Role'}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--faint)', margin: '4px 0 7px' }}>{a.jobSnapshot?.company}</div>
                      {ev && (
                        <div className="chip amber" style={{ fontSize: 9.5, marginBottom: 7, padding: '2.5px 8px' }}>
                          <CalendarClock size={9} /> {ev.label} {untilLabel(ev.at)}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip tone={STATE_TONE[a.state]}>{a.state.replace(/_/g, ' ')}</Chip>
                        <span style={{ fontSize: 10, color: 'var(--faint)' }}>{a.mode === 'extension_assisted' ? 'helper' : 'manual'}</span>
                      </div>
                    </motion.div>
                  );
                })}
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

      <Modal open={!!openApp} onClose={() => setOpen(null)} wide>
        {openApp && <AppDetail app={openApp} data={data} onMove={move} onReceipt={confirmReceipt} onChange={load} />}
      </Modal>
    </div>
  );
}

function AppDetail({ app, data, onMove, onReceipt, onChange }) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [at, setAt] = useState('');
  const [mode, setMode] = useState('Online');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const events = (app.events || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));

  const addEvent = async () => {
    if (!label.trim() || !at) { toast('A round name and a date and time are both needed', 'err'); return; }
    setBusy(true);
    try {
      const res = await api(`/applications/${app.id}/events`, { method: 'POST', body: { label, at, mode, note } });
      toast(res.autoMoved === 'interview' ? 'Round scheduled. The board moved this card to Interview on its own' : 'Round scheduled. Reminders start automatically', 'ok');
      setLabel(''); setAt(''); setNote('');
      onChange();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const removeEvent = async (eventId) => {
    try {
      await api(`/applications/${app.id}/events/${eventId}`, { method: 'DELETE' });
      onChange();
    } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <h2 style={{ fontSize: 21 }}>{app.jobSnapshot?.title}</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 14 }}>{app.jobSnapshot?.company} {app.jobSnapshot?.city ? `· ${app.jobSnapshot.city}` : ''}</p>

      {app.receipt && (
        <div className="card" style={{ borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.05)', padding: 12, marginBottom: 14 }}>
          <strong style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}><CheckCircle2 size={14} color="var(--green)" /> Receipt {app.receipt.reference}</strong>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{app.receipt.channel} · {new Date(app.receipt.submittedAt).toLocaleString('en-IN')}{app.receipt.note ? ` · ${app.receipt.note}` : ''}</p>
        </div>
      )}

      <h4 style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Upcoming rounds and reminders</h4>
      {events.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--faint)', marginBottom: 8 }}>No rounds scheduled yet. Add the next interview round and JobForge keeps it on your Today radar and reminds you an hour before.</p>}
      {events.map((ev) => (
        <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
          <Chip tone="amber"><CalendarClock size={10} /> {untilLabel(ev.at)}</Chip>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 12.5 }}>{ev.label}</strong>
            <div style={{ fontSize: 11, color: 'var(--faint)' }}>{new Date(ev.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{ev.mode ? ` · ${ev.mode}` : ''}{ev.note ? ` · ${ev.note}` : ''}</div>
          </div>
          <button className="btn danger sm" onClick={() => removeEvent(ev.id)}><XCircle size={12} /></button>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: 8, marginTop: 10 }}>
        <Field label="Round name"><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Technical round 2" /></Field>
        <Field label="Date and time"><input className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
        <Field label="Mode">
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option>Online</option><option>Onsite</option><option>Phone</option>
          </select>
        </Field>
      </div>
      <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Panel of two, focus on Spring Boot" style={{ marginTop: 8 }} /></Field>
      <button className="btn primary sm" style={{ marginTop: 10 }} onClick={addEvent} disabled={busy}>{busy ? <Spinner /> : <Plus size={13} />} Schedule round</button>

      <div className="divider" />
      <h4 style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Timeline</h4>
      {app.history.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'baseline' }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', minWidth: 130 }}>{new Date(h.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          <Chip tone={STATE_TONE[h.state]}>{h.state.replace(/_/g, ' ')}</Chip>
          {h.note && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{h.note}</span>}
        </div>
      ))}
      <div className="divider" />
      <h4 style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Move to</h4>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {(data.transitions[app.state] || []).map((s) => (
          <button key={s} className="btn sm" onClick={() => onMove(app, s)}>{s.replace(/_/g, ' ')}</button>
        ))}
        {(data.transitions[app.state] || []).length === 0 && <span style={{ fontSize: 12, color: 'var(--faint)' }}>This state is terminal.</span>}
      </div>
      {['submitting', 'confirmation_pending'].includes(app.state) && (
        <button className="btn primary sm" style={{ marginTop: 12 }} onClick={() => onReceipt(app)}><FileSignature size={13} /> Attach confirmation receipt</button>
      )}
      {app.state === 'ready_for_review' && (
        <p style={{ fontSize: 11.5, color: 'var(--amber)', marginTop: 12 }}>Authorize only when every answer in the packet is truthful and approved. Authorization is scoped to this application.</p>
      )}
    </>
  );
}
