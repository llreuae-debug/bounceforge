import { create } from 'zustand';
import { get as getIDB, set as setIDB, clear as clearIDB } from 'idb-keyval';
import { VisualSettings } from '../render/renderer';
import { OverlaySettings, DEFAULT_OVERLAYS } from '../render/overlays';
import { AudioSettings, NoteItem } from '../audio/types';
import { ALL_MODES, getModeById } from '../modes/registry';
import { AsmrMixSettings } from '../audio/asmrEngine';
import { ScaleName, MusicMood, BackingGenre, GenerativeMusicEngine } from '../audio/generativeMusic';
import { AudioEngine } from '../audio/audioEngine';
import { THEMES } from '../render/themes';
import { getDefaults, isModeAtDefault } from '../modes/defaults';
import { DEFAULT_TARGET_DURATION } from '../engine/duration';
import { QualityMode, QualityTier } from '../platform/quality';
import { DeviceCapabilities } from '../platform/capabilities';
import { getHapticsEnabled, setHapticsEnabled as setHapticsStorage } from '../platform/haptics';
import { AiService, DEFAULT_AI_SETTINGS } from '../ai/aiService';
import { DEFAULT_BALL_PHYSICS,
  presetService,
  SavedPreset,
  BallPhysicsSettings,
  WallControlsSettings,
  CustomBallConfig,
} from '../presets/presetService';

export interface ToastState {
  id: number;
  message: string;
  undoAction?: () => void;
}

export interface StudioProject {
  id: string;
  name: string;
  timestamp: number;
  modeId: string;
  modeSettings: Record<string, any>;
  seed: number;
  visuals: VisualSettings;
  overlays: OverlaySettings;
  audioSettings: AudioSettings;
  asmrSettings: AsmrMixSettings;
  customNotes?: NoteItem[];
  targetDuration?: number;
  reelSpeed?: number;
  slowMoSoundFeel?: boolean;
  speedRampFinale?: boolean;
  marbleMelodySlowMoMode?: 'calm_tempo' | 'normal_tempo';
}

export type StudioRoute =
  | 'landing'
  | 'studio'
  | 'my_videos'
  | 'settings'
  | 'diagnostics'
  | 'faq'
  | 'terms'
  | 'privacy'
  | 'contact'
  | 'pricing'
  | 'account'
  | 'admin'
  | 'blog'
  | 'article'
  | 'affiliate_terms'
  | 'refunds'
  | 'checkout_success'
  | 'checkout_cancelled'
  | 'about'
  | 'showcase'
  | 'feedback'
  | 'disclaimer'
  | 'midi_studio'
  | 'drop_studio'
  | '404';


interface StudioState {
  currentRoute: StudioRoute;
  projectName: string;

  // Modes
  currentModeId: string;
  modeSettings: Record<string, any>;
  seed: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isMuted: boolean;
  targetDuration: number; // seconds the animation should complete in
  reelSpeed: number; // 0.25, 0.5, 0.75, 1.0, 1.25. DEFAULT = 0.5
  slowMoSoundFeel: boolean;
  speedRampFinale: boolean;
  marbleMelodySlowMoMode: 'calm_tempo' | 'normal_tempo';

  // Ball Physics & Custom Ball
  ballPhysics: BallPhysicsSettings;
  wallControls: WallControlsSettings;
  customBall: CustomBallConfig;
  resolution: '1080' | '1440' | '4k' | 'square' | 'landscape';

  // Presets
  userPresets: SavedPreset[];
  activePresetId: string | null;

  // Visuals & Overlays
  visuals: VisualSettings;
  overlays: OverlaySettings;

  // Audio, ASMR & Generative
  audioSettings: AudioSettings;
  asmrSettings: AsmrMixSettings;
  backingGenre: BackingGenre;
  generativeScale: ScaleName;
  generativeMood: MusicMood;
  customNotes: NoteItem[];

  // Modals & Panels
  isExportOpen: boolean;
  isSettingsOpen: boolean;
  isGalleryOpen: boolean;
  isMidiEditorOpen: boolean;
  isSeedFinderOpen: boolean;
  isShortcutsOpen: boolean;
  isSelfTestOpen: boolean;
  isSoundCheckOpen: boolean;
  isExportSoundCheckOpen: boolean;
  isRestartConfirmOpen: boolean;

