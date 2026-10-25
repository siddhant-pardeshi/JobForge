import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, LayoutDashboard, Compass, FileText, Radio, ShieldAlert, Plane, KanbanSquare, Settings2, Sparkles, PlayCircle } from 'lucide-react';
import { api } from './api.js';
import { ToastProvider, Page } from './ui.jsx';
import Embers from './particles.jsx';
import Tour from './tour.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import Resume from './pages/Resume.jsx';
import Jobs from './pages/Jobs.jsx';
import Sources from './pages/Sources.jsx';
import Scam from './pages/Scam.jsx';
import Relocation from './pages/Relocation.jsx';
import Tracker from './pages/Tracker.jsx';
import SettingsPage from './pages/Settings.jsx';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const NAV = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: Compass },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/sources', label: 'Sources', icon: Radio },
  { to: '/scam', label: 'Scam Check', icon: ShieldAlert },
  { to: '/relocation', label: 'Relocation', icon: Plane },
  { to: '/tracker', label: 'Tracker', icon: KanbanSquare },
  { to: '/settings', label: 'Settings', icon: Settings2 }
];

function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 2 }}>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} style={{ textAlign: 'center' }}>
        <motion.div className="brand-mark" style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px' }} animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 3.2 }}>
          <Flame size={34} color="white" />
        </motion.div>
        <h1 className="sweep" style={{ fontSize: 40 }}>JobForge</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8, letterSpacing: '0.14em', fontSize: 11, textTransform: 'uppercase' }}>Heating the forge</p>
      </motion.div>
    </div>
  );
}

function Shell({ children }) {
  const { boot } = useApp();
  const [tourOpen, setTourOpen] = useState(false);
  return (
    <>
      <div className="aurora" />
      <div className="grid-lines" />
      <Embers />
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark"><Flame size={19} color="white" /></div>
            <div>
              <div className="brand-name">Job<span>Forge</span></div>
              <div className="brand-sub">Hunt smarter</div>
            </div>
          </div>
          <nav className="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={n.to === '/'}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <n.icon />
                    <span>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">
            <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setTourOpen(true)}><PlayCircle size={13} /> Guided tour</button>
            <div className={`ai-dot ${boot?.llm?.ready ? 'on' : ''}`}>
              <i /><span>{boot?.llm?.ready ? `AI on · ${boot.llm.model?.split('/').pop()}` : 'AI off · rules mode'}</span>
            </div>
            <div className="ai-dot" style={{ color: 'var(--faint)' }}>
              <i style={{ background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} /><span>{boot?.sourceCount || 0} live sources</span>
            </div>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
      {tourOpen && <Tour onClose={() => setTourOpen(false)} />}
    </>
  );
}

export default function App() {
  const [boot, setBoot] = useState(null);
  const [failed, setFailed] = useState(false);
  const [locked, setLocked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const data = await api('/bootstrap');
    setBoot(data);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      if (err.status === 401) setLocked(true);
      else setFailed(true);
    });
  }, [refresh]);

  const onboarded = boot?.profile?.onboarded || boot?.settings?.onboarded;

  if (locked) return <><div className="aurora" /><GateScreen onUnlocked={() => { setLocked(false); refresh().catch((e) => { if (e.status === 401) setLocked(true); else setFailed(true); }); }} /></>;

  if (failed) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 2 }}>
        <div className="glass" style={{ padding: 30, maxWidth: 460 }}>
          <h2>Cannot reach the forge</h2>
          <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 13 }}>
            The backend did not answer. Run <code className="mono">npm run dev</code> in the project folder and open this page again. The API should listen on port 8787.
          </p>
        </div>
      </div>
    );
  }
  if (!boot) return <><div className="aurora" /><Splash /></>;

  return (
    <AppCtx.Provider value={{ boot, refresh }}>
      <ToastProvider>
        {!onboarded ? (
          <Routes>
            <Route path="*" element={<><div className="aurora" /><div className="grid-lines" /><Embers /><Onboarding /></>} />
          </Routes>
        ) : (
          <Shell>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Page><Today /></Page>} />
              <Route path="/jobs" element={<Page><Jobs /></Page>} />
              <Route path="/resume" element={<Page><Resume /></Page>} />
              <Route path="/sources" element={<Page><Sources /></Page>} />
              <Route path="/scam" element={<Page><Scam /></Page>} />
              <Route path="/relocation" element={<Page><Relocation /></Page>} />
              <Route path="/tracker" element={<Page><Tracker /></Page>} />
              <Route path="/settings" element={<Page><SettingsPage /></Page>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        )}
      </ToastProvider>
    </AppCtx.Provider>
  );
}

function GateScreen({ onUnlocked }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'That code is not correct'); setBusy(false); return; }
      onUnlocked();
    } catch {
      setError('Could not reach the server');
      setBusy(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 2, padding: 20 }}>
      <motion.div className="glass" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        style={{ width: 'min(420px, 100%)', padding: 34, borderRadius: 24, textAlign: 'center', background: 'rgba(12,12,20,0.85)' }}>
        <motion.div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px' }} animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
          <Flame size={30} color="white" />
        </motion.div>
        <h1 style={{ fontSize: 26 }}>Private cockpit</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '10px 0 22px' }}>
          This JobForge is running in public mode. Enter the access code shown in the terminal of the machine it runs on.
        </p>
        <input className="input mono" style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.3em' }} inputMode="numeric" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="······"
          onKeyDown={(e) => { if (e.key === 'Enter' && code.length >= 6) submit(); }} />
        {error && <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 10 }}>{error}</p>}
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={submit} disabled={busy || code.length < 6}>
          {busy ? 'Checking...' : 'Unlock'}
        </button>
      </motion.div>
    </div>
  );
}
