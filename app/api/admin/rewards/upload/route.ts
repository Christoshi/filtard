import { NextRequest, NextResponse } from "next/server";
import { REWARD_COVERS_BUCKET } from "@/lib/rewards";
import { isAuthFailure, requireStaff } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Cover must be a JPEG, PNG, WEBP, or GIF" },
        { status: 400 }
      );
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Cover image must be under 5MB" },
        { status: 400 }
      );
    }

    const path = `covers/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await auth.admin.storage
      .from(REWARD_COVERS_BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("reward cover upload:", error.message);
      return NextResponse.json(
        { error: "Could not upload the cover image" },
        { status: 500 }
      );
    }

    const { data } = auth.admin.storage.from(REWARD_COVERS_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("reward cover upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
