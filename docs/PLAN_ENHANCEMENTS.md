# Daily Progress Tracker — Enhancement Plan

> **File:** `docs/PLAN_ENHANCEMENTS.md`  
> **Author:** Lead Engineer  
> **Date:** 2026-02-28  
> **Status:** Implementation-Ready  
> **Scope:** Five targeted enhancements to the MVP: timezone-aware counters, mobile nav, calendar view, enriched reminders, and global consistency/performance improvements.

---

## Current-State Assumptions

### ✅ Already Implemented

- Vite + React + TypeScript + Tailwind CSS v4 scaffold
- Supabase client (`src/lib/supabase.ts`), Zustand auth store (`src/stores/authStore.ts`)
- Full routing: `/today`, `/counters`, `/counters/:id`, `/tasks`, `/reminders`, `/settings`, `/login`, `/signup`
- DB schema: `profiles`, `counters`, `counter_entries`, `tasks`, `reminders` with RLS policies in `002_rls_policies.sql`
- All core hooks: `useCounters`, `useCounterEntries`, `useTasks`, `useReminders`, `useTodayReminders`
- `CounterCard`, `CounterDetailPage` with Recharts 7-day bar chart
- `TaskItem`, `QuickAddTask`, `TasksPage` with date picker and progress bar
- `ReminderCard`, `AddReminderModal`, `RemindersPage`
- `TodayDashboard` aggregating habits + tasks + reminders
- `Layout` with sidebar (desktop only, no mobile nav)
- `netlify.toml` with CSP headers, `public/_redirects` SPA fallback
- Streak utils: `computeCurrentStreak`, `computeLongestStreak`
- Stats utils: `computeCompletionRate`, `filterRemindersDueToday` (with `Africa/Tunis` timezone)

### ❌ Not Yet Implemented (this plan)

- Timezone-aware day boundary for `entry_date` (currently uses UTC `new Date().toISOString()`)
- Optimistic UI for counter check-in (currently invalidates + refetches)
- Per-counter progress bar / % completion indicator
- Mobile hamburger menu (sidebar is `hidden md:flex` — no mobile nav exists)
- Calendar view at `/calendar`
- `description` field on `reminders`
- Scheduled time + recurring rules on `reminders`
- In-app notification/toast trigger at scheduled time
- Idempotent upsert conflict handling with error recovery
- Page transitions
- Supabase Realtime subscriptions

---

## Goals & Non-Goals

### Goals

- Fix the timezone day-boundary bug so entries are attributed to the correct local date.
- Guarantee UI shows real stored values immediately (optimistic + reconcile).
- Ship a fully working mobile nav with focus trap and scroll lock.
- Add `/calendar` with color-coded task completion per day.
- Enrich reminders: add `description`, scheduled time, recurring, and in-app toast.
- Improve consistency: idempotent writes, clear conflict resolution, and Realtime where justified.

### Non-Goals

- No custom backend server — all logic stays client-side + Supabase.
- No native push notifications requiring a server (Web Push with VAPID is out of scope; document why).
- No email reminders via service-role key on the client.
- No offline/PWA cache in this plan (noted as v2).
- No drag-to-reorder tasks (v2).

---

## Product Requirements

### Feature 1 — Counter Automation & Progress Visibility

#### PR-1.1 Timezone-aware day boundary

- **Rule:** Use `Intl.DateTimeFormat` with timezone `Africa/Tunis` (UTC+1, no DST) to derive the current local date string `YYYY-MM-DD` for every `entry_date` write.
- A check-in at `23:59:00 Africa/Tunis` → `entry_date = T`
- A check-in at `00:01:00 Africa/Tunis` → `entry_date = T+1`
- The `profiles.timezone` column stores the user's timezone; default `Africa/Tunis`.
- **Source of truth:** the date derived client-side from the user's stored timezone. Never use `new Date().toISOString().split('T')[0]` (this is UTC).

**Acceptance criteria:**

- [ ] Logging a counter at 23:59 local and 00:01 local produces two distinct rows in `counter_entries`.
- [ ] Unit test: `localDateISO('Africa/Tunis')` returns correct date across both sides of midnight.

#### PR-1.2 Optimistic UI for counter check-in

- On `checkIn.mutate()`: immediately insert an optimistic `CounterEntry` into the TanStack Query cache.
- On `onError`: roll back the optimistic entry and show an error toast.
- On `onSettled`: run `invalidateQueries` to reconcile with server.

**Acceptance criteria:**

- [ ] Streak number increments immediately on tap, before the Supabase response.
- [ ] If the network fails, the UI reverts to the pre-tap state within 2 seconds.
- [ ] After sync, the stored DB value matches the displayed value.

#### PR-1.3 Per-counter progress indicator

- Add a progress bar and `% complete` label to `CounterCard`.
- **% formula for `target_type = 'daily'`:**  
  `% = checkedToday ? 100 : 0`  
  (Daily counters are binary: done or not done.)
- **% formula for `target_type = 'weekly'`:**  
  `% = floor((entriesThisWeek / target_value) * 100)`, capped at 100.
