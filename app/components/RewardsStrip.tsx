import RewardCard from "@/app/components/RewardCard";
import RewardsStripView from "@/app/components/RewardsStripView";
import { listSpotlightRewards } from "@/lib/reward-public";

export default async function RewardsStrip() {
  const posts = await listSpotlightRewards();
  if (posts.length === 0) return null;

  return (
    <RewardsStripView slugs={posts.map((post) => post.slug)}>
      {posts.map((post) => (
        <RewardCard key={post.id} post={post} />
      ))}
    </RewardsStripView>
  );
}
