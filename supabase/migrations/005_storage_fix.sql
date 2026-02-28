-- supabase/migrations/005_storage_fix.sql
-- Run this in the Supabase SQL Editor to fix storage bucket and policies.
-- This is idempotent (safe to run multiple times).

-- ─── 1. Ensure bucket exists and is public ───────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_avatar',
  'user_avatar',
  true,
  512000,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/jpg']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 512000,
      allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/jpg'];

-- ─── 2. Drop any previously created policies (safe) ──────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "Avatar upload own"   ON storage.objects;
  DROP POLICY IF EXISTS "Avatar update own"   ON storage.objects;
  DROP POLICY IF EXISTS "Avatar delete own"   ON storage.objects;
  DROP POLICY IF EXISTS "Avatar read public"  ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── 3. Storage RLS policies ─────────────────────────────────────────────
-- Upload: any authenticated user can upload into this bucket
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user_avatar');

-- Update: only the user whose folder matches their UID
-- We use the path prefix (first segment) instead of the owner column
-- to avoid the text vs uuid mismatch in different Supabase schema versions.
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user_avatar'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Delete: same path-prefix check
CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user_avatar'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Read: public (bucket is already public, but explicit policy helps)
CREATE POLICY "Avatar read public" ON storage.objects
  FOR SELECT USING (bucket_id = 'user_avatar');

-- ─── 4. Profiles RLS ─────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Profile insert own" ON public.profiles;
  DROP POLICY IF EXISTS "Profile read own"   ON public.profiles;
  DROP POLICY IF EXISTS "Profile update own" ON public.profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Profile insert own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Profile read own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Profile update own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
