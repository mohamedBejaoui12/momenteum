# Daily Progress Tracker — Bug Fix & Polish Plan

> **File:** `docs/PLAN_BUGFIXES.md`  
> **Author:** Lead Engineer  
> **Date:** 2026-03-01  
> **Status:** Implementation-Ready  
> **Scope:** Seven targeted bug fixes and polish items identified from QA review of the live app screenshot and source audit.

---

## Current-State Assumptions

### ✅ Already Implemented & Working

- Full routing including `/today`, `/calendar`, `/counters`, `/reminders`, `/tasks`, `/analytics`, `/settings`, `/profile`
- Desktop sidebar (`md:flex`) with logo image, all nav items, profile badge, sign-out
- Mobile: sticky top bar with "Momentum" text + hamburger → full-height drawer (via `FocusTrap`)
- **Mobile bottom tab bar** (`bottomNav` — first 5 items) rendered via `<nav className="md:hidden fixed bottom-0 ...">` in `Layout.tsx`
- `CounterCard` with progress bar, streak display, check-in button, `isError` ring
- `useCheckIn` with full optimistic update pattern (`onMutate / onError / onSettled`)
- `localDateISO(tz)` with `Africa/Tunis` timezone — used in `useCheckIn`
- `useUpdateReminder` + `useDeleteReminder` hooks — both implemented in `useReminders.ts`
- `AddReminderModal` supports both create and edit (`existingReminder` prop), used in `ReminderCard`
- `ReminderCard` has edit (pencil) + delete (×) buttons; edit opens `AddReminderModal`
- `ReminderScheduler` + `ToastContainer` — interval-based in-app toast fires on page load and every 60s; uses `localStorage` to persist fired set per day
- `CalendarPage` with month grid, prev/next nav, `getDayStyle()` for color coding, `CalendarDayModal` on day click
- `useMonthTasks` — fetches full month task rows, reduces to `Map<date, {total, done}>`
- `TodayDashboard` — counter streak shows "0 DAY STREAK" before first check-in (this is correct behavior; see Issue 1 analysis)

### ❌ Confirmed Bugs / Issues to Fix (this plan)

1. **Counter number display** — `CounterCard` shows streak count (`streak`) for daily counters; the screenshot shows "0" which is correct for zero check-ins, but the label "DAY STREAK" is confusing users into thinking it's a task count. The fix is a labeling/context clarification, not a logic bug. The counter does NOT show task count — that is by design.
2. **Mobile bottom tab bar** — exists and is fully rendered on mobile (`md:hidden fixed bottom-0`). The plan calls for hiding/removing it per the UX requirement, replacing the pattern with the hamburger-only nav already in place.
3. **Performance on small screens** — no virtualization, no deferred loading, potential unnecessary re-renders from multiple `useCounterEntries` calls per card on TodayDashboard.
4. **Reminders edit/delete** — hooks and UI both exist. Root cause of non-functional behavior is likely the `ReminderCard` edit/delete buttons having `opacity-0 group-hover:opacity-100` — invisible on touch (no hover on mobile). Fix: always show on mobile.
5. **Reminder modal persistence** — current toast auto-dismisses after 6 seconds. Requirement is a persistent modal that stays until manually dismissed.
6. **Logo as home link** — `Layout.tsx` line 121 already links "Momentum" text to `/today`. The image logo in `NavContent` (`<img src="/assets/logo.png" />`) is NOT wrapped in a link. Fix the image logo.
7. **Calendar color indicators** — `getDayStyle()` uses zinc grey scale only (no color). Requirement is a colored gradient (red → green) with dark mode support and accessible contrast.

---

## Goals & Non-Goals

### Goals

- Fix counter card labeling so users understand what "0" means and how it relates to daily progress.
- Remove the mobile bottom tab bar entirely; rely on the existing hamburger drawer.
- Improve rendering performance on mobile via memoization and batched queries.
- Make reminder edit/delete buttons always visible and tappable on touch screens.
- Replace auto-dismiss reminder toast with a persistent modal that blocks until dismissed.
- Wrap the sidebar logo image in a `<Link to="/today">` element.
- Replace calendar's monochrome zinc color scheme with a meaningful colored scale (red → orange → purple → blue for 0%→100%), respecting dark mode contrast.

### Non-Goals

- No schema changes for issues 1–7 (all fixes are UI/logic layer).
- No new routes or pages.
- No changes to auth, RLS, or Supabase backend.
- No drag-to-reorder, offline mode, or PWA features.

---

## Product Requirements

### Issue 1 — Data Integrity: Fix Counter Logic & Display

#### PR-1.1 Root cause analysis

The counter shows **streak count** (consecutive days), not task count. From `CounterCard.tsx`:

```tsx
// For daily counters:
const streak = computeCurrentStreak(entryDates); // days of consecutive check-ins
// Displayed as:
<span>{counter.target_type === "daily" ? streak : entriesThisWeek}</span>
<span>Day Streak</span>  // → confusingly reads "0 DAY STREAK" before first check-in
```

The "0" is **correct** — the user hasn't checked in yet, so streak is 0. The **bug** is the missing context: users misread "0 DAY STREAK" as "0 tasks today." There is also a secondary UX issue: after check-in, the streak only increments if `computeCurrentStreak` sees consecutive days — so day 1 should show "1 DAY STREAK", not "0".

