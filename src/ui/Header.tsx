import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Logo } from '../brand/Logo';
import {
  Play,
  Share2,
  Download,
  Music,
  Compass,
  Save,
  FolderOpen,
  Sparkles,
  Radio,
  Keyboard,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentRoute,
    setRoute,
    projectName,
    setProjectName,
    isMuted,
    setIsMuted,
    saveToIndexedDB,
    loadFromIndexedDB,
    getShareableUrl,
    setExportOpen,
    setMidiEditorOpen,
    setSeedFinderOpen,
    setShortcutsOpen,
    surpriseMe,
  } = useStudioStore();

  const [copied, setCopied] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleShare = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await saveToIndexedDB();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleAnchor = (e: React.MouseEvent, anchorId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (currentRoute !== 'landing') {
      setRoute('landing');
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#050507]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: Brand Identity & Mode Toggle */}
      <div className="flex items-center gap-3.5">
        <Logo
          concept="a"
          variant="horizontal"
          size="sm"
          onClick={() => setRoute('landing')}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />

        <div className="h-5 w-[1px] bg-white/15 hidden md:block" />

        {/* Studio Mode Controls */}
        {currentRoute === 'studio' ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-400 px-2 py-0.5 text-xs font-bold text-slate-200 outline-none transition-colors w-32 sm:w-48 truncate"
              placeholder="Project Title"
              title="Click to rename project"
            />
          </div>
        ) : (
          /* Landing Navigation Links */
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-neutral-400 ml-2">
            <a
              href="#modes"
              onClick={(e) => handleAnchor(e, 'modes')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Modes
            </a>
            <a
              href="#features"
              onClick={(e) => handleAnchor(e, 'features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Engine &amp; Audio
            </a>
            <a
              href="#faq"
              onClick={(e) => handleAnchor(e, 'faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </a>
            <button
              onClick={() => setRoute('diagnostics')}
              className={`hover:text-white transition-colors cursor-pointer ${
                currentRoute === 'diagnostics' ? 'text-cyan-400 font-extrabold' : ''
              }`}
            >
              Diagnostics
            </button>
          </nav>
        )}
      </div>

      {/* Center Studio Tools */}
      {currentRoute === 'studio' && (
        <div className="hidden xl:flex items-center gap-2">
          {/* Surprise Me Feature */}
          <button
            onClick={surpriseMe}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/40 hover:border-pink-300 text-xs font-bold text-white transition-all shadow-md shadow-pink-500/10 active:scale-95"
            title="Randomize combination of mode, balls, obstacles, colors, melody and physics!"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>Surprise Me</span>
          </button>

          {/* Sound Mute / Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              !isMuted
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle studio audio"
          >
            {!isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span>{!isMuted ? 'Sound ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setSeedFinderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm"
            title="Run Web Worker to find seeds finishing in 59-60s"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Auto-Seed Finder
          </button>

          <button
            onClick={() => setMidiEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm"
            title="Open 4-octave interactive MIDI piano roll"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            MIDI Editor
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all"
            title="View keyboard shortcuts"
          >
            <Keyboard className="w-3 h-3 text-[#CCFF00]" />
            <span>Shortcuts</span>
          </button>
        </div>
      )}

      {/* Right: Actions, Share, Export & Mobile Menu */}
      <div className="flex items-center gap-2">
        {currentRoute === 'studio' ? (
          <>
            <button
              onClick={handleSave}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              title="Save project to IndexedDB"
            >
              <Save className="w-4 h-4" />
            </button>

            <button
              onClick={() => loadFromIndexedDB()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              title="Load saved project from IndexedDB"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-all"
              title="Copy shareable preset URL"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden sm:inline">{copied ? 'Copied Link!' : 'Share'}</span>
            </button>

            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-[#CCFF00] hover:opacity-90 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-400/25 transition-all transform hover:scale-[1.02]"
              title="Export frame-perfect 4K 9:16 vertical MP4"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Export 4K</span>
            </button>
          </>
        ) : (
          /* Landing Action */
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRoute('studio')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-lime-400/20 hover:scale-105 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Studio Free</span>
            </button>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white xl:hidden ml-1"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-[#07070e] border-b border-white/15 p-5 shadow-2xl xl:hidden space-y-4 animate-fadeIn">
          {currentRoute === 'studio' ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => {
                  setSeedFinderOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-left text-slate-200"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Auto-Seed Finder</span>
              </button>

              <button
                onClick={() => {
                  setMidiEditorOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-left text-slate-200"
              >
                <Music className="w-4 h-4 text-purple-400" />
                <span>MIDI Editor</span>
              </button>

              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-left text-slate-200"
              >
                {!isMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span>{!isMuted ? 'Sound: ON' : 'Sound: Muted'}</span>
              </button>

              <button
                onClick={() => {
                  setShortcutsOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-left text-slate-200"
              >
                <Keyboard className="w-4 h-4 text-[#CCFF00]" />
                <span>Hotkeys Guide</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-sm font-bold">
              <a
                href="#modes"
                onClick={(e) => handleAnchor(e, 'modes')}
                className="block p-2.5 rounded-lg hover:bg-white/5 text-slate-200"
              >
                21 Simulation Modes
              </a>
              <a
                href="#features"
                onClick={(e) => handleAnchor(e, 'features')}
                className="block p-2.5 rounded-lg hover:bg-white/5 text-slate-200"
              >
                Physics &amp; Audio Engine
              </a>
              <a
                href="#faq"
                onClick={(e) => handleAnchor(e, 'faq')}
                className="block p-2.5 rounded-lg hover:bg-white/5 text-slate-200"
              >
                Frequently Asked Questions
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setRoute('diagnostics');
                }}
                className="w-full text-left p-2.5 rounded-lg hover:bg-white/5 text-cyan-400"
              >
                Device Diagnostics
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Notification Toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#CCFF00] text-black px-4 py-2.5 rounded-xl text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
          ✓ Project saved locally to IndexedDB!
        </div>
      )}
    </header>
  );
};
