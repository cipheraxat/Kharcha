import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { DashboardStats, GmailAccount, Order, Platform } from '../types';
import { Nudge } from '../services/nudgeService';
import { InsightExplanation } from '../services/insightService';

export interface AIInsightRow {
  label: string;
  value: string | number;
}

export interface AIInsightRequest {
  /** Stable identifier for the insight type, e.g. 'monthly_pulse', 'top_platform' */
  insightType: string;
  /** Human-readable title shown in the panel header */
  title: string;
  /** Subtitle / accent (e.g. platform name, date) */
  accent?: string;
  /** Brand or accent color for the gradient header */
  color?: string;
  /** Emoji or single character shown in the header bubble */
  icon?: string;
  /** Structured data passed to the AI for explanation */
  context: Record<string, unknown>;
  /** Plain rows shown in the "Underlying numbers" section */
  rows: AIInsightRow[];
}

interface AIInsightPanelState {
  /** True when the panel should be mounted/visible */
  isOpen: boolean;
  /** True while the AI explanation is being fetched */
  isLoading: boolean;
  /** The current insight request being shown */
  request: AIInsightRequest | null;
  /** AI-generated explanation, or null while loading / on error */
  explanation: InsightExplanation | null;
  setAIInsightOpen: (state: { request: AIInsightRequest; isLoading: boolean }) => void;
  setAIInsightExplanation: (explanation: InsightExplanation | null) => void;
  closeAIInsight: () => void;
}

const GMAIL_ACCOUNTS_KEY = 'gmail_accounts_v2';
const LEGACY_TOKEN_KEY = 'google_access_token';

const ALL_PLATFORMS: Platform[] = ['swiggy', 'zomato', 'blinkit', 'bigbasket', 'zepto'];