  // Platform & Quality
  qualityMode: QualityMode;
  currentQualityTier: QualityTier;
  hapticsEnabled: boolean;
  capabilities: DeviceCapabilities | null;
  audioUnlocked: boolean;
  setQualityMode: (mode: QualityMode) => void;
  setCurrentQualityTier: (tier: QualityTier) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setCapabilities: (caps: DeviceCapabilities) => void;
  setAudioUnlocked: (unlocked: boolean) => void;

  // Actions
  setRoute: (route: StudioRoute, pushState?: boolean) => void;
  setProjectName: (name: string) => void;

  setMode: (modeId: string) => void;
  setModeSettings: (settings: Record<string, any>) => void;
  updateModeSetting: (key: string, value: any) => void;
  applyPreset: (presetSettings: Record<string, any>) => void;

  setSeed: (seed: number) => void;
  randomizeSeed: () => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsMuted: (muted: boolean) => void;
  setTargetDuration: (seconds: number) => void;
  setReelSpeed: (speed: number) => void;
  setSlowMoSoundFeel: (enabled: boolean) => void;
  setSpeedRampFinale: (enabled: boolean) => void;
  setMarbleMelodySlowMoMode: (mode: 'calm_tempo' | 'normal_tempo') => void;

  // Ball & Wall Setters
  setBallPhysics: (updates: Partial<BallPhysicsSettings>) => void;
  setWallControls: (updates: Partial<WallControlsSettings>) => void;
  setCustomBall: (updates: Partial<CustomBallConfig>) => void;
  setResolution: (res: '1080' | '1440' | '4k' | 'square' | 'landscape') => void;

  // Preset Actions
  loadUserPresets: (userId?: string | null) => Promise<void>;
  saveCurrentAsPreset: (name: string, userId?: string | null) => Promise<SavedPreset>;
  loadPreset: (preset: SavedPreset) => void;
  deletePreset: (id: string, userId?: string | null) => Promise<void>;
  duplicatePreset: (id: string, userId?: string | null) => Promise<void>;
  renamePreset: (id: string, name: string, userId?: string | null) => Promise<void>;

  // Visuals & Overlays
  setVisuals: (visuals: Partial<VisualSettings>) => void;
  setOverlays: (overlays: Partial<OverlaySettings>) => void;

  // Sound setters
  setAudioSettings: (audio: Partial<AudioSettings>) => void;
  setAsmrSettings: (asmr: Partial<AsmrMixSettings>) => void;
  setBackingGenre: (genre: BackingGenre) => void;
  setGenerativeScale: (scale: ScaleName) => void;
  setGenerativeMood: (mood: MusicMood) => void;
  setCustomNotes: (notes: NoteItem[]) => void;

  // Modal & Panel actions
  setExportOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setGalleryOpen: (open: boolean) => void;
  setMidiEditorOpen: (open: boolean) => void;
  setSeedFinderOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSelfTestOpen: (open: boolean) => void;
  setSoundCheckOpen: (open: boolean) => void;
  setExportSoundCheckOpen: (open: boolean) => void;
  setRestartConfirmOpen: (open: boolean) => void;
  isWhatsNewOpen: boolean;
  setWhatsNewOpen: (open: boolean) => void;
  isWhatNextOpen: boolean;
  setWhatNextOpen: (open: boolean) => void;
  isTrendsAdminOpen: boolean;
  setTrendsAdminOpen: (open: boolean) => void;


  // Toast & Undo
  toast: ToastState | null;
  showToast: (message: string, undoAction?: () => void, durationMs?: number) => void;
  dismissToast: () => void;
  undoSnapshot: any | null;

  // Reset actions
  resetModeToDefault: () => void;
  resetSection: (section: 'physics' | 'rings' | 'visuals' | 'sound' | 'overlays') => void;
  resetSingleSetting: (key: string, defaultVal: any, category?: 'mode' | 'visuals' | 'audio' | 'overlays' | 'asmr') => void;
  factoryReset: (deleteUserData?: boolean) => Promise<void>;
  undoLastReset: () => void;
  surpriseMe: () => void;

