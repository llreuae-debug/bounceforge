import { InstrumentType, SfxType } from './types';

/**
 * Universal Synthesizer for BounceForge.
 * Runs on both real-time AudioContext and OfflineAudioContext.
 */
export class SoundSynthesizer {
  /**
   * Plays a musical note on the target BaseAudioContext
   */
  static playNote(
    ctx: BaseAudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number = 0.5,
    instrument: InstrumentType = 'grandPiano',
    volume: number = 0.8,
    pan?: number
  ): void {
    if (freq <= 20 || freq > 15000) return;

    // Optional Stereo Panning Node
    let targetNode: AudioNode = destination;
    if (typeof pan === 'number' && typeof (ctx as any).createStereoPanner === 'function') {
      try {
        const panner = (ctx as any).createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), startTime);
        panner.connect(destination);
        targetNode = panner;
      } catch {
        targetNode = destination;
      }
    }

    switch (instrument) {
      case 'grandPiano':
        this.synthPiano(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'musicBox':
        this.synthMusicBox(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'marimba':
        this.synthMarimba(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'square8bit':
        this.synthSquare8Bit(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'chiptunePulse':
        this.synthChiptunePulse(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'softPad':
        this.synthSoftPad(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'pluckHarp':
        this.synthPluckHarp(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'bellGlock':
        this.synthBellGlock(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'kalimba':
        this.synthKalimba(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'synthLead':
        this.synthLead(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'steelDrum':
        this.synthSteelDrum(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'glass':
        this.synthGlass(ctx, targetNode, freq, startTime, duration, volume);
        break;
      // 12 New Ball Sound Variations:
      case 'waterDrop':
        this.synthWaterDrop(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'woodblock':
        this.synthWoodblock(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'sinePop':
        this.synthSinePop(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'subBass808':
        this.synthSubBass808(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'metallicAnvil':
        this.synthMetallicAnvil(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'soapBubble':
        this.synthSoapBubble(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'japaneseKoto':
        this.synthJapaneseKoto(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'vibraphone':
        this.synthVibraphone(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'celesta':
        this.synthCelesta(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'laserBounce':
        this.synthLaserBounce(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'guitarHarmonic':
        this.synthGuitarHarmonic(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'snareRimshot':
        this.synthSnareRimshot(ctx, targetNode, freq, startTime, duration, volume);
        break;
      default:
        this.synthPiano(ctx, targetNode, freq, startTime, duration, volume);
    }
  }

  // 1. Grand Piano
  private static synthPiano(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.001, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, freq * 0.8), t + dur);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.7, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur * 1.4);
    osc2.stop(t + dur * 1.4);
  }

  // 2. Music Box
  private static synthMusicBox(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 1.8, 1.2));

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  // 3. Marimba
  private static synthMarimba(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscHarm = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(freq * 3.8, t);

    gain.gain.setValueAtTime(vol * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(gain);
    oscHarm.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscHarm.start(t);
    osc.stop(t + 0.35);
    oscHarm.stop(t + 0.35);
  }

  // 4. 8-Bit Square
  private static synthSquare8Bit(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol * 0.45, t);
    gain.gain.setValueAtTime(vol * 0.45, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.4));

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + Math.min(dur, 0.4));
  }

  // 5. Chiptune Pulse
  private static synthChiptunePulse(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);

    gain.gain.setValueAtTime(vol * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 6. Soft Pad
  private static synthSoftPad(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.005, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.4, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur * 2, 1.2));

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + Math.max(dur * 2, 1.2));
    osc2.stop(t + Math.max(dur * 2, 1.2));
  }

  // 7. Pluck / Harp
  private static synthPluckHarp(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.4);

    gain.gain.setValueAtTime(vol * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.6);
  }

  // 8. Bell / Glockenspiel
  private static synthBellGlock(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, t); // inharmonic bell partial

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.5);
    osc2.stop(t + 1.5);
  }

  // 9. Kalimba
  private static synthKalimba(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol * 0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // 10. Synth Lead
  private static synthLead(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.004, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur);

    gain.gain.setValueAtTime(vol * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur);
    osc2.stop(t + dur);
  }

  // 11. Steel Drum
  private static synthSteelDrum(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 1.05, t);
    osc1.frequency.exponentialRampToValueAtTime(freq, t + 0.04);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.2, t);

    gain.gain.setValueAtTime(vol * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  // 12. Glass
  private static synthGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3.01, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.4, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  // 13. Water Drop (Satisfying clean droplet)
  private static synthWaterDrop(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.85, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.035);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 0.12);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.75, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 14. Woodblock (Crisp hollow knock)
  private static synthWoodblock(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(8, t);

    gain.gain.setValueAtTime(vol * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // 15. Sine Pop (Round rubber ASMR bounce)
  private static synthSinePop(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2.4, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.04);

    gain.gain.setValueAtTime(vol * 0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // 16. Sub Bass 808 (Punchy viral trap kick)
  private static synthSubBass808(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = Math.min(freq, 160);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.08);

    gain.gain.setValueAtTime(vol * 0.95, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 1.2, 0.7));

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.7);
  }

  // 17. Metallic Anvil (Industrial forge ring)
  private static synthMetallicAnvil(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const partials = [1.0, 2.76, 5.4, 8.1];
    partials.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, t);

      const amp = (vol * 0.5) / (i + 1);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (1.2 / (i * 0.5 + 1)));

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  // 18. Soap Bubble (Delicate tactile pop)
  private static synthSoapBubble(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.04);

    gain.gain.setValueAtTime(vol * 0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // 19. Japanese Koto (Asian traditional zither)
  private static synthJapaneseKoto(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.2, t);
    filter.Q.setValueAtTime(4, t);

    gain.gain.setValueAtTime(vol * 0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.45));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // 20. Vibraphone (Mellow jazzy vibrato)
  private static synthVibraphone(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const tremGain = ctx.createGain();
    const master = ctx.createGain();

    // 5.8Hz Tremolo LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.8, t);
    lfoGain.gain.setValueAtTime(0.2, t);
    lfo.connect(lfoGain);
    lfoGain.connect(tremGain.gain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    tremGain.gain.setValueAtTime(0.8, t);
    master.gain.setValueAtTime(vol * 0.7, t);
    master.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur * 1.5, 1.2));

    osc.connect(tremGain);
    tremGain.connect(master);
    master.connect(dest);

    osc.start(t);
    lfo.start(t);
    osc.stop(t + 1.2);
    lfo.stop(t + 1.2);
  }

  // 21. Celesta (Magical fairy bell piano)
  private static synthCelesta(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 2, t);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 4.02, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.85);
    osc2.stop(t + 0.85);
  }

  // 22. Laser Bounce (Arcade sci-fi chirp)
  private static synthLaserBounce(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 4.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.12);

    gain.gain.setValueAtTime(vol * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // 23. Guitar Harmonic (Acoustic bell chime)
  private static synthGuitarHarmonic(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 2, t);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 4, t);

    gain.gain.setValueAtTime(vol * 0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.7));

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.7);
    osc2.stop(t + 0.7);
  }

  // 24. Snare Rimshot (Acoustic beat crack)
  private static synthSnareRimshot(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 2.8, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(350, t);

    gain.gain.setValueAtTime(vol * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Procedural ASMR Sound Effects
   */
  static playSfx(
    ctx: BaseAudioContext,
    destination: AudioNode,
    sfx: SfxType,
    startTime: number,
    volume: number = 0.7
  ): void {
    switch (sfx) {
      case 'shatter': {
        // High frequency noise burst
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2400, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * 0.8, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start(startTime);
        break;
      }
      case 'crunch': {
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * 0.7, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start(startTime);
        break;
      }
      case 'pop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, startTime);
        osc.frequency.exponentialRampToValueAtTime(90, startTime + 0.03);

        gain.gain.setValueAtTime(volume * 0.9, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        osc.stop(startTime + 0.03);
        break;
      }
      case 'whoosh': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.25);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
        break;
      }
      case 'thud': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, startTime);
        osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.1);

        gain.gain.setValueAtTime(volume * 0.9, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        osc.stop(startTime + 0.12);
        break;
      }
    }
  }
}
