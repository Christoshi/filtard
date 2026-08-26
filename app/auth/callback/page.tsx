"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/auth";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  // Only allow same-site relative paths
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("://")) return "/";
  return raw;
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
      }

      const next = safeNextPath(searchParams.get("next"));
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