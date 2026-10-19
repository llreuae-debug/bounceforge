import { Midi } from '@tonejs/midi';
import { NoteItem } from './types';
import { midiToFreq } from './melodies';

export class MidiService {
  /**
   * Parse an ArrayBuffer of a .mid file into NoteItem[]
   */
  static parseMidiFile(arrayBuffer: ArrayBuffer): { title: string; notes: NoteItem[] } {
    try {
      const midi = new Midi(arrayBuffer);
      const title = midi.name || 'Imported MIDI';

      // Pick the track with the most notes
      let bestTrack = midi.tracks[0];
      for (const track of midi.tracks) {
        if (track.notes.length > (bestTrack?.notes?.length ?? 0)) {
          bestTrack = track;
        }
      }

      if (!bestTrack || bestTrack.notes.length === 0) {
        return { title, notes: [] };
      }

      // FIX 1: Sort notes by time, treat velocity 0 as note-off, force max duration of 1.5s
      const sorted = [...bestTrack.notes]
        .filter((n) => (n.velocity ?? 1) > 0)
        .sort((a, b) => a.time - b.time);

      const notes: NoteItem[] = sorted.map((n) => {
        const rawDur = n.duration && n.duration > 0 ? n.duration : 0.4;
        const dur = Math.min(1.5, Math.max(0.05, rawDur));
        return {
          note: n.name,
          midi: n.midi,
          freq: midiToFreq(n.midi),
          time: n.time,
          duration: dur,
        };
      });

      return { title, notes };
    } catch (e) {
      console.error('Failed to parse MIDI file:', e);
      return { title: 'Unknown', notes: [] };
    }
  }

  /**
   * Export NoteItem[] back into a downloadable .mid file blob
   */
  static exportToMidiBlob(notes: NoteItem[], bpm: number = 120): Blob {
    const midi = new Midi();
    midi.header.setTempo(bpm);
    const track = midi.addTrack();
    track.name = 'BounceForge Track';

    let currentTime = 0;
    for (const n of notes) {
      const startTime = n.time !== undefined ? n.time : currentTime;
      const dur = n.duration || 0.4;
      track.addNote({
        midi: n.midi,
        time: startTime,
        duration: dur,
      });
      currentTime += 0.25; // default step
    }

    return new Blob([midi.toArray() as unknown as BlobPart], { type: 'audio/midi' });
  }
}
