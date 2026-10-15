# BOUNCEFORGE — Viral Ball Physics & Sound Studio

**BounceForge** is a browser-based creative studio for crafting viral "oddly satisfying" bouncing-ball videos for TikTok, YouTube Shorts, and Instagram Reels. Every single bounce plays a synthesized musical note.

---

## ⚡ Core Features

- **240 Hz Deterministic Physics Core**:
  - Custom 2D substepping continuous collision detection engine (Mulberry32 PRNG).
  - Circle-vs-rotating-arc-with-gaps, circle-vs-circle with spatial hashing for up to 5,000 balls, polygon collisions, spikes, pegs, and particle pools.
  - Zero tunneling, anti-stall energy maintenance, and identical results between live preview and offline export.

- **21 Complete Simulation Modes**:
  1. **Classic Escape**: 10 to 50 concentric rotating rings with gaps; ring-by-ring shatter and counters.
  2. **Infinite Loop**: Exponential ball duplication on escape or bounce up to 5,000 balls.
  3. **Destruction ASMR**: Ring composed of breakable brick segments with crunchy shard physics.
  4. **Spike Accumulation**: Spiked ring perimeter where balls freeze until the final escape.
  5. **Ball Explosion Duet**: Ball-on-ball explosive chain reactions.
  6. **Geometric Web Expansion**: Wall hits anchor glowing elastic threads to the expanding ball.
  7. **Rainbow Trail Expansion**: Continuous HSL chromatic ribbon trail and ball growth.
  8. **Spiral Vortex**: Archimedean spiral rings with progressive angular gap offsets.
  9. **Fragment Expansion**: Ball expands and shatters into bouncy mini-fragments upon spike contact.
  10. **Web Battle Royale**: 2 to 6 colored balls weaving competing webs with territory theft.
  11. **Tier Merge Drop**: 12 fruit/solar tiers fusing upon contact up to Solar Nova.
  12. **Multi-Ball Maze Race**: 4 to 8 racer balls navigating a concentric maze with a live leaderboard.
  13. **Paint Splat Arena**: Balls splatter paint on the arena floor with a live territory percentage bar.
  14. **Gravity Flip Quad**: Gravity shifts 90° in rhythm with the musical tempo.
  15. **Black Hole Singularity**: Relativistic orbital mechanics and event horizon consumption.
  16. **Quantum Portal Rings**: Momentum-conserving paired wormholes on the rings.
  17. **Plinko Peg Cascade**: Ball rain through melodic peg pyramid into bottom histogram scoring bins.
  18. **Pendulum Wave Harmony**: Tuned harmonic pendulums forming kinetic traveling waves realigning at 60s.
  19. **Shrinking Geometric Prison**: Rotating shrinking polygon (hexagon, square, octagon) survival challenge.
  20. **Domino Ring Cascade**: Concentric rings knocking neighboring rings in an inward collapse cascade.
  21. **Chromatic Sand Fill**: Physics sand particles that accumulate in stratified sand dunes.

- **12 Synthesized Web Audio Instruments (Zero External Samples)**:
  - Grand Piano, Music Box, Marimba, 8-Bit Square, Chiptune Pulse, Soft Pad, Pluck/Harp, Bell/Glockenspiel, Kalimba, Synth Lead, Steel Drum, Pure Crystal Glass.
  - Procedural ASMR sound effects: Glass shatter, Crunch, Pop, Whoosh, Thud.
  - Master limiter, dynamic compressor, and velocity-to-pitch / impulse-to-volume mapping.

- **Public Domain Melody Library & MIDI Piano Roll Editor**:
  - 11 classical masterpieces (Für Elise, Canon in D, Ode to Joy, Gymnopédie, Moonlight Sonata, Clair de Lune, Greensleeves, Turkish March, Mountain King, The Entertainer, Swan Lake).
  - 10 original EDM/ambient melodies.
  - Interactive 4-octave step sequencer with live synthesizer audition, `.mid` import, and `.mid` export.

- **Auto-Seed Finder**:
  - Headless Web Worker running tens of thousands of simulations to find seeds finishing exactly between 59.0s and 60.0s.
  - Live progress bar and 1-click loading into the studio preview.

- **Offline Frame-Perfect 4K Video Export**:
  - 1080x1920, 1440x2560, and 2160x3840 (4K UHD vertical 9:16).
  - 30 or 60 FPS offline stepped rendering via WebCodecs `VideoEncoder` + `mp4-muxer` (faststart MP4).
  - Synchronized offline audio synthesis via `OfflineAudioContext` + `AudioEncoder` (AAC 48kHz stereo, 192kbps).
  - Auto-captured dramatic PNG thumbnail at the peak particle collision moment.

- **15 Themes & Viral Hooks**:
  - Neon Night, Pastel Dream, Monochrome, Synthwave, Ocean, Lava, Gold Luxe, Matrix, Candy, Galaxy, Paper, Islamic Emerald & Gold, Sunset Horizon, Glacial Ice, Custom.
  - Top title hooks, live counters, progress bars, custom watermarks, and preview safe-zone guides for TikTok, YouTube Shorts, and Reels.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To verify TypeScript typing and build production bundle:
```bash
npm run build
```