- Display states:
  - `empty` (0%): grey progress bar, "Not started"
  - `partial` (1–99%): indigo bar, `{n}% done`
  - `completed` (100%): green bar, "✓ Complete"
  - `loading`: skeleton bar (pulse animation)
  - `error`: red outline on card, "Sync error — tap to retry"

**Acceptance criteria:**

- [ ] Daily counter shows 0% before check-in, 100% after.
- [ ] Weekly counter with target=3 and 2 entries shows 66%.
- [ ] Error state renders when check-in mutation errors.

---

### Feature 2 — Mobile Responsiveness

#### PR-2.1 Hamburger menu

- Under `md` breakpoint (< 768 px): sidebar is hidden; a hamburger icon (`☰`) appears in a top bar.
- Tapping hamburger opens a full-height drawer that slides in from the left.
- Drawer behavior:
  - Scroll lock on `<body>` while open (`overflow-hidden`).
  - Focus trap: first focusable element receives focus on open; Tab cycles within drawer; Escape closes.
  - Backdrop overlay (`bg-black/40`) closes drawer on click.
  - Nav link click closes drawer.
  - All ARIA: `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation"`.
- Touch targets: all nav items ≥ 48×48 px tap area (use `min-h-12 py-3`).

**Acceptance criteria:**

- [ ] All pages usable at 360×640 (Galaxy S8) and 390×844 (iPhone 14).
- [ ] Hamburger, drawer open/close, and focus trap work reliably on iOS Safari and Android Chrome.
- [ ] No horizontal scroll on any page at 360 px width.
- [ ] Escape key closes drawer; body scroll re-enabled after close.

#### PR-2.2 Layout constraints

- Main content `max-w-3xl mx-auto` with `px-4` on mobile, `px-8` on `md+`.
- Cards stack to 1 column on mobile, 2 on `sm`, 3 on `lg`.
- Modals: full-screen on mobile (`inset-0`), centered card on `md+` (max-w-sm).
- Input fields: full-width on mobile.

**Testing matrix:**

| Device          | Width | Expected |
| --------------- | ----- | -------- |
| Galaxy S8       | 360   | Pass     |
| iPhone SE       | 375   | Pass     |
| iPhone 14       | 390   | Pass     |
| iPad (portrait) | 768   | Pass     |
| Desktop 1080p   | 1920  | Pass     |

---

### Feature 3 — Calendar View for Task Visualization

#### PR-3.1 Route and screen

- Add `/calendar` to the router and nav sidebar.
- Month view: 7-column grid, rows = weeks of the displayed month.
- Navigation: `< Prev` / `Next >` buttons and a month/year display.
- Default: current month.

#### PR-3.2 Day color coding

Color is computed from the task completion ratio for that calendar day:

| Ratio                       | Color               | Tailwind class          | Condition                                  |
| --------------------------- | ------------------- | ----------------------- | ------------------------------------------ |
| No tasks (or no data)       | None (neutral grey) | `bg-slate-100`          | `total === 0`                              |
| 0% (tasks exist, none done) | 🔴 Red              | `bg-red-400`            | `ratio === 0 && total > 0`                 |
| 1–50%                       | 🟠 Orange           | `bg-orange-400`         | `ratio > 0 && ratio <= 0.5`                |
| >50–99%                     | 🟣 Purple           | `bg-purple-500`         | `ratio > 0.5 && ratio < 1`                 |
| 100%                        | 🔵 Blue             | `bg-blue-500`           | `ratio === 1`                              |
| Today (overlay)             | 🟢 Green outline    | `ring-2 ring-green-500` | `date === today` — applied on top of color |

- "Daily tasks" definition: all tasks with `task_date = that date`, regardless of when they were created or whether they're repeating. One-off tasks created mid-day count for that day. No "repeating tasks" concept exists in the current schema.

#### PR-3.3 Required queries

