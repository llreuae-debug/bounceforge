import { get, set } from 'idb-keyval';
import { analyzeMidi } from '../midi/analyzeMidi';
import type { MidiAnalysis } from '../midi/types';
import { analyzeAudioPCM, type AudioAnalysis } from './audioAnalysis';
import { energyPerBeat, REEL_SECONDS } from './library/compile';
import { detectSections, type StudioTrack, type TrackNote } from './track';

/** SHA-256 of the file bytes: analysis is cached per file so a track is never analysed twice. */
export async function fileHash(bytes: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const d = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (non-secure context): FNV-1a
  let h = 0x811c9dc5;
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
  return `fnv${(h >>> 0).toString(16)}_${u.length}`;
}

async function cached<T>(key: string, make: () => Promise<T> | T): Promise<{ value: T; fromCache: boolean }> {
  try {
    const hit = await get<T>(key);
    if (hit) return { value: hit, fromCache: true };
  } catch {
    /* IndexedDB unavailable (private mode): just compute */
  }
  const value = await make();
  try {
    await set(key, value);
  } catch {
    /* ignore */
  }
  return { value, fromCache: false };
}

// ---------- MIDI uploads ----------

export function isMidiFile(name: string): boolean {
  return /\.(mid|midi)$/i.test(name);
}
export function isAudioFile(name: string): boolean {
  return /\.(mp3|wav|wave|m4a|ogg)$/i.test(name);
}

/**
 * Uploaded MIDI → reel track. Notes and beats come straight from the file (no audio analysis).
 * The melody lane is the busiest high non-drum track. Short songs loop by whole bars to fill 60s.
 */
export function midiToTrack(a: MidiAnalysis, startAt = 0, reelSeconds = REEL_SECONDS): StudioTrack {
  const tracks = a.tracks.filter((t) => !t.isDrum && t.noteCount > 0);
  const melodyTrack = tracks.sort((x, y) => y.highestMidi + y.noteCount * 0.02 - (x.highestMidi + x.noteCount * 0.02))[0]?.index ?? -1;
  const downs = a.beats.filter((b) => b.isDownbeat).map((b) => b.time);
  const start = downs.length ? downs.reduce((best, t) => (Math.abs(t - startAt) < Math.abs(best - startAt) ? t : best), downs[0]) : 0;
  const end = a.duration;
  // Loop length: whole bars from start to the end of the music
  const lastDown = downs.filter((t) => t > start && t <= end + 0.05).pop();
  const loopLen = Math.max(1, (lastDown !== undefined && end - lastDown < 0.3 ? lastDown : end) - start);

  const notes: TrackNote[] = [];
  const beats: number[] = [];
  const downbeats: boolean[] = [];
  for (let off = 0; off < reelSeconds; off += loopLen) {
    for (const n of a.notes) {
      if (n.time < start || n.time >= start + loopLen) continue;
      const t = n.time - start + off;
      if (t >= reelSeconds) continue;
      notes.push({ t, d: Math.min(n.duration, reelSeconds - t), midi: n.midi, vel: n.velocity, lane: n.isDrum ? 2 : n.trackIndex === melodyTrack ? 0 : 1, isDrum: n.isDrum });
    }
    for (const b of a.beats) {
      if (b.time < start - 1e-6 || b.time >= start + loopLen - 1e-6) continue;
      const t = b.time - start + off;
      if (t >= reelSeconds) continue;
      beats.push(t);
      downbeats.push(b.isDownbeat);
    }
  }
  notes.sort((x, y) => x.t - y.t);
  const beatEnergy = energyPerBeat(beats, notes, reelSeconds);
  return {
    id: `upload-midi:${a.fileName}`,
    title: a.name || a.fileName,
    source: 'upload-midi',
    copyrightSafe: false,
    mood: a.bpm < 90 ? 'Calm' : 'Happy',
    bpm: a.bpm,
    beatsPerBar: a.timeSignature[0] || 4,
    duration: reelSeconds,
    beats,
    downbeats,
    beatEnergy,
    notes,
    sections: detectSections(beats, downbeats, beatEnergy, reelSeconds),
    instrument: 'piano',
  };
}

export const MAX_MIDI_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 20 * 60;

export async function analyzeMidiUpload(file: File): Promise<{ analysis: MidiAnalysis; hash: string; ms: number }> {
  const t0 = performance.now();
  if (!file.size) throw new Error(`"${file.name}" is empty.`);
  if (file.size > MAX_MIDI_BYTES) throw new Error(`"${file.name}" is larger than 8 MB, which is unusual for MIDI. Please choose a smaller file.`);
  const bytes = await file.arrayBuffer();
  const hash = await fileHash(bytes);
  // MIDI parsing is a few ms, but cache it anyway so re-opening a file is instant
  const { value } = await cached(`dropstudio:midi:${hash}`, () => analyzeMidi(new Uint8Array(bytes), file.name));
  return { analysis: value, hash, ms: performance.now() - t0 };
}

