import type { CameraMode, Material, Palette } from './render';
import type { StyleId } from './styles';
import type { DropFrequency, SyncMode } from './sync';
import type { StudioTrack } from './track';

/** One-click viral presets. Every song here is a built-in, copyright-safe library track. */
export interface ViralPreset {
  id: string;
  name: string;
  emoji: string;
  songId: string;
  style: StyleId;
  material: Material;
  palette: Palette;
  camera: CameraMode;
  mode: SyncMode;
  frequency: DropFrequency;
  slowMo: number;
  ballCount: number;
  trail: boolean;
}

export const VIRAL_PRESETS: ViralPreset[] = [
  { id: 'satisfying_piano', name: 'Satisfying Piano Drop', emoji: '🎹', songId: 'moonlight_sonata', style: 'classic', material: 'glass', palette: 'ocean', camera: 'static', mode: 'veryslow', frequency: 'bar', slowMo: 0.4, ballCount: 1, trail: true },
  { id: 'mountain_king_chaos', name: 'Mountain King Chaos', emoji: '👑', songId: 'mountain_king', style: 'split', material: 'glossy', palette: 'sunset', camera: 'orbit', mode: 'beat', frequency: 'bar', slowMo: 0.6, ballCount: 1, trail: true },
  { id: 'music_box_dreams', name: 'Music Box Dreams', emoji: '🌙', songId: 'twinkle_twinkle', style: 'rain', material: 'neon', palette: 'pastel', camera: 'static', mode: 'note', frequency: 'bar', slowMo: 0.4, ballCount: 2, trail: true },
  { id: 'festive_bells', name: 'Festive Bells', emoji: '🔔', songId: 'jingle_bells', style: 'rings', material: 'metal', palette: 'gold', camera: 'follow', mode: 'beat', frequency: 'bar', slowMo: 0.5, ballCount: 1, trail: true },
  { id: 'calm_night', name: 'Calm Night', emoji: '🌌', songId: 'clair_de_lune', style: 'bowl', material: 'glass', palette: 'ocean', camera: 'orbit', mode: 'veryslow', frequency: 'bar', slowMo: 0.3, ballCount: 1, trail: true },
  { id: 'bumblebee_rush', name: 'Bumblebee Rush', emoji: '🐝', songId: 'flight_bumblebee', style: 'pegboard', material: 'neon', palette: 'neon', camera: 'static', mode: 'beat', frequency: 'bar', slowMo: 0.7, ballCount: 1, trail: true },
  { id: 'chiptune_maze', name: 'Chiptune Maze', emoji: '👾', songId: 'bf_8bit_chiptune', style: 'maze', material: 'neon', palette: 'neon', camera: 'follow', mode: 'note', frequency: 'beat', slowMo: 0.6, ballCount: 1, trail: true },
  { id: 'peaceful_grace', name: 'Peaceful Grace', emoji: '🕊️', songId: 'amazing_grace', style: 'staircase', material: 'metal', palette: 'softGold', camera: 'follow', mode: 'veryslow', frequency: 'bar', slowMo: 0.35, ballCount: 1, trail: false },
];

/** Copy-ready description for the exported reel (music credit added automatically for built-in songs). */
export function videoDescription(track: StudioTrack, styleName: string): string {
  const lines = [`${track.title} × ${styleName} — every drop lands on the beat. 🎵`, ''];
  if (track.copyrightSafe && track.credit) {
    lines.push(
      track.credit.status === 'Public Domain'
        ? `Music: ${track.credit.title} — ${track.credit.composer} (Public Domain)`
        : `Music: ${track.credit.title} — BounceForge Original`
    );
    lines.push(`Sequenced by BounceForge. Made with BounceForge 3D.`);
  } else {
    lines.push(`Music: ${track.title} (provided by the creator)`);
    lines.push('Made with BounceForge 3D.');
  }
  lines.push('', '#satisfying #oddlysatisfying #physics #asmr #music #bounceforge');
  return lines.join('\n');
}
