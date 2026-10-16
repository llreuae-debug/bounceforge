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

import { WhatsNewModal } from './modals/WhatsNewModal';
import { WhatNextModal } from './modals/WhatNextModal';
import { TrendsAdminModal } from './modals/TrendsAdminModal';

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
    isWhatsNewOpen,
    setWhatsNewOpen,
    isWhatNextOpen,
    setWhatNextOpen,
    isTrendsAdminOpen,
    setTrendsAdminOpen,
    showToast,
  } = useStudioStore();


  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleShare = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('share link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await saveToIndexedDB();
    showToast('project saved locally to indexeddb!');
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

      {/* Center Studio Tools - Perfectly Aligned 3D Buttons */}
      {currentRoute === 'studio' && (
        <div className="hidden xl:flex items-center gap-2">
          {/* Surprise Me Feature */}
          <button
            onClick={surpriseMe}
            className="btn-3d-glass flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all border-pink-500/40 text-pink-300"
            title="Randomize combination of mode, balls, obstacles, colors, melody and physics!"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>Surprise Me</span>
          </button>

          {/* Sound Mute / Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !isMuted
                ? 'btn-3d-glass border-emerald-400/50 text-emerald-300'
                : 'btn-3d-glass text-slate-400 hover:text-white'
            }`}
            title="Toggle studio audio"
          >
            {!isMuted ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
            <span>{!isMuted ? 'Sound ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setSeedFinderOpen(true)}
            className="btn-3d-glass flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-all"
            title="Run Web Worker to find seeds finishing in 59-60s"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Auto-Seed Finder
          </button>

          <button
            onClick={() => setMidiEditorOpen(true)}
            className="btn-3d-glass flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-all"
            title="Open 4-octave interactive MIDI piano roll"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            MIDI Editor
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="btn-3d-glass flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
            title="View keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#CCFF00]" />
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
              className="btn-3d-glass p-2 rounded-xl text-slate-300 hover:text-white transition-all"
              title="Save project to IndexedDB"
            >
              <Save className="w-4 h-4" />
            </button>

            <button
              onClick={() => loadFromIndexedDB()}
              className="btn-3d-glass p-2 rounded-xl text-slate-300 hover:text-white transition-all"
              title="Load saved project from IndexedDB"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              className="btn-3d-glass flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 transition-all"
              title="Copy shareable preset URL"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden sm:inline">{copied ? 'Copied Link!' : 'Share'}</span>
            </button>

            <button
              onClick={() => setWhatNextOpen(true)}
              className="btn-3d-cyan flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black transition-all uppercase tracking-wider shadow-md shadow-cyan-500/20"
              title="AI What Next Studio Navigator"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span className="hidden md:inline">what next?</span>
            </button>

            <button
              onClick={() => setWhatsNewOpen(true)}
              className="btn-3d-pink flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white transition-all uppercase tracking-wider shadow-md shadow-pink-500/30"
              title="What's New in BounceForge Viral Update"
            >
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="hidden md:inline">what's new</span>
            </button>

            <button
              onClick={() => setExportOpen(true)}
              className="btn-3d-lime flex items-center gap-2 px-4 py-2 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all"
              title="Export frame-perfect 4K 9:16 vertical MP4"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Export 4K</span>
            </button>
          </>
        ) : (
          /* Landing Action */
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setWhatsNewOpen(true)}
              className="btn-3d-pink flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white transition-all uppercase tracking-wider shadow-md shadow-pink-500/30"
              title="What's New in BounceForge Viral Update"
            >
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="hidden sm:inline">what's new</span>
            </button>

            <button
              onClick={() => setRoute('studio')}
              className="btn-3d-lime flex items-center gap-2 px-5 py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Studio Free</span>
            </button>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn-3d-glass p-2 rounded-xl text-slate-300 hover:text-white xl:hidden ml-1"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Modals */}
      <WhatsNewModal isOpen={isWhatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
      <WhatNextModal isOpen={isWhatNextOpen} onClose={() => setWhatNextOpen(false)} />
      <TrendsAdminModal isOpen={isTrendsAdminOpen} onClose={() => setTrendsAdminOpen(false)} />


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
    </header>
  );
};
