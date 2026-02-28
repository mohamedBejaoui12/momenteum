# Daily Progress Tracker — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully responsive habit/task/reminder tracker web app with Supabase + React + Tailwind CSS v4, deployed on Netlify.

**Architecture:** Client-only SPA. Supabase handles auth, DB (with RLS), and serves as the only backend. State is managed with Zustand (auth) and TanStack Query (server data). No custom server.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Supabase JS v2, TanStack Query v5, Zustand, React Router v6, React Hook Form, Zod, Recharts.

---

## Phase 1 — Project Scaffold + Auth

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**

- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.env.local` (gitignored)
- Create: `.gitignore`
- Create: `netlify.toml`

**Step 1: Initialize project**

```bash
npm create vite@latest . -- --template react-ts
```

Expected: files created in current directory.

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js@^2 @tanstack/react-query@^5 zustand react-router-dom@^6 react-hook-form zod @hookform/resolvers recharts
npm install -D tailwindcss @tailwindcss/vite prettier
```

**Step 3: Configure Tailwind CSS v4**

Modify `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Add to `src/index.css` (replace contents):

```css
@import "tailwindcss";
```

**Step 4: Add `.env.local`**

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite server running on http://localhost:5173

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS project with Tailwind v4 + dependencies"
```

---

### Task 2: Supabase SQL migrations

**Files:**

- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`

**Step 1: Write migration 001**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Profiles (auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url  text,
  timezone    text NOT NULL DEFAULT 'UTC',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Counters
CREATE TABLE IF NOT EXISTS public.counters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  icon         text,
  color        text NOT NULL DEFAULT '#6366f1',
  target_type  text NOT NULL DEFAULT 'daily' CHECK (target_type IN ('daily','weekly')),
  target_value int NOT NULL DEFAULT 1,
  archived     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Counter entries (one per day per counter)
CREATE TABLE IF NOT EXISTS public.counter_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_id   uuid NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date   date NOT NULL,
  value        int NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counter_id, entry_date)
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  task_date    date NOT NULL DEFAULT CURRENT_DATE,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text           text NOT NULL,
  schedule_type  text NOT NULL DEFAULT 'daily' CHECK (schedule_type IN ('daily','weekly')),
  weekdays       int[],
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_counter_entries_user_date ON public.counter_entries (user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks (user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_counters_user_active ON public.counters (user_id) WHERE NOT archived;
```

**Step 2: Write migration 002 (RLS)**

```sql
-- supabase/migrations/002_rls_policies.sql

-- ── profiles ─────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: select own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── counters ─────────────────────────────────────────
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters: select own" ON public.counters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "counters: insert own" ON public.counters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "counters: update own" ON public.counters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "counters: delete own" ON public.counters
  FOR DELETE USING (auth.uid() = user_id);

-- ── counter_entries ───────────────────────────────────
ALTER TABLE public.counter_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counter_entries: select own" ON public.counter_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "counter_entries: insert own" ON public.counter_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "counter_entries: update own" ON public.counter_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "counter_entries: delete own" ON public.counter_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ── tasks ─────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks: select own" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks: insert own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks: update own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks: delete own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ── reminders ─────────────────────────────────────────
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders: select own" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reminders: insert own" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reminders: update own" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reminders: delete own" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);
```

**Step 3: Verify RLS (run in Supabase SQL editor)**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Expected: All rows have `rowsecurity = true`.

**Step 4: Commit**

```bash
git add supabase/
git commit -m "feat(db): initial schema + RLS policies"
```

---

### Task 3: Supabase client + types + auth store

**Files:**

- Create: `src/lib/supabase.ts`
- Create: `src/lib/types.ts`
- Create: `src/stores/authStore.ts`

**Step 1: Create Supabase client**

```ts
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 2: Define shared types**

```ts
// src/lib/types.ts
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
}

export interface Counter {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  target_type: "daily" | "weekly";
  target_value: number;
  archived: boolean;
  created_at: string;
}

