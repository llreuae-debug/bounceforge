import { AudioSettings, NoteItem, SfxType, InstrumentType } from './types';
import { BUILTIN_MELODIES, Melody } from './melodies';
import { SoundSynthesizer } from './synth';
import { CollisionEvent } from '../engine/types';
import { MarbleAudioSynthesizer } from '../marble3d/audioSynthesizer';
import { SOUND_REGISTRY, getSoundRecipe } from './soundRegistry';

interface ActiveVoice {
  id: number;
  gainNode: GainNode;
  stopNodes: (AudioNode & { stop?: (t: number) => void })[];
  startTime: number;
  isMelody: boolean;
  type: string;
}

class VoicePoolManager {
  private activeVoices: ActiveVoice[] = [];
  private nextVoiceId = 1;
  private maxAllowedVoices = 96;

  setMaxVoices(max: number): void {
    this.maxAllowedVoices = Math.max(24, Math.min(192, max));
  }

  getActiveCount(): number {
    return this.activeVoices.length;
  }

  allocateVoice(ctx: BaseAudioContext, isMelody: boolean, type: string = 'note'): {
    gainNode: GainNode;
    registerStop: (node: AudioNode & { stop?: (t: number) => void }) => void;
    release: () => void;
  } {
    // Priority voice stealing: when voices >= 96, steal oldest quiet tail first.
    // NEVER drop a new hit!
    if (this.activeVoices.length >= this.maxAllowedVoices) {
      this.stealOldestVoice(ctx);
    }

    const voiceGain = ctx.createGain();
    const voiceId = this.nextVoiceId++;
    const stopNodes: (AudioNode & { stop?: (t: number) => void })[] = [];

    const voiceItem: ActiveVoice = {
      id: voiceId,
      gainNode: voiceGain,
      stopNodes,
      startTime: ctx.currentTime,
      isMelody,
      type,
    };
    this.activeVoices.push(voiceItem);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const idx = this.activeVoices.findIndex((v) => v.id === voiceId);
      if (idx !== -1) {
        this.activeVoices.splice(idx, 1);
      }
    };

    const registerStop = (node: AudioNode & { stop?: (t: number) => void }) => {
      stopNodes.push(node);
    };

    return { gainNode: voiceGain, registerStop, release };
  }

  private stealOldestVoice(ctx: BaseAudioContext): void {
    // 1. Non-melody candidate voices (tails, ASMR, incidental contact)
    let candidates = this.activeVoices.filter((v) => !v.isMelody);

    // If only melody notes exist (all 96 are melody notes), steal the oldest elapsed one
    if (candidates.length === 0) {
      candidates = this.activeVoices;
    }

    // Sort by oldest (smallest startTime)
    candidates.sort((a, b) => a.startTime - b.startTime);
    const target = candidates[0];
    if (!target) return;

    try {
      // 5ms smooth fade out to eliminate clicks
      target.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      target.gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.005);
      target.stopNodes.forEach((node) => {
        try {
          if (typeof node.stop === 'function') {
            node.stop(ctx.currentTime + 0.006);
          }
        } catch {}
      });
    } catch {}

    const idx = this.activeVoices.findIndex((v) => v.id === target.id);
    if (idx !== -1) {
      this.activeVoices.splice(idx, 1);
    }
  }

  cleanupExpired(currentTime: number): void {
    // Release any voice that has been running for longer than 3.5s
    for (let i = this.activeVoices.length - 1; i >= 0; i--) {
      if (currentTime - this.activeVoices[i].startTime > 3.5) {
        this.activeVoices.splice(i, 1);
      }
    }
  }
}

