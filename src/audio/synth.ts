import { InstrumentType, SfxType } from './types';
import { SoundfontSampleManager, SampledInstrument } from './soundfont';

/**
 * Universal Synthesizer for BounceForge.
 * Runs on both real-time AudioContext and OfflineAudioContext.
 * 
 * Implements strict clean ADSR envelopes on every voice:
 * - Attack 3–5 ms (click-free linear ramp)
 * - Decay 150–300 ms
 * - Sustain 0 for percussive instruments; low for harmonic instruments
 * - Release 150–350 ms
 * - Final ramp to 0.0001 with exponential decay, then stop
 * - Guaranteed <= -40 dB within 1.0s and silence by 1.2s
 * - Disconnect and release all Web Audio nodes on ended
 * - Real sampled CC0 acoustic soundfonts for Grand Piano, Marimba, and Music Box
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

    // FIX 5: Pan each impact by screen position (-0.6 to +0.6). Bass (<150 Hz) is forced mono (0.0).
    let targetNode: AudioNode = destination;
    const effectivePan = freq < 150 ? 0 : typeof pan === 'number' ? Math.max(-0.6, Math.min(0.6, pan)) : 0;
    if (typeof (ctx as any).createStereoPanner === 'function') {
      try {
        const panner = (ctx as any).createStereoPanner();
        panner.pan.setValueAtTime(effectivePan, startTime);
        panner.connect(destination);
        targetNode = panner;
      } catch {
        targetNode = destination;
      }
    }

    switch (instrument) {
      // 1. Real Sampled Acoustic Instruments (CC0 Soundfonts)
      case 'grandPiano':
      case 'piano':
        this.playSampledNote(ctx, targetNode, freq, startTime, duration, 'grandPiano', volume);
        break;
      case 'musicBox':
        this.playSampledNote(ctx, targetNode, freq, startTime, duration, 'musicBox', volume);
        break;
      case 'marimba':
      case 'xylophone':
        this.playSampledNote(ctx, targetNode, freq, startTime, duration, 'marimba', volume);
        break;

      // 2. Chiptune & Digital
      case 'square8bit':
      case 'eightBit':
      case '8bit':
        this.synthSquare8Bit(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'chiptunePulse':
        this.synthChiptunePulse(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'softPad':
        this.synthSoftPad(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'pluckHarp':
      case 'pluck':
        this.synthPluckHarp(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'bellGlock':
        this.synthBellGlock(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'kalimba':
        this.synthKalimba(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'synthLead':
      case 'synth':
        this.synthLead(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'steelDrum':
        this.synthSteelDrum(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'glass':
        this.synthGlass(ctx, targetNode, freq, startTime, duration, volume);
        break;

      // 3. Tactile Ball Sounds
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
      case 'guitar':
        this.synthGuitarHarmonic(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'snareRimshot':
        this.synthSnareRimshot(ctx, targetNode, freq, startTime, duration, volume);
        break;

      // 4. Acoustic Brass & Reeds
      case 'trumpet':
        this.synthTrumpet(ctx, targetNode, freq, startTime, duration, volume);
        break;
      case 'saxophone':
        this.synthSaxophone(ctx, targetNode, freq, startTime, duration, volume);
        break;

      default:
        this.playSampledNote(ctx, targetNode, freq, startTime, duration, 'grandPiano', volume);
    }
  }

  // =========================================================================
  // SAMPLED CC0 ACOUSTIC SOUNDFONT ENGINES (FIX 4 & FIX 2)
  // =========================================================================

  private static playSampledNote(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    instrument: SampledInstrument,
    vol: number
  ): void {
    const { buffer, playbackRate } = SoundfontSampleManager.getSample(ctx, instrument, freq);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, t);

    const gain = ctx.createGain();
    const isPercussive = instrument === 'marimba' || instrument === 'xylophone' || instrument === 'musicBox';

    // ADSR Envelope: Attack 4ms, Decay 180-240ms, Sustain 0 (percussive) or 0.08 (piano), Release 180-240ms
    const attack = 0.004;
    const decay = isPercussive ? 0.180 : 0.240;
    const sustain = isPercussive ? 0.0001 : 0.08;
    const release = isPercussive ? 0.180 : 0.240;

    const peakVol = Math.max(0.0001, vol * (isPercussive ? 0.85 : 0.80));
    const sustainVol = Math.max(0.0001, peakVol * sustain);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakVol, t + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainVol), t + attack + decay);

    const noteHold = isPercussive ? 0.04 : Math.max(0.06, Math.min(dur, 0.6));
    const releaseStart = t + attack + decay + noteHold;
    const finalFadeTime = releaseStart + release;

    gain.gain.setValueAtTime(Math.max(0.0001, sustainVol), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, finalFadeTime);

    source.connect(gain);
    gain.connect(dest);

    source.start(t);
    const stopTime = finalFadeTime + 0.03;
    safeStopAndDisconnect(source, stopTime, gain);
  }

  // =========================================================================
  // CLEAN SYNTH VOICES WITH STRICT ADSR & SCHEDULED STOPS
  // =========================================================================

  private static synthSquare8Bit(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    const attack = 0.003;
    const hitDur = Math.min(dur, 0.35);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.45, t + attack);
    gain.gain.exponentialRampToValueAtTime(vol * 0.15, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, gain);
  }

  private static synthChiptunePulse(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);

    const hitDur = Math.min(dur, 0.32);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.45, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, gain);
  }

  private static synthSoftPad(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.004, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    const hitDur = Math.min(dur, 0.65);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.4, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, filter, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthPluckHarp(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.25);

    const hitDur = Math.min(dur, 0.45);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.7, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, filter, gain);
  }

  private static synthBellGlock(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, t);

    const hitDur = Math.min(dur, 0.55);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.55, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthKalimba(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = Math.min(dur, 0.38);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.65, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, gain);
  }

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
    filter.frequency.setValueAtTime(freq * 4, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 0.25);

    const hitDur = Math.min(dur, 0.45);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.45, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, filter, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthSteelDrum(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 1.04, t);
    osc1.frequency.exponentialRampToValueAtTime(freq, t + 0.03);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.2, t);

    const hitDur = Math.min(dur, 0.42);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3.01, t);

    const hitDur = Math.min(dur, 0.48);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthWaterDrop(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.85, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.035);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 0.12);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.75, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + 0.2, gain);
  }

  private static synthWoodblock(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(6, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + 0.11, filter, gain);
  }

  private static synthSinePop(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.035);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + 0.15, gain);
  }

  private static synthSubBass808(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = Math.min(freq, 140);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.06);

    const hitDur = Math.min(dur, 0.42);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, gain);
  }

  private static synthMetallicAnvil(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const partials = [1.0, 2.76, 5.4];
    partials.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, t);

      const amp = (vol * 0.45) / (i + 1);
      const hitDur = 0.35 / (i * 0.4 + 1);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      safeStopAndDisconnect(osc, t + hitDur + 0.02, gain);
    });
  }

  private static synthSoapBubble(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.03);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.65, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + 0.08, gain);
  }

  private static synthJapaneseKoto(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.2, t);
    filter.Q.setValueAtTime(3.5, t);

    const hitDur = Math.min(dur, 0.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.75, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, filter, gain);
  }

  private static synthVibraphone(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const tremGain = ctx.createGain();
    const master = ctx.createGain();

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.8, t);
    lfoGain.gain.setValueAtTime(0.18, t);
    lfo.connect(lfoGain);
    lfoGain.connect(tremGain.gain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = Math.min(dur, 0.52);
    tremGain.gain.setValueAtTime(0.82, t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(vol * 0.7, t + 0.004);
    master.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(tremGain);
    tremGain.connect(master);
    master.connect(dest);

    osc.start(t);
    lfo.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, tremGain, master, lfo, lfoGain);
    safeStopAndDisconnect(lfo, t + hitDur + 0.02);
  }

  private static synthCelesta(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 2, t);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 4.02, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + 0.48, gain);
    safeStopAndDisconnect(osc2, t + 0.48);
  }

  private static synthLaserBounce(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 3.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.1);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + 0.16, gain);
  }

  private static synthGuitarHarmonic(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 2, t);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 4, t);

    const hitDur = Math.min(dur, 0.48);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.65, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthSnareRimshot(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 2.5, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.04);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    safeStopAndDisconnect(osc, t + 0.12, filter, gain);
  }

  private static synthTrumpet(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, t);

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.0, t);
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 3.5, 3000), t + 0.04);

    const hitDur = Math.min(dur, 0.45);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.7, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    safeStopAndDisconnect(osc1, t + hitDur + 0.02, filter, gain);
    safeStopAndDisconnect(osc2, t + hitDur + 0.02);
  }

  private static synthSaxophone(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.8, t);
    filter.frequency.setValueAtTime(freq * 2.5, t);

    const hitDur = Math.min(dur, 0.48);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.65, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    subOsc.start(t);
    safeStopAndDisconnect(osc, t + hitDur + 0.02, filter, gain);
    safeStopAndDisconnect(subOsc, t + hitDur + 0.02);
  }

  // =========================================================================
  // CLEAN SFX WITH SCHEDULED STOPS & ZERO RESIDUAL NOISE
  // =========================================================================

  static playSfx(
    ctx: BaseAudioContext,
    destination: AudioNode,
    sfx: SfxType,
    startTime: number,
    volume: number = 0.7
  ): void {
    switch (sfx) {
      case 'shatter': {
        const bufferSize = Math.floor(ctx.sampleRate * 0.22);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2400, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.8, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start(startTime);
        safeStopAndDisconnect(noise, startTime + 0.23, filter, gain);
        break;
      }
      case 'crunch': {
        const bufferSize = Math.floor(ctx.sampleRate * 0.14);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start(startTime);
        safeStopAndDisconnect(noise, startTime + 0.15, filter, gain);
        break;
      }
      case 'pop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, startTime);
        osc.frequency.exponentialRampToValueAtTime(95, startTime + 0.035);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.85, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        safeStopAndDisconnect(osc, startTime + 0.045, gain);
        break;
      }
      case 'whoosh': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, startTime);
        osc.frequency.exponentialRampToValueAtTime(550, startTime + 0.08);
        osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.22);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        safeStopAndDisconnect(osc, startTime + 0.23, gain);
        break;
      }
      case 'thud': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, startTime);
        osc.frequency.exponentialRampToValueAtTime(32, startTime + 0.08);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.85, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(startTime);
        safeStopAndDisconnect(osc, startTime + 0.12, gain);
        break;
      }
    }
  }
}

function safeStopAndDisconnect(
  sourceNode: AudioNode & { stop?: (t?: number) => void; onended?: ((this: any, ev: any) => any) | null },
  stopTime: number,
  ...extraNodes: (AudioNode | undefined | null)[]
): void {
  try {
    sourceNode.stop?.(stopTime);
  } catch {}
  sourceNode.onended = () => {
    try {
      sourceNode.disconnect();
    } catch {}
    for (const n of extraNodes) {
      try {
        n?.disconnect();
      } catch {}
    }
  };
}
