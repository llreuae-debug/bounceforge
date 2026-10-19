/// <reference lib="webworker" />
import { analyzeAudioPCM } from './audioAnalysis';

self.onmessage = (e: MessageEvent<{ id: number; pcm: Float32Array; sr: number }>) => {
  const { id, pcm, sr } = e.data;
  try {
    self.postMessage({ id, result: analyzeAudioPCM(pcm, sr) });
  } catch (err: any) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
