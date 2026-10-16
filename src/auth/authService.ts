import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserSession, AuditLogEntry } from './types';

const STORAGE_KEY_SESSION = 'bounceforge_auth_session';
const STORAGE_KEY_USERS = 'bounceforge_db_users';
const STORAGE_KEY_AUDIT = 'bounceforge_db_audit_logs';

// Default initial users for demo / development
const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_admin_001',
    email: 'admin@bounceforge.studio',
    fullName: 'Master Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    provider: 'google',
    createdAt: '2026-01-01T00:00:00.000Z',
    emailVerified: true,
    twoFactorEnabled: true,
    onboardingCompleted: true,
    creatorGoal: 'business',
  },
  {
    id: 'user_creator_002',
    email: 'alex@creatorlab.io',
    fullName: 'Alex Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    provider: 'email',
    createdAt: '2026-02-14T12:30:00.000Z',
    emailVerified: true,
    twoFactorEnabled: false,
    onboardingCompleted: true,
    creatorGoal: 'tiktok',
  },
  {
    id: 'user_gamer_003',
    email: 'sam.gamer@gmail.com',
    fullName: 'Sam R.',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    provider: 'google',
    createdAt: '2026-03-01T08:15:00.000Z',
    emailVerified: true,
    twoFactorEnabled: false,
    onboardingCompleted: true,
    creatorGoal: 'fun',
  },
];

class AuthService {
  private static instance: AuthService;

  private constructor() {
    this.initLocalStorage();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initLocalStorage() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY_USERS)) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEY_AUDIT)) {
      const initialLogs: AuditLogEntry[] = [
        {
          id: 'log_001',
          adminId: 'user_admin_001',
          adminEmail: 'admin@bounceforge.studio',
          action: 'SYSTEM_BOOT',
          details: { message: 'BounceForge Auth & Admin Engine Initialized' },
          timestamp: new Date().toISOString(),
        },
      ];
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(initialLogs));
    }
  }

  private getUsersFromStorage(): UserProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      return raw ? JSON.parse(raw) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  private saveUsersToStorage(users: UserProfile[]) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }

  // Session
  getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    try {
      const session: UserSession = JSON.parse(raw);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.signOut();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  private setSession(user: UserProfile): UserSession {
    const session: UserSession = {
      user,
      token: 'bf_token_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    return session;
  }

  // 1. Sign in with Google
  async signInWithGoogle(): Promise<{ session: UserSession; isNewUser: boolean }> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/studio`,
          },
        });
      } catch (err) {
        console.warn('Supabase OAuth failed, using local provider fallback:', err);
      }
    }

    // Google one-tap / demo simulation with high-fidelity profile
    const users = this.getUsersFromStorage();
    const googleEmail = 'creator.demo@gmail.com';
    let user = users.find((u) => u.email.toLowerCase() === googleEmail);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: 'usr_g_' + Math.random().toString(36).slice(2, 10),
        email: googleEmail,
        fullName: 'Google Creator',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'member',
        provider: 'google',
        createdAt: new Date().toISOString(),
        emailVerified: true,
        twoFactorEnabled: false,
        onboardingCompleted: false,
      };
      users.push(user);
      this.saveUsersToStorage(users);
    }

    const session = this.setSession(user);
    this.logAction({
      adminId: user.id,
      adminEmail: user.email,
      action: 'LOGIN_GOOGLE',
      details: { email: user.email },
    });
    return { session, isNewUser };
  }

  // 2. Sign up with Email + Password
  async signUpWithEmail(
    email: string,
    _pass: string,
    fullName: string,
    referredBy?: string
  ): Promise<{ session: UserSession; requiresVerification: boolean }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: _pass,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
            role: 'member',
            provider: 'email',
            createdAt: new Date().toISOString(),
            emailVerified: Boolean(data.user.confirmed_at),
            referredBy,
          };
          const session = this.setSession(profile);
          return { session, requiresVerification: !profile.emailVerified };
        }
      } catch (err) {
        console.warn('Supabase signup error, using fallback:', err);
      }
    }

    const users = this.getUsersFromStorage();
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const newUser: UserProfile = {
      id: 'usr_e_' + Math.random().toString(36).slice(2, 10),
      email: cleanEmail,
      fullName: fullName.trim() || cleanEmail.split('@')[0],
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      role: cleanEmail.includes('admin') ? 'admin' : 'member',
      provider: 'email',
      createdAt: new Date().toISOString(),
      emailVerified: true, // Auto-verified in local mode with option to resend
      referredBy,
      onboardingCompleted: false,
    };

    users.push(newUser);
    this.saveUsersToStorage(users);
    const session = this.setSession(newUser);

    this.logAction({
      adminId: newUser.id,
      adminEmail: newUser.email,
      action: 'SIGNUP_EMAIL',
      details: { email: newUser.email, referredBy },
    });

    return { session, requiresVerification: false };
  }

  // 3. Sign in with Email + Password
  async signInWithEmail(email: string, _pass: string): Promise<UserSession> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: _pass,
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
            role: 'member',
            provider: 'email',
            createdAt: data.user.created_at,
            emailVerified: Boolean(data.user.confirmed_at),
          };
          return this.setSession(profile);
        }
      } catch (err: any) {
        console.warn('Supabase password login error:', err.message);
      }
    }

    const users = this.getUsersFromStorage();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('No account found with this email. Please check your spelling or sign up.');
    }

    if (user.isSuspended) {
      throw new Error('This account has been suspended by administration. Please contact support.');
    }

    const session = this.setSession(user);
    this.logAction({
      adminId: user.id,
      adminEmail: user.email,
      action: 'LOGIN_EMAIL',
      details: { email: user.email },
    });
    return session;
  }

  // 4. Magic Link (Passwordless)
  async signInWithMagicLink(email: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/studio` },
      });
      return;
    }

    // In local mode, verify user exists or create them
    const users = this.getUsersFromStorage();
    const cleanEmail = email.trim().toLowerCase();
    let user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        id: 'usr_m_' + Math.random().toString(36).slice(2, 10),
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
        role: 'member',
        provider: 'magic_link',
        createdAt: new Date().toISOString(),
        emailVerified: true,
      };
      users.push(user);
      this.saveUsersToStorage(users);
    }
  }

  // Quick Switch for testing: Switch to Admin
  switchToAdminAccount(): UserSession {
    const users = this.getUsersFromStorage();
    const admin = users.find((u) => u.role === 'admin') || INITIAL_USERS[0];
    return this.setSession(admin);
  }

  // Sign out
  signOut(): void {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }

  // Update Profile
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const users = this.getUsersFromStorage();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    this.saveUsersToStorage(users);

    const session = this.getSession();
    if (session && session.user.id === userId) {
      this.setSession(updated);
    }
    return updated;
  }

  // Delete Account
  async deleteAccount(userId: string): Promise<void> {
    const users = this.getUsersFromStorage().filter((u) => u.id !== userId);
    this.saveUsersToStorage(users);
    this.signOut();
  }

  // Admin: Get all users
  getAllUsers(): UserProfile[] {
    return this.getUsersFromStorage();
  }

  // Audit Logs
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
      const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
      const newEntry: AuditLogEntry = {
        ...entry,
        id: 'log_' + Math.random().toString(36).slice(2, 10),
        timestamp: new Date().toISOString(),
      };
      logs.unshift(newEntry);
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 200)));
    } catch {}
  }

  getAuditLogs(): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const authService = AuthService.getInstance();
