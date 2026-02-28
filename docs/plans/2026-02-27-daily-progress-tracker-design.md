# Daily Progress Tracker — Design Document

> **Skills applied:** `brainstorming` · `writing-plans` · `test-driven-development` · `verification-before-completion` · `finishing-a-development-branch`

---

## 1. Project Summary

**Goal:** A fully responsive, minimalist web app for tracking daily habits (counters/streaks), reminders, and tasks — deployed on Netlify, backed by Supabase, zero custom backend.

**Assumptions made (no backend server):**

- Push notifications replaced by: in-app toast alerts on page load + a visible "Reminders" calendar view.
- Email reminders replaced by: Supabase scheduled functions (Edge Functions on free tier) — one `cron` edge function per user is not feasible without a backend; instead, use browser `Notification API` with a Service Worker for optional local push (no server required).
- Service-role key never leaves Netlify's server-side env (only `VITE_SUPABASE_ANON_KEY` is shipped to the client).

---

## 2. Architecture

```
Browser (React + TypeScript + Tailwind CSS v4)
   │
   ├── React Router v6  (client-side routing, protected routes)
   ├── Zustand          (lightweight global state: auth, today-data)
   ├── TanStack Query   (server-state cache: counters, tasks, reminders)
   │
   └── Supabase JS SDK
          ├── Auth  (email/password + optional Google OAuth)
          ├── DB    (PostgreSQL via PostgREST, RLS enforced)
          └── Realtime (optional: live task updates)

Netlify
   ├── Static hosting  (Vite build → dist/)
   ├── _redirects      (SPA fallback)
   └── Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
```

**No custom server. No serverless functions needed for MVP.**

---

## 3. Routes

| Path            | Component           | Auth required |
| --------------- | ------------------- | ------------- |
| `/`             | Redirect → `/today` | Yes           |
| `/login`        | `LoginPage`         | No            |
| `/signup`       | `SignupPage`        | No            |
| `/today`        | `TodayDashboard`    | Yes           |
| `/counters`     | `CountersPage`      | Yes           |
| `/counters/:id` | `CounterDetailPage` | Yes           |
| `/tasks`        | `TasksPage`         | Yes           |
| `/reminders`    | `RemindersPage`     | Yes           |
| `/settings`     | `SettingsPage`      | Yes           |
| `*`             | `NotFound`          | No            |

---

## 4. State Strategy

| Concern                                  | Tool                | Reason                                          |
| ---------------------------------------- | ------------------- | ----------------------------------------------- |
| Auth session                             | Zustand (persisted) | Needed synchronously on route guard             |
| Server data (counters, tasks, reminders) | TanStack Query      | Caching, background refetch, optimistic updates |
| Form state                               | React Hook Form     | Validated forms without boilerplate             |
| UI-only state (modals, active tab)       | Local `useState`    | No over-engineering                             |

---

## 5. Database Design

### 5.1 Tables

#### `profiles`

| Column         | Type          | Notes                       |
| -------------- | ------------- | --------------------------- |
| `id`           | `uuid` PK     | References `auth.users(id)` |
| `display_name` | `text`        |                             |
| `avatar_url`   | `text`        | nullable                    |
| `timezone`     | `text`        | default `'UTC'`             |
| `created_at`   | `timestamptz` | `now()`                     |

#### `counters`

| Column         | Type                     | Notes                           |
| -------------- | ------------------------ | ------------------------------- |
| `id`           | `uuid` PK                | `gen_random_uuid()`             |
| `user_id`      | `uuid` FK → `auth.users` | NOT NULL                        |
| `name`         | `text`                   | NOT NULL                        |
| `icon`         | `text`                   | emoji or icon name, nullable    |
| `color`        | `text`                   | hex string, default `'#6366f1'` |
| `target_type`  | `text`                   | `'daily'` \| `'weekly'`         |
| `target_value` | `int`                    | default `1`                     |
| `archived`     | `bool`                   | default `false`                 |
| `created_at`   | `timestamptz`            | `now()`                         |

