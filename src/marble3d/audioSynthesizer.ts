import { TunedObjectType, MelodyNote, HeroMaterial } from './types';
import { SOUND_REGISTRY, getSoundRecipe } from '../audio/soundRegistry';
import { SoundSynthesizer } from '../audio/synth';

export class MarbleAudioSynthesizer {
  private static isPreloaded: boolean = false;

  /**
   * Preload and warm up all Web Audio node graphs before preview or export rendering.
   * Prevents first-hit JIT hitching and guarantees zero dropped sounds.
   */
  static preloadAllSounds(ctx: BaseAudioContext): void {
    if (this.isPreloaded || !ctx) return;
    try {
      const dummyGain = ctx.createGain();
      dummyGain.gain.setValueAtTime(0.00001, ctx.currentTime);
      dummyGain.connect(ctx.destination);

      const t = ctx.currentTime;
      const testFreq = 440;

      // Warm up oscillator and filter compilation
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      osc.connect(filter);
      filter.connect(dummyGain);
      osc.start(t);
      osc.stop(t + 0.01);

      this.isPreloaded = true;
    } catch {
      // AudioContext warming fallback
    }
  }

  /**
   * Plays a tuned note hit for any material type or object type on any BaseAudioContext.
   * Guarantees that every contact plays an audible procedural sound.
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

    // Minimum velocity threshold: soft or glancing hits always make an audible sound
    const effectiveVolume = Math.max(0.42, Math.min(1.0, volume));

    // Clamp late scheduling: clamp any event scheduled in the past to currentTime
    const actualTime = Math.max(ctx.currentTime, startTime);

    // Stereo Panner
    let targetNode: AudioNode = destination;
    if (typeof (ctx as any).createStereoPanner === 'function') {
      try {
        const panner = (ctx as any).createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), actualTime);
        panner.connect(destination);
        targetNode = panner;
      } catch {
        targetNode = destination;
      }
    }

    const dur = note.duration || 0.45;
    const freq = note.freq;

    switch (type) {
      // ==========================================
      // GLASS & CRYSTAL
      // ==========================================
      case 'clear_crystal':
      case 'cut_diamond':
        this.synthCrystalPing(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'crystal_glass':
        this.synthCrystalGlassWater(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'frosted_glass':
        this.synthFrostedCup(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'glass_tube':
        this.synthGlassTube(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'glass_bottle':
        this.synthGlassBottle(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'stained_glass':
        this.synthStainedGlass(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'liquid_filled_glass':
        this.synthLiquidGlass(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'soap_bubble':
        this.synthBubblePlip(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'sea_glass':
        this.synthSeaGlass(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'neon_glass_tube':
        this.synthNeonHum(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'ice':
      case 'freeze':
        this.synthIceCrack(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'slide_glass':
        this.synthGlassSlide(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      // ==========================================
      // METALS
      // ==========================================
      case 'metal_tack':
      case 'chrome_mirror':
        this.synthChromeTack(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'hand_bell':
        this.synthHandBell(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'desk_bell':
        this.synthDeskBell(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'brushed_gold':
        this.synthGoldBell(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'brass_horn':
        this.synthBrassHorn(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'cymbal_drum':
        this.synthCymbalSplash(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'liquid_mercury':
        this.synthMercuryBloop(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'wire_rail':
      case 'roll_rail':
        this.synthWireRail(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'peg_tick':
        this.synthPegTick(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'copper_patina':
        this.synthCopperGong(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'steel_pan':
        this.synthSteelPan(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'wind_chime':
        this.synthWindChime(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      // ==========================================
      // PERCUSSION
      // ==========================================
      case 'drum':
        this.synthDrum(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'dark_tube':
        this.synthResonator(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'wood_block':
        this.synthWoodBlock(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'marimba_bar':
      case 'lacquered_wood':
        this.synthMarimba(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'rainbow_xylophone':
        this.synthRainbowXylophone(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      // ==========================================
      // TOYS & SOFT MATERIALS
      // ==========================================
      case 'squeaky_duck':
        this.synthSqueakyDuck(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'spring_smiley':
        this.synthSpringSmiley(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'jelly_gummy':
        this.synthJellyBoing(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'latex_balloon':
        this.synthBalloon(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'squash':
        this.synthSquash(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      // ==========================================
      // GADGETS
      // ==========================================
      case 'unbranded_phone':
        this.synthSlabPhone(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'unbranded_speaker':
        this.synthSpeakerBass(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      // ==========================================
      // OTHERS & MINERALS
      // ==========================================
      case 'kalimba_tine':
        this.synthKalimba(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'music_box_comb':
        this.synthMusicBox(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'split_piano_key':
      case 'piano_staircase':
        this.synthPiano(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'marble_stone':
        this.synthMarbleTok(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'porcelain_gold':
        this.synthPorcelainChime(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'amethyst_geode':
      case 'opal':
        this.synthAmethyst(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      case 'obsidian':
        this.synthObsidian(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'hard_candy':
        this.synthCandyClick(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'velvet_felt':
        this.synthVelvetThump(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'holographic_foil':
        this.synthHoloSweep(ctx, targetNode, freq, actualTime, dur, effectiveVolume);
        break;

      // ==========================================
      // THEMED HITTABLE PROPS
      // ==========================================
      case 'prop_star':
        this.synthPropStar(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'prop_heart':
        this.synthPropHeart(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'prop_cloud':
        this.synthPropCloud(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'prop_snowflake':
        this.synthPropSnowflake(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'prop_leaf':
        this.synthPropLeaf(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      // ==========================================
      // SPECIAL CONTACT & FINALE EVENTS
      // ==========================================
      case 'portal':
        this.synthPortalWhoosh(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'spike':
        this.synthSpikeTick(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'shatter':
        this.synthShatter(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'merge':
        this.synthMerge(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'escape':
        this.synthEscape(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'final_catcher':
      case 'finale':
        this.synthFinale(ctx, targetNode, freq, actualTime, effectiveVolume);
        break;

      case 'bounce':
      case 'roll_start':
      default: {
        // Safe procedural fallback matching the registered recipe
        const recipe = SOUND_REGISTRY[type] || SOUND_REGISTRY['glass_tube'];
        this.synthProceduralRecipe(ctx, targetNode, recipe, freq, actualTime, dur, effectiveVolume);
        break;
      }
    }
  }

  // =========================================================================
  // DISTINCT PROCEDURAL SYNTHESIS MODELS (Part 3)
  // =========================================================================

  /** Pastel Frosted Cup: soft muted glass "tink", short ring */
  private static synthFrostedCup(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.min(freq * 1.8, 4200), t);
    filter.Q.setValueAtTime(2.2, t);