export interface CounterEntry {
  id: string;
  counter_id: string;
  user_id: string;
  entry_date: string; // ISO date string YYYY-MM-DD
  value: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  task_date: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  text: string;
  schedule_type: "daily" | "weekly";
  weekdays: number[] | null;
  active: boolean;
  created_at: string;
}
```

**Step 3: Create auth store**

```ts
// src/stores/authStore.ts
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
```

**Step 4: Commit**

```bash
git add src/lib/ src/stores/
git commit -m "feat(auth): Supabase client + types + Zustand auth store"
```

---

## Phase 2 — App Shell + Auth Pages

### Task 4: App entry point, routing, AuthProvider

**Files:**

- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/AuthProvider.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/components/Layout.tsx`

**Step 1: main.tsx**

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

**Step 2: AuthProvider**

```tsx
// src/components/AuthProvider.tsx
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session);
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  return <>{children}</>;
}
```

**Step 3: ProtectedRoute**

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

**Step 4: Layout (sidebar + outlet)**

```tsx
// src/components/Layout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

const nav = [
  { to: "/today", label: "🌅 Today" },
  { to: "/counters", label: "🔥 Habits" },
  { to: "/tasks", label: "✅ Tasks" },
  { to: "/reminders", label: "🔔 Reminders" },
  { to: "/settings", label: "⚙️ Settings" },
];

export function Layout() {
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    signOut();
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col gap-1 border-r border-slate-200 bg-white px-3 py-6 shadow-sm">
        <p className="mb-4 px-2 text-lg font-semibold tracking-tight text-indigo-600">
          Daily Tracker
        </p>
        {nav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          className="mt-auto rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-slate-100"
        >
          Sign out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 5: App.tsx routing**

```tsx
// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { TodayDashboard } from "./pages/TodayDashboard";
import { CountersPage } from "./pages/CountersPage";
import { CounterDetailPage } from "./pages/CounterDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { RemindersPage } from "./pages/RemindersPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayDashboard />} />
          <Route path="/counters" element={<CountersPage />} />
          <Route path="/counters/:id" element={<CounterDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AuthProvider>
  );
}
```

**Step 6: Commit**

```bash
git add src/
git commit -m "feat(shell): app shell, routing, AuthProvider, Layout"
```

---

### Task 5: Auth pages (Login + Signup)

**Files:**

- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/SignupPage.tsx`
- Create: `src/lib/schemas.ts`

**Step 1: Schemas**

```ts
// src/lib/schemas.ts
import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Minimum 8 characters"),
});
export type AuthInput = z.infer<typeof authSchema>;
```

**Step 2: LoginPage**

```tsx
// src/pages/LoginPage.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { authSchema, type AuthInput } from "../lib/schemas";

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthInput) => {
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      setError("root", { message: error.message });
    } else {
      navigate("/today");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Welcome back</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 3: SignupPage**

```tsx
// src/pages/SignupPage.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { authSchema, type AuthInput } from "../lib/schemas";