- **Aggregate query (month load):** Fetch all tasks for the month with a single query:

  ```sql
  SELECT task_date, COUNT(*) AS total,
    SUM(CASE WHEN completed THEN 1 ELSE 0 END) AS done
  FROM tasks
  WHERE user_id = auth.uid()
    AND task_date >= '{month_start}'
    AND task_date <= '{month_end}'
  GROUP BY task_date;
  ```

  Implemented via Supabase JS with `.select('task_date, completed')` + client-side group-by (no raw SQL needed; PostgREST doesn't support GROUP BY — use `select('*')` + JS reduce).

- **Day detail query (on day click):** Fetch full task rows for that date:
  ```ts
  supabase.from("tasks").select("*").eq("task_date", date).order("sort_order");
  ```

#### PR-3.4 Day detail modal

- Clicking a day opens a modal (not a new route) showing:
  - Date header
  - Task completion ratio + progress bar
  - List of tasks with their completed status (read-only in modal, with a link to full TasksPage for that date)
  - Close button + backdrop click

**Acceptance criteria:**

- [ ] Calendar renders all months including Feb (28 days) and months starting on any weekday.
- [ ] Color-coding matches stored data within 1 refetch cycle.
- [ ] Day detail modal opens on click and closes on backdrop/Escape.
- [ ] Today is always visually distinct (green ring).

---

### Feature 4 — Enhanced Reminders System

#### PR-4.1 Schema additions

New columns on `reminders`:

| Column            | Type          | Notes                                                      |
| ----------------- | ------------- | ---------------------------------------------------------- |
| `description`     | `text`        | nullable, max 500 chars                                    |
| `remind_at`       | `time`        | `HH:MM` 24h local time, nullable (null = no time trigger)  |
| `recurrence`      | `text`        | `'once' \| 'daily' \| 'weekly'` — replaces `schedule_type` |
| `next_occurrence` | `timestamptz` | computed client-side, stored for sorting; nullable         |

**Decision:** keep `schedule_type` and `weekdays` existing columns; add new columns alongside. Migrate `schedule_type` values to `recurrence` values in migration. This avoids breaking existing queries until a cleanup migration.

#### PR-4.2 Notification approach

**Decision: Option A (in-app) — chosen. Justification below.**

| Option                            | Verdict                     | Reason                                                                                                                               |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A — In-app toast when app is open | ✅ **Use this**             | Zero backend, zero secrets, works reliably when app is active                                                                        |
| B — Web Push (VAPID)              | ❌ Skip for now             | Requires a server to sign push payloads (VAPID private key cannot be in the browser bundle); no Netlify Functions scope in this plan |
| C — Email via Supabase            | ❌ Not feasible client-side | Sending email requires the service-role key or an Edge Function; client cannot call Supabase SMTP directly                           |

**In-app mechanism:**

1. On app mount (in `AuthProvider`), start a `setInterval` that runs every 60 seconds.
2. Compute "is any reminder due now?" by comparing `remind_at` (in user's timezone) to current local time (± 2-minute window to avoid missing a tick).
3. If due and not already fired in this session (track in `useRef` or `sessionStorage`), show a toast notification.
4. "Upcoming" list on the Reminders page: sort by `next_occurrence ASC`, show within the next 24 hours.

**Next occurrence computation (client-side):**

```ts
function computeNextOccurrence(reminder: Reminder, tz: string): Date | null {
  if (!reminder.remind_at) return null;
  const [h, m] = reminder.remind_at.split(":").map(Number);
  const now = new Date();
  // Get today at remind_at in user's tz
  const candidate = new Date(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now) +
      `T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
  );
  if (candidate <= now) {
    // Already passed today — compute next valid day
    if (reminder.recurrence === "once") return null; // expired
    if (reminder.recurrence === "daily") {
      candidate.setDate(candidate.getDate() + 1);
    }
    if (reminder.recurrence === "weekly" && reminder.weekdays?.length) {
      // advance to next matching weekday
      for (let i = 1; i <= 7; i++) {
        candidate.setDate(candidate.getDate() + 1);
        if (reminder.weekdays.includes(candidate.getDay())) break;
      }
    }
  }
  return candidate;
}
```

**Acceptance criteria:**

- [ ] User can create/edit/delete reminders with a `description` field.
- [ ] Reminder with `remind_at = HH:MM` shows a toast when the app is open and the clock hits that time (within ±2 min).
- [ ] Recurring reminders show correct `next_occurrence`.
- [ ] Reminders list shows: title, description (truncated to 1 line), next trigger time.
- [ ] Expired `once` reminders are hidden from the active list.

---

### Feature 5 — Additional Optimizations

#### PR-5.1 Persistence & idempotent writes

- Counter check-in: `upsert({ counter_id, user_id, entry_date }, { onConflict: 'counter_id,entry_date' })` — already in code; add `ignoreDuplicates: false` to update `value` if called again (increment, not replace).
- Task create: plain `insert`; duplicate prevention is UI-level (disable "Add" button while `isPending`).
- On network error: TanStack Query `retry: 1` with `retryDelay: 1000` for mutations.
- **Conflict resolution:** Supabase (PostgreSQL) is the single source of truth. Client cache is always a projection. After any error, `invalidateQueries` pulls fresh data.

#### PR-5.2 Page transitions

- Use CSS `transition` + `opacity`/`translate` via a lightweight wrapper — no external animation lib.
- Pattern: wrap `<Outlet />` with a `<PageTransition>` component that applies `animate-fadeSlideIn` on mount.
- Tailwind keyframe (in `index.css`):
  ```css
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-slide-in {
    animation: fadeSlideIn 180ms ease-out;
  }
  ```
- Applied via React key change on route (`useLocation().pathname`).

#### PR-5.3 Performance

- **TanStack Query `staleTime`:**
  - `counters`: 5 min (rarely changes)
  - `counterEntries`: 2 min
  - `tasks`: 1 min (changes more)
  - `reminders`: 10 min
- **Realtime subscriptions:** Use Supabase Realtime **only** for `tasks` on the Today Dashboard (multi-tab support). Counter entries and reminders use polling (invalidate on focus).
  ```ts
  // In useTasks — add Realtime channel
  supabase
    .channel("tasks-today")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        qc.invalidateQueries({ queryKey: ["tasks", date] });
      },
    )
    .subscribe();
  ```
- **Pagination:** Tasks page shows max 50 per date (no user will exceed this; no cursor needed for MVP). Counter entries fetched for 90 days max (already in `useCounterEntries(id, 90)`).
- **Minimal re-renders:** All hooks use `select` to transform data at the query level; components consume already-transformed data. `CounterCard` wrapped in `React.memo`.

#### PR-5.4 Data consistency

- **Source of truth:** Supabase PostgreSQL.
- **Cache invalidation:** After every mutation `onSuccess`, invalidate the relevant query key(s).
- **Optimistic update pattern** (counter check-in):
  ```ts
  onMutate: async () => {
    await qc.cancelQueries({ queryKey: ['counterEntries', counterId] });
    const prev = qc.getQueryData(['counterEntries', counterId]);
    qc.setQueryData(['counterEntries', counterId], (old: CounterEntry[]) => [
      ...(old ?? []),
      { id: 'optimistic', counter_id: counterId, entry_date: localDateISO(tz), value: 1, ... }
    ]);
    return { prev };
  },
  onError: (_err, _vars, ctx) => {
    qc.setQueryData(['counterEntries', counterId], ctx?.prev);
    toast.error('Check-in failed. Try again.');
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['counterEntries', counterId] }),
  ```

---

## Technical Design

### 3.1 Updated Data Model

#### Migration 003 — reminders enhancements

```sql
-- supabase/migrations/003_reminders_enhancements.sql

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS remind_at     time,          -- local HH:MM, nullable
  ADD COLUMN IF NOT EXISTS recurrence    text NOT NULL DEFAULT 'daily'
    CHECK (recurrence IN ('once','daily','weekly')),
  ADD COLUMN IF NOT EXISTS next_occurrence timestamptz; -- client-computed, for sorting

