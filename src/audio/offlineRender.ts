import { CollisionEvent } from '../engine/types';
import { AudioSettings, NoteItem } from './types';
import { SoundSynthesizer } from './synth';
import { BUILTIN_MELODIES, findMelodyById } from './melodies';
import { HitLimiter } from './hitLimiter';
import { normalizeAudioBufferToLufs } from './loudness';
import { MarbleAudioSynthesizer } from '../marble3d/audioSynthesizer';
import { SoundfontSampleManager } from './soundfont';

/**
 * Renders an offline AudioBuffer from the collision event log.
 * Frame-perfect alignment with simulation timestamps.
 * 
 * Features:
 * - Completely isolated from live AudioContext.
 * - Clarity Master Chain (voices -> EQ -> compressor -> limiter -> output):
 *     1. Highpass at 80 Hz (eliminates rumble/mud)
 *     2. Peaking mud cut at 320 Hz (-3 dB, Q 1.0) to remove "goonj" / boxy echo
 *     3. Peaking presence boost at 3 kHz (+2 dB, Q 1.0)
 *     4. High-shelf air boost at 10 kHz (+2 dB)
 *     5. Gentle compressor: threshold -18 dB, ratio 3:1, attack 10ms, release 120ms
 *     6. Master Limiter ceiling -1.0 dBTP
 * - Send/return Reverb bus (OFF by default; when enabled, wet max 15%, 20ms predelay, 300Hz lowcut, 6kHz highcut)
 * - Strict ADSR envelopes on all voices (attack 3-5ms, decay 150-300ms, sustain 0 or low, release 150-350ms)
 * - Stereo panning from -0.6 to +0.6, bass (<150 Hz) kept mono
 * - Audio length exactly equals video length with 0.5s fade-out at the end
 * - BS.1770 / EBU R128 loudness normalization to -14 LUFS (±0.5) and True Peak <= -1 dBTP
 */
