"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
      }
      router.push("/admin");
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <p className="text-[#8b93a1]">Logging you in...</p>
    </div>
  );
}