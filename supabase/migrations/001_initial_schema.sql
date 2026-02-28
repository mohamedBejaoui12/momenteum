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