export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private reverbGain: GainNode | null = null;
  private isMuted: boolean = false;

  private voicePool = new VoicePoolManager();
  private lastHitTime: number = -1;
  private lastScheduledAudioTime: number = -1;

  private currentMelody: Melody = BUILTIN_MELODIES[0];
  private currentNoteIndex: number = 0;
  private settings: AudioSettings = {
    masterVolume: 0.85,
    instrument: 'grandPiano',
    sfxVolume: 0.75,
    droneVolume: 0.2,
    reverbAmount: 0.3,
    pitchByVelocity: false,
    volumeByImpulse: true,
    selectedMelodyId: 'fur_elise',
  };

  private isUnlockedState: boolean = false;
  private silentAudioEl: HTMLAudioElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.ctx && this.ctx.state === 'suspended' && this.isUnlockedState) {
          this.resume();
        }
      });
      window.addEventListener('focus', () => {
        if (this.ctx && this.ctx.state === 'suspended' && this.isUnlockedState) {
          this.resume();
        }
      });
      // Global user touch / click unlock listener
      const unlockHandler = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.resume();
        }
      };
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('touchend', unlockHandler, { passive: true });
      window.addEventListener('click', unlockHandler, { passive: true });
    }
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  setMaxVoices(max: number): void {
    this.voicePool.setMaxVoices(max);
  }

  getActiveVoiceCount(): number {
    return this.voicePool.getActiveCount();
  }

  isUnlocked(): boolean {
    return this.isUnlockedState && !!this.ctx && this.ctx.state === 'running';
  }

  init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // iOS silent switch bypass: set audioSession type to playback if available
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
        try {
          (navigator as any).audioSession.type = 'playback';
        } catch {}
      }

      this.ctx.onstatechange = () => {
        if (this.ctx?.state === 'running') {
          this.isUnlockedState = true;
        }
      };

      // Master Limiter / Compressor: True Peak <= -1 dBTP protection
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-2.5, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(14, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.2, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      const safeVol = this.repairVolume(this.settings.masterVolume, 0.85);
      this.masterGain.gain.setValueAtTime(safeVol, this.ctx.currentTime);

      // Reverb Send
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(this.settings.reverbAmount ?? 0.3, this.ctx.currentTime);

      this.limiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Preload / Warmup procedural audio graphs
      MarbleAudioSynthesizer.preloadAllSounds(this.ctx);
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  /**
   * Repairs zero or muted volumes saved accidentally in preset data
   */
  private repairVolume(vol: number | undefined, defaultVal: number): number {
    if (vol === undefined || vol === null || isNaN(vol) || vol <= 0.001) {
      return defaultVal;
    }
    return Math.max(0.25, Math.min(1.0, vol));
  }

  preload(): void {
    if (!this.ctx) this.init();
    if (this.ctx) {
      MarbleAudioSynthesizer.preloadAllSounds(this.ctx);
    }
  }

  resume(): void {
    if (!this.ctx) {
      this.init();
    }

    // iOS silent audio element trick to keep playback category active
    if (!this.silentAudioEl && typeof document !== 'undefined') {
      try {
        const el = document.createElement('audio');
        el.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        el.setAttribute('playsinline', 'true');
        el.setAttribute('webkit-playsinline', 'true');
        el.volume = 0.001;
        el.play().catch(() => {});
        this.silentAudioEl = el;
      } catch {}
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlockedState = true;
      }).catch(() => {});
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isUnlockedState = true;
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  unlock(): void {
    this.resume();
  }

  resumeAudio(): void {
    this.resume();
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const vol = muted ? 0 : this.repairVolume(this.settings.masterVolume, 0.85);
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  updateSettings(newSettings: Partial<AudioSettings>): void {
    const repairedMaster = this.repairVolume(newSettings.masterVolume ?? this.settings.masterVolume, 0.85);
    const repairedSfx = this.repairVolume(newSettings.sfxVolume ?? this.settings.sfxVolume, 0.75);

    this.settings = {
      ...this.settings,
      ...newSettings,
      masterVolume: repairedMaster,
      sfxVolume: repairedSfx,
    };

    if (newSettings.selectedMelodyId) {
      const found = BUILTIN_MELODIES.find((m) => m.id === newSettings.selectedMelodyId);
      if (found) {
        this.currentMelody = found;
        this.currentNoteIndex = 0;
      }
    }
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
    }
  }

  setCustomMelody(notes: NoteItem[], name: string = 'Custom'): void {
    this.currentMelody = {
      id: 'custom_' + Date.now(),
      name,
      composer: 'User',
      notes,
    };
    this.currentNoteIndex = 0;
  }

  resetMelodyPosition(): void {
    this.currentNoteIndex = 0;
    this.lastHitTime = -1;
    this.lastScheduledAudioTime = -1;
  }

  private bounceCount: number = 0;
  private readonly PENTATONIC_FREQS = [
    130.81, 146.83, 164.81, 196.00, 220.00, // C3, D3, E3, G3, A3
    261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
    523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00 // C6, D6, E6, G6, A6
  ];
  private readonly CHORD_ARP = [1.0, 1.2599, 1.4983, 2.0, 2.5198, 2.9966];

  handleCollision(event: CollisionEvent): void {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx || this.isMuted) return;
    this.resume();

    // Look-ahead scheduler (~25ms): clamp late events to now, never drop
    let t = Math.max(this.ctx.currentTime, (event.time !== undefined && event.time > 0) ? this.ctx.currentTime : this.ctx.currentTime);
    const dest = this.limiter || this.ctx.destination;

    // Hits closer than 30ms handling: layer with micro-offset (4ms) so both play clearly
    if (this.lastScheduledAudioTime > 0 && Math.abs(t - this.lastScheduledAudioTime) < 0.03) {
      t = this.lastScheduledAudioTime + 0.004;
    }
    this.lastScheduledAudioTime = t;
    this.lastHitTime = performance.now();

    // Periodically cleanup expired voice handles
    this.voicePool.cleanupExpired(this.ctx.currentTime);

    // Calculate spatial stereo pan (-1 to 1) based on collision position
    const pan = this.settings.stereoPanning !== false && event.position
      ? Math.max(-0.85, Math.min(0.85, (event.position.x - 540) / 540))
      : 0;

    // Allocate managed voice from pool (never drops hit, steals quietest oldest tail if full)
    const isMelodyNote = !!(event.extra?.marbleMelodyHit && event.extra?.melodyNote);
    const voice = this.voicePool.allocateVoice(this.ctx, isMelodyNote, event.type);
    voice.gainNode.connect(dest);

    // 1. Marble Melody 3D Physical Material Hit - Guaranteed note sync & unique object sound
    if (event.extra?.marbleMelodyHit && event.extra?.melodyNote) {
      this.bounceCount++;
      const baseNoteVol = event.extra.melodyNote.velocity || 0.85;
      // Minimum velocity threshold: soft/glancing hits always make an audible sound
      const vol = Math.max(0.25, baseNoteVol);
      const objType = event.extra.objectType || 'glass_tube';

      MarbleAudioSynthesizer.playTunedHit(
        this.ctx,
        voice.gainNode,
        objType,
        event.extra.melodyNote,
        t,
        vol,
        pan
      );

      // Auto-release voice after note duration
      setTimeout(() => voice.release(), (event.extra.melodyNote.duration || 0.5) * 1000 + 100);
      return;
    }

    this.bounceCount++;

    // 2. Escape or Finale Breakthrough
    if (event.type === 'escape' || event.type === 'finale') {
      SoundSynthesizer.playSfx(this.ctx, voice.gainNode, 'shatter', t, this.settings.sfxVolume);

      const note = this.getNextNote();
      if (note) {
        SoundSynthesizer.playNote(
          this.ctx,
          voice.gainNode,
          note.freq * 2.0,
          t,
          0.85,
          this.settings.instrument,
          0.95,
          pan
        );
      }
      setTimeout(() => voice.release(), 1200);
      return;
    }

    // 3. Other Contact Event Types: portal, spike, freeze, squash, peg_tick
    if (event.type === 'portal' || event.type === 'spike' || event.type === 'freeze' || event.type === 'squash' || event.type === 'peg_tick') {
      const rawNote = this.getNextNote();
      const melodyNote = {
        time: t,
        duration: rawNote?.duration || 0.35,
        midi: rawNote?.midi || 69,
        freq: rawNote?.freq || 440,
        pitchName: 'A4',
        velocity: 0.8,
        lane: 0,
      };
      MarbleAudioSynthesizer.playTunedHit(
        this.ctx,
        voice.gainNode,
        event.type,
        melodyNote,
        t,
        Math.max(0.28, (event.impulse || 50) / 60),
        pan
      );
      setTimeout(() => voice.release(), 600);
      return;
    }

    // 4. Standard sequential melody stepping or pitch modes
    let freq = 440;
    let duration = 0.45;
    const soundMode = this.settings.soundMode || 'melody';

    if (soundMode === 'pentatonic') {
      const speed = Math.hypot(event.velocity?.x || 0, event.velocity?.y || 0);
      const octaveShift = Math.floor(Math.min(speed / 400, 3));
      const scaleIdx = (this.bounceCount + octaveShift * 5) % this.PENTATONIC_FREQS.length;
      freq = this.PENTATONIC_FREQS[scaleIdx];
      duration = 0.35;
    } else if (soundMode === 'chordArp') {
      const baseNote = this.getNextNote() || { freq: 261.63 };
      const arpMult = this.CHORD_ARP[this.bounceCount % this.CHORD_ARP.length];
      freq = baseNote.freq * arpMult;
      duration = 0.4;
    } else if (soundMode === 'pitchSpeed') {
      const speed = Math.hypot(event.velocity?.x || 0, event.velocity?.y || 0);
      const pitchRatio = Math.max(0.5, Math.min(3.5, speed / 320));
      freq = 261.63 * pitchRatio;
      duration = 0.25;
    } else {
      const note = this.getNextNote();
      if (note) {
        freq = note.freq;
        duration = note.duration || 0.45;
        if (this.settings.pitchByVelocity) {
          const speed = Math.hypot(event.velocity?.x || 0, event.velocity?.y || 0);
          const pitchFactor = Math.min(1.5, Math.max(0.7, speed / 600));
          freq *= pitchFactor;
        }
      }
    }

    // Velocity / impulse volume: soft or glancing hits play with at least min volume 0.25
    let vol = 0.75;
    if (this.settings.volumeByImpulse && event.impulse !== undefined) {
      vol = Math.min(1.0, Math.max(0.25, event.impulse / 350));
    } else {
      vol = Math.max(0.25, vol);
    }

    // Play note through voice manager
    SoundSynthesizer.playNote(
      this.ctx,
      voice.gainNode,
      freq,
      t,
      duration,
      this.settings.instrument,
      vol,
      pan
    );

    // ASMR subtle tactile impact layer
    if (this.settings.asmrLayer !== false) {
      const sfx = event.type === 'ring' ? 'pop' : event.type === 'ball' ? 'crunch' : 'thud';
      SoundSynthesizer.playSfx(this.ctx, voice.gainNode, sfx as SfxType, t, this.settings.sfxVolume * 0.4);
    }

    setTimeout(() => voice.release(), duration * 1000 + 150);
  }

  private getNextNote(): NoteItem | null {
    if (!this.currentMelody.notes.length) return null;
    const note = this.currentMelody.notes[this.currentNoteIndex % this.currentMelody.notes.length];
    this.currentNoteIndex++;
    return note;
  }

  playAuditionNote(instrument?: InstrumentType, freq: number = 440, duration: number = 0.5): void {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const dest = this.masterGain;
    const t = this.ctx.currentTime;
    SoundSynthesizer.playNote(
      this.ctx,
      dest,
      freq,
      t,
      duration,
      instrument || this.settings.instrument,
      0.85,
      0
    );
  }

  playAuditionRiff(instrument?: InstrumentType): void {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const dest = this.masterGain;
    const t = this.ctx.currentTime;
    const inst = instrument || this.settings.instrument;
    const freqs = [261.63, 329.63, 392.00, 523.25];
    freqs.forEach((freq, idx) => {
      SoundSynthesizer.playNote(
        this.ctx!,
        dest,
        freq,
        t + idx * 0.12,
        0.38,
        inst,
        0.8,
        (idx - 1.5) * 0.2
      );
    });
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  getCurrentMelody(): Melody {
    return this.currentMelody;
  }
}
