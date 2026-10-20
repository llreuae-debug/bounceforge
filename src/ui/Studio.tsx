import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { loadMarbleRenderer } from '../marble3d/modes/marbleMelodyMode';

// Studio needs the 3D marble renderer: start loading it as soon as the Studio code loads
void loadMarbleRenderer();
import { ModeGallery } from './panels/ModeGallery';
import { StudioCanvas } from './StudioCanvas';
import { EssentialControls } from './panels/EssentialControls';
import { OnboardingModal } from './modals/OnboardingModal';
import { ShortcutsModal } from './modals/ShortcutsModal';
import { useStudioStore } from '../store/useStudioStore';
import { triggerHaptic } from '../platform/haptics';
import { useI18n } from '../i18n';
import {
  Sparkles,
  Sliders,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

// Lazy-load heavy modals
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
const ExportSoundCheckModal = React.lazy(() =>
  import('./modals/ExportSoundCheckModal').then((m) => ({ default: m.ExportSoundCheckModal }))
);

export const Studio: React.FC = () => {
  const {
    isExportOpen,
    isSettingsOpen,
    setSettingsOpen,
    isGalleryOpen,
    setGalleryOpen,
    isMidiEditorOpen,
    isSeedFinderOpen,
    isSelfTestOpen,
    setSelfTestOpen,
    isSoundCheckOpen,
    setSoundCheckOpen,
    isExportSoundCheckOpen,
    setExportOpen,
    targetDuration,
    reelSpeed,
  } = useStudioStore();
  const { isRTL } = useI18n();

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [windowHeight, setWindowHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  // Phone bottom sheet tab state: 'pick' | 'customize' | 'export'
  const [mobileTab, setMobileTab] = useState<'pick' | 'customize' | 'export'>('pick');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

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

  const isMobile = windowWidth < 1024;

  // Sync global isSettingsOpen & isGalleryOpen with UI
  useEffect(() => {
    if (isSettingsOpen) {
      if (isMobile) {
        setMobileTab('customize');
        setMobileSheetOpen(true);
      }
    }
  }, [isSettingsOpen, isMobile]);

  useEffect(() => {
    if (isGalleryOpen) {
      if (isMobile) {
        setMobileTab('pick');
        setMobileSheetOpen(true);
      }
    }
  }, [isGalleryOpen, isMobile]);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#050608] overflow-hidden select-none safe-top safe-bottom safe-left safe-right font-sans">
      {/* Top Header */}
      <Header />

      {isMobile ? (
        /* PHONE & MOBILE TABLET LAYOUT: Preview on top, steps as a bottom sheet with 3 tabs (pick · customize/settings · export) */
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Top Half / Viewport: Live 9:16 Canvas */}
          <div className="flex-1 min-h-0 relative flex flex-col p-2">
            <StudioCanvas />
          </div>

          {/* Bottom Nav: 3-Step Flow (1. Pick · 2. Settings · 3. Export) */}
          <div className="h-14 bg-[#07090e]/95 backdrop-blur-xl border-t border-white/10 px-4 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setMobileTab('pick');
                  setMobileSheetOpen(true);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mobileSheetOpen && mobileTab === 'pick'
                    ? 'btn-3d-cyan text-black'
                    : 'bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Pick Reel</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic(10);
                  setMobileTab('customize');
                  setMobileSheetOpen(true);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mobileSheetOpen && mobileTab === 'customize'
                    ? 'btn-3d-lime text-black font-extrabold'
                    : 'bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-lime-400" />
                <span>2. Settings</span>
              </button>
            </div>

            {/* Quick Export One-Tap CTA */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setExportOpen(true);
              }}
              className="btn-3d-pink h-9 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ml-2 shadow-md shadow-pink-500/20"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>3. Export</span>
            </button>
          </div>

          {/* Mobile Bottom Sheet Drawer */}
          {mobileSheetOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
              <div className="bg-[#090b12] border-t border-white/15 rounded-t-3xl max-h-[82dvh] h-[82dvh] flex flex-col overflow-hidden shadow-2xl">
                {/* Drag Handle & Header */}
                <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMobileTab('pick')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        mobileTab === 'pick'
                          ? 'btn-3d-cyan text-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Step 1 · Pick
                    </button>
                    <button
                      onClick={() => setMobileTab('customize')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        mobileTab === 'customize'
                          ? 'btn-3d-lime text-black font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3 h-3 text-lime-400" />
                      <span>Step 2 · Settings</span>
                    </button>
                    <button
                      onClick={() => setMobileTab('export')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        mobileTab === 'export'
                          ? 'btn-3d-pink text-white font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      <span>Step 3 · Export</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setMobileSheetOpen(false);
                      setSettingsOpen(false);
                    }}
                    aria-label="Close settings"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto">
                  {mobileTab === 'pick' && (
                    <ModeGallery
                      className="w-full h-full border-none bg-transparent"
                      onSelectTemplate={() => {
                        // User picked a template
                      }}
                      onOpenSettings={() => setMobileTab('customize')}
                    />
                  )}
                  {mobileTab === 'customize' && (
                    <EssentialControls
                      className="w-full h-full border-none bg-transparent"
                      onClose={() => {
                        setMobileSheetOpen(false);
                        setSettingsOpen(false);
                      }}
                    />
                  )}
                  {mobileTab === 'export' && (
                    <div className="p-6 space-y-6 text-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-3xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center mx-auto text-lime-400">
                        <Download className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">
                          Ready to Export Reel
                        </h3>
                        <p className="text-xs text-slate-400">
                          1080×1920 @ 60fps · {targetDuration}s runtime · {reelSpeed}x speed
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMobileSheetOpen(false);
                          setExportOpen(true);
                        }}
                        className="btn-3d-lime w-full py-3.5 rounded-2xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-lime-500/20"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>Export Reel (1080x1920 60fps)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DESKTOP 3-COLUMN LAYOUT: left = gallery/steps, center = 9:16 preview, right = settings */
        <main
          className={`flex-1 flex overflow-hidden max-w-[2400px] mx-auto w-full relative ${
            isRTL ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Left: Mode Gallery (Step 1) */}
          {isGalleryOpen && (
            <div className="relative">
              <ModeGallery onOpenSettings={() => setSettingsOpen(true)} />
              <button
                onClick={() => setGalleryOpen(false)}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs z-10"
                title="Collapse gallery"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {!isGalleryOpen && (
            <button
              onClick={() => setGalleryOpen(true)}
              className="w-8 border-r border-white/10 bg-[#07090e] hover:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Expand Step 1 Gallery"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="text-[10px] [writing-mode:vertical-lr] mt-3 font-bold uppercase tracking-widest text-cyan-400">
                Step 1 · Pick
              </span>
            </button>
          )}

          {/* Center: Live 9:16 Canvas Viewport */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 p-3 items-center justify-center">
            <StudioCanvas />
          </div>

          {/* Right: The Settings Panel (Step 2) */}
          {!isSettingsOpen && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 border-l border-white/10 bg-[#07090e] hover:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Expand Step 2 Settings"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] [writing-mode:vertical-lr] mt-3 font-bold uppercase tracking-widest text-lime-400">
                Step 2 · Settings
              </span>
            </button>
          )}

          {isSettingsOpen && (
            <div className="relative">
              <EssentialControls onClose={() => setSettingsOpen(false)} />
              <button
                onClick={() => setSettingsOpen(false)}
                className="absolute left-2 top-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs z-10"
                title="Collapse settings panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
        {isExportSoundCheckOpen && <ExportSoundCheckModal />}
      </React.Suspense>
      <OnboardingModal />
      <ShortcutsModal />
    </div>
  );
};
