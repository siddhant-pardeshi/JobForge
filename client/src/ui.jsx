import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';

/* ---------------- toasts ---------------- */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className={`toast ${t.kind}`} initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.9 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------------- reveal on scroll ---------------- */
export function Reveal({ children, delay = 0, y = 26, className = '', style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ---------------- staggered list ---------------- */
export function Stagger({ items, render, className = '' }) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <motion.div key={item.id || i} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          {render(item, i)}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- count up ---------------- */
export function CountUp({ to, decimals = 0, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 1.3, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setVal(v) });
    return () => controls.stop();
  }, [inView, to]);
  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

/* ---------------- score ring ---------------- */
export function ScoreRing({ score, size = 74, label = 'MATCH', max = 100 }) {
  const pct = Math.max(0, Math.min(1, score / max));
  const R = (size - 10) / 2;
  const C = 2 * Math.PI * R;
  const color = pct >= 0.72 ? '#34d399' : pct >= 0.5 ? '#fbbf24' : pct >= 0.3 ? '#ff8a3d' : '#fb4d4d';
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={R} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 7px ${color}66)` }} />
      </svg>
      <div className="val" style={{ color }}>
        <span><CountUp to={Math.round(score)} />{max === 100 ? '' : ''}<small style={{ color: 'var(--faint)' }}>{label}</small></span>
      </div>
    </div>
  );
}

/* ---------------- spotlight tilt card ---------------- */
export function TiltCard({ children, className = '', onClick, style }) {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 20 });
  const sry = useSpring(ry, { stiffness: 220, damping: 20 });
  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * 7);
    rx.set(-(py - 0.5) * 7);
    ref.current.style.setProperty('--mx', `${px * 100}%`);
    ref.current.style.setProperty('--my', `${py * 100}%`);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div ref={ref} className={`card spotlight hoverable ${className}`} style={{ ...style, rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}>
      {children}
    </motion.div>
  );
}

/* ---------------- animated bar ---------------- */
export function Bar({ pct, delay = 0, color }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(2, Math.min(100, pct))}%`, animationDelay: `${delay}s`, background: color || 'var(--grad)' }} />
    </div>
  );
}

/* ---------------- page transition wrapper ---------------- */
export function Page({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ---------------- drawer ---------------- */
export function Drawer({ open, onClose, children, width }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="drawer" style={width ? { width: `min(${width}px, 94vw)` } : undefined}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 33 }}>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- modal ---------------- */
export function Modal({ open, onClose, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="drawer-scrim" style={{ display: 'grid', placeItems: 'center', zIndex: 70, padding: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="glass" style={{ maxWidth: wide ? 760 : 520, width: '100%', padding: 26, maxHeight: '86vh', overflowY: 'auto', background: '#0d0d18' }}
            initial={{ scale: 0.88, y: 26 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} onClick={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- small bits ---------------- */
export const Chip = ({ tone, children }) => <span className={`chip ${tone || ''}`}>{children}</span>;

export function Toggle({ on, onChange }) {
  return <div className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}><i /></div>;
}

export function Field({ label, children, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--faint)' }}>{hint}</span>}
    </div>
  );
}

export function SectionHead({ kicker, title, right, sub }) {
  return (
    <div className="page-head" style={{ marginBottom: 18 }}>
      <div>
        {kicker && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--molten)', marginBottom: 5 }}>{kicker}</div>}
        <h2 style={{ fontSize: 21 }}>{title}</h2>
        {sub && <p className="page-sub" style={{ marginTop: 4 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ icon, title, sub, action }) {
  return (
    <div className="empty">
      <div className="orb">{icon}</div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--faint)', maxWidth: 420, margin: '0 auto 16px' }}>{sub}</p>
      {action}
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: '-3px' }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--molten)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ConfidenceChip({ level }) {
  const map = { high: ['green', 'high confidence'], medium: ['amber', 'medium confidence'], low: ['amber', 'low confidence'], none: ['red', 'not found'] };
  const [tone, text] = map[level] || ['amber', 'unverified'];
  return <Chip tone={tone}>{text}</Chip>;
}
