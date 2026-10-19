import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Logo } from '../brand/Logo';
import {
  Download,
  Menu,
  X,
  User,
  Shield,
  CreditCard,
  DollarSign,
  LogOut,
  ChevronDown,
  Activity,
  Film,
  Sparkles,
  Sliders,
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
    setExportOpen,
    isSettingsOpen,
    setSettingsOpen,
    isGalleryOpen,
    setGalleryOpen,
    isWhatsNewOpen,
    setWhatsNewOpen,
    isWhatNextOpen,
    setWhatNextOpen,
    isTrendsAdminOpen,
    setTrendsAdminOpen,
    showToast,
  } = useStudioStore();

  const { currentUser, isAuthenticated, isAdmin, openAuthModal, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-white/10 bg-[#050608]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* 1. Logo & Main Nav (Logo · Studio · My Videos · Pricing) */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <Logo
          concept="a"
          variant="horizontal"
          size="sm"
          onClick={() => setRoute('studio')}
          className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
        />

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block shrink-0" />

        <nav className="hidden md:flex items-center gap-1 text-xs font-bold shrink-0">
          <button
            onClick={() => setRoute('studio')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentRoute === 'studio'
                ? 'bg-cyan-500/15 text-cyan-300 font-extrabold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Studio
          </button>

          <button
            onClick={() => setRoute('my_videos')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              currentRoute === 'my_videos'
                ? 'bg-cyan-500/15 text-cyan-300 font-extrabold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>My Videos</span>
          </button>

          <button
            onClick={() => setRoute('pricing')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentRoute === 'pricing'
                ? 'bg-emerald-500/15 text-emerald-300 font-extrabold border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Pricing
          </button>
        </nav>
      </div>

      {/* 2. Center: 3-Step Creation Flow in Studio */}
      {currentRoute === 'studio' && (
        <div className="hidden md:flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-2xl border border-white/10 select-none shadow-sm">
          <button
            onClick={() => setGalleryOpen(!isGalleryOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isGalleryOpen
                ? 'btn-3d-cyan text-black font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle Step 1: Pick a Reel Gallery"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Pick Reel</span>
          </button>

          <button
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isSettingsOpen
                ? 'btn-3d-lime text-black font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle Step 2: Settings &amp; Customize (S)"
          >
            <Sliders className="w-3.5 h-3.5 text-lime-400" />
            <span>2. Settings</span>
          </button>
        </div>
      )}

      {/* 3. Right: Big Export CTA + Language Switcher + Account Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Studio Primary Action: Big Export Button */}
        {currentRoute === 'studio' && (
          <button
            onClick={() => setExportOpen(true)}
            className="btn-3d-lime h-9 flex items-center gap-2 px-3.5 sm:px-4 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-lime-500/20 whitespace-nowrap shrink-0"
            title="Export 1080x1920 60fps MP4 Reel"
          >
            <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>3. Export Reel</span>
          </button>
        )}

        {/* Global Multi-Language Switcher */}
        <LanguageSwitcher variant="header" className="hidden sm:inline-block shrink-0" />

        {/* User Account Avatar / Auth Section */}
        {isAuthenticated && currentUser ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="h-9 flex items-center gap-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer whitespace-nowrap shrink-0"
              aria-label="User Account Menu"
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

                <button
                  onClick={() => setRoute('diagnostics')}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Settings › Diagnostics</span>
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
          className="btn-3d-glass w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white md:hidden ml-1 shrink-0 p-0"
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
        <div className="absolute top-16 left-0 right-0 bg-[#07070e] border-b border-white/15 p-5 shadow-2xl md:hidden space-y-3 animate-fadeIn">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setRoute('studio');
            }}
            className={`w-full p-2.5 rounded-xl font-bold text-xs text-left flex items-center justify-between ${
              currentRoute === 'studio' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>Studio</span>
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setRoute('my_videos');
            }}
            className={`w-full p-2.5 rounded-xl font-bold text-xs text-left flex items-center justify-between ${
              currentRoute === 'my_videos' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>My Videos</span>
            <Film className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setRoute('pricing');
            }}
            className={`w-full p-2.5 rounded-xl font-bold text-xs text-left flex items-center justify-between ${
              currentRoute === 'pricing' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>Pricing</span>
            <CreditCard className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setRoute('diagnostics');
            }}
            className="w-full p-2.5 rounded-xl font-bold text-xs text-left flex items-center justify-between text-purple-300 hover:bg-white/5"
          >
            <span>Settings › Diagnostics</span>
            <Activity className="w-4 h-4" />
          </button>

          <div className="pt-3 border-t border-white/10">
            <LanguageSwitcher variant="mobile" />
          </div>
        </div>
      )}
    </header>
  );
};
