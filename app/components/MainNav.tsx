"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MainNav() {
  const pathname = usePathname();
  const rewardsActive =
    pathname === "/rewards" || pathname.startsWith("/rewards/");

  return (
    <nav aria-label="Main" className="flex items-center flex-shrink-0">
      <Link
        href="/rewards"
        className={`whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition md:px-2.5 ${
          rewardsActive
            ? "text-[#b8ff3d]"
            : "text-[#8b93a1] hover:text-white"
        }`}
        aria-current={rewardsActive ? "page" : undefined}
      >
        Rewards
      </Link>
    </nav>
  );
}
