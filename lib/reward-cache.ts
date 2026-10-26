import { revalidatePath, revalidateTag } from "next/cache";

export function refreshRewardPages(
  slug?: string | null,
  previousSlug?: string | null
) {
  try {
    revalidateTag("rewards", "max");
    revalidatePath("/rewards");
    revalidatePath("/", "layout");
    if (slug) revalidatePath(`/rewards/${slug}`);
    if (previousSlug && previousSlug !== slug) {
      revalidatePath(`/rewards/${previousSlug}`);
    }
  } catch (err) {
    console.error("reward revalidate failed:", err);
  }
}
