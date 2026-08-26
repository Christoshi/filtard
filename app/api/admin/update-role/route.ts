import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["user", "curator", "admin"]);

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: caller } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !caller ||
      (caller.role !== "admin" && caller.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const userId = body?.userId as string | undefined;
    const newRole = body?.role as string | undefined;

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    if (newRole === "admin" && caller.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only a super admin can assign the admin role" },
        { status: 403 }
      );
    }

    const { data: target } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "super_admin") {
      return NextResponse.json(
        { error: "Super admin role cannot be changed" },
        { status: 403 }
      );
    }

    const { error } = await admin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: newRole });
  } catch (err: any) {
    console.error("update-role error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}