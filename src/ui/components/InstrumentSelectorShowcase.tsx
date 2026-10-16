import React, { useState } from 'react';
import { InstrumentType } from '../../audio/types';
import { AudioEngine } from '../../audio/audioEngine';
import { useStudioStore } from '../../store/useStudioStore';
import { Volume2, Sparkles, Play, ArrowRight, Check } from 'lucide-react';

export interface FeaturedInstrument {
  id: string;
  name: string;
  instrumentId: InstrumentType;
  emoji: string;
  category: string;
  badge?: string;
}

export const FEATURED_9_INSTRUMENTS: FeaturedInstrument[] = [
  {
    id: 'trumpet',
    name: 'Trumpet',
    instrumentId: 'trumpet',
    emoji: '🎺',
    category: 'Brass',
    badge: 'NEW',
  },
  {
    id: 'piano',
    name: 'Piano',
    instrumentId: 'grandPiano',
    emoji: '🎹',
    category: 'Acoustic',
  },
  {
    id: 'synth',
    name: 'Synth',
    instrumentId: 'synthLead',
    emoji: '🎛️',
    category: 'Analog',
  },
  {
    id: '8-bit',
    name: '8-bit',
    instrumentId: 'square8bit',
    emoji: '🎮',
    category: 'Retro NES',
  },
  {
    id: 'pluck',
    name: 'Pluck',
    instrumentId: 'pluckHarp',
    emoji: '🪕',
    category: 'String',
  },
  {
    id: 'xylophone',
    name: 'Xylophone',
    instrumentId: 'marimba',
    emoji: '🎼',
    category: 'Mallet',
  },
  {
    id: 'music-box',
    name: 'Music Box',
    instrumentId: 'musicBox',
    emoji: '🎵',
    category: 'Chime',
  },
  {
    id: 'guitar',
    name: 'Guitar',
    instrumentId: 'guitarHarmonic',
    emoji: '🎸',
    category: 'Acoustic',
  },
  {
    id: 'saxophone',
    name: 'Saxophone',
    instrumentId: 'saxophone',
    emoji: '🎷',
    category: 'Reed Jazz',
    badge: 'NEW',
  },
];

export const InstrumentSelectorShowcase: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('8-bit');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const setAudioSettings = useStudioStore((state) => state.setAudioSettings);

  const selectedInst = FEATURED_9_INSTRUMENTS.find((i) => i.id === selectedId) || FEATURED_9_INSTRUMENTS[3];

  const handleSelectInstrument = (inst: FeaturedInstrument) => {
    setSelectedId(inst.id);
    setIsPlaying(true);

    // Update global audio engine and store
    setAudioSettings({ instrument: inst.instrumentId });
    AudioEngine.getInstance().updateSettings({ instrument: inst.instrumentId });
    AudioEngine.getInstance().playAuditionRiff(inst.instrumentId);

    setTimeout(() => {
      setIsPlaying(false);
    }, 600);
  };

  const handleLaunchStudio = () => {
    setAudioSettings({ instrument: selectedInst.instrumentId });
    AudioEngine.getInstance().updateSettings({ instrument: selectedInst.instrumentId });
    window.location.href = '/studio';
  };

  return (
    <section id="instruments" className="relative py-24 bg-[#0a0d14] overflow-hidden border-b border-white/10 select-none">
      {/* Decorative ambient background glows & arcs matching screenshot */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[130px] pointer-events-none" />
      
      {/* Subtle arc line visible in screenshot */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50%" cy="50%" r="480" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 8" />
      </svg>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Exactly reproduces the reference screenshot modal card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-[#161922] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
                  Step 2: Choose an instrument
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] font-mono text-pink-400">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Live Audition
                </div>
              </div>

              {/* 3x3 Instrument Grid */}
              <div className="grid grid-cols-3 gap-3">
                {FEATURED_9_INSTRUMENTS.map((inst) => {
                  const isSelected = selectedId === inst.id;
                  return (
                    <button
                      key={inst.id}
                      onClick={() => handleSelectInstrument(inst)}
                      className={`relative flex flex-col items-center justify-center h-24 rounded-xl transition-all duration-200 group ${
                        isSelected
                          ? 'bg-[#252a38] border-2 border-white shadow-[0_0_18px_rgba(255,255,255,0.22)] scale-[1.02] text-white z-10'
                          : 'bg-[#1e222d] border border-white/5 hover:border-white/20 hover:bg-[#252a38]/60 text-slate-300'
                      }`}
                    >
                      {/* Optional Badge */}
                      {inst.badge && (
                        <span className="absolute top-1.5 right-1.5 px-1 py-0.2 bg-gradient-to-r from-pink-500 to-rose-500 text-[8px] font-extrabold text-white rounded leading-none uppercase">
                          {inst.badge}
                        </span>
                      )}

                      {/* Icon */}
                      <span className="text-2xl mb-1.5 transition-transform group-hover:scale-110 filter drop-shadow">
                        {inst.emoji}
                      </span>

                      {/* Label */}
                      <span className={`text-xs font-medium tracking-tight ${isSelected ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {inst.name}
                      </span>

                      {/* Active indicator dot */}
                      {isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Real-time audition preview pill */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Auditioning: <strong className="text-white">{selectedInst.name}</strong></span>
                </span>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {isPlaying ? '♪ Playing Arpeggio...' : 'Click to hear note'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Exact Hot Pink Headline & Text from Screenshot */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-mono font-bold text-pink-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              HOT FEATURE
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#ff007f] drop-shadow-[0_0_30px_rgba(255,0,127,0.35)] leading-none">
              INSTRUMENT SELECTOR
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              Switch sound styles instantly. Choose from up to 9 instruments. With a single click, swap from a soothing classic piano to a retro 8-bit synthesizer or a music box, all without interrupting the 2D physics simulation.
            </p>

            {/* Feature highlights bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 font-medium">100% Procedural Web Audio (Zero external audio samples)</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 font-medium">Seamless mid-simulation switching without physics hiccup</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={handleLaunchStudio}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff007f] to-purple-600 hover:from-[#ff1a8c] hover:to-purple-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(255,0,127,0.4)] flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>Open Studio with {selectedInst.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSelectInstrument(selectedInst)}
                className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 text-pink-400" />
                <span>Play Sound Sample</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
