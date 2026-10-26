import Link from "next/link";
import RewardCard from "@/app/components/RewardCard";
import { listSpotlightRewards } from "@/lib/reward-public";

export default async function RewardsStrip() {
  const posts = await listSpotlightRewards();
  if (posts.length === 0) return null;

  return (
    <section aria-label="Rewards" className="px-3 pt-2 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Rewards</h2>
          <Link
            href="/rewards"
            className="text-sm text-[#b8ff3d] transition hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <RewardCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
