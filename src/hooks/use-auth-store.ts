'use client';

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  setSessionState: (session: Session | null, profile?: UserProfile | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  initialized: false,
  setSessionState: (session, profile = null) =>
    set({
      session,
      user: session?.user ?? null,
      profile,
      isAuthenticated: Boolean(session?.user),
      isLoading: false,
      initialized: true,
    }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized, isLoading: false }),
  signOut: async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    }
    set({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      initialized: true,
    });
  },
}));
