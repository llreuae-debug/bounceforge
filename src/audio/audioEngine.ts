import { AudioSettings, NoteItem, SfxType, InstrumentType } from './types';
import { BUILTIN_MELODIES, Melody, findMelodyById } from './melodies';
import { SoundSynthesizer } from './synth';
import { CollisionEvent } from '../engine/types';
import { MarbleAudioSynthesizer } from '../marble3d/audioSynthesizer';
import { HitLimiter } from './hitLimiter';
import { SoundfontSampleManager } from './soundfont';

interface ActiveVoice {
  id: number;
  pitchKey?: number;
  gainNode: GainNode;
  stopNodes: (AudioNode & { stop?: (t: number) => void })[];
  startTime: number;
  isMelody: boolean;
  type: string;
}

class VoicePoolManager {
  private activeVoices: ActiveVoice[] = [];
  private pitchVoices = new Map<number, ActiveVoice>();
  private nextVoiceId = 1;
  // FIX 1: Max polyphony 16 voices
  private maxAllowedVoices = 16;

  setMaxVoices(max: number): void {
    this.maxAllowedVoices = Math.max(4, Math.min(16, max));
  }

  getActiveCount(): number {
    return this.activeVoices.length;
  }

  allocateVoice(
    ctx: BaseAudioContext,
    isMelody: boolean,
    type: string = 'note',
    freq?: number
  ): {
    gainNode: GainNode;
    registerStop: (node: AudioNode & { stop?: (t: number) => void }) => void;
    release: () => void;
  } {
    const now = ctx.currentTime;
    const pitchKey = freq ? Math.round(freq) : undefined;

    // FIX 1: Re-triggering the same pitch must first stop the previous voice of that pitch
    // with a quick 10ms fade-out, then start the new one.
    if (pitchKey !== undefined && this.pitchVoices.has(pitchKey)) {
      const prev = this.pitchVoices.get(pitchKey)!;
      this.stopVoiceWithFade(ctx, prev, 0.010);
      this.removeVoice(prev.id);
    }

    // FIX 1: Max polyphony 16 voices. Steal oldest voice with a 10ms fade-out.
    if (this.activeVoices.length >= this.maxAllowedVoices) {
      this.stealOldestVoice(ctx);
    }

    const voiceGain = ctx.createGain();
    const voiceId = this.nextVoiceId++;
    const stopNodes: (AudioNode & { stop?: (t: number) => void })[] = [];

    const voiceItem: ActiveVoice = {
      id: voiceId,
      pitchKey,
      gainNode: voiceGain,
      stopNodes,
      startTime: now,
      isMelody,
      type,
    };
    this.activeVoices.push(voiceItem);
    if (pitchKey !== undefined) {
      this.pitchVoices.set(pitchKey, voiceItem);
    }

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.removeVoice(voiceId);
      try {
        voiceGain.disconnect();
      } catch {}
    };

    const registerStop = (node: AudioNode & { stop?: (t: number) => void }) => {
      stopNodes.push(node);
    };

