import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Play, Sparkles, Wand2, Music, CheckCircle2 } from 'lucide-react';
import { AudioEngine } from '../../audio/audioEngine';

interface ModeCardData {
  id: string;
  name: string;
  category: 'fresh_drops' | 'core' | 'advanced';
  badge?: {
    text: string;
    variant: 'popular' | 'exclusif' | 'new';
  };
  description: string;
  visualType:
    | 'countdown_escape'
    | 'near_miss_hell'
    | 'pick_ur_color'
    | 'one_percent'
    | 'name_battle'
    | 'soap_cube_cut'
    | 'classic'
    | 'infinite_loop'
    | 'destruction'
    | 'accumulation'
    | 'web_battle'
    | 'merge';
}

const MODES_DATA: ModeCardData[] = [
  {
    id: 'countdown_escape',
    name: 'COUNTDOWN ESCAPE',
    category: 'fresh_drops',
    badge: { text: 'NEW', variant: 'new' },
    description: 'Big 60→0 countdown timer. Gaps tighten and align so the ball escapes exactly as the clock strikes 0.0.',
    visualType: 'countdown_escape',
  },
  {
    id: 'near_miss_hell',
    name: 'NEAR-MISS HELL',
    category: 'fresh_drops',
    badge: { text: 'NEW', variant: 'new' },
    description: 'Tuned micro-gaps tease the exit over and over. Every near-miss triggers a tension flash before the final clean escape.',
    visualType: 'near_miss_hell',
  },
  {
    id: 'pick_ur_color',
    name: 'PICK UR COLOR',
    category: 'fresh_drops',
    badge: { text: 'NEW', variant: 'new' },
    description: '4 colored balls with a prediction card at start. High engagement comment-driver with spotlight winner reveal.',
    visualType: 'pick_ur_color',
  },
  {
    id: 'one_percent',
    name: 'ONE PERCENT',
    category: 'fresh_drops',
    badge: { text: 'NEW', variant: 'new' },
    description: 'A 1% microscopic gap that opens rarely. Watch the attempt counter climb with rapid-fire bounces until triumph.',
    visualType: 'one_percent',
  },
  {
    id: 'name_battle',
    name: 'NAME BATTLE',
    category: 'fresh_drops',
    badge: { text: 'NEW', variant: 'new' },
    description: 'User-named balls duel with live HP bars in a closed arena until one champion is crowned.',
    visualType: 'name_battle',
  },
  {
    id: 'soap_cube_cut',
    name: 'SOAP CUBE CUT',
    category: 'fresh_drops',
    badge: { text: 'NEW', variant: 'new' },
    description: 'Procedurally layered pastel soap block sliced by high-tension wire. Deep, satisfying ASMR crunch.',
    visualType: 'soap_cube_cut',
  },
  {
    id: 'classic',
    name: 'CLASSIC',
    category: 'core',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'The ultimate viral simulation. A hypnotic dance where the ball, desperate to escape, keeps viewers hooked until the very last circle.',
    visualType: 'classic',
  },
  {
    id: 'destruction',
    name: 'DESTRUCTION',
    category: 'core',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'Raw satisfaction (ASMR). Turn every beat into impact and watch the walls shatter, until the ball finally escapes!',
    visualType: 'destruction',
  },
  {
    id: 'infinite_loop',
    name: 'INFINITE LOOP',
    category: 'core',
    description:
      'Mathematical virality at its peak. Watch as a single ball multiplies into thousands in an exponential storm.',
    visualType: 'infinite_loop',
  },
  {
    id: 'accumulation',
    name: 'ACCUMULATION',
    category: 'core',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'One of the trendiest bouncing ball modes! Every ball that hits a spike stays trapped until the final escape!',
    visualType: 'accumulation',
  },
  {
    id: 'web_battle',
    name: 'WEB BATTLE',
    category: 'advanced',
    badge: { text: 'NEW', variant: 'new' },
    description:
      'The ultimate geometric arena. Multiple balls clash and weave their web with every bounce until one champion stands.',
    visualType: 'web_battle',
  },
  {
    id: 'merge',
    name: 'MERGE',
    category: 'advanced',
    badge: { text: 'NEW', variant: 'new' },
    description:
      'Chain reactions and 2D merging. Balls drop automatically, fuse on contact, and grow in a satisfying cascade.',
    visualType: 'merge',
  },
];

