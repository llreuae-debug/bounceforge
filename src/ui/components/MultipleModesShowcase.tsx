import React, { useEffect, useRef } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { AudioEngine } from '../../audio/audioEngine';
import { startWhenIdleAndVisible } from '../hooks/deferredStart';
import { Play, ArrowRight } from 'lucide-react';

export interface GameModeItem {
  id: string;
  name: string;
  description: string;
  visualType:
    | 'classic'
    | 'accumulation'
    | 'multiply'
    | 'lines'
    | 'paint'
    | 'target'
    | 'grow'
    | 'shatter'
    | 'color_match'
    | 'portal';
}

export const GAME_MODES: GameModeItem[] = [
  {
    id: 'classic',
    name: 'Classic',
    description:
      'A ball bounces inside concentric circles, each with a gap. As it breaks through walls, satisfying effects play. Simple, mesmerising, and endlessly watchable.',
    visualType: 'classic',
  },
  {
    id: 'accumulation',
    name: 'Accumulation',
    description:
      'The ball has a limited time to escape before it freezes in place. Each frozen ball becomes a new obstacle for the next one. Can the final ball make it out?',
    visualType: 'accumulation',
  },
  {
    id: 'multiply',
    name: 'Multiply',
    description:
      'Every time a ball escapes a wall, it spawns extra balls. The arena quickly fills with bouncing chaos — perfect for explosive, shareable clips.',
    visualType: 'multiply',
  },
  {
    id: 'lines',
    name: 'Lines',
    description:
      'Every bounce point is connected by a line, creating intricate geometric art as the ball ricochets around the circle.',
    visualType: 'lines',
  },
  {
    id: 'paint',
    name: 'Paint',
    description:
      'The ball leaves a colourful rainbow trail as it moves, gradually painting the entire circle. A live percentage counter tracks your coverage.',
    visualType: 'paint',
  },
  {
    id: 'target',
    name: 'Target',
    description:
      'Numbered segments line the wall. The ball must hit them in the correct order — each correct hit triggers a satisfying wall-break effect.',
    visualType: 'target',
  },
  {
    id: 'grow',
    name: 'Grow',
    description:
      'The ball is trapped in a single large circle. With every bounce, it grows larger, pushing the limits of the space until the very end.',
    visualType: 'grow',
  },
  {
    id: 'shatter',
    name: 'Shatter',
    description:
      'Every wall is divided into segments with hit points. Each bounce cracks the segment — after enough hits it shatters. Clear a path through all walls to escape.',
    visualType: 'shatter',
  },
  {
    id: 'color_match',
    name: 'Color Match',
    description:
      'The wall is divided into coloured segments. The ball changes colour on every bounce — break the segment when your colour matches. Clear them all to escape.',
    visualType: 'color_match',
  },
  {
    id: 'portal',
    name: 'Portal',
    description:
      'Colour-matched portal pairs sit on the wall. Hit one portal and teleport to its twin — after enough uses the portals break and the ball escapes.',
    visualType: 'portal',
  },
];