  // Persistence & URL
  saveToIndexedDB: () => Promise<void>;
  loadFromIndexedDB: (projectId?: string) => Promise<void>;
  getShareableUrl: () => string;
  loadFromUrlHash: () => boolean;
}

export const useStudioStore = create<StudioState>((set, get) => {
  const initialMode = getModeById('classic');

  return {
    currentRoute: 'landing',
    projectName: 'Viral Neon Symphony',

    currentModeId: 'classic',
    modeSettings: { ...initialMode.defaultSettings },
    seed: 1337,
    isPlaying: true,
    playbackSpeed: 1.0,
    isMuted: false,
    targetDuration: DEFAULT_TARGET_DURATION,
    reelSpeed: 0.5, // 0.25, 0.5, 0.75, 1.0, 1.25. DEFAULT = 0.5
    slowMoSoundFeel: false,
    speedRampFinale: false,
    marbleMelodySlowMoMode: 'calm_tempo',

    // Ball Physics & Custom Ball
    ballPhysics: { ...DEFAULT_BALL_PHYSICS },

    wallControls: {
      ringCount: 3,
      gapWidthDeg: 35,
      breakEffects: ['glass_shatter', 'shockwave'],
      spikesEnabled: false,
      spikeCount: 16,
      spikeLength: 28,
    },

    customBall: {
      type: 'default',
    },

    resolution: '1080',
    userPresets: [],
    activePresetId: null,

    toast: null,
    undoSnapshot: null,

    qualityMode: 'auto',
    currentQualityTier: 'medium',
    hapticsEnabled: getHapticsEnabled(),
    capabilities: null,
    audioUnlocked: false,

    visuals: {
      themeId: 'neon_night',
      bloomEnabled: true,
      bloomIntensity: 1.25,
      ballGlowEnabled: true,
      ballGlowIntensity: 1.0,
      wallGlowEnabled: true,
      wallGlowIntensity: 1.0,
      rainbowWallsMode: 'off',
      trailEnabled: true,
      trailLength: 18,
      trailFade: 0.65,
      trailHueShift: false,
      reactiveBgEnabled: true,
      reactiveBgIntensity: 0.5,
      screenShakeIntensity: 0.6,
      slowMotionEnd: true,
      chromaticFlash: true,
      ringColorMode: 'theme',
    },

    overlays: { ...DEFAULT_OVERLAYS },

    audioSettings: {
      masterVolume: 0.85,
      instrument: 'grandPiano',
      sfxVolume: 0.75,
      droneVolume: 0,
      reverbAmount: 0,
      reverbEnabled: false,
      delayAmount: 0,
      delayEnabled: false,
      sustainPedal: false,
      pitchByVelocity: false,
      volumeByImpulse: true,
      selectedMelodyId: 'fur_elise',
      soundMode: 'melody',
      asmrLayer: false,
      stereoPanning: true,
    },


    asmrSettings: {
      masterVolume: 0.85,
      musicVolume: 0.65,
      impactVolume: 0.95,
      destructionVolume: 0.9,
      textureVolume: 0.8,
      backingVolume: 0.35,
      binauralAsmr: true,
      asmrMode: true,
      headphonesMode: true,
      asmrIntensity: 'balanced',
    },

    backingGenre: 'none',
    generativeScale: 'pentatonic',
    generativeMood: 'dreamy',
    customNotes: [],

    isExportOpen: false,
    isSettingsOpen: false,
    isGalleryOpen: true,
    isMidiEditorOpen: false,
    isSeedFinderOpen: false,
    isShortcutsOpen: false,
    isSelfTestOpen: false,
    isSoundCheckOpen: false,
    isExportSoundCheckOpen: false,
    isWhatsNewOpen: false,
    isWhatNextOpen: false,
    isTrendsAdminOpen: false,
    isRestartConfirmOpen: false,

    setRoute: (route, pushState = true) => {
      if (pushState && typeof window !== 'undefined') {
        const pathMap: Record<StudioRoute, string> = {
          landing: '/',
          studio: '/studio',
          my_videos: '/my-videos',
          settings: '/settings',
          diagnostics: '/diagnostics',
          faq: '/faq',
          terms: '/terms',
          privacy: '/privacy',
          contact: '/contact',
          pricing: '/pricing',
          account: '/account',
          admin: '/admin',
          blog: '/blog',
          article: '/blog/how-to-create-viral-bouncing-ball-videos',
          affiliate_terms: '/affiliate-terms',
          refunds: '/refunds',
          checkout_success: '/checkout/success',
          checkout_cancelled: '/checkout/cancelled',
          about: '/about',
          showcase: '/showcase',
          feedback: '/feedback',
          disclaimer: '/disclaimer',
          midi_studio: '/midi',
          drop_studio: '/drops',
          '404': '/404',
        };
        const targetPath = pathMap[route] || '/';
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ route }, '', targetPath);
        }
      }
      set({ currentRoute: route });
    },
    setProjectName: (name) => set({ projectName: name }),

    setMode: (modeId) => {
      const mode = getModeById(modeId);
      const isMelody = modeId === 'marble_melody_3d';
      set({
        currentModeId: modeId,
        modeSettings: { ...mode.defaultSettings },
        targetDuration: isMelody ? 50 : (mode.defaultSettings?.targetDuration || DEFAULT_TARGET_DURATION),
      });
    },

    setModeSettings: (settings) => set({ modeSettings: settings }),

    updateModeSetting: (key, value) => {
      set((state) => ({
        modeSettings: { ...state.modeSettings, [key]: value },
      }));
    },

    applyPreset: (presetSettings) => {
      set((state) => ({
        modeSettings: { ...state.modeSettings, ...presetSettings },
      }));
    },

    setSeed: (seed) => set({ seed }),
    randomizeSeed: () => set({ seed: Math.floor(Math.random() * 900000) + 100000 }),

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setIsMuted: (muted) => set({ isMuted: muted }),
    setTargetDuration: (seconds) => {
      set({ targetDuration: Math.max(1, Math.round(seconds)) });
      get().saveToIndexedDB();
    },
    setReelSpeed: (speed) => {
      set({ reelSpeed: speed });
      get().saveToIndexedDB();
    },
    setSlowMoSoundFeel: (enabled) => {
      set({ slowMoSoundFeel: enabled });
      get().saveToIndexedDB();
    },
    setSpeedRampFinale: (enabled) => {
      set({ speedRampFinale: enabled });
      get().saveToIndexedDB();
    },
    setMarbleMelodySlowMoMode: (mode) => {
      set({ marbleMelodySlowMoMode: mode });
      get().saveToIndexedDB();
    },

    // Ball & Wall Setters
    setBallPhysics: (updates) =>
      set((s) => ({ ballPhysics: { ...s.ballPhysics, ...updates } })),
    setWallControls: (updates) =>
      set((s) => ({ wallControls: { ...s.wallControls, ...updates } })),
    setCustomBall: (updates) =>
      set((s) => ({ customBall: { ...s.customBall, ...updates } })),
    setResolution: (res) => set({ resolution: res }),

    // Preset Actions
    loadUserPresets: async (userId) => {
      const presets = await presetService.getPresets(userId);
      set({ userPresets: presets });
    },

    saveCurrentAsPreset: async (name, userId) => {
      const state = get();
      const saved = await presetService.savePreset(
        {
          name,
          modeId: state.currentModeId,
          modeSettings: state.modeSettings,
          seed: state.seed,
          ballPhysics: state.ballPhysics,
          wallControls: state.wallControls,
          visuals: state.visuals,
          overlays: state.overlays,
          audioSettings: state.audioSettings,
          asmrSettings: state.asmrSettings,
          customBall: state.customBall,
          targetDuration: state.targetDuration,
          resolution: state.resolution,
          reelSpeed: state.reelSpeed,
          slowMoSoundFeel: state.slowMoSoundFeel,
          speedRampFinale: state.speedRampFinale,
          marbleMelodySlowMoMode: state.marbleMelodySlowMoMode,
        },
        userId
      );
      set((s) => ({
        userPresets: [saved, ...s.userPresets],
        activePresetId: saved.id,
      }));
      get().showToast(`Saved preset "${name}"!`);
      return saved;
    },

    loadPreset: (preset) => {
      set({
        activePresetId: preset.id,
        currentModeId: preset.modeId,
        modeSettings: { ...preset.modeSettings },
        seed: preset.seed,
        // Presets saved before gravity became a multiplier stored 980 (meant ~1000x); load as 1.0G
        ballPhysics: {
          ...DEFAULT_BALL_PHYSICS,
          ...preset.ballPhysics,
          gravity: (preset.ballPhysics?.gravity ?? 1) > 30 ? 1 : preset.ballPhysics?.gravity ?? 1,
        },
        wallControls: { ...preset.wallControls },
        visuals: { ...preset.visuals },
        overlays: { ...preset.overlays },
        audioSettings: {
          ...preset.audioSettings,
          masterVolume: (preset.audioSettings?.masterVolume === 0 || preset.audioSettings?.masterVolume === undefined) ? 0.85 : preset.audioSettings.masterVolume,
          sfxVolume: (preset.audioSettings?.sfxVolume === 0 || preset.audioSettings?.sfxVolume === undefined) ? 0.75 : preset.audioSettings.sfxVolume,
        },
        asmrSettings: { ...preset.asmrSettings },
        customBall: { ...preset.customBall },
        targetDuration: preset.targetDuration,
        resolution: preset.resolution || '1080',
        reelSpeed: preset.reelSpeed !== undefined ? preset.reelSpeed : 0.5,
        slowMoSoundFeel: preset.slowMoSoundFeel ?? false,
        speedRampFinale: preset.speedRampFinale ?? false,
        marbleMelodySlowMoMode: preset.marbleMelodySlowMoMode ?? 'calm_tempo',
      });
      get().showToast(`Loaded preset "${preset.name}"!`);
    },

    deletePreset: async (id, userId) => {
      const updated = await presetService.deletePreset(id, userId);
      set({ userPresets: updated, activePresetId: null });
      get().showToast('Preset deleted.');
    },

    duplicatePreset: async (id, userId) => {
      const updated = await presetService.duplicatePreset(id, userId);
      set({ userPresets: updated });
      get().showToast('Preset duplicated.');
    },

    renamePreset: async (id, name, userId) => {
      const updated = await presetService.updatePreset(id, { name }, userId);
      set({ userPresets: updated });
      get().showToast(`Preset renamed to "${name}".`);
    },

    setVisuals: (newVis) => set((s) => ({ visuals: { ...s.visuals, ...newVis } })),
    setOverlays: (newOverlays) => set((s) => ({ overlays: { ...s.overlays, ...newOverlays } })),

    setAudioSettings: (newAudio) =>
      set((s) => ({ audioSettings: { ...s.audioSettings, ...newAudio } })),
    setAsmrSettings: (newAsmr) =>
      set((s) => ({ asmrSettings: { ...s.asmrSettings, ...newAsmr } })),
    setBackingGenre: (genre) => set({ backingGenre: genre }),
    setGenerativeScale: (scale) => set({ generativeScale: scale }),
    setGenerativeMood: (mood) => set({ generativeMood: mood }),
    setCustomNotes: (notes) => set({ customNotes: notes }),

    setExportOpen: (open) => set({ isExportOpen: open }),
    setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setGalleryOpen: (open) => set({ isGalleryOpen: open }),
    setMidiEditorOpen: (open) => set({ isMidiEditorOpen: open }),
    setSeedFinderOpen: (open) => set({ isSeedFinderOpen: open }),
    setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
    setSelfTestOpen: (open) => set({ isSelfTestOpen: open }),
    setSoundCheckOpen: (open) => set({ isSoundCheckOpen: open }),
    setExportSoundCheckOpen: (open) => set({ isExportSoundCheckOpen: open }),
    setRestartConfirmOpen: (open) => set({ isRestartConfirmOpen: open }),
    setWhatsNewOpen: (open) => set({ isWhatsNewOpen: open }),
    setWhatNextOpen: (open) => set({ isWhatNextOpen: open }),
    setTrendsAdminOpen: (open) => set({ isTrendsAdminOpen: open }),



    setQualityMode: (mode) => set({ qualityMode: mode }),
    setCurrentQualityTier: (tier) => set({ currentQualityTier: tier }),
    setHapticsEnabled: (enabled) => {
      setHapticsStorage(enabled);
      set({ hapticsEnabled: enabled });
    },
    setCapabilities: (caps) => set({ capabilities: caps }),
    setAudioUnlocked: (unlocked) => set({ audioUnlocked: unlocked }),

    showToast: (message: string, undoAction?: () => void, durationMs = 6000) => {
      const id = Date.now();
      set({ toast: { id, message, undoAction } });
      setTimeout(() => {
        if (get().toast?.id === id) {
          set({ toast: null });
        }
      }, durationMs);
    },

    dismissToast: () => set({ toast: null }),

    resetModeToDefault: () => {
      const state = get();
      const snapshot = {
        modeSettings: { ...state.modeSettings },
        seed: state.seed,
        visuals: { ...state.visuals },
        overlays: { ...state.overlays },
        audioSettings: { ...state.audioSettings },
        asmrSettings: { ...state.asmrSettings },
        playbackSpeed: state.playbackSpeed,
      };

      const defaults = getDefaults(state.currentModeId);

      set({
        undoSnapshot: snapshot,
        modeSettings: { ...defaults.modeSettings },
        seed: defaults.seed,
        visuals: { ...defaults.visuals },
        overlays: { ...defaults.overlays },
        audioSettings: { ...defaults.audioSettings },
        asmrSettings: { ...defaults.asmrSettings },
        playbackSpeed: defaults.playbackSpeed,
      });

      get().saveToIndexedDB();

      get().showToast('reset done. changed ur mind?', () => {
        get().undoLastReset();
      }, 6000);
    },

    resetSection: (section) => {
      const state = get();
      const defaults = getDefaults(state.currentModeId);
      const snapshot: any = {};

      if (section === 'physics' || section === 'rings') {
        snapshot.modeSettings = { ...state.modeSettings };
        set({
          undoSnapshot: snapshot,
          modeSettings: { ...defaults.modeSettings },
        });
      } else if (section === 'visuals') {
        snapshot.visuals = { ...state.visuals };
        set({
          undoSnapshot: snapshot,
          visuals: { ...defaults.visuals },
        });
      } else if (section === 'sound') {
        snapshot.audioSettings = { ...state.audioSettings };
        snapshot.asmrSettings = { ...state.asmrSettings };
        set({
          undoSnapshot: snapshot,
          audioSettings: { ...defaults.audioSettings },
          asmrSettings: { ...defaults.asmrSettings },
        });
      } else if (section === 'overlays') {
        snapshot.overlays = { ...state.overlays };
        AiService.getInstance().updateSettings(DEFAULT_AI_SETTINGS);
        set({
          undoSnapshot: snapshot,
          overlays: { ...defaults.overlays },
        });
      }

      get().saveToIndexedDB();

      get().showToast(`reset ${section} done. changed ur mind?`, () => {
        get().undoLastReset();
      }, 6000);
    },

    resetSingleSetting: (key, defaultVal, category = 'mode') => {
      const state = get();
      const snapshot: any = {};

      if (category === 'mode') {
        if ((state.modeSettings as any)[key] === defaultVal) return;
        snapshot.modeSettings = { ...state.modeSettings };
        set({
          undoSnapshot: snapshot,
          modeSettings: { ...state.modeSettings, [key]: defaultVal },
        });
      } else if (category === 'visuals') {
        if ((state.visuals as any)[key] === defaultVal) return;
        snapshot.visuals = { ...state.visuals };
        set({
          undoSnapshot: snapshot,
          visuals: { ...state.visuals, [key]: defaultVal },
        });
      } else if (category === 'audio') {
        if ((state.audioSettings as any)[key] === defaultVal) return;
        snapshot.audioSettings = { ...state.audioSettings };
        set({
          undoSnapshot: snapshot,
          audioSettings: { ...state.audioSettings, [key]: defaultVal },
        });
      } else if (category === 'overlays') {
        if ((state.overlays as any)[key] === defaultVal) return;
        snapshot.overlays = { ...state.overlays };
        set({
          undoSnapshot: snapshot,
          overlays: { ...state.overlays, [key]: defaultVal },
        });
      } else if (category === 'asmr') {
        if ((state.asmrSettings as any)[key] === defaultVal) return;
        snapshot.asmrSettings = { ...state.asmrSettings };
        set({
          undoSnapshot: snapshot,
          asmrSettings: { ...state.asmrSettings, [key]: defaultVal },
        });
      }

      get().saveToIndexedDB();

      get().showToast(`reset ${key} done. changed ur mind?`, () => {
        get().undoLastReset();
      }, 6000);
    },

    factoryReset: async (deleteUserData = false) => {
      const defaults = getDefaults('classic');

      if (deleteUserData) {
        try {
          await clearIDB();
          localStorage.clear();
        } catch (e) {
          console.warn('clearIDB error:', e);
        }
      }

      set({
        projectName: 'Viral Neon Symphony',
        currentModeId: 'classic',
        modeSettings: { ...defaults.modeSettings },
        seed: 1337,
        isPlaying: true,
        playbackSpeed: 1.0,
        isMuted: false,
        visuals: { ...defaults.visuals },
        overlays: { ...defaults.overlays },
        audioSettings: { ...defaults.audioSettings },
        asmrSettings: { ...defaults.asmrSettings },
        backingGenre: 'none',
        generativeScale: 'pentatonic',
        generativeMood: 'dreamy',
        customNotes: [],
        targetDuration: DEFAULT_TARGET_DURATION,
        reelSpeed: 0.5,
        slowMoSoundFeel: false,
        speedRampFinale: false,
        marbleMelodySlowMoMode: 'calm_tempo',
        undoSnapshot: null,
        toast: null,
      });

      await get().saveToIndexedDB();
    },

    undoLastReset: () => {
      const { undoSnapshot } = get();
      if (!undoSnapshot) return;

      set((s) => ({
        modeSettings: undoSnapshot.modeSettings ?? s.modeSettings,
        seed: undoSnapshot.seed ?? s.seed,
        visuals: undoSnapshot.visuals ?? s.visuals,
        overlays: undoSnapshot.overlays ?? s.overlays,
        audioSettings: undoSnapshot.audioSettings ?? s.audioSettings,
        asmrSettings: undoSnapshot.asmrSettings ?? s.asmrSettings,
        playbackSpeed: undoSnapshot.playbackSpeed ?? s.playbackSpeed,
        reelSpeed: undoSnapshot.reelSpeed ?? s.reelSpeed,
        undoSnapshot: null,
      }));

      get().dismissToast();
      get().saveToIndexedDB();
    },

    saveToIndexedDB: async () => {
      const state = get();
      const project: StudioProject = {
        id: 'project_' + Date.now(),
        name: state.projectName,
        timestamp: Date.now(),
        modeId: state.currentModeId,
        modeSettings: state.modeSettings,
        seed: state.seed,
        visuals: state.visuals,
        overlays: state.overlays,
        audioSettings: state.audioSettings,
        asmrSettings: state.asmrSettings,
        customNotes: state.customNotes,
        targetDuration: state.targetDuration,
        reelSpeed: state.reelSpeed,
        slowMoSoundFeel: state.slowMoSoundFeel,
        speedRampFinale: state.speedRampFinale,
        marbleMelodySlowMoMode: state.marbleMelodySlowMoMode,
      };
      await setIDB('bounceforge_active_project', project);
    },

    loadFromIndexedDB: async () => {
      const saved = (await getIDB('bounceforge_active_project')) as StudioProject | undefined;
      if (saved) {
        set({
          projectName: saved.name,
          currentModeId: saved.modeId || 'classic',
          modeSettings: saved.modeSettings,
          seed: saved.seed,
          visuals: saved.visuals,
          overlays: saved.overlays ? { ...DEFAULT_OVERLAYS, ...saved.overlays } : { ...DEFAULT_OVERLAYS },
          audioSettings: saved.audioSettings,
          asmrSettings: saved.asmrSettings ?? get().asmrSettings,
          customNotes: saved.customNotes || [],
          targetDuration: saved.targetDuration ?? DEFAULT_TARGET_DURATION,
          reelSpeed: saved.reelSpeed !== undefined ? saved.reelSpeed : 0.5,
          slowMoSoundFeel: saved.slowMoSoundFeel ?? false,
          speedRampFinale: saved.speedRampFinale ?? false,
          marbleMelodySlowMoMode: saved.marbleMelodySlowMoMode ?? 'calm_tempo',
        });
      }
    },

    getShareableUrl: () => {
      const state = get();
      const payload = {
        modeId: state.currentModeId,
        modeSettings: state.modeSettings,
        seed: state.seed,
        visuals: state.visuals,
        overlays: state.overlays,
        audio: state.audioSettings,
        duration: state.targetDuration,
        rs: state.reelSpeed ?? 0.5,
        sm: state.slowMoSoundFeel ?? false,
        rf: state.speedRampFinale ?? false,
        msm: state.marbleMelodySlowMoMode ?? 'calm_tempo',
      };
      const b64 = btoa(encodeURIComponent(JSON.stringify(payload)));
      return `${window.location.origin}${window.location.pathname}#preset=${b64}`;
    },

    loadFromUrlHash: () => {
      try {
        if (!window.location.hash.includes('preset=')) return false;
        const b64 = window.location.hash.split('preset=')[1]?.split('&')[0];
        if (!b64) return false;
        let json: string;
        try {
          json = decodeURIComponent(atob(b64));
        } catch {
          json = atob(b64);
        }
        const data = JSON.parse(json);
        const modeId = data.modeId || data.mode;
        if (modeId) {
          set({
            currentModeId: modeId,
            modeSettings: data.modeSettings || {},
            seed: data.seed || 1337,
            visuals: data.visuals || get().visuals,
            overlays: data.overlays || get().overlays,
            audioSettings: (() => {
              const raw = data.audio || data.audioSettings || get().audioSettings;
              return {
                ...raw,
                masterVolume: (raw?.masterVolume === 0 || raw?.masterVolume === undefined) ? 0.85 : raw.masterVolume,
                sfxVolume: (raw?.sfxVolume === 0 || raw?.sfxVolume === undefined) ? 0.75 : raw.sfxVolume,
              };
            })(),
            targetDuration: data.duration || data.targetDuration || DEFAULT_TARGET_DURATION,
            reelSpeed: data.rs !== undefined ? data.rs : (data.reelSpeed !== undefined ? data.reelSpeed : 0.5),
            slowMoSoundFeel: data.sm ?? data.slowMoSoundFeel ?? false,
            speedRampFinale: data.rf ?? data.speedRampFinale ?? false,
            marbleMelodySlowMoMode: data.msm || data.marbleMelodySlowMoMode || 'calm_tempo',
            currentRoute: 'studio',
          });
          return true;
        }
      } catch (e) {
        console.warn('Could not parse preset from URL hash:', e);
      }
      return false;
    },

    surpriseMe: () => {
      const state = get();
      const themeKeys = Object.keys(THEMES);
      const randomThemeId = themeKeys[Math.floor(Math.random() * themeKeys.length)];

      const scales: ScaleName[] = ['pentatonic', 'major', 'minor', 'dorian', 'hijaz', 'japaneseInSen'];
      const moods: MusicMood[] = ['dreamy', 'hype', 'dark', 'lofi', 'epic'];
      const randomScale = scales[Math.floor(Math.random() * scales.length)];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      const newSeed = Math.floor(Math.random() * 900000) + 100000;

      const randomMode = ALL_MODES[Math.floor(Math.random() * ALL_MODES.length)];
      const defaults = getDefaults(randomMode.id);
      const newSettings = { ...defaults.modeSettings };
      if (newSettings.speed) newSettings.speed = Number((0.8 + Math.random() * 1.6).toFixed(1));
      if (newSettings.ringCount) newSettings.ringCount = Math.floor(8 + Math.random() * 12);

      set({
        currentModeId: randomMode.id,
        modeSettings: newSettings,
        seed: newSeed,
        visuals: {
          ...state.visuals,
          themeId: randomThemeId,
          bloomIntensity: Number((0.9 + Math.random() * 0.8).toFixed(1)),
          trailLength: Math.floor(12 + Math.random() * 18),
          screenShakeIntensity: Number((0.4 + Math.random() * 0.6).toFixed(1)),
        },
        generativeScale: randomScale,
        generativeMood: randomMood,
        isPlaying: true,
      });

      // Generate a matching procedural melody
      const notes = GenerativeMusicEngine.generateMelody('C', 4, randomScale, randomMood, 32);
      get().setCustomNotes(notes);
      AudioEngine.getInstance().setCustomMelody(notes, `Procedural ${randomScale}`);

      get().saveToIndexedDB();
      get().showToast('🎲 surprise me: viral setup generated!');
    },
  };
});