-- Migrate existing schedule_type → recurrence
UPDATE public.reminders SET recurrence = schedule_type WHERE recurrence = 'daily';

-- Index for upcoming reminders query
CREATE INDEX IF NOT EXISTS idx_reminders_user_next
  ON public.reminders (user_id, next_occurrence ASC)
  WHERE active = true;
```

#### Migration 004 — calendar aggregation index

```sql
-- supabase/migrations/004_calendar_index.sql

-- Composite index to speed up per-user monthly task scans
CREATE INDEX IF NOT EXISTS idx_tasks_user_date_completed
  ON public.tasks (user_id, task_date, completed);
```

#### No changes needed to `counters` / `counter_entries` / `profiles` schema.

### 3.2 RLS Additions

No new tables → no new RLS policies needed. The `reminders` RLS policies already cover new columns (column-level RLS is not separate in Postgres; row-level policies govern all columns).

### 3.3 Updated Types

```ts
// src/lib/types.ts — additions to Reminder interface
export interface Reminder {
  id: string;
  user_id: string;
  text: string;
  description: string | null; // NEW
  schedule_type: "daily" | "weekly"; // kept for backward compat
  recurrence: "once" | "daily" | "weekly"; // NEW
  remind_at: string | null; // NEW — 'HH:MM' or null
  weekdays: number[] | null;
  active: boolean;
  next_occurrence: string | null; // NEW — ISO timestamptz
  created_at: string;
}
```

### 3.4 New/Modified Files

| File                                                 | Change                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/dateUtils.ts`                               | Add `localDateISO(tz)`, `localTimeHHMM(tz)`                     |
| `src/lib/types.ts`                                   | Extend `Reminder` interface                                     |
| `src/hooks/useCounterEntries.ts`                     | Optimistic UI in `useCheckIn`                                   |
| `src/hooks/useReminders.ts`                          | Update insert/query for new columns; add `useUpcomingReminders` |
| `src/components/Layout.tsx`                          | Hamburger + mobile drawer                                       |
| `src/components/CounterCard.tsx`                     | Progress bar + % + error state                                  |
| `src/components/ReminderCard.tsx`                    | Show description + next trigger                                 |
| `src/components/AddReminderModal.tsx`                | Add `description`, `remind_at`, `recurrence` fields             |
| `src/components/ReminderToast.tsx`                   | **NEW** — in-app toast scheduler                                |
| `src/components/PageTransition.tsx`                  | **NEW** — fade-slide wrapper                                    |
| `src/pages/CalendarPage.tsx`                         | **NEW** — `/calendar` route                                     |
| `src/components/CalendarDayModal.tsx`                | **NEW** — day detail modal                                      |
| `src/App.tsx`                                        | Add `/calendar` route                                           |
| `src/index.css`                                      | Add `@keyframes fadeSlideIn`                                    |
| `supabase/migrations/003_reminders_enhancements.sql` | **NEW**                                                         |
| `supabase/migrations/004_calendar_index.sql`         | **NEW**                                                         |

---

## Implementation Phases

### Phase A — Foundations (do first, others depend on this)

#### A1 — Fix `localDateISO` utility

**File:** `src/lib/dateUtils.ts`

