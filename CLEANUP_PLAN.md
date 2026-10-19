# BOUNCEFORGE CLEANUP & SIMPLIFICATION PLAN
**Target**: Clean, effortless 3-tap reel creation where every visible preset works 100%.

---

## 1. Executive Summary & Goals

BounceForge has grown into a powerful 3D and 2D physics and procedural audio video generator, but feature sprawl, overlapping sidebars, developer diagnostic widgets, and duplicate modes have cluttered the creation experience.

### Core Objectives
1. **3-Tap Creation Flow**: A new visitor can Pick a reel → Customize essentials → Export in under 3 taps.
2. **Zero Visual Noise**: One clean top bar, one accent color per screen, consistent spacing, and no developer widgets in the main canvas.
3. **5 Essentials Only Visible by Default**: Music, Look, Marble, Text, Length & Speed. All other deep parameters tucked neatly into a searchable "Advanced" drawer.
4. **Quality Gate (100% Pass Rate)**: Only presets and modes that pass automated framing, timing, audio sync, loudness (-14 LUFS), and video export checks are displayed in the primary gallery.
5. **Strict Safety Rules**:
   - Zero hard deletions. Retired features or developer items placed behind feature flags (`SHOW_LEGACY_MODES: false`, `SHOW_DEV_CHIPS: false`) and moved to `Settings › Diagnostics`.
   - Never remove paid plan promises: 4K 60fps export, watermark-free export, AI title generator, and commercial license remain front and center.
   - Backward compatibility: Old saved presets transparently migrated to canonical modes via alias mapping in `getModeById`.

---

## 2. Keep / Merge / Hide / Remove Matrix

### 2.1 Navigation & Top Bar
| Item | Status | Action / Destination | Rationale |
| :--- | :--- | :--- | :--- |
| **Brand Logo** | **KEEP** | Directs to Studio or Landing | Core brand navigation |
| **Studio Link** | **KEEP** | Directs to `/studio` | Primary work area |
| **My Videos Link** | **KEEP** | Directs to `/my-videos` | User exports & saved creations hub |
| **Pricing Link** | **KEEP** | Directs to `/pricing` | Conversion & tier upgrades |
| **User Avatar / Sign In** | **KEEP** | Dropdown with Account, Billing, Affiliate, Diagnostics, Sign Out | Consolidates all secondary links into one menu |
| Project Title Inline Input | **KEEP** | Kept in Top Bar (compact) | Quick project renaming |
| "Surprise Me" Button | **MERGE** | Moved from Header to Step 1 Gallery Header | Contextually belongs with picking a reel |
| Mute/Sound Button | **MERGE** | Integrated into Studio Canvas preview overlay | Contextual to video preview |
| "What's New" / "What Next" Chips | **HIDE** | Placed behind Avatar Menu & Help | Header was overcrowded with 15+ chips |
| Auto-Seed Finder Modal Button | **HIDE** | Moved to Step 2 Advanced Drawer | Deep optimization feature |
| MIDI Editor Modal Button | **MERGE** | Integrated directly into Step 2 "Music" Essential | Right next to melody picker |
| Keyboard Shortcuts Button | **HIDE** | Moved to Avatar Menu / Diagnostics | Niche pro feature |
| Save / Load to IndexedDB | **MERGE** | Integrated into "My Videos" & Step 3 Post-Export | Replaces raw database buttons |
| Share Link Button | **MERGE** | Integrated into Step 3 Export modal and canvas bar | Clear export step placement |

---

### 2.2 Modes & Presets (Consolidation to 6 Curated Categories + 12 Top Picks)
Out of 51 total modes and presets, we curate the top performers into 6 viral categories, merge duplicate mechanics, and hide experimental/raw developer modes behind `featureFlags.showLegacyModes`.

