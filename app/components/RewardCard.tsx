import Link from "next/link";
import { isRewardExpired, type RewardCardData } from "@/lib/rewards";

export function ExpiredLabel() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded bg-yellow-500/15 px-1.5 py-0.5 text-[11px] text-yellow-400">
      Expired
    </span>
  );
}

export default function RewardCard({ post }: { post: RewardCardData }) {
  const expired = isRewardExpired(post.expires_at);

  return (
    <Link
      href={`/rewards/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#1c1f26] bg-[#0c0d10] transition hover:border-[#3a3f4b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8ff3d]"
    >
      <div className="aspect-[16/9] overflow-hidden bg-[#14171d]">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-[#14171d]" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold tracking-tight text-[#f4f6f8] transition group-hover:text-[#b8ff3d]">
            {post.title}
          </h2>
          {expired ? <ExpiredLabel /> : null}
        </div>
        {post.subtitle ? (
          <p className="line-clamp-2 text-sm text-[#8b93a1]">{post.subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}