// Interactive live animated canvas simulation for each of the 10 reference game modes
const GameModeCanvas: React.FC<{ type: GameModeItem['visualType'] }> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Decorative loops run only after load/idle and while on screen
    return startWhenIdleAndVisible(canvas, () => {

    let animId: number;
    let t = 0;

    // Persistent state per mode
    const frozenBalls: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.4;
      const dist = 30 + ((i * 19) % 75);
      frozenBalls.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: 3.5 + (i % 3),
      });
    }

    const linePoints: { x: number; y: number; color: string }[] = [];
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#a855f7', '#ff7a00'];
    for (let i = 0; i < 24; i++) {
      const a = i * 1.35;
      const r = 90;
      linePoints.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        color: colors[i % colors.length],
      });
    }

    const rainbowBands: { x1: number; y1: number; x2: number; y2: number; color: string; width: number }[] = [];
    const rColors = ['#ff0055', '#ff7a00', '#ffe600', '#00ff88', '#00f0ff', '#a855f7'];
    for (let i = 0; i < 18; i++) {
      const a1 = (i / 18) * Math.PI * 2;
      const a2 = a1 + 2.2;
      rainbowBands.push({
        x1: Math.cos(a1) * 88,
        y1: Math.sin(a1) * 88,
        x2: Math.cos(a2) * 88,
        y2: Math.sin(a2) * 88,
        color: rColors[i % rColors.length],
        width: 14 + (i % 6) * 2,
      });
    }

    const render = () => {
      t += 0.024;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const arenaR = Math.min(w, h) * 0.43;

      ctx.fillStyle = '#080a10';
      ctx.fillRect(0, 0, w, h);

      // Subtle radial background gradient
      const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, arenaR * 1.2);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);

      // 1. CLASSIC MODE
      if (type === 'classic') {
        const rings = [
          { r: arenaR * 0.95, color: '#00f0ff', speed: 0.6, gap: 0.6 },
          { r: arenaR * 0.78, color: '#ff007f', speed: -0.9, gap: 0.7 },
          { r: arenaR * 0.6, color: '#ffe600', speed: 1.2, gap: 0.8 },
          { r: arenaR * 0.42, color: '#ff0055', speed: -1.4, gap: 0.9 },
        ];

        rings.forEach((ring, idx) => {
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = ring.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          const rot = t * ring.speed + idx * 0.8;
          ctx.arc(cx, cy, ring.r, rot + ring.gap, rot + Math.PI * 2);
          ctx.stroke();
        });

        // Bouncing pink ball
        const bx = cx + Math.cos(t * 3.2) * (arenaR * 0.48);
        const by = cy + Math.sin(t * 2.6) * (arenaR * 0.48);
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();

        // Particle sparks
        for (let i = 0; i < 8; i++) {
          const spA = t * 5 + i * 0.8;
          const spR = arenaR * 0.9 + Math.sin(t * 4 + i) * 12;
          ctx.fillStyle = i % 2 === 0 ? '#ffe600' : '#00f0ff';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(spA) * spR, cy + Math.sin(spA) * spR, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. ACCUMULATION MODE
      else if (type === 'accumulation') {
        // Outer boundary
        ctx.strokeStyle = '#223048';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
        ctx.stroke();

        // Frozen obstacle balls
        frozenBalls.forEach((fb, i) => {
          ctx.fillStyle = i % 5 === 0 ? '#a855f7' : '#cbd5e1';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(cx + fb.x, cy + fb.y, fb.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Active glowing ball
        const abx = cx + Math.cos(t * 4.2) * (arenaR * 0.72);
        const aby = cy + Math.sin(t * 3.6) * (arenaR * 0.72);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(abx, aby, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Center HUD
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 15px monospace';
        ctx.shadowColor = 'rgba(0, 255, 136, 0.6)';
        ctx.shadowBlur = 8;
        const secs = Math.max(0.1, (2.7 - ((t * 0.4) % 2.7))).toFixed(1);
        ctx.fillText(`${secs}s`, cx, cy - 8);

        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Frozen: 28', cx, cy + 8);
      }

      // 3. MULTIPLY MODE
      else if (type === 'multiply') {
        // Segmented outer ring
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR, t * 0.8 + 0.4, t * 0.8 + Math.PI * 2 - 0.4);
        ctx.stroke();

        // 20+ Chaotic bouncing balls with trails
        for (let i = 0; i < 22; i++) {
          const speed = 2.5 + (i % 7) * 0.4;
          const a = t * speed + (i * Math.PI) / 11;
          const r = Math.sin(t * 1.5 + i) * (arenaR * 0.85);
          const bx = cx + Math.cos(a) * r;
          const by = cy + Math.sin(a) * r;

          const col = colors[i % colors.length];
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(bx, by, 4 + (i % 3), 0, Math.PI * 2);
          ctx.fill();

          // Motion lines
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx - Math.cos(a) * 18, by - Math.sin(a) * 18);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      // 4. LINES MODE
      else if (type === 'lines') {
        // Ring
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
        ctx.stroke();

        // Intricate geometric chords
        ctx.lineWidth = 1.3;
        for (let i = 1; i < linePoints.length; i++) {
          const p1 = linePoints[i - 1];
          const p2 = linePoints[i];
          ctx.strokeStyle = p2.color;
          ctx.shadowColor = p2.color;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.moveTo(cx + p1.x, cy + p1.y);
          ctx.lineTo(cx + p2.x, cy + p2.y);
          ctx.stroke();
        }

        // Active node
        const activeNode = linePoints[Math.floor(t * 4) % linePoints.length];
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx + activeNode.x, cy + activeNode.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. PAINT MODE
      else if (type === 'paint') {
        // Arena circle boundary
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
        ctx.stroke();

        // Broad colorful painted bands
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR - 2, 0, Math.PI * 2);
        ctx.clip();

        rainbowBands.forEach((b) => {
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx + b.x1, cy + b.y1);
          ctx.lineTo(cx + b.x2, cy + b.y2);
          ctx.stroke();
        });
        ctx.restore();

        // Center HUD
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#080a10';
        ctx.shadowBlur = 0;
        ctx.fillRect(cx - 52, cy - 14, 104, 28);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 52, cy - 14, 104, 28);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('66% painted', cx, cy);
      }

      // 6. TARGET MODE
      else if (type === 'target') {
        // Target numbered segments around wall
        const segCount = 8;
        const targetNums = [14, 6, 5, 11, 15, 1, 13, 7];
        const step = (Math.PI * 2) / segCount;

        for (let i = 0; i < segCount; i++) {
          const a1 = i * step + 0.08;
          const a2 = (i + 1) * step - 0.08;
          const isTarget = targetNums[i] === 13;
          ctx.strokeStyle = isTarget ? '#ffd600' : '#00e599';
          ctx.lineWidth = isTarget ? 4 : 2;
          ctx.shadowColor = isTarget ? '#ffd600' : '#00e599';
          ctx.shadowBlur = isTarget ? 10 : 4;
          ctx.beginPath();
          ctx.arc(cx, cy, arenaR, a1, a2);
          ctx.stroke();

          // Number label
          const midA = (a1 + a2) / 2;
          const tx = cx + Math.cos(midA) * (arenaR - 16);
          const ty = cy + Math.sin(midA) * (arenaR - 16);
          ctx.fillStyle = isTarget ? '#ffd600' : '#64748b';
          ctx.font = `bold ${isTarget ? 13 : 9}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(targetNums[i].toString(), tx, ty);
        }

        // Active blue ball
        const bx = cx + Math.cos(t * 3.8) * (arenaR * 0.7);
        const by = cy + Math.sin(t * 3.1) * (arenaR * 0.7);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();

        // Center HUD
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd600';
        ctx.font = 'bold 28px monospace';
        ctx.shadowColor = 'rgba(255, 214, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('13', cx, cy - 8);

        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px monospace';
        ctx.fillText('2/15', cx, cy + 14);
      }

      // 7. GROW MODE
      else if (type === 'grow') {
        // Thin green ring
        ctx.strokeStyle = '#00e599';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00e599';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
        ctx.stroke();

        // Giant glowing purple ball expanding
        const ballR = arenaR * 0.48 + Math.sin(t * 1.5) * 6;
        const gbx = cx - arenaR * 0.28;
        const gby = cy;

        const ballGrad = ctx.createRadialGradient(gbx - ballR * 0.3, gby - ballR * 0.3, 5, gbx, gby, ballR);
        ballGrad.addColorStop(0, '#e879f9');
        ballGrad.addColorStop(0.6, '#a855f7');
        ballGrad.addColorStop(1, '#581c87');

        ctx.fillStyle = ballGrad;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(gbx, gby, ballR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. SHATTER MODE
      else if (type === 'shatter') {
        // Concentric dashed segments
        const ringLayers = 5;
        for (let l = 1; l <= ringLayers; l++) {
          const lr = (arenaR / ringLayers) * l;
          const segs = 18 + l * 6;
          const step = (Math.PI * 2) / segs;
          ctx.lineWidth = 3;
          ctx.strokeStyle = l % 2 === 0 ? '#ffd600' : '#00e599';
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 4;

          for (let s = 0; s < segs; s++) {
            // Leave shattered gaps
            if ((s + l * 3) % 7 === 0) continue;
            ctx.beginPath();
            ctx.arc(cx, cy, lr, s * step + 0.04, (s + 1) * step - 0.04);
            ctx.stroke();
          }
        }

        // Active ball in center
        const bx = cx + Math.cos(t * 3.5) * (arenaR * 0.3);
        const by = cy + Math.sin(t * 2.8) * (arenaR * 0.3);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();

        // Center HUD
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText('12/180', cx, cy - 6);

        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 8px monospace';
        ctx.fillText('segments shattered', cx, cy + 9);
      }

      // 9. COLOR MATCH MODE
      else if (type === 'color_match') {
        // Divided colored segments around the wall
        const segs = [
          { a1: 0, a2: Math.PI * 0.5 - 0.1, color: '#ff007f' },
          { a1: Math.PI * 0.5 + 0.1, a2: Math.PI - 0.1, color: '#00f0ff' },
          { a1: Math.PI + 0.1, a2: Math.PI * 1.5 - 0.1, color: '#ffd600' },
          { a1: Math.PI * 1.5 + 0.1, a2: Math.PI * 2 - 0.1, color: '#00ff88' },
        ];

        segs.forEach((s) => {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 3.5;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, arenaR, s.a1, s.a2);
          ctx.stroke();
        });

        // Bouncing colored ball
        const bx = cx + Math.cos(t * 3.2) * (arenaR * 0.65);
        const by = cy + Math.sin(t * 2.9) * (arenaR * 0.65);
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Center HUD
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.shadowBlur = 0;
        ctx.fillText('7 / 12', cx, cy - 6);

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Match color', cx, cy + 10);
      }

      // 10. PORTAL MODE
      else if (type === 'portal') {
        // Ring
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
        ctx.stroke();

        // Paired glowing wormhole portals
        const portals = [
          { a1: 0.2, a2: 0.9, color: '#ffd600' },
          { a1: Math.PI + 0.2, a2: Math.PI + 0.9, color: '#ffd600' },
          { a1: Math.PI * 0.5 + 0.2, a2: Math.PI * 0.5 + 0.8, color: '#00f0ff' },
          { a1: Math.PI * 1.5 + 0.2, a2: Math.PI * 1.5 + 0.8, color: '#00f0ff' },
        ];

        portals.forEach((p) => {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 5;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(cx, cy, arenaR, p.a1, p.a2);
          ctx.stroke();
        });

        // Teleporting ball with streak
        const warpPhase = (t * 1.5) % 2;
        const curA = warpPhase < 1 ? warpPhase * Math.PI : Math.PI + (warpPhase - 1) * Math.PI;
        const bx = cx + Math.cos(curA) * (arenaR * 0.7);
        const by = cy + Math.sin(curA) * (arenaR * 0.7);

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();

        // Center HUD
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText('3', cx, cy - 6);

        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px monospace';
        ctx.fillText('teleports', cx, cy + 12);
      }

      // Subtle Center Watermark matching reference screenshot
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.font = '500 11px sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText('bounceforge', cx, cy + arenaR * 0.48);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
    });
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={270}
      className="w-full h-full object-cover"
    />
  );
};

export const MultipleModesShowcase: React.FC = () => {
  const { setRoute, setMode, showToast } = useStudioStore();

  const handleLaunchMode = (modeId: string, modeName: string) => {
    try {
      const audio = AudioEngine.getInstance();
      audio.init();
      audio.resume();
      audio.playAuditionNote('8bit', 523.25, 0.4);
    } catch {}

    setMode(modeId);
    setRoute('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Loaded ${modeName} Studio Mode!`);
  };

  return (
    <section id="modes" className="py-24 border-b border-white/10 bg-[#000000] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Title matching exact user screenshot */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Game Modes
          </h2>
        </div>

        {/* 10 Game Modes Grid matching user reference UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAME_MODES.map((mode) => (
            <div
              key={mode.id}
              onClick={() => handleLaunchMode(mode.id, mode.name)}
              className="group relative rounded-2xl bg-[#090b10] border border-white/5 hover:border-cyan-500/40 p-3.5 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Visual Canvas Container */}
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#05060a] border border-white/5 group-hover:border-white/10 transition-colors">
                  <GameModeCanvas type={mode.visualType} />

                  {/* Hover Overlay Play Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-400/30 transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Title */}
                <h3 className="text-base font-bold text-white mt-4 mb-2 group-hover:text-cyan-300 transition-colors">
                  {mode.name}
                </h3>

                {/* Card Description */}
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  {mode.description}
                </p>
              </div>

              {/* Bottom Subtle Indicator */}
              <div className="pt-4 flex items-center justify-between text-[11px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                <span>Deterministic Physics</span>
                <span className="flex items-center gap-1 font-bold">
                  <span>Launch</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
