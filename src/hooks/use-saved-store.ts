'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SavedStore = {
  savedList: string[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
};

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      savedList: [],
      toggleSaved: (id: string) => {
        set((state) => {
          const exists = state.savedList.includes(id);
          return {
            savedList: exists
              ? state.savedList.filter((item) => item !== id)
              : [...state.savedList, id],
          };
        });
      },
      isSaved: (id: string) => get().savedList.includes(id),
    }),
    {
      name: 'nivaastha-saved-properties',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
