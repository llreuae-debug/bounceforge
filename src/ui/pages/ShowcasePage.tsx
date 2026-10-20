import React, { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { useStudioStore } from '../../store/useStudioStore';
import { showcaseService, ShowcaseItem } from '../../showcase/showcaseService';
import {
  Sparkles,
  Heart,
  Eye,
  Music,
  Sliders,
  VolumeX,
} from 'lucide-react';
import { triggerHaptic } from '../../platform/haptics';

export const ShowcasePage: React.FC = () => {
  const { setRoute, setMode, setSeed } = useStudioStore();
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    showcaseService.getShowcaseItems().then(setItems);
  }, []);

  const handleLaunchSeed = (item: ShowcaseItem) => {
    triggerHaptic(15);
    setMode(item.modeId);
    setSeed(item.seed);
    setRoute('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Page Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-xs font-mono text-pink-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Viral Creations Gallery
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Made with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-[#CCFF00]">BounceForge</span>
          </h1>
          <p className="text-sm text-slate-300">
            Real simulation videos generated and exported in 4K with BounceForge. Hover or tap any video to preview muted playback.
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group rounded-3xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 overflow-hidden flex flex-col transition-all duration-300 shadow-xl hover:shadow-cyan-500/10"
            >
              {/* Video Preview Container (9:16 Aspect Ratio) */}
              <div className="relative aspect-[9/16] max-h-[480px] bg-black overflow-hidden flex items-center justify-center">
                {hoveredId === item.id ? (
                  <video
                    src={item.videoUrl}
                    poster={item.posterUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover transition-transform duration-500 scale-105"
                  />
                ) : (
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Sound & Views Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                    <Music className="w-3 h-3 text-cyan-400" />
                    <span>{item.sound}</span>
                  </div>

                  <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                    <VolumeX className="w-3 h-3 text-slate-400" />
                    <span>MUTED</span>
                  </div>
                </div>

                {/* Overlay Play / Launch Button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <button
                    onClick={() => handleLaunchSeed(item)}
                    className="w-full py-2.5 rounded-xl btn-3d-cyan text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transform transition-transform group-hover:scale-[1.02]"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Open Seed #{item.seed} in Studio</span>
                  </button>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span className="text-[#CCFF00] font-bold uppercase">{item.modeName}</span>
                    <span>Seed #{item.seed}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    {item.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-pink-400" />
                    {item.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};