// ---------- Audio uploads ----------

let worker: Worker | null = null;
let workerId = 1;

function analyzeInWorker(pcm: Float32Array, sr: number): Promise<AudioAnalysis> {
  if (typeof Worker === 'undefined') return Promise.resolve(analyzeAudioPCM(pcm, sr));
  if (!worker) {
    try {
      worker = new Worker(new URL('./audioAnalysis.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return Promise.resolve(analyzeAudioPCM(pcm, sr));
    }
  }
  const id = workerId++;
  const w = worker;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      w.removeEventListener('message', onMsg);
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result);
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ id, pcm, sr }, [pcm.buffer]);
  });
}

export interface AudioUpload {
  buffer: AudioBuffer;
  analysis: AudioAnalysis;
  hash: string;
  fromCache: boolean;
  ms: number;
}

/** Decode (native), downmix to mono at 22.05kHz (native resampler), analyse in a worker, cache by hash. */
export async function analyzeAudioUpload(file: File, onStage: (label: string, fraction: number) => void = () => {}): Promise<AudioUpload> {
  const t0 = performance.now();
  if (!file.size) throw new Error(`"${file.name}" is empty.`);
  if (file.size > MAX_AUDIO_BYTES) throw new Error(`"${file.name}" is larger than 150 MB. Please use a shorter or compressed (MP3) file.`);
  onStage('Reading file…', 0.05);
  const bytes = await file.arrayBuffer();
  const hash = await fileHash(bytes);
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  const decoder = new AC() as AudioContext;
  let buffer: AudioBuffer;
  onStage('Decoding audio…', 0.2);
  try {
    buffer = await decoder.decodeAudioData(bytes.slice(0));
  } catch {
    throw new Error(`"${file.name}" could not be decoded. Use an MP3 or WAV file.`);
  } finally {
    void decoder.close();
  }
  if (buffer.duration > MAX_AUDIO_SECONDS) throw new Error(`"${file.name}" is ${Math.round(buffer.duration / 60)} minutes long. The limit is 20 minutes.`);
  onStage('Downmixing to mono 22 kHz…', 0.45);
  const { value, fromCache } = await cached(`dropstudio:audio:${hash}`, async () => {
    const sr = 22050;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buffer.duration * sr)), sr);
    const node = off.createBufferSource();
    node.buffer = buffer;
    node.connect(off.destination);
    node.start();
    const mono = await off.startRendering();
    onStage('Detecting beats…', 0.7);
    return analyzeInWorker(new Float32Array(mono.getChannelData(0)), sr);
  });
  onStage(fromCache ? 'Loaded from cache' : 'Done', 1);
  return { buffer, analysis: value, hash, fromCache, ms: performance.now() - t0 };
}

export function audioToTrack(name: string, up: AudioUpload, startAt = 0, reelSeconds = REEL_SECONDS): StudioTrack {
  const a = up.analysis;
  const downs = a.beats.filter((_, i) => a.downbeats[i]);
  const start = downs.length ? downs.reduce((best, t) => (Math.abs(t - startAt) < Math.abs(best - startAt) ? t : best), downs[0]) : 0;
  const dur = Math.min(reelSeconds, Math.max(1, a.duration - start));
  const beats: number[] = [];
  const downbeats: boolean[] = [];
  const beatEnergy: number[] = [];
  a.beats.forEach((t, i) => {
    if (t < start - 1e-6 || t - start >= dur) return;
    beats.push(t - start);
    downbeats.push(a.downbeats[i]);
    beatEnergy.push(a.beatEnergy[i]);
  });
  const bins = a.waveform.length;
  const from = Math.floor((start / a.duration) * bins);
  const to = Math.min(bins, Math.ceil(((start + dur) / a.duration) * bins));
  return {
    id: `upload-audio:${up.hash.slice(0, 12)}`,
    title: name.replace(/\.[^.]+$/, ''),
    source: 'upload-audio',
    copyrightSafe: false,
    mood: a.bpm < 90 ? 'Calm' : 'Happy',
    bpm: a.bpm,
    beatsPerBar: 4,
    duration: dur,
    beats,
    downbeats,
    beatEnergy,
    notes: [],
    sections: detectSections(beats, downbeats, beatEnergy, dur),
    instrument: 'piano',
    audio: up.buffer,
    waveform: Float32Array.from(a.waveform.slice(from, to)),
    audioOffset: start,
  };
}
