import { TunedObjectType, MelodyNote } from './types';

export class MarbleAudioSynthesizer {
  /**
   * Plays a tuned note hit for any material type on any BaseAudioContext
   */
  static playTunedHit(
    ctx: BaseAudioContext,
    destination: AudioNode,
    type: TunedObjectType,
    note: MelodyNote,
    startTime: number,
    volume: number = 0.85,
    pan: number = 0
  ): void {
    if (note.freq < 20 || note.freq > 18000) return;

    // Stereo Panner
    let targetNode: AudioNode = destination;
    if (typeof (ctx as any).createStereoPanner === 'function') {
      try {
        const panner = (ctx as any).createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), startTime);
        panner.connect(destination);
        targetNode = panner;
      } catch {
        targetNode = destination;
      }
    }

    switch (type) {
      case 'glass_tube':
      case 'crystal_glass':
      case 'glass_bottle':
        this.synthGlass(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'metal_tack':
      case 'wire_rail':
      case 'hand_bell':
      case 'wind_chime':
        this.synthMetalTack(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'rainbow_xylophone':
      case 'marimba_bar':
      case 'wood_block':
        this.synthXylophone(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'drum':
        this.synthDrum(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'dark_tube':
        this.synthResonator(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'kalimba_tine':
      case 'music_box_comb':
        this.synthKalimba(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'steel_pan':
        this.synthSteelPan(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      case 'final_catcher':
        this.synthFinale(ctx, targetNode, note.freq, startTime, volume);
        break;

      default:
        this.synthGlass(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;
    }
  }

  /**
   * Translucent Glass Tube Synthesis (Crystal ring tail with shimmering overtone)
   */
  private static synthGlass(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Inharmonic glass overtone (e.g. 2.75x or 4.07x)
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, t);

    const hitDur = Math.max(dur, 1.4);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + hitDur + 0.05);
    osc2.stop(t + hitDur + 0.05);
  }

  /**
   * Metal Tack Bell Synthesis (Bright, short ping "tink" with modal decay)
   */
  private static synthMetalTack(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    _dur: number,
    vol: number
  ) {
    const freqs = [freq, freq * 2.05, freq * 3.76, freq * 5.42];
    const decays = [0.45, 0.25, 0.15, 0.08];

    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] > 18000) continue;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freqs[i], t);

      const amp = (vol / (i + 1)) * 0.8;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decays[i]);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + decays[i] + 0.02);
    }
  }

  /**
   * Rainbow Xylophone Arc Synthesis (Crisp wooden mallet strike + resonant fundamental)
   */
  private static synthXylophone(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    _dur: number,
    vol: number
  ) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    // Woody harmonic
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 3.0, t);

    const hitDur = 0.55;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(vol * 0.2, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + hitDur + 0.02);
    osc2.stop(t + hitDur + 0.02);
  }

  /**
   * Drum Synthesis (Deep thud, pitch drop sweep + skin noise transient)
   */
  private static synthDrum(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    _dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pitch sweep downwards
    const startFreq = Math.max(140, freq * 1.5);
    const endFreq = Math.max(45, freq * 0.6);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.08);

    const hitDur = 0.4;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + hitDur + 0.02);
  }

  /**
   * Dark Resonator Tube Synthesis (Warm lowpass filtered sub tone)
   */
  private static synthResonator(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    _dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.8, t);

    const hitDur = 0.9;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + hitDur + 0.02);
  }

  /**
   * Kalimba / Music Box Synthesis (Hollow metallic tine pluck)
   */
  private static synthKalimba(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = Math.max(dur, 0.7);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + hitDur + 0.02);
  }

  /**
   * Steel Pan Synthesis
   */
  private static synthSteelPan(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    _dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const oscMod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();

    oscMod.type = 'sine';
    oscMod.frequency.setValueAtTime(freq * 2.0, t);
    modGain.gain.setValueAtTime(freq * 0.8, t);

    oscMod.connect(modGain);
    modGain.connect(osc.frequency);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = 0.85;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscMod.start(t);
    osc.stop(t + hitDur + 0.02);
    oscMod.stop(t + hitDur + 0.02);
  }

  /**
   * Finale Downbeat Triumphant Chord & Sparkle
   */
  private static synthFinale(
    ctx: BaseAudioContext,
    dest: AudioNode,
    baseFreq: number,
    t: number,
    vol: number
  ) {
    // Lush Major Chord Arpeggio (Root, 3rd, 5th, Octave, 10th)
    const chordIntervals = [1.0, 1.2599, 1.4983, 2.0, 2.5198];
    for (let i = 0; i < chordIntervals.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const f = baseFreq * chordIntervals[i];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.03);

      const hitDur = 2.4 - i * 0.2;
      gain.gain.setValueAtTime(0, t + i * 0.03);
      gain.gain.linearRampToValueAtTime(vol * 0.7, t + i * 0.03 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + hitDur);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + hitDur + 0.05);
    }
  }

  /**
   * Renders offline audio buffer for complete Marble Melody run
   */
  static async renderOfflineRunAudio(
    notes: { type: TunedObjectType; note: MelodyNote; time: number; pan?: number }[],
    duration: number,
    volume: number = 0.85
  ): Promise<AudioBuffer> {
    const sampleRate = 48000;
    const totalSamples = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

    // Master Limiter
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-2, 0);
    limiter.knee.setValueAtTime(6, 0);
    limiter.ratio.setValueAtTime(14, 0);
    limiter.attack.setValueAtTime(0.002, 0);
    limiter.release.setValueAtTime(0.2, 0);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(volume, 0);

    limiter.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    for (const item of notes) {
      if (item.time >= duration) continue;
      this.playTunedHit(
        offlineCtx,
        limiter,
        item.type,
        item.note,
        item.time,
        item.note.velocity || 0.85,
        item.pan || 0
      );
    }

    return await offlineCtx.startRendering();
  }
}
