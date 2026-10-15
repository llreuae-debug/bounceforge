# BOUNCEFORGE — Master Link & Route Inventory (LINKS.md)

This comprehensive inventory catalogs every `<a href>` link, router route, button navigation target, modal trigger, anchor link, mailto link, preset URL, download link, and static asset reference across BounceForge.

| Location (File + Line + Page) | Link Text / Trigger | Target | Type |
| :--- | :--- | :--- | :--- |
| `src/App.tsx:16` (`/`) | Landing Page Route | `/` | Internal Route |
| `src/App.tsx:17` (`/studio`) | Studio Simulator Route | `/studio` | Internal Route |
| `src/App.tsx:18` (`/settings`) | Settings Route | `/settings` | Internal Route |
| `src/App.tsx:19` (`/diagnostics`) | Hardware Diagnostics Route | `/diagnostics` | Internal Route |
| `src/App.tsx:20` (`/faq`) | FAQ Knowledge Base Route | `/faq` | Internal Route |
| `src/App.tsx:21` (`/terms`) | Terms of Service Route | `/terms` | Internal Route |
| `src/App.tsx:22` (`/privacy`) | Privacy Policy Route | `/privacy` | Internal Route |
| `src/App.tsx:23` (`/contact`) | Contact & Support Route | `/contact` | Internal Route |
| `src/App.tsx:24` (`/404`) | Custom 404 Route | `/404` (and any unmatched path) | Custom 404 Route |
| `src/ui/Header.tsx:66` (All Pages) | BounceForge Logo | `/` | Router Nav Link |
| `src/ui/Header.tsx:87` (Header Nav) | Modes | `/#modes` | Anchor Link |
| `src/ui/Header.tsx:94` (Header Nav) | Engine & Audio | `/#features` | Anchor Link |
| `src/ui/Header.tsx:101` (Header Nav) | FAQ | `/#faq` | Anchor Link |
| `src/ui/Header.tsx:108` (Header Nav) | Diagnostics | `/diagnostics` | Router Nav Link |
| `src/ui/Header.tsx:184` (Header Right) | Launch Studio Free | `/studio` | Router Button CTA |
| `src/ui/Header.tsx:102` (Studio Nav) | Surprise Me | Randomize mode, physics, seed & melody | Interactive Studio Action |
| `src/ui/Header.tsx:112` (Studio Nav) | Sound ON / Muted | Toggle studio audio mute | Interactive Studio Action |
| `src/ui/Header.tsx:125` (Studio Nav) | Auto-Seed Finder | Open 59-60s Auto-Seed Finder Modal | Modal Trigger |
| `src/ui/Header.tsx:134` (Studio Nav) | MIDI Editor | Open 4-Octave MIDI Piano Roll Modal | Modal Trigger |
| `src/ui/Header.tsx:143` (Studio Nav) | Shortcuts | Open Keyboard Shortcuts Modal | Modal Trigger |
| `src/ui/Header.tsx:158` (Studio Nav) | Save Project | Save project to IndexedDB | IndexedDB Action |
| `src/ui/Header.tsx:166` (Studio Nav) | Load Project | Load project from IndexedDB | IndexedDB Action |
| `src/ui/Header.tsx:174` (Studio Nav) | Share | Copy URL with encoded preset hash | Share Preset URL |
| `src/ui/Header.tsx:183` (Studio Nav) | Export 4K | Open 4K WebCodecs Video Export Modal | Modal Trigger |
| `src/ui/Header.tsx:307` (Mobile Menu) | 21 Simulation Modes | `/#modes` | Mobile Anchor Link |
| `src/ui/Header.tsx:314` (Mobile Menu) | Physics & Audio Engine | `/#features` | Mobile Anchor Link |
| `src/ui/Header.tsx:321` (Mobile Menu) | Frequently Asked Questions | `/#faq` | Mobile Anchor Link |
| `src/ui/Header.tsx:328` (Mobile Menu) | Device Diagnostics | `/diagnostics` | Mobile Router Link |
| `src/ui/LandingPage.tsx:130` (Hero) | Launch Studio Free | `/studio` | Router Button CTA |
| `src/ui/LandingPage.tsx:136` (Hero) | Explore 21 Modes | `#modes` | Anchor Link |
| `src/ui/LandingPage.tsx:162` (Hero Card) | Live Preview Canvas Card | `/studio` | Router Button CTA |
| `src/ui/LandingPage.tsx:192` (Features) | Section Target #features | `#features` (scroll-mt-20) | Anchor Target |
| `src/ui/LandingPage.tsx:255` (FAQ) | Section Target #faq | `#faq` (scroll-mt-20) | Anchor Target |
| `src/ui/components/MultipleModesShowcase.tsx:448` (Modes) | Section Target #modes | `#modes` (scroll-mt-20) | Anchor Target |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Classic Card | `/studio` (mode: `classic`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Infinite Loop Card | `/studio` (mode: `infinite_loop`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Destruction Card | `/studio` (mode: `destruction`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Accumulation Card | `/studio` (mode: `accumulation`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Collision Card | `/studio` (mode: `collision`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Web Expansion Card | `/studio` (mode: `web_expansion`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Trail Expansion Card | `/studio` (mode: `trail_expansion`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Spiral Card | `/studio` (mode: `spiral`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Fragment Expansion Card | `/studio` (mode: `fragment_expansion`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Web Battle Card | `/studio` (mode: `web_battle`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Merge Card | `/studio` (mode: `merge`) | Mode Switch Button |
| `src/ui/components/MultipleModesShowcase.tsx:468` (Modes) | Surprise Coming Soon Card | `/studio` (triggers `surpriseMe()`) | Mode Switch Button |
| `src/ui/Footer.tsx:66` (Footer Brand) | BounceForge Logo | `/` | Router Nav Link |
| `src/ui/Footer.tsx:86` (Footer Brand) | Launch Studio Free | `/studio` | Router Button CTA |
| `src/ui/Footer.tsx:105` (Popular Modes) | Classic Ring Escape | `/studio` (mode: `classic`) | Mode Switch Button |
| `src/ui/Footer.tsx:114` (Popular Modes) | Obstacle Course Arena | `/studio` (mode: `obstacle_course`) | Mode Switch Button |
| `src/ui/Footer.tsx:123` (Popular Modes) | Black Hole & Gravity Well | `/studio` (mode: `black_hole`) | Mode Switch Button |
| `src/ui/Footer.tsx:132` (Popular Modes) | Sand Fill & Hourglass | `/studio` (mode: `sand_fill`) | Mode Switch Button |
| `src/ui/Footer.tsx:141` (Popular Modes) | Web Battle Arena | `/studio` (mode: `web_battle`) | Mode Switch Button |
| `src/ui/Footer.tsx:150` (Popular Modes) | Collision & Particle Blast | `/studio` (mode: `collision`) | Mode Switch Button |
| `src/ui/Footer.tsx:159` (Popular Modes) | Harmonic Pendulum Wave | `/studio` (mode: `pendulum_wave`) | Mode Switch Button |
| `src/ui/Footer.tsx:168` (Popular Modes) | Destruction & Wall Shatter | `/studio` (mode: `destruction`) | Mode Switch Button |
| `src/ui/Footer.tsx:186` (Engine & Audio) | Auto-Seed Finder (59-60s) | Open Auto-Seed Finder Modal | Modal Trigger |
| `src/ui/Footer.tsx:198` (Engine & Audio) | MIDI Piano Roll Editor | Open MIDI Editor Modal | Modal Trigger |
| `src/ui/Footer.tsx:210` (Engine & Audio) | Device Diagnostics & GPU | `/diagnostics` | Router Nav Link |
| `src/ui/Footer.tsx:232` (Engine & Audio) | Brand Guide & Press Assets | `/brand/brand-guide.html` | External Doc Link |
| `src/ui/Footer.tsx:338` (Legal Bar) | FAQ | `/faq` | Router Nav Link |
| `src/ui/Footer.tsx:347` (Legal Bar) | Terms | `/terms` | Router Nav Link |
| `src/ui/Footer.tsx:356` (Legal Bar) | Privacy | `/privacy` | Router Nav Link |
| `src/ui/Footer.tsx:365` (Legal Bar) | Contact | `/contact` | Router Nav Link |
| `src/ui/Footer.tsx:374` (Legal Bar) | Diagnostics | `/diagnostics` | Router Nav Link |
| `src/ui/Footer.tsx:383` (Legal Bar) | Open Studio ⚡ | `/studio` | Router Button CTA |
| `src/ui/Footer.tsx:392` (Legal Bar) | Back to Top ↑ | Smooth scroll to viewport top | Scroll Anchor |
| `src/ui/pages/DiagnosticsPage.tsx:36` | Copy Diagnostic Report | Clipboard write | Clipboard Action |
| `src/ui/pages/DiagnosticsPage.tsx:47` | Run CPU Math Stress Test | Synchronous ops/ms benchmark | Diagnostic Benchmark |
| `src/ui/pages/DiagnosticsPage.tsx:55` | Launch Studio Free | `/studio` | Router Button CTA |
| `src/ui/pages/FaqPage.tsx:210` | Contact Support | `/contact` | Router Nav Link |
| `src/ui/pages/FaqPage.tsx:216` | Launch Studio Free | `/studio` | Router Button CTA |
| `src/ui/pages/TermsPage.tsx:55` | Contact Page Link | `/contact` | Router Nav Link |
| `src/ui/pages/TermsPage.tsx:61` | Support Email Link | `mailto:support@bounceforge.app?subject=Terms%20of%20Service%20Inquiry` | Mailto Link |
| `src/ui/pages/TermsPage.tsx:75` | Open Studio ⚡ | `/studio` | Router Button CTA |
| `src/ui/pages/PrivacyPage.tsx:55` | Privacy Email Link | `mailto:privacy@bounceforge.app?subject=Privacy%20Question` | Mailto Link |
| `src/ui/pages/PrivacyPage.tsx:69` | Open Studio ⚡ | `/studio` | Router Button CTA |
| `src/ui/pages/ContactPage.tsx:34` | Send Message via Email | `mailto:support@bounceforge.app?subject=[BounceForge]...` | Mailto Form Submit |
| `src/ui/pages/ContactPage.tsx:64` | Direct Email Link | `mailto:support@bounceforge.app?subject=BounceForge%20Support%20Request` | Mailto Link |
| `src/ui/pages/ContactPage.tsx:78` | Visit FAQ Knowledge Base | `/faq` | Router Nav Link |
| `src/ui/pages/ContactPage.tsx:92` | Run Hardware Diagnostics | `/diagnostics` | Router Nav Link |
| `src/ui/pages/ContactPage.tsx:180` | Cancel & return to Studio | `/studio` | Router Button CTA |
| `src/ui/pages/NotFoundPage.tsx:70` | Go Home | `/` | Router Button CTA |
| `src/ui/pages/NotFoundPage.tsx:77` | Launch Studio Free | `/studio` | Router Button CTA |
| `src/ui/modals/ExportModal.tsx:191` | Exported Video Download | Programmatic blob download (`bounceforge-*.mp4` / `.webm`) | Video File Download |
| `src/ui/modals/ExportModal.tsx:615` | Download MP4 / WebM Button | Download link `{downloadUrl}` | Video File Download |
| `src/ui/modals/ExportModal.tsx:625` | Download Cover PNG Button | Download link `{thumbnailUrl}` | PNG Image Download |
| `src/ui/modals/MidiEditorModal.tsx:85` | Export Melody JSON | Programmatic blob download (`bounceforge-melody.json`) | JSON File Download |
| `src/main.tsx:27` (Browser Fallback) | get chrome | `https://www.google.com/chrome/` | External Link |
| `src/main.tsx:28` (Browser Fallback) | edge | `https://www.microsoft.com/edge` | External Link |
| `src/main.tsx:29` (Browser Fallback) | safari | `https://www.apple.com/safari/` | External Link |
| `index.html:5` | SVG Favicon | `https://bounceforge.app/brand/svg/symbol.svg` | Asset Reference |
| `index.html:6` | ICO Favicon | `https://bounceforge.app/brand/icons/favicon.ico` | Asset Reference |
| `index.html:8` | Canonical URL | `https://bounceforge.app/` | Canonical Meta |
| `index.html:13` | OpenGraph Image | `https://bounceforge.app/brand/social/og-image-1200x630.png` | OpenGraph Meta Asset |
| `index.html:17` | Twitter Card Image | `https://bounceforge.app/brand/social/og-image-1200x630.png` | Twitter Meta Asset |
| `index.html:22` | Web App Manifest | `/manifest.webmanifest` | Asset Reference |
| `index.html:23` | Apple Touch Icon | `https://bounceforge.app/brand/svg/symbol.svg` | Asset Reference |
| `index.html:26` | Google Fonts | `https://fonts.googleapis.com/...` | External Font Reference |
| `public/manifest.webmanifest:13` | PWA 192x192 Icon | `/brand/icons/app-icon-192.png` | Asset Reference |
| `public/manifest.webmanifest:19` | PWA 512x512 Icon | `/brand/icons/app-icon-512.png` | Asset Reference |
| `public/manifest.webmanifest:25` | PWA 1024x1024 Icon | `/brand/icons/app-icon-1024.png` | Asset Reference |
| `public/sw.js:1` | Service Worker Script | `/sw.js` | Service Worker Asset |
| `public/robots.txt:3` | XML Sitemap Location | `https://bounceforge.app/sitemap.xml` | SEO Asset Reference |
| `public/sitemap.xml:5` | Sitemap Route `/` | `https://bounceforge.app/` | Sitemap Entry |
| `public/sitemap.xml:11` | Sitemap Route `/studio` | `https://bounceforge.app/studio` | Sitemap Entry |
| `public/sitemap.xml:17` | Sitemap Route `/settings` | `https://bounceforge.app/settings` | Sitemap Entry |
| `public/sitemap.xml:23` | Sitemap Route `/diagnostics` | `https://bounceforge.app/diagnostics` | Sitemap Entry |
| `public/sitemap.xml:29` | Sitemap Route `/faq` | `https://bounceforge.app/faq` | Sitemap Entry |
| `public/sitemap.xml:35` | Sitemap Route `/terms` | `https://bounceforge.app/terms` | Sitemap Entry |
| `public/sitemap.xml:41` | Sitemap Route `/privacy` | `https://bounceforge.app/privacy` | Sitemap Entry |
| `public/sitemap.xml:47` | Sitemap Route `/contact` | `https://bounceforge.app/contact` | Sitemap Entry |
| `public/_redirects:1` | SPA Rewrite (Netlify/Cloudflare) | `/* /index.html 200` | Hosting Rewrite Rule |
| `vercel.json:3` | SPA Rewrite (Vercel) | `/(.*) -> /index.html` | Hosting Rewrite Rule |
