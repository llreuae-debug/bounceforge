import * as ToneMidi from '@tonejs/midi';
import type { Midi as MidiType } from '@tonejs/midi';

/**
 * @tonejs/midi is CommonJS: Vite exposes the named export, Node's ESM loader only the default.
 * Resolve the class either way so the MIDI code runs in the browser and in headless tests.
 */
export const Midi: typeof MidiType =
  (ToneMidi as any).Midi || (ToneMidi as any).default?.Midi || (ToneMidi as any).default;
export type Midi = MidiType;
