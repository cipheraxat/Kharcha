import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Order, DashboardStats } from '../types';
import { Nudge } from '../services/nudgeService';

const GOOGLE_TOKEN_KEY = 'google_access_token';

interface AuthState {
  session: Session | null;
  googleAccessToken: string | null;
  setSession: (session: Session | null) => void;
  setGoogleAccessToken: (token: string | null) => void;
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

type StoreState = AuthState & SyncState & DataState;

export const useStore = create<StoreState>((set) => ({
  // Auth
  session: null,
  googleAccessToken: null,
  setSession: (session) => set({ session }),
  setGoogleAccessToken: (token) => {
    set({ googleAccessToken: token });
    // Persist/clear to survive app restarts (fire-and-forget; in-memory is source of truth during session)
    if (token) {
      SecureStore.setItemAsync(GOOGLE_TOKEN_KEY, token).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEY).catch(() => {});
    }
  },
  signOut: () => {
    SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEY).catch(() => {});
    set({ session: null, googleAccessToken: null, orders: [], stats: null, nudge: null });
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
}));
