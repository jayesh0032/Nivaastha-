
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

type User = {
  name: string;
  mobileNumber: string;
  pinCode: string;
  city: string;
  state: string;
  country: string;
  listedProperties: string[];
};

type UserState = {
  users: User[];
  addUser: (user: Omit<User, 'listedProperties'>) => void;
  findUserByMobile: (mobileNumber: string) => User | undefined;
  addPropertyToUser: (mobileNumber: string, propertyId: string) => void;
  removePropertyFromUser: (mobileNumber: string, propertyId: string) => void;
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

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      addUser: (user) => set((state) => ({ users: [...state.users, { ...user, listedProperties: [] }] })),
      findUserByMobile: (mobileNumber) => get().users.find(u => u.mobileNumber === mobileNumber),
      addPropertyToUser: (mobileNumber, propertyId) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.mobileNumber === mobileNumber
              ? { ...user, listedProperties: [...user.listedProperties, propertyId] }
              : user
          ),
        }));
      },
      removePropertyFromUser: (mobileNumber, propertyId) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.mobileNumber === mobileNumber
              ? { ...user, listedProperties: user.listedProperties.filter(id => id !== propertyId) }
              : user
          ),
        }));
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
);
