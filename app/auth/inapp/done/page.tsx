"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyHandedOffSession,
  loadHandedOffSession,
} from "@/lib/x-handoff-client";

export default function XHandoffDonePage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const session = await loadHandedOffSession();
      if (cancelled) return;
      if (!session) {
        setError(true);
        return;
      }
      const ok = await applyHandedOffSession(router, session);
      if (!cancelled && !ok) setError(true);
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-6">
      <p className="text-center text-[#8b93a1]">
        {error
          ? "Login did not finish. Go back and try again."
          : "Logging you in..."}
      </p>
    </div>
  );
}
