import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { PhysicsWorld } from '../engine/world';
import { getModeById } from '../modes/registry';
import { WorldRenderer } from '../render/renderer';
import { AudioEngine } from '../audio/audioEngine';
import { withTargetDuration } from '../engine/duration';
import { DurationPicker, formatClock } from './components/DurationPicker';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Shield,
  MousePointer,
  Plus,
  Disc,
  Zap,
  HelpCircle,
  Hash,
} from 'lucide-react';
import { AdaptiveQualityManager } from '../platform/quality';
import { triggerHaptic } from '../platform/haptics';
import { RestartConfirmModal } from './modals/RestartConfirmModal';

export const StudioCanvas: React.FC = () => {
  const {
    currentModeId,
    modeSettings,
    seed,
    setSeed,
    randomizeSeed,
    isPlaying,
    setIsPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    isMuted,
    setIsMuted,
    visuals,
    overlays,
    setOverlays,
    setExportOpen,
    resetModeToDefault,
    undoLastReset,
    toast,
    dismissToast,
    targetDuration,
    setTargetDuration,
    qualityMode,
    currentQualityTier,
    setCurrentQualityTier,
    audioUnlocked,
    setAudioUnlocked,
    showToast,
    ballPhysics,
    wallControls,
    customBall,
    setShortcutsOpen,
    setRestartConfirmOpen,
  } = useStudioStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<PhysicsWorld | null>(null);
  const rendererRef = useRef<WorldRenderer>(new WorldRenderer());
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const qualityManagerRef = useRef<AdaptiveQualityManager>(new AdaptiveQualityManager(currentQualityTier));
  const wasPlayingBeforeHiddenRef = useRef<boolean>(false);
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const [seedInput, setSeedInput] = useState(seed.toString());
  const [interactMode, setInteractMode] = useState<'play' | 'spawn' | 'bumper'>('play');
  const [simTime, setSimTime] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [bounceBoostEnergy, setBounceBoostEnergy] = useState<number>(0);

  // Initialize or Reset Physics Simulation
  const initSimulation = () => {
    const mode = getModeById(currentModeId);
    const world = new PhysicsWorld(1080, 1920, seed);
    mode.setup(world, modeSettings, seed);
    world.applyGlobalModifiers(ballPhysics, wallControls, customBall);

    // Audio Engine initialization and event bus binding
    const audio = AudioEngine.getInstance();
    audio.init();
    audio.resetMelodyPosition();

    world.eventBus.subscribe((event) => {
      audio.handleCollision(event);
      if (mode.onCollision) {
        mode.onCollision(world, event, modeSettings);
      }
      if (event.type === 'escape' && visuals.chromaticFlash) {
        rendererRef.current.triggerFlash();
      }
      if (visuals.screenShakeIntensity > 0) {
        rendererRef.current.triggerShake(event.impulse / 30);
      }
    });

    worldRef.current = world;
    setSimTime(0);
    setIsComplete(false);
  };

  useEffect(() => {
    initSimulation();
    setSeedInput(seed.toString());
  }, [currentModeId, seed, modeSettings, targetDuration, ballPhysics, wallControls, customBall]);

  // Pressing play after the animation completed replays it from the start
  useEffect(() => {
    if (isPlaying && worldRef.current?.isFinished) {
      initSimulation();
    }
  }, [isPlaying]);

  // Audio mute sync
  useEffect(() => {
    AudioEngine.getInstance().setMuted(isMuted);
  }, [isMuted]);

  // Session audio unlock restoration
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('bounceforge_audio_unlocked') === 'true') {
        const audio = AudioEngine.getInstance();
        audio.resume();
        setAudioUnlocked(true);
      }
    } catch {}
  }, [setAudioUnlocked]);


  // Quality manager mode sync and live tier change listener
  useEffect(() => {
    qualityManagerRef.current.setMode(qualityMode, currentQualityTier);
  }, [qualityMode]);

  useEffect(() => {
    return qualityManagerRef.current.onTierChange((newTier, isAuto, reason) => {
      setCurrentQualityTier(newTier);
      if (reason && isAuto) {
        showToast(`quality: ${newTier} (${reason})`, undefined, 3000);
      }
    });
  }, [setCurrentQualityTier, showToast]);

  // Tab Visibility (pause on background, resume on active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = AudioEngine.getInstance();
      if (document.hidden) {
        if (isPlaying) {
          wasPlayingBeforeHiddenRef.current = true;
          setIsPlaying(false);
        }
        audio.suspend();
      } else {
        if (wasPlayingBeforeHiddenRef.current) {
          setIsPlaying(true);
          wasPlayingBeforeHiddenRef.current = false;
        }
        audio.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, setIsPlaying]);

  // WebGL / Canvas Context Loss Recovery
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      showToast('graphics context lost, recovering scene...');
    };

    const handleContextRestored = () => {
      showToast('graphics restored');
      initSimulation();
    };

    canvas.addEventListener('contextlost', handleContextLost);
    canvas.addEventListener('contextrestored', handleContextRestored);
    return () => {
      canvas.removeEventListener('contextlost', handleContextLost);
      canvas.removeEventListener('contextrestored', handleContextRestored);
    };
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        undoLastReset();
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        triggerHaptic(10);
        setShortcutsOpen(true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        triggerHaptic(10);
        handleTogglePlay();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        triggerHaptic(15);
        if (e.shiftKey) {
          resetModeToDefault();
        } else {
          setRestartConfirmOpen(true);
        }
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        triggerHaptic(10);
        randomizeSeed();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMuted(!isMuted);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        setExportOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  // Main Simulation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localTimer = 0;

    const renderLoop = (now: number) => {
      const deltaSec = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      const frameDeltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Feed quality manager for live dynamic adaptation
      qualityManagerRef.current.recordFrame(frameDeltaMs);
      const profile = qualityManagerRef.current.getProfile();

      // Limit audio voices based on tier
      AudioEngine.getInstance().setMaxVoices(profile.maxAudioVoices);

      const world = worldRef.current;
      const mode = getModeById(currentModeId);

      if (world && isPlaying && !world.isFinished) {
        const simDt = deltaSec * playbackSpeed;
        if (mode.step) {
          mode.step(world, simDt, modeSettings);
        }
        world.step(simDt);

        // Complete the animation at the chosen target duration (or earlier if the mode ends)
        const done =
          world.isFinished ||
          world.time >= targetDuration ||
          mode.isFinished(world, withTargetDuration(modeSettings, targetDuration));
        if (done) {
          world.isFinished = true;
          setSimTime(Math.min(world.time, targetDuration));
          setIsComplete(true);
          setIsPlaying(false);
          triggerHaptic(20);
        }

        // Throttle React state update for scrubber and HUD
        localTimer += deltaSec;
        if (localTimer > 0.1 && !done) {
          localTimer = 0;
          setSimTime(world.time);
          if (world.getBounceBoostEnergy) {
            setBounceBoostEnergy(world.getBounceBoostEnergy());
          }
        }
      }

      if (world && ctx) {
        const scaledVisuals = {
          ...visuals,
          bloomEnabled: visuals.bloomEnabled && profile.bloomEnabled,
          bloomIntensity: visuals.bloomIntensity * profile.bloomIntensityScale,
          trailLength: Math.max(2, Math.round(visuals.trailLength * profile.trailLengthScale)),
          chromaticFlash: visuals.chromaticFlash && profile.chromaticFlashEnabled,
          screenShakeIntensity: visuals.screenShakeIntensity * profile.screenShakeScale,
        };

        rendererRef.current.render(
          ctx,
          world,
          scaledVisuals,
          overlays,
          canvas.width,
          canvas.height,
          false
        );
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, visuals, overlays, currentModeId, modeSettings, targetDuration]);

  const handleStepFrame = () => {
    const world = worldRef.current;
    const mode = getModeById(currentModeId);
    if (world && !world.isFinished) {
      const dt = 1 / 60;
      if (mode.step) mode.step(world, dt, modeSettings);
      world.step(dt);
      setSimTime(world.time);
    }
  };

  const handleSeedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(seedInput, 10);
    if (!isNaN(parsed)) {
      setSeed(parsed);
    }
  };

  const handleUnlockAudio = () => {
    const audio = AudioEngine.getInstance();
    audio.unlock();
    audio.resumeAudio();
    setAudioUnlocked(true);
    try {
      sessionStorage.setItem('bounceforge_audio_unlocked', 'true');
    } catch {}
    triggerHaptic(15);
    showToast('asmr sound unlocked');
  };

  const handleTogglePlay = () => {
    const audio = AudioEngine.getInstance();
    audio.resume();
    if (!audioUnlocked) setAudioUnlocked(true);
    try {
      sessionStorage.setItem('bounceforge_audio_unlocked', 'true');
    } catch {}
    togglePlay();
  };


  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const audio = AudioEngine.getInstance();
    audio.resume();
    if (!audioUnlocked) setAudioUnlocked(true);

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };

    // Long press detection for reset control
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic(25);
      initSimulation();
      showToast('long press: reset scene');
      pointerDownPosRef.current = null;
    }, 600);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerDownPosRef.current) return;
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    if (Math.hypot(dx, dy) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!pointerDownPosRef.current) return;
    pointerDownPosRef.current = null;

    handleCanvasClick(e);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    if (interactMode === 'play') {
      triggerHaptic(10);
      handleTogglePlay();
      return;
    }

    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 1080 / rect.width;
    const scaleY = 1920 / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (interactMode === 'spawn') {
      triggerHaptic(15);
      const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#a855f7'];
      const color = colors[world.balls.length % colors.length];
      world.addBall({
        x: clickX,
        y: clickY,
        vx: (Math.random() - 0.5) * 250,
        vy: (Math.random() - 0.5) * 150,
        radius: 13,
        mass: 1.0,
        color,
        glowColor: color,
      });
    } else if (interactMode === 'bumper') {
      triggerHaptic(15);
      world.pegs.push({
        id: Date.now(),
        x: clickX,
        y: clickY,
        radius: 16,
        color: '#ff007f',
        score: 100,
      });
    }
  };

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] flex flex-col items-center justify-between p-3 sm:p-4 bg-[#050608] relative overflow-hidden select-none font-sans">

      {/* Interactive Tool Selector Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md mb-2 shadow-sm">
        <button
          onClick={() => setInteractMode('play')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            interactMode === 'play'
              ? 'btn-3d-cyan text-black shadow-sm'
              : 'btn-3d-glass text-slate-400 hover:text-white'
          }`}
          title="Click canvas to toggle Play / Pause"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Click: Play/Pause</span>
        </button>

        <button
          onClick={() => setInteractMode('spawn')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            interactMode === 'spawn'
              ? 'btn-3d-purple text-white shadow-sm'
              : 'btn-3d-glass text-slate-400 hover:text-white'
          }`}
          title="Click canvas to spawn an interactive bouncing ball"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Spawn Ball</span>
        </button>

        <button
          onClick={() => setInteractMode('bumper')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            interactMode === 'bumper'
              ? 'btn-3d-lime text-black shadow-sm'
              : 'btn-3d-glass text-slate-400 hover:text-white'
          }`}
          title="Click canvas to place a bouncy spring bumper peg"
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Place Bumper</span>
        </button>
      </div>

      {/* 9:16 Canvas Frame */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
        <div className="h-full aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-950/30 relative bg-[#090a0f] flex items-center justify-center">
          {/* Quality Chip Overlay */}
          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-md pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
            quality: {currentQualityTier} ({qualityMode === 'auto' ? 'auto' : 'manual'})
          </div>

          {/* Bounce Boost Energy Meter HUD */}
          {ballPhysics.bounceBoostEnabled && (
            <div className="absolute top-10 left-3 z-30 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 shadow-md pointer-events-none">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
              <span>boost: {Math.round(bounceBoostEnergy)}%</span>
            </div>
          )}

          {/* Pulsing "tap for asmr" pill on the preview until audio starts */}
          {!audioUnlocked && (
            <button
              onClick={handleUnlockAudio}
              className="btn-3d-pink absolute top-3 right-3 z-30 px-3.5 py-1.5 rounded-full text-white font-black text-[11px] shadow-lg shadow-pink-500/40 flex items-center gap-1.5 animate-pulse transition-all uppercase tracking-wider border border-pink-400/60"
              title="Unlock ASMR audio for this device"
            >
              <Volume2 className="w-3.5 h-3.5 text-white" /> tap for asmr
            </button>
          )}


          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
            className="w-full h-full object-contain cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            }}
          />

          {/* Pause Watermark Icon Overlay */}
          {!isPlaying && interactMode === 'play' && (
            <div
              onClick={() => {
                triggerHaptic(10);
                handleTogglePlay();
              }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-opacity"
            >
              <div className="w-16 h-16 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
                {isComplete ? (
                  <RotateCcw className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                )}
              </div>
              {isComplete && (
                <span className="absolute bottom-[38%] px-3 py-1 rounded-full bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider shadow-lg">
                  Complete in {formatClock(simTime)} · replay
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Target-Duration Timeline Scrubber Bar */}
      <div className="w-full max-w-2xl px-5 py-2 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3 mt-2 shadow-inner">
        <span className="text-[11px] font-mono text-cyan-400 font-bold min-w-10">
          {Math.floor(simTime).toString().padStart(2, '0')}:{(Math.floor((simTime % 1) * 100)).toString().padStart(2, '0')}
        </span>
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (worldRef.current) worldRef.current.time = pct * targetDuration;
            setSimTime(pct * targetDuration);
          }}
          className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group"
          title="Click to seek simulation timeline"
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-pink-500 to-[#CCFF00] rounded-full transition-all duration-75 relative"
            style={{ width: `${Math.min(100, (simTime / targetDuration) * 100)}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-400">{formatClock(targetDuration)}</span>
        <DurationPicker value={targetDuration} onChange={setTargetDuration} />
      </div>

      {/* Playback Control Bar */}
      <div className="h-16 w-full max-w-2xl px-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between mt-2 shadow-lg">
        {/* Playback Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className="btn-3d-cyan w-10 h-10 rounded-xl text-black flex items-center justify-center transition-all shadow-md shadow-cyan-500/20"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={() => setRestartConfirmOpen(true)}
            className="btn-3d-glass w-10 h-10 rounded-xl text-slate-300 hover:text-white flex items-center justify-center transition-all"
            title="Restart Simulation (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleStepFrame}
            className="btn-3d-glass w-10 h-10 rounded-xl text-slate-300 hover:text-white flex items-center justify-center transition-all"
            title="Step 1 Frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`btn-3d-glass w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isMuted
                ? 'border-red-500/50 text-red-400'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Mute / Unmute (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Speed Multiplier Pill */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {[0.25, 0.5, 1.0, 2.0, 4.0, 8.0].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-1 text-[10.5px] font-bold rounded-lg transition-all ${
                playbackSpeed === spd
                  ? 'btn-3d-cyan text-black shadow-sm'
                  : 'btn-3d-glass text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Seed Input & Randomize */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSeedSubmit} className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Seed:
            </span>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-cyan-300 text-center outline-none focus:border-cyan-400"
            />
          </form>

          <button
            onClick={randomizeSeed}
            className="btn-3d-glass p-2 rounded-xl text-slate-300 hover:text-cyan-300 transition-all"
            title="Randomize Seed (N)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              setOverlays({ showSafeZone: !overlays.showSafeZone });
            }}
            className={`btn-3d-glass p-2 rounded-xl transition-all ${
              overlays.showSafeZone
                ? 'border-red-500/50 text-red-300'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle TikTok / Shorts Safe Zones"
          >
            <Shield className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              setOverlays({ showCounter: !overlays.showCounter });
            }}
            className={`btn-3d-glass p-2 rounded-xl transition-all ${
              overlays.showCounter
                ? 'border-cyan-400/50 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Rings Left / Live Counter on screen"
          >
            <Hash className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="btn-3d-glass p-2 rounded-xl text-slate-400 hover:text-white transition-all"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <RestartConfirmModal onConfirm={initSimulation} />
    </div>
  );
};