    const hitDur = Math.min(0.24, Math.max(0.12, dur * 0.4));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.86, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Clear Crystal: bright ping + long shimmering tail */
  private static synthCrystalPing(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, t); // Inharmonic crystal overtone
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 5.42, t); // Shimmering high sparkle

    const hitDur = Math.max(dur, 1.6);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(vol * 0.28, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc3.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
    osc1Stop(osc3, t + hitDur + 0.02);
  }

  /** Crystal Glass (Water Level): pure sine-like tone, slow swell */
  private static synthCrystalGlassWater(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.001, t); // Faint singing 2nd harmonic

    const hitDur = Math.max(dur, 1.8);
    // Slow gentle swell attack
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.035);
    gain.gain.exponentialRampToValueAtTime(vol * 0.6, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc2.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Glowing Glass Tube: bell-glass tone with soft chorus */
  private static synthGlassTube(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    // Chorus detune: ±3.5 Hz
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq + 3.5, t);

    const hitDur = Math.max(dur, 1.25);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Blown Glass Bottle: hollow air column body resonance */
  private static synthGlassBottle(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.2, t);
    filter.Q.setValueAtTime(4.0, t);

    const hitDur = Math.max(dur, 0.95);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Glass Slide: smooth glassy roll texture */
  private static synthGlassSlide(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.5, t);
    osc.frequency.linearRampToValueAtTime(freq * 0.8, t + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, t);

    const hitDur = 0.4;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.72, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Chrome Tack: short bright "tik" */
  private static synthChromeTack(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High sharp metallic impulse
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(1400, freq * 1.8), t);

    const hitDur = 0.09;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.01);
  }

  /** Hand Bell: warm bell with long decay */
  private static synthHandBell(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.4, t); // Minor 3rd / 5th harmonic bell overtone

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3.8, t); // High bell strike ring

    const hitDur = Math.max(dur, 2.0);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc3.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
    osc1Stop(osc3, t + hitDur + 0.02);
  }

  /** Desk Bell: crisp high metallic hotel call bell */
  private static synthDeskBell(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const bellFreq = Math.max(1200, freq * 1.5);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(bellFreq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(bellFreq * 2.76, t);

    const hitDur = Math.max(1.1, dur * 1.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(vol * 0.2, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Brass Horn: short soft brass "toot" (FM brass) */
  private static synthBrassHorn(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(freq, t);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2.0, t); // 2:1 FM ratio

    // FM index envelope (opens on attack, creates classic brass "toot" bite)
    modGain.gain.setValueAtTime(freq * 1.8, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.2, t + 0.15);

    modulator.connect(carrier.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.8, t);
    filter.Q.setValueAtTime(2.5, t);

    const hitDur = Math.min(0.38, Math.max(0.18, dur * 0.8));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.86, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    modulator.start(t);
    carrier.start(t);
    osc1Stop(modulator, t + hitDur + 0.02);
    osc1Stop(carrier, t + hitDur + 0.02);
  }

  /** Cymbal: shimmering splash */
  private static synthCymbalSplash(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(Math.max(1600, freq * 3.1), t);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(Math.max(2400, freq * 4.7), t);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, t);

    const hitDur = Math.max(0.85, dur * 1.5);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.82, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Liquid Metal: low wet "bloop" */
  private static synthMercuryBloop(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const lowBase = Math.max(80, Math.min(600, freq * 0.6));
    osc.type = 'sine';
    // Downward pitch bend with liquid droplet envelope
    osc.frequency.setValueAtTime(lowBase * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(lowBase * 0.75, t + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.Q.setValueAtTime(4.0, t);

    const hitDur = 0.28;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Wire Rail: rolling rattle + peg ticks synced to each rung */
  private static synthWireRail(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscTick = ctx.createOscillator();
    const gain = ctx.createGain();

    // Dual wire rail chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Peg tick transient
    oscTick.type = 'triangle';
    oscTick.frequency.setValueAtTime(freq * 3.2, t);

    const hitDur = Math.min(0.2, Math.max(0.08, dur * 0.3));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    oscTick.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscTick.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(oscTick, t + hitDur + 0.02);
  }

  /** Peg Tick: rapid metallic contact */
  private static synthPegTick(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(1200, freq * 2.2), t);

    const hitDur = 0.05;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.01);
  }

  /** Drum (tom/snare look): tight skin thud with short noise snap */
  private static synthDrum(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const snapOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const basePitch = Math.max(60, Math.min(180, freq * 0.35));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch * 2.6, t);
    osc.frequency.exponentialRampToValueAtTime(basePitch, t + 0.05);

    // Snappy noise-snap attack
    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(800, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(2.0, t);

    const hitDur = 0.32;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 1.0, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    snapOsc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    snapOsc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(snapOsc, t + 0.06);
  }

  /** Black Resonator Tube: warm hollow low "bonk" */
  private static synthResonator(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const tubePitch = Math.max(75, Math.min(320, freq * 0.5));
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(tubePitch * 1.3, t);
    osc.frequency.exponentialRampToValueAtTime(tubePitch, t + 0.04);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tubePitch * 2.5, t);
    filter.Q.setValueAtTime(3.5, t);

    const hitDur = 0.42;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Wood Block: woody knock with natural rapid decay */
  private static synthWoodBlock(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, _dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.1, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(6.0, t);

    const hitDur = 0.11;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.01);
  }

  /** Marimba Bar: warm rosewood resonance (Sampled CC0 soundfont) */
  private static synthMarimba(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    SoundSynthesizer.playNote(ctx, dest, freq, t, dur, 'marimba', vol);
  }

  /** Rainbow Half-Pipe Bar: glockenspiel / xylophone tone (fast runs) */
  private static synthRainbowXylophone(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscMallet = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Acoustic mallet strike transient
    oscMallet.type = 'triangle';
    oscMallet.frequency.setValueAtTime(freq * 4.2, t);

    const hitDur = Math.min(0.38, Math.max(0.18, dur * 0.6));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.94, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    oscMallet.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscMallet.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(oscMallet, t + 0.04);
  }

  /** Rubber Duck / Squeaky Toy: pitched squeak (squeeze + release) */
  private static synthSqueakyDuck(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscHarm = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    oscHarm.type = 'sine';

    // Upward squeeze chirp then subtle downward release
    const baseFreq = Math.max(320, Math.min(1800, freq * 1.1));
    osc.frequency.setValueAtTime(baseFreq * 0.75, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, t + 0.12);

    oscHarm.frequency.setValueAtTime(baseFreq * 1.5, t);
    oscHarm.frequency.exponentialRampToValueAtTime(baseFreq * 2.7, t + 0.04);
    oscHarm.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, t + 0.12);

    const hitDur = Math.max(0.18, Math.min(dur, 0.35));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    oscHarm.connect(gain);
    gain.connect(dest);

    osc.start(t);
    oscHarm.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(oscHarm, t + hitDur + 0.02);
  }

  /** Smiley Spring Toy: springy "boing" with pitch bend */
  private static synthSpringSmiley(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Fast spring boing wobble (22Hz)
    lfo.type = 'triangle';
    lfo.frequency.setValueAtTime(22, t);
    lfoGain.gain.setValueAtTime(freq * 0.22, t);
    lfoGain.gain.exponentialRampToValueAtTime(2, t + 0.35);

    lfo.connect(osc.frequency);

    const hitDur = Math.max(0.35, Math.min(dur, 0.55));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    lfo.start(t);
    osc.start(t);
    osc1Stop(lfo, t + hitDur + 0.02);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Jelly / Gummy: squishy boing */
  private static synthJellyBoing(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Rubbery squishy pitch wobble
    osc.frequency.setValueAtTime(freq * 1.15, t);
    osc.frequency.linearRampToValueAtTime(freq * 0.9, t + 0.08);
    osc.frequency.linearRampToValueAtTime(freq, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 2.2, 1800), t);

    const hitDur = 0.36;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Balloon: rubbery squeak, pop at finale */
  private static synthBalloon(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 2.2, t);
    osc.frequency.linearRampToValueAtTime(freq * 1.3, t + 0.08);

    const hitDur = 0.16;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.75, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Squash: tactile toy compression */
  private static synthSquash(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.65, t);

    const hitDur = 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Slab Phone: clean digital tone (original ringtone-style) */
  private static synthSlabPhone(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Original clean digital interval (1.4983 = pure perfect fifth)
    osc1.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 1.4983, t);

    const hitDur = Math.max(0.22, Math.min(dur, 0.45));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Speaker: deep bass thump */
  private static synthSpeakerBass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const subFreq = Math.max(42, Math.min(130, freq * 0.3));
    osc.frequency.setValueAtTime(subFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(subFreq, t + 0.05);

    const hitDur = Math.max(0.35, Math.min(dur, 0.65));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 1.05, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Kalimba Tine: metallic pluck with wooden body resonance */
  private static synthKalimba(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const oscFundamental = ctx.createOscillator();
    const oscOvertone = ctx.createOscillator();
    const gain = ctx.createGain();

    oscFundamental.type = 'sine';
    oscFundamental.frequency.setValueAtTime(freq, t);

    // 5.4x inharmonic metal tine overtone
    oscOvertone.type = 'sine';
    oscOvertone.frequency.setValueAtTime(freq * 5.4, t);

    const hitDur = Math.max(dur, 0.72);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    oscFundamental.connect(gain);
    oscOvertone.connect(gain);
    gain.connect(dest);

    oscFundamental.start(t);
    oscOvertone.start(t);
    osc1Stop(oscFundamental, t + hitDur + 0.02);
    osc1Stop(oscOvertone, t + 0.15);
  }

  /** Music Box Comb: bright mechanical comb pluck (Sampled CC0 soundfont) */
  private static synthMusicBox(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    SoundSynthesizer.playNote(ctx, dest, freq, t, dur, 'musicBox', vol);
  }

  /** Steel Pan: Caribbean metallic scoop harmonic */
  private static synthSteelPan(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 0.96, t);
    osc1.frequency.linearRampToValueAtTime(freq, t + 0.04);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.01, t);

    const hitDur = Math.max(dur, 0.95);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Wind Chime: airy silver chime tube */
  private static synthWindChime(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const highPitch = Math.max(900, freq * 1.5);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(highPitch, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(highPitch * 2.76, t);

    const hitDur = Math.max(dur, 1.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Acoustic Piano Step (Sampled CC0 soundfont) */
  private static synthPiano(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    SoundSynthesizer.playNote(ctx, dest, freq, t, dur, 'grandPiano', vol);
  }

  /** Solid Marble Stone "Tok" */
  private static synthMarbleTok(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.38, t + 0.05);

    const hitDur = 0.14;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.01);
  }

  /** Porcelain with Gold Lines: delicate ceramic chime */
  private static synthPorcelainChime(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.02, t);

    const hitDur = Math.max(dur, 0.48);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.86, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Neon Tube: electric hum-tone */
  private static synthNeonHum(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const hum = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    hum.type = 'sine';
    hum.frequency.setValueAtTime(120, t); // 120Hz hum

    const hitDur = Math.max(dur, 0.6);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    hum.connect(gain);
    gain.connect(dest);

    osc.start(t);
    hum.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(hum, t + hitDur + 0.02);
  }

  /** Stained Glass: bell-glass tone */
  private static synthStainedGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, t);

    const hitDur = Math.max(dur, 0.7);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc2.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Portal: ethereal whoosh */
  private static synthPortalWhoosh(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.4, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.8, t + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.0, t);

    const hitDur = 0.75;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  /** Spike: sharp tick */
  private static synthSpikeTick(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(Math.max(2200, freq * 3.5), t);

    const hitDur = 0.04;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.9, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.01);
  }

  /** Shatter: layered glass break */
  private static synthShatter(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const shardRatios = [1.0, 1.42, 2.18, 3.14, 4.75];
    for (let i = 0; i < shardRatios.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const shardPitch = Math.max(600, freq * shardRatios[i]);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(shardPitch, t + i * 0.008);

      const shardDur = 0.45 - i * 0.05;
      gain.gain.setValueAtTime(0.0001, t + i * 0.008);
      gain.gain.linearRampToValueAtTime(vol * 0.65, t + i * 0.008 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.008 + shardDur);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t + i * 0.008);
      osc1Stop(osc, t + i * 0.008 + shardDur + 0.02);
    }
  }

  /** Merge: harmonic coalescence */
  private static synthMerge(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.5, t);

    const hitDur = 0.45;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Escape: triumphant wall breakthrough */
  private static synthEscape(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.0, t);

    const hitDur = 1.2;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.95, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  /** Finale: multi-voice triumphant chord + sparkle */
  private static synthFinale(ctx: BaseAudioContext, dest: AudioNode, baseFreq: number, t: number, vol: number) {
    const chordIntervals = [1.0, 1.2599, 1.4983, 2.0, 2.5198];
    for (let i = 0; i < chordIntervals.length; i++) {
      const osc = ctx.createOscillator();
      const sparkle = ctx.createOscillator();
      const gain = ctx.createGain();

      const f = baseFreq * chordIntervals[i];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.025);

      sparkle.type = 'triangle';
      sparkle.frequency.setValueAtTime(f * 2.76, t + i * 0.025);

      const hitDur = 2.4 - i * 0.15;
      gain.gain.setValueAtTime(0.0001, t + i * 0.025);
      gain.gain.linearRampToValueAtTime(vol * 0.72, t + i * 0.025 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.025 + hitDur);

      osc.connect(gain);
      sparkle.connect(gain);
      gain.connect(dest);

      osc.start(t + i * 0.025);
      sparkle.start(t + i * 0.025);
      osc1Stop(osc, t + i * 0.025 + hitDur + 0.05);
      osc1Stop(sparkle, t + i * 0.025 + 0.4);
    }
  }

  // --- Props Helpers ---
  private static synthPropStar(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(1000, freq * 1.5), t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(Math.max(1000, freq * 1.5) * 2.76, t);

    const hitDur = 0.75;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc2.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  private static synthPropHeart(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = 0.55;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  private static synthPropCloud(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 1.8, 1200), t);

    const hitDur = 0.45;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  private static synthPropSnowflake(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const highFreq = Math.max(1400, freq * 2.0);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(highFreq, t);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(highFreq * 3.14, t);

    const hitDur = 0.85;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.86, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + hitDur + 0.02);
    osc1Stop(osc2, t + hitDur + 0.02);
  }

  private static synthPropLeaf(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    const hitDur = 0.32;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.88, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  // --- Material Fallback / Generic Procedural Recipe Synthesizer ---
  private static synthProceduralRecipe(
    ctx: BaseAudioContext,
    dest: AudioNode,
    recipe: any,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = recipe.synthesisType === 'subtractive' ? 'sawtooth' : recipe.synthesisType === 'fm' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const attack = recipe.attack || 0.003;
    const hitDur = Math.max(0.1, recipe.decay || dur || 0.4);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * (recipe.baseVolume || 0.85), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + hitDur);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + hitDur + 0.02);
  }

  // --- Pre-existing helpers preserved ---
  private static synthLiquidGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
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

  private static synthSeaGlass(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.4);
  }

  private static synthAmethyst(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq * 0.5, t);

    const hitDur = Math.max(dur, 1.8);
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

  private static synthObsidian(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq * 1.5, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.65, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc1Stop(osc, t + 0.22);
  }

  private static synthGoldBell(ctx: BaseAudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const osc = ctx.createOscillator();
    const oscH = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    oscH.type = 'sine';
    oscH.frequency.setValueAtTime(freq * 2.76, t);

    const hitDur = Math.max(dur, 2.0);
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
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1Stop(osc1, t + 0.4);
    osc1Stop(osc2, t + 0.4);
  }

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
    } catch {}
  }

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
  } catch {}
  osc.onended = () => {
    try {
      osc.disconnect();
    } catch {}
  };
}