async function persistAccounts(accounts: GmailAccount[]) {
  try {
    await SecureStore.setItemAsync(GMAIL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('[store] Failed to persist Gmail accounts:', err);
  }
}

async function clearAccounts() {
  try {
    await SecureStore.deleteItemAsync(GMAIL_ACCOUNTS_KEY);
    await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
  } catch (err) {
    console.warn('[store] Failed to clear Gmail accounts:', err);
  }
}

interface AuthState {
  session: Session | null;
  /** All connected Gmail accounts (primary + secondary) */
  gmailAccounts: GmailAccount[];
  /** Convenience getter — token of the primary account */
  googleAccessToken: string | null;
  setSession: (session: Session | null) => void;
  /** Called after Supabase sign-in to set/update the primary account */
  setPrimaryAccount: (email: string, token: string) => void;
  /** Legacy alias kept so OnboardingScreen doesn't break if token-only is available */
  setGoogleAccessToken: (token: string | null) => void;
  addGmailAccount: (account: GmailAccount) => void;
  removeGmailAccount: (email: string) => void;
  updateAccountToken: (email: string, accessToken: string, authRefreshToken?: string) => void;
  updateAccountPlatforms: (email: string, platforms: Platform[]) => void;
  /** Restore persisted accounts on app launch */
  restoreGmailAccounts: () => Promise<void>;
  signOut: () => void;
}

interface SyncState {
  isSyncing: boolean;
  syncProgress: { total: number; processed: number } | null;
  lastSyncedAt: string | null;
  setIsSyncing: (v: boolean) => void;
  setSyncProgress: (p: { total: number; processed: number } | null) => void;
  setLastSyncedAt: (v: string | null) => void;
}

interface DataState {
  orders: Order[];
  stats: DashboardStats | null;
  nudge: Nudge | null;
  isLoadingData: boolean;
  setOrders: (orders: Order[]) => void;
  setStats: (stats: DashboardStats | null) => void;
  setNudge: (nudge: Nudge | null) => void;
  setIsLoadingData: (v: boolean) => void;
}

type StoreState = AuthState & SyncState & DataState & AIInsightPanelState;

export const useStore = create<StoreState>((set, get) => ({
  // Auth
  session: null,
  gmailAccounts: [],
  googleAccessToken: null,

  setSession: (session) => set({ session }),

  setPrimaryAccount: (email, token) => {
    set((state) => {
      const existing = state.gmailAccounts.find((a) => a.isPrimary);
      let updated: GmailAccount[];

      if (existing) {
        // Update token (and email in case it changed)
        updated = state.gmailAccounts.map((a) =>
          a.isPrimary ? { ...a, email, accessToken: token } : a
        );
      } else {
        // First sign-in: primary account gets all platforms
        const secondaryPlatforms = state.gmailAccounts
          .flatMap((a) => a.assignedPlatforms);
        const availablePlatforms = ALL_PLATFORMS.filter(
          (p) => !secondaryPlatforms.includes(p)
        );
        updated = [
          { email, accessToken: token, assignedPlatforms: availablePlatforms, isPrimary: true },
          ...state.gmailAccounts.filter((a) => !a.isPrimary),
        ];
      }

      persistAccounts(updated);
      return { gmailAccounts: updated, googleAccessToken: token };
    });
  },

  setGoogleAccessToken: (token) => {
    if (!token) return;
    const email = get().session?.user?.email ?? '';
    get().setPrimaryAccount(email, token);
  },

  addGmailAccount: (account) => {
    set((state) => {
      // Avoid duplicates by email
      if (state.gmailAccounts.some((a) => a.email === account.email)) {
        // Just update the token
        const updated = state.gmailAccounts.map((a) =>
          a.email === account.email
            ? { ...a, accessToken: account.accessToken, authRefreshToken: account.authRefreshToken ?? a.authRefreshToken }
            : a
        );
        persistAccounts(updated);
        return { gmailAccounts: updated };
      }
      const updated = [...state.gmailAccounts, account];
      persistAccounts(updated);
      return { gmailAccounts: updated };
    });
  },

  updateAccountToken: (email, accessToken, authRefreshToken) => {
    set((state) => {
      const updated = state.gmailAccounts.map((a) =>
        a.email === email
          ? { ...a, accessToken, authRefreshToken: authRefreshToken ?? a.authRefreshToken }
          : a
      );
      persistAccounts(updated);
      return {
        gmailAccounts: updated,
        googleAccessToken: updated.find((a) => a.isPrimary)?.accessToken ?? state.googleAccessToken,
      };
    });
  },

  removeGmailAccount: (email) => {
    set((state) => {
      const removed = state.gmailAccounts.find((a) => a.email === email);
      if (!removed || removed.isPrimary) return state; // can't remove primary

      // Reassign orphaned platforms back to the primary account
      const orphaned = removed.assignedPlatforms;
      const updated = state.gmailAccounts
        .filter((a) => a.email !== email)
        .map((a) =>
          a.isPrimary
            ? { ...a, assignedPlatforms: [...a.assignedPlatforms, ...orphaned] }
            : a
        );
      persistAccounts(updated);
      return { gmailAccounts: updated };
    });
  },

  updateAccountPlatforms: (email, platforms) => {
    set((state) => {
      // Determine which platforms are being moved away from other accounts
      const updated = state.gmailAccounts.map((a) => {
        if (a.email === email) {
          return { ...a, assignedPlatforms: platforms };
        }
        // Remove platforms now assigned to the target account from other accounts
        return {
          ...a,
          assignedPlatforms: a.assignedPlatforms.filter((p) => !platforms.includes(p)),
        };
      });
      persistAccounts(updated);
      return { gmailAccounts: updated };
    });
  },

  restoreGmailAccounts: async () => {
    try {
      const stored = await SecureStore.getItemAsync(GMAIL_ACCOUNTS_KEY);
      if (stored) {
        const accounts: GmailAccount[] = JSON.parse(stored);
        const primaryToken = accounts.find((a) => a.isPrimary)?.accessToken ?? null;
        set({ gmailAccounts: accounts, googleAccessToken: primaryToken });
        return;
      }

      // Migrate from legacy single-token storage
      const legacyToken = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
      if (legacyToken) {
        const email = get().session?.user?.email ?? '';
        const primary: GmailAccount = {
          email,
          accessToken: legacyToken,
          assignedPlatforms: ALL_PLATFORMS,
          isPrimary: true,
        };
        await persistAccounts([primary]);
        await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
        set({ gmailAccounts: [primary], googleAccessToken: legacyToken });
      }
    } catch (err) {
      console.warn('[store] Failed to restore Gmail accounts:', err);
    }
  },

  signOut: () => {
    clearAccounts();
    set({
      session: null,
      gmailAccounts: [],
      googleAccessToken: null,
      orders: [],
      stats: null,
      nudge: null,
    });
  },

  // Sync
  isSyncing: false,
  syncProgress: null,
  lastSyncedAt: null,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

  // Data
  orders: [],
  stats: null,
  nudge: null,
  isLoadingData: false,
  setOrders: (orders) => set({ orders }),
  setStats: (stats) => set({ stats }),
  setNudge: (nudge) => set({ nudge }),
  setIsLoadingData: (isLoadingData) => set({ isLoadingData }),

  // AI Insight Panel
  isOpen: false,
  isLoading: false,
  request: null,
  explanation: null,
  setAIInsightOpen: ({ request, isLoading }) =>
    set({ isOpen: true, request, isLoading, explanation: null }),
  setAIInsightExplanation: (explanation) =>
    set({ explanation, isLoading: false }),
  closeAIInsight: () =>
    set({ isOpen: false, request: null, explanation: null, isLoading: false }),
}));

