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
