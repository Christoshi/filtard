import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
 title: "About",
 description:
 "Filtard is a brutally selective, community-curated memecoin screener. Discover highest-conviction plays you can hold with confidence.",
};

export default function AboutPage() {
 return (
 <div className="max-w-3xl mx-auto">
 <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">
 About Filtard
 </h1>

 {/* Intro */}
 <section className="mb-12">
 <p className="text-lg text-[#f4f6f8] leading-relaxed mb-4">
 Filtard is a brutally selective, community-curated memecoin screener.
 </p>
 <p className="text-[#9ca3af] leading-relaxed">
 Our goal is to help you discover new and existing memecoins you can
 trade or hold with confidence. But nothing on this site is financial advice.
 </p>
 </section>

 {/* How we curate */}
 <section className="mb-12">
 <h2 className="text-lg font-semibold text-[#f4f6f8] mb-4 tracking-tight">
 How we curate
 </h2>
 <div className="space-y-4 text-[#9ca3af] leading-relaxed">
 <p>
 Anyone can submit a memecoin for listing, but only the ones that meet
 the Filtard standard will be approved.
 </p>
 <p>
 We look for memecoins with meaningful lore, a strong thesis, clear
 narrative, organic traction, an active community, and that are
 actually funny or highly relatable.
 </p>
 <p className="text-[#f4f6f8]">
 Would you stake your reputation on it? If the answer is yes, then it
 will most likely be approved.
 </p>
 <p>
 The goal is to remove the 95% noise and give you the 5% raw alpha.
 </p>
 </div>
 </section>

  {/* Ideal Filtard coins */}
 <section className="mb-12">
 <h2 className="text-lg font-semibold text-[#f4f6f8] mb-4 tracking-tight">
 The ideal Filtard coins
 </h2>
 <div className="space-y-4 text-[#9ca3af] leading-relaxed">
 <p>
 We aim to list coins you’ll be comfortable buying, holding, and
 bagworking.
 </p>
 <p>
 The idea is to help you discover interesting or valuable memecoins that resonate, so you can have fun while making money.
 </p>
 <p>
 Coins you can buy and sleep on, knowing you invested
 in something with a higher probability of survival.
 </p>
 <p className="text-[#f4f6f8]">
 The ideal Filtard coins are  high-conviction plays you can hold, DCA into, and bullpost with pride, not the usual quick flips that can rug the next minute.
 </p>
 </div>
 </section>

 {/* Founder Story */}
 <section className="mb-12">
 <h2 className="text-lg font-semibold text-[#f4f6f8] mb-4 tracking-tight">
 Founder Story
 </h2>
 <div className="space-y-4 text-[#9ca3af] leading-relaxed">
 <p>
 I’m Christoshi (Chris + Satoshi), a crypto alias I adopted when I
 went all-in in 2020.
 </p>
 <p>
 I bought my first Bitcoin in July 2017 after a friend introduced me
 to crypto. He had been trying to onboard me for almost a year before
 I finally decided to pay attention and give it a try. That turned
 out to be one of the best decisions of my life, for reasons far
 beyond money.
 </p>
 <p>
 At the time, I was already running a successful offline
 business, in the IT services sector. I’m a Business
 Administration graduate, and entrepreneurship has always come
 naturally to me. I started my first business at 18, before
 university, and continued running side gigs and small  businesses throughout my
 university years before eventually starting my company. It was
 during that time I met this friend who introduced me to Bitcoin.
 </p>
 <p>
 After about a year of playing around with Bitcoin — mostly investing
 in Bitcoin-based Ponzi schemes like BitConnect — I realized crypto
 was more than just some internet money. It was freedom, and open
 access to a global financial system where anyone could participate.
 </p>
 <p>
 In 2020, I went all-in. I spent my time learning, trading,
 experimenting, and documenting the journey. I first started
 publishing on Medium and Publish0x, where I won multiple writing
 competitions. Then I launched my own crypto blog, CryptoSorted, in
 January 2020. Over the next three years, thousands of readers
 followed my research, market insights, and educational content
 before I successfully sold the blog in 2023.
 </p>
 <p>
 Like every entrepreneur, not everything I built was a success. In
 December 2024, I launched GoldenFishDAO, an on-chain trading fund,
 which failed to take off after launch due to technical issues and
 problems with the launch platform. Later, in early 2026, I launched
 Yeshi, a prediction market app that’s currently available on the
 Solana Seeker dApp Store. While the product works, continuing
 development became impractical without the funding needed to compete
 at the level I believe users deserve.
 </p>
 <p>
 These experiences taught me that building successful crypto products
 isn’t just about having good ideas. It’s about solving real problems
 with products people genuinely find valuable.
 </p>
 <p className="text-[#f4f6f8] font-medium italic pt-2">
 “Build relentlessly.”
 </p>
 </div>
 </section>

 </div>
 );
}