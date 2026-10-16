import { AudioSettings, NoteItem, SfxType } from './types';
import { BUILTIN_MELODIES, Melody } from './melodies';
import { SoundSynthesizer } from './synth';
import { CollisionEvent } from '../engine/types';

export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private reverbGain: GainNode | null = null;
  private isMuted: boolean = false;

  private currentMelody: Melody = BUILTIN_MELODIES[0];
  private currentNoteIndex: number = 0;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    instrument: 'grandPiano',
    sfxVolume: 0.7,
    droneVolume: 0.2,
    reverbAmount: 0.3,
    pitchByVelocity: false,
    volumeByImpulse: true,
    selectedMelodyId: 'fur_elise',
  };

  private isUnlockedState: boolean = false;
  private silentAudioEl: HTMLAudioElement | null = null;
  private activeVoicesCount: number = 0;
  private maxAllowedVoices: number = 96;

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
    }
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  setMaxVoices(max: number): void {
    this.maxAllowedVoices = Math.max(16, max);
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

      // Master Limiter / Compressor
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-3, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);

      // Reverb Send
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(this.settings.reverbAmount, this.ctx.currentTime);

      this.limiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
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
        // Tiny silent wav base64
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
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.settings.masterVolume, this.ctx.currentTime);
    }
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
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
  }

  private bounceCount: number = 0;
  private readonly PENTATONIC_FREQS = [
    130.81, 146.83, 164.81, 196.00, 220.00, // C3, D3, E3, G3, A3
    261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
    523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00 // C6, D6, E6, G6, A6
  ];
  private readonly CHORD_ARP = [1.0, 1.2599, 1.4983, 2.0, 2.5198, 2.9966]; // Root, Major 3rd, 5th, Octave, 10th, 12th

  handleCollision(event: CollisionEvent): void {
    if (!this.ctx || this.isMuted) return;
    if (this.activeVoicesCount >= this.maxAllowedVoices) return;
    this.resume();

    this.activeVoicesCount++;
    setTimeout(() => {
      this.activeVoicesCount = Math.max(0, this.activeVoicesCount - 1);
    }, 450);

    const t = this.ctx.currentTime;
    const dest = this.limiter || this.ctx.destination;
    this.bounceCount++;

    // Calculate spatial stereo pan (-1 to 1) based on collision point
    const pan = this.settings.stereoPanning !== false && event.position
      ? Math.max(-0.85, Math.min(0.85, (event.position.x - 540) / 540))
      : 0;

    if (event.type === 'escape') {
      // Escape: play glass shatter and triumphant high chord note
      SoundSynthesizer.playSfx(this.ctx, dest, 'shatter', t, this.settings.sfxVolume);

      // Advance melody note with octave boost
      const note = this.getNextNote();
      if (note) {
        SoundSynthesizer.playNote(
          this.ctx,
          dest,
          note.freq * 2.0,
          t,
          0.85,
          this.settings.instrument,
          0.95,
          pan
        );
      }
      return;
    }

    // Determine pitch based on active BallSoundMode
    let freq = 440;
    let duration = 0.45;
    const soundMode = this.settings.soundMode || 'melody';

    if (soundMode === 'pentatonic') {
      // Harmonically locked pentatonic note based on velocity & bounce count
      const speed = Math.hypot(event.velocity.x, event.velocity.y);
      const octaveShift = Math.floor(Math.min(speed / 400, 3));
      const scaleIdx = (this.bounceCount + octaveShift * 5) % this.PENTATONIC_FREQS.length;
      freq = this.PENTATONIC_FREQS[scaleIdx];
      duration = 0.35;
    } else if (soundMode === 'chordArp') {
      // Arpeggiate harmonic chord intervals on consecutive bounces
      const baseNote = this.getNextNote() || { freq: 261.63 };
      const arpMult = this.CHORD_ARP[this.bounceCount % this.CHORD_ARP.length];
      freq = baseNote.freq * arpMult;
      duration = 0.4;
    } else if (soundMode === 'pitchSpeed') {
      // Viral pitch-speed ramp mode
      const speed = Math.hypot(event.velocity.x, event.velocity.y);
      const pitchRatio = Math.max(0.5, Math.min(3.5, speed / 320));
      freq = 261.63 * pitchRatio;
      duration = 0.25;
    } else {
      // Standard sequential melody stepping
      const note = this.getNextNote();
      if (note) {
        freq = note.freq;
        duration = note.duration || 0.45;
        if (this.settings.pitchByVelocity) {
          const speed = Math.hypot(event.velocity.x, event.velocity.y);
          const pitchFactor = Math.min(1.5, Math.max(0.7, speed / 600));
          freq *= pitchFactor;
        }
      }
    }

    // Dynamic velocity volume
    let vol = 0.75;
    if (this.settings.volumeByImpulse) {
      vol = Math.min(1.0, Math.max(0.3, event.impulse / 400));
    }

    // Play synthesized instrument note with spatial panning
    SoundSynthesizer.playNote(
      this.ctx,
      dest,
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
      SoundSynthesizer.playSfx(this.ctx, dest, sfx as SfxType, t, this.settings.sfxVolume * 0.4);
    }
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
    const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 major arpeggio
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
