import React, { useState, useRef } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { MidiService } from '../../audio/midiParser';
import { AudioEngine } from '../../audio/audioEngine';
import { NoteItem } from '../../audio/types';
import { createNote } from '../../audio/melodies';
import { SoundSynthesizer } from '../../audio/synth';
import { X, Play, Square, Upload, Download, Music } from 'lucide-react';

const OCTAVES = [6, 5, 4, 3];
const NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const STEPS = 32; // 32 sixteenth notes

export const MidiEditorModal: React.FC = () => {
  const { isMidiEditorOpen, setMidiEditorOpen, customNotes, setCustomNotes, audioSettings } =
    useStudioStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeNotes, setActiveNotes] = useState<NoteItem[]>(
    customNotes.length > 0 ? customNotes : AudioEngine.getInstance().getCurrentMelody().notes
  );

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewTimerRef = useRef<any>(null);

  if (!isMidiEditorOpen) return null;

  // Check if a note exists at a given pitch and step
  const hasNote = (noteName: string, stepIndex: number) => {
    return activeNotes.some((n, idx) => (idx % STEPS) === stepIndex && n.note === noteName);
  };

  const toggleNote = (noteName: string, stepIndex: number) => {
    const existingIdx = activeNotes.findIndex(
      (n, idx) => (idx % STEPS) === stepIndex && n.note === noteName
    );

    if (existingIdx !== -1) {
      // Remove note
      const copy = [...activeNotes];
      copy.splice(existingIdx, 1);
      setActiveNotes(copy);
    } else {
      // Add note
      const note = createNote(noteName);
      // Play instant auditory preview of note
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        SoundSynthesizer.playNote(
          ctx,
          ctx.destination,
          note.freq,
          ctx.currentTime,
          0.3,
          audioSettings.instrument,
          0.7
        );
      } catch (e) {}

      setActiveNotes([...activeNotes, note]);
    }
  };

  const handleMidiImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result instanceof ArrayBuffer) {
        const parsed = MidiService.parseMidiFile(ev.target.result);
        if (parsed.notes.length > 0) {
          setActiveNotes(parsed.notes);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMidiExport = () => {
    const blob = MidiService.exportToMidiBlob(activeNotes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bounceforge_custom_track.mid';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    setCustomNotes(activeNotes);
    AudioEngine.getInstance().setCustomMelody(activeNotes, 'User Piano Roll');
    setMidiEditorOpen(false);
  };

  const handlePreviewPlay = () => {
    if (isPlayingPreview) {
      clearInterval(previewTimerRef.current);
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    let step = 0;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();

    previewTimerRef.current = setInterval(() => {
      if (step >= activeNotes.length) {
        clearInterval(previewTimerRef.current);
        setIsPlayingPreview(false);
        return;
      }
      const note = activeNotes[step];
      if (note) {
        SoundSynthesizer.playNote(
          ctx,
          ctx.destination,
          note.freq,
          ctx.currentTime,
          0.25,
          audioSettings.instrument,
          0.7
        );
      }
      step++;
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0c0e17] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">MIDI Piano-Roll Grid</h2>
              <p className="text-xs text-slate-400">
                Interactive step sequencer • 4 Octaves • Real-time synth audition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviewPlay}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                isPlayingPreview
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              {isPlayingPreview ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Play Preview
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Import .mid
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".mid,.midi"
              onChange={handleMidiImport}
              className="hidden"
            />

            <button
              onClick={handleMidiExport}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export .mid
            </button>

            <button
              onClick={() => setMidiEditorOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Piano Roll Grid */}
        <div className="flex-1 overflow-auto flex bg-[#07080f]">
          {/* Piano Keys Sidebar */}
          <div className="w-20 sticky left-0 z-20 bg-[#0b0d18] border-r border-white/10 select-none">
            {OCTAVES.map((oct) => (
              <div key={oct}>
                {NOTES.map((note) => {
                  const isSharp = note.includes('#');
                  return (
                    <div
                      key={`${note}${oct}`}
                      className={`h-7 px-2 flex items-center justify-end text-[10px] font-mono border-b border-white/5 ${
                        isSharp
                          ? 'bg-[#121422] text-slate-400 font-bold'
                          : 'bg-[#181b2e] text-slate-200 font-extrabold'
                      }`}
                    >
                      {note}
                      {oct}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="flex-1 min-w-[700px]">
            {OCTAVES.map((oct) => (
              <div key={oct}>
                {NOTES.map((note) => {
                  const noteName = `${note}${oct}`;
                  const isSharp = note.includes('#');
                  return (
                    <div
                      key={noteName}
                      className={`h-7 flex border-b border-white/5 ${
                        isSharp ? 'bg-[#090b14]' : 'bg-[#0e101d]'
                      }`}
                    >
                      {Array.from({ length: STEPS }).map((_, stepIdx) => {
                        const filled = hasNote(noteName, stepIdx);
                        const isBarStart = stepIdx % 4 === 0;

                        return (
                          <div
                            key={stepIdx}
                            onClick={() => toggleNote(noteName, stepIdx)}
                            className={`flex-1 border-r cursor-pointer transition-colors ${
                              isBarStart ? 'border-white/15' : 'border-white/5'
                            } ${
                              filled
                                ? 'bg-gradient-to-r from-purple-500 to-cyan-400 shadow-sm shadow-cyan-400/30'
                                : 'hover:bg-white/10'
                            }`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <span className="text-xs text-slate-400 font-mono">
            {activeNotes.length} notes scheduled
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveNotes([])}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
            >
              Apply to Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
