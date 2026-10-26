-- Reward posts and the public cover-image bucket.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query)
-- before using Rewards in the app. Paste the whole file.
--
-- Public visitors can read published posts. Inserts, updates, and deletes
-- are limited to profiles.role admin or super_admin. The Next.js admin
-- routes use the service-role key, which bypasses RLS after a role check.
-- Direct SQL from the Supabase editor has no user JWT, so the owner can
-- still repair a row by hand.

BEGIN;

CREATE TABLE IF NOT EXISTS public.reward_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  slug text NOT NULL,
  body text NOT NULL DEFAULT '',
  cover_image_url text,
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published boolean NOT NULL DEFAULT false,
  telegram_posted_at timestamptz
);

COMMENT ON TABLE public.reward_posts IS
  'Reward and offer posts shown on /rewards.';

COMMENT ON COLUMN public.reward_posts.telegram_posted_at IS
  'When this post was first announced to Telegram. Null means not announced.';

ALTER TABLE public.reward_posts
  DROP CONSTRAINT IF EXISTS reward_posts_title_len;

ALTER TABLE public.reward_posts
  ADD CONSTRAINT reward_posts_title_len
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 160);

ALTER TABLE public.reward_posts
  DROP CONSTRAINT IF EXISTS reward_posts_subtitle_len;

ALTER TABLE public.reward_posts
  ADD CONSTRAINT reward_posts_subtitle_len
  CHECK (char_length(subtitle) <= 280);

ALTER TABLE public.reward_posts
  DROP CONSTRAINT IF EXISTS reward_posts_slug_format;

ALTER TABLE public.reward_posts
  ADD CONSTRAINT reward_posts_slug_format
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) <= 80);

ALTER TABLE public.reward_posts
  DROP CONSTRAINT IF EXISTS reward_posts_body_len;

ALTER TABLE public.reward_posts
  ADD CONSTRAINT reward_posts_body_len
  CHECK (char_length(body) <= 100000);

ALTER TABLE public.reward_posts
  DROP CONSTRAINT IF EXISTS reward_posts_cover_len;

ALTER TABLE public.reward_posts
  ADD CONSTRAINT reward_posts_cover_len
  CHECK (cover_image_url IS NULL OR char_length(cover_image_url) <= 2000);

CREATE UNIQUE INDEX IF NOT EXISTS reward_posts_slug_key
  ON public.reward_posts (slug);

CREATE INDEX IF NOT EXISTS reward_posts_published_created_idx
  ON public.reward_posts (created_at DESC)
  WHERE published = true;

CREATE OR REPLACE FUNCTION public.is_staff_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_reward_post_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;

  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  -- SQL editor (no JWT) and the service-role API may set these fields.
  IF jwt_role = '' OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.telegram_posted_at := NULL;
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  NEW.telegram_posted_at := OLD.telegram_posted_at;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_reward_post_columns ON public.reward_posts;

CREATE TRIGGER protect_reward_post_columns
  BEFORE INSERT OR UPDATE ON public.reward_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_reward_post_columns();

ALTER TABLE public.reward_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_posts_public_read ON public.reward_posts;
CREATE POLICY reward_posts_public_read
  ON public.reward_posts
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS reward_posts_staff_read ON public.reward_posts;
CREATE POLICY reward_posts_staff_read
  ON public.reward_posts
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS reward_posts_staff_insert ON public.reward_posts;
CREATE POLICY reward_posts_staff_insert
  ON public.reward_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_role());

DROP POLICY IF EXISTS reward_posts_staff_update ON public.reward_posts;
CREATE POLICY reward_posts_staff_update
  ON public.reward_posts
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_role())
  WITH CHECK (public.is_staff_role());

DROP POLICY IF EXISTS reward_posts_staff_delete ON public.reward_posts;
CREATE POLICY reward_posts_staff_delete
  ON public.reward_posts
  FOR DELETE
  TO authenticated
  USING (public.is_staff_role());

REVOKE ALL ON TABLE public.reward_posts FROM anon, authenticated;
GRANT SELECT ON TABLE public.reward_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.reward_posts TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reward-covers',
  'reward-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS reward_covers_public_read ON storage.objects;
CREATE POLICY reward_covers_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'reward-covers');

DROP POLICY IF EXISTS reward_covers_staff_insert ON storage.objects;
CREATE POLICY reward_covers_staff_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reward-covers'
    AND public.is_staff_role()
  );

DROP POLICY IF EXISTS reward_covers_staff_update ON storage.objects;
CREATE POLICY reward_covers_staff_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reward-covers' AND public.is_staff_role())
  WITH CHECK (bucket_id = 'reward-covers' AND public.is_staff_role());

DROP POLICY IF EXISTS reward_covers_staff_delete ON storage.objects;
CREATE POLICY reward_covers_staff_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'reward-covers' AND public.is_staff_role());

COMMIT;
