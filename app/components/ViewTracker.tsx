"use client";

import { useEffect } from "react";
import { getCurrentUser, supabase } from "@/lib/auth";

export default function ViewTracker({ tokenId }: { tokenId: string }) {
  useEffect(() => {
    async function recordView() {
      if (!tokenId) return;

      // Session-based uniqueness (prevents refresh spam)
      const sessionKey = `filtard-viewed-${tokenId}`;
      if (typeof window !== "undefined" && localStorage.getItem(sessionKey)) {
        return;
      }

      const user = await getCurrentUser();
      const sessionId =
        typeof window !== "undefined"
          ? localStorage.getItem("filtard-session-id") ||
            (() => {
              const id = crypto.randomUUID();
              localStorage.setItem("filtard-session-id", id);
              return id;
            })()
          : null;

      // Check if this user/session already viewed
      let query = supabase
        .from("token_views")
        .select("id")
        .eq("token_id", tokenId)
        .limit(1);

      if (user) {
        query = query.eq("viewer_id", user.id);
      } else if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      const { data: existing } = await query;

      if (existing && existing.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(sessionKey, "1");
        }
        return;
      }

      // Insert new unique view
      await supabase.from("token_views").insert({
        token_id: tokenId,
        viewer_id: user?.id || null,
        session_id: user ? null : sessionId,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(sessionKey, "1");
      }
    }

    recordView();
  }, [tokenId]);

  return null;
}