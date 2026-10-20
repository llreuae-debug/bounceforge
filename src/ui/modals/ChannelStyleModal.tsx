import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { ChannelStyleConfig } from '../../marble3d/types';
import { DEFAULT_CHANNEL_STYLE } from '../../marble3d/formats';
import { triggerHaptic } from '../../platform/haptics';
import { X, Check, Sparkles, Smartphone, Eye, Palette } from 'lucide-react';

interface ChannelStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHANNEL_STYLE_STORAGE_KEY = 'bounceforge_channel_style_v1';

export const ChannelStyleModal: React.FC<ChannelStyleModalProps> = ({ isOpen, onClose }) => {
  const { updateModeSetting, showToast } = useStudioStore();

  const [channelStyle, setChannelStyle] = useState<ChannelStyleConfig>(() => {
    try {
      const stored = localStorage.getItem(CHANNEL_STYLE_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return DEFAULT_CHANNEL_STYLE;
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'identity'>('profile');

  const handleSave = () => {
    triggerHaptic(20);
    try {
      localStorage.setItem(CHANNEL_STYLE_STORAGE_KEY, JSON.stringify(channelStyle));
    } catch {
      // Fallback
    }

    // Apply to current studio session
    updateModeSetting('channelStyle', channelStyle);
    updateModeSetting('signatureMarble', channelStyle.signatureMarble);
    updateModeSetting('handleText', channelStyle.handle);
    updateModeSetting('wallBackground', channelStyle.defaultWallPalette);

    showToast('✨ Channel style & signature marble saved across series!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                Series Mode & Channel Identity
              </h2>
              <p className="text-xs text-slate-400">
                Consistent signature look across your viral reels with 3-column profile grid preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'profile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Profile Grid Preview
              </button>
              <button
                onClick={() => setActiveTab('identity')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'identity' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Signature Style
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'profile' ? (
            /* 3-Column Phone Profile Grid Mockup */
            <div className="flex flex-col items-center">
              {/* Phone Mockup Frame */}
              <div className="w-full max-w-md bg-black/90 border border-white/20 rounded-3xl p-4 shadow-2xl space-y-4">
                {/* Profile Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center font-black text-white text-lg shadow-inner"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${channelStyle.signatureMarble.stripeColor}, ${channelStyle.signatureMarble.coreColor})`,
                      }}
                    >
                      3D
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-sm">{channelStyle.handle}</div>
                      <div className="text-[11px] text-slate-400">Viral 3D Marble Reels • 1.4M followers</div>
                    </div>
                  </div>
                  {/* Part of the profile mock-up preview (not an action) */}
                  <span aria-hidden="true" className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs rounded-full shadow-lg">
                    Follow
                  </span>
                </div>

                {/* 3-Column Reel Covers Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {channelStyle.profileCovers.map((cover) => (
                    <div
                      key={cover.id}
                      className="relative aspect-[9/16] rounded-xl overflow-hidden border border-white/10 group cursor-pointer shadow-md bg-slate-900 transition-all hover:scale-[1.02]"
                    >
                      {/* Procedural Cover Frame Preview */}
                      <div
                        className="absolute inset-0 flex flex-col justify-between p-2"
                        style={{
                          background: `linear-gradient(145deg, #18181b 0%, #27272a 100%)`,
                        }}
                      >
                        {/* Top: Handle watermark */}
                        <div className="text-[8px] font-black text-white/50 tracking-wider">
                          {channelStyle.handle}
                        </div>

                        {/* Center: 3D Embossed Title & Signature Marble */}
                        <div className="flex flex-col items-center justify-center space-y-1 my-auto text-center">
                          <div
                            className="w-6 h-6 rounded-full shadow-lg border border-white/40"
                            style={{
                              background: `radial-gradient(circle at 35% 35%, #ffffff, ${cover.accentColor})`,
                            }}
                          />
                          <span className="text-[9px] font-black leading-tight text-white drop-shadow-md line-clamp-2 px-1">
                            {cover.title}
                          </span>
                        </div>

                        {/* Bottom Bar: Views & Format Badge */}
                        <div className="flex items-center justify-between text-[8px] text-white/80 font-bold">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-2.5 h-2.5 text-white/70" />
                            {cover.viewsLabel}
                          </span>
                          <span className="px-1 py-0.5 rounded bg-black/60 text-[7px] text-purple-300 uppercase tracking-tighter">
                            {cover.formatId.replace('f', 'F').split('_')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Signature Style Controls */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Signature Marble */}
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Signature Marble Look
                  </span>
                  <div
                    className="w-7 h-7 rounded-full border border-white/30 shadow-md"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${channelStyle.signatureMarble.stripeColor}, ${channelStyle.signatureMarble.coreColor})`,
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Core Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={channelStyle.signatureMarble.coreColor}
                        onChange={(e) =>
                          setChannelStyle({
                            ...channelStyle,
                            signatureMarble: {
                              ...channelStyle.signatureMarble,
                              coreColor: e.target.value,
                            },
                          })
                        }
                        className="w-10 h-10 rounded-xl cursor-pointer border border-white/20 bg-transparent"
                      />
                      <span className="font-mono text-xs text-slate-300">
                        {channelStyle.signatureMarble.coreColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Swirl Stripe Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={channelStyle.signatureMarble.stripeColor}
                        onChange={(e) =>
                          setChannelStyle({
                            ...channelStyle,
                            signatureMarble: {
                              ...channelStyle.signatureMarble,
                              stripeColor: e.target.value,
                            },
                          })
                        }
                        className="w-10 h-10 rounded-xl cursor-pointer border border-white/20 bg-transparent"
                      />
                      <span className="font-mono text-xs text-slate-300">
                        {channelStyle.signatureMarble.stripeColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Glossiness & Specular Reflection</span>
                      <span>{Math.round(channelStyle.signatureMarble.glossiness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.02"
                      value={channelStyle.signatureMarble.glossiness}
                      onChange={(e) =>
                        setChannelStyle({
                          ...channelStyle,
                          signatureMarble: {
                            ...channelStyle.signatureMarble,
                            glossiness: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Studio Wall & Identity */}
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  Default Wall & Branding
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Default Wall Palette
                    </label>
                    <select
                      value={channelStyle.defaultWallPalette}
                      onChange={(e) =>
                        setChannelStyle({
                          ...channelStyle,
                          defaultWallPalette: e.target.value,
                        })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-medium text-xs outline-none focus:border-purple-400"
                    >
                      <option value="charcoal_studio">Charcoal Studio (#2C2C30) — Signature Most Used</option>
                      <option value="soft_lavender_grey">Soft Lavender-Grey (#CFCBD8)</option>
                      <option value="off_white_gallery">Off-White Gallery (#E9E7EC)</option>
                      <option value="warm_greige">Warm Greige (#8E857C)</option>
                      <option value="deep_navy_velvet">Deep Navy Velvet (#0F172A)</option>
                      <option value="grass_field">Nature Grass Field (#15803D)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Wall Text Font Style
                    </label>
                    <select
                      value={channelStyle.fontStyle}
                      onChange={(e) =>
                        setChannelStyle({
                          ...channelStyle,
                          fontStyle: e.target.value as any,
                        })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-medium text-xs outline-none focus:border-purple-400"
                    >
                      <option value="script">Script / Cursive Handwritten (Elegant Classics)</option>
                      <option value="bold_cartoon">Bold Rounded Cartoon (High-Energy Reels)</option>
                      <option value="clean_sans">Clean Bold Sans (Minimalist Modern)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Channel @Handle (Watermark & Wall Carving)
                    </label>
                    <input
                      type="text"
                      value={channelStyle.handle}
                      onChange={(e) =>
                        setChannelStyle({
                          ...channelStyle,
                          handle: e.target.value,
                        })
                      }
                      placeholder="@YourChannel"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-medium text-xs outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-black/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            Save & Apply Channel Style
          </button>
        </div>
      </div>
    </div>
  );
};
