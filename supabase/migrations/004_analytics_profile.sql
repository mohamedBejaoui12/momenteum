-- supabase/migrations/004_analytics_profile.sql
-- Analytics views and profile enhancements
-- Run this in Supabase SQL editor

-- ─── 1. Ensure profiles has all needed columns ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url   text,
  ADD COLUMN IF NOT EXISTS timezone     text NOT NULL DEFAULT 'UTC';

-- ─── 2. Storage bucket for user avatars ──────────────────────────────────
-- Create bucket if it doesn't exist (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_avatar',
  'user_avatar',
  true,                         -- public read so avatar URLs work without signed URLs
  512000,                       -- 500 KB max (512 * 1000 bytes)
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 3. Storage RLS for user_avatar bucket ───────────────────────────────
-- Allow authenticated users to upload/update their own avatar
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user_avatar'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user_avatar'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user_avatar'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar read public" ON storage.objects
  FOR SELECT USING (bucket_id = 'user_avatar');

-- ─── 4. Profiles RLS ─────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to CREATE their own profile row (needed for upsert on first save)
CREATE POLICY "Profile insert own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Profile read own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Profile update own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ─── 5. Analytics view: daily task completion rate (last 90 days) ────────
CREATE OR REPLACE VIEW public.v_task_daily_stats AS
SELECT
  user_id,
  task_date,
  COUNT(*)                                        AS total_tasks,
  COUNT(*) FILTER (WHERE completed = true)        AS completed_tasks,
  ROUND(
    COUNT(*) FILTER (WHERE completed = true)::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                               AS completion_pct
FROM public.tasks
GROUP BY user_id, task_date;

-- ─── 6. Analytics view: habit check-in streaks aggregated ───────────────
CREATE OR REPLACE VIEW public.v_counter_monthly_stats AS
SELECT
  ce.user_id,
  c.id    AS counter_id,
  c.name  AS counter_name,
  c.icon  AS counter_icon,
  c.color AS counter_color,
  DATE_TRUNC('month', ce.entry_date::timestamptz) AS month,
  COUNT(*)                                         AS checkin_count
FROM public.counter_entries ce
JOIN public.counters c ON c.id = ce.counter_id
GROUP BY ce.user_id, c.id, c.name, c.icon, c.color, DATE_TRUNC('month', ce.entry_date::timestamptz);

-- ─── 7. Index for analytics queries ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_completed      ON public.tasks (user_id, task_date, completed);
CREATE INDEX IF NOT EXISTS idx_ce_user_counter_date ON public.counter_entries (user_id, counter_id, entry_date);
