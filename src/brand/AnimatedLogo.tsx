import React, { useEffect, useRef, useState } from 'react';

export interface AnimatedLogoProps {
  autoplay?: boolean;
  loop?: boolean;
  soundEnabled?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  autoplay = true,
  loop = true,
  soundEnabled = false,
  width = '100%',
  height = 360,
  className = '',
}) => {
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const playSound = (type: 'ping1' | 'ping2' | 'escape') => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'ping1') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'ping2') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      } else if (type === 'escape') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.2);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      }
    } catch {}
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let animTime = 0;
    let lastTime = performance.now();
    let ping1Played = false;
    let ping2Played = false;
    let escapePlayed = false;

    // Canvas coordinate space: 960x320
    canvas.width = 960;
    canvas.height = 320;

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      animTime += dt;
      if (animTime > 2.0) {
        if (!loop) return;
        animTime = 0;
        ping1Played = false;
        ping2Played = false;
        escapePlayed = false;
      }

      const t = animTime; // 0.0s to 2.0s
      ctx.clearRect(0, 0, 960, 320);

      // Background
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, 960, 320);

      // Center origin for symbol: (220, 160)
      const originX = 220;
      const originY = 160;

      // 1. Ring Draw-On: strokeDashoffset animation
      // Ring center: (originX, originY), radius: 64, thickness: 22
      // Gap: 40 deg at top-right (from -60 deg to -20 deg)
      const ringRadius = 64;
      const ringThickness = 22;

      let ringProgress = 0;
      if (t >= 0.25) {
        ringProgress = Math.min(1.0, (t - 0.25) / 0.5);
      }

      if (ringProgress > 0) {
        ctx.save();
        ctx.lineWidth = ringThickness;
        ctx.strokeStyle = '#CCFF00';
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Ring arc from -20 deg clockwise to -60 deg (320 deg total)
        const startRad = (-20 * Math.PI) / 180;
        const totalSweep = (320 * Math.PI) / 180;
        const currentSweep = totalSweep * ringProgress;
        ctx.arc(originX, originY, ringRadius, startRad, startRad + currentSweep);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Ball physics & Squash and Stretch
      let ballX = originX;
      let ballY = originY;
      let scaleX = 1.0;
      let scaleY = 1.0;
      let ballRadius = 21;
      let showStreaks = false;
      let flashOpacity = 0;

      if (t < 0.3) {
        // Drop in from top
        const p = t / 0.3;
        ballY = 40 + p * (originY - 40);
        ballX = originX;
        // Stretch downward as it falls
        scaleX = 0.85;
        scaleY = 1.2;
      } else if (t < 0.6) {
        // Bounce 1: impact squash at t=0.3
        if (!ping1Played) {
          playSound('ping1');
          ping1Played = true;
        }
        const p = (t - 0.3) / 0.3;
        if (p < 0.2) {
          // Squash on impact
          scaleX = 1.35;
          scaleY = 0.7;
          ballY = originY + 12;
        } else {
          // Rebound up
          const h = Math.sin(((p - 0.2) / 0.8) * Math.PI) * 40;
          ballY = originY - h;
          scaleX = 0.95;
          scaleY = 1.08;
        }
      } else if (t < 1.1) {
        // Bounce 2 & ESCAPE burst
        if (!ping2Played) {
          playSound('ping2');
          ping2Played = true;
        }
        if (!escapePlayed && t >= 0.72) {
          playSound('escape');
          escapePlayed = true;
        }

        const p = (t - 0.6) / 0.5;
        if (p < 0.15) {
          scaleX = 1.3;
          scaleY = 0.75;
          ballY = originY + 8;
        } else {
          // Burst out along top-right gap trajectory (+45 deg)
          const escP = (p - 0.15) / 0.85;
          const burst = escP * escP;
          ballX = originX + burst * 60;
          ballY = originY - burst * 54;
          showStreaks = true;
          scaleX = 1.15;
          scaleY = 0.9;
          flashOpacity = Math.max(0, 1.0 - escP * 2.5);
        }
      } else {
        // Settled lockup position
        ballX = originX + 56;
        ballY = originY - 50;
        showStreaks = true;
        scaleX = 1.0;
        scaleY = 1.0;
      }

      // 3. Motion streaks behind ball
      if (showStreaks) {
        ctx.save();
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';

        // Streak 1
        ctx.strokeStyle = '#FF2E93';
        ctx.beginPath();
        ctx.moveTo(ballX - 42, ballY + 38);
        ctx.lineTo(ballX - 16, ballY + 14);
        ctx.stroke();

        // Streak 2
        ctx.strokeStyle = '#FF2E93';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(ballX - 52, ballY + 28);
        ctx.lineTo(ballX - 26, ballY + 5);
        ctx.stroke();

        // Streak 3
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ballX - 44, ballY + 52);
        ctx.lineTo(ballX - 22, ballY + 32);
        ctx.stroke();
        ctx.restore();
      }

      // Flat energy flash
      if (flashOpacity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(204, 255, 0, ${flashOpacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Ball (Solid hot pink, flat vector, with squash and stretch transform)
      ctx.save();
      ctx.translate(ballX, ballY);
      ctx.scale(scaleX, scaleY);
      ctx.fillStyle = '#FF2E93';
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Wordmark Slide-In: "bounceforge" (lowercase, Helvetica Neue Black 900, tracking -0.05em, no 3D)
      let wordmarkProgress = 0;
      if (t >= 0.8) {
        wordmarkProgress = Math.min(1.0, (t - 0.8) / 0.45);
      }

      if (wordmarkProgress > 0) {
        ctx.save();
        ctx.font = '900 86px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#F5F5F0';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '-0.05em';

        // Slide in from right (offset by 40px initially)
        const targetX = 390;
        const currentX = targetX + (1.0 - wordmarkProgress) * 45;
        ctx.globalAlpha = wordmarkProgress;
        ctx.fillText('bounceforge', currentX, originY);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [loop, soundOn]);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: '#050507',
        borderRadius: 20,
      }}
      className={`select-none border border-white/10 shadow-2xl flex items-center justify-center ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full object-contain" />

      {/* Audio toggle button */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="px-3 py-1 text-xs font-black tracking-wider uppercase rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 backdrop-blur transition-colors"
          title="Toggle audio preview"
        >
          {soundOn ? '🔊 Audio ON' : '🔇 Audio OFF'}
        </button>
      </div>

      <div className="absolute bottom-3 left-4 z-10 text-[10px] font-mono tracking-widest text-neutral-500 uppercase pointer-events-none">
        Flat 2D Vector Logo • Concept A "The Escape" (2s Loop)
      </div>
    </div>
  );
};
export default AnimatedLogo;