| Mode / Preset | Category | Status | Action / Rationale |
| :--- | :--- | :--- | :--- |
| **Pastel Toybox Run (3D)** | Marble Music | **KEEP (TOP PICK #1)** | Flagship 3D marble melody run, viral engagement |
| **Moonlight Sonata Run (3D)**| Marble Music | **KEEP (TOP PICK #2)** | High retention nocturnal 3D marble melody |
| **Canon in D Run (3D)** | Marble Music | **KEEP** | Iconic classical run |
| **Fur Elise Chimes (3D)** | Marble Music | **KEEP** | Universal recognition |
| **Mario Theme Run (3D)** | Marble Music | **KEEP** | Retro gaming melody run |
| **Countdown Escape 60s** | Satisfying Escape | **KEEP (TOP PICK #3)** | #1 viral mechanic (escape before 00:00) |
| **Grow Till It Cracks** | Satisfying Escape | **KEEP (TOP PICK #4)** | Visual tension & anticipation |
| **Spiral Escape** | Satisfying Escape | **KEEP** | Hypnotic centrifugal physics |
| **Sequence Break** | Satisfying Escape | **KEEP** | Sequential target destruction |
| **Near Miss Hell** | Satisfying Escape | **KEEP** | High anxiety & comment bait |
| **Name Battle Royale** | Battles | **KEEP (TOP PICK #5)** | Top TikTok format (comment your name) |
| **Pick Ur Color** | Battles | **KEEP (TOP PICK #6)** | Instant viewer investment (red vs blue vs lime) |
| **Elimination Wheel** | Battles | **KEEP** | Survival bracket tournament |
| **Ball Race 4-Lane** | Battles | **KEEP** | Classic side-by-side competition |
| **Paint Arena** | Battles | **KEEP** | Territory dominance simulation |
| **Crystal Chimes ASMR** | ASMR Glass & Crystal | **KEEP (TOP PICK #7)** | High-fidelity procedural resonance |
| **Xylophone Rain** | ASMR Glass & Crystal | **KEEP (TOP PICK #8)** | Melodic wooden & crystal cascades |
| **Frosted Glass Run** | ASMR Glass & Crystal | **KEEP** | Aesthetic pastel glass fractures |
| **Soap Cube Cut** | ASMR Glass & Crystal | **KEEP** | Clean tactile cutting ASMR |
| **Bubble Pop Chain** | Squeaky & Fun | **KEEP (TOP PICK #9)** | Satisfying chain reaction bursts |
| **Plinko Cascade** | Squeaky & Fun | **KEEP (TOP PICK #10)**| Pachinko bell drops and bounces |
| **Classic Bouncy Castle**| Squeaky & Fun | **KEEP** | High-energy rubber ball collisions |
| **Domino Rings** | Squeaky & Fun | **KEEP** | Satisfying domino knockdown loop |
| **Day To Night Ambient** | Calm & Relaxing | **KEEP (TOP PICK #11)**| Color transition slow-motion zen |
| **Perfect Loop Zen** | Calm & Relaxing | **KEEP (TOP PICK #12)**| Seamless infinite loop meditation |
| **Pendulum Wave** | Calm & Relaxing | **KEEP** | Harmonious physics wave motion |
| **Bass Drop Ambient** | Calm & Relaxing | **KEEP** | Deep 40Hz sub-bass calming release |
| `target` | - | **MERGE** | Merged into `sequenceBreak` (exact mechanics duplicate) |
| `colorMatch` | - | **MERGE** | Merged into `colorLock` (color matching duplicate) |
| `collisionMode` | - | **HIDE** | Raw elastic test bed, hidden behind feature flag |
| `proceduralAI` | - | **HIDE** | Experimental, moved to Advanced |
| `geometricNexus` | - | **HIDE** | Abstract math lines, moved to Advanced |
| `sandFill` | - | **HIDE** | High CPU particulate, moved to Advanced |
| `webBattle` | - | **MERGE** | Merged into `webExpansion` as battle preset |
| `magneticForceField` | - | **HIDE** | Niche physics, moved to Advanced |

---

### 2.3 Settings & Overlapping Panels (Consolidation into 5 Essentials)
Currently, `SettingsPanel.tsx` has 8 overlapping accordions (Ball, Walls, Visuals, Sound, Overlays, Hooks, Engagement, Presets). We replace the default view with **The 5 Essentials**:

1. **Music**: Melody picker (public-domain classics + original viral drops + "Upload MIDI" button).
2. **Look**: Theme / World selector (visual color swatches + mini 3D lighting previews).
3. **Marble**: 8 Hero favorites (Glass swirl, Chrome silver, Neon cyan, 8-Ball, Gold coin, Peach pearl, Emoji 🏀, Fire) + "More" modal.
4. **Text**: Hook caption with "AI Suggest" button, @Handle input, and Watermark toggle.
5. **Length & Speed**: Quick pills (15s, 30s, 60s, 90s) and Speed pills (Calm 0.5x, Normal 1.0x).

**Advanced Drawer**:
- A single, sleek collapsible accordion at the bottom: "Advanced Settings (Physics, Sound Engine, Custom Visuals)".
- Searchable and equipped with a "Reset to Defaults" button for every section.

---

### 2.4 Developer Chips & Diagnostic UI
| Item | Previous Location | New Location |
| :--- | :--- | :--- |
| FPS Counter & Memory Meter | Studio Canvas Top-Right | Moved to `/diagnostics` and hidden behind `featureFlags.showDevDiagnosticsInStudio` |
| Hit Marker Counters & Sound Drops | Canvas Bottom Overlay | Hidden from main view; visible only when Diagnostics mode active |
| Export Sound Self-Test Button | Header / Settings | Moved to `/diagnostics` |
| WebWorker Seed Search Matrix | Header | Moved to Advanced Drawer |
| Raw Seed Number Input | Main Settings | Replaced by "Randomize Seed" dice; raw number input in Advanced |

---

### 2.5 Badges & Visual Clutter
- Removed: "POPULAR", "EXCLUSIF", "HOT PICK", "PRO TIER", "SPECIAL" multi-badge spam.
- Kept: Strictly maximum **one** badge per card: `NEW` (for fresh drops) or `HOT` (for top picks).

---

## 3. The Simple 3-Step Creation Flow

### Step 1 · Pick ("Pick a Reel" Gallery)
- **Default View**: Top Picks (12 verified viral templates with animated looping previews).
- **Category Filter Tabs (6 Simple Categories)**:
  1. `marble_music` (Marble Music)
  2. `satisfying_escape` (Satisfying Escape)
  3. `battles` (Battles & Races)
  4. `asmr_glass` (ASMR Glass & Crystal)
  5. `squeaky_fun` (Squeaky & Fun)
  6. `calm_relaxing` (Calm & Relaxing)
- **Top Actions**: Real-time search + "Surprise Me" shuffle button.
- **Card Selection**: Card displays title, thumbnail, duration. Once chosen, reveals variant toggle: `Calm` · `Viral` · `Wild`.

### Step 2 · Customize (The 5 Essentials)
- Panel strictly displays the 5 essentials:
  1. **Music**: Melody dropdown + preview button + Upload MIDI.
  2. **Look**: Theme swatches with instant canvas feedback.
  3. **Marble**: Quick hero marble selector with material preview.
  4. **Text**: Hook input with instant AI suggest button, @handle, watermark toggle.
  5. **Length & Speed**: 15s / 30s / 60s / 90s + 0.5x / 1.0x.
- Each section includes a subtle "Reset" button.
- "Advanced" toggle at the bottom unveils deep physics, audio sub-mix, and canvas options.

### Step 3 · Export (One Big Button)
- **Primary CTA**: Big, vibrant `Export Reel` button.
- Default settings: `1080×1920 (9:16 vertical)`, `60 fps`, all safe areas enabled, procedural audio verified.
- Secondary Option: `4K Ultra HD` toggle (available for Pro/Studio plans with GPU support).
- **Post-Export Modal**:
  - Live MP4 video player.
  - Direct `Download MP4` & `Share Link` & `Save to Phone` buttons.
  - Viral SEO Pack: Generated SEO title, caption, and hashtags with 1-tap copy buttons.
  - `Make Another Reel` CTA to cycle back to Step 1.

---

## 4. Quality Gate Specification (`REELS_QA.md`)

Every preset displayed in the gallery must pass automated headless testing:
1. **Completion**: Simulation reaches its climax/finale between target duration - 1s and target duration.
2. **Safe Framing**: Ball and primary obstacles stay within the 9:16 safe area boundaries (margins: top 120px, bottom 200px, sides 48px).
3. **Sound Guarantee**:
   - 100% of physical collisions emit audio.
   - Melody notes play in precise chronological order and pitch.
   - Master audio loudness within -14 LUFS ± 1 LUFS with 0dBFS clipping protection.
4. **MP4 Export Integrity**: Rendered video contains synchronized H.264 video track and AAC audio track, matching length and seed.
5. **Aesthetics**: Valid cover thumbnail generated, text overlay rendered cleanly without truncation.
6. **Copyright Safety**: Strictly original procedural sound designs and public domain melodies.

---

## 5. Implementation Phases

- [x] Phase 1: Write `CLEANUP_PLAN.md` (this document).
- [ ] Phase 2: Create `src/config/featureFlags.ts` & update store for feature toggles.
- [ ] Phase 3: Refactor `Header.tsx` to the clean 5-item top bar (`Logo · Studio · My Videos · Pricing · Account`).
- [ ] Phase 4: Create `MyVideosPage.tsx` for managing exports and saved setups.
- [ ] Phase 5: Implement `EssentialControls.tsx` (The 5 Essentials + collapsible Advanced drawer).
- [ ] Phase 6: Refactor `ModeGallery.tsx` (Top Picks 12 + 6 clean categories + search + variants).
- [ ] Phase 7: Update `Studio.tsx` desktop 3-column layout and mobile 3-tab bottom sheet (`Pick · Customize · Export`).
- [ ] Phase 8: Run automated quality gate script `scripts/verifyReelsQA.ts` and generate `REELS_QA.md`.
- [ ] Phase 9: End-to-end browser and mobile testing + performance audit (<3s studio load, <1.5s template switch).
