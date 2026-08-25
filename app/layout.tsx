import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import HeaderAuth from "./components/HeaderAuth";
import MobileBottomNav from "./components/MobileBottomNav";
import TopTicker from "./components/TopTicker";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://filtard.com";

export const metadata: Metadata = {
  title: {
    default: "Filtard",
    template: "%s | Filtard",
  },
  description:
    "Community-curated memecoins with theses, ratings, and live data.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Filtard",
    description:
      "Community-curated memecoins with theses, ratings, and live data.",
    url: siteUrl,
    siteName: "Filtard",
    type: "website",
    images: [
      {
        url: `${siteUrl}/api/og/site`,
        width: 1200,
        height: 630,
        alt: "Filtard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Filtard",
    description:
      "Community-curated memecoins with theses, ratings, and live data.",
    images: [`${siteUrl}/api/og/site`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-[#07080a] text-[#f4f6f8] pb-20 md:pb-0">
        <header className="sticky top-0 z-50 border-b border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
          <div className="flex items-center px-3 py-2.5 md:px-6 md:py-3 gap-3">
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-semibold tracking-tight flex-shrink-0"
            >
              <img
                src="/logo.png"
                alt="Filtard"
                className="h-9 w-9 rounded-md object-contain"
              />
              Filtard
            </Link>

            <TopTicker />

            <div className="hidden md:block">
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">{children}</main>

        <MobileBottomNav />
      </body>
    </html>
  );
}