    return { gainNode: voiceGain, registerStop, release };
  }

  private stopVoiceWithFade(ctx: BaseAudioContext, voice: ActiveVoice, fadeTimeSec: number = 0.010): void {
    try {
      const now = ctx.currentTime;
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), now);
      voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTimeSec);

      voice.stopNodes.forEach((node) => {
        try {
          if (typeof node.stop === 'function') {
            node.stop(now + fadeTimeSec + 0.002);
          }
          if ('onended' in node) {
            (node as any).onended = () => {
              try { node.disconnect(); voice.gainNode.disconnect(); } catch {}
            };
          }
        } catch {}
      });
    } catch {}
  }

  private stealOldestVoice(ctx: BaseAudioContext): void {
    if (this.activeVoices.length === 0) return;

    // Prefer non-melody candidate voices first
    let candidates = this.activeVoices.filter((v) => !v.isMelody);
    if (candidates.length === 0) {
      candidates = this.activeVoices;
    }

    candidates.sort((a, b) => a.startTime - b.startTime);
    const target = candidates[0];
    if (!target) return;

    this.stopVoiceWithFade(ctx, target, 0.010);
    this.removeVoice(target.id);
  }

  private removeVoice(id: number): void {
    const idx = this.activeVoices.findIndex((v) => v.id === id);
    if (idx !== -1) {
      const voice = this.activeVoices[idx];
      if (voice.pitchKey !== undefined && this.pitchVoices.get(voice.pitchKey)?.id === id) {
        this.pitchVoices.delete(voice.pitchKey);
      }
      this.activeVoices.splice(idx, 1);
    }
  }

  hardStopAll(ctx: BaseAudioContext | null): void {
    const now = ctx ? ctx.currentTime : 0;
    for (const voice of this.activeVoices) {
      try {
        if (ctx) {
          voice.gainNode.gain.cancelScheduledValues(now);
          voice.gainNode.gain.setValueAtTime(0.0001, now);
        }
        for (const node of voice.stopNodes) {
          try {
            if (typeof node.stop === 'function') {
              node.stop(now);
            }
            node.disconnect();
          } catch {}
        }
        voice.gainNode.disconnect();
      } catch {}
    }
    this.activeVoices = [];
    this.pitchVoices.clear();
  }

  cleanupExpired(currentTime: number): void {
    // Release any voice running for longer than 1.4s
    for (let i = this.activeVoices.length - 1; i >= 0; i--) {
      const v = this.activeVoices[i];
      if (currentTime - v.startTime > 1.4) {
        this.removeVoice(v.id);
        try {
          v.gainNode.disconnect();
        } catch {}
      }
    }
  }
}

