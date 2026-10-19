import { Midi } from './toneMidi';
import { PUBLIC_DOMAIN_MELODIES } from '../marble3d/melodyLibrary';

export interface BuiltinMidiTrack {
  id: string;
  /** Song in the melody library */
  melodyId: string;
  name: string;
  description: string;
  withDrums: boolean;
  beatsPerBar: number;
  /** GM programs for melody / bass / harmony lanes */
  programs: [number, number, number];
}

/**
 * Built-in MIDI presets. They are real Standard MIDI Files generated from the public-domain
 * and original songs in the melody library (melody, bass and harmony lanes, plus an optional
 * GM drum track), so they go through the same parser and analysis as uploaded files.
 */
export const BUILTIN_MIDI_TRACKS: BuiltinMidiTrack[] = [
  { id: 'bi_happy_birthday', melodyId: 'happy_birthday', name: 'Happy Birthday', description: 'Waltz time, piano + bass', withDrums: false, beatsPerBar: 3, programs: [0, 32, 48] },
  { id: 'bi_toybox_beat', melodyId: 'toybox_run', name: 'Toy-Box Run (with beat)', description: 'Music box melody over a kick & snare groove', withDrums: true, beatsPerBar: 4, programs: [10, 33, 88] },
  { id: 'bi_fur_elise', melodyId: 'fur_elise', name: 'Für Elise', description: 'Beethoven, solo piano feel', withDrums: false, beatsPerBar: 4, programs: [0, 32, 48] },
  { id: 'bi_canon_beat', melodyId: 'canon_in_d', name: 'Canon in D (with beat)', description: 'Pachelbel with strings and a light groove', withDrums: true, beatsPerBar: 4, programs: [46, 32, 48] },
  { id: 'bi_ode_to_joy', melodyId: 'ode_to_joy', name: 'Ode to Joy', description: 'Beethoven, bright brass lead', withDrums: true, beatsPerBar: 4, programs: [56, 33, 48] },
  { id: 'bi_eine_kleine', melodyId: 'eine_kleine_nachtmusik', name: 'Eine kleine Nachtmusik', description: 'Mozart, strings', withDrums: false, beatsPerBar: 4, programs: [40, 32, 48] },
  { id: 'bi_jingle_bells', melodyId: 'jingle_bells', name: 'Jingle Bells', description: 'Bells + bass with a beat', withDrums: true, beatsPerBar: 4, programs: [9, 33, 48] },
  { id: 'bi_lofi', melodyId: 'lofi_study_run', name: 'Lofi Study Run (original)', description: 'Soft keys with a laid-back beat', withDrums: true, beatsPerBar: 4, programs: [4, 33, 89] },
  { id: 'bi_synthwave', melodyId: 'synthwave_slide', name: 'Synthwave Slide (original)', description: 'Synth lead, pad and driving drums', withDrums: true, beatsPerBar: 4, programs: [81, 38, 89] },
  { id: 'bi_crystal', melodyId: 'crystal_cave', name: 'Crystal Cave (original)', description: 'Celesta and glassy pads, no drums', withDrums: false, beatsPerBar: 4, programs: [8, 32, 88] },
];

export function buildBuiltinMidi(id: string): { bytes: Uint8Array; fileName: string; name: string } {
  const preset = BUILTIN_MIDI_TRACKS.find((t) => t.id === id);
  if (!preset) throw new Error(`Unknown built-in track ${id}`);
  const melody = PUBLIC_DOMAIN_MELODIES.find((m) => m.id === preset.melodyId);
  if (!melody) throw new Error(`Missing melody ${preset.melodyId}`);

  const bpm = melody.defaultBpm || 120;
  const midi = new Midi();
  midi.name = preset.name;
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [preset.beatsPerBar, 4], measures: 0 } as any);
  midi.header.update();

  const laneNames = ['Melody', 'Bass', 'Harmony'];
  for (let lane = 0; lane < 3; lane++) {
    const laneNotes = melody.notes.filter((n) => (n.lane ?? 0) === lane);
    if (!laneNotes.length) continue;
    const track = midi.addTrack();
    track.name = laneNames[lane];
    track.channel = lane;
    track.instrument.number = preset.programs[lane];
    for (const n of laneNotes) {
      track.addNote({ midi: n.midi, time: n.time, duration: Math.max(0.05, n.duration), velocity: clampVel(n.velocity ?? 0.8) });
    }
  }

  if (preset.withDrums) {
    const end = Math.max(...melody.notes.map((n) => n.time + n.duration));
    const beat = 60 / bpm;
    const drums = midi.addTrack();
    drums.name = 'Drums';
    drums.channel = 9; // GM percussion channel
    let i = 0;
    for (let t = 0; t < end - 0.05; t += beat / 2, i++) {
      const beatIdx = Math.floor(i / 2);
      const onBeat = i % 2 === 0;
      const posInBar = beatIdx % preset.beatsPerBar;
      if (onBeat && (posInBar === 0 || posInBar === 2)) drums.addNote({ midi: 36, time: t, duration: 0.1, velocity: 0.95 });
      if (onBeat && (posInBar === 1 || posInBar === 3)) drums.addNote({ midi: 38, time: t, duration: 0.1, velocity: 0.85 });
      drums.addNote({ midi: 42, time: t, duration: 0.05, velocity: onBeat ? 0.55 : 0.4 });
    }
  }

  return { bytes: midi.toArray(), fileName: `${preset.id.replace(/^bi_/, '')}.mid`, name: preset.name };
}

function clampVel(v: number): number {
  return Math.max(0.1, Math.min(1, v));
}
