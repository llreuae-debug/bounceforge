import type { DropMix, PlayerSource } from './audio';
import type { RenderOptions } from './render';
import type { Scene } from './scene';

/** Export settings/types (no heavy imports: the encoder pipeline in exporter.ts loads on demand). */
export type ExportPreset = '1080' | '1440' | '4k';

export const EXPORT_PRESETS: Record<ExportPreset, { label: string; width: number; height: number; bitrate: number; minBitrate: number }> = {
  // Encoder targets are set above the delivered minimums (1080p ≥ 12, 1440p ≥ 24, 4K ≥ 45 Mbps):
  // hardware encoders deliver roughly 80-95% of a constant-bitrate target on clean CG content
  '1080': { label: '1080p Fast', width: 1080, height: 1920, bitrate: 14e6, minBitrate: 12e6 },
  '1440': { label: '1440p', width: 1440, height: 2560, bitrate: 28e6, minBitrate: 24e6 },
  '4k': { label: '4K', width: 2160, height: 3840, bitrate: 66e6, minBitrate: 45e6 },
};

export interface ExportProgress {
  percent: number;
  etaSeconds: number;
  stage: 'audio' | 'video' | 'finishing' | 'verifying';
  fps?: number;
}

export interface ExportVerification {
  ok: boolean;
  width: number;
  height: number;
  duration: number;
  videoCodec: string;
  audioCodec: string | null;
  /** Audio vs video start offset in ms (what viewers would hear as drift) */
  driftMs: number;
  /** Audio track length minus video length in ms */
  tailMs: number;
  frames: number;
  fps: number;
  /** Largest gap between consecutive frame timestamps divided by the frame duration (1 = constant) */
  frameGapRatio: number;
  videoKbps: number;
  audioKbps: number;
  audioSampleRate: number;
  audioChannels: number;
  profile: string;
  fastStart: boolean;
  problems: string[];
}

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
  mime: string;
  ms: number;
  codec?: string;
  method: 'webcodecs-worker' | 'mediarecorder';
  verification: ExportVerification | null;
}

export interface ExportRequest {
  scene: Scene;
  render: RenderOptions;
  audio: PlayerSource;
  mix: DropMix;
  preset: ExportPreset;
  fps: 30 | 60;
  name: string;
  /** For the file name: bounceforge_[style]_[seed]_[res]_[fps]fps.mp4 */
  style: string;
  seed: number;
  use3d: boolean;
  onProgress: (p: ExportProgress) => void;
  signal: AbortSignal;
}

export function canUseWorkerExport(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
}

/** Rough upfront estimate (refined live from the measured frame rate). */
export function estimateExportSeconds(preset: ExportPreset, fps: number, duration: number): number {
  const perFrame = preset === '4k' ? 0.04 : preset === '1440' ? 0.0085 : 0.0055;
  return Math.round(duration * fps * perFrame + 3);
}

