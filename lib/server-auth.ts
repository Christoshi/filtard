import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isStaffRole, type UserRole } from "@/lib/roles";

export type AuthedAdmin = {
  user: User;
  role: UserRole;
  admin: SupabaseClient;
};

type AuthFailure = {
  response: NextResponse;
};

export function isAuthFailure(
  result: AuthedAdmin | AuthFailure
): result is AuthFailure {
  return "response" in result;
}

export async function requireUser(
  request: NextRequest
): Promise<AuthedAdmin | AuthFailure> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      response: NextResponse.json(
        { error: "Supabase URL or anon key is not set" },
        { status: 500 }
      ),
    };
  }

  if (!serviceKey) {
    return {
      response: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
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
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole) || "user";

  return { user, role, admin };
}

export async function requireStaff(
  request: NextRequest
): Promise<AuthedAdmin | AuthFailure> {
  const auth = await requireUser(request);
  if (isAuthFailure(auth)) return auth;

  if (!isStaffRole(auth.role)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}
