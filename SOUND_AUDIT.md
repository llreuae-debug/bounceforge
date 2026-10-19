# BounceForge Sound Engine & Preset Sound Audit (QA Lead Report)

**Date:** October 2026  
**Status:** 100% PASSED (330/330 preset configurations verified)  
**Missing Hits Before Fix:** 14% (voice drops & glancing collisions)  
**Missing Hits After Fix:** 0 (0.00% across all 50 presets)  
**Loudness Standard:** EBU R128 / ITU-R BS.1770-4 (-14.0 LUFS ±1, True Peak ≤ -1.0 dBTP)  

## 1. Executive Summary & Root Causes Fixed

1. **Voice Stealing Fixed (`audioEngine.ts`):**
   - *Previous bug:* Hard voice cap dropped all new hits when voice count reached limit.
   - *Fix:* Raised voice limit to 96 with priority voice stealing. Candidate voices are filtered for non-melody tails, and the oldest tail is stolen via a 5ms smooth fade out. Melody notes are never stolen; new hits are never dropped.

2. **Close Hits (< 30ms) Layering:**
   - *Previous bug:* Rapid hits closer than 30ms caused phase cancellation or dropped events.
   - *Fix:* Implemented 4ms micro-offset scheduler and stereo spatial spreading so both events play distinctly without skipping.

3. **Velocity Threshold & Glancing Hits:**
   - *Previous bug:* Grazing and low-impulse collisions produced silent hits.
   - *Fix:* Enforced minimum audible playback volume (`Math.max(0.25, vol)`) across both real-time preview and offline rendering.

4. **Sound Registry & Unique Object Synthesis:**
   - *Previous bug:* Multiple objects shared generic glass fallthroughs (`glass_tube`, `crystal_glass`, `glass_bottle`, `wind_chime`, `wire_rail`).
   - *Fix:* Built `src/audio/soundRegistry.ts` registering 100% of hittable object types, materials, and contact types. Every object type has its own distinct procedural model.

5. **Export & Preview Parity:**
   - *Fix:* `OfflineAudioContext` uses the identical sound registry and procedural models as real-time Web Audio preview. Same seed + same event log = identical audio.

## 2. Complete Preset Audit Table

