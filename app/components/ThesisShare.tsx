"use client";

export default function ThesisShare({
  symbol,
}: {
  symbol: string;
  thesis?: string;
}) {
  const shareText = `$${symbol} thesis by @filtard\n${typeof window !== "undefined" ? window.location.href : ""}`;

  function handleShareX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-5 pt-4 border-t border-[#1c1f26] flex items-center gap-3">
      <button
        onClick={handleShareX}
        className="text-xs text-[#b8ff3d] hover:text-white border border-[#2a2e38] hover:border-[#3a3f4b] bg-[#101215] rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5"
      >
        Share to
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      <a
        href="https://fomo.family/r/christoshi_"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-[#b8ff3d] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#a3e635] transition"
      >
        Trade on Fomo
      </a>
    </div>
  );
}