export function SignupPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthInput) => {
    const { error } = await supabase.auth.signUp(data);
    if (error) {
      setError("root", { message: error.message });
    } else {
      navigate("/today");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">
          Create account
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/pages/ src/lib/schemas.ts
git commit -m "feat(auth): login and signup pages"
```

---

## Phase 3 — Counters / Habit Streaks

### Task 6: Counter hooks + utility functions

**Files:**

- Create: `src/lib/dateUtils.ts`
- Create: `src/lib/streakUtils.ts`
- Create: `src/hooks/useCounters.ts`
- Create: `src/hooks/useCounterEntries.ts`

**Step 1: dateUtils**

```ts
// src/lib/dateUtils.ts
export const todayISO = (): string => new Date().toISOString().split("T")[0];

export const prevDay = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

export const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
```

**Step 2: streakUtils**

```ts
// src/lib/streakUtils.ts
import { todayISO, prevDay } from "./dateUtils";

export function computeCurrentStreak(entryDates: string[]): number {
  if (!entryDates.length) return 0;
  const sorted = [...entryDates].sort().reverse();
  let streak = 0;
  let expected = todayISO();
  for (const d of sorted) {
    if (d === expected) {
      streak++;
      expected = prevDay(expected);
    } else {
      break;
    }
  }
  return streak;
}

export function computeLongestStreak(entryDates: string[]): number {
  if (!entryDates.length) return 0;
  const sorted = [...entryDates].sort();
  let longest = 1,
    current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
      86400000;
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else current = 1;
  }
  return longest;
}
```

**Step 3: TDD — Write tests for streak utils**

```ts
// src/lib/__tests__/streakUtils.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeCurrentStreak, computeLongestStreak } from "../streakUtils";

// Mock todayISO to be deterministic
vi.mock("../dateUtils", () => ({
  todayISO: () => "2026-02-27",
  prevDay: (d: string) => {
    const date = new Date(d);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  },
}));

describe("computeCurrentStreak", () => {
  it("returns 0 for empty dates", () => {
    expect(computeCurrentStreak([])).toBe(0);
  });

  it("returns 3 for 3 consecutive days ending today", () => {
    expect(
      computeCurrentStreak(["2026-02-25", "2026-02-26", "2026-02-27"]),
    ).toBe(3);
  });

  it("returns 0 when last entry was not today", () => {
    expect(computeCurrentStreak(["2026-02-24", "2026-02-25"])).toBe(0);
  });
});

describe("computeLongestStreak", () => {
  it("returns 0 for empty dates", () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it("returns longest run of consecutive days", () => {
    const dates = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-10",
      "2026-01-11",
    ];
    expect(computeLongestStreak(dates)).toBe(3);
  });
});
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/streakUtils.test.ts
```

Expected: 5/5 tests pass.

**Step 5: Counter hooks**

```ts
// src/hooks/useCounters.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Counter } from "../lib/types";

export function useCounters() {
  return useQuery({
    queryKey: ["counters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counters")
        .select("*")
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return data as Counter[];
    },
  });
}

export function useCreateCounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<
        Counter,
        "name" | "icon" | "color" | "target_type" | "target_value"
      >,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("counters")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Counter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counters"] }),
  });
}

export function useArchiveCounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("counters")
        .update({ archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counters"] }),
  });
}
```

```ts
// src/hooks/useCounterEntries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { CounterEntry } from "../lib/types";
import { todayISO } from "../lib/dateUtils";

export function useCounterEntries(counterId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["counterEntries", counterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counter_entries")
        .select("*")
        .eq("counter_id", counterId)
        .gte("entry_date", sinceISO)
        .order("entry_date");
      if (error) throw error;
      return data as CounterEntry[];
    },
    enabled: !!counterId,
  });
}

export function useCheckIn(counterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const today = todayISO();
      const { data, error } = await supabase
        .from("counter_entries")
        .upsert(
          {
            counter_id: counterId,
            user_id: user!.id,
            entry_date: today,
            value: 1,
          },
          { onConflict: "counter_id,entry_date" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as CounterEntry;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["counterEntries", counterId] }),
  });
}
```

**Step 6: Commit**

```bash
git add src/lib/ src/hooks/
git commit -m "feat(counters): streak utils, counter hooks, counter-entry hooks"
```

---

### Task 7: Counters UI

**Files:**

- Create: `src/pages/CountersPage.tsx`
- Create: `src/pages/CounterDetailPage.tsx`
- Create: `src/components/CounterCard.tsx`
- Create: `src/components/AddCounterModal.tsx`

**Step 1: CounterCard**

```tsx
// src/components/CounterCard.tsx
import type { Counter, CounterEntry } from "../lib/types";
import { computeCurrentStreak } from "../lib/streakUtils";
import { todayISO } from "../lib/dateUtils";
import { useCheckIn } from "../hooks/useCounterEntries";

interface Props {
  counter: Counter;
  entries: CounterEntry[];
}

export function CounterCard({ counter, entries }: Props) {
  const checkIn = useCheckIn(counter.id);
  const entryDates = entries.map((e) => e.entry_date);
  const streak = computeCurrentStreak(entryDates);
  const checkedToday = entryDates.includes(todayISO());

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{counter.icon ?? "📌"}</span>
        <span className="font-semibold text-slate-800">{counter.name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold" style={{ color: counter.color }}>
          {streak}
        </span>
        <span className="text-sm text-slate-400">day streak 🔥</span>
      </div>
      <button
        onClick={() => checkIn.mutate()}
        disabled={checkedToday || checkIn.isPending}
        className={`rounded-xl py-2 text-sm font-semibold transition-all ${
          checkedToday
            ? "bg-green-50 text-green-600 cursor-default"
            : "bg-indigo-600 text-white hover:opacity-90"
        }`}
      >
        {checkedToday ? "✓ Done today" : "Check in"}
      </button>
    </div>
  );
}
```

**Step 2: AddCounterModal**

```tsx
// src/components/AddCounterModal.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCounter } from "../hooks/useCounters";

