import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      setAuth: (user, session) => set({ user, session, loading: false }),
      setLoading: (loading) => set({ loading }),
      signOut: () => set({ user: null, session: null }),
    }),
    {
      name: "auth-store",
      partialize: (s) => ({ user: s.user, session: s.session }),
    },
  ),
);
