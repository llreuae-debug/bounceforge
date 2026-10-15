import React, { useEffect, useRef } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Play } from 'lucide-react';
import { AudioEngine } from '../../audio/audioEngine';

interface ModeCardData {
  id: string;
  name: string;
  badge?: {
    text: string;
    variant: 'popular' | 'exclusif' | 'coming_soon' | 'surprise';
  };
  description: string;
  isPlayable: boolean;
  visualType:
    | 'classic'
    | 'infinite_loop'
    | 'destruction'
    | 'accumulation'
    | 'collision'
    | 'web_expansion'
    | 'trail_expansion'
    | 'spiral'
    | 'fragment_expansion'
    | 'web_battle'
    | 'merge'
    | 'coming_soon';
}

const MODES_DATA: ModeCardData[] = [
  {
    id: 'classic',
    name: 'CLASSIC',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'The ultimate viral simulation. A hypnotic dance where the ball, desperate to escape, keeps viewers hooked until the very last circle.',
    isPlayable: true,
    visualType: 'classic',
  },
  {
    id: 'infinite_loop',
    name: 'INFINITE LOOP',
    description:
      'Mathematical virality at its peak. Watch as a single ball multiplies into thousands in an exponential storm.',
    isPlayable: true,
    visualType: 'infinite_loop',
  },
  {
    id: 'destruction',
    name: 'DESTRUCTION',
    description:
      'Raw satisfaction (ASMR). Turn every beat into impact and watch the walls shatter, until the ball finally escapes!',
    isPlayable: true,
    visualType: 'destruction',
  },
  {
    id: 'accumulation',
    name: 'ACCUMULATION',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'One of the trendiest bouncing ball modes! Every ball that hits a spike stays trapped until the final escape!',
    isPlayable: true,
    visualType: 'accumulation',
  },
  {
    id: 'collision',
    name: 'COLLISION',
    description:
      'Two balls bouncing in a circle until they collide, triggering a massive explosion of balls!',
    isPlayable: true,
    visualType: 'collision',
  },
  {
    id: 'web_expansion',
    name: 'WEB EXPANSION',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'The ball weaves a complex, hypnotic geometric web, growing larger with every impact. The perfect combination for generating dense, striking visuals that truly captivate.',
    isPlayable: true,
    visualType: 'web_expansion',
  },
  {
    id: 'trail_expansion',
    name: 'TRAIL EXPANSION',
    description:
      'Let the ball paint the void! With its endless rainbow trail, Trail Expansion mode merges the ball\'s growth with an explosion of color. The result? A hypnotic and deeply satisfying visual loop!',
    isPlayable: true,
    visualType: 'trail_expansion',
  },
  {
    id: 'spiral',
    name: 'SPIRAL',
    badge: { text: 'POPULAR', variant: 'popular' },
    description:
      'Immerse your viewers in a visual vortex. The ball traces a hypnotic spiral that instantly grabs attention.',
    isPlayable: true,
    visualType: 'spiral',
  },
  {
    id: 'fragment_expansion',
    name: 'FRAGMENT EXPANSION',
    badge: { text: 'EXCLUSIF', variant: 'exclusif' },
    description:
      'Extreme viral expansion. A ball that grows with every bounce, and instantly disintegrates into fragments upon contact with the spikes. Watch the geometry saturate the screen.',
    isPlayable: true,
    visualType: 'fragment_expansion',
  },
  {
    id: 'web_battle',
    name: 'WEB BATTLE',
    badge: { text: 'COMING SOON', variant: 'coming_soon' },
    description:
      'The ultimate geometric arena. Multiple balls clash and weave their web with every bounce: slice through rival threads to steal them all and eliminate your opponents until only one stands.',
    isPlayable: true,
    visualType: 'web_battle',
  },
  {
    id: 'merge',
    name: 'MERGE',
    badge: { text: 'COMING SOON', variant: 'coming_soon' },
    description:
      'The art of chain reactions and 2D merging. Balls drop automatically, fuse on contact, and grow in a satisfying cascade until the ultimate form is revealed.',
    isPlayable: true,
    visualType: 'merge',
  },
  {
    id: 'surprise_coming_soon',
    name: 'COMING SOON...',
    badge: { text: 'SURPRISE', variant: 'surprise' },
    description:
      'Fresh simulation modes and exciting new features will be rolled out regularly, giving you endless creative possibilities.',
    isPlayable: false,
    visualType: 'coming_soon',
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

      if (type === 'classic') {
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
        // Ball
        const ballDist = r * 0.35 * Math.abs(Math.sin(t * 2));
        const bx = cx + Math.cos(t * 3) * ballDist;
        const by = cy + Math.sin(t * 3) * ballDist;
        ctx.fillStyle = '#ff7700';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'infinite_loop') {
        // Storm of hundreds of orange particles
        ctx.fillStyle = '#ff6600';
        const numDots = 140;
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
        // Concentric dotted breaking wall
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
        // Bouncing core ball
        const bx = cx + Math.cos(t * 4) * (r * 0.5);
        const by = cy + Math.sin(t * 4) * (r * 0.5);
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'accumulation') {
        // Outer Spikes
        const spikeCount = 20;
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
        // Trapped balls
        for (let j = 0; j < 18; j++) {
          const ang = j * 0.28 + Math.PI * 0.5;
          const dist = r - 16;
          ctx.fillStyle = '#ff00aa';
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 'collision') {
        // Two balls colliding + explosion
        const dist = Math.abs(Math.cos(t * 2)) * (r * 0.6);
        const b1x = cx - dist;
        const b2x = cx + dist;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(b1x, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(b2x, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        if (dist < 15) {
          ctx.fillStyle = '#ff3366';
          for (let k = 0; k < 24; k++) {
            const sparkAng = k * 0.26 + t * 4;
            const sparkDist = (k % 4) * 8 + 4;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(sparkAng) * sparkDist, cy + Math.sin(sparkAng) * sparkDist, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (type === 'web_expansion') {
        // Web of geometric chords
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        const chordPoints = 12;
        ctx.beginPath();
        for (let i = 0; i < chordPoints; i++) {
          const a1 = (i / chordPoints) * Math.PI * 2;
          const a2 = ((i * 5) / chordPoints) * Math.PI * 2 + t * 0.2;
          ctx.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
          ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        }
        ctx.stroke();
        // Expanding bright core ball
        const coreSize = 10 + Math.sin(t * 2) * 4;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(t * 1.5) * (r * 0.4), cy + Math.sin(t * 1.5) * (r * 0.4), coreSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (type === 'trail_expansion') {
        // Infinite thick rainbow ribbon trail
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        const steps = 30;
        for (let i = 0; i < steps; i++) {
          const pastT = t - i * 0.05;
          const px = cx + Math.cos(pastT * 2.5) * (r * 0.65);
          const py = cy + Math.sin(pastT * 3.5) * (r * 0.65);
          const nextT = pastT - 0.05;
          const nx = cx + Math.cos(nextT * 2.5) * (r * 0.65);
          const ny = cy + Math.sin(nextT * 3.5) * (r * 0.65);
          ctx.strokeStyle = `hsl(${(i * 12 + t * 80) % 360}, 100%, 55%)`;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }
        // Lead ball
        const lx = cx + Math.cos(t * 2.5) * (r * 0.65);
        const ly = cy + Math.sin(t * 3.5) * (r * 0.65);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, ly, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'spiral') {
        // Archimedean spiral vortex
        ctx.strokeStyle = '#9933ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 8; a += 0.1) {
          const spR = (a / (Math.PI * 8)) * (r * 0.9);
          const sx = cx + Math.cos(a + t * 0.8) * spR;
          const sy = cy + Math.sin(a + t * 0.8) * spR;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        // Moving chime ball
        const curA = (t * 2) % (Math.PI * 8);
        const curR = (curA / (Math.PI * 8)) * (r * 0.9);
        const bx = cx + Math.cos(curA + t * 0.8) * curR;
        const by = cy + Math.sin(curA + t * 0.8) * curR;
        ctx.fillStyle = '#ff00bb';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'fragment_expansion') {
        // Spiked boundary + exploding fragments
        ctx.fillStyle = '#ff0077';
        for (let i = 0; i < 70; i++) {
          const ang = i * 0.18 + t * 0.5;
          const dist = (Math.sin(i * 7 + t * 2) * 0.35 + 0.55) * r;
          const fx = cx + Math.cos(ang) * dist;
          const fy = cy + Math.sin(ang) * dist;
          ctx.fillStyle = `hsl(${(i * 15 + t * 60) % 360}, 100%, 65%)`;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center pulsed ball
        const growR = 12 + Math.abs(Math.sin(t * 3)) * 14;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, growR, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'web_battle') {
        // Red vs Cyan Battle
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
        // Fruit/animal emoji merge
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
        // Dropping ball
        const dropY = (cy - 40 + (t * 40) % 60);
        ctx.fillStyle = '#ff3344';
        ctx.beginPath();
        ctx.arc(cx, dropY, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Coming Soon Cosmic Sparkles
        ctx.fillStyle = '#00f0ff';
        for (let i = 0; i < 20; i++) {
          const ang = i * 0.35 + t;
          const dist = (i * 3 + Math.sin(t * 3) * 10) % (r * 0.85);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
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
      {/* Overlay Button on Hover matching ballsimulator.com */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
        <span className="px-3.5 py-1.5 rounded-full border-2 border-cyan-400 bg-cyan-400/20 text-cyan-300 text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-400/40 transform group-hover:scale-105 transition-transform">
          Play Mode ⚡
        </span>
      </div>
    </div>
  );
};

export const MultipleModesShowcase: React.FC = () => {
  const { setRoute, setMode, surpriseMe } = useStudioStore();

  const handleModeClick = (mode: ModeCardData) => {
    try {
      const audio = AudioEngine.getInstance();
      audio.init();
      audio.resume();
    } catch {
      // AudioContext fallback
    }

    if (mode.id === 'surprise_coming_soon') {
      surpriseMe();
      setRoute('studio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setMode(mode.id);
    setRoute('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="modes" className="py-20 border-b border-white/10 bg-[#04060d] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Header matching reference design */}
        <div className="text-center mb-14 space-y-3">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight uppercase text-white font-sans">
            MULTIPLE MODES.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              INFINITE POSSIBILITIES
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every simulation is 100% deterministic, synced with procedural ASMR soundscapes, and ready for instant 4K 9:16 export.
          </p>
        </div>

        {/* 2-Column Responsive Card Grid with glowing cyan borders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {MODES_DATA.map((mode) => (
            <div
              key={mode.id}
              onClick={() => handleModeClick(mode)}
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

                    {/* Badge */}
                    {mode.badge && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          mode.badge.variant === 'popular'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30'
                            : mode.badge.variant === 'exclusif'
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30'
                            : mode.badge.variant === 'coming_soon'
                            ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                            : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
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
                    <Play className="w-3.5 h-3.5 fill-current" /> Launch Studio Mode
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                    240Hz Pure Physics →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
