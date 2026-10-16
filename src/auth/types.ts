export type UserRole = 'member' | 'support' | 'admin';

export type AuthProviderType = 'google' | 'email' | 'magic_link';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: UserRole;
  provider: AuthProviderType;
  createdAt: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  referredBy?: string; // affiliate code if referred
  isSuspended?: boolean;
  onboardingCompleted?: boolean;
  creatorGoal?: 'tiktok' | 'reels' | 'shorts' | 'fun' | 'business';
  notes?: string; // admin internal notes
}

export interface UserSession {
  user: UserProfile;
  token: string;
  expiresAt: number; // timestamp
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details: Record<string, any>;
  timestamp: string;
}
