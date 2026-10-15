# BOUNCEFORGE ALL-DEVICES COMPATIBILITY & TESTING MANUAL

BounceForge is engineered for 100% cross-device compatibility across all form factors (phones, tablets, foldables, laptops, ultra-wide desktops) and modern browsers (Safari, Chrome, Edge, Firefox, Samsung Internet).

---

## 1. Automated Test Matrix

| Device / Emulation Profile | Viewport (px) | DPR | Graphics Tier | Audio Session | Video Export Path | PWA / Offline |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **iPhone SE (3rd Gen)** | 375 × 667 | 2.0x | Medium / Low (30fps) | Resumed / Playback Category | WebCodecs (1080p60) + Web Share | Cached Offline |
| **iPhone 15 / 16 Pro Max** | 430 × 932 | 3.0x | High (60fps) | Silent Switch Bypass | WebCodecs (1080p60 / 1440p) + Web Share | Cached Offline |
| **Pixel 7 / 8 / 9** | 412 × 915 | 2.625x | High (60fps) | AudioContext Unlocked | WebCodecs 4K / 1080p + Web Share | Standalone Installable |
| **Samsung Galaxy A series (Low-RAM 2-3GB)** | 360 × 800 | 2.0x | Low (30fps auto) | Max 32 Voices | Quick Record Mode or 1080p30 | Cached Offline |
| **Galaxy Z Fold (Folded)** | 344 × 882 | 2.625x | Medium (60fps) | Unlocked | WebCodecs 1080p | Standalone Installable |
| **Galaxy Z Fold (Unfolded Tablet)** | 882 × 689 | 2.625x | High (60fps) | Unlocked | WebCodecs 1440p | Standalone Installable |
| **iPad Mini & iPad Air (Portrait)** | 768 × 1024 | 2.0x | High (60fps) | Playback Category | WebCodecs 1080p / 1440p | Standalone PWA |
| **iPad Pro 12.9" (Landscape)** | 1366 × 1024 | 2.0x | Ultra (60-120fps) | Playback Category | WebCodecs 4K60 | Standalone PWA |
| **Windows 10/11 Laptop** | 1366 × 768 / 1920 × 1080 | 1.0x-1.5x | High / Ultra | Standard 48kHz | WebCodecs + File System Streaming | PWA Installable |
| **macOS Desktop / Retina** | 1728 × 1117 / 2560 × 1440 | 2.0x | Ultra (60-120fps) | Low Latency CoreAudio | WebCodecs 4K60 + File System | PWA Installable |
| **Chromebook (ChromeOS)** | 1366 × 768 | 1.0x | Medium | Standard | WebCodecs 1080p | Standalone PWA |

---

## 2. Real-Device Step-by-Step QA Checklist

### A. Cheap Android Phone (e.g. Galaxy A / Moto G / Redmi 2–3 GB RAM)
1. **Launch**: Open BounceForge URL in Chrome or Samsung Internet.
   - Verify: Instant load under 3 seconds; branded loading state.
   - Verify: Quality chip displays `quality: low (auto)` or `quality: medium (auto)`.
2. **Audio**: Tap preview or "tap for sound" banner.
   - Verify: Chimes and piano melodies play cleanly without stuttering.
3. **Modes**: Swipe horizontal mode chips row; switch between 3 modes (*Classic*, *Pinball*, *Vortex Gravity*).
   - Verify: Simulation seamlessly switches without UI freezes.
4. **Settings**: Tap the floating `settings` pill at bottom left.
   - Verify: Bottom sheet opens smoothly with safe pull-handle.
   - Verify: Go to `diagnostics › my device`, check RAM and GPU tier, tap `copy report`.
5. **Export**: Tap floating `render` pill.
   - Verify: Defaults to 1080p (warns on 4K if RAM < 4GB).
   - Verify: Screen stays awake (Wake Lock active).
   - Verify: On complete, tap **Save to Photos / Share Video** to open Android system share sheet.
6. **PWA & Offline**: Tap browser menu › **Add to Home screen** / **Install app**.
   - Turn off Wi-Fi & cellular data, open app from home screen.
   - Verify: Studio opens and plays physics offline.

### B. iPhone (iOS 16.4+, Safari or Chrome on iOS)
1. **Silent Switch Test**: Flip physical mute switch to Silent.
   - Tap "tap for sound" or canvas.
   - Verify: Sound plays through speaker despite silent switch (`audioSession.type = 'playback'`).
2. **Background / Tab Switch**:
   - Start animation, switch to another tab or lock phone for 5 seconds, switch back.
   - Verify: Audio resumes automatically without needing another tap.
3. **Safe Area & Dynamic Island**:
   - View in portrait: notch / dynamic island does not clip the header; home indicator at bottom does not cover scrubber or render pill.
4. **Export**: Export 15s 1080p MP4.
   - Tap **Save to Photos / Share Video** (`navigator.share({ files: [file] })`).
   - Choose "Save Video" to save directly to iOS Photos Camera Roll.
5. **PWA**: Tap Safari Share › **Add to Home Screen**.
   - Launch from home screen; confirm standalone status bar and full offline cached playback.

### C. iPad / Android Tablet
1. **Orientation Test**:
   - Portrait: Preview renders on top half; modes and settings render in 2 columns on bottom half.
   - Rotate to Landscape: Smoothly switches to 3-column layout without reloading simulation or losing active seed.
2. **Touch & Gestures**:
   - Long-press preview: Triggers 10ms haptic feedback and resets scene.
   - Double-tap on settings sliders: resets individual parameter to default.

### D. Windows 10/11 (Chrome, Edge, Firefox)
1. **Keyboard Controls**:
   - `Space`: Play / Pause.
   - `R`: Restart animation.
   - `Shift + R`: Reset current mode to factory default.
   - `N`: Randomize seed.
   - `M`: Toggle mute.
   - `E`: Open export modal.
2. **Direct Disk Streaming**:
   - Open Export modal › enable "Stream directly to disk (File System Access API)".
   - Start 4K export: file saves progressively to chosen folder without memory exhaustion.
3. **Accessibility**:
   - Enable Windows High Contrast mode: text and borders remain crisp and legible.

### E. macOS (Safari, Chrome, Firefox)
1. **High Refresh Rate**:
   - On 120Hz ProMotion MacBook screens, verify smooth rendering at target tier.
2. **Diagnostics**:
   - Open Settings › Diagnostics › tap "copy report" and verify all fields populate (WebCodecs H.264, AAC stereo, WebGL2/WebGPU, File System).

---

## 3. Failure & Fallback Handling Verification

- **Older Browser Fallback**: Browsers lacking Canvas2D / ES6 show an explicit branded message with Chrome, Edge, and Safari download buttons rather than a blank screen.
- **WebGL Context Loss**: Automatically catches `contextlost`, displays toast notification, and restores physics and scene upon `contextrestored`.
- **Battery Conservation**: If battery < 20% and not charging, Export modal warns user to plug in charger before running intensive 4K exports.
- **Background Export Pause**: If mobile tab is backgrounded during export, encoding safely pauses and resumes when tab returns.
