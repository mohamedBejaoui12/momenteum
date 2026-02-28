-- supabase/migrations/003_enhancements.sql

-- Part 1: Reminders Enhancements
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS remind_at     time,          -- local HH:MM, nullable
  ADD COLUMN IF NOT EXISTS recurrence    text NOT NULL DEFAULT 'daily'
    CHECK (recurrence IN ('once','daily','weekly')),
  ADD COLUMN IF NOT EXISTS next_occurrence timestamptz; -- client-computed, for sorting

-- Migrate existing schedule_type -> recurrence (assuming schedule_type exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'schedule_type') THEN
    UPDATE public.reminders SET recurrence = schedule_type;
  END IF;
END $$;

-- Index for upcoming reminders query
CREATE INDEX IF NOT EXISTS idx_reminders_user_next
  ON public.reminders (user_id, next_occurrence ASC)
  WHERE active = true;

-- Part 2: Calendar Aggregation Index
-- Composite index to speed up per-user monthly task scans
CREATE INDEX IF NOT EXISTS idx_tasks_user_date_completed
  ON public.tasks (user_id, task_date, completed);
