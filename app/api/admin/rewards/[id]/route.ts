import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { refreshRewardPages } from "@/lib/reward-cache";
import { sanitizeRewardHtml } from "@/lib/reward-html";
import {
  asRewardPost,
  coverStoragePath,
  isRewardInputError,
  parseRewardInput,
  REWARD_COVERS_BUCKET,
} from "@/lib/rewards";
import { isAuthFailure, requireStaff } from "@/lib/server-auth";
import { announceRewardPost } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const POST_COLUMNS =
  "id, title, subtitle, slug, body, cover_image_url, expires_at, created_by, created_at, updated_at, published, telegram_posted_at";

const ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dbErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "That slug is already in use";
  return error.message;
}

async function removeStoredCover(admin: SupabaseClient, url: string | null) {
  const path = coverStoragePath(url);
  if (!path) return;
  const { error } = await admin.storage.from(REWARD_COVERS_BUCKET).remove([path]);
  if (error) console.error("reward cover delete:", error.message);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const { id } = await params;
    if (!ID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid reward id" }, { status: 400 });
    }

    const parsed = parseRewardInput(await request.json().catch(() => null));
    if (isRewardInputError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data: existing, error: existingError } = await auth.admin
      .from("reward_posts")
      .select("id, slug, cover_image_url")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    const { data, error } = await auth.admin
      .from("reward_posts")
      .update({
        title: parsed.title,
        subtitle: parsed.subtitle,
        slug: parsed.slug,
        body: sanitizeRewardHtml(parsed.body),
        cover_image_url: parsed.cover_image_url,
        expires_at: parsed.expires_at,
        published: parsed.published,
      })
      .eq("id", id)
      .select(POST_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json(
        { error: dbErrorMessage(error) },
        { status: error.code === "23505" ? 409 : 500 }
      );
    }

    const previousCover =
      typeof existing.cover_image_url === "string" ? existing.cover_image_url : null;
    if (previousCover && previousCover !== parsed.cover_image_url) {
      await removeStoredCover(auth.admin, previousCover);
    }

    const post = asRewardPost(data as Record<string, unknown>);
    if (post.published) {
      await announceRewardPost(auth.admin, post.id, post.title, post.slug);
    }
    refreshRewardPages(
      post.slug,
      typeof existing.slug === "string" ? existing.slug : null
    );

    const { data: fresh } = await auth.admin
      .from("reward_posts")
      .select(POST_COLUMNS)
      .eq("id", post.id)
      .maybeSingle();

    return NextResponse.json({
      post: fresh ? asRewardPost(fresh as Record<string, unknown>) : post,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("rewards update error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const { id } = await params;
    if (!ID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid reward id" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await auth.admin
      .from("reward_posts")
      .select("id, slug, cover_image_url")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    const { error } = await auth.admin.from("reward_posts").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const previousCover =
      typeof existing.cover_image_url === "string" ? existing.cover_image_url : null;
    await removeStoredCover(auth.admin, previousCover);
    refreshRewardPages(
      null,
      typeof existing.slug === "string" ? existing.slug : null
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("rewards delete error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
