import { TunedObjectType, MelodyNote, HeroMaterial } from './types';

export class MarbleAudioSynthesizer {
  /**
   * Plays a tuned note hit for any material type on any BaseAudioContext
   */
  static playTunedHit(
    ctx: BaseAudioContext,
    destination: AudioNode,
    type: TunedObjectType | HeroMaterial | string,
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
      // 1. Clear Crystal & Cut Diamond (Bright crystalline ping, long shimmer)
      case 'clear_crystal':
      case 'cut_diamond':
        this.synthCrystalPing(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 2. Frosted Glass (Soft muted glass chime)
      case 'frosted_glass':
        this.synthFrostedGlass(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 3. Stained Glass (Bell-like singing glass)
      case 'stained_glass':
        this.synthGlass(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 4. Liquid-Filled Glass (Water-glass with sloshing formant)
      case 'liquid_filled_glass':
        this.synthLiquidGlass(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 5. Soap Bubble (Soft "plip")
      case 'soap_bubble':
        this.synthBubblePlip(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 6. Sea Glass (Matte soft clink)
      case 'sea_glass':
        this.synthSeaGlass(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 7. Neon Glass Tube (Electric hum-tone with bloom pulse)
      case 'neon_glass_tube':
        this.synthNeonHum(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 8. Amethyst Geode / Opal (Deep resonant crystal)
      case 'amethyst_geode':
      case 'opal':
        this.synthAmethyst(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 9. Obsidian (Sharp glass-stone tink)
      case 'obsidian':
        this.synthObsidian(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 10. Marble Stone (Solid "tok")
      case 'marble_stone':
        this.synthMarbleTok(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 11. Porcelain with Gold Lines (Delicate ceramic chime)
      case 'porcelain_gold':
        this.synthPorcelainChime(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 12. Chrome Mirror (Clean metallic tink)
      case 'chrome_mirror':
      case 'metal_tack':
      case 'wire_rail':
        this.synthMetalTack(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 13. Brushed Gold (Warm resonant bell)
      case 'brushed_gold':
      case 'hand_bell':
        this.synthGoldBell(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 14. Copper with Patina (Warm gong-like clang)
      case 'copper_patina':
      case 'steel_pan':
        this.synthCopperGong(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 15. Liquid Mercury (Liquid metallic bloop)
      case 'liquid_mercury':
        this.synthMercuryBloop(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 16. Jelly / Gummy (Squishy tuned "boing")
      case 'jelly_gummy':
        this.synthJellyBoing(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 17. Hard Candy (Glassy candy click)
      case 'hard_candy':
        this.synthCandyClick(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 18. Velvet / Felt (Muted thump)
      case 'velvet_felt':
        this.synthVelvetThump(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 19. Lacquered Wood (Warm marimba / wood block)
      case 'lacquered_wood':
      case 'rainbow_xylophone':
      case 'marimba_bar':
      case 'wood_block':
        this.synthXylophone(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 20. Holographic Foil (Shimmer sweep synth)
      case 'holographic_foil':
        this.synthHoloSweep(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;

      // 21. Latex Balloon (Squeak / pop)
      case 'latex_balloon':
        this.synthBalloon(ctx, targetNode, note.freq, startTime, volume);
        break;

      // 22. Ice (Icy crystalline crack-ping)
      case 'ice':
        this.synthIceCrack(ctx, targetNode, note.freq, startTime, volume);
        break;

      // Drum & Resonator types
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

      case 'final_catcher':
        this.synthFinale(ctx, targetNode, note.freq, startTime, volume);
        break;

      default:
        this.synthGlass(ctx, targetNode, note.freq, startTime, note.duration, volume);
        break;
    }
  }

  // --- SYNTHESIS MODELS ---

  /** 1. Clear Crystal Ping (Bright high overtone, long pristine tail) */
  private static synthCrystalPing(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3.14, t);

    const hitDur = Math.max(dur, 1.8);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(vol * 0.2, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + hitDur + 0.02);
    osc2.stop(t + hitDur + 0.02);
  }

  /** 2. Frosted Glass (Warm, diffuse glass tone) */
  private static synthFrostedGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.2, t);

    const hitDur = Math.max(dur, 1.2);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + hitDur + 0.02);
  }

  /** 3. Classic Glass Tube */
  private static synthGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, t);

    const hitDur = Math.max(dur, 1.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc2.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** 4. Liquid-Filled Glass (Tuned water slosh tone) */
  private static synthLiquidGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    // Subtle water slosh pitch bend
    osc.frequency.linearRampToValueAtTime(freq * 1.015, t + 0.08);
    osc.frequency.linearRampToValueAtTime(freq, t + 0.25);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(3.0, t);

    const hitDur = Math.max(dur, 1.3);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** 5. Soap Bubble Plip */
  private static synthBubblePlip(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.06);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.75, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.15);
  }

  /** 6. Sea Glass Clink */
  private static synthSeaGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.5);
  }

  /** 7. Neon Glass Hum */
  private static synthNeonHum(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const hum = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    hum.type = 'sine';
    hum.frequency.setValueAtTime(120, t); // 120Hz mains hum

    const hitDur = Math.max(dur, 1.1);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    hum.connect(gain);
    gain.connect(dest);

    osc.start(t);
    hum.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(hum, t + hitDur + 0.02);
  }

  /** 8. Amethyst Geode */
  private static synthAmethyst(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq * 0.5, t);

    const hitDur = Math.max(dur, 2.0);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    oscSub.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscSub.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(oscSub, t + hitDur + 0.02);
  }

  /** 9. Obsidian */
  private static synthObsidian(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq * 1.5, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.65, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.25);
  }

  /** 10. Marble Stone Tok */
  private static synthMarbleTok(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.05);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.2);
  }

  /** 11. Porcelain Ceramic Chime */
  private static synthPorcelainChime(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.02, t);

    const hitDur = Math.max(dur, 1.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc2.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** 12. Metal Tack Tink */
  private static synthMetalTack(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, t);

    const hitDur = Math.max(dur * 0.5, 0.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** 13. Gold Bell */
  private static synthGoldBell(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscH = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    oscH.type = 'sine';
    oscH.frequency.setValueAtTime(freq * 2.76, t);

    const hitDur = Math.max(dur, 2.2);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    oscH.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscH.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(oscH, t + hitDur + 0.02);
  }

  /** 14. Copper Gong */
  private static synthCopperGong(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.75, t);

    const hitDur = Math.max(dur, 1.8);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** 15. Liquid Mercury Bloop */
  private static synthMercuryBloop(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.7, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + 0.08);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.3);
  }

  /** 16. Jelly Squishy Boing */
  private static synthJellyBoing(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    // pitch wobble
    osc.frequency.linearRampToValueAtTime(freq * 1.15, t + 0.04);
    osc.frequency.linearRampToValueAtTime(freq * 0.92, t + 0.1);
    osc.frequency.linearRampToValueAtTime(freq, t + 0.2);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.5);
  }

  /** 17. Hard Candy Click */
  private static synthCandyClick(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.8, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.18);
  }

  /** 18. Velvet / Felt Thump */
  private static synthVelvetThump(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.5, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.7, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.2);
  }

  /** 19. Wood / Xylophone */
  private static synthXylophone(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = 0.55;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** 20. Holographic Foil Sweep */
  private static synthHoloSweep(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.9, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.12);

    const hitDur = Math.max(dur, 0.9);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.7, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** 21. Balloon Squeak */
  private static synthBalloon(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 2.0, t);
    osc.frequency.linearRampToValueAtTime(freq * 1.2, t + 0.08);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.18);
  }

  /** 22. Ice Crystalline Crack */
  private static synthIceCrack(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 4.25, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + 0.52);
    osc1Stop(osc2, t + 0.52);
  }

  /** Drum */
  private static synthDrum(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const basePitch = Math.max(55, freq * 0.35);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(basePitch, t + 0.08);

    const hitDur = 0.45;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 1.0, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Dark Tube Resonator */
  private static synthResonator(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.8, t);

    const hitDur = 0.9;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Kalimba */
  private static synthKalimba(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = Math.max(dur, 0.7);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Finale Downbeat Chord Burst */
  private static synthFinale(ctx: BaseAudioContext, dest: AudioNode, baseFreq: number, t: number, vol: number) {
    const chordIntervals = [1.0, 1.2599, 1.4983, 2.0];
    for (let i = 0; i < chordIntervals.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const f = baseFreq * chordIntervals[i];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.03);

      const hitDur = 2.4 - i * 0.2;
      gain.gain.setValueAtTime(0.0001, t + i * 0.03);
      gain.gain.linearRampToValueAtTime(vol * 0.7, t + i * 0.03 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + hitDur);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t + i * 0.03);
      osc1Stop(osc, t + i * 0.03 + hitDur + 0.05);
    }
  }

  /**
   * Generates a soft ambient room tone bed (e.g. morning room tone, vinyl dust, distant wind)
   */
  static playAmbientBed(ctx: BaseAudioContext, destination: AudioNode, bedType: string, duration: number, volume: number = 0.12): void {
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (bedType.includes('rain') || bedType.includes('water')) {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
      } else {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      whiteNoise.start(ctx.currentTime);
      whiteNoise.stop(ctx.currentTime + duration);
    } catch {
      // Audio node fallback
    }
  }

  /**
   * Renders offline audio buffer for complete Marble Melody run
   */
  static async renderOfflineRunAudio(
    notes: { type: TunedObjectType | string; note: MelodyNote; time: number; pan?: number }[],
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

function osc1Stop(osc: OscillatorNode, stopTime: number) {
  try {
    osc.stop(stopTime);
  } catch {
    // Already stopped
  }
}