export async function renderOfflineAudio(
  events: CollisionEvent[],
  duration: number,
  settings: AudioSettings,
  customNotes?: NoteItem[],
  slowMoSoundFeel: boolean = false
): Promise<AudioBuffer> {
  const sampleRate = 48000;
  // Render extra tail to capture clean acoustic decay
  const tailDuration = 1.5;
  const totalRenderDuration = duration + tailDuration;
  const totalRenderSamples = Math.ceil(totalRenderDuration * sampleRate);

  const offlineCtx = new OfflineAudioContext(2, totalRenderSamples, sampleRate);

  // Preload soundfont multisamples and procedural synth graphs
  SoundfontSampleManager.warmUp(offlineCtx);
  MarbleAudioSynthesizer.preloadAllSounds(offlineCtx);

  // 1. Voices Summing Bus
  const voicesBus = offlineCtx.createGain();
  voicesBus.gain.setValueAtTime(1.0, 0);

  // =========================================================================
  // CLARITY MASTER CHAIN (FIX 4: voices → EQ → compressor → limiter → output)
  // =========================================================================

  // A. High-pass at 80 Hz
  const highPass = offlineCtx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.setValueAtTime(80, 0);
  highPass.Q.setValueAtTime(0.707, 0);

  // B. Cut -3 dB at 320 Hz (Q 1.0) to remove mud / echo / "goonj"
  const mudCut = offlineCtx.createBiquadFilter();
  mudCut.type = 'peaking';
  mudCut.frequency.setValueAtTime(320, 0);
  mudCut.Q.setValueAtTime(1.0, 0);
  mudCut.gain.setValueAtTime(-3.0, 0);

  // C. Boost +2 dB presence at 3 kHz
  const presenceBoost = offlineCtx.createBiquadFilter();
  presenceBoost.type = 'peaking';
  presenceBoost.frequency.setValueAtTime(3000, 0);
  presenceBoost.Q.setValueAtTime(1.0, 0);
  presenceBoost.gain.setValueAtTime(2.0, 0);

  // D. Boost +2 dB air shelf at 10 kHz
  const airShelf = offlineCtx.createBiquadFilter();
  airShelf.type = 'highshelf';
  airShelf.frequency.setValueAtTime(10000, 0);
  airShelf.gain.setValueAtTime(2.0, 0);

  // E. Gentle compressor: threshold -18 dB, ratio 3:1, attack 10ms, release 120ms
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, 0);
  compressor.ratio.setValueAtTime(3, 0);
  compressor.attack.setValueAtTime(0.010, 0);
  compressor.release.setValueAtTime(0.120, 0);
  compressor.knee.setValueAtTime(4, 0);

  // F. Master Limiter ceiling -1.0 dBTP
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1.0, 0);
  limiter.ratio.setValueAtTime(20, 0);
  limiter.attack.setValueAtTime(0.001, 0);
  limiter.release.setValueAtTime(0.050, 0);
  limiter.knee.setValueAtTime(0, 0);

  // G. Master Gain
  const masterGain = offlineCtx.createGain();
  const safeMasterVol = Math.max(0.25, Math.min(1.0, settings.masterVolume ?? 0.85));
  masterGain.gain.setValueAtTime(safeMasterVol, 0);

  // Wire Clarity Master Chain
  voicesBus.connect(highPass);
  highPass.connect(mudCut);
  mudCut.connect(presenceBoost);
  presenceBoost.connect(airShelf);
  airShelf.connect(compressor);
  compressor.connect(limiter);

  // Optional "slow-mo sound feel": gentle low-pass (2600Hz)
  if (slowMoSoundFeel) {
    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2600, 0);
    lowpass.Q.setValueAtTime(0.707, 0);
    limiter.connect(lowpass);
    lowpass.connect(masterGain);
  } else {
    limiter.connect(masterGain);
  }
  masterGain.connect(offlineCtx.destination);

  // =========================================================================
  // REVERB SEND/RETURN BUS (FIX 3: OFF by default, send/return only, wet max 15%)
  // =========================================================================
  const reverbOn = !!(settings.reverbEnabled || (settings.reverbAmount ?? 0) > 0.05);
  if (reverbOn) {
    const reverbPreDelay = offlineCtx.createDelay();
    reverbPreDelay.delayTime.setValueAtTime(0.020, 0);

    const reverbLowCut = offlineCtx.createBiquadFilter();
    reverbLowCut.type = 'highpass';
    reverbLowCut.frequency.setValueAtTime(300, 0);

    const reverbHighCut = offlineCtx.createBiquadFilter();
    reverbHighCut.type = 'lowpass';
    reverbHighCut.frequency.setValueAtTime(6000, 0);

    const reverbConvolver = offlineCtx.createConvolver();
    // 1.0s decay decorrelated stereo impulse response
    const impulseLength = Math.floor(sampleRate * 1.0);
    const impulseBuffer = offlineCtx.createBuffer(2, impulseLength, sampleRate);
    const lChan = impulseBuffer.getChannelData(0);
    const rChan = impulseBuffer.getChannelData(1);
    for (let i = 0; i < impulseLength; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-3.5 * t);
      lChan[i] = (Math.random() * 2 - 1) * env;
      rChan[i] = (Math.random() * 2 - 1) * env;
    }
    reverbConvolver.buffer = impulseBuffer;

    const reverbReturn = offlineCtx.createGain();
    const wet = Math.min(0.15, (settings.reverbAmount ?? 0.1) * 0.15);
    reverbReturn.gain.setValueAtTime(wet, 0);

    voicesBus.connect(reverbPreDelay);
    reverbPreDelay.connect(reverbLowCut);
    reverbLowCut.connect(reverbHighCut);
    reverbHighCut.connect(reverbConvolver);
    reverbConvolver.connect(reverbReturn);
    reverbReturn.connect(highPass);
  }

  // Determine melody notes
  const melody = customNotes && customNotes.length > 0
    ? customNotes
    : (findMelodyById(settings.selectedMelodyId) || BUILTIN_MELODIES[0]).notes;

  // FIX 1: Synthesize Backing Drone ONLY if explicitly enabled (> 0.05). Default is OFF (0).
  const droneVol = settings.droneVolume ?? 0;
  if (droneVol > 0.05) {
    const baseFreq = melody.length > 0 ? melody[0].freq : 261.63;
    const oscRoot = offlineCtx.createOscillator();
    const droneGain = offlineCtx.createGain();
    const droneFilter = offlineCtx.createBiquadFilter();

    oscRoot.type = 'sine';
    oscRoot.frequency.setValueAtTime(baseFreq * 0.5, 0);

    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(280, 0);

    const safeDroneVol = Math.max(0.01, Math.min(0.08, droneVol * 0.15));
    droneGain.gain.setValueAtTime(0.0001, 0);
    droneGain.gain.linearRampToValueAtTime(safeDroneVol, 0.4);
    droneGain.gain.setValueAtTime(safeDroneVol, Math.max(0, duration - 0.5));
    droneGain.gain.linearRampToValueAtTime(0.0001, duration);

    oscRoot.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(voicesBus);

    oscRoot.start(0);
    oscRoot.stop(duration);
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
    if (!hitLimiter.allow(ev)) continue;

    // Hits scheduled with 4ms offset to prevent transient distortion
    const evTime = Math.max(0, ev.time);
    let t = evTime;
    if (lastScheduledTime >= 0) {
      t = Math.min(Math.max(evTime, lastScheduledTime + 0.004), evTime + 0.03);
    }
    lastScheduledTime = t;

    bounceCount++;

    // FIX 5: Stereo pan between -0.6 (left) and +0.6 (right) based on ball's X position on screen
    const rawPan = ev.position ? ((ev.position.x - 540) / 540) * 0.6 : 0;
    const pan = settings.stereoPanning !== false ? Math.max(-0.6, Math.min(0.6, rawPan)) : 0;

    // A. Marble Melody 3D Hit
    if (ev.extra?.marbleMelodyHit && ev.extra?.melodyNote) {
      const baseNoteVol = ev.extra.melodyNote.velocity || 0.85;
      const vol = Math.max(0.42, Math.min(1.0, baseNoteVol));
      const objType = ev.extra.objectType || 'glass_tube';

      MarbleAudioSynthesizer.playTunedHit(
        offlineCtx,
        voicesBus,
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
      if (melody.length > 0) {
        const note = melody[noteIdx % melody.length];
        noteIdx++;
        SoundSynthesizer.playNote(
          offlineCtx,
          voicesBus,
          note.freq * 2.0,
          t,
          0.55,
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
        voicesBus,
        mappedType,
        melodyNote,
        t,
        Math.max(0.42, (ev.impulse || 50) / 60),
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
        noteDuration = 0.32;
      } else if (soundMode === 'chordArp') {
        const baseNote = melody.length > 0 ? melody[noteIdx % melody.length] : { freq: 261.63 };
        noteIdx++;
        const arpMult = CHORD_ARP[bounceCount % CHORD_ARP.length];
        freq = baseNote.freq * arpMult;
        noteDuration = 0.35;
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

      let vol = 0.75;
      if (settings.volumeByImpulse && ev.impulse !== undefined) {
        vol = Math.min(1.0, Math.max(0.45, ev.impulse / 300));
      } else {
        vol = Math.max(0.45, vol);
      }

      let finalDuration = noteDuration;
      if (slowMoSoundFeel) {
        finalDuration *= 1.25;
      }

      // FIX 1: Each impact triggers the sound exactly once!
      SoundSynthesizer.playNote(
        offlineCtx,
        voicesBus,
        freq,
        t,
        finalDuration,
        settings.instrument,
        vol,
        pan
      );
    }
  }

  // Render the audio graph
  const renderedBuffer = await offlineCtx.startRendering();

  // FIX 6: Audio length exactly equals video length with a 0.5s fade-out at the end
  const exactSamples = Math.round(duration * sampleRate);
  const trimmedBuffer = new AudioBuffer({
    numberOfChannels: 2,
    length: exactSamples,
    sampleRate,
  });

  const fadeSamples = Math.round(0.5 * sampleRate); // 0.5s fade-out
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

  // FIX 4: Normalize export loudness to -14 LUFS integrated and <= -1 dBTP true peak
  normalizeAudioBufferToLufs(trimmedBuffer, -14.0, -1.0);

  return trimmedBuffer;
}