const schema = z.object({
  name: z.string().min(1, "Name required").max(50),
  icon: z.string().optional(),
  color: z.string().default("#6366f1"),
  target_type: z.enum(["daily", "weekly"]).default("daily"),
  target_value: z.coerce.number().int().min(1).default(1),
});
type FormInput = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export function AddCounterModal({ onClose }: Props) {
  const createCounter = useCreateCounter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { color: "#6366f1", target_type: "daily", target_value: 1 },
  });

  const onSubmit = async (data: FormInput) => {
    await createCounter.mutateAsync({
      ...data,
      icon: data.icon || null,
    } as any);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">New Habit</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input
            {...register("name")}
            placeholder="Habit name (e.g. No junk food)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
          <input
            {...register("icon")}
            placeholder="Emoji icon (optional)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <div className="flex gap-2">
            <label className="text-sm text-slate-600 self-center">Color:</label>
            <input
              {...register("color")}
              type="color"
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCounter.isPending}
              className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {createCounter.isPending ? "Saving…" : "Add Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: CountersPage**

```tsx
// src/pages/CountersPage.tsx
import { useState } from "react";
import { useCounters } from "../hooks/useCounters";
import { useCounterEntries } from "../hooks/useCounterEntries";
import { CounterCard } from "../components/CounterCard";
import { AddCounterModal } from "../components/AddCounterModal";
import type { Counter } from "../lib/types";

function CounterCardLoader({ counter }: { counter: Counter }) {
  const { data: entries = [] } = useCounterEntries(counter.id);
  return <CounterCard counter={counter} entries={entries} />;
}

export function CountersPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: counters = [], isLoading } = useCounters();

  if (isLoading) return <div className="text-slate-400">Loading habits…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Habits</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + New Habit
        </button>
      </div>
      {counters.length === 0 ? (
        <div className="text-center text-slate-400 mt-16">
          No habits yet. Create your first!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counters.map((c) => (
            <CounterCardLoader key={c.id} counter={c} />
          ))}
        </div>
      )}
      {showModal && <AddCounterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

**Step 4: CounterDetailPage**

```tsx
// src/pages/CounterDetailPage.tsx
import { useParams, Link } from "react-router-dom";
import { useCounters } from "../hooks/useCounters";
import { useCounterEntries } from "../hooks/useCounterEntries";
import { computeCurrentStreak, computeLongestStreak } from "../lib/streakUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "../lib/dateUtils";

export function CounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: counters = [] } = useCounters();
  const { data: entries = [] } = useCounterEntries(id!);
  const counter = counters.find((c) => c.id === id);

  if (!counter) return <div className="text-slate-400">Habit not found.</div>;

  const entryDates = entries.map((e) => e.entry_date);
  const currentStreak = computeCurrentStreak(entryDates);
  const longestStreak = computeLongestStreak(entryDates);
  const totalDays = entryDates.length;

  // Last 7 days chart data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split("T")[0];
    return { date: formatDate(iso), checked: entryDates.includes(iso) ? 1 : 0 };
  });

  return (
    <div className="max-w-xl">
      <Link
        to="/counters"
        className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600"
      >
        ← Back
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">
        {counter.icon} {counter.name}
      </h1>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Current streak", value: `${currentStreak} 🔥` },
          { label: "Longest streak", value: `${longestStreak} 🏆` },
          { label: "Total days", value: `${totalDays} ✅` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-center"
          >
            <div className="text-xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-4 text-sm font-semibold text-slate-600">
          Last 7 Days
        </h2>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={last7}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis hide domain={[0, 1]} />
            <Tooltip />
            <Bar dataKey="checked" fill={counter.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/
git commit -m "feat(counters): CounterCard, AddCounterModal, CountersPage, CounterDetailPage"
```

---

## Phase 4 — Tasks

### Task 8: Task hooks + TasksPage

**Files:**

- Create: `src/hooks/useTasks.ts`
- Create: `src/pages/TasksPage.tsx`
- Create: `src/components/TaskItem.tsx`
- Create: `src/components/QuickAddTask.tsx`

**Step 1: Task hooks**

```ts
// src/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Task } from "../lib/types";

export function useTasks(date: string) {
  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("task_date", date)
        .order("sort_order");
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      task_date,
    }: Pick<Task, "title" | "task_date">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ title, task_date, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) =>
      qc.invalidateQueries({ queryKey: ["tasks", task.task_date] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      completed,
      task_date,
    }: Pick<Task, "id" | "completed" | "task_date">) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.task_date] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_date }: Pick<Task, "id" | "task_date">) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return task_date;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.task_date] }),
  });
}
```

**Step 2: TaskItem**

```tsx
// src/components/TaskItem.tsx
import type { Task } from "../lib/types";
import { useToggleTask, useDeleteTask } from "../hooks/useTasks";

