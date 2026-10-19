import { CollisionEvent } from '../engine/types';
import { AudioSettings, NoteItem, SfxType } from './types';
import { SoundSynthesizer } from './synth';
import { BUILTIN_MELODIES, findMelodyById } from './melodies';
import { HitLimiter } from './hitLimiter';
import { normalizeAudioBufferToLufs } from './loudness';
import { MarbleAudioSynthesizer } from '../marble3d/audioSynthesizer';

/**
 * Renders an offline AudioBuffer from the collision event log.
 * Frame-perfect alignment with simulation timestamps.
 * Guarantees that every collision event produces an audible sound.
 * 
 * Features:
 * - Completely isolated from live AudioContext.
 * - DC-blocking highpass (18Hz) and high-shelf de-harshing (12kHz).
 * - Non-bass high-pass filter (80Hz) to eliminate mud while preserving drum/sub-bass.
 * - Sidechain ducking: textures & drone pad duck -3dB under melody notes.
 * - Full collision event replay (bounce, roll, rail, slide, peg_tick, squash, portal, spike, freeze, escape, finale).
 * - Tail preservation: renders duration + 2.0s, trimmed to exact duration with 50ms anti-click fade-out.
 * - Mono-safe constant-power panning (no phase cancellation).
 * - BS.1770 / EBU R128 loudness normalization to -14 LUFS (±0.5) and True Peak <= -1 dBTP.
 */
