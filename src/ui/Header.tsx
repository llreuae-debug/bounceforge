import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Logo } from '../brand/Logo';
import { copyText } from '../platform/clipboard';
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
  User,
  Shield,
  CreditCard,
  DollarSign,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../auth/useAuthStore';

import { WhatsNewModal } from './modals/WhatsNewModal';
import { WhatNextModal } from './modals/WhatNextModal';
import { TrendsAdminModal } from './modals/TrendsAdminModal';
import { LanguageSwitcher } from './components/LanguageSwitcher';

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

  const { currentUser, isAuthenticated, isAdmin, openAuthModal, logout } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleShare = async () => {
    const url = getShareableUrl();
    const ok = await copyText(url);
    setCopied(true);
    showToast(ok ? 'share link copied to clipboard!' : 'could not copy link automatically');
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
    <header className="h-16 border-b border-white/10 bg-[#050507]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
      {/* Left: Brand Identity & Mode Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        <Logo
          concept="a"
          variant="horizontal"
          size="sm"
          onClick={() => setRoute('landing')}
          className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
        />

        <div className="h-5 w-[1px] bg-white/15 hidden md:block shrink-0" />

        {/* Studio Mode Controls */}
        {currentRoute === 'studio' ? (
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-400 px-2 py-0.5 text-xs font-bold text-slate-200 outline-none transition-colors w-28 sm:w-40 md:w-48 truncate shrink-0"
              placeholder="Project Title"
              title="Click to rename project"
            />
          </div>
        ) : (
          /* Landing Navigation Links */
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-neutral-400 ml-2 shrink-0">
            <a
              href="#modes"
              onClick={(e) => handleAnchor(e, 'modes')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Modes
            </a>
            <a
              href="#features"
              onClick={(e) => handleAnchor(e, 'features')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Engine &amp; Audio
            </a>
            <button
              onClick={() => setRoute('showcase')}
              className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                currentRoute === 'showcase' ? 'text-[#00F0FF] font-extrabold' : ''
              }`}
            >
              Showcase
            </button>
            <button
              onClick={() => setRoute('about')}
              className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                currentRoute === 'about' ? 'text-[#CCFF00] font-extrabold' : ''
              }`}
            >
              About
            </button>
            <a
              href="#faq"
              onClick={(e) => handleAnchor(e, 'faq')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              FAQ
            </a>
            <button
              onClick={() => setRoute('pricing')}
              className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                currentRoute === 'pricing' ? 'text-[#00e599] font-extrabold' : ''
              }`}
            >
              Pricing
            </button>
            <button
              onClick={() => setRoute('blog')}
              className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                currentRoute === 'blog' ? 'text-purple-400 font-extrabold' : ''
              }`}
            >
              Blog
            </button>
            <button
              onClick={() => setRoute('diagnostics')}
              className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
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
        <div className="hidden xl:flex items-center gap-1.5 2xl:gap-2 shrink-0">
          {/* Surprise Me Feature */}
          <button
            onClick={surpriseMe}
            className="btn-3d-glass h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all border-pink-500/40 text-pink-300 whitespace-nowrap shrink-0"
            title="Randomize combination of mode, balls, obstacles, colors, melody and physics!"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse shrink-0" />
            <span>Surprise Me</span>
          </button>

          {/* Sound Mute / Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              !isMuted
                ? 'btn-3d-glass border-emerald-400/50 text-emerald-300'
                : 'btn-3d-glass text-slate-400 hover:text-white'
            }`}
            title="Toggle studio audio"
          >
            {!isMuted ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-red-400 shrink-0" />
            )}
            <span>{!isMuted ? 'Sound ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setSeedFinderOpen(true)}
            className="btn-3d-glass h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="Run Web Worker to find seeds finishing in 59-60s"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Auto-Seed Finder</span>
          </button>

          <button
            onClick={() => setMidiEditorOpen(true)}
            className="btn-3d-glass h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="Open 4-octave interactive MIDI piano roll"
          >
            <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>MIDI Editor</span>
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="btn-3d-glass h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="View keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#CCFF00] shrink-0" />
            <span>Shortcuts</span>
          </button>
        </div>
      )}

      {/* Right: Actions, Share, Export & Mobile Menu */}
      <div className="flex items-center gap-1.5 2xl:gap-2 shrink-0">
        {currentRoute === 'studio' ? (
          <>
            <button
              onClick={handleSave}
              className="btn-3d-glass w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white transition-all shrink-0 p-0"
              title="Save project to IndexedDB"
            >
              <Save className="w-4 h-4" />
            </button>

            <button
              onClick={() => loadFromIndexedDB()}
              className="btn-3d-glass w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white transition-all shrink-0 p-0"
              title="Load saved project from IndexedDB"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              className="btn-3d-glass h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-slate-200 transition-all whitespace-nowrap shrink-0"
              title="Copy shareable preset URL"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
              <span className="hidden sm:inline">{copied ? 'Copied Link!' : 'Share'}</span>
            </button>

            <button
              onClick={() => setWhatNextOpen(true)}
              className="btn-3d-cyan h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-black text-black transition-all uppercase tracking-wider shadow-md shadow-cyan-500/20 whitespace-nowrap shrink-0"
              title="AI What Next Studio Navigator"
            >
              <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
              <span className="hidden md:inline">what next?</span>
            </button>

            <button
              onClick={() => setWhatsNewOpen(true)}
              className="btn-3d-pink h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-black text-white transition-all uppercase tracking-wider shadow-md shadow-pink-500/30 whitespace-nowrap shrink-0"
              title="What's New in BounceForge Viral Update"
            >
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
              <span className="hidden md:inline">what's new</span>
            </button>

            <button
              onClick={() => setExportOpen(true)}
              className="btn-3d-lime h-9 flex items-center gap-2 px-3.5 sm:px-4 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
              title="Export frame-perfect 4K 9:16 vertical MP4"
            >
              <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Export 4K</span>
            </button>
          </>
        ) : (
          /* Landing Action */
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setWhatsNewOpen(true)}
              className="btn-3d-pink h-9 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-black text-white transition-all uppercase tracking-wider shadow-md shadow-pink-500/30 whitespace-nowrap shrink-0"
              title="What's New in BounceForge Viral Update"
            >
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
              <span className="hidden sm:inline">what's new</span>
            </button>

            <button
              onClick={() => setRoute('studio')}
              className="btn-3d-lime h-9 flex items-center gap-2 px-4 sm:px-5 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Launch Studio Free</span>
            </button>
          </div>
        )}

        {/* Global Multi-Language Switcher */}
        <LanguageSwitcher variant="header" className="hidden sm:inline-block shrink-0" />

        {/* User Account Avatar / Auth Section */}
        {isAuthenticated && currentUser ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-6 h-6 rounded-lg object-cover border border-white/20 shrink-0"
              />
              <span className="text-xs font-bold text-white hidden md:inline truncate max-w-24">
                {currentUser.fullName.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0e121a] border border-white/10 p-2 shadow-2xl z-50 animate-fadeIn space-y-1 text-xs select-none"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="p-2 border-b border-white/5 space-y-0.5">
                  <div className="font-bold text-white truncate">{currentUser.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser.email}</div>
                </div>

                <button
                  onClick={() => setRoute('account')}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>My Account</span>
                </button>

                <button
                  onClick={() => setRoute('account')}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Plan &amp; Billing</span>
                </button>

                <button
                  onClick={() => setRoute('account')}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Affiliate Program (30%)</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => (window.location.href = '/admin')}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-left bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin Console</span>
                  </button>
                )}

                <div className="border-t border-white/5 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      showToast('Signed out of session');
                      setRoute('landing');
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-rose-500/10 text-rose-400 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openAuthModal('login')}
              className="h-9 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center"
            >
              Log In
            </button>
            <button
              onClick={() => setRoute('pricing')}
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center"
            >
              Pricing
            </button>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn-3d-glass w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white xl:hidden ml-1 shrink-0 p-0"
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

          {/* Mobile Language Switcher */}
          <LanguageSwitcher variant="mobile" className="pt-3 border-t border-white/10" />
        </div>
      )}
    </header>
  );
};
