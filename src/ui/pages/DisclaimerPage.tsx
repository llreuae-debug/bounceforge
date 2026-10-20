import React from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { Scale } from 'lucide-react';

export const DisclaimerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 uppercase tracking-widest">
            <Scale className="w-3.5 h-3.5" />
            Legal Notice &amp; Platform Disclaimers
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            BounceForge Disclaimer
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Last Updated: October 2026 • Effective Worldwide
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-8 text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
              1. Simulation Nature &amp; Entertainment Purpose
            </h2>
            <p>
              BounceForge is a procedural digital audio-visual sandbox that models two-dimensional rigid body mechanics, harmonic oscillations, and spatial acoustic chimes. All physics simulations (including collisions, particle fragmentation, gravity wells, and rebound velocities) are generated through discrete mathematical approximations (Verlet integration and PRNG seeding) designed specifically for digital art, entertainment, and creator video production. They are not intended as certified scientific or structural engineering calculations.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. User Content &amp; Custom Image Ownership
            </h2>
            <p>
              BounceForge enables users to upload custom image textures and emojis to serve as rolling ball avatars. By uploading any graphic, image, logo, or trademark, you represent and warrant that you own the rights to that content or possess explicit legal authorization to use it. BounceForge does not store, curate, or claim ownership over your uploaded textures—all texture processing occurs locally inside your browser’s canvas memory. BounceForge expressly disclaims liability for any trademark or copyright infringement arising from unauthorized third-party imagery uploaded by individual users.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              3. Commercial Monetization Rights
            </h2>
            <p>
              All music and sound effects synthesized by the BounceForge Web Audio engine are generated procedurally from public domain mathematical frequencies, physical sound models, and open microtonal scales. Users with an active <strong>Creator Pro</strong> or <strong>Gamer Pack</strong> subscription retain commercial rights to monetize their exported MP4/WebM videos across platforms including TikTok Creator Rewards, YouTube Partner Program, and Meta Reels without copyright royalty claims from BounceForge.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              4. Third-Party Platform Independence
            </h2>
            <p>
              BounceForge is an independent creator studio software provider. BounceForge is not affiliated with, sponsored by, or endorsed by TikTok, ByteDance Ltd., YouTube, Google LLC, Instagram, or Meta Platforms, Inc. All platform overlay safe zones and UI markers provided in the studio are visual approximations intended solely to assist video editors in positioning captions and center text.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              5. Hardware &amp; Local Encoding Performance
            </h2>
            <p>
              4K 60FPS video encoding is processed entirely on the client’s device utilizing the W3C WebCodecs API and GPU canvas memory. Frame rendering performance, encode duration, and memory utilization vary based on your local device CPU/GPU architecture. On low-memory devices (under 4GB RAM), the studio will automatically configure a 1080p FHD stream to maintain stability and prevent browser tab termination.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