export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;

  // Master Clarity Chain (FIX 4)
  private voicesBus: GainNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private mudCutFilter: BiquadFilterNode | null = null;
  private presenceBoostFilter: BiquadFilterNode | null = null;
  private airShelfFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  // Reverb Send / Return Bus (FIX 3)
  private reverbSendGain: GainNode | null = null;
  private reverbPreDelay: DelayNode | null = null;
  private reverbLowCut: BiquadFilterNode | null = null;
  private reverbHighCut: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbReturnGain: GainNode | null = null;

  // Echo / Delay Bus (FIX 3)
  private delaySendGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayReturnGain: GainNode | null = null;

  private isMuted: boolean = false;

  private voicePool = new VoicePoolManager();
  private lastHitTime: number = -1;
  private lastScheduledAudioTime: number = -1;
  private hitLimiter = new HitLimiter();

  private currentMelody: Melody = BUILTIN_MELODIES[0];
  private currentNoteIndex: number = 0;
  private bounceCount: number = 0;

  // Default audio settings: Reverb OFF, Drone OFF, Echo OFF
  private settings: AudioSettings = {
    masterVolume: 0.85,
    instrument: 'grandPiano',
    sfxVolume: 0.75,
    droneVolume: 0,
    reverbAmount: 0,
    reverbEnabled: false,
    delayAmount: 0,
    delayEnabled: false,
    sustainPedal: false,
    pitchByVelocity: false,
    volumeByImpulse: true,
    selectedMelodyId: 'fur_elise',
    asmrLayer: false,
    stereoPanning: true,
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
      this.ctx = new AudioCtx({ sampleRate: 48000 });

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

      const t0 = this.ctx.currentTime;

      // 1. Voices Summing Bus
      this.voicesBus = this.ctx.createGain();
      this.voicesBus.gain.setValueAtTime(1.0, t0);

      // =========================================================================
      // CLARITY MASTER CHAIN (FIX 4: voices → EQ → compressor → limiter → output)
      // =========================================================================

      // A. High-pass at 80 Hz (eliminates sub-mud)
      this.highPassFilter = this.ctx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.setValueAtTime(80, t0);
      this.highPassFilter.Q.setValueAtTime(0.707, t0);

      // B. Cut -3 dB at 320 Hz (Q 1.0) to remove mud / echo / "goonj"
      this.mudCutFilter = this.ctx.createBiquadFilter();
      this.mudCutFilter.type = 'peaking';
      this.mudCutFilter.frequency.setValueAtTime(320, t0);
      this.mudCutFilter.Q.setValueAtTime(1.0, t0);
      this.mudCutFilter.gain.setValueAtTime(-3.0, t0);

      // C. Boost +2 dB presence at 3 kHz
      this.presenceBoostFilter = this.ctx.createBiquadFilter();
      this.presenceBoostFilter.type = 'peaking';
      this.presenceBoostFilter.frequency.setValueAtTime(3000, t0);
      this.presenceBoostFilter.Q.setValueAtTime(1.0, t0);
      this.presenceBoostFilter.gain.setValueAtTime(2.0, t0);

      // D. Boost +2 dB air shelf at 10 kHz
      this.airShelfFilter = this.ctx.createBiquadFilter();
      this.airShelfFilter.type = 'highshelf';
      this.airShelfFilter.frequency.setValueAtTime(10000, t0);
      this.airShelfFilter.gain.setValueAtTime(2.0, t0);

      // E. Gentle compressor: threshold -18 dB, ratio 3:1, attack 10ms, release 120ms
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, t0);
      this.compressor.ratio.setValueAtTime(3, t0);
      this.compressor.attack.setValueAtTime(0.010, t0);
      this.compressor.release.setValueAtTime(0.120, t0);
      this.compressor.knee.setValueAtTime(4, t0);

      // F. Limiter ceiling -1.0 dBTP
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-1.0, t0);
      this.limiter.ratio.setValueAtTime(20, t0);
      this.limiter.attack.setValueAtTime(0.001, t0);
      this.limiter.release.setValueAtTime(0.050, t0);
      this.limiter.knee.setValueAtTime(0, t0);

      // G. Master Gain
      this.masterGain = this.ctx.createGain();
      const safeVol = this.repairVolume(this.settings.masterVolume, 0.85);
      this.masterGain.gain.setValueAtTime(safeVol, t0);

      // Connect Clarity Master Chain
      this.voicesBus.connect(this.highPassFilter);
      this.highPassFilter.connect(this.mudCutFilter);
      this.mudCutFilter.connect(this.presenceBoostFilter);
      this.presenceBoostFilter.connect(this.airShelfFilter);
      this.airShelfFilter.connect(this.compressor);
      this.compressor.connect(this.limiter);
      this.limiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // =========================================================================
      // REVERB SEND/RETURN BUS (FIX 3: OFF by default, send/return only, wet max 15%)
      // =========================================================================
      this.reverbSendGain = this.ctx.createGain();
      this.reverbSendGain.gain.setValueAtTime(1.0, t0);

      this.reverbPreDelay = this.ctx.createDelay();
      this.reverbPreDelay.delayTime.setValueAtTime(0.020, t0); // 20ms pre-delay

      this.reverbLowCut = this.ctx.createBiquadFilter();
      this.reverbLowCut.type = 'highpass';
      this.reverbLowCut.frequency.setValueAtTime(300, t0); // low-cut at 300 Hz

      this.reverbHighCut = this.ctx.createBiquadFilter();
      this.reverbHighCut.type = 'lowpass';
      this.reverbHighCut.frequency.setValueAtTime(6000, t0); // high-cut at 6 kHz

      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.buffer = this.createReverbImpulseResponse(this.ctx, 1.0); // 1.0s decay

      this.reverbReturnGain = this.ctx.createGain();
      // OFF by default (0)
      this.reverbReturnGain.gain.setValueAtTime(0, t0);

      // Wire Reverb Send/Return:
      // voicesBus -> reverbSendGain -> preDelay -> lowCut -> highCut -> convolver -> reverbReturnGain -> masterEQ
      this.voicesBus.connect(this.reverbSendGain);
      this.reverbSendGain.connect(this.reverbPreDelay);
      this.reverbPreDelay.connect(this.reverbLowCut);
      this.reverbLowCut.connect(this.reverbHighCut);
      this.reverbHighCut.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.reverbReturnGain);
      this.reverbReturnGain.connect(this.highPassFilter);

      // =========================================================================
      // DELAY / ECHO BUS (FIX 3: OFF by default, max 25% feedback)
      // =========================================================================
      this.delaySendGain = this.ctx.createGain();
      this.delaySendGain.gain.setValueAtTime(1.0, t0);

      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.setValueAtTime(0.25, t0);

      this.delayFeedbackGain = this.ctx.createGain();
      this.delayFeedbackGain.gain.setValueAtTime(0.20, t0); // <= 25% feedback

      this.delayReturnGain = this.ctx.createGain();
      this.delayReturnGain.gain.setValueAtTime(0, t0); // OFF by default

      this.voicesBus.connect(this.delaySendGain);
      this.delaySendGain.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedbackGain);
      this.delayFeedbackGain.connect(this.delayNode);
      this.delayNode.connect(this.delayReturnGain);
      this.delayReturnGain.connect(this.highPassFilter);

      // Preload acoustic multisamples
      SoundfontSampleManager.warmUp(this.ctx);
      MarbleAudioSynthesizer.preloadAllSounds(this.ctx);
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  /**
   * Generates a pristine decorrelated stereo impulse response for clean reverb space
   */
  private createReverbImpulseResponse(ctx: BaseAudioContext, decaySec: number): AudioBuffer {
    const rate = ctx.sampleRate || 48000;
    const length = Math.floor(rate * decaySec);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const env = Math.exp(-3.5 * t);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  private repairVolume(vol: number | undefined, defaultVal: number): number {
    if (vol === undefined || vol === null || isNaN(vol) || vol <= 0.001) {
      return defaultVal;
    }
    return Math.max(0.25, Math.min(1.0, vol));
  }

  preload(): void {
    if (!this.ctx) this.init();
    if (this.ctx) {
      SoundfontSampleManager.warmUp(this.ctx);
      MarbleAudioSynthesizer.preloadAllSounds(this.ctx);
    }
  }

  resume(): void {
    if (!this.ctx) {
      this.init();
    }
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
    const melodyChanged =
      !!newSettings.selectedMelodyId && newSettings.selectedMelodyId !== this.settings.selectedMelodyId;
    const repairedMaster = this.repairVolume(newSettings.masterVolume ?? this.settings.masterVolume, 0.85);
    const repairedSfx = this.repairVolume(newSettings.sfxVolume ?? this.settings.sfxVolume, 0.75);

    this.settings = {
      ...this.settings,
      ...newSettings,
      masterVolume: repairedMaster,
      sfxVolume: repairedSfx,
    };

    if (melodyChanged) {
      const found = findMelodyById(newSettings.selectedMelodyId);
      if (found) {
        this.currentMelody = found;
        this.currentNoteIndex = 0;
      }
    }

    if (this.ctx) {
      const t = this.ctx.currentTime;
      if (this.masterGain && !this.isMuted) {
        this.masterGain.gain.setValueAtTime(this.settings.masterVolume, t);
      }

      // Reverb return control: wet max 15% (0.15)
      if (this.reverbReturnGain) {
        const reverbOn = (this.settings.reverbEnabled || (this.settings.reverbAmount ?? 0) > 0.05);
        const wet = reverbOn ? Math.min(0.15, (this.settings.reverbAmount ?? 0.1) * 0.15) : 0;
        this.reverbReturnGain.gain.setValueAtTime(wet, t);
      }

      // Delay return control: max 12% wet, max 25% feedback
      if (this.delayReturnGain) {
        const delayOn = (this.settings.delayEnabled || (this.settings.delayAmount ?? 0) > 0.05);
        const wet = delayOn ? Math.min(0.12, (this.settings.delayAmount ?? 0.1) * 0.12) : 0;
        this.delayReturnGain.gain.setValueAtTime(wet, t);
      }
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
    this.hitLimiter.reset();
    this.currentNoteIndex = 0;
    this.lastHitTime = -1;
    this.lastScheduledAudioTime = -1;
  }

  /**
   * FIX 1: Hard-stop ALL voices and reset reverb/delay tails.
   * Called on Stop, Seek, Regenerate, or Export start.
   */
  hardStopAllVoices(): void {
    this.voicePool.hardStopAll(this.ctx);
    if (this.ctx && this.reverbReturnGain && this.delayReturnGain) {
      try {
        const t = this.ctx.currentTime;
        // Momentary mute to flush residual reverberation tails
        const currentRev = this.reverbReturnGain.gain.value;
        const currentDel = this.delayReturnGain.gain.value;
        this.reverbReturnGain.gain.setValueAtTime(0, t);
        this.delayReturnGain.gain.setValueAtTime(0, t);
        this.reverbReturnGain.gain.setValueAtTime(currentRev, t + 0.05);
        this.delayReturnGain.gain.setValueAtTime(currentDel, t + 0.05);
      } catch {}
    }
  }

  private readonly PENTATONIC_FREQS = [
    130.81, 146.83, 164.81, 196.00, 220.00,
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00
  ];
  private readonly CHORD_ARP = [1.0, 1.2599, 1.4983, 2.0, 2.5198, 2.9966];

  handleCollision(event: CollisionEvent): void {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx || this.isMuted) return;
    this.resume();

    // Constant contact limiter
    if (!this.hitLimiter.allow(event)) return;

    const nowTime = this.ctx.currentTime;
    let t = nowTime;
    if (this.lastScheduledAudioTime > 0) {
      t = Math.min(Math.max(nowTime, this.lastScheduledAudioTime + 0.004), nowTime + 0.03);
    }
    this.lastScheduledAudioTime = t;
    this.lastHitTime = performance.now();

    this.voicePool.cleanupExpired(this.ctx.currentTime);

    // FIX 5: Pan between -0.6 (left) and +0.6 (right) based on ball's X position on screen
    const rawPan = event.position ? ((event.position.x - 540) / 540) * 0.6 : 0;
    const pan = this.settings.stereoPanning !== false ? Math.max(-0.6, Math.min(0.6, rawPan)) : 0;

    const dest = this.voicesBus || this.ctx.destination;

    // 1. Marble Melody 3D Physical Material Hit
    if (event.extra?.marbleMelodyHit && event.extra?.melodyNote) {
      this.bounceCount++;
      const noteFreq = event.extra.melodyNote.freq;
      const voice = this.voicePool.allocateVoice(this.ctx, true, event.type, noteFreq);
      voice.gainNode.connect(dest);

      const baseNoteVol = event.extra.melodyNote.velocity || 0.85;
      const vol = Math.max(0.42, Math.min(1.0, baseNoteVol));
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

      const dur = event.extra.melodyNote.duration || 0.45;
      setTimeout(() => voice.release(), (dur + 0.3) * 1000);
      return;
    }

    this.bounceCount++;

    // 2. Escape or Finale Breakthrough
    if (event.type === 'escape' || event.type === 'finale') {
      const note = this.getNextNote();
      const noteFreq = note ? note.freq * 2.0 : 880;
      const voice = this.voicePool.allocateVoice(this.ctx, true, event.type, noteFreq);
      voice.gainNode.connect(dest);

      SoundSynthesizer.playNote(
        this.ctx,
        voice.gainNode,
        noteFreq,
        t,
        0.55,
        this.settings.instrument,
        0.95,
        pan
      );
      setTimeout(() => voice.release(), 700);
      return;
    }

    // 3. Bumper & Spring Peg Hits
    if (event.type === 'bumper') {
      const rawNote = this.getNextNote();
      const freq = rawNote ? rawNote.freq * 1.5 : 523.25;
      const voice = this.voicePool.allocateVoice(this.ctx, true, event.type, freq);
      voice.gainNode.connect(dest);

      SoundSynthesizer.playNote(
        this.ctx,
        voice.gainNode,
        freq,
        t,
        0.32,
        'bellGlock',
        0.90,
        pan
      );
      setTimeout(() => voice.release(), 450);
      return;
    }

    // 4. Other Contact Event Types: portal, spike, freeze, squash, peg_tick
    if (event.type === 'portal' || event.type === 'spike' || event.type === 'freeze' || event.type === 'squash' || event.type === 'peg_tick') {
      const rawNote = this.getNextNote();
      const freq = rawNote?.freq || 440;
      const voice = this.voicePool.allocateVoice(this.ctx, true, event.type, freq);
      voice.gainNode.connect(dest);

      const melodyNote = {
        time: t,
        duration: rawNote?.duration || 0.35,
        midi: rawNote?.midi || 69,
        freq,
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
        Math.max(0.42, (event.impulse || 50) / 60),
        pan
      );
      setTimeout(() => voice.release(), 500);
      return;
    }

    // 5. Standard sequential melody stepping or pitch modes
    let freq = 440;
    let duration = 0.45;
    const soundMode = this.settings.soundMode || 'melody';

    if (soundMode === 'pentatonic') {
      const speed = Math.hypot(event.velocity?.x || 0, event.velocity?.y || 0);
      const octaveShift = Math.floor(Math.min(speed / 400, 3));
      const scaleIdx = (this.bounceCount + octaveShift * 5) % this.PENTATONIC_FREQS.length;
      freq = this.PENTATONIC_FREQS[scaleIdx];
      duration = 0.32;
    } else if (soundMode === 'chordArp') {
      const baseNote = this.getNextNote() || { freq: 261.63 };
      const arpMult = this.CHORD_ARP[this.bounceCount % this.CHORD_ARP.length];
      freq = baseNote.freq * arpMult;
      duration = 0.35;
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

    let vol = 0.75;
    if (this.settings.volumeByImpulse && event.impulse !== undefined) {
      vol = Math.min(1.0, Math.max(0.45, event.impulse / 300));
    } else {
      vol = Math.max(0.45, vol);
    }

    // Allocate voice with pitch tracking (FIX 1: prevents note stacking)
    const voice = this.voicePool.allocateVoice(this.ctx, true, event.type, freq);
    voice.gainNode.connect(dest);

    // FIX 1: Each impact triggers the sound exactly once!
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

    setTimeout(() => voice.release(), (duration + 0.35) * 1000);
  }

  private getNextNote(): NoteItem | null {
    if (!this.currentMelody.notes.length) return null;
    const note = this.currentMelody.notes[this.currentNoteIndex % this.currentMelody.notes.length];
    this.currentNoteIndex++;
    return note;
  }

  playAuditionNote(instrument?: InstrumentType, freq: number = 440, duration: number = 0.5): void {
    this.resume();
    if (!this.ctx || !this.voicesBus) return;
    const t = this.ctx.currentTime;
    SoundSynthesizer.playNote(
      this.ctx,
      this.voicesBus,
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
    if (!this.ctx || !this.voicesBus) return;
    const t = this.ctx.currentTime;
    const inst = instrument || this.settings.instrument;
    const freqs = [261.63, 329.63, 392.00, 523.25];
    freqs.forEach((freq, idx) => {
      SoundSynthesizer.playNote(
        this.ctx!,
        this.voicesBus!,
        freq,
        t + idx * 0.12,
        0.32,
        inst,
        0.8,
        (idx - 1.5) * 0.15
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
