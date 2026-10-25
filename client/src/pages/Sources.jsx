import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Plus, RefreshCw, Trash2, CheckCircle2, XCircle, ExternalLink, ShieldQuestion, Globe2, Clock3 } from 'lucide-react';
import { api, timeAgo } from '../api.js';
import { useApp } from '../App.jsx';
import { SectionHead, Chip, Field, Reveal, Spinner, useToast, Modal, Empty } from '../ui.jsx';

export default function Sources() {
  const { boot } = useApp();
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [refresh, setRefresh] = useState(boot?.refresh || { auto: true, intervalMinutes: 20 });
  const toast = useToast();

  const load = () => {
    api('/companies').then(setData).catch((e) => toast(e.message, 'err'));
    api('/sources/health').then(setHealth).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const checkOne = async (c) => {
    setBusyId(c.id);
    toast(`Probing ${c.name}...`);
    try {
      const res = await api(`/companies/${c.id}/refresh`, { method: 'POST' });
      toast(res.verification.message, res.verification.ok ? 'ok' : 'err');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusyId(null); }
  };

  const pullOne = async (c) => {
    setBusyId(c.id);
    toast(`Pulling live postings from ${c.name}...`);
    try {
      const res = await api(`/jobs/fetch/${c.id}`, { method: 'POST' });
      toast(res.run.message, res.run.ok ? 'ok' : 'err');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusyId(null); }
  };

  const removeOne = async (c) => {
    await api(`/companies/${c.id}`, { method: 'DELETE' });
    toast(`${c.name} removed`, 'ok');
    load();
  };

  const saveRefresh = async (next) => {
    setRefresh(next);
    try {
      await api('/settings', { method: 'PUT', body: { refresh: next } });
      toast('Refresh schedule saved. The scheduler picks it up immediately', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div>
      <SectionHead
        kicker="Discovery plumbing"
        title="Sources and coverage"
        sub="Every posting in your cockpit comes from a genuine employer board. The registry ships pre verified, polls on a schedule, and reports exactly what changed on every run."
        right={<button className="btn primary sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add a source</button>}
      />

      <Reveal>
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Clock3 size={16} color="var(--cyan)" />
            <strong style={{ fontFamily: 'var(--font-display)' }}>Live refresh</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
            <div className={`toggle ${refresh.auto ? 'on' : ''}`} onClick={() => saveRefresh({ ...refresh, auto: !refresh.auto })}><i /></div>
            {refresh.auto ? 'scheduler on' : 'scheduler paused'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
            every
            <input className="input mono" style={{ width: 74, padding: '6px 10px' }} type="number" min="5" max="720" value={refresh.intervalMinutes}
              onChange={(e) => saveRefresh({ ...refresh, intervalMinutes: Math.max(5, Number(e.target.value) || 20) })} />
            minutes
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={async () => {
              toast('Pulling every board now. This can take up to a minute...');
              try {
                const res = await api('/jobs/fetch', { method: 'POST' });
                toast(`Done: ${res.added} new roles, ${res.closed} marked closed across ${res.report.filter((r) => r.ok).length} healthy sources`, 'ok');
                load();
              } catch (e) { toast(e.message, 'err'); }
            }}><RefreshCw size={13} /> Refresh all now</button>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--faint)', width: '100%' }}>
            New postings appear automatically. A role that disappears from its official board is marked closed only after two consecutive misses, and it reopens by itself if the employer reposts it.
          </p>
        </div>
      </Reveal>

      {data && data.companies.length === 0 && (
        <Empty icon={<Radio size={24} color="var(--molten)" />} title="No live sources yet"
          sub="Find a company whose careers page runs on Greenhouse, Lever, or Ashby, then paste its careers URL here. The board is probed live before it is saved." />
      )}

      {data && data.companies.length > 0 && (
        <div className="card" style={{ padding: 6, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Company</th><th>Provider</th><th>Presence</th><th>Status</th><th>Last check</th><th>Open</th><th>Closed</th><th></th></tr></thead>
            <tbody>
              {data.companies.map((c) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.note && <div style={{ fontSize: 11, color: 'var(--faint)' }}>{c.note}</div>}
                  </td>
                  <td><Chip tone="cyan">{c.atsProvider}</Chip></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.region || '...'}</td>
                  <td>
                    {c.verified
                      ? <Chip tone="green"><CheckCircle2 size={10} /> verified{c.seedVerifiedOn ? ` ${c.seedVerifiedOn}` : ''}</Chip>
                      : <Chip tone="red"><XCircle size={10} /> {c.lastStatus?.slice(0, 26) || 'unverified'}</Chip>}
                  </td>
                  <td style={{ color: 'var(--faint)', fontSize: 12 }}>{c.lastRefresh ? timeAgo(c.lastRefresh) : 'awaiting first pull'}</td>
                  <td className="mono" style={{ color: 'var(--green)' }}>{c.openJobs ?? 0}</td>
                  <td className="mono" style={{ color: 'var(--faint)' }}>{c.closedJobs ?? 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn ghost sm" title="Probe the board" onClick={() => checkOne(c)} disabled={busyId === c.id}>{busyId === c.id ? <Spinner /> : <Globe2 size={12} />}</button>
                      <button className="btn ghost sm" title="Pull postings now" onClick={() => pullOne(c)} disabled={busyId === c.id}><RefreshCw size={12} /></button>
                      <button className="btn danger sm" title="Remove source" onClick={() => removeOne(c)}><Trash2 size={12} /></button>
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
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 10 }}><ShieldQuestion size={16} color="var(--amber)" /><h3>Why LinkedIn and Naukri are capture only here</h3></div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 800 }}>
            Both platforms prohibit automated activity in their terms, and the realistic cost of a bot is your own account. JobForge therefore never scrapes or auto submits there. Instead the JobForge Helper browser extension captures any posting you are viewing with one click, scores it instantly, and prefills application forms from your approved answers. You keep the final click on every submission, which is both the safe route and the honest one. Your paid subscriptions stay fully in your hands, boosted by the Boolean strings on the Jobs page.
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
            {health.runs.slice(-10).reverse().map((r, i) => (
              <div key={i} className="log-line">{r.ok ? '●' : '○'} {new Date(r.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {r.company} · {r.message}</div>
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
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async () => {
    setBusy(true);
    try {
      const res = await api('/companies', { method: 'POST', body: { name, url } });
      toast(res.verification.message, res.verification.ok ? 'ok' : 'err');
      if (res.verification.ok) { onDone(); onClose(); setName(''); setUrl(''); }
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <h2 style={{ fontSize: 21, marginBottom: 6 }}>Add a genuine source</h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
        Paste the company's careers page URL. If it runs on Greenhouse, Lever, or Ashby, the provider and board handle are detected automatically and the board is probed live before it is saved. For platforms without a public listing endpoint, use the browser extension to capture roles as you browse.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Company name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Exactly how you know it" /></Field>
        <Field label="Careers page URL" hint="For example https://job-boards.greenhouse.io/zscaler or https://jobs.lever.co/meesho">
          <input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn primary sm" onClick={submit} disabled={busy || !name || !url}>{busy ? <Spinner /> : null} Detect, verify and add</button>
      </div>
    </Modal>
  );
}
