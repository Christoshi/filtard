"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, readAuthNext, safeNextPath, supabase } from "@/lib/auth";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
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