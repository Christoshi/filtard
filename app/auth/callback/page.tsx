"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, supabase } from "@/lib/auth";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("://")) return "/";
  return raw;
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      await supabase.auth.getSession();

      let stored: string | null = null;
      if (typeof window !== "undefined") {
        stored = sessionStorage.getItem("auth_next");
        sessionStorage.removeItem("auth_next");
      }

      const next = safeNextPath(stored || searchParams.get("next"));

      const user = await getCurrentUser();
      if (user && !user.display_name) {
        router.push(
          `/setup-username?redirect=${encodeURIComponent(next)}`
        );
        return;
      }

      router.push(next);
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <p className="text-[#8b93a1]">Logging you in...</p>
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