#### `counter_entries`

| Column       | Type                     | Notes                      |
| ------------ | ------------------------ | -------------------------- |
| `id`         | `uuid` PK                |                            |
| `counter_id` | `uuid` FK → `counters`   | NOT NULL                   |
| `user_id`    | `uuid` FK → `auth.users` | NOT NULL (denorm for RLS)  |
| `entry_date` | `date`                   | NOT NULL                   |
| `value`      | `int`                    | default `1`                |
| `created_at` | `timestamptz`            | `now()`                    |
| —            | UNIQUE                   | `(counter_id, entry_date)` |

#### `tasks`

| Column         | Type                     | Notes                    |
| -------------- | ------------------------ | ------------------------ |
| `id`           | `uuid` PK                |                          |
| `user_id`      | `uuid` FK → `auth.users` | NOT NULL                 |
| `title`        | `text`                   | NOT NULL                 |
| `task_date`    | `date`                   | NOT NULL (default today) |
| `completed`    | `bool`                   | default `false`          |
| `completed_at` | `timestamptz`            | nullable                 |
| `sort_order`   | `int`                    | for manual ordering      |
| `created_at`   | `timestamptz`            | `now()`                  |

#### `reminders`

| Column          | Type                     | Notes                         |
| --------------- | ------------------------ | ----------------------------- |
| `id`            | `uuid` PK                |                               |
| `user_id`       | `uuid` FK → `auth.users` | NOT NULL                      |
| `text`          | `text`                   | NOT NULL                      |
| `schedule_type` | `text`                   | `'daily'` \| `'weekly'`       |
| `weekdays`      | `int[]`                  | 0=Sun…6=Sat; null = every day |
| `active`        | `bool`                   | default `true`                |
| `created_at`    | `timestamptz`            | `now()`                       |

### 5.2 Indexes

```sql
CREATE INDEX idx_counter_entries_user_date ON counter_entries (user_id, entry_date);
CREATE INDEX idx_tasks_user_date ON tasks (user_id, task_date);
CREATE INDEX idx_counters_user ON counters (user_id) WHERE NOT archived;
```

### 5.3 Streak Calculation (client-side)

Streak is computed from `counter_entries` sorted by `entry_date DESC` — no stored procedure needed for MVP.

```ts
function computeStreak(dates: string[]): number {
  const sorted = [...dates].sort().reverse(); // newest first
  let streak = 0;
  let expected = today();
  for (const d of sorted) {
    if (d === expected) {
      streak++;
      expected = prevDay(expected);
    } else break;
  }
  return streak;
}
```

---

## 6. RLS Policy Plan

All tables use Row Level Security. The pattern is identical across tables:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "users read own" ON <table>
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT
CREATE POLICY "users insert own" ON <table>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "users update own" ON <table>
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE
CREATE POLICY "users delete own" ON <table>
  FOR DELETE USING (auth.uid() = user_id);
```

`profiles` is special — `id = auth.uid()` instead of `user_id = auth.uid()`.

---

## 7. Security Checklist (Netlify + Supabase)

- [ ] `VITE_SUPABASE_ANON_KEY` is the **anon** public key only — safe to expose to browser.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **never** set as a `VITE_` variable. It must NOT appear in any client bundle.
- [ ] All Netlify env vars prefixed `VITE_` are in `.env.local` locally and in Netlify UI's "Environment variables" section (not committed to git).
- [ ] `.env.local` is in `.gitignore`.
- [ ] RLS is enabled on **every** table — verify with `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- [ ] No table has a permissive `FOR ALL USING (true)` policy.
- [ ] `auth.users` is never directly exposed; only `profiles` (with RLS) is.
- [ ] Supabase "Allow new users to sign up" setting controlled via dashboard.
- [ ] Content Security Policy header set in `netlify.toml`.
- [ ] OAuth redirect URL whitelist contains only production + localhost domains.

---

## 8. Component Hierarchy

