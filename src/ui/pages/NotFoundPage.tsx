import React, { useEffect, useRef } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { Play, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { setRoute } = useStudioStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let x = 150;
    let y = 150;
    let vx = 4;
    let vy = 3;
    const r = 14;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = 'rgba(5, 6, 8, 0.25)';
      ctx.fillRect(0, 0, w, h);

      x += vx;
      y += vy;

      if (x - r <= 0 || x + r >= w) {
        vx = -vx;
      }
      if (y - r <= 0 || y + r >= h) {
        vy = -vy;
      }

      // Draw bouncing ball with fluorescent glow
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#00F0FF';
      ctx.fillStyle = '#CCFF00';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
        {/* Animated 404 Canvas */}
        <div className="relative w-72 h-44 rounded-3xl overflow-hidden border border-white/10 bg-[#070912] shadow-2xl">
          <canvas ref={canvasRef} width={288} height={176} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-7xl font-black font-mono tracking-tighter text-white/90 drop-shadow-[0_0_25px_rgba(0,240,255,0.5)]">
              404
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-400/30 text-pink-400 text-xs font-mono font-bold uppercase tracking-wider">
            ball out of bounds
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Page Not Found
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            The trajectory you followed escaped the physics boundary. Head back to the landing page or launch the studio to generate viral simulations.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setRoute('landing')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>Go Home</span>
          </button>

          <button
            onClick={() => setRoute('studio')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-lg shadow-lime-400/20"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Studio Free</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};
