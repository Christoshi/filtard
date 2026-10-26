-- Short-lived handoff records for X login on phones.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query)
-- before the phone X login flow is used. The Next.js server uses the
-- service-role key, which bypasses RLS. Browser sessions (anon and
-- authenticated) have no policies and no table grants, so they cannot read
-- or write code verifiers or session tokens.
--
-- A row lives for 10 minutes. The server deletes it when the starting
-- browser takes the session, or when it expires.

BEGIN;

CREATE TABLE public.x_oauth_handoffs (
  id uuid PRIMARY KEY,
  code_verifier text NOT NULL,
  flow_id text,
  authorize_url text NOT NULL,
  next_path text NOT NULL DEFAULT '/',
  status text NOT NULL DEFAULT 'pending',
  access_token text,
  refresh_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT x_oauth_handoffs_status_check
    CHECK (status IN ('pending', 'complete')),
  CONSTRAINT x_oauth_handoffs_next_path_check
    CHECK (next_path LIKE '/%' AND next_path NOT LIKE '//%')
);

CREATE INDEX x_oauth_handoffs_expires_at_idx
  ON public.x_oauth_handoffs (expires_at);

ALTER TABLE public.x_oauth_handoffs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.x_oauth_handoffs FROM PUBLIC;
REVOKE ALL ON TABLE public.x_oauth_handoffs FROM anon;
REVOKE ALL ON TABLE public.x_oauth_handoffs FROM authenticated;
GRANT ALL ON TABLE public.x_oauth_handoffs TO service_role;

COMMENT ON TABLE public.x_oauth_handoffs IS
  'Phone X OAuth handoffs. Service role only. Holds the PKCE verifier and, after the X in-app browser finishes, the session tokens until the starting browser polls once.';

COMMIT;