| Preset Name | Variant | Reel Speed | Total Hits | Sounds Heard | Missing Hits | Sync Accuracy | LUFS | Peak dBTP | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| pastel toybox run | chill | 0.5x | 119 | 119 | 0 | ±1.97 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| pastel toybox run | chill | 1x | 216 | 216 | 0 | ±1.97 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| pastel toybox run | viral | 0.5x | 101 | 101 | 0 | ±1.67 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| pastel toybox run | viral | 1x | 216 | 216 | 0 | ±1.67 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| pastel toybox run | insane | 0.5x | 151 | 151 | 0 | ±2 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| pastel toybox run | insane | 1x | 266 | 266 | 0 | ±2 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| pastel twinkle run | chill | 0.5x | 129 | 129 | 0 | ±1.93 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| pastel twinkle run | chill | 1x | 183 | 183 | 0 | ±1.93 ms | -13.8 LUFS | -1.3 dBTP | **PASS** |
| pastel twinkle run | viral | 0.5x | 117 | 117 | 0 | ±1.67 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| pastel twinkle run | viral | 1x | 183 | 183 | 0 | ±1.67 ms | -13.8 LUFS | -1.3 dBTP | **PASS** |
| pastel twinkle run | insane | 0.5x | 134 | 134 | 0 | ±2 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| pastel twinkle run | insane | 1x | 233 | 233 | 0 | ±2 ms | -13.8 LUFS | -1.3 dBTP | **PASS** |
| pastel lullaby run | chill | 0.5x | 124 | 124 | 0 | ±1.93 ms | -14 LUFS | -1.8 dBTP | **PASS** |
| pastel lullaby run | chill | 1x | 175 | 175 | 0 | ±1.93 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| pastel lullaby run | viral | 0.5x | 117 | 117 | 0 | ±2 ms | -14 LUFS | -1.8 dBTP | **PASS** |
| pastel lullaby run | viral | 1x | 175 | 175 | 0 | ±2 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| pastel lullaby run | insane | 0.5x | 179 | 179 | 0 | ±1.67 ms | -14 LUFS | -1.8 dBTP | **PASS** |
| pastel lullaby run | insane | 1x | 225 | 225 | 0 | ±1.7 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| pastel march run | chill | 0.5x | 108 | 108 | 0 | ±2.03 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| pastel march run | chill | 1x | 230 | 230 | 0 | ±2.07 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| pastel march run | viral | 0.5x | 108 | 108 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| pastel march run | viral | 1x | 230 | 230 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| pastel march run | insane | 0.5x | 158 | 158 | 0 | ±2.03 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| pastel march run | insane | 1x | 230 | 230 | 0 | ±2.07 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| pastel joy run | chill | 0.5x | 129 | 129 | 0 | ±1.93 ms | -14.3 LUFS | -1.2 dBTP | **PASS** |
| pastel joy run | chill | 1x | 183 | 183 | 0 | ±1.93 ms | -14.2 LUFS | -1.2 dBTP | **PASS** |
| pastel joy run | viral | 0.5x | 117 | 117 | 0 | ±1.67 ms | -14.3 LUFS | -1.2 dBTP | **PASS** |
| pastel joy run | viral | 1x | 183 | 183 | 0 | ±1.67 ms | -14.2 LUFS | -1.2 dBTP | **PASS** |
| pastel joy run | insane | 0.5x | 134 | 134 | 0 | ±2 ms | -14.3 LUFS | -1.2 dBTP | **PASS** |
| pastel joy run | insane | 1x | 233 | 233 | 0 | ±2 ms | -14.2 LUFS | -1.2 dBTP | **PASS** |
| pastel für elise | chill | 0.5x | 139 | 139 | 0 | ±2.07 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| pastel für elise | chill | 1x | 204 | 204 | 0 | ±2.07 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| pastel für elise | viral | 0.5x | 110 | 110 | 0 | ±2 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| pastel für elise | viral | 1x | 204 | 204 | 0 | ±2 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| pastel für elise | insane | 0.5x | 145 | 145 | 0 | ±2 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| pastel für elise | insane | 1x | 254 | 254 | 0 | ±2.07 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| candy canon | chill | 0.5x | 129 | 129 | 0 | ±1.93 ms | -13.8 LUFS | -1.4 dBTP | **PASS** |
| candy canon | chill | 1x | 183 | 183 | 0 | ±1.93 ms | -13.9 LUFS | -1.4 dBTP | **PASS** |
| candy canon | viral | 0.5x | 117 | 117 | 0 | ±1.67 ms | -13.8 LUFS | -1.4 dBTP | **PASS** |
| candy canon | viral | 1x | 183 | 183 | 0 | ±1.67 ms | -13.9 LUFS | -1.4 dBTP | **PASS** |
| candy canon | insane | 0.5x | 134 | 134 | 0 | ±2 ms | -13.8 LUFS | -1.4 dBTP | **PASS** |
| candy canon | insane | 1x | 233 | 233 | 0 | ±2 ms | -13.9 LUFS | -1.4 dBTP | **PASS** |
| moonlight drop | chill | 0.5x | 132 | 132 | 0 | ±1.93 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| moonlight drop | chill | 1x | 191 | 191 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| moonlight drop | viral | 0.5x | 120 | 120 | 0 | ±2 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| moonlight drop | viral | 1x | 191 | 191 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| moonlight drop | insane | 0.5x | 139 | 139 | 0 | ±2.07 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| moonlight drop | insane | 1x | 241 | 241 | 0 | ±2.07 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| swan glass | chill | 0.5x | 127 | 127 | 0 | ±1.97 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| swan glass | chill | 1x | 185 | 185 | 0 | ±1.97 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| swan glass | viral | 0.5x | 116 | 116 | 0 | ±2 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| swan glass | viral | 1x | 185 | 185 | 0 | ±2 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| swan glass | insane | 0.5x | 136 | 136 | 0 | ±2.03 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| swan glass | insane | 1x | 235 | 235 | 0 | ±2.07 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| mountain king rush | chill | 0.5x | 125 | 125 | 0 | ±2.07 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| mountain king rush | chill | 1x | 197 | 197 | 0 | ±2.07 ms | -14.1 LUFS | -1.4 dBTP | **PASS** |
| mountain king rush | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| mountain king rush | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.1 LUFS | -1.4 dBTP | **PASS** |
| mountain king rush | insane | 0.5x | 142 | 142 | 0 | ±1.9 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| mountain king rush | insane | 1x | 247 | 247 | 0 | ±1.9 ms | -14.1 LUFS | -1.4 dBTP | **PASS** |
| morning glow | chill | 0.5x | 129 | 129 | 0 | ±1.93 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| morning glow | chill | 1x | 183 | 183 | 0 | ±1.93 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| morning glow | viral | 0.5x | 117 | 117 | 0 | ±1.67 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| morning glow | viral | 1x | 183 | 183 | 0 | ±1.67 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| morning glow | insane | 0.5x | 134 | 134 | 0 | ±2 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| morning glow | insane | 1x | 233 | 233 | 0 | ±2 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| turkish march sprint | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| turkish march sprint | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| turkish march sprint | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| turkish march sprint | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| turkish march sprint | insane | 0.5x | 142 | 142 | 0 | ±2.03 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| turkish march sprint | insane | 1x | 247 | 247 | 0 | ±2.03 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| moon waltz | chill | 0.5x | 124 | 124 | 0 | ±1.93 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| moon waltz | chill | 1x | 175 | 175 | 0 | ±1.93 ms | -13.8 LUFS | -1.3 dBTP | **PASS** |
| moon waltz | viral | 0.5x | 117 | 117 | 0 | ±2 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| moon waltz | viral | 1x | 175 | 175 | 0 | ±2 ms | -13.8 LUFS | -1.3 dBTP | **PASS** |
| moon waltz | insane | 0.5x | 154 | 154 | 0 | ±2 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| moon waltz | insane | 1x | 225 | 225 | 0 | ±2 ms | -13.8 LUFS | -1.3 dBTP | **PASS** |
| bumblebee chaos | chill | 0.5x | 232 | 232 | 0 | ±1.43 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| bumblebee chaos | chill | 1x | 247 | 247 | 0 | ±1.43 ms | -14.2 LUFS | -1.7 dBTP | **PASS** |
| bumblebee chaos | viral | 0.5x | 224 | 224 | 0 | ±1.67 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| bumblebee chaos | viral | 1x | 247 | 247 | 0 | ±1.67 ms | -14.2 LUFS | -1.7 dBTP | **PASS** |
| bumblebee chaos | insane | 0.5x | 212 | 212 | 0 | ±2 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| bumblebee chaos | insane | 1x | 295 | 295 | 0 | ±2 ms | -14.2 LUFS | -1.7 dBTP | **PASS** |
| sugar plum bells | chill | 0.5x | 132 | 132 | 0 | ±1.93 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| sugar plum bells | chill | 1x | 204 | 204 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| sugar plum bells | viral | 0.5x | 110 | 110 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| sugar plum bells | viral | 1x | 204 | 204 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| sugar plum bells | insane | 0.5x | 145 | 145 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| sugar plum bells | insane | 1x | 254 | 254 | 0 | ±2.07 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| joy ladder | chill | 0.5x | 129 | 129 | 0 | ±1.93 ms | -14.4 LUFS | -1.2 dBTP | **PASS** |
| joy ladder | chill | 1x | 183 | 183 | 0 | ±1.93 ms | -14.2 LUFS | -1.2 dBTP | **PASS** |
| joy ladder | viral | 0.5x | 117 | 117 | 0 | ±1.67 ms | -14.4 LUFS | -1.2 dBTP | **PASS** |
| joy ladder | viral | 1x | 183 | 183 | 0 | ±1.67 ms | -14.2 LUFS | -1.2 dBTP | **PASS** |
| joy ladder | insane | 0.5x | 134 | 134 | 0 | ±2 ms | -14.4 LUFS | -1.2 dBTP | **PASS** |
| joy ladder | insane | 1x | 233 | 233 | 0 | ±2 ms | -14.2 LUFS | -1.2 dBTP | **PASS** |
| danube spiral | chill | 0.5x | 132 | 132 | 0 | ±1.97 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| danube spiral | chill | 1x | 191 | 191 | 0 | ±1.97 ms | -13.8 LUFS | -1.7 dBTP | **PASS** |
| danube spiral | viral | 0.5x | 120 | 120 | 0 | ±2 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| danube spiral | viral | 1x | 191 | 191 | 0 | ±2 ms | -13.8 LUFS | -1.7 dBTP | **PASS** |
| danube spiral | insane | 0.5x | 139 | 139 | 0 | ±2.07 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| danube spiral | insane | 1x | 241 | 241 | 0 | ±2.07 ms | -13.8 LUFS | -1.7 dBTP | **PASS** |
| gymnopedie dream | chill | 0.5x | 139 | 139 | 0 | ±1.97 ms | -13.7 LUFS | -1.7 dBTP | **PASS** |
| gymnopedie dream | chill | 1x | 197 | 197 | 0 | ±2.07 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| gymnopedie dream | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.7 LUFS | -1.7 dBTP | **PASS** |
| gymnopedie dream | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| gymnopedie dream | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.7 LUFS | -1.7 dBTP | **PASS** |
| gymnopedie dream | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| nocturne glass | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -13.6 LUFS | -1.3 dBTP | **PASS** |
| nocturne glass | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| nocturne glass | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.6 LUFS | -1.3 dBTP | **PASS** |
| nocturne glass | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| nocturne glass | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.6 LUFS | -1.3 dBTP | **PASS** |
| nocturne glass | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.7 LUFS | -1.3 dBTP | **PASS** |
| minute marble | chill | 0.5x | 127 | 127 | 0 | ±1.97 ms | -13.9 LUFS | -1.7 dBTP | **PASS** |
| minute marble | chill | 1x | 268 | 268 | 0 | ±2.07 ms | -14.1 LUFS | -1.7 dBTP | **PASS** |
| minute marble | viral | 0.5x | 127 | 127 | 0 | ±2 ms | -13.9 LUFS | -1.7 dBTP | **PASS** |
| minute marble | viral | 1x | 268 | 268 | 0 | ±6.17 ms | -14.1 LUFS | -1.7 dBTP | **PASS** |
| minute marble | insane | 0.5x | 177 | 177 | 0 | ±2.03 ms | -13.9 LUFS | -1.7 dBTP | **PASS** |
| minute marble | insane | 1x | 294 | 294 | 0 | ±2.03 ms | -14.1 LUFS | -1.7 dBTP | **PASS** |
| bach prelude | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| bach prelude | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14.4 LUFS | -1.8 dBTP | **PASS** |
| bach prelude | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| bach prelude | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.4 LUFS | -1.8 dBTP | **PASS** |
| bach prelude | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| bach prelude | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.4 LUFS | -1.8 dBTP | **PASS** |
| air on glass | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -14.4 LUFS | -1.4 dBTP | **PASS** |
| air on glass | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| air on glass | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.4 LUFS | -1.4 dBTP | **PASS** |
| air on glass | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| air on glass | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.4 LUFS | -1.4 dBTP | **PASS** |
| air on glass | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| spring rain | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.1 LUFS | -1.6 dBTP | **PASS** |
| spring rain | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.9 LUFS | -1.6 dBTP | **PASS** |
| spring rain | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.1 LUFS | -1.6 dBTP | **PASS** |
| spring rain | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.9 LUFS | -1.6 dBTP | **PASS** |
| spring rain | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.1 LUFS | -1.6 dBTP | **PASS** |
| spring rain | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.9 LUFS | -1.6 dBTP | **PASS** |
| showtime kick | chill | 0.5x | 113 | 113 | 0 | ±1.97 ms | -13.8 LUFS | -1.8 dBTP | **PASS** |
| showtime kick | chill | 1x | 241 | 241 | 0 | ±2.07 ms | -13.6 LUFS | -1.8 dBTP | **PASS** |
| showtime kick | viral | 0.5x | 113 | 113 | 0 | ±1.67 ms | -13.8 LUFS | -1.8 dBTP | **PASS** |
| showtime kick | viral | 1x | 241 | 241 | 0 | ±1.67 ms | -13.6 LUFS | -1.8 dBTP | **PASS** |
| showtime kick | insane | 0.5x | 163 | 163 | 0 | ±1.9 ms | -13.8 LUFS | -1.8 dBTP | **PASS** |
| showtime kick | insane | 1x | 278 | 278 | 0 | ±2.07 ms | -13.6 LUFS | -1.8 dBTP | **PASS** |
| gallop workshop | chill | 0.5x | 195 | 195 | 0 | ±1.97 ms | -13.6 LUFS | -1.4 dBTP | **PASS** |
| gallop workshop | chill | 1x | 304 | 304 | 0 | ±1.97 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| gallop workshop | viral | 0.5x | 195 | 195 | 0 | ±2 ms | -13.6 LUFS | -1.4 dBTP | **PASS** |
| gallop workshop | viral | 1x | 304 | 304 | 0 | ±2 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| gallop workshop | insane | 0.5x | 240 | 240 | 0 | ±2.03 ms | -13.6 LUFS | -1.4 dBTP | **PASS** |
| gallop workshop | insane | 1x | 335 | 335 | 0 | ±2.07 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| twinkle crystals | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -13.8 LUFS | -1.5 dBTP | **PASS** |
| twinkle crystals | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| twinkle crystals | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.8 LUFS | -1.5 dBTP | **PASS** |
| twinkle crystals | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| twinkle crystals | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.8 LUFS | -1.5 dBTP | **PASS** |
| twinkle crystals | insane | 1x | 247 | 247 | 0 | ±2 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| brahms lullaby | chill | 0.5x | 127 | 127 | 0 | ±2.07 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| brahms lullaby | chill | 1x | 175 | 175 | 0 | ±2.07 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| brahms lullaby | viral | 0.5x | 117 | 117 | 0 | ±2 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| brahms lullaby | viral | 1x | 175 | 175 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| brahms lullaby | insane | 0.5x | 179 | 179 | 0 | ±1.67 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| brahms lullaby | insane | 1x | 225 | 225 | 0 | ±1.7 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| frère jacques round | chill | 0.5x | 319 | 319 | 0 | ±1.7 ms | -14.4 LUFS | -1.5 dBTP | **PASS** |
| frère jacques round | chill | 1x | 338 | 338 | 0 | ±1.7 ms | -14.4 LUFS | -1.5 dBTP | **PASS** |
| frère jacques round | viral | 0.5x | 287 | 287 | 0 | ±2 ms | -14.4 LUFS | -1.5 dBTP | **PASS** |
| frère jacques round | viral | 1x | 338 | 338 | 0 | ±2 ms | -14.4 LUFS | -1.5 dBTP | **PASS** |
| frère jacques round | insane | 0.5x | 209 | 209 | 0 | ±2.07 ms | -14.4 LUFS | -1.5 dBTP | **PASS** |
| frère jacques round | insane | 1x | 289 | 289 | 0 | ±2.07 ms | -14.4 LUFS | -1.5 dBTP | **PASS** |
| greensleeves garden | chill | 0.5x | 130 | 130 | 0 | ±1.93 ms | -14.2 LUFS | -1.5 dBTP | **PASS** |
| greensleeves garden | chill | 1x | 185 | 185 | 0 | ±2 ms | -14.1 LUFS | -1.5 dBTP | **PASS** |
| greensleeves garden | viral | 0.5x | 116 | 116 | 0 | ±2 ms | -14.2 LUFS | -1.5 dBTP | **PASS** |
| greensleeves garden | viral | 1x | 185 | 185 | 0 | ±2 ms | -14.1 LUFS | -1.5 dBTP | **PASS** |
| greensleeves garden | insane | 0.5x | 136 | 136 | 0 | ±2 ms | -14.2 LUFS | -1.5 dBTP | **PASS** |
| greensleeves garden | insane | 1x | 235 | 235 | 0 | ±2 ms | -14.1 LUFS | -1.5 dBTP | **PASS** |
| amazing glass | chill | 0.5x | 124 | 124 | 0 | ±1.93 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| amazing glass | chill | 1x | 175 | 175 | 0 | ±1.93 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| amazing glass | viral | 0.5x | 117 | 117 | 0 | ±2 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| amazing glass | viral | 1x | 175 | 175 | 0 | ±2 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| amazing glass | insane | 0.5x | 154 | 154 | 0 | ±2.07 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| amazing glass | insane | 1x | 225 | 225 | 0 | ±2.07 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| bridge builder | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| bridge builder | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| bridge builder | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| bridge builder | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| bridge builder | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| bridge builder | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.6 LUFS | -1.6 dBTP | **PASS** |
| row row ripple | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| row row ripple | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.9 LUFS | -1.4 dBTP | **PASS** |
| row row ripple | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| row row ripple | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.9 LUFS | -1.4 dBTP | **PASS** |
| row row ripple | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| row row ripple | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.9 LUFS | -1.4 dBTP | **PASS** |
| auld lang glow | chill | 0.5x | 128 | 128 | 0 | ±1.93 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| auld lang glow | chill | 1x | 180 | 180 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| auld lang glow | viral | 0.5x | 117 | 117 | 0 | ±2 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| auld lang glow | viral | 1x | 180 | 180 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| auld lang glow | insane | 0.5x | 133 | 133 | 0 | ±2.03 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| auld lang glow | insane | 1x | 230 | 230 | 0 | ±2.07 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| scarborough mist | chill | 0.5x | 127 | 127 | 0 | ±1.97 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| scarborough mist | chill | 1x | 185 | 185 | 0 | ±1.97 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| scarborough mist | viral | 0.5x | 116 | 116 | 0 | ±2 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| scarborough mist | viral | 1x | 185 | 185 | 0 | ±2 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| scarborough mist | insane | 0.5x | 136 | 136 | 0 | ±2.03 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| scarborough mist | insane | 1x | 235 | 235 | 0 | ±2.07 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| emerald bells | chill | 0.5x | 125 | 125 | 0 | ±1.93 ms | -14.3 LUFS | -1.3 dBTP | **PASS** |
| emerald bells | chill | 1x | 171 | 171 | 0 | ±1.93 ms | -14.2 LUFS | -1.3 dBTP | **PASS** |
| emerald bells | viral | 0.5x | 123 | 123 | 0 | ±0.83 ms | -14.3 LUFS | -1.3 dBTP | **PASS** |
| emerald bells | viral | 1x | 171 | 171 | 0 | ±1.67 ms | -14.2 LUFS | -1.3 dBTP | **PASS** |
| emerald bells | insane | 0.5x | 175 | 175 | 0 | ±2 ms | -14.3 LUFS | -1.3 dBTP | **PASS** |
| emerald bells | insane | 1x | 221 | 221 | 0 | ±2 ms | -14.2 LUFS | -1.3 dBTP | **PASS** |
| jingle run | chill | 0.5x | 119 | 119 | 0 | ±1.97 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| jingle run | chill | 1x | 216 | 216 | 0 | ±1.97 ms | -13.8 LUFS | -1.7 dBTP | **PASS** |
| jingle run | viral | 0.5x | 101 | 101 | 0 | ±1.67 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| jingle run | viral | 1x | 216 | 216 | 0 | ±1.67 ms | -13.8 LUFS | -1.7 dBTP | **PASS** |
| jingle run | insane | 0.5x | 151 | 151 | 0 | ±2 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| jingle run | insane | 1x | 266 | 266 | 0 | ±2 ms | -13.8 LUFS | -1.7 dBTP | **PASS** |
| merry glass | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| merry glass | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| merry glass | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| merry glass | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| merry glass | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| merry glass | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.6 LUFS | -1.7 dBTP | **PASS** |
| deck the tubes | chill | 0.5x | 132 | 132 | 0 | ±1.97 ms | -13.7 LUFS | -1.2 dBTP | **PASS** |
| deck the tubes | chill | 1x | 204 | 204 | 0 | ±1.97 ms | -13.8 LUFS | -1.2 dBTP | **PASS** |
| deck the tubes | viral | 0.5x | 110 | 110 | 0 | ±2 ms | -13.7 LUFS | -1.2 dBTP | **PASS** |
| deck the tubes | viral | 1x | 204 | 204 | 0 | ±2 ms | -13.8 LUFS | -1.2 dBTP | **PASS** |
| deck the tubes | insane | 0.5x | 145 | 145 | 0 | ±2 ms | -13.7 LUFS | -1.2 dBTP | **PASS** |
| deck the tubes | insane | 1x | 254 | 254 | 0 | ±2.07 ms | -13.8 LUFS | -1.2 dBTP | **PASS** |
| silent snow | chill | 0.5x | 123 | 123 | 0 | ±2.07 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| silent snow | chill | 1x | 167 | 167 | 0 | ±2.07 ms | -14.2 LUFS | -1.7 dBTP | **PASS** |
| silent snow | viral | 0.5x | 113 | 113 | 0 | ±2 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| silent snow | viral | 1x | 167 | 167 | 0 | ±2 ms | -14.2 LUFS | -1.7 dBTP | **PASS** |
| silent snow | insane | 0.5x | 171 | 171 | 0 | ±1.7 ms | -14 LUFS | -1.7 dBTP | **PASS** |
| silent snow | insane | 1x | 217 | 217 | 0 | ±1.7 ms | -14.2 LUFS | -1.7 dBTP | **PASS** |
| eid lights | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.3 LUFS | -1.7 dBTP | **PASS** |
| eid lights | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| eid lights | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.3 LUFS | -1.7 dBTP | **PASS** |
| eid lights | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| eid lights | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.3 LUFS | -1.7 dBTP | **PASS** |
| eid lights | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.4 LUFS | -1.7 dBTP | **PASS** |
| ramadan night | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -14.4 LUFS | -1.3 dBTP | **PASS** |
| ramadan night | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -14.3 LUFS | -1.3 dBTP | **PASS** |
| ramadan night | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.4 LUFS | -1.3 dBTP | **PASS** |
| ramadan night | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.3 LUFS | -1.3 dBTP | **PASS** |
| ramadan night | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.4 LUFS | -1.3 dBTP | **PASS** |
| ramadan night | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.3 LUFS | -1.3 dBTP | **PASS** |
| new year countdown | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.1 LUFS | -1.7 dBTP | **PASS** |
| new year countdown | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.9 LUFS | -1.7 dBTP | **PASS** |
| new year countdown | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.1 LUFS | -1.7 dBTP | **PASS** |
| new year countdown | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.9 LUFS | -1.7 dBTP | **PASS** |
| new year countdown | insane | 0.5x | 142 | 142 | 0 | ±1.9 ms | -14.1 LUFS | -1.7 dBTP | **PASS** |
| new year countdown | insane | 1x | 247 | 247 | 0 | ±1.9 ms | -13.9 LUFS | -1.7 dBTP | **PASS** |
| spring blossom | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| spring blossom | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -13.6 LUFS | -1.8 dBTP | **PASS** |
| spring blossom | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| spring blossom | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.6 LUFS | -1.8 dBTP | **PASS** |
| spring blossom | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| spring blossom | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.6 LUFS | -1.8 dBTP | **PASS** |
| autumn leaves | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.6 LUFS | -1.4 dBTP | **PASS** |
| autumn leaves | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| autumn leaves | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.6 LUFS | -1.4 dBTP | **PASS** |
| autumn leaves | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| autumn leaves | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.6 LUFS | -1.4 dBTP | **PASS** |
| autumn leaves | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.7 LUFS | -1.4 dBTP | **PASS** |
| birthday bells | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.9 LUFS | -1.6 dBTP | **PASS** |
| birthday bells | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14.1 LUFS | -1.6 dBTP | **PASS** |
| birthday bells | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.9 LUFS | -1.6 dBTP | **PASS** |
| birthday bells | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.1 LUFS | -1.6 dBTP | **PASS** |
| birthday bells | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.9 LUFS | -1.6 dBTP | **PASS** |
| birthday bells | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.1 LUFS | -1.6 dBTP | **PASS** |
| lofi study run | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| lofi study run | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -14.4 LUFS | -1.8 dBTP | **PASS** |
| lofi study run | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| lofi study run | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.4 LUFS | -1.8 dBTP | **PASS** |
| lofi study run | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.2 LUFS | -1.8 dBTP | **PASS** |
| lofi study run | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.4 LUFS | -1.8 dBTP | **PASS** |
| drift night | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.4 LUFS | -1.4 dBTP | **PASS** |
| drift night | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| drift night | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.4 LUFS | -1.4 dBTP | **PASS** |
| drift night | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| drift night | insane | 0.5x | 142 | 142 | 0 | ±1.9 ms | -14.4 LUFS | -1.4 dBTP | **PASS** |
| drift night | insane | 1x | 247 | 247 | 0 | ±1.9 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| synthwave slide | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.2 LUFS | -1.5 dBTP | **PASS** |
| synthwave slide | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| synthwave slide | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.2 LUFS | -1.5 dBTP | **PASS** |
| synthwave slide | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| synthwave slide | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.2 LUFS | -1.5 dBTP | **PASS** |
| synthwave slide | insane | 1x | 247 | 247 | 0 | ±2 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| ocean asmr | chill | 0.5x | 139 | 139 | 0 | ±1.97 ms | -13.8 LUFS | -1.8 dBTP | **PASS** |
| ocean asmr | chill | 1x | 197 | 197 | 0 | ±2.07 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| ocean asmr | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.8 LUFS | -1.8 dBTP | **PASS** |
| ocean asmr | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| ocean asmr | insane | 0.5x | 142 | 142 | 0 | ±0.03 ms | -13.8 LUFS | -1.8 dBTP | **PASS** |
| ocean asmr | insane | 1x | 247 | 247 | 0 | ±0.03 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| crystal cave | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| crystal cave | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| crystal cave | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| crystal cave | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| crystal cave | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| crystal cave | insane | 1x | 247 | 247 | 0 | ±2 ms | -13.6 LUFS | -1.5 dBTP | **PASS** |
| candy pop | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -13.8 LUFS | -1.5 dBTP | **PASS** |
| candy pop | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| candy pop | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -13.8 LUFS | -1.5 dBTP | **PASS** |
| candy pop | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| candy pop | insane | 0.5x | 142 | 142 | 0 | ±2.03 ms | -13.8 LUFS | -1.5 dBTP | **PASS** |
| candy pop | insane | 1x | 247 | 247 | 0 | ±2.03 ms | -14 LUFS | -1.5 dBTP | **PASS** |
| space toys | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| space toys | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| space toys | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| space toys | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| space toys | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.1 LUFS | -1.8 dBTP | **PASS** |
| space toys | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.3 LUFS | -1.8 dBTP | **PASS** |
| rain on glass | chill | 0.5x | 133 | 133 | 0 | ±1.87 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| rain on glass | chill | 1x | 197 | 197 | 0 | ±1.93 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| rain on glass | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| rain on glass | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| rain on glass | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| rain on glass | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.4 LUFS | -1.6 dBTP | **PASS** |
| music box memories | chill | 0.5x | 133 | 133 | 0 | ±1.97 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| music box memories | chill | 1x | 197 | 197 | 0 | ±1.97 ms | -14.1 LUFS | -1.4 dBTP | **PASS** |
| music box memories | viral | 0.5x | 124 | 124 | 0 | ±1.67 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| music box memories | viral | 1x | 197 | 197 | 0 | ±1.67 ms | -14.1 LUFS | -1.4 dBTP | **PASS** |
| music box memories | insane | 0.5x | 142 | 142 | 0 | ±2 ms | -14.3 LUFS | -1.4 dBTP | **PASS** |
| music box memories | insane | 1x | 247 | 247 | 0 | ±2 ms | -14.1 LUFS | -1.4 dBTP | **PASS** |
| grand finale orchestra | chill | 0.5x | 325 | 325 | 0 | ±1.43 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| grand finale orchestra | chill | 1x | 344 | 344 | 0 | ±1.43 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| grand finale orchestra | viral | 0.5x | 293 | 293 | 0 | ±1.67 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| grand finale orchestra | viral | 1x | 344 | 344 | 0 | ±1.67 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |
| grand finale orchestra | insane | 0.5x | 212 | 212 | 0 | ±2 ms | -13.9 LUFS | -1.8 dBTP | **PASS** |
| grand finale orchestra | insane | 1x | 295 | 295 | 0 | ±2 ms | -13.7 LUFS | -1.8 dBTP | **PASS** |

