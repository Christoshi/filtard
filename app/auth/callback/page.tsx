"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, readAuthNext, safeNextPath, supabase } from "@/lib/auth";
import { completeHandoffLogin } from "@/lib/complete-handoff-login";

const RETURN_TO_BROWSER =
  "You're logged in. Go back to the browser you started in.";
const LOGIN_FAILED = "Login failed. Go back and try again.";

const startedHandoffs = new Set<string>();

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handoff = searchParams.get("handoff");
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const handoffRejected = Boolean(
    handoff &&
      (oauthError || !code) &&
      !startedHandoffs.has(handoff)
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (handoff) {
      if (startedHandoffs.has(handoff) || !code || oauthError) return;

      startedHandoffs.add(handoff);
      const clean = new URL(window.location.href);
      clean.searchParams.delete("code");
      window.history.replaceState(window.history.state, "", clean.toString());

      const finish = async () => {
        try {
          const response = await fetch("/auth/inapp/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({ handoff, code }),
          });
          const body = (await response.json().catch(() => null)) as {
            mode?: string;
            access_token?: string;
            refresh_token?: string;
            next?: string;
          } | null;

          if (body?.mode === "return") {
            setMessage(RETURN_TO_BROWSER);
            return;
          }

          if (
            body?.mode === "session" &&
            body.access_token &&
            body.refresh_token
          ) {
            const signedIn = await completeHandoffLogin({
              accessToken: body.access_token,
              refreshToken: body.refresh_token,
              nextPath: body.next,
            });
            if (!signedIn) setMessage(LOGIN_FAILED);
            return;
          }

          setMessage(LOGIN_FAILED);
        } catch {
          setMessage(LOGIN_FAILED);
        }
      };

      void finish();
      return;
    }

    const handleCallback = async () => {
      await supabase.auth.getSession();

      const next = safeNextPath(readAuthNext() || searchParams.get("next"));

      const user = await getCurrentUser();
      if (user && !user.display_name) {
        router.replace(`/setup-username?redirect=${encodeURIComponent(next)}`);
        return;
      }

      router.replace(next);
    };

    handleCallback();
  }, [code, handoff, oauthError, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-6">
      <p className="text-[#8b93a1] text-center" aria-live="polite">
        {message ?? (handoffRejected ? LOGIN_FAILED : "Logging you in...")}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <p className="text-[#8b93a1]">Logging you in...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}