export function TaskItem({ task }: { task: Task }) {
  const toggle = useToggleTask();
  const del = useDeleteTask();

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 group">
      <button
        onClick={() =>
          toggle.mutate({
            id: task.id,
            completed: task.completed,
            task_date: task.task_date,
          })
        }
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.completed
            ? "border-green-500 bg-green-500"
            : "border-slate-300 hover:border-indigo-400"
        }`}
      >
        {task.completed && <span className="text-white text-xs">✓</span>}
      </button>
      <span
        className={`flex-1 text-sm ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}
      >
        {task.title}
      </span>
      <button
        onClick={() => del.mutate({ id: task.id, task_date: task.task_date })}
        className="hidden text-slate-300 hover:text-red-400 group-hover:block"
        aria-label="Delete task"
      >
        ×
      </button>
    </div>
  );
}
```

**Step 3: QuickAddTask**

```tsx
// src/components/QuickAddTask.tsx
import { useState } from "react";
import { useCreateTask } from "../hooks/useTasks";
import { todayISO } from "../lib/dateUtils";

interface Props {
  date?: string;
}

export function QuickAddTask({ date = todayISO() }: Props) {
  const [title, setTitle] = useState("");
  const create = useCreateTask();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({ title: title.trim(), task_date: date });
    setTitle("");
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <button
        type="submit"
        disabled={!title.trim() || create.isPending}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
```

**Step 4: TasksPage**

```tsx
// src/pages/TasksPage.tsx
import { useState } from "react";
import { useTasks } from "../hooks/useTasks";
import { TaskItem } from "../components/TaskItem";
import { QuickAddTask } from "../components/QuickAddTask";
import { todayISO, formatDate } from "../lib/dateUtils";

export function TasksPage() {
  const [date, setDate] = useState(todayISO());
  const { data: tasks = [], isLoading } = useTasks(date);
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tasks</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      {tasks.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-500">
            {done}/{tasks.length} done
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2">
        {isLoading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            No tasks for {formatDate(date)}
          </div>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} />)
        )}
      </div>

      <QuickAddTask date={date} />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/
