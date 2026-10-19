import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { ModeGallery } from './panels/ModeGallery';
import { StudioCanvas } from './StudioCanvas';
import { SettingsPanel } from './panels/SettingsPanel';
import { OnboardingModal } from './modals/OnboardingModal';
import { ShortcutsModal } from './modals/ShortcutsModal';
import { useStudioStore } from '../store/useStudioStore';
import { ALL_MODES } from '../modes/registry';
import { triggerHaptic } from '../platform/haptics';
import { useI18n } from '../i18n';

// Lazy-load heavy export pipelines and interactive editors for fast 3s initial load
const ExportModal = React.lazy(() =>
  import('./modals/ExportModal').then((m) => ({ default: m.ExportModal }))
);
const MidiEditorModal = React.lazy(() =>
  import('./modals/MidiEditorModal').then((m) => ({ default: m.MidiEditorModal }))
);
const SeedFinderModal = React.lazy(() =>
  import('./modals/SeedFinderModal').then((m) => ({ default: m.SeedFinderModal }))
);
const ExportSelfTestModal = React.lazy(() =>
  import('./modals/ExportSelfTestModal').then((m) => ({ default: m.ExportSelfTestModal }))
);
const SoundCheckModal = React.lazy(() =>
  import('./modals/SoundCheckModal').then((m) => ({ default: m.SoundCheckModal }))
);
import {
  Sliders,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';

export const Studio: React.FC = () => {
  const {
    isExportOpen,
    isMidiEditorOpen,
    isSeedFinderOpen,
    isSelfTestOpen,
    setSelfTestOpen,
    isSoundCheckOpen,
    setSoundCheckOpen,
    currentModeId,
    setMode,
    setExportOpen,
  } = useStudioStore();
  const { isRTL } = useI18n();

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [windowHeight, setWindowHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isMobileModesOpen, setIsMobileModesOpen] = useState(false);
  const [collapseLeft, setCollapseLeft] = useState(false);
  const [collapseRight, setCollapseRight] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isPhonePortrait = windowWidth < 600 && windowHeight >= windowWidth;
  const isPhoneLandscape = windowHeight < 600 && windowWidth > windowHeight;
  const isTabletPortrait = windowWidth >= 600 && windowWidth < 1024 && windowHeight >= windowWidth;
  const isTabletLandscape = windowWidth >= 1024 && windowWidth < 1440;

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#050608] overflow-hidden select-none safe-top safe-bottom safe-left safe-right">
      {/* Top Header */}
      <Header />

      {/* PHONE PORTRAIT LAYOUT (<600px) */}
      {isPhonePortrait ? (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Horizontal Mode Chips Row */}
          <div className="h-11 bg-[#07090e] border-b border-white/10 flex items-center px-3 gap-1.5 overflow-x-auto scrollbar-none shrink-0 z-20">
            {ALL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  triggerHaptic(10);
                  setMode(mode.id);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  currentModeId === mode.id
                    ? 'btn-3d-lime text-black'
                    : 'btn-3d-glass text-slate-300 hover:text-white'
                }`}
              >
                {mode.name}
              </button>
            ))}
          </div>

          {/* Full Screen Preview */}
          <div className="flex-1 min-h-0 relative flex flex-col">
            <StudioCanvas />
          </div>

          {/* Floating Mobile Action Buttons */}
          <div className="fixed bottom-5 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
            {/* Open Settings Bottom Sheet Button */}
            <button
              onClick={() => {
                triggerHaptic(10);
                setIsMobileSettingsOpen(true);
              }}
              className="pointer-events-auto btn-3d-glass px-4 py-2.5 rounded-full text-white font-bold text-xs backdrop-blur-xl flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5 text-[#CCFF00]" />
              <span>settings</span>
            </button>

            {/* Floating Render Video Pill */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setExportOpen(true);
              }}
              className="pointer-events-auto btn-3d-lime px-5 py-2.5 rounded-full text-black font-black text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>render</span>
            </button>
          </div>

          {/* Mobile Bottom Sheet for Settings */}
          {isMobileSettingsOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end">
              <div className="bg-[#090b12] border-t border-white/15 rounded-t-3xl max-h-[82dvh] flex flex-col overflow-hidden shadow-2xl">
                {/* Pull Handle */}
                <div className="w-full py-2.5 flex justify-center shrink-0 cursor-pointer" onClick={() => setIsMobileSettingsOpen(false)}>
                  <div className="w-12 h-1.5 rounded-full bg-white/20" />
                </div>

                <div className="flex-1 overflow-y-auto">
                  <SettingsPanel
                    className="w-full h-full border-none bg-transparent flex flex-col select-none font-sans"
                    onClose={() => setIsMobileSettingsOpen(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isPhoneLandscape ? (
        /* PHONE LANDSCAPE: Canvas on left, settings on right */
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 h-full min-h-0 flex flex-col">
            <StudioCanvas />
          </div>
          <div className="w-72 h-full border-l border-white/10 shrink-0 overflow-y-auto">
            <SettingsPanel className="w-full h-full border-none bg-[#07090e]/95 flex flex-col font-sans" />
          </div>
        </div>
      ) : isTabletPortrait ? (
        /* TABLET PORTRAIT: Preview top, modes + settings 2-column bottom */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-[52%] min-h-0">
            <StudioCanvas />
          </div>
          <div className="flex-1 border-t border-white/10 flex min-h-0 bg-[#07090e]">
            <div className="w-1/2 border-r border-white/10 h-full overflow-y-auto">
              <ModeGallery className="w-full h-full border-none bg-transparent flex flex-col" />
            </div>
            <div className="w-1/2 h-full overflow-y-auto">
              <SettingsPanel className="w-full h-full border-none bg-transparent flex flex-col font-sans" />
            </div>
          </div>
        </div>
      ) : (
        /* DESKTOP & TABLET LANDSCAPE: 3 columns with collapsible panels & max-w-2400 */
        <main className={`flex-1 flex overflow-hidden max-w-[2400px] mx-auto w-full relative ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Left: Mode Gallery with collapse toggle */}
          {!collapseLeft && (
            <div className="relative">
              <ModeGallery />
              {isTabletLandscape && (
                <button
                  onClick={() => setCollapseLeft(true)}
                  className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs"
                  title="Collapse modes"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {collapseLeft && (
            <button
              onClick={() => setCollapseLeft(false)}
              className="w-8 border-r border-white/10 bg-[#07090e] hover:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Expand modes panel"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="text-[10px] [writing-mode:vertical-lr] mt-3 font-bold uppercase tracking-widest">
                modes
              </span>
            </button>
          )}

          {/* Center: Live 9:16 Canvas Viewport */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <StudioCanvas />
          </div>

          {/* Right: Settings Panel with collapse toggle */}
          {collapseRight && (
            <button
              onClick={() => setCollapseRight(false)}
              className="w-8 border-l border-white/10 bg-[#07090e] hover:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Expand settings panel"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] [writing-mode:vertical-lr] mt-3 font-bold uppercase tracking-widest">
                settings
              </span>
            </button>
          )}

          {!collapseRight && (
            <div className="relative">
              <SettingsPanel />
              {isTabletLandscape && (
                <button
                  onClick={() => setCollapseRight(true)}
                  className="absolute left-2 top-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs"
                  title="Collapse settings"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </main>
      )}

      {/* Modals & Lazy-Loaded Overlays */}
      <React.Suspense fallback={null}>
        {isExportOpen && <ExportModal />}
        {isMidiEditorOpen && <MidiEditorModal />}
        {isSeedFinderOpen && <SeedFinderModal />}
        {isSelfTestOpen && (
          <ExportSelfTestModal isOpen={isSelfTestOpen} onClose={() => setSelfTestOpen(false)} />
        )}
        {isSoundCheckOpen && (
          <SoundCheckModal isOpen={isSoundCheckOpen} onClose={() => setSoundCheckOpen(false)} />
        )}
      </React.Suspense>
      <OnboardingModal />
      <ShortcutsModal />
    </div>
  );
};
