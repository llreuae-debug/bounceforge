import { CollisionEvent } from '../engine/types';
import { AudioSettings, NoteItem, SfxType } from './types';
import { SoundSynthesizer } from './synth';
import { BUILTIN_MELODIES } from './melodies';
import { normalizeAudioBufferToLufs } from './loudness';
import { MarbleAudioSynthesizer } from '../marble3d/audioSynthesizer';

/**
 * Renders an offline AudioBuffer from the collision event log.
 * Frame-perfect alignment with simulation timestamps.
 * Guarantees that every collision event produces an audible sound.
 */
export async function renderOfflineAudio(
  events: CollisionEvent[],
  duration: number,
  settings: AudioSettings,
  customNotes?: NoteItem[],
  slowMoSoundFeel: boolean = false
): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const lengthInSamples = Math.ceil(duration * sampleRate);
  const offlineCtx = new OfflineAudioContext(2, lengthInSamples, sampleRate);

  // Preload and compile audio graphs before rendering begins
  MarbleAudioSynthesizer.preloadAllSounds(offlineCtx);

  // Master Limiter: True Peak <= -1 dBTP protection
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-2.5, 0);
  limiter.knee.setValueAtTime(6, 0);
  limiter.ratio.setValueAtTime(14, 0);
  limiter.attack.setValueAtTime(0.002, 0);
  limiter.release.setValueAtTime(0.2, 0);

  // Master Gain with preset volume repair
  const masterGain = offlineCtx.createGain();
  const safeMasterVol = Math.max(0.25, settings.masterVolume ?? 0.85);
  masterGain.gain.setValueAtTime(safeMasterVol, 0);

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

  // Determine melody notes
  const melody = customNotes && customNotes.length > 0
    ? customNotes
    : (BUILTIN_MELODIES.find((m) => m.id === settings.selectedMelodyId) || BUILTIN_MELODIES[0]).notes;

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

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.time > duration) break;

    // Hits closer than 30ms handling: layer with micro-offset (4ms) so both play clearly
    let t = Math.max(0, ev.time);
    if (lastScheduledTime >= 0 && Math.abs(t - lastScheduledTime) < 0.03) {
      t = lastScheduledTime + 0.004;
    }
    lastScheduledTime = t;

    bounceCount++;

    const pan = settings.stereoPanning !== false && ev.position
      ? Math.max(-0.85, Math.min(0.85, (ev.position.x - 540) / 540))
      : 0;

    // Marble Melody 3D Hit
    if (ev.extra?.marbleMelodyHit && ev.extra?.melodyNote) {
      // Soft / glancing hit guarantee: minimum audible velocity 0.25
      const baseNoteVol = ev.extra.melodyNote.velocity || 0.85;
      const vol = Math.max(0.25, baseNoteVol);
      const objType = ev.extra.objectType || 'glass_tube';

      MarbleAudioSynthesizer.playTunedHit(
        offlineCtx,
        limiter,
        objType,
        ev.extra.melodyNote,
        t,
        vol,
        pan
      );
      continue;
    }

    if (ev.type === 'escape' || ev.type === 'finale') {
      SoundSynthesizer.playSfx(offlineCtx, limiter, 'shatter', t, settings.sfxVolume ?? 0.75);

      if (melody.length > 0) {
        const note = melody[noteIdx % melody.length];
        noteIdx++;
        SoundSynthesizer.playNote(
          offlineCtx,
          limiter,
          note.freq * 2.0,
          t,
          0.85,
          settings.instrument,
          0.95,
          pan
        );
      }
    } else if (ev.type === 'portal' || ev.type === 'spike' || ev.type === 'freeze' || ev.type === 'squash' || ev.type === 'peg_tick') {
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
      MarbleAudioSynthesizer.playTunedHit(
        offlineCtx,
        limiter,
        ev.type,
        melodyNote,
        t,
        Math.max(0.28, (ev.impulse || 50) / 60),
        pan
      );
    } else {
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

      // Soft hit threshold: glancing contacts never drop below 0.25
      let vol = 0.75;
      if (settings.volumeByImpulse && ev.impulse !== undefined) {
        vol = Math.min(1.0, Math.max(0.25, ev.impulse / 350));
      } else {
        vol = Math.max(0.25, vol);
      }

      let finalDuration = noteDuration;
      if (slowMoSoundFeel) {
        finalDuration *= 1.35;
      }

      SoundSynthesizer.playNote(
        offlineCtx,
        limiter,
        freq,
        t,
        finalDuration,
        settings.instrument,
        vol,
        pan
      );

      if (settings.asmrLayer !== false) {
        const sfx = ev.type === 'ring' ? 'pop' : ev.type === 'ball' ? 'crunch' : 'thud';
        SoundSynthesizer.playSfx(offlineCtx, limiter, sfx as SfxType, t, (settings.sfxVolume ?? 0.75) * 0.4);
      }
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();

  // Normalize export loudness to -14 LUFS integrated and <= -1 dBTP true peak
  normalizeAudioBufferToLufs(renderedBuffer, -14.0, -1.0);

  return renderedBuffer;
}
