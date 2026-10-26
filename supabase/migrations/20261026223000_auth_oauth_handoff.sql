-- Short-lived handoff for X login on phones.
--
-- The X app finishes OAuth inside its own browser, which does not have the
-- PKCE code verifier from the browser where the user tapped Login. This table
-- holds that verifier (and, if the callback lands in the other browser, the
-- session) until the starting browser picks it up.
--
-- Run this once in the Supabase SQL editor before deploying the phone login
-- change (Dashboard -> SQL -> New query, paste the whole file).
--
-- The Next.js routes use the service-role key, which bypasses RLS. There are
-- no policies for anon or authenticated, and those roles have no grants.

BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_oauth_handoffs (
  id uuid PRIMARY KEY,
  code_verifier text,
  flow_id text,
  next_path text NOT NULL DEFAULT '/',
  status text NOT NULL DEFAULT 'pending',
  access_token text,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT auth_oauth_handoffs_status_check
    CHECK (status IN ('pending', 'exchanging', 'complete'))
);

COMMENT ON TABLE public.auth_oauth_handoffs IS
  'Service-role only. Phone X login handoff: PKCE verifier, then session tokens, for at most 10 minutes. Single use.';

COMMENT ON COLUMN public.auth_oauth_handoffs.code_verifier IS
  'PKCE code verifier for this OAuth attempt. Cleared when the code is exchanged.';

COMMENT ON COLUMN public.auth_oauth_handoffs.flow_id IS
  'Supabase PKCE flow id that selects the verifier slot. Not a secret.';

ALTER TABLE public.auth_oauth_handoffs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_oauth_handoffs FROM PUBLIC;
REVOKE ALL ON TABLE public.auth_oauth_handoffs FROM anon;
REVOKE ALL ON TABLE public.auth_oauth_handoffs FROM authenticated;

GRANT ALL ON TABLE public.auth_oauth_handoffs TO service_role;

COMMIT;
