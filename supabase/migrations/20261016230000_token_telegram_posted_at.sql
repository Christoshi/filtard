-- Record when an approved listing was announced to the Filtard Telegram group.
--
-- Run this once in the Supabase SQL editor before the Telegram deploy
-- (Dashboard -> SQL -> New query, paste the whole file).
--
-- tokens approved before this column exists are not backfilled.
-- Submit and approve still succeed if this has not been applied yet, but
-- those listings are not posted, and they will not be posted later.

BEGIN;

ALTER TABLE public.tokens
  ADD COLUMN IF NOT EXISTS telegram_posted_at timestamptz;

COMMENT ON COLUMN public.tokens.telegram_posted_at IS
  'When this approved listing was announced to Telegram. Null means not announced.';

REVOKE UPDATE (telegram_posted_at) ON TABLE public.tokens FROM anon, authenticated;

-- Keep the service-role API (and the SQL editor) as the only writers.
-- Signed-in users cannot set or clear the timestamp.
CREATE OR REPLACE FUNCTION public.protect_token_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  IF jwt_role = '' OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.is_pinned := false;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.initial_mcap := NULL;
    NEW.telegram_posted_at := NULL;
    IF auth.uid() IS NOT NULL THEN
      NEW.submitted_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.is_pinned := OLD.is_pinned;
  NEW.approved_by := OLD.approved_by;
  NEW.approved_at := OLD.approved_at;
  NEW.initial_mcap := OLD.initial_mcap;
  NEW.submitted_by := OLD.submitted_by;
  NEW.chain := OLD.chain;
  NEW.address := OLD.address;
  NEW.telegram_posted_at := OLD.telegram_posted_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_token_privileged_columns ON public.tokens;

CREATE TRIGGER protect_token_privileged_columns
  BEFORE INSERT OR UPDATE ON public.tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_token_privileged_columns();

COMMIT;