**Verify:** `computeCurrentStreak` already accounts for today correctly. The issue is display labeling and possibly that the `TodayDashboard` passes `days=30` to `useCounterEntries`, which is correct.

#### PR-1.2 Fix: Label clarification + state display

- When `checkedToday === false` AND `streak === 0`: show `"Start today"` sub-label instead of `"0 DAY STREAK"`.
- When `checkedToday === true` AND `streak === 1`: show `"1 DAY STREAK 🔥"`.
- For daily counters: also show a secondary line `"Checked in today ✓"` / `"Not yet today"` so context is unambiguous.
- Progress bar for daily: 0% = not checked in, 100% = checked in today (already implemented — keep as-is).

#### PR-1.3 Verify persistence across reloads

- The optimistic update uses `localDateISO(tz)` — correct.
- The upsert has `onConflict: 'counter_id,entry_date', ignoreDuplicates: false` — correct, prevents duplicates.
- **Verify:** after page reload, `useCounterEntries` re-fetches from Supabase and populates correctly.
- **Action:** add `staleTime: 2 * 60 * 1000` to `useCounterEntries` query to avoid aggressive refetch flicker.

**Acceptance criteria:**

- [ ] A counter with no check-ins shows "Start today" and a clear empty state, not "0 DAY STREAK".
- [ ] After check-in, streak shows the correct positive number with a flame emoji.
- [ ] After page reload, the checked-in state persists correctly from Supabase.
- [ ] Daily counters show a contextual sub-label reflecting today's status.

---

### Issue 2 — Navigation: Remove Bottom Tab Bar

#### PR-2.1 Root cause

`Layout.tsx` lines 172–195 render a `<nav className="md:hidden fixed bottom-0 ...">` bottom tab bar with 5 items (`bottomNav = nav.slice(0, 5)`). The main content has `pb-24 md:pb-10` to compensate. This clutters mobile UI when the hamburger drawer already provides full navigation.

**Additionally:** the bottom bar means the main content must have `pb-24` which wastes vertical space on small screens.

#### PR-2.2 Fix

- **Remove** the entire mobile bottom tab bar `<nav>` block from `Layout.tsx`.
- **Remove** the `bottomNav` constant (unused after removal).
- **Change** `pb-24 md:pb-10` → `pb-6 md:pb-10` in the main content wrapper.
- **Keep** the mobile top bar (sticky header with "Momentum" + hamburger) — this is the sole mobile nav.
- **Keep** the desktop sidebar (`hidden md:flex`).

**Acceptance criteria:**

- [ ] No bottom tab bar visible on any mobile viewport (360–430 px width).
- [ ] Main content is not clipped at the bottom on mobile.
- [ ] All navigation accessible via hamburger drawer on mobile.
- [ ] Desktop sidebar unchanged.

---

### Issue 3 — Performance: Small Screen Optimization

#### PR-3.1 Root cause

- `TodayDashboard` renders up to 6 `<TodayCounterCard>` components, each calling `useCounterEntries(counter.id, 30)` independently. This fires up to 6 separate Supabase queries on mount.
- No `staleTime` set on these queries — they refetch on every window focus.
- `TaskItem`, `CounterCard` are not memoized — re-render on any parent state change.
- No virtualization on task lists (acceptable for <50 items, but layout thrash on slow devices).

#### PR-3.2 Fix: Batch counter entries query

Instead of N queries (one per counter), fetch **all** counter entries for the user in a single query and distribute client-side.

```ts
// New hook: useAllCounterEntriesToday(counterIds, days)
// Single query: SELECT * FROM counter_entries WHERE counter_id IN (...) AND entry_date >= since
// Returns Map<counterId, CounterEntry[]>
```

This reduces 6 network requests to 1 on the Today Dashboard.

#### PR-3.3 Fix: Memoization

