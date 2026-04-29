'use client';

import { create } from 'zustand';

type SavedStore = {
  savedIds: Set<string>;
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
};

export const useSavedStore = create<SavedStore>((set, get) => ({
  savedIds: new Set(),
  toggleSaved: (id: string) => {
    set((state) => {
      const newSavedIds = new Set(state.savedIds);
      if (newSavedIds.has(id)) {
        newSavedIds.delete(id);
      } else {
        newSavedIds.add(id);
      }
      return { savedIds: newSavedIds };
    });
  },
  isSaved: (id: string) => {
    return get().savedIds.has(id);
  },
}));