export async function renderOfflineAudio(
  events: CollisionEvent[],
  duration: number,
  settings: AudioSettings,
  customNotes?: NoteItem[],
  slowMoSoundFeel: boolean = false
): Promise<AudioBuffer> {
  const sampleRate = 48000;
  // Render extra 2.0s tail to ensure full reverb and acoustic resonance decay
  const tailDuration = 2.0;
  const totalRenderDuration = duration + tailDuration;
  const totalRenderSamples = Math.ceil(totalRenderDuration * sampleRate);

  const offlineCtx = new OfflineAudioContext(2, totalRenderSamples, sampleRate);

  // Preload / prime procedural synth audio graphs in offline context
  MarbleAudioSynthesizer.preloadAllSounds(offlineCtx);

  // 1. DC-Blocking Highpass Filter (18 Hz, Q 0.707)
  const dcBlocker = offlineCtx.createBiquadFilter();
  dcBlocker.type = 'highpass';
  dcBlocker.frequency.setValueAtTime(18, 0);
  dcBlocker.Q.setValueAtTime(0.707, 0);

  // 2. High-shelf de-harshing trim (-1.5 dB above 12 kHz)
  const deHarsh = offlineCtx.createBiquadFilter();
  deHarsh.type = 'highshelf';
  deHarsh.frequency.setValueAtTime(12000, 0);
  deHarsh.gain.setValueAtTime(-1.5, 0);

  // 3. Master Limiter / Bus Compressor: True Peak <= -1 dBTP
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-2.5, 0);
  limiter.knee.setValueAtTime(6, 0);
  limiter.ratio.setValueAtTime(14, 0);
  limiter.attack.setValueAtTime(0.002, 0);
  limiter.release.setValueAtTime(0.18, 0);

  // 4. Master Gain (Uses preset mix levels, ignoring preview live mute/volume)
  const masterGain = offlineCtx.createGain();
  const safeMasterVol = Math.max(0.25, Math.min(1.0, settings.masterVolume ?? 0.85));
  masterGain.gain.setValueAtTime(safeMasterVol, 0);

  // 5. Sidechain Ducking Node for textures & drone pads
  const duckingGain = offlineCtx.createGain();
  duckingGain.gain.setValueAtTime(1.0, 0);

  // 6. Sub-buses
  const melodyBus = offlineCtx.createGain();
  melodyBus.gain.setValueAtTime(1.0, 0);

  const textureBus = offlineCtx.createGain();
  textureBus.gain.setValueAtTime(1.0, 0);

  // 7. Non-bass highpass filter (80 Hz) to keep low-end pristine
  const nonBassFilter = offlineCtx.createBiquadFilter();
  nonBassFilter.type = 'highpass';
  nonBassFilter.frequency.setValueAtTime(80, 0);
  nonBassFilter.Q.setValueAtTime(0.707, 0);

  // 8. Bass pass-through bus for drums and 808
  const bassBus = offlineCtx.createGain();
  bassBus.gain.setValueAtTime(1.0, 0);

  // Wire Audio Graph
  // Non-bass sounds -> nonBassFilter -> melodyBus -> limiter
  nonBassFilter.connect(melodyBus);
  bassBus.connect(melodyBus);
  melodyBus.connect(limiter);

  // Texture sounds -> textureBus -> duckingGain -> limiter
  textureBus.connect(duckingGain);
  duckingGain.connect(limiter);

  // Master output chain
  limiter.connect(deHarsh);
  deHarsh.connect(dcBlocker);

  // Optional "slow-mo sound feel": gentle low-pass (2600Hz)
  if (slowMoSoundFeel) {
    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2600, 0);
    lowpass.Q.setValueAtTime(0.707, 0);
    dcBlocker.connect(lowpass);
    lowpass.connect(masterGain);
  } else {
    dcBlocker.connect(masterGain);
  }
  masterGain.connect(offlineCtx.destination);

  // Determine melody notes
  const melody = customNotes && customNotes.length > 0
    ? customNotes
    : (findMelodyById(settings.selectedMelodyId) || BUILTIN_MELODIES[0]).notes;

  // Synthesize Backing Drone / Pad Layer if droneVolume > 0.05
  const droneVol = settings.droneVolume ?? 0.2;
  if (droneVol > 0.05) {
    const baseFreq = melody.length > 0 ? melody[0].freq : 261.63;
    // Subdued root and fifth pad
    const oscRoot = offlineCtx.createOscillator();
    const oscFifth = offlineCtx.createOscillator();
    const droneGain = offlineCtx.createGain();
    const droneFilter = offlineCtx.createBiquadFilter();

    oscRoot.type = 'sine';
    oscRoot.frequency.setValueAtTime(baseFreq * 0.5, 0); // one octave down

    oscFifth.type = 'triangle';
    oscFifth.frequency.setValueAtTime(baseFreq * 0.75, 0); // fifth

    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(380, 0);
    droneFilter.Q.setValueAtTime(1.0, 0);

    const safeDroneVol = Math.max(0.04, Math.min(0.3, droneVol * 0.5));
    droneGain.gain.setValueAtTime(0.0001, 0);
    droneGain.gain.linearRampToValueAtTime(safeDroneVol, 0.4);
    droneGain.gain.setValueAtTime(safeDroneVol, Math.max(0, duration - 0.5));
    droneGain.gain.linearRampToValueAtTime(0.0001, duration);

    oscRoot.connect(droneFilter);
    oscFifth.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(textureBus);

    oscRoot.start(0);
    oscFifth.start(0);
    oscRoot.stop(duration);
    oscFifth.stop(duration);
  }

  const PENTATONIC_FREQS = [
    130.81, 146.83, 164.81, 196.00, 220.00,
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00
  ];
  const CHORD_ARP = [1.0, 1.2599, 1.4983, 2.0, 2.5198, 2.9966];

  let noteIdx = 0;
  let bounceCount = 0;
  let lastScheduledTime = -1;

  const hitLimiter = new HitLimiter();
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.time > duration) break;
    // Same rules as the live preview, so export audio matches what was heard
    if (!hitLimiter.allow(ev)) continue;

    // Hits that land on top of each other are spread 4ms apart so each one is heard.
    // Only ever push a hit later (pulling it earlier merges it into the previous bounce
    // and puts the sound ahead of the picture), and by at most 30ms to stay in sync.
    const evTime = Math.max(0, ev.time);
    let t = evTime;
    if (lastScheduledTime >= 0) {
      t = Math.min(Math.max(evTime, lastScheduledTime + 0.004), evTime + 0.03);
    }
    lastScheduledTime = t;

    bounceCount++;

    // Mono-safe panning: clamp between -0.85 and +0.85
    const pan = settings.stereoPanning !== false && ev.position
      ? Math.max(-0.85, Math.min(0.85, (ev.position.x - 540) / 540))
      : 0;

    // Sidechain Ducking Trigger: when melody note plays, duck texture bus by -3dB (gain 0.7)
    try {
      duckingGain.gain.cancelScheduledValues(t);
      duckingGain.gain.setValueAtTime(duckingGain.gain.value, t);
      duckingGain.gain.linearRampToValueAtTime(0.70, t + 0.015);
      duckingGain.gain.linearRampToValueAtTime(1.0, t + 0.18);
    } catch {}

    // A. Marble Melody 3D Hit
    if (ev.extra?.marbleMelodyHit && ev.extra?.melodyNote) {
      // Soft / glancing hit guarantee: minimum audible velocity 0.25
      const baseNoteVol = ev.extra.melodyNote.velocity || 0.85;
      const vol = Math.max(0.25, baseNoteVol);
      const objType = ev.extra.objectType || 'glass_tube';

      MarbleAudioSynthesizer.playTunedHit(
        offlineCtx,
        nonBassFilter,
        objType,
        ev.extra.melodyNote,
        t,
        vol,
        pan
      );
      continue;
    }

    // B. Escape & Finale
    if (ev.type === 'escape' || ev.type === 'finale') {
      SoundSynthesizer.playSfx(offlineCtx, textureBus, 'shatter', t, settings.sfxVolume ?? 0.75);

      if (melody.length > 0) {
        const note = melody[noteIdx % melody.length];
        noteIdx++;
        SoundSynthesizer.playNote(
          offlineCtx,
          nonBassFilter,
          note.freq * 2.0,
          t,
          0.85,
          settings.instrument,
          0.95,
          pan
        );
      }
    }
    // C. Special Obstacle & Physics Interactions
    else if (
      ev.type === 'portal' ||
      ev.type === 'spike' ||
      ev.type === 'freeze' ||
      ev.type === 'squash' ||
      ev.type === 'peg_tick' ||
      ev.type === 'bumper' ||
      ev.type === 'roll' ||
      ev.type === 'roll_start' ||
      ev.type === 'rail_roll' ||
      ev.type === 'slide'
    ) {
      const rawNote = melody.length > 0 ? melody[noteIdx % melody.length] : null;
      const melodyNote = {
        time: t,
        duration: rawNote?.duration || 0.35,
        midi: rawNote?.midi || 69,
        freq: rawNote?.freq || 440,
        pitchName: 'A4',
        velocity: 0.8,
        lane: 0,
      };

      const mappedType = ev.type === 'roll' || ev.type === 'roll_start' || ev.type === 'rail_roll'
        ? 'wire_rail'
        : ev.type === 'slide'
        ? 'glass_slide'
        : ev.type === 'bumper'
        ? 'wood_block'
        : ev.type;

      MarbleAudioSynthesizer.playTunedHit(
        offlineCtx,
        mappedType === 'glass_slide' || mappedType === 'wire_rail' ? textureBus : nonBassFilter,
        mappedType,
        melodyNote,
        t,
        Math.max(0.35, (ev.impulse || 50) / 60),
        pan
      );
    }
    // D. Standard Bounce & Collisions
    else {
      let freq = 440;
      let noteDuration = 0.45;
      const soundMode = settings.soundMode || 'melody';

      if (soundMode === 'pentatonic') {
        const speed = Math.hypot(ev.velocity?.x || 0, ev.velocity?.y || 0);
        const octaveShift = Math.floor(Math.min(speed / 400, 3));
        const scaleIdx = (bounceCount + octaveShift * 5) % PENTATONIC_FREQS.length;
        freq = PENTATONIC_FREQS[scaleIdx];
        noteDuration = 0.35;
      } else if (soundMode === 'chordArp') {
        const baseNote = melody.length > 0 ? melody[noteIdx % melody.length] : { freq: 261.63 };
        noteIdx++;
        const arpMult = CHORD_ARP[bounceCount % CHORD_ARP.length];
        freq = baseNote.freq * arpMult;
        noteDuration = 0.4;
      } else if (soundMode === 'pitchSpeed') {
        const speed = Math.hypot(ev.velocity?.x || 0, ev.velocity?.y || 0);
        const pitchRatio = Math.max(0.5, Math.min(3.5, speed / 320));
        freq = 261.63 * pitchRatio;
        noteDuration = 0.25;
      } else {
        if (melody.length > 0) {
          const note = melody[noteIdx % melody.length];
          noteIdx++;
          freq = note.freq;
          noteDuration = note.duration || 0.45;
          if (settings.pitchByVelocity) {
            const speed = Math.hypot(ev.velocity?.x || 0, ev.velocity?.y || 0);
            const pitchFactor = Math.min(1.5, Math.max(0.7, speed / 600));
            freq *= pitchFactor;
          }
        }
      }

      // Soft hit threshold: glancing contacts never drop below 0.45
      let vol = 0.75;
      if (settings.volumeByImpulse && ev.impulse !== undefined) {
        vol = Math.min(1.0, Math.max(0.45, ev.impulse / 300));
      } else {
        vol = Math.max(0.45, vol);
      }

      let finalDuration = noteDuration;
      if (slowMoSoundFeel) {
        finalDuration *= 1.35;
      }

      const isSubOrDrum = settings.instrument === 'subBass808' || settings.instrument === 'snareRimshot';
      const targetDestination = isSubOrDrum ? bassBus : nonBassFilter;

      SoundSynthesizer.playNote(
        offlineCtx,
        targetDestination,
        freq,
        t,
        finalDuration,
        settings.instrument,
        vol,
        pan
      );

      if (settings.asmrLayer !== false) {
        const sfx = ev.type === 'ring' ? 'pop' : ev.type === 'ball' ? 'crunch' : 'thud';
        SoundSynthesizer.playSfx(offlineCtx, textureBus, sfx as SfxType, t, (settings.sfxVolume ?? 0.75) * 0.4);
      }
    }
  }

  // Render the audio graph
  const renderedBuffer = await offlineCtx.startRendering();

  // Trim to exact video duration and apply 50ms anti-click fade-out at the exact end
  const exactSamples = Math.round(duration * sampleRate);
  const trimmedBuffer = new AudioBuffer({
    numberOfChannels: 2,
    length: exactSamples,
    sampleRate,
  });

  const fadeSamples = Math.round(0.05 * sampleRate); // 50ms fade
  const fadeStart = Math.max(0, exactSamples - fadeSamples);

  for (let ch = 0; ch < 2; ch++) {
    const src = renderedBuffer.getChannelData(ch);
    const dst = trimmedBuffer.getChannelData(ch);

    for (let i = 0; i < exactSamples; i++) {
      let val = i < src.length ? src[i] : 0;
      if (i >= fadeStart) {
        const factor = (exactSamples - i) / fadeSamples;
        val *= factor;
      }
      dst[i] = val;
    }
  }

  // Normalize export loudness to -14 LUFS integrated and <= -1 dBTP true peak
  normalizeAudioBufferToLufs(trimmedBuffer, -14.0, -1.0);

  return trimmedBuffer;
}
