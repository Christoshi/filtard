import { NextRequest, NextResponse } from "next/server";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { isAuthFailure, requireStaff } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set<string>(ASSIGNABLE_ROLES);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const body = await request.json().catch(() => null);
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

    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    if (newRole === "admin" && auth.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only a super admin can assign the admin role" },
        { status: 403 }
      );
    }

    const { data: target } = await auth.admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "super_admin") {
      return NextResponse.json(
        { error: "Super admin role cannot be changed" },
        { status: 403 }
      );
    }

    if (target.role === "admin" && auth.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only a super admin can change an admin" },
        { status: 403 }
      );
    }

    const { error } = await auth.admin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: newRole });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("update-role error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
