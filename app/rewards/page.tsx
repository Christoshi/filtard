import type { Metadata } from "next";
import RewardCard from "@/app/components/RewardCard";
import { listPublishedRewards } from "@/lib/reward-public";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const ogImage = `${siteUrl}/og/home.png`;

export const metadata: Metadata = {
  title: "Rewards",
  description: "Rewards and offers from Filtard.",
  openGraph: {
    title: "Rewards",
    description: "Rewards and offers from Filtard.",
    url: `${siteUrl}/rewards`,
    siteName: "Filtard",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Filtard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rewards",
    description: "Rewards and offers from Filtard.",
    images: [ogImage],
  },
};

export const revalidate = 60;

export default async function RewardsPage() {
  const posts = await listPublishedRewards();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Rewards
        </h1>
        <p className="mt-1.5 text-sm text-[#8b93a1]">
          Rewards and offers from Filtard
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-[#1c1f26] p-16 text-center text-[#8b93a1]">
          No rewards yet
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <RewardCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
