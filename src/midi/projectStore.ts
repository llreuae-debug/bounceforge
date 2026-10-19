import { get, set, del } from 'idb-keyval';
import type { ReelMix, ReelOptions, ReelPhysicsSettings } from './types';

/** Saved MIDI reel projects (IndexedDB): the MIDI bytes plus every setting needed to rebuild the reel. */
export interface MidiReelProject {
  id: string;
  name: string;
  fileName: string;
  midiBytes: ArrayBuffer;
  options: ReelOptions;
  physics: ReelPhysicsSettings;
  mix: ReelMix;
  mode: 'auto' | 'custom';
  dropEdits: Record<number, { muted?: boolean; nudge?: number }>;
  savedAt: number;
}

export interface MidiReelProjectMeta {
  id: string;
  name: string;
  fileName: string;
  savedAt: number;
  targetDuration: number;
}

const INDEX_KEY = 'bounceforge_midi_reel_index';
const projectKey = (id: string) => `bounceforge_midi_reel_${id}`;

export async function listMidiProjects(): Promise<MidiReelProjectMeta[]> {
  try {
    const list = ((await get(INDEX_KEY)) as MidiReelProjectMeta[] | undefined) || [];
    return [...list].sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function saveMidiProject(p: MidiReelProject): Promise<void> {
  await set(projectKey(p.id), p);
  const list = (await listMidiProjects()).filter((m) => m.id !== p.id);
  list.unshift({ id: p.id, name: p.name, fileName: p.fileName, savedAt: p.savedAt, targetDuration: p.options.targetDuration });
  await set(INDEX_KEY, list.slice(0, 30));
}

export async function loadMidiProject(id: string): Promise<MidiReelProject | null> {
  try {
    return ((await get(projectKey(id))) as MidiReelProject | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteMidiProject(id: string): Promise<void> {
  await del(projectKey(id));
  const list = (await listMidiProjects()).filter((m) => m.id !== id);
  await set(INDEX_KEY, list);
}
