import { create } from 'zustand';
import { UserProfile } from './types';
import { authService } from './authService';
import { presetService } from '../presets/presetService';

interface AuthState {
  currentUser: UserProfile | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  
  // Modals state
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'magic_link';
  postLoginRedirect: string | null;
  isOnboardingOpen: boolean;
  isUpgradeModalOpen: boolean;
  upgradeFeaturePrompt: string | null;

  // Actions
  initAuth: () => void;
  openAuthModal: (mode?: 'login' | 'signup' | 'magic_link', redirect?: string) => void;
  closeAuthModal: () => void;
  openUpgradeModal: (featureName?: string) => void;
  closeUpgradeModal: () => void;
  closeOnboarding: () => void;

  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, referralCode?: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  switchToAdmin: () => void;
  logout: () => void;
  updateCurrentUser: (updates: Partial<UserProfile>) => Promise<void>;
  deleteCurrentUserAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  sessionToken: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,

  isAuthModalOpen: false,
  authModalMode: 'login',
  postLoginRedirect: null,
  isOnboardingOpen: false,
  isUpgradeModalOpen: false,
  upgradeFeaturePrompt: null,

  initAuth: () => {
    const session = authService.getSession();
    if (session) {
      set({
        currentUser: session.user,
        sessionToken: session.token,
        isAuthenticated: true,
        isAdmin: session.user.role === 'admin',
        isLoading: false,
      });
    } else {
      // Create guest session state
      set({
        currentUser: null,
        sessionToken: null,
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
      });
    }
  },

  openAuthModal: (mode = 'login', redirect) => {
    set({
      isAuthModalOpen: true,
      authModalMode: mode,
      postLoginRedirect: redirect || null,
    });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false, postLoginRedirect: null });
  },

  openUpgradeModal: (featureName) => {
    set({
      isUpgradeModalOpen: true,
      upgradeFeaturePrompt: featureName || null,
    });
  },

  closeUpgradeModal: () => {
    set({ isUpgradeModalOpen: false, upgradeFeaturePrompt: null });
  },

  closeOnboarding: () => {
    set({ isOnboardingOpen: false });
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const { session, isNewUser } = await authService.signInWithGoogle();
      await presetService.migrateGuestWorkToAccount(session.user.id);
      set({
        currentUser: session.user,
        sessionToken: session.token,
        isAuthenticated: true,
        isAdmin: session.user.role === 'admin',
        isAuthModalOpen: false,
        isLoading: false,
        isOnboardingOpen: isNewUser || !session.user.onboardingCompleted,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithEmail: async (email, pass) => {
    set({ isLoading: true });
    try {
      const session = await authService.signInWithEmail(email, pass);
      await presetService.migrateGuestWorkToAccount(session.user.id);
      set({
        currentUser: session.user,
        sessionToken: session.token,
        isAuthenticated: true,
        isAdmin: session.user.role === 'admin',
        isAuthModalOpen: false,
        isLoading: false,
        isOnboardingOpen: !session.user.onboardingCompleted,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signupWithEmail: async (email, pass, name, referralCode) => {
    set({ isLoading: true });
    try {
      const { session } = await authService.signUpWithEmail(email, pass, name, referralCode);
      await presetService.migrateGuestWorkToAccount(session.user.id);
      set({
        currentUser: session.user,
        sessionToken: session.token,
        isAuthenticated: true,
        isAdmin: session.user.role === 'admin',
        isAuthModalOpen: false,
        isLoading: false,
        isOnboardingOpen: true,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithMagicLink: async (email) => {
    set({ isLoading: true });
    try {
      await authService.signInWithMagicLink(email);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  switchToAdmin: () => {
    const session = authService.switchToAdminAccount();
    set({
      currentUser: session.user,
      sessionToken: session.token,
      isAuthenticated: true,
      isAdmin: true,
      isAuthModalOpen: false,
    });
  },

  logout: () => {
    authService.signOut();
    set({
      currentUser: null,
      sessionToken: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },

  updateCurrentUser: async (updates) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const updated = await authService.updateProfile(currentUser.id, updates);
    set({
      currentUser: updated,
      isAdmin: updated.role === 'admin',
    });
  },

  deleteCurrentUserAccount: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    await authService.deleteAccount(currentUser.id);
    set({
      currentUser: null,
      sessionToken: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },
}));
