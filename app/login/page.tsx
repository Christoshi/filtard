"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, signInWithX } from "@/lib/auth";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import { isXAuthorizeUrl } from "@/lib/x-authorize-url";
import {
  X_HANDOFF_CLEARED,
  applyHandedOffSession,
  clearXHandoffPending,
  hasXHandoffPending,
  markXHandoffPending,
  readStoredAuthorizeUrl,
} from "@/lib/x-handoff-client";

function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState<"google" | "x" | null>(null);
  const [prefetchNonce, setPrefetchNonce] = useState(0);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const startError = searchParams.get("error") === "x";
  const freshUrl = useRef<string | null>(null);
  const restarts = useRef(0);

  useEffect(() => {
    if (!isPhoneUserAgent(navigator.userAgent)) return;

    if (hasXHandoffPending() && readStoredAuthorizeUrl()) return;

    const controller = new AbortController();
    let cancelled = false;

    async function prefetch() {
      try {
        const res = await fetch("/auth/inapp/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirect }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { url?: unknown };
        if (cancelled || typeof data.url !== "string") return;
        if (!isXAuthorizeUrl(data.url)) return;
        freshUrl.current = data.url;
        markXHandoffPending(data.url);
      } catch {
        // Aborted, or the network failed. The tap falls back to /auth/inapp/go.
      }
    }

    void prefetch();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prefetchNonce, redirect]);

  useEffect(() => {
    if (!isPhoneUserAgent(navigator.userAgent)) return;

    const onCleared = () => {
      freshUrl.current = null;
      setLoading((current) => (current === "x" ? null : current));
      if (restarts.current >= 1) return;
      restarts.current += 1;
      setPrefetchNonce((nonce) => nonce + 1);
    };

    window.addEventListener(X_HANDOFF_CLEARED, onCleared);
    return () => window.removeEventListener(X_HANDOFF_CLEARED, onCleared);
  }, []);

  async function handleGoogle() {
    setLoading("google");
    await signInWithGoogle(redirect);
  }

  async function handleX() {
    if (!isPhoneUserAgent(navigator.userAgent)) {
      setLoading("x");
      await signInWithX(redirect);
      return;
    }

    setLoading("x");
    if (freshUrl.current && isXAuthorizeUrl(freshUrl.current)) {
      markXHandoffPending(freshUrl.current);
      window.location.assign(freshUrl.current);
      return;
    }

    const stored = readStoredAuthorizeUrl();
    if (stored) {
      try {
        const res = await fetch("/auth/inapp/poll", {
          method: "POST",
          cache: "no-store",
        });
        const data = (await res.json()) as {
          status?: string;
          access_token?: string;
          refresh_token?: string;
          next?: string;
        };
        if (
          data.status === "complete" &&
          data.access_token &&
          data.refresh_token
        ) {
          await applyHandedOffSession(router, {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            next: data.next,
          });
          return;
        }
        if (data.status === "pending" || data.status === "exchanging") {
          markXHandoffPending(stored);
          window.location.assign(stored);
          return;
        }
      } catch {
        // Fall through and start a new handoff.
      }
      clearXHandoffPending();
      freshUrl.current = null;
    }

    markXHandoffPending();
    const params = new URLSearchParams();
    if (redirect && redirect !== "/") params.set("redirect", redirect);
    const query = params.toString();
    window.location.assign(query ? `/auth/inapp/go?${query}` : "/auth/inapp/go");
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-[#8b93a1] mt-2">
          Only required if you want to rate or submit a token
        </p>
        {startError && loading !== "x" && (
          <p className="text-sm text-[#f4f6f8] mt-4">
            Could not start X login. Try again.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#1c1f26] bg-[#101215] py-3 hover:bg-[#1c1f26] transition disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading === "google" ? "Connecting..." : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={handleX}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#1c1f26] bg-[#101215] py-3 hover:bg-[#1c1f26] transition disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        {loading === "x" ? "Connecting..." : "Continue with X"}
      </button>

      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#1c1f26] bg-[#101215] py-3 opacity-50 cursor-not-allowed"
      >
        Connect Wallet (coming soon)
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Suspense
        fallback={
          <div className="text-center text-[#8b93a1]">Loading...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}