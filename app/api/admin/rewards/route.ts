import { NextRequest, NextResponse } from "next/server";
import { refreshRewardPages } from "@/lib/reward-cache";
import { sanitizeRewardHtml } from "@/lib/reward-html";
import {
  asRewardPost,
  isRewardInputError,
  parseRewardInput,
} from "@/lib/rewards";
import { isAuthFailure, requireStaff } from "@/lib/server-auth";
import { announceRewardPost } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const POST_COLUMNS =
  "id, title, subtitle, slug, body, cover_image_url, expires_at, created_by, created_at, updated_at, published, telegram_posted_at";

function dbErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "That slug is already in use";
  return error.message;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const { data, error } = await auth.admin
      .from("reward_posts")
      .select(POST_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posts = (data ?? []).map((row) =>
      asRewardPost(row as Record<string, unknown>)
    );
    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("rewards list error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const parsed = parseRewardInput(await request.json().catch(() => null));
    if (isRewardInputError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await auth.admin
      .from("reward_posts")
      .insert({
        title: parsed.title,
        subtitle: parsed.subtitle,
        slug: parsed.slug,
        body: sanitizeRewardHtml(parsed.body),
        cover_image_url: parsed.cover_image_url,
        expires_at: parsed.expires_at,
        published: parsed.published,
        created_by: auth.user.id,
      })
      .select(POST_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json(
        { error: dbErrorMessage(error) },
        { status: error.code === "23505" ? 409 : 500 }
      );
    }

    const post = asRewardPost(data as Record<string, unknown>);
    if (post.published) {
      await announceRewardPost(auth.admin, post.id, post.title, post.slug);
    }
    refreshRewardPages(post.slug);

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
    console.error("rewards create error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
