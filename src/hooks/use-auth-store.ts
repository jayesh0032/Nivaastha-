'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type AuthState = {
  isAuthenticated: boolean;
  userMobile: string | null;
  login: (mobile: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userMobile: null,
      login: (mobile: string) => set({ isAuthenticated: true, userMobile: mobile }),
      logout: () => set({ isAuthenticated: false, userMobile: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