```ts
/**
 * Returns the current date in the given IANA timezone as 'YYYY-MM-DD'.
 * Falls back to UTC if timezone is invalid.
 * Uses Intl.DateTimeFormat (no external lib).
 */
export function localDateISO(tz = "Africa/Tunis"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
      new Date(),
    ); // en-CA locale formats as YYYY-MM-DD
  } catch {
    return new Date().toISOString().split("T")[0]; // UTC fallback
  }
}

/**
 * Returns current local time as 'HH:MM' in the given timezone.
 */
export function localTimeHHMM(tz = "Africa/Tunis"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
```

- Update every call to `todayISO()` in check-in/task-create paths to `localDateISO(userTimezone)`.
- `todayISO()` (UTC) is kept for internal use only where timezone doesn't matter (e.g., streak date math).

#### A2 — Apply DB migrations 003 and 004

- Run `003_reminders_enhancements.sql` in Supabase SQL editor.
- Run `004_calendar_index.sql` in Supabase SQL editor.
- Update `src/lib/types.ts` with new `Reminder` fields.

---

### Phase B — Counter Progress (Optimistic UI + Progress Bar)

#### B1 — Optimistic counter check-in

**File:** `src/hooks/useCounterEntries.ts`

Replace the `useCheckIn` mutation with full optimistic update pattern (see PR-5.4 code block above). Use `localDateISO(tz)` to derive `entry_date`. Read `tz` from the auth store (add `timezone` to the user profile fetch or hardcode `Africa/Tunis` for MVP).

Steps:

1. `onMutate`: cancel in-flight queries, snapshot current data, push optimistic entry.
2. `onError`: restore snapshot, show error toast.
3. `onSettled`: always invalidate to reconcile.

#### B2 — CounterCard progress bar

**File:** `src/components/CounterCard.tsx`

Add below the streak display:

```tsx
// Compute % based on target_type
const pct =
  counter.target_type === "daily"
    ? checkedToday
      ? 100
      : 0
    : Math.min(100, Math.floor((entriesThisWeek / counter.target_value) * 100));

const barColor =
  pct === 100 ? "bg-green-500" : pct > 0 ? "bg-indigo-500" : "bg-slate-200";
const label =
  pct === 100 ? "✓ Complete" : pct > 0 ? `${pct}% done` : "Not started";
```

States to handle:

- `isLoading` (from parent): render `<div className="h-2 rounded-full bg-slate-200 animate-pulse" />`
- `isError`: red ring on card + "Sync error" text + retry button
- Normal: progress bar + label

---

### Phase C — Mobile Responsiveness

#### C1 — Mobile drawer in Layout

**File:** `src/components/Layout.tsx`

Replace the existing static `<aside>` with a responsive implementation:

```tsx
// State
const [drawerOpen, setDrawerOpen] = useState(false);

// Top bar (mobile only)
<header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
  <span className="text-base font-semibold text-indigo-600">Daily Tracker</span>
  <button
    onClick={() => setDrawerOpen(true)}
    aria-label="Open navigation"
    className="p-2 rounded-lg hover:bg-slate-100"
  >
    {/* Hamburger SVG */}
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>
</header>;

// Drawer (mobile)
{
  drawerOpen && (
    <FocusTrap>
      <div
        className="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
        {/* Panel */}
        <nav className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col gap-1 px-3 py-6">
          <p className="mb-4 px-2 text-lg font-semibold tracking-tight text-indigo-600">
            Daily Tracker
          </p>
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `min-h-12 flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
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
            className="mt-auto min-h-12 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 hover:bg-slate-100"
          >
            Sign out
          </button>
        </nav>
      </div>
    </FocusTrap>
  );
}
```

**Focus trap implementation (no external lib):**

```tsx
// src/components/FocusTrap.tsx
import { useEffect, useRef } from "react";

