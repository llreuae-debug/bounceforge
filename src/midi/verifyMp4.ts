import { Input, BufferSource, ALL_FORMATS } from 'mediabunny';

export interface Mp4Check {
  ok: boolean;
  width: number;
  height: number;
  duration: number;
  videoCodec: string;
  audioCodec: string | null;
  audioChannels: number;
  sizeBytes: number;
  problems: string[];
}

/**
 * Reads the finished file back and checks what was actually written: dimensions, duration,
 * video codec and an audio track. An export is only marked complete when this passes.
 */
export async function verifyMp4(blob: Blob, expected: { width: number; height: number; duration: number }): Promise<Mp4Check> {
  const problems: string[] = [];
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(await blob.arrayBuffer()) });
  const video = await input.getPrimaryVideoTrack();
  const audioTracks = await input.getAudioTracks();
  const width = video ? await video.getDisplayWidth() : 0;
  const height = video ? await video.getDisplayHeight() : 0;
  const videoCodec = (video && (await video.getCodec())) || 'none';
  const audio = audioTracks[0] ?? null;
  const audioCodec = audio ? (await audio.getCodec()) || 'unknown' : null;
  const audioChannels = audio ? await audio.getNumberOfChannels() : 0;
  let duration = 0;
  try {
    duration = await input.computeDuration();
  } catch {}

  if (!video) problems.push('No video track in the file.');
  if (width !== expected.width || height !== expected.height) {
    problems.push(`Video is ${width}×${height}, expected ${expected.width}×${expected.height}.`);
  }
  if (Math.abs(duration - expected.duration) > 0.25) {
    problems.push(`Duration is ${duration.toFixed(2)}s, expected ${expected.duration.toFixed(2)}s.`);
  }
  if (!audio) problems.push('No audio track in the file.');

  return {
    ok: problems.length === 0,
    width,
    height,
    duration,
    videoCodec: String(videoCodec),
    audioCodec: audioCodec ? String(audioCodec) : null,
    audioChannels,
    sizeBytes: blob.size,
    problems,
  };
}
