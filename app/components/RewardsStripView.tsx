"use client";

import { Children, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { spotlightPostsForPath } from "@/lib/rewards";

export default function RewardsStripView({
  slugs,
  children,
}: {
  slugs: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const visible = spotlightPostsForPath(
    slugs.map((slug) => ({ slug })),
    pathname
  );
  if (visible.length === 0) return null;

  const cards = Children.toArray(children);
  const visibleCards = visible.flatMap((post) => {
    const index = slugs.indexOf(post.slug);
    const card = cards[index];
    return card ? [card] : [];
  });
  if (visibleCards.length === 0) return null;

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
          {visibleCards}
        </div>
      </div>
    </section>
  );
}
