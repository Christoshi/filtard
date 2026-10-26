"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function useRewardsActive() {
  const pathname = usePathname();
  return pathname === "/rewards" || pathname.startsWith("/rewards/");
}

export function DesktopRewardsLink() {
  const rewardsActive = useRewardsActive();

  return (
    <Link
      href="/rewards"
      className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium"
      aria-current={rewardsActive ? "page" : undefined}
    >
      <span aria-hidden="true" className="text-base leading-none">
        🎁
      </span>
      <span className="text-[#8b93a1] transition group-hover:text-white">
        Rewards
      </span>
    </Link>
  );
}

export default function MainNav() {
  const rewardsActive = useRewardsActive();

  return (
    <nav aria-label="Main" className="flex items-center flex-shrink-0 md:hidden">
      <Link
        href="/rewards"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[#b8ff3d] px-3.5 py-1.5 text-sm font-medium text-black transition hover:bg-[#a3e635]"
        aria-current={rewardsActive ? "page" : undefined}
      >
        <span aria-hidden="true" className="text-base leading-none">
          🎁
        </span>
        Rewards
      </Link>
    </nav>
  );
}
