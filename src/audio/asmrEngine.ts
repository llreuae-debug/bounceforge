export type MaterialPresetId = 'neon' | 'chrome' | 'gold' | 'glass' | 'jelly' | 'holo' | 'wood' | 'rubber' | 'clay' | 'ice' | 'lava';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type AsmrTextureType =
  | 'sandPour'
  | 'kineticCut'
  | 'bubbleWrap'
  | 'soapPop'
  | 'marbleRoll'
  | 'softRain'
  | 'vinylCrackle';

export interface AsmrMixSettings {
  masterVolume: number;
  musicVolume: number;
  impactVolume: number;
  destructionVolume: number;
  textureVolume: number;
  backingVolume: number;
  binauralAsmr: boolean;
  asmrMode: boolean; // boosts close-up detail with gentle high-shelf
}

export class AsmrEngine {
  private static instance: AsmrEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private activeVoices: number = 0;
  private maxVoices: number = 64;

  public settings: AsmrMixSettings = {
    masterVolume: 0.85,
    musicVolume: 0.75,
    impactVolume: 0.9,
    destructionVolume: 0.85,
    textureVolume: 0.7,
    backingVolume: 0.5,
    binauralAsmr: true,
    asmrMode: false,
  };

  private constructor() {}

  static getInstance(): AsmrEngine {
    if (!AsmrEngine.instance) {
      AsmrEngine.instance = new AsmrEngine();
    }
    return AsmrEngine.instance;
  }

  init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Compressor & Soft Limiter at -1 dB
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-1, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(16, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

      // ASMR Mode High Shelf Filter (+3 dB above 6 kHz for whisper/crispness)
      this.highShelf = this.ctx.createBiquadFilter();
      this.highShelf.type = 'highshelf';
      this.highShelf.frequency.setValueAtTime(6000, this.ctx.currentTime);
      this.highShelf.gain.setValueAtTime(this.settings.asmrMode ? 4 : 0, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);

      this.compressor.connect(this.highShelf);
      this.highShelf.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AsmrEngine init warning:', e);
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.settings.masterVolume, this.ctx.currentTime);
    }
  }

  setAsmrMode(enabled: boolean): void {
    this.settings.asmrMode = enabled;
    if (this.highShelf && this.ctx) {
      this.highShelf.gain.setValueAtTime(enabled ? 4.5 : 0, this.ctx.currentTime);
    }
    if (enabled) {
      this.settings.musicVolume = 0.45;
      this.settings.impactVolume = 1.0;
      this.settings.textureVolume = 0.95;
    }
  }

  /**
   * Creates a 3D Spatial HRTF PannerNode pointing to world coordinate
   */
  private createPanner(pos?: Vector3D): PannerNode | null {
    if (!this.ctx) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.5;
    panner.maxDistance = 25;
    panner.rolloffFactor = 1.2;

    if (pos) {
      const spread = this.settings.binauralAsmr ? 1.4 : 1.0;
      panner.positionX.setValueAtTime(pos.x * spread, this.ctx.currentTime);
      panner.positionY.setValueAtTime(pos.y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(pos.z, this.ctx.currentTime);
    }
    return panner;
  }

  /**
   * Material-Specific Impact ASMR
   */
  playMaterialImpact(material: MaterialPresetId, pos?: Vector3D, impulse: number = 1.0): void {
    if (!this.ctx || this.activeVoices >= this.maxVoices) return;
    this.resume();
    const t = this.ctx.currentTime;
    const panner = this.createPanner(pos);
    const dest = panner || this.compressor!;
    if (panner && this.compressor) panner.connect(this.compressor);

    const vol = this.settings.impactVolume * Math.min(1.0, Math.max(0.3, impulse / 50));

    switch (material) {
      case 'glass': {
        // High crystalline ping with shimmering harmonic decay
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2480, t);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(4960, t);

        gain.gain.setValueAtTime(vol * 0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(dest);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.9);
        osc2.stop(t + 0.9);
        break;
      }
      case 'chrome':
      case 'gold': {
        // Metallic clink modal synthesis
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(1420, t);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3280, t);

        gain.gain.setValueAtTime(vol * 0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(dest);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.6);
        osc2.stop(t + 0.6);
        break;
      }
      case 'jelly': {
        // Soft squish and bloop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

        gain.gain.setValueAtTime(vol * 0.85, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case 'clay':
      case 'ice': {
        // Crunchy granular crumble
        this.playGranularCrumble(t, dest, vol);
        break;
      }
      case 'neon':
      case 'holo':
      case 'lava':
      default: {
        // Electric zap with sub thump
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

        gain.gain.setValueAtTime(vol * 0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(t);
        osc.stop(t + 0.14);
        break;
      }
    }
  }

  private playGranularCrumble(t: number, dest: AudioNode, vol: number): void {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start(t);
  }

  /**
   * Procedural ASMR Texture Layer
   */
  playTexture(type: AsmrTextureType): void {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dest = this.compressor!;

    switch (type) {
      case 'sandPour':
      case 'kineticCut':
        this.playGranularCrumble(t, dest, this.settings.textureVolume);
        break;
      case 'bubbleWrap':
      case 'soapPop': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(920, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.03);
        gain.gain.setValueAtTime(this.settings.textureVolume * 0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.035);
        break;
      }
      case 'vinylCrackle': {
        const len = this.ctx.sampleRate * 0.2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = Math.random() < 0.008 ? Math.random() * 2 - 1 : 0;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(dest);
        src.start(t);
        break;
      }
    }
  }
}