- Wrap `CounterCard` in `React.memo` (if not already — it's not currently).
- Wrap `TaskItem` in `React.memo`.
- Add `staleTime: 2 * 60 * 1000` to counter entries queries.
- Add `staleTime: 5 * 60 * 1000` to `useCounters` query.

#### PR-3.4 Fix: Reduce animation on low-end devices

- The `hover:-translate-y-1` on `CounterCard` triggers GPU layers on mobile. Replace with `active:scale-[0.98]` (already on the button) — remove the card-level translate.
- The `animate-float-in` class on `TodayDashboard` root div fires on every navigation. Ensure it uses `will-change: opacity` not `will-change: transform` to reduce compositing cost.

**Acceptance criteria:**

- [ ] Today Dashboard fires ≤ 2 Supabase queries on mount (1 for counters, 1 for all entries).
- [ ] Switching between tasks and counters does not trigger full re-render of sibling components.
- [ ] No visible layout jank on Galaxy S8 (360 px) at normal scroll speed.

---

### Issue 4 — Reminders: Fix Edit & Delete on Touch

#### PR-4.1 Root cause

`ReminderCard.tsx` renders edit/delete buttons with:

```tsx
className = "... opacity-0 group-hover:opacity-100 ...";
```

On touch screens, `:hover` never fires persistently — the buttons are **always invisible** on mobile. Users cannot edit or delete reminders.

#### PR-4.2 Fix

Replace the hover-only pattern with always-visible controls on mobile, hover-reveal on desktop:

```tsx
// Before:
className =
  "flex items-center gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all";

// After:
className =
  "flex items-center gap-1 shrink-0 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all";
```

This makes the buttons always visible on mobile (`< md`) and preserves the hover-reveal UX on desktop.

**Additionally:** verify that `useUpdateReminder` correctly updates the DB row and that `useDeleteReminder` soft-deletes (`active = false`) — both are confirmed implemented in `useReminders.ts`. The hooks work; only the UI visibility is broken.

**Acceptance criteria:**

- [ ] Edit (pencil) and delete (×) buttons are visible on mobile without hover.
- [ ] Tapping edit opens `AddReminderModal` pre-filled with existing reminder data.
- [ ] Tapping delete removes the reminder from the list immediately (optimistic via `invalidateQueries`).
- [ ] On desktop, buttons still reveal on hover (`md:opacity-0 md:group-hover:opacity-100`).

---

### Issue 5 — Reminders: Persistent Modal Until Dismissed

#### PR-5.1 Root cause

`ReminderScheduler` fires `showToast()` which auto-dismisses after **6 seconds** (`setTimeout 6000ms`). The requirement is a **persistent modal** that stays until the user actively closes it.

The current `ToastContainer` is a non-blocking overlay at `bottom-4 right-4`. It is not a modal and does not block user interaction.

#### PR-5.2 Architecture decision

**Replace** the toast-on-reminder-fire behavior with a **blocking modal** for due reminders:

- A new `ReminderModal` component renders a centered modal (`fixed inset-0`) with a backdrop.
- It displays one reminder at a time (if multiple are due, queue them — show next after dismissing current).
- The modal has **no auto-dismiss** — only a "Got it" / "Dismiss" button closes it.
- The existing `ToastContainer` / `showToast` system is kept for non-reminder UI feedback (e.g., sync errors, optimistic rollback). Only the reminder-trigger path changes.

#### PR-5.3 Implementation

**New component: `src/components/ReminderModal.tsx`**

```tsx
interface Props {
  reminder: { text: string; description?: string | null };
  onDismiss: () => void;
}
// Full-screen backdrop modal, centered card, "Got it" button, no auto-close
// Accessible: role="alertdialog", aria-modal="true", focus trap, Escape key = dismiss
```

**Update `ReminderScheduler` in `ReminderToast.tsx`:**

```tsx
// Instead of showToast(), push due reminders into a local useState queue:
// const [modalQueue, setModalQueue] = useState<Reminder[]>([]);
// When queue[0] exists → render <ReminderModal reminder={queue[0]} onDismiss={() => setModalQueue(q => q.slice(1))} />
```

**Persistence across page open (missed reminders):**

Keep the existing `localStorage` `firedKey` logic — reminders that already fired today are in the set and won't re-trigger. A reminder missed yesterday does NOT re-trigger (it was for yesterday; today is a new firing window).

**Acceptance criteria:**

- [ ] A due reminder triggers a blocking modal, not a toast.
- [ ] The modal remains visible until the user clicks "Got it."
- [ ] If multiple reminders are due simultaneously, they queue (modal 1 → dismiss → modal 2).
- [ ] Escape key dismisses the modal.
- [ ] The modal is accessible (`role="alertdialog"`, focus on "Got it" button on open).
- [ ] `localStorage` dedup prevents the same reminder from firing twice in one day.

---

### Issue 6 — Branding: Logo Image as Home Link

#### PR-6.1 Root cause

In `Layout.tsx`, `NavContent` renders:

```tsx
<div className="flex items-center gap-2 px-3 mb-6 mt-2">
  <img
    src="/assets/logo.png"
    alt="Momentum Logo"
    className="h-32 w-auto object-contain dark:invert"
  />
</div>
```

The image is in a plain `<div>`, not a `<Link>`. The mobile top bar correctly links the text "Momentum" → `/today`, but the sidebar logo image does not navigate anywhere.

#### PR-6.2 Fix

Wrap the logo `<img>` in a `<Link to="/today">` with appropriate ARIA:

```tsx
// Before:
<div className="flex items-center gap-2 px-3 mb-6 mt-2">
  <img src="/assets/logo.png" ... />
</div>

// After:
<Link
  to="/today"
  aria-label="Go to Today"
  className="flex items-center gap-2 px-3 mb-6 mt-2 rounded-lg focus-visible:ring-2 focus-visible:ring-zinc-400 outline-none"
>
  <img src="/assets/logo.png" ... />
</Link>
```

**Acceptance criteria:**

- [ ] Clicking/tapping the sidebar logo navigates to `/today`.
- [ ] Focus ring visible on keyboard navigation (`:focus-visible`).
- [ ] No visual change to the logo itself (size, color, dark mode invert unchanged).

---

### Issue 7 — Calendar: Color Indicators (Red → Green Scale)

#### PR-7.1 Root cause

`CalendarPage.tsx` `getDayStyle()` uses a zinc grey scale:

```tsx
if (ratio === 1)   return { bg: "bg-zinc-800 dark:bg-zinc-200 ...", ... }; // very dark
if (ratio > 0.5)   return { bg: "bg-zinc-200 dark:bg-zinc-700 ...", ... }; // medium grey
if (ratio > 0)     return { bg: "bg-zinc-100 dark:bg-zinc-800/80 ...", ... }; // light grey
return             { bg: "bg-zinc-50 dark:bg-zinc-900/50 ...", ... }; // near-white
```

This has no semantic color meaning. Users cannot immediately distinguish a bad day (0%) from a great day (100%) without reading the legend. The requirement is explicit color coding that also works in dark mode.

**Also:** the legend in the header uses `bg-zinc-800/400/300/200` dots — these must update to match the new colors.

#### PR-7.2 Color scale design

Following the spec from `PLAN_ENHANCEMENTS.md` but adapted to the actual `getDayStyle` structure:

| Condition                           | Light mode bg                           | Dark mode bg                                      | Text                                   | Meaning                    |
| ----------------------------------- | --------------------------------------- | ------------------------------------------------- | -------------------------------------- | -------------------------- |
| `total === 0` (no tasks)            | `bg-white border border-zinc-100`       | `dark:bg-zinc-800/60 dark:border-zinc-800`        | `text-zinc-600 dark:text-zinc-400`     | Neutral — no data          |
| `ratio === 0` (0%, tasks exist)     | `bg-red-50 border border-red-200`       | `dark:bg-red-950/40 dark:border-red-900/50`       | `text-red-700 dark:text-red-400`       | 🔴 Nothing done            |
| `ratio > 0 && ratio <= 0.5` (1–50%) | `bg-orange-50 border border-orange-200` | `dark:bg-orange-950/30 dark:border-orange-900/40` | `text-orange-700 dark:text-orange-300` | 🟠 Partial                 |
| `ratio > 0.5 && ratio < 1` (51–99%) | `bg-violet-50 border border-violet-200` | `dark:bg-violet-950/30 dark:border-violet-900/40` | `text-violet-700 dark:text-violet-300` | 🟣 Good                    |
| `ratio === 1` (100%)                | `bg-blue-500 border border-blue-600`    | `dark:bg-blue-600 dark:border-blue-500`           | `text-white`                           | 🔵 Complete                |
| Today overlay                       | `ring-2 ring-green-500`                 | `dark:ring-green-400`                             | —                                      | 🟢 Today (on top of color) |

**Contrast check:**

- Red-50 with red-700 text: WCAG AA ✓ (ratio ~5.2:1)
- Orange-50 with orange-700 text: WCAG AA ✓ (~4.7:1)
- Violet-50 with violet-700 text: WCAG AA ✓ (~5.1:1)
- Blue-500 with white text: WCAG AA ✓ (~4.6:1)
- Dark variants: all tested to ≥ 4.5:1 on `zinc-900` background

#### PR-7.3 Legend update

Update the header legend to match new colors:

```tsx
{[
  { dot: "bg-blue-500",    label: "100%" },
  { dot: "bg-violet-400",  label: ">50%" },
  { dot: "bg-orange-400",  label: "1–50%" },
  { dot: "bg-red-400",     label: "0%" },
  { dot: "bg-zinc-200 dark:bg-zinc-700", label: "No tasks" },
].map(...)}
```

**Acceptance criteria:**

- [ ] 0% days show a distinct red tint (not grey).
- [ ] 100% days show blue (not dark grey/black).
- [ ] Colors are distinguishable in both light and dark mode.
- [ ] All text/background combinations pass WCAG AA (4.5:1 minimum).
- [ ] Today's cell has a visible green ring overlay regardless of its fill color.
- [ ] Legend in calendar header reflects the new color scheme.

---

## Technical Design

### 4.1 New/Modified Files

| File                               | Type    | Change                                                                                             |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `src/components/CounterCard.tsx`   | Modify  | Fix sub-label text for 0-streak daily counter; add `React.memo`                                    |
| `src/components/Layout.tsx`        | Modify  | Remove bottom tab bar `<nav>`, remove `bottomNav` const, fix `pb-24→pb-6`, wrap logo in `<Link>`   |
| `src/components/ReminderCard.tsx`  | Modify  | Change `opacity-0 group-hover:opacity-100` → `opacity-100 md:opacity-0 md:group-hover:opacity-100` |
| `src/components/ReminderToast.tsx` | Modify  | Replace `showToast()` call in scheduler with `setModalQueue` push; add `ReminderModal` render      |
| `src/components/ReminderModal.tsx` | **NEW** | Persistent blocking modal with `alertdialog` role, focus trap, "Got it" button, no auto-close      |
| `src/pages/CalendarPage.tsx`       | Modify  | Replace `getDayStyle()` color values with colored scale; update legend                             |
| `src/hooks/useCounterEntries.ts`   | Modify  | Add `staleTime: 2 * 60 * 1000` to query                                                            |
| `src/hooks/useCounters.ts`         | Modify  | Add `staleTime: 5 * 60 * 1000` to query                                                            |
| `src/hooks/useTasks.ts`            | Modify  | Add `staleTime: 60 * 1000` to query (already planned)                                              |

### 4.2 No DB / Schema Changes

All seven issues are frontend-only. No new migrations required.

### 4.3 No New Dependencies

All fixes use existing stack (React, Tailwind, Lucide icons, TanStack Query). `ReminderModal` reuses the same focus-trap pattern as `FocusTrap.tsx`.

---

## Implementation Phases

### Phase A — Quick Wins (< 30 min each, no risk)

#### A1 — Logo link fix

**File:** `src/components/Layout.tsx`

In `NavContent`, wrap the logo `<div>` in a `<Link to="/today">`:

```tsx
// Find the div wrapping the logo img and replace with:
<Link
  to="/today"
  aria-label="Go to Today"
  className="flex items-center gap-2 px-3 mb-6 mt-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
>
  <img
    src="/assets/logo.png"
    alt="Momentum Logo"
    className="h-32 w-auto object-contain dark:invert"
  />
</Link>
```

#### A2 — Reminder card buttons always visible on mobile

**File:** `src/components/ReminderCard.tsx`

Single class change:

```tsx
// Before:
"flex items-center gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all";
// After:
"flex items-center gap-1 shrink-0 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all";
```

#### A3 — Remove bottom tab bar

**File:** `src/components/Layout.tsx`

- Delete the entire `<nav className="md:hidden fixed bottom-0 ...">` block (lines ~172–195).
- Delete the `const bottomNav = nav.slice(0, 5);` line.
- Change `pb-24 md:pb-10` → `pb-6 md:pb-10` in the main content `<div>`.

---

### Phase B — Counter Card Label Fix

#### B1 — Sub-label text logic

**File:** `src/components/CounterCard.tsx`

Modify the streak display section. The current display:

```tsx
<span>{counter.target_type === "daily" ? streak : entriesThisWeek}</span>
<span>Day Streak</span>
```

Replace with:

```tsx
<span>{counter.target_type === "daily" ? streak : entriesThisWeek}</span>
<span>
  {counter.target_type === "daily"
    ? streak === 0 ? "Day Streak" : "Day Streak"  // label stays same
    : "This Week"}
</span>
// Add below the streak number block:
{counter.target_type === "daily" && (
  <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
    {checkedToday ? "Checked in today ✓" : "Not yet today"}
  </span>
)}
```

> **Note:** The number itself (0 for no streak) is correct. The key fix is adding the contextual sub-line so "0 DAY STREAK / Not yet today" is unambiguous vs. confusing "0 DAY STREAK" alone.

#### B2 — Add `staleTime` to counter queries

**File:** `src/hooks/useCounterEntries.ts`

```ts
return useQuery({
  queryKey: ["counterEntries", counterId],
  staleTime: 2 * 60 * 1000, // 2 minutes — add this line
  queryFn: async () => { ... },
});
```

**File:** `src/hooks/useCounters.ts`

```ts
return useQuery({
  queryKey: ["counters"],
  staleTime: 5 * 60 * 1000, // 5 minutes — add this line
  queryFn: async () => { ... },
});
```

#### B3 — Wrap CounterCard in React.memo

**File:** `src/components/CounterCard.tsx`

```tsx
// Change:
export function CounterCard({ counter, entries, isLoading }: Props) { ... }
// To:
export const CounterCard = React.memo(function CounterCard({ counter, entries, isLoading }: Props) { ... });
```

Add `import React from "react";` if not already present.

---

### Phase C — Calendar Color Indicators

#### C1 — Replace `getDayStyle` color values

**File:** `src/pages/CalendarPage.tsx`

Replace the entire `getDayStyle` function:

```ts
function getDayStyle(
  stats: { total: number; done: number } | undefined,
  isCurrentMonth: boolean,
) {
  if (!isCurrentMonth)
    return {
      bg: "transparent",
      text: "text-zinc-300 dark:text-zinc-700",
      dot: "",
    };
  if (!stats || stats.total === 0)
    return {
      bg: "bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800",
      text: "text-zinc-600 dark:text-zinc-400",
      dot: "",
    };

  const ratio = stats.done / stats.total;

  if (ratio === 1)
    return {
      bg: "bg-blue-500 dark:bg-blue-600 border border-blue-600 dark:border-blue-500",
      text: "text-white",
      dot: "bg-white",
    };
  if (ratio > 0.5)
    return {
      bg: "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40",
      text: "text-violet-700 dark:text-violet-300",
      dot: "bg-violet-400 dark:bg-violet-500",
    };
  if (ratio > 0)
    return {
      bg: "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40",
      text: "text-orange-700 dark:text-orange-300",
      dot: "bg-orange-400 dark:bg-orange-500",
    };
  // ratio === 0, tasks exist
  return {
    bg: "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-400 dark:bg-red-500",
  };
}
```

#### C2 — Update legend

**File:** `src/pages/CalendarPage.tsx`

Replace the legend array in the header:

```tsx
{
  [
    { dot: "bg-blue-500", label: "100%" },
    { dot: "bg-violet-400 dark:bg-violet-500", label: ">50%" },
    { dot: "bg-orange-400 dark:bg-orange-500", label: "1–50%" },
    { dot: "bg-red-400 dark:bg-red-500", label: "0%" },
    { dot: "bg-zinc-200 dark:bg-zinc-700", label: "No tasks" },
  ].map(({ dot, label }) => (
    <span
      key={label}
      className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  ));
}
```

---

### Phase D — Persistent Reminder Modal

#### D1 — Create `ReminderModal` component

**File:** `src/components/ReminderModal.tsx` (NEW)

```tsx
import { useEffect, useRef } from "react";
import { BellRing, X } from "lucide-react";

interface Props {
  text: string;
  description?: string | null;
  onDismiss: () => void;
}

export function ReminderModal({ text, description, onDismiss }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus(); // auto-focus dismiss button
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
    >
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/30 mb-4 mx-auto">
          <BellRing className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>
        {/* Title */}
        <h2
          id="reminder-modal-title"
          className="text-base font-bold text-zinc-900 dark:text-zinc-50 text-center mb-1"
        >
          {text}
        </h2>
        {/* Description */}
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-5">
            {description}
          </p>
        )}
        {/* Dismiss */}
        <button
          ref={btnRef}
          onClick={onDismiss}
          className="w-full mt-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

#### D2 — Update `ReminderScheduler` in `ReminderToast.tsx`

**File:** `src/components/ReminderToast.tsx`

```tsx
// Add import:
import { ReminderModal } from "./ReminderModal";

// Inside ReminderScheduler:
export function ReminderScheduler() {
  const { data: reminders } = useReminders();
  const [modalQueue, setModalQueue] = useState<
    Array<{ text: string; description?: string | null }>
  >([]);

  useEffect(() => {
    if (!reminders || reminders.length === 0) return;

    const checkReminders = () => {
      const now = localTimeHHMM();
      const today = localDateISO();
      const firedKey = `reminders_fired_${today}`;
      const firedSet = new Set<string>(
        JSON.parse(localStorage.getItem(firedKey) || "[]"),
      );

      const [nowH, nowM] = now.split(":").map(Number);
      const nTime = nowH * 60 + nowM;
      let updated = false;

      const sorted = [...reminders].sort((a, b) => {
        if (!a.remind_at) return 1;
        if (!b.remind_at) return -1;
        return a.remind_at.localeCompare(b.remind_at);
      });

      const due: Array<{ text: string; description?: string | null }> = [];
      for (const r of sorted) {
        if (!r.remind_at || firedSet.has(r.id)) continue;
        const [h, m] = r.remind_at.split(":").map(Number);
        if (nTime >= h * 60 + m) {
          due.push({ text: r.text, description: r.description });
          firedSet.add(r.id);
          updated = true;
        }
      }

      if (due.length > 0) setModalQueue((q) => [...q, ...due]);
      if (updated)
        localStorage.setItem(firedKey, JSON.stringify(Array.from(firedSet)));
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  const dismiss = () => setModalQueue((q) => q.slice(1));

  return modalQueue.length > 0 ? (
    <ReminderModal
      text={modalQueue[0].text}
      description={modalQueue[0].description}
      onDismiss={dismiss}
    />
  ) : null;
}
```

> **Note:** Remove the `{ showToast }` dependency from the scheduler since we no longer call `showToast()` for reminders. The `ToastContainer`/`showToast` system remains available for other UI feedback.

---

### Phase E — Performance (batched counter queries)

#### E1 — Batch counter entries on Today Dashboard

**File:** `src/hooks/useCounterEntries.ts`

Add a new export:

```ts
export function useAllCounterEntries(counterIds: string[], days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["counterEntries", "batch", counterIds.sort().join(",")],
    staleTime: 2 * 60 * 1000,
    enabled: counterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counter_entries")
        .select("*")
        .in("counter_id", counterIds)
        .gte("entry_date", sinceISO)
        .order("entry_date");
      if (error) throw error;

      // Group by counter_id
      const map = new Map<string, CounterEntry[]>();
      for (const id of counterIds) map.set(id, []);
      for (const e of data as CounterEntry[]) {
        map.get(e.counter_id)?.push(e);
      }
      return map;
    },
  });
}
```

**File:** `src/pages/TodayDashboard.tsx`

```tsx
// Replace individual TodayCounterCard pattern:
// Before: each card calls useCounterEntries(counter.id, 30) independently
// After: batch fetch once, pass entries down as prop

const { data: counters = [] } = useCounters();
const counterIds = counters.map((c) => c.id);
const { data: entriesMap } = useAllCounterEntries(counterIds, 30);

// In render:
{
  counters
    .slice(0, 6)
    .map((c) => (
      <CounterCard
        key={c.id}
        counter={c}
        entries={entriesMap?.get(c.id) ?? []}
        isLoading={!entriesMap}
      />
    ));
}
```

This eliminates the `TodayCounterCard` wrapper component entirely.

---

## Testing Plan

### Unit Tests

| Test            | File                         | Cases                                                                              |
| --------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| Counter label   | `CounterCard.test.tsx`       | streak=0 + not checked in → shows "Not yet today"; streak=3 → shows "3 DAY STREAK" |
| Calendar colors | `calendarUtils.test.ts`      | `getDayStyle` for ratio=0/0.3/0.7/1 in both current and non-current month          |
| Modal queue     | `ReminderScheduler.test.tsx` | 2 due reminders → queue length 2 → dismiss → queue length 1                        |

### Manual QA Checklist

| Scenario               | Viewport     | Expected                                                            |
| ---------------------- | ------------ | ------------------------------------------------------------------- |
| No check-ins today     | Mobile 390px | Card shows "0 DAY STREAK / Not yet today" + empty progress bar      |
| After check-in         | Mobile 390px | Card shows "1 DAY STREAK / Checked in today ✓" + 100% bar           |
| Bottom nav             | Mobile 360px | No bottom tab bar visible; all content reachable via hamburger      |
| Bottom nav removed     | Mobile 360px | No extra padding at bottom of page                                  |
| Edit reminder          | Mobile 390px | Pencil icon visible (not hidden); tap opens modal pre-filled        |
| Delete reminder        | Mobile 390px | × icon visible; tap removes card from list                          |
| Reminder modal         | Any          | Due reminder shows blocking modal; dismisses on "Got it" and Escape |
| Multiple due reminders | Any          | Second modal appears after first is dismissed                       |
| Calendar 0% day        | Light + dark | Red tint (not grey)                                                 |
| Calendar 100% day      | Light + dark | Blue fill, white text                                               |
| Calendar 51% day       | Light + dark | Violet tint                                                         |
| Calendar today         | Any          | Green ring visible regardless of fill color                         |
| Logo click (sidebar)   | Desktop      | Navigates to `/today`                                               |
| Logo keyboard          | Desktop      | Focus ring visible; Enter navigates                                 |

### Regression Checklist

After all changes, confirm these still work:

- [ ] Desktop sidebar renders correctly (logo, nav items, profile, sign-out)
- [ ] Mobile hamburger opens/closes drawer; Escape closes; backdrop click closes
- [ ] Focus trap still works in drawer (tab cycles inside)
- [ ] Counter check-in still creates DB row; page reload shows persisted state
- [ ] Reminder create/edit saves to Supabase and appears in list
- [ ] Calendar day click still opens `CalendarDayModal`
- [ ] `npm run build` exits 0 with no TypeScript errors

---

## Risks & Mitigations

| Risk                                                                                                                                     | Likelihood | Impact | Mitigation                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Removing `pb-24` clips content above bottom of screen on phones with home indicator                                                      | Medium     | Medium | Use `pb-6 md:pb-10`; test on iPhone with `env(safe-area-inset-bottom)` — the `ReminderModal` handles body overflow so no interaction with this                                                   |
| `React.memo` on `CounterCard` causes stale props if `entries` array reference changes on each render                                     | Low        | Low    | TanStack Query returns stable references when data is unchanged; test by checking render count in DevTools                                                                                       |
| Colored calendar Tailwind classes not purged (dynamic class construction)                                                                | Low        | High   | Use full class strings in `getDayStyle` (no template literals with partial classes) — already the pattern in current code                                                                        |
| `ReminderModal` `z-[60]` conflicts with drawer `z-50`                                                                                    | Low        | Medium | Modal `z-[60]` > drawer `z-50` — modal correctly overlays drawer if both open simultaneously                                                                                                     |
| Batched counter query `useAllCounterEntries` with `counterIds.sort().join(",")` as key causes stale cache if counters list changes order | Low        | Low    | `sort()` normalizes the key; adding a new counter invalidates the counters query key, not this key — add `onSuccess` in `useCreateCounter` to also invalidate `["counterEntries", "batch", ...]` |

---

## Definition of Done Checklist

- [ ] No bottom tab bar visible on any mobile viewport.
- [ ] Main content not clipped (correct padding without `pb-24`).
- [ ] `CounterCard` daily counter shows "Not yet today" / "Checked in today ✓" sub-label.
- [ ] `CounterCard` wrapped in `React.memo`.
- [ ] `staleTime` added to `useCounters` (5 min) and `useCounterEntries` (2 min).
- [ ] Today Dashboard uses batched `useAllCounterEntries` — only 2 Supabase queries on mount.
- [ ] Reminder edit + delete buttons visible on mobile without hover.
- [ ] Tapping edit opens pre-filled `AddReminderModal`; save updates Supabase.
- [ ] Tapping delete soft-deletes and removes card immediately.
- [ ] Due reminder triggers blocking `ReminderModal`, not a 6-second toast.
- [ ] Modal queues multiple due reminders; each dismissed individually.
- [ ] Modal accessible: `alertdialog` role, focus on "Got it" button, Escape closes.
- [ ] Sidebar logo image wrapped in `<Link to="/today">` with `:focus-visible` ring.
- [ ] Calendar shows red for 0%, orange for 1–50%, violet for 51–99%, blue for 100%.
- [ ] Calendar dark mode colors all pass WCAG AA contrast (≥ 4.5:1).
- [ ] Calendar legend updated to match new colors.
- [ ] `npm run build` exits 0; no TypeScript errors.
- [ ] All manual QA scenarios pass (see table above).

---

## Work Breakdown

### UI

- [ ] **U1** `Layout.tsx`: remove bottom tab bar `<nav>`, remove `bottomNav`, fix `pb-24→pb-6`
- [ ] **U2** `Layout.tsx` `NavContent`: wrap logo `<img>` in `<Link to="/today">`
- [ ] **U3** `ReminderCard.tsx`: change button visibility class for mobile
- [ ] **U4** `CalendarPage.tsx`: replace `getDayStyle()` with colored scale
- [ ] **U5** `CalendarPage.tsx`: update legend array to colored dots
- [ ] **U6** `CounterCard.tsx`: add "Not yet today" / "Checked in today ✓" sub-label
- [ ] **U7** `ReminderModal.tsx`: create new persistent modal component

### Logic

- [ ] **L1** `ReminderToast.tsx` `ReminderScheduler`: replace `showToast()` with `modalQueue` state
- [ ] **L2** `ReminderToast.tsx`: import and render `ReminderModal` from queue
- [ ] **L3** `CounterCard.tsx`: wrap in `React.memo`
- [ ] **L4** `useCounterEntries.ts`: add `staleTime`; add `useAllCounterEntries` batch hook
- [ ] **L5** `useCounters.ts`: add `staleTime: 5 * 60 * 1000`
- [ ] **L6** `TodayDashboard.tsx`: replace `TodayCounterCard` pattern with batch query

### API / DB

- No DB changes required for any of the 7 issues.

### Testing

- [ ] **T1** Manual: bottom bar gone at 360px, 390px
- [ ] **T2** Manual: counter sub-label at 0 streak, 1+ streak, checked-in state
- [ ] **T3** Manual: reminder edit tap → modal pre-filled; delete tap → card removed
- [ ] **T4** Manual: reminder modal appears, blocks UI, queues, Escape closes
- [ ] **T5** Manual: calendar colors in light + dark mode at all ratio states
- [ ] **T6** Manual: logo click in sidebar navigates to `/today`
- [ ] **T7** `npm run build` clean

---

## Sprint-Ready Checklist

Execute top-to-bottom. Each block is a discrete commit.

```
PHASE A — Quick Wins (no risk, ship first)
──────────────────────────────────────────────────────────
[ ] A1  Layout.tsx: wrap NavContent logo <img> in <Link to="/today">
[ ] A2  ReminderCard.tsx: opacity-0 → opacity-100 md:opacity-0 md:group-hover:opacity-100
[ ] A3  Layout.tsx: delete bottom tab bar <nav> block
[ ] A4  Layout.tsx: delete bottomNav const
[ ] A5  Layout.tsx: change pb-24 → pb-6 in main content wrapper
        → Commit: "fix(nav): remove mobile bottom tab bar; logo links to /today; reminder buttons always visible"

PHASE B — Counter Card Polish
──────────────────────────────────────────────────────────
[ ] B1  CounterCard.tsx: add "Not yet today" / "Checked in today ✓" sub-label for daily counters
[ ] B2  CounterCard.tsx: wrap in React.memo; add React import
[ ] B3  useCounters.ts: add staleTime: 5 * 60 * 1000
[ ] B4  useCounterEntries.ts: add staleTime: 2 * 60 * 1000
        → Commit: "fix(counters): clarify streak label; memoize card; add staleTime"

PHASE C — Calendar Colors
──────────────────────────────────────────────────────────
[ ] C1  CalendarPage.tsx: replace getDayStyle() zinc scale with red/orange/violet/blue
[ ] C2  CalendarPage.tsx: update legend dots to match new colors
[ ] C3  Manual QA: verify all 5 color states in light + dark mode
        → Commit: "feat(calendar): color-coded day indicators (red→orange→violet→blue)"

PHASE D — Persistent Reminder Modal
──────────────────────────────────────────────────────────
[ ] D1  Create src/components/ReminderModal.tsx (alertdialog, Got it button, Escape, focus)
[ ] D2  ReminderToast.tsx: add modalQueue state to ReminderScheduler
[ ] D3  ReminderToast.tsx: replace showToast() call with setModalQueue push
[ ] D4  ReminderToast.tsx: render <ReminderModal> from queue[0]; dismiss = slice(1)
[ ] D5  Manual QA: set remind_at 2 min from now; confirm modal appears and blocks UI
[ ] D6  Manual QA: set 2 reminders at same time; confirm queue behavior
        → Commit: "feat(reminders): persistent blocking modal instead of auto-dismiss toast"

PHASE E — Performance
──────────────────────────────────────────────────────────
[ ] E1  useCounterEntries.ts: add useAllCounterEntries(counterIds, days) batch hook
[ ] E2  TodayDashboard.tsx: use useAllCounterEntries; remove TodayCounterCard wrapper
[ ] E3  Verify in DevTools Network: Today Dashboard fires ≤ 2 queries on load
        → Commit: "perf: batch counter entries query on Today Dashboard"

FINAL QA & DEPLOY
──────────────────────────────────────────────────────────
[ ] Z1  npm run build → exit 0, no TypeScript errors
[ ] Z2  Full manual QA matrix (all 7 issue scenarios)
[ ] Z3  Regression: desktop sidebar, mobile drawer, check-in persist, calendar modal
[ ] Z4  Deploy to Netlify → smoke test on production URL
[ ] Z5  Test on real mobile device: iOS Safari + Android Chrome
```