// Animated Canvas Preview for each Mode card
const ModeVisualCanvas: React.FC<{ type: ModeCardData['visualType'] }> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.025;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.44;

      ctx.fillStyle = '#03050a';
      ctx.fillRect(0, 0, w, h);

      // Arena Outer Ring
      ctx.strokeStyle = '#0ef0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      if (type === 'countdown_escape') {
        // Red pulsating timer + concentric escaping rings
        const ringCount = 5;
        for (let i = 1; i <= ringCount; i++) {
          const ringR = (r / ringCount) * i;
          ctx.strokeStyle = i === ringCount ? '#ff0055' : '#00f0ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const rot = t * 1.2 + i * 0.8;
          ctx.arc(cx, cy, ringR, rot + 0.4, rot + Math.PI * 2 - 0.4);
          ctx.stroke();
        }
        // Center Countdown text
        ctx.fillStyle = '#ff0055';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const timerVal = Math.max(0, 60 - Math.floor((t * 12) % 60));
        ctx.fillText(`0:${timerVal.toString().padStart(2, '0')}`, cx, cy);
      } else if (type === 'near_miss_hell') {
        // Micro gaps with tease flashes
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.75, t * 1.5, t * 1.5 + Math.PI * 2 - 0.25);
        ctx.stroke();
        // Ball skimming gap
        const bx = cx + Math.cos(t * 3) * (r * 0.72);
        const by = cy + Math.sin(t * 3) * (r * 0.72);
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
        // Near miss ping
        if (Math.sin(t * 4) > 0.8) {
          ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(bx, by, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (type === 'pick_ur_color') {
        // 4 color contestant orbs
        const colors = ['#00f0ff', '#ff007f', '#ffe600', '#39ff14'];
        colors.forEach((col, idx) => {
          const a = (idx / 4) * Math.PI * 2 + t * 0.8;
          const dist = r * 0.55;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 7, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (type === 'one_percent') {
        // Tiny needle gap ring
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.8, t * 2, t * 2 + Math.PI * 2 - 0.12);
        ctx.stroke();
        // Rapid bouncing ball
        const bx = cx + Math.cos(t * 7) * (r * 0.6);
        const by = cy + Math.sin(t * 5) * (r * 0.6);
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'name_battle') {
        // 2 duel balls with health bars
        const d = Math.abs(Math.sin(t * 2)) * (r * 0.5);
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(cx - d, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        ctx.arc(cx + d, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        // Mini HP bar
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(cx - 35, cy - 25, 30, 4);
        ctx.fillRect(cx + 5, cy - 25, 30, 4);
      } else if (type === 'soap_cube_cut') {
        // Pastel horizontal slices
        const slices = 6;
        for (let i = 0; i < slices; i++) {
          const y = cy - 30 + i * 10;
          ctx.strokeStyle = `hsl(${i * 45}, 90%, 75%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 35, y);
          ctx.lineTo(cx + 35, y);
          ctx.stroke();
        }
        // Wire cutter ball
        const dropY = cy - 40 + ((t * 25) % 65);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, dropY, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'classic') {
        // Concentric rainbow rings with gap
        const ringCount = 7;
        for (let i = 1; i <= ringCount; i++) {
          const ringR = (r / ringCount) * i;
          const hue = (i * 45 + t * 20) % 360;
          ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          const rot = t * (i % 2 === 0 ? 0.8 : -0.8) + i * 0.6;
          ctx.arc(cx, cy, ringR, rot + 0.5, rot + Math.PI * 2 - 0.5);
          ctx.stroke();
        }
        const ballDist = r * 0.35 * Math.abs(Math.sin(t * 2));
        const bx = cx + Math.cos(t * 3) * ballDist;
        const by = cy + Math.sin(t * 3) * ballDist;
        ctx.fillStyle = '#ff7700';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'infinite_loop') {
        ctx.fillStyle = '#ff6600';
        const numDots = 100;
        for (let i = 0; i < numDots; i++) {
          const angle = (i * 0.2 + t * 0.5) % (Math.PI * 2);
          const dist = (Math.sin(i * 13 + t) * 0.4 + 0.5) * (r * 0.85);
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist * 0.8 + r * 0.2;
          if (Math.hypot(px - cx, py - cy) < r - 4) {
            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (type === 'destruction') {
        const dots = 36;
        for (let i = 0; i < dots; i++) {
          if ((i + Math.floor(t * 3)) % 5 === 0) continue;
          const ang = (i / dots) * Math.PI * 2 + t * 0.3;
          const dx = cx + Math.cos(ang) * (r * 0.75);
          const dy = cy + Math.sin(ang) * (r * 0.75);
          ctx.fillStyle = `hsl(${(i * 10 + t * 40) % 360}, 100%, 65%)`;
          ctx.beginPath();
          ctx.arc(dx, dy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const bx = cx + Math.cos(t * 4) * (r * 0.5);
        const by = cy + Math.sin(t * 4) * (r * 0.5);
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'accumulation') {
        const spikeCount = 18;
        for (let i = 0; i < spikeCount; i++) {
          const a1 = (i / spikeCount) * Math.PI * 2;
          const a2 = ((i + 0.5) / spikeCount) * Math.PI * 2;
          const a3 = ((i + 1) / spikeCount) * Math.PI * 2;
          ctx.fillStyle = i % 2 === 0 ? '#ff00aa' : '#00ffff';
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
          ctx.lineTo(cx + Math.cos(a2) * (r - 10), cy + Math.sin(a2) * (r - 10));
          ctx.lineTo(cx + Math.cos(a3) * r, cy + Math.sin(a3) * r);
          ctx.fill();
        }
      } else if (type === 'web_battle') {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.7, cy - r * 0.5);
        ctx.lineTo(cx + Math.cos(t) * (r * 0.6), cy + Math.sin(t) * (r * 0.6));
        ctx.stroke();
        ctx.strokeStyle = '#ff0055';
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.7, cy + r * 0.5);
        ctx.lineTo(cx - Math.cos(t) * (r * 0.6), cy - Math.sin(t) * (r * 0.6));
        ctx.stroke();
      } else if (type === 'merge') {
        const fruits = [
          { x: cx - 25, y: cy + 20, r: 16, color: '#ff3344' },
          { x: cx + 25, y: cy + 20, r: 16, color: '#ffaa00' },
          { x: cx, y: cy + 30, r: 24, color: '#33cc55' },
        ];
        fruits.forEach((f) => {
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [type]);

  return (
    <div className="w-full sm:w-44 h-44 aspect-square rounded-2xl overflow-hidden bg-[#03050a] border border-cyan-400/30 flex items-center justify-center shrink-0 relative group-hover:border-cyan-300 transition-colors shadow-inner">
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
        <span className="px-3.5 py-1.5 rounded-full border-2 border-cyan-400 bg-cyan-400/20 text-cyan-300 text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-400/40 transform group-hover:scale-105 transition-transform">
          Play Mode ⚡
        </span>
      </div>
    </div>
  );
};

export const MultipleModesShowcase: React.FC = () => {
  const { setRoute, setMode } = useStudioStore();
  const [filter, setFilter] = useState<'all' | 'fresh_drops' | 'core' | 'advanced'>('all');

  const handleModeClick = (modeId: string) => {
    try {
      const audio = AudioEngine.getInstance();
      audio.init();
      audio.resume();
    } catch {
      // AudioContext fallback
    }
    setMode(modeId);
    setRoute('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredCards = MODES_DATA.filter((m) => {
    if (filter === 'all') return true;
    return m.category === filter;
  });

  return (
    <section id="modes" className="py-20 border-b border-white/10 bg-[#04060d] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header - Exact prompt specification */}
        <div className="text-center mb-10 space-y-3">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight lowercase text-white font-sans">
            pick ur chaos.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              infinite possibilities.
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed lowercase font-medium">
            every sim is 100% deterministic, synced to procedural asmr soundscapes, and ready for instant 4k export.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setFilter('all')}
            className={`btn-3d px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all lowercase ${
              filter === 'all'
                ? 'btn-3d-cyan text-black'
                : 'btn-3d-glass text-slate-300 hover:text-white'
            }`}
          >
            all modes (47)
          </button>
          <button
            onClick={() => setFilter('fresh_drops')}
            className={`btn-3d px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all lowercase flex items-center gap-1.5 ${
              filter === 'fresh_drops'
                ? 'btn-3d-pink text-white shadow-pink-500/40'
                : 'btn-3d-glass text-pink-400 hover:text-pink-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> fresh drops (20 new)
          </button>
          <button
            onClick={() => setFilter('core')}
            className={`btn-3d px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all lowercase ${
              filter === 'core'
                ? 'btn-3d-lime text-black'
                : 'btn-3d-glass text-slate-300 hover:text-white'
            }`}
          >
            core classic
          </button>
          <button
            onClick={() => setFilter('advanced')}
            className={`btn-3d px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all lowercase ${
              filter === 'advanced'
                ? 'btn-3d-purple text-white'
                : 'btn-3d-glass text-slate-300 hover:text-white'
            }`}
          >
            advanced arena
          </button>
        </div>

        {/* 2-Column Responsive Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-12">
          {filteredCards.map((mode) => (
            <div
              key={mode.id}
              onClick={() => handleModeClick(mode.id)}
              className="p-4 sm:p-5 rounded-3xl bg-[#060a14] border border-cyan-400/40 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-400/15 transition-all duration-300 cursor-pointer group flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden"
            >
              {/* Left: Animated Preview Canvas */}
              <ModeVisualCanvas type={mode.visualType} />

              {/* Right: Content & Badges */}
              <div className="flex-1 flex flex-col justify-between self-stretch text-left">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                      {mode.name}
                    </h3>

                    {/* Hot pink NEW badge */}
                    {mode.badge && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          mode.badge.variant === 'new'
                            ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white shadow-md shadow-pink-500/40 border border-pink-400/50 animate-pulse'
                            : mode.badge.variant === 'popular'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30'
                        }`}
                      >
                        {mode.badge.text}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {mode.description}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Play className="w-3.5 h-3.5 fill-current" /> launch studio mode
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                    240Hz Pure Physics →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* "See all modes" Button opening studio gallery */}
        <div className="text-center mb-10">
          <button
            onClick={() => {
              setRoute('studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-3d-cyan px-8 py-3.5 rounded-2xl text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-400/20 hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> see all 47 modes in studio gallery
          </button>
        </div>

        {/* Three feature chips required by Part 5 */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-black tracking-wider lowercase shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> same seed = same video
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-black tracking-wider lowercase shadow-sm">
            <Music className="w-3.5 h-3.5 text-pink-400" /> asmr built in
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black tracking-wider lowercase shadow-sm">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" /> 4k in one click
          </div>
        </div>
      </div>
    </section>
  );
};
