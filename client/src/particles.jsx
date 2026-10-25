import { useEffect, useRef } from 'react';

// Rising embers on a fixed canvas. Cheap additive glow dots that drift
// upward and flicker. Pauses when the tab hides, honors reduced motion.
export default function Embers() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let raf;
    let W, H;
    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['255,92,26', '255,46,136', '139,92,246', '255,138,61'];
    const COUNT = Math.min(70, Math.floor(window.innerWidth / 24));
    const parts = Array.from({ length: COUNT }, () => spawn(true));

    function spawn(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 14,
        r: 0.7 + Math.random() * 2.1,
        vy: 0.18 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.24,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: Math.random(),
        flicker: 0.5 + Math.random() * 1.6
      };
    }

    let running = true;
    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVis);

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.life * 5) * 0.12;
        p.life += 0.006 * p.flicker;
        if (p.y < -16 || p.x < -16 || p.x > W + 16) parts[i] = spawn(false);
        const alpha = 0.16 + Math.abs(Math.sin(p.life * 2.4)) * 0.4;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grad.addColorStop(0, `rgba(${p.c},${alpha})`);
        grad.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas id="ember-canvas" ref={canvasRef} aria-hidden="true" />;
}
