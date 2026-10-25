import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Plus, RefreshCw, Trash2, CheckCircle2, XCircle, ExternalLink, ShieldQuestion } from 'lucide-react';
import { api, timeAgo } from '../api.js';
import { SectionHead, Chip, Field, Reveal, Spinner, useToast, Modal, Empty } from '../ui.jsx';

export default function Sources() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const toast = useToast();

  const load = () => {
    api('/companies').then(setData).catch((e) => toast(e.message, 'err'));
    api('/sources/health').then(setHealth).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const refreshOne = async (c) => {
    toast(`Probing ${c.name}...`);
    try {
      const res = await api(`/companies/${c.id}/refresh`, { method: 'POST' });
      toast(res.verification.message, res.verification.ok ? 'ok' : 'err');
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const removeOne = async (c) => {
    await api(`/companies/${c.id}`, { method: 'DELETE' });
    toast(`${c.name} removed`, 'ok');
    load();
  };

  return (
    <div>
      <SectionHead
        kicker="Discovery plumbing"
        title="Sources and coverage"
        sub="Live discovery runs on documented public listing interfaces from Greenhouse, Lever, and Ashby. Every source is verified before it counts."
        right={<button className="btn primary sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add a source</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Connected sources', value: data?.companies?.length || 0, tone: 'cyan' },
          { label: 'Verified boards', value: data?.companies?.filter((c) => c.verified).length || 0, tone: 'green' },
          { label: 'Recent runs', value: health?.summary?.total || 0, tone: 'violet' },
          { label: 'Failing runs', value: health?.summary?.failing || 0, tone: 'red' }
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div className="card" style={{ padding: 16 }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-num" style={{ fontSize: 24 }}>{s.value}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {data && data.companies.length === 0 && (
        <Empty icon={<Radio size={24} color="var(--molten)" />} title="No live sources yet"
          sub="Find a company whose careers page runs on Greenhouse, Lever, or Ashby, then add its board identifier here. The app probes the board before saving it." />
      )}

      {data && data.companies.length > 0 && (
        <div className="card" style={{ padding: 6, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Company</th><th>Provider</th><th>Board</th><th>Status</th><th>Last check</th><th>Jobs found</th><th></th></tr></thead>
            <tbody>
              {data.companies.map((c) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td><strong>{c.name}</strong></td>
                  <td><Chip tone="cyan">{c.atsProvider}</Chip></td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.handle}</td>
                  <td>{c.verified ? <Chip tone="green"><CheckCircle2 size={10} /> verified</Chip> : <Chip tone="red"><XCircle size={10} /> {c.lastStatus?.slice(0, 30) || 'unverified'}</Chip>}</td>
                  <td style={{ color: 'var(--faint)', fontSize: 12 }}>{c.lastRun ? timeAgo(c.lastRun.at) : 'never fetched'}</td>
                  <td className="mono">{c.jobCount}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn ghost sm" onClick={() => refreshOne(c)}><RefreshCw size={12} /></button>
                      <button className="btn danger sm" onClick={() => removeOne(c)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Reveal style={{ marginTop: 26 }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 10 }}><ShieldQuestion size={16} color="var(--amber)" /><h3>Why some platforms are manual here</h3></div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 780 }}>
            LinkedIn prohibits third party scraping and automated activity in its user agreement, and a paid Naukri subscription is not a developer API license. JobForge therefore never automates those platforms. Paste postings in from anywhere, keep the manual handoff for applications, and let the Boolean strings on the Jobs page squeeze more value from the subscriptions you already pay for.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <a className="btn ghost sm" href="https://www.linkedin.com/help/linkedin/answer/a1341387" target="_blank" rel="noreferrer"><ExternalLink size={12} /> LinkedIn prohibited software policy</a>
            <a className="btn ghost sm" href="https://www.naukri.com/termsconditions" target="_blank" rel="noreferrer"><ExternalLink size={12} /> Naukri terms</a>
          </div>
        </div>
      </Reveal>

      {health?.runs?.length > 0 && (
        <Reveal style={{ marginTop: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Recent refresh log</h3>
            {health.runs.slice(-8).reverse().map((r, i) => (
              <div key={i} className="log-line">{r.ok ? '●' : '○'} {new Date(r.at).toLocaleString('en-IN')} · {r.company} · {r.message}</div>
            ))}
          </div>
        </Reveal>
      )}

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onDone={() => { load(); }} />
    </div>
  );
}

function AddModal({ open, onClose, onDone }) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('greenhouse');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { atsProviders } = { atsProviders: null };
  const submit = async () => {
    setBusy(true);
    try {
      const res = await api('/companies', { method: 'POST', body: { name, atsProvider: provider, handle } });
      toast(res.verification.message, res.verification.ok ? 'ok' : 'err');
      if (res.verification.ok) { onDone(); onClose(); setName(''); setHandle(''); }
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <h2 style={{ fontSize: 21, marginBottom: 6 }}>Add a listing source</h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
        The board identifier is the token in the careers URL. For example <code className="mono">boards.greenhouse.io/figma</code> means the handle is <code className="mono">figma</code>. The board is probed live before it is saved.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Company name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Exactly how you know it" /></Field>
        <Field label="Listing provider">
          <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
        </Field>
        <Field label="Board identifier"><input className="input mono" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="figma" /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn primary sm" onClick={submit} disabled={busy || !name || !handle}>{busy ? <Spinner /> : null} Verify and add</button>
      </div>
    </Modal>
  );
}
