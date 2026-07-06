import { create } from 'zustand';

import { supabase } from '@/utils/supabase/client';

// Single-owner app: the account is jordanreticker@gmail.com. The sign-in screen
// maps any input without '@' (e.g. the 'jrdr' shorthand) to this address.
export const OWNER_EMAIL = 'jordanreticker@gmail.com';

interface AuthStore {
  userId: string | null;
  isHydrated: boolean;
  hydrate: () => void;
  signIn: (user: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

let listenerAttached = false;

export const useAuthStore = create<AuthStore>((set, get) => ({
  userId: null,
  isHydrated: false,

  hydrate: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ userId: session?.user?.id ?? null, isHydrated: true });

    if (!listenerAttached) {
      listenerAttached = true;
      supabase.auth.onAuthStateChange((_event, s) => {
        const id = s?.user?.id ?? null;
        if (id !== get().userId) set({ userId: id });
      });
    }
  },

  signIn: async (user, password) => {
    const email = user.includes('@') ? user.trim() : OWNER_EMAIL;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  // Clear state immediately rather than waiting on the SIGNED_OUT event,
  // which is unreliable in React Native.
  signOut: async () => {
    set({ userId: null });
    await supabase.auth.signOut();
  },
}));