git commit -m "feat(tasks): task hooks, TaskItem, QuickAddTask, TasksPage"
```

---

## Phase 5 — Reminders

### Task 9: Reminders hooks + page

**Files:**

- Create: `src/hooks/useReminders.ts`
- Create: `src/pages/RemindersPage.tsx`
- Create: `src/components/AddReminderModal.tsx`
- Create: `src/components/ReminderCard.tsx`

**Step 1: Reminder hooks**

```ts
// src/hooks/useReminders.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Reminder } from "../lib/types";

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return data as Reminder[];
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<Reminder, "text" | "schedule_type" | "weekdays">,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("reminders")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useTodayReminders() {
  const dayOfWeek = new Date().getDay(); // 0 = Sun
  return useQuery({
    queryKey: ["reminders", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      const all = data as Reminder[];
      return all.filter((r) => {
        if (r.schedule_type === "daily") return true;
        if (r.schedule_type === "weekly" && r.weekdays)
          return r.weekdays.includes(dayOfWeek);
        return false;
      });
    },
  });
}
```

**Step 2: AddReminderModal**

```tsx
// src/components/AddReminderModal.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateReminder } from "../hooks/useReminders";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const schema = z.object({
  text: z.string().min(1, "Text required"),
  schedule_type: z.enum(["daily", "weekly"]).default("daily"),
  weekdays: z.array(z.number()).optional(),
});
type FormInput = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export function AddReminderModal({ onClose }: Props) {
  const create = useCreateReminder();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { schedule_type: "daily", weekdays: [] },
  });
  const schedType = watch("schedule_type");
  const weekdays = watch("weekdays") ?? [];

  const toggleDay = (d: number) => {
    const next = weekdays.includes(d)
      ? weekdays.filter((x) => x !== d)
      : [...weekdays, d];
    setValue("weekdays", next);
  };

  const onSubmit = async (data: FormInput) => {
    await create.mutateAsync({
      text: data.text,
      schedule_type: data.schedule_type,
      weekdays: data.weekdays ?? null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          New Reminder
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input
            {...register("text")}
            placeholder="Reminder text"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          {errors.text && (
            <p className="text-xs text-red-500">{errors.text.message}</p>
          )}

          <div className="flex gap-2">
            {(["daily", "weekly"] as const).map((t) => (
              <label
                key={t}
                className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer"
              >
                <input
                  {...register("schedule_type")}
                  type="radio"
                  value={t}
                  className="accent-indigo-600"
                />{" "}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>

          {schedType === "weekly" && (
            <div className="flex gap-1 flex-wrap">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${weekdays.includes(i) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: ReminderCard**

```tsx
// src/components/ReminderCard.tsx
import type { Reminder } from "../lib/types";
import { useDeleteReminder } from "../hooks/useReminders";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const del = useDeleteReminder();
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
      <div>
        <p className="text-sm font-medium text-slate-700">🔔 {reminder.text}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {reminder.schedule_type === "daily"
            ? "Every day"
            : `Weekly: ${(reminder.weekdays ?? []).map((d) => DAYS[d]).join(", ")}`}
        </p>
      </div>
      <button
        onClick={() => del.mutate(reminder.id)}
        className="text-slate-300 hover:text-red-400 ml-4"
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}
```

**Step 4: RemindersPage**

```tsx
// src/pages/RemindersPage.tsx
import { useState } from "react";
import { useReminders } from "../hooks/useReminders";
import { ReminderCard } from "../components/ReminderCard";
import { AddReminderModal } from "../components/AddReminderModal";

export function RemindersPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: reminders = [], isLoading } = useReminders();

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reminders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Add
        </button>
      </div>
      {isLoading ? (
        <div className="text-slate-400">Loading…</div>
      ) : reminders.length === 0 ? (
        <div className="text-center text-slate-400 mt-16">
          No reminders yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </div>
      )}
      {showModal && <AddReminderModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/
git commit -m "feat(reminders): reminder hooks, ReminderCard, AddReminderModal, RemindersPage"
```

---

## Phase 6 — Today Dashboard + Settings + Netlify

### Task 10: Today Dashboard

**Files:**

- Create: `src/pages/TodayDashboard.tsx`

```tsx
// src/pages/TodayDashboard.tsx
import { useCounters } from "../hooks/useCounters";
import { useCounterEntries } from "../hooks/useCounterEntries";
import { useTasks } from "../hooks/useTasks";
import { useTodayReminders } from "../hooks/useReminders";
import { useAuthStore } from "../stores/authStore";
import { CounterCard } from "../components/CounterCard";
import { TaskItem } from "../components/TaskItem";
import { QuickAddTask } from "../components/QuickAddTask";
import { todayISO } from "../lib/dateUtils";
import type { Counter } from "../lib/types";

function TodayCounterCard({ counter }: { counter: Counter }) {
  const { data: entries = [] } = useCounterEntries(counter.id, 30);
  return <CounterCard counter={counter} entries={entries} />;
}

export function TodayDashboard() {
  const { user } = useAuthStore();
  const today = todayISO();
  const { data: counters = [] } = useCounters();
  const { data: tasks = [] } = useTasks(today);
  const { data: reminders = [] } = useTodayReminders();

  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "🌅 Good morning";
    if (h < 17) return "☀️ Good afternoon";
    return "🌙 Good evening";
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {greet()}
          {user?.email ? `, ${user.email.split("@")[0]}` : ""}!
        </h1>
        <p className="text-sm text-slate-400">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Habits */}
      {counters.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today's Habits
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {counters.slice(0, 6).map((c) => (
              <TodayCounterCard key={c.id} counter={c} />
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today's Tasks
          </h2>
          {tasks.length > 0 && (
            <span className="text-sm text-slate-500">
              {done}/{tasks.length} — {pct}%
            </span>
          )}
        </div>
        {tasks.length > 0 && (
          <div className="mb-2 h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className="flex flex-col gap-2 mb-3">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
        <QuickAddTask date={today} />
      </section>

      {/* Reminders */}
      {reminders.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Reminders
          </h2>
          <div className="flex flex-col gap-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100"
              >
                🔔 {r.text}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/TodayDashboard.tsx
git commit -m "feat(today): Today dashboard with habits, tasks, reminders"
```

---

### Task 11: Settings page + Netlify config

**Files:**

- Create: `src/pages/SettingsPage.tsx`
- Create: `netlify.toml`
- Create: `public/_redirects`

**Step 1: SettingsPage**

```tsx
// src/pages/SettingsPage.tsx
import { useAuthStore } from "../stores/authStore";

export function SettingsPage() {
  const { user } = useAuthStore();
  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Settings</h1>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-500">Signed in as</p>
        <p className="font-medium text-slate-800">{user?.email}</p>
      </div>
    </div>
  );
}
```

**Step 2: netlify.toml**

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
```

**Step 3: SPA redirect**

```
# public/_redirects
/*  /index.html  200
```

**Step 4: Final commit**

```bash
git add src/pages/SettingsPage.tsx netlify.toml public/_redirects
git commit -m "feat: settings page + Netlify config + CSP headers"
```

---

## Acceptance Criteria Checklist (per phase)

### Phase 1 — Auth & Scaffold

- [ ] `npm run dev` starts without errors
- [ ] `/login` renders with email/password form
- [ ] `/signup` creates a Supabase account and redirects to `/today`
- [ ] `/today` redirects to `/login` when unauthenticated
- [ ] RLS verified: querying `counters` as another user returns no rows

### Phase 2 — Counters

- [ ] User can create a counter with name + optional icon/color
- [ ] Counter card shows current streak
- [ ] Clicking "Check in" logs today's entry (idempotent — second click does nothing)
- [ ] Counter detail shows current streak, longest streak, total days, 7-day chart
- [ ] Streak unit tests pass: `npm run test`

### Phase 3 — Tasks

- [ ] Tasks are scoped to a specific date
- [ ] Adding a task appears instantly (optimistic or refetch)
- [ ] Completing a task shows strikethrough + progress bar updates
- [ ] Deleting a task removes it from the list

### Phase 4 — Reminders

- [ ] Creating a daily reminder shows it every day on `/today`
- [ ] Creating a weekly reminder shows only on selected weekdays
- [ ] Removing a reminder hides it

### Phase 5 — Deployment

- [ ] `npm run build` exits 0
- [ ] Netlify deploy succeeds with env vars set
- [ ] App is accessible at production URL
- [ ] No `VITE_SERVICE_ROLE` variable exists anywhere
- [ ] CSP header is present on all pages

---

## v1 Features (post-MVP)

| Feature                                     | Complexity | Notes                                |
| ------------------------------------------- | ---------- | ------------------------------------ |
| Monthly calendar heatmap                    | Low        | Use existing entries data            |
| Browser push notifications (Service Worker) | Medium     | `Notification` API, no server needed |
| Drag-to-reorder tasks                       | Medium     | `@dnd-kit/core`                      |
| OAuth (Google) login                        | Low        | Supabase dashboard toggle            |
| Weekly/monthly trend charts                 | Medium     | Recharts + existing entry data       |
| Dark mode                                   | Low        | Tailwind `dark:` classes             |
| Export data (CSV)                           | Low        | Client-side CSV generation           |
| Offline mode (service worker cache)         | High       | `vite-plugin-pwa`                    |
