-- Enforce curator publication and role changes in the database.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query)
-- after this app version is deployed. The Next.js API uses the service-role
-- key, which carries a service_role JWT and is allowed through. Browser
-- sessions (anon / authenticated) are not.
--
-- Direct SQL from the Supabase editor has no user JWT, so the owner can still
-- repair a role by hand. A signed-in user cannot.
--
-- Until this file is applied, the app routes already set status from the
-- caller's verified role, but a crafted browser insert could still write
-- status = approved if the current RLS policy allows token inserts.

BEGIN;

-- ---------------------------------------------------------------------------
-- profiles.role
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  role_type text;
BEGIN
  SELECT c.data_type
  INTO role_type
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'profiles'
    AND c.column_name = 'role';

  IF role_type IN ('text', 'character varying') THEN
    UPDATE public.profiles
    SET role = 'user'
    WHERE role IS NULL
       OR role NOT IN ('user', 'curator', 'admin', 'super_admin');

    ALTER TABLE public.profiles
      ALTER COLUMN role SET DEFAULT 'user';

    ALTER TABLE public.profiles
      DROP CONSTRAINT IF EXISTS profiles_role_check;

    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'curator', 'admin', 'super_admin'));
  END IF;
END $$;

-- Public pages read profiles.role to show the curator badge.
GRANT SELECT (role) ON TABLE public.profiles TO anon, authenticated;

-- Signed-in users edit their own profile, but not their role.
REVOKE UPDATE (role) ON TABLE public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    jwt_role := coalesce(auth.jwt() ->> 'role', '');

    IF jwt_role IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION 'role can only be changed by an admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;

CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- tokens: publication, pin, and approval fields
-- ---------------------------------------------------------------------------

-- Submissions go through POST /api/tokens/submit.
REVOKE INSERT ON TABLE public.tokens FROM anon, authenticated;

-- Thesis edits from the browser may continue. These columns may not.
REVOKE UPDATE (
  status,
  is_pinned,
  approved_by,
  approved_at,
  initial_mcap,
  submitted_by,
  chain,
  address
) ON TABLE public.tokens FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_token_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  -- SQL editor (no JWT) and the service-role API may set these fields.
  IF jwt_role = '' OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.is_pinned := false;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.initial_mcap := NULL;
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_token_privileged_columns ON public.tokens;

CREATE TRIGGER protect_token_privileged_columns
  BEFORE INSERT OR UPDATE ON public.tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_token_privileged_columns();

COMMIT;