export function FocusTrap({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        /* parent closes drawer via callback */ return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    document.body.style.overflow = "hidden"; // scroll lock
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = "";
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
```

Add Escape key handler to close drawer in Layout's `useEffect`.

---

### Phase D — Calendar View

#### D1 — CalendarPage component

**File:** `src/pages/CalendarPage.tsx`

```
State:
  - displayMonth: { year: number; month: number } (0-indexed month)
  - selectedDate: string | null (for day detail modal)

Data fetch (hook: useMonthTasks):
  - Query key: ['tasks', 'month', year, month]
  - Fetch: select task_date + completed for [month_start, month_end]
  - Transform: reduce to Map<string, { total: number; done: number }>

Render:
  1. Month/year header + prev/next buttons
  2. 7-column grid header: Mon Tue Wed Thu Fri Sat Sun
  3. Grid cells (42 = 6 weeks × 7 days):
     - Empty cells for days before month start
     - Day cells with color dot + date number
  4. Today has green ring (ring-2 ring-green-500)
  5. Click → set selectedDate → open CalendarDayModal
```

**Color assignment function:**

```ts
function getDayColor(
  stats: { total: number; done: number } | undefined,
): string {
  if (!stats || stats.total === 0) return "bg-slate-100 text-slate-400";
  const ratio = stats.done / stats.total;
  if (ratio === 0) return "bg-red-400 text-white";
  if (ratio <= 0.5) return "bg-orange-400 text-white";
  if (ratio < 1) return "bg-purple-500 text-white";
  return "bg-blue-500 text-white";
}
```

#### D2 — CalendarDayModal

**File:** `src/components/CalendarDayModal.tsx`

- Props: `date: string`, `onClose: () => void`
- Fetches full tasks for `date` via `useTasks(date)` (existing hook, no changes).
- Shows: date header, `{done}/{total}` progress bar, task list (read-only checkmarks), link "Edit in Tasks →" pointing to `/tasks?date={date}`.

#### D3 — Route + nav

**File:** `src/App.tsx` — add `<Route path="/calendar" element={<CalendarPage />} />`
**File:** `src/components/Layout.tsx` — add `{ to: '/calendar', label: '📅 Calendar' }` to nav array.

---

### Phase E — Enhanced Reminders

#### E1 — Update AddReminderModal

**File:** `src/components/AddReminderModal.tsx`

Add fields to form:

- `description`: `<textarea>` max 500 chars, optional.
- `recurrence`: radio group `once | daily | weekly` (replaces `schedule_type` radio).
- `remind_at`: `<input type="time" />`, optional. Label: "Notify me at".
- `weekdays`: shown when `recurrence === 'weekly'` (existing behavior).

On submit: compute `next_occurrence` client-side using `computeNextOccurrence` and save to DB.

#### E2 — Update ReminderCard

**File:** `src/components/ReminderCard.tsx`

Show:

```
🔔 {title}
   {description — truncated to 1 line if long}
   {recurrence label} · Next: {next_occurrence formatted or '—'}
```

#### E3 — ReminderToast scheduler

**File:** `src/components/ReminderToast.tsx`

```tsx
// Mount once inside AuthProvider (after login).
// Every 60 s, check if any reminder's remind_at matches localTimeHHMM(tz) ± 2 min.
// If matched and not in firedSet (sessionStorage key), show toast + add to set.
```

Integrate a minimal toast system — use a simple `useState`-driven toast stack in a `ToastContainer` component placed at the root of `App.tsx`. No external lib.

```ts
// Simple toast store (Zustand slice or Context — use Context to avoid another Zustand store)
const ToastContext = createContext<(msg: string) => void>(() => {});
```

#### E4 — Update useReminders hook

**File:** `src/hooks/useReminders.ts`

- Update `useCreateReminder` to send `description`, `recurrence`, `remind_at`, `next_occurrence`.
- Add `useUpcomingReminders` query: fetch reminders where `next_occurrence <= now + 24h AND active = true`, ordered by `next_occurrence ASC`.

---

### Phase F — Optimizations (parallel with E)

#### F1 — Realtime tasks subscription

**File:** `src/hooks/useTasks.ts`

Add `useEffect` that subscribes to `postgres_changes` on `tasks` table filtered by `user_id` and `task_date`. Unsubscribe on unmount.

#### F2 — Page transition

**File:** `src/components/PageTransition.tsx` + `src/index.css`

Wrap `<Outlet />` in `<PageTransition key={location.pathname} />`.

#### F3 — TanStack Query `staleTime` tuning

**File:** `src/main.tsx` (QueryClient config) or per-query in hooks.

Update per-query `staleTime` values per the Performance section above.

---

## Testing Plan

### Unit Tests

| Test file                                 | Cases                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/lib/__tests__/dateUtils.test.ts`     | `localDateISO('Africa/Tunis')` returns correct date at 23:58, 00:02; fallback on bad tz |
| `src/lib/__tests__/streakUtils.test.ts`   | Already exists; add: streak uses local date not UTC                                     |
| `src/lib/__tests__/calendarUtils.test.ts` | `getDayColor` for all ratio boundaries; weeks grid for Feb, months starting on Sun/Sat  |
| `src/lib/__tests__/reminderUtils.test.ts` | `computeNextOccurrence` for once/daily/weekly; expired once; past remind_at today       |

Run: `npx vitest run`

### Integration (manual — Supabase sandbox)

| Scenario            | Steps                                                                            | Expected                                               |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Day boundary        | Set system clock to 23:58 Africa/Tunis, check in → clock → 00:02, check in again | Two `counter_entries` rows with different dates        |
| Optimistic rollback | Check in with network offline                                                    | Streak increments, then reverts after timeout          |
| Calendar colors     | Create tasks on various dates; complete different amounts                        | Calendar shows correct color per ratio                 |
| Reminder toast      | Set `remind_at` to 2 min from now; wait                                          | Toast appears; firedSet prevents repeat                |
| Mobile nav          | Open at 360 px; tap hamburger; tab through links; press Escape                   | Drawer opens/closes; focus trapped; body scroll locked |

### E2E (Playwright — optional, document for v1)

Pages to cover:

- `LoginPage`: valid creds → redirect; invalid → error shown
- `CountersPage`: add habit → appears; check in → streak +1
- `TasksPage`: add task → appears; complete → strikethrough; progress bar updates
- `CalendarPage`: navigate month; correct color rendered; day modal opens

---

## Risks & Mitigations

| Risk                                                                                             | Likelihood          | Impact | Mitigation                                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------- | ------ | -------------------------------------------------------------------------------- |
| `localDateISO` uses `en-CA` locale which may not be available in all browsers                    | Low                 | High   | Add unit test; fallback to `toISOString` split on error                          |
| Optimistic update causes duplicate `id` collision if `optimistic` string collides with real UUID | Very Low            | Low    | Use `crypto.randomUUID()` for optimistic ID, not the string `'optimistic'`       |
| Mobile drawer scroll lock conflicts with iOS momentum scroll                                     | Medium              | Medium | Use `touch-action: none` on backdrop; test on real device                        |
| Supabase Realtime quota on free tier (200 concurrent connections)                                | Low                 | Medium | Only subscribe on Today Dashboard, not every page                                |
| `next_occurrence` drift if client clock is wrong                                                 | Low                 | Low    | Server timestamp for `updated_at`; UI shows relative time                        |
| Missing `remind_at` column in production DB if migration not run                                 | High (deploy order) | High   | Add null-guard in all code reading `remind_at`; migration must run before deploy |
| Calendar month query fetches all task columns (no server-side aggregation)                       | Low (data size)     | Low    | Client-side reduce is fast for <1000 tasks; paginate if needed in v2             |

---

## Definition of Done Checklist

- [ ] Migration `003_reminders_enhancements.sql` applied to production Supabase project.
- [ ] Migration `004_calendar_index.sql` applied.
- [ ] `localDateISO(tz)` unit tests pass for Africa/Tunis at both sides of midnight.
- [ ] Counter check-in uses `localDateISO` — not `todayISO()` (UTC).
- [ ] Optimistic update reverts on error; toast shown.
- [ ] `CounterCard` shows progress bar, %, and all 5 states (empty/partial/complete/loading/error).
- [ ] Mobile drawer opens on hamburger tap, closes on Escape + backdrop, focus trap works.
- [ ] No horizontal scroll at 360 px width on any page.
- [ ] `/calendar` route renders month view with correct colors.
- [ ] Clicking a calendar day opens the day detail modal.
- [ ] `reminders` table has `description`, `remind_at`, `recurrence`, `next_occurrence` columns.
- [ ] `AddReminderModal` collects all new fields.
- [ ] `ReminderCard` shows description + next trigger.
- [ ] In-app toast fires within ±2 min of `remind_at`.
- [ ] `firedSet` in `sessionStorage` prevents duplicate toasts per session.
- [ ] Supabase Realtime subscription active on Today Dashboard for tasks.
- [ ] Page fade-slide transition on route change (< 200 ms).
- [ ] `npm run build` exits 0; no TypeScript errors.
- [ ] All unit tests pass: `npx vitest run`.
- [ ] Netlify deploy succeeds; no `VITE_SERVICE_ROLE` env var present.

---

## Work Breakdown

### UI

- [ ] **U1** `Layout.tsx`: hamburger button, mobile top bar, drawer panel with `FocusTrap`
- [ ] **U2** `FocusTrap.tsx`: new focus-trap component
- [ ] **U3** `CounterCard.tsx`: progress bar, % label, 5-state rendering, `React.memo` wrap
- [ ] **U4** `CalendarPage.tsx`: month grid, navigation, day cell color logic
- [ ] **U5** `CalendarDayModal.tsx`: day detail modal (read-only task list + link)
- [ ] **U6** `AddReminderModal.tsx`: add `description`, `remind_at`, `recurrence` fields
- [ ] **U7** `ReminderCard.tsx`: show description + next trigger time
- [ ] **U8** `ReminderToast.tsx`: toast scheduler + `ToastContainer`
- [ ] **U9** `PageTransition.tsx`: fade-slide wrapper
- [ ] **U10** `index.css`: add `@keyframes fadeSlideIn`
- [ ] **U11** All modals: make full-screen on mobile (`inset-0` → max-w-sm on `md+`)

### Logic

- [ ] **L1** `dateUtils.ts`: add `localDateISO(tz)` and `localTimeHHMM(tz)`
- [ ] **L2** `dateUtils.ts` unit tests for timezone boundary
- [ ] **L3** `reminderUtils.ts`: `computeNextOccurrence(reminder, tz)` + tests
- [ ] **L4** `calendarUtils.ts`: `getDayColor(stats)`, week-grid builder + tests
- [ ] **L5** `useCounterEntries.ts`: full optimistic update in `useCheckIn`
- [ ] **L6** `useTasks.ts`: Realtime subscription in `useTasks`
- [ ] **L7** `useReminders.ts`: update for new columns; add `useUpcomingReminders`
- [ ] **L8** Update all check-in / task-create calls to use `localDateISO(tz)` not `todayISO()`

### API / DB

- [ ] **D1** Write `supabase/migrations/003_reminders_enhancements.sql`
- [ ] **D2** Write `supabase/migrations/004_calendar_index.sql`
- [ ] **D3** Apply both migrations in Supabase SQL editor (or `supabase db push`)
- [ ] **D4** `types.ts`: extend `Reminder` interface with 4 new fields
- [ ] **D5** `useCounterEntries.ts`: upsert with `ignoreDuplicates: false` to allow increment
- [ ] **D6** `main.tsx`: tune `staleTime` per query group

### Testing

- [ ] **T1** `dateUtils.test.ts`: `localDateISO` at 23:58 and 00:02
- [ ] **T2** `streakUtils.test.ts`: existing; add case using `localDateISO`
- [ ] **T3** `reminderUtils.test.ts`: `computeNextOccurrence` for all 3 recurrence types + expired
- [ ] **T4** `calendarUtils.test.ts`: `getDayColor` for all boundaries; Feb grid; month starting on Saturday
- [ ] **T5** Manual: day-boundary check-in test (clock at 23:58 → 00:02)
- [ ] **T6** Manual: mobile nav at 360 px on Chrome DevTools + BrowserStack (iOS Safari, Android Chrome)
- [ ] **T7** Manual: reminder toast fires within 2 min of `remind_at`

---

## Open Questions

> Defaults chosen; no blockers.

| Question                                                                        | Default chosen                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Should `localDateISO` read from `profiles.timezone` or hardcode `Africa/Tunis`? | Read from Zustand store after profile fetch; fallback to `Africa/Tunis` if not loaded.                  |
| Should the calendar also show counter check-in status per day?                  | No (v2). Calendar only shows task completion for now.                                                   |
| Should `once` reminders auto-archive after firing?                              | Yes — set `active = false` after toast fires for a `once` reminder. Update via Supabase client.         |
| Weekly counter `entriesThisWeek`: which day starts the week?                    | Monday (ISO week). Use `getISODay()` equivalent from date-fns if added, or manual `(getDay() + 6) % 7`. |
| Max description length for reminders?                                           | 500 characters — enforced by `maxLength` attribute + Zod `.max(500)`.                                   |

---

## Sprint-Ready Checklist

Execute top-to-bottom. Each item is a discrete, shippable commit.

```
PHASE A — Foundations
──────────────────────────────────────────────────────────
[ ] A1  Write + test localDateISO / localTimeHHMM in dateUtils.ts
[ ] A2  Write migration 003 (reminders enhancements) → apply to Supabase
[ ] A3  Write migration 004 (calendar index) → apply to Supabase
[ ] A4  Update src/lib/types.ts Reminder interface (4 new fields)
[ ] A5  Update all check-in / task-create paths to use localDateISO(tz)

PHASE B — Counter Progress
──────────────────────────────────────────────────────────
[ ] B1  Refactor useCheckIn: full optimistic update (onMutate / onError / onSettled)
[ ] B2  Add progress bar + % + 5 states to CounterCard; wrap in React.memo
[ ] B3  Unit test: optimistic rollback fires error toast (mock mutation error)

PHASE C — Mobile Responsiveness
──────────────────────────────────────────────────────────
[ ] C1  Create FocusTrap.tsx component
[ ] C2  Refactor Layout.tsx: add mobile top bar + hamburger + drawer
[ ] C3  Add Escape key close + body scroll lock to drawer
[ ] C4  Fix all modals to be full-screen on mobile / centered on md+
[ ] C5  QA at 360px, 375px, 390px in DevTools — no horizontal scroll
[ ] C6  Test on real device (iOS Safari focus trap + scroll lock)

PHASE D — Calendar View
──────────────────────────────────────────────────────────
[ ] D1  Write calendarUtils.ts (getDayColor, buildWeekGrid) + unit tests
[ ] D2  Create CalendarPage.tsx (month grid, navigation, color cells)
[ ] D3  Create CalendarDayModal.tsx (task detail, progress bar, edit link)
[ ] D4  Add /calendar route to App.tsx and nav item to Layout.tsx
[ ] D5  QA: Feb (28 days), month starting Saturday, all color states

PHASE E — Enhanced Reminders
──────────────────────────────────────────────────────────
[ ] E1  Write reminderUtils.ts (computeNextOccurrence) + unit tests
[ ] E2  Update AddReminderModal: description + remind_at + recurrence fields
[ ] E3  Update useReminders: new fields in insert; add useUpcomingReminders
[ ] E4  Update ReminderCard: show description + next trigger time
[ ] E5  Create ReminderToast.tsx + ToastContainer at app root
[ ] E6  Wire toast scheduler: 60s interval, ±2 min window, sessionStorage dedup
[ ] E7  Auto-archive once reminders after toast fires

PHASE F — Optimizations
──────────────────────────────────────────────────────────
[ ] F1  Add Realtime subscription to useTasks (Today Dashboard only)
[ ] F2  Tune staleTime per hook (counters 5m, tasks 1m, reminders 10m)
[ ] F3  Create PageTransition.tsx; add fadeSlideIn keyframe to index.css
[ ] F4  Wrap <Outlet /> with <PageTransition key={pathname} />

FINAL QA & DEPLOY
──────────────────────────────────────────────────────────
[ ] Z1  npm run build → exit 0, no TS errors
[ ] Z2  npx vitest run → all tests pass
[ ] Z3  Verify no VITE_SERVICE_ROLE env var in Netlify UI
[ ] Z4  Verify RLS: SELECT as different user returns 0 rows
[ ] Z5  Deploy to Netlify → smoke test all routes on production URL
[ ] Z6  Run through full user journey: signup → add habit → check in → calendar → reminder toast
```