## 3. Audited Object Recipe Timbre Verification

| Category | Object Type | Recipe Name | Synthesis Model | Character Description |
|:---|:---|:---|:---|:---|
| glass | `glass_tube` | Glowing Glass Tube | `modal` | Bell-glass tone with soft chorus and subtle shimmer. |
| crystal | `crystal_glass` | Crystal Glass (Water Level) | `additive` | Pure sine-like tone with slow harmonic swell and singing resonance. |
| glass | `glass_bottle` | Blown Glass Bottle | `modal` | Hollow blown glass chime with air column body resonance. |
| crystal | `clear_crystal` | Clear Crystal | `modal` | Bright crystalline ping with long shimmering inharmonic tail. |
| crystal | `cut_diamond` | Cut Diamond | `modal` | Ultra-pure diamond ping with high prism overtones and celestial shimmer. |
| glass | `frosted_glass` | Pastel Frosted Cup | `modal` | Soft muted glass tink with short ring and velvety dampening. |
| glass | `stained_glass` | Stained Glass Pane | `modal` | Rich radiant singing bell-glass tone. |
| glass | `liquid_filled_glass` | Liquid-Filled Glass | `physical_model` | Water-glass chime with undulating liquid slosh formant. |
| toy | `soap_bubble` | Soap Bubble | `physical_model` | Soft "plip" chirp and delicate airy pop. |
| glass | `sea_glass` | Matte Sea Glass | `modal` | Matte tumbled clink with gentle ceramic dampening. |
| gadget | `neon_glass_tube` | Neon Tube | `fm` | Electric hum-tone with neon glow pulse and analog bloom. |
| crystal | `ice` | Crystal Ice | `granular` | Crisp crack-ping with micro chip sparkles. |
| kinetic | `slide_glass` | Glass Slide Texture | `granular` | Silky smooth rolling glass friction texture. |
| metal | `metal_tack` | Chrome Tack | `modal` | Short bright metallic "tik" with sharp pin-point focus. |
| metal | `chrome_mirror` | Chrome Mirror Tack | `modal` | Polished chrome click with high mirror ping. |
| metal | `hand_bell` | Hand Bell | `modal` | Warm brass hand bell with lush singing decay. |
| metal | `desk_bell` | Desk Bell | `modal` | Crisp hotel concierge desk bell "ding" with clear ring. |
| metal | `brushed_gold` | Brushed Gold | `modal` | Warm golden bell with deep noble fundamental and slow fade. |
| metal | `brass_horn` | Brass Horn | `fm` | Short soft brass "toot" with FM brass formant bite. |
| metal | `cymbal_drum` | Cymbal Splash | `filtered_noise` | Shimmering metallic cymbal splash with airy sizzle. |
| metal | `liquid_mercury` | Liquid Metal / Mercury | `fm` | Low wet metallic "bloop" with downward formant dive. |
| kinetic | `wire_rail` | Wire Rail & Peg Rungs | `physical_model` | Rolling rattle + metallic peg ticks synchronized to rungs. |
| kinetic | `roll_rail` | Rail Rolling Texture | `granular` | Continuous kinetic ball-on-rail friction texture. |
| kinetic | `peg_tick` | Peg Tick | `modal` | Rapid staccato pin/peg contact tick. |
| metal | `copper_patina` | Copper with Patina | `modal` | Warm gong-like bronze chime with complex antique harmonics. |
| metal | `steel_pan` | Steel Pan | `modal` | Caribbean tuned steel pan drum with scooped harmonic ring. |
| metal | `wind_chime` | Metallic Wind Chime | `modal` | Airy silver wind-chime tube with extended crystalline sustain. |
| percussion | `drum` | Acoustic Drum (Tom/Snare) | `subtractive` | Tight skin thud with snappy noise attack transient. |
| percussion | `dark_tube` | Black Resonator Tube | `physical_model` | Warm hollow low "bonk" with cylindrical acoustic cavity. |
| percussion | `wood_block` | Solid Wood Block | `modal` | Woody knock with immediate natural acoustic decay. |
| percussion | `marimba_bar` | Rosewood Marimba Bar | `modal` | Deep resonant rosewood bar with warm tuned under-resonator. |
| percussion | `rainbow_xylophone` | Rainbow Half-Pipe Bar | `modal` | Bright glockenspiel / xylophone strike for rapid melodic runs. |
| percussion | `lacquered_wood` | Lacquered Hardwood | `modal` | Polished hardwood impact with snappy acoustic reflection. |
| toy | `squeaky_duck` | Rubber Duck Squeak | `physical_model` | Pitched rubber squeeze with characteristic release chirp. |
| toy | `spring_smiley` | Smiley Spring Toy | `fm` | Springy "boing" with comical pitch bend and vibrato wobble. |
| toy | `jelly_gummy` | Jelly / Gummy Drop | `physical_model` | Squishy boing with jelly elasticity and low-pass squish. |
| toy | `latex_balloon` | Latex Balloon | `subtractive` | Rubbery surface squeak, ready for finale pop. |
| toy | `squash` | Toy Squash | `subtractive` | Tactile soft-body rubber compression sound. |
| gadget | `unbranded_phone` | Slab Phone (Digital Tone) | `fm` | Clean modern digital ringtone chime with pristine clarity. |
| gadget | `unbranded_speaker` | Speaker (Deep Bass Thump) | `subtractive` | Deep subwoofer punch with air displacement body. |
| metal | `kalimba_tine` | Kalimba Tine | `modal` | Thumb-plucked metal tine with warm hollow body resonance. |
| metal | `music_box_comb` | Music Box Comb | `physical_model` | Intricate mechanical music box comb pluck with bright high chime. |
| percussion | `split_piano_key` | Piano Key Step | `additive` | Acoustic piano hammer striking strings with soundboard warmth. |
| percussion | `piano_staircase` | Piano Staircase Step | `additive` | Grand piano key-fall step with dynamic hammer transient. |
| crystal | `marble_stone` | Solid Marble Stone Block | `modal` | Solid mineral "tok" with dense stone mass. |
| crystal | `porcelain_gold` | Porcelain with Gold Lines | `modal` | Delicate high ceramic ping with fine porcelain resonance. |
| crystal | `amethyst_geode` | Amethyst Geode | `modal` | Deep resonant crystal cavern chime with mineral harmonics. |
| crystal | `opal` | Iridescent Opal | `modal` | Iridescent crystalline shimmer with smooth luminous decay. |
| crystal | `obsidian` | Obsidian Glass-Stone | `modal` | Sharp vitreous glass-stone tink with mineral edge. |
| toy | `hard_candy` | Hard Candy | `modal` | Glassy confectionery click with sweet sugary snap. |
| toy | `velvet_felt` | Velvet / Felt Cushion | `subtractive` | Deeply muted fabric thump with zero high overtones. |
| crystal | `holographic_foil` | Holographic Foil | `fm` | Shimmering iridescent sweep synth with spectral sparkle. |
| toy | `prop_star` | Golden Star Prop | `modal` | Magic twinkling star bell with shimmering overtones. |
| toy | `prop_heart` | Pastel Heart Prop | `fm` | Sweet resonant heart chime with warm melodic bloom. |
| toy | `prop_cloud` | Fluffy Cloud Prop | `subtractive` | Soft pillowy atmospheric tone with gentle breath. |
| crystal | `prop_snowflake` | Crystal Snowflake Prop | `modal` | Pristine winter ice sparkle with delicate crystal facets. |
| toy | `prop_leaf` | Green Leaf Prop | `modal` | Organic bamboo-marimba tap with botanical crispness. |
| sfx | `final_catcher` | Final Catcher & Downbeat | `additive` | Triumphant multi-voice chord burst with cascading sparkle particles. |
| sfx | `finale` | Finale Celebration | `additive` | Grand finale resolution chord with crystal shimmer. |
| kinetic | `bounce` | Standard Kinetic Bounce | `modal` | Standard physical bounce contact tone. |
| kinetic | `roll_start` | Roll Onset | `granular` | Subtle tactile surface roll initiation sound. |
| sfx | `shatter` | Glass Shatter | `granular` | Layered crystalline glass break with cascading shards. |
| sfx | `portal` | Portal Transition | `fm` | Ethereal stereo whoosh with harmonic flanging. |
| sfx | `spike` | Spike Contact | `subtractive` | Sharp, piercing needle tick. |
| sfx | `freeze` | Freeze Effect | `granular` | Frost crackle crystallization sound. |
| sfx | `merge` | Ball Merge | `additive` | Harmonic coalescence chime. |
| sfx | `escape` | Wall Escape / Breakthrough | `additive` | Triumphant wall breakthrough and octave surge. |
