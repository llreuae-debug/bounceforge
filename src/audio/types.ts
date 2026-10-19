export type InstrumentType =
  | 'grandPiano'
  | 'musicBox'
  | 'marimba'
  | 'square8bit'
  | 'chiptunePulse'
  | 'softPad'
  | 'pluckHarp'
  | 'bellGlock'
  | 'kalimba'
  | 'synthLead'
  | 'steelDrum'
  | 'glass'
  // 12 New Ball Sound Variations:
  | 'waterDrop'
  | 'woodblock'
  | 'sinePop'
  | 'subBass808'
  | 'metallicAnvil'
  | 'soapBubble'
  | 'japaneseKoto'
  | 'vibraphone'
  | 'celesta'
  | 'laserBounce'
  | 'guitarHarmonic'
  | 'snareRimshot'
  // 9-Instrument Selector Set:
  | 'trumpet'
  | 'saxophone'
  | 'piano'
  | 'synth'
  | 'eightBit'
  | '8bit'
  | 'pluck'
  | 'xylophone'
  | 'guitar';

export type SfxType = 'shatter' | 'crunch' | 'pop' | 'whoosh' | 'thud';

export type BallSoundMode = 'melody' | 'pentatonic' | 'chordArp' | 'pitchSpeed';

export interface NoteItem {
  note: string; // e.g. "C4", "D#4"
  midi: number; // 60
  freq: number; // 261.63
  time?: number; // optional relative beat
  duration?: number;
}

export interface AudioSettings {
  masterVolume: number;
  instrument: InstrumentType;
  sfxVolume: number;
  droneVolume: number;
  reverbAmount: number;
  reverbEnabled?: boolean;
  delayAmount?: number;
  delayEnabled?: boolean;
  sustainPedal?: boolean;
  pitchByVelocity: boolean;
  volumeByImpulse: boolean;
  selectedMelodyId: string;
  soundMode?: BallSoundMode;
  stereoPanning?: boolean;
  asmrLayer?: boolean;
}
