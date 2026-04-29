
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mockProperties } from '@/lib/mock-data';
import type { Property } from '@/lib/types';
import { get, set, del } from 'idb-keyval';

type PropertyState = {
  properties: Property[];
  isInitialized: boolean;
  initializeProperties: () => void;
  addProperty: (property: Property) => void;
  removeProperty: (id: string) => void;
  updateProperty: (id: string, updatedData: Partial<Property>) => void;
  toggleRentedStatus: (id: string) => void;
};

// Custom storage object for IndexedDB
const indexedDBStorage = {
  getItem: async (name: string): Promise<any> => {
    return await get(name);
  },
  setItem: async (name: string, value: any): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};


export const usePropertyStore = create<PropertyState>()(
  persist(
    (set, get) => ({
      properties: [],
      isInitialized: false,
      initializeProperties: () => {
        const state = get();
        if (!state.isInitialized) {
            console.log('Initializing mock properties...');
            set({ properties: mockProperties, isInitialized: true });
        }
      },
      addProperty: (property) =>
        set((state) => ({
          properties: [property, ...state.properties],
        })),
      removeProperty: (id) =>
        set((state) => ({
          properties: state.properties.filter((p) => p.id !== id),
        })),
      updateProperty: (id, updatedData) =>
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, ...updatedData } : p
          ),
        })),
      toggleRentedStatus: (id: string) =>
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, isRented: !p.isRented } : p
          ),
        })),
    }),
    {
      name: 'property-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
            // After rehydration, if the store is empty or uninitialized, load mock data.
            if (!state.isInitialized || state.properties.length === 0) {
                 state.properties = mockProperties;
            }
            state.isInitialized = true;
        }
       },
    }
  )
);
