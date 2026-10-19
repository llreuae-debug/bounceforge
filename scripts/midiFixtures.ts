import { Midi } from '../src/midi/toneMidi';

/** Standard MIDI test files for the MIDI-to-reel workflow (unit + browser tests). */

export function grooveMidi(bars = 16, bpm = 120): Uint8Array {
  const midi = new Midi();
  midi.name = 'Test Groove';
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 } as any);
  midi.header.update();
  const beat = 60 / bpm;
  const lead = midi.addTrack();
  lead.name = 'Lead';
  lead.channel = 0;
  lead.instrument.number = 0;
  const scale = [60, 62, 64, 67, 69, 72, 74, 76];
  for (let i = 0; i < bars * 8; i++) {
    lead.addNote({ midi: scale[(i * 3) % scale.length], time: i * beat * 0.5, duration: beat * 0.45, velocity: i % 4 === 0 ? 0.9 : 0.6 });
  }
  const bass = midi.addTrack();
  bass.name = 'Bass';
  bass.channel = 1;
  bass.instrument.number = 33;
  for (let b = 0; b < bars; b++) bass.addNote({ midi: 36 + (b % 2) * 5, time: b * 4 * beat, duration: beat * 3.5, velocity: 0.8 });
  const drums = midi.addTrack();
  drums.name = 'Drums';
  drums.channel = 9;
  for (let i = 0; i < bars * 4; i++) {
    const t = i * beat;
    if (i % 2 === 0) drums.addNote({ midi: 36, time: t, duration: 0.1, velocity: 0.95 });
    else drums.addNote({ midi: 38, time: t, duration: 0.1, velocity: 0.85 });
    drums.addNote({ midi: 42, time: t + beat / 2, duration: 0.05, velocity: 0.4 });
  }
  return midi.toArray();
}

/** 100 BPM for 4 bars, then 140 BPM */
export function tempoChangeMidi(): Uint8Array {
  const midi = new Midi();
  midi.name = 'Tempo Change';
  const ppq = midi.header.ppq;
  midi.header.tempos.push({ ticks: 0, bpm: 100 } as any);
  midi.header.tempos.push({ ticks: ppq * 16, bpm: 140 } as any);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 } as any);
  midi.header.update();
  const t = midi.addTrack();
  t.name = 'Piano';
  t.instrument.number = 0;
  for (let i = 0; i < 32; i++) {
    t.addNote({ midi: 60 + (i % 8), ticks: i * ppq, durationTicks: ppq / 2, velocity: i % 4 === 0 ? 0.95 : 0.6 } as any);
  }
  return midi.toArray();
}

/** Header + tempo, tracks with no notes */
export function silentMidi(): Uint8Array {
  const midi = new Midi();
  midi.name = 'Silence';
  midi.header.setTempo(90);
  midi.header.update();
  const t = midi.addTrack();
  t.name = 'Empty';
  return midi.toArray();
}

/** ~48 notes per second for 30s */
export function denseMidi(): Uint8Array {
  const midi = new Midi();
  midi.name = 'Dense';
  midi.header.setTempo(180);
  midi.header.update();
  for (let k = 0; k < 3; k++) {
    const t = midi.addTrack();
    t.name = `Run ${k + 1}`;
    t.channel = k;
    t.instrument.number = [0, 80, 11][k];
    for (let i = 0; i < 480; i++) {
      t.addNote({ midi: 48 + ((i * 7 + k * 5) % 36), time: i * 0.0625 + k * 0.02, duration: 0.05, velocity: 0.3 + ((i * 13) % 7) / 10 });
    }
  }
  return midi.toArray();
}

/** A GM instrument with no matching synth (program 120: guitar fret noise) */
export function missingInstrumentMidi(): Uint8Array {
  const midi = new Midi();
  midi.name = 'Odd Instrument';
  midi.header.setTempo(110);
  midi.header.update();
  const t = midi.addTrack();
  t.name = 'FX';
  t.instrument.number = 120;
  for (let i = 0; i < 24; i++) t.addNote({ midi: 64 + (i % 5), time: i * 0.5, duration: 0.4, velocity: 0.8 });
  return midi.toArray();
}

export function malformedFiles(): { name: string; bytes: Uint8Array }[] {
  const good = grooveMidi(2);
  const truncated = good.slice(0, 30);
  const badHeader = new Uint8Array(good);
  badHeader[0] = 0x4e; // 'N'
  return [
    { name: 'not-midi.mid', bytes: new TextEncoder().encode('this is just a text file pretending to be midi') },
    { name: 'bad-header.mid', bytes: badHeader },
    { name: 'truncated.mid', bytes: truncated },
    { name: 'empty.mid', bytes: new Uint8Array(0) },
  ];
}