```
App
├── AuthProvider          (Zustand + Supabase onAuthStateChange)
├── Router
│   ├── ProtectedRoute    (redirects to /login if no session)
│   └── Layout            (Sidebar + TopBar + <Outlet />)
│       ├── TodayDashboard
│       │   ├── QuickAddTask
│       │   ├── TodayTaskList
│       │   ├── TodayCounterGrid
│       │   └── TodayReminders
│       ├── CountersPage
│       │   ├── CounterCard (streak, check-in button)
│       │   └── AddCounterModal
│       ├── CounterDetailPage
│       │   ├── StreakStats
│       │   └── ProgressChart (recharts)
│       ├── TasksPage
│       │   ├── DatePicker (navigate between days)
│       │   └── TaskList
│       ├── RemindersPage
│       │   ├── ReminderCard
│       │   └── AddReminderModal
│       └── SettingsPage
│           └── ProfileForm
├── LoginPage
└── SignupPage
```

---

## 9. UI Wireframe Descriptions

### Today Dashboard (`/today`)

```
┌─────────────────────────────────────────────────────────┐
│  🌅 Good morning, Ahmed!   Thu 27 Feb          [+] Quick Add │
├──────────────┬──────────────────────────────────────────┤
│  Sidebar     │  TODAY'S HABITS                          │
│  ─ Today     │  ┌────────┐ ┌────────┐ ┌────────┐       │
│  ─ Counters  │  │🥦 No   │ │🏋️Gym  │ │📖 Read│       │
│  ─ Tasks     │  │junk    │ │ 12 🔥  │ │  5 🔥  │       │
│  ─ Reminders │  │ 8 🔥   │ │ [✓ Done]│ │[Check]│       │
│  ─ Settings  │  └────────┘ └────────┘ └────────┘       │
│              │                                          │
│              │  TODAY'S TASKS  ──────── 3/5 complete   │
│              │  ☑ Buy groceries                         │
│              │  ☑ Call dentist                          │
│              │  ☐ Read 20 pages          [+ Add task]   │
│              │                                          │
│              │  REMINDERS                               │
│              │  🔔 Read a dua every day                  │
└──────────────┴──────────────────────────────────────────┘
```

### Counter Detail (`/counters/:id`)

```
┌──────────────────────────────────────────┐
│  ← Back    🥦 No Junk Food               │
│            Current streak: 8 🔥          │
│  ┌────────────┬────────────┬───────────┐ │
│  │ 8 days     │ 22 days    │ 47 days   │ │
│  │ Current    │ Longest    │ Total     │ │
│  └────────────┴────────────┴───────────┘ │
│                                          │
│  [Weekly] [Monthly]                      │
│  ████████░░░░░░░  (bar chart)            │
│                                          │
│  Calendar heatmap (last 3 months)        │
└──────────────────────────────────────────┘
```

### Reminders Page (`/reminders`)

```
┌──────────────────────────────────────────┐
│  Reminders              [+ Add Reminder] │
│  ─────────────────────────────────────── │
│  🔔 Read a dua every day   Daily  [⋮]    │
│  🔔 Call mom               Weekly [⋮]    │
│  🔔 Journal before sleep   Daily  [⋮]    │
└──────────────────────────────────────────┘
```

---

## 10. Tech Stack Decisions

| Choice                    | Rationale                                      |
| ------------------------- | ---------------------------------------------- |
| Vite + React + TypeScript | Fast builds, type safety, ecosystem            |
| Tailwind CSS v4           | Utility-first, no runtime CSS-in-JS overhead   |
| TanStack Query v5         | Best-in-class server state, optimistic updates |
| Zustand                   | Tiny auth store (< 1 KB), no boilerplate       |
| React Hook Form + Zod     | Type-safe forms, runtime validation            |
| Recharts                  | Lightweight charting for streak graphs         |
| React Router v6           | File-based mental model, nested routes         |
| Supabase JS v2            | Official client, RLS, realtime                 |

---

_Design approved. See `2026-02-27-daily-progress-tracker-plan.md` for implementation plan._
