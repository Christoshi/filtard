export default function Loading() {
  return (
    <div className="w-full">
      {/* Subtitle */}
      <div className="mb-5">
        <div className="h-5 w-64 rounded bg-[#1c1f26] animate-pulse" />
      </div>

      {/* Desktop controls bar skeleton */}
      <div className="hidden md:flex flex-wrap items-center gap-3 sticky top-12 z-40 -mx-6 px-6 py-3 mb-5 border-b border-[#1c1f26] bg-[#07080a]/95">
        <div className="h-8 w-28 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 w-16 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 w-24 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 w-20 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 flex-1 max-w-xs rounded-lg bg-[#1c1f26] animate-pulse" />
      </div>

      {/* Mobile controls skeleton */}
      <div className="flex md:hidden flex-wrap items-center gap-2 mb-4">
        <div className="h-8 w-24 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 w-14 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 w-20 rounded-md bg-[#1c1f26] animate-pulse" />
        <div className="h-8 w-16 rounded-md bg-[#1c1f26] animate-pulse" />
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block border border-[#1c1f26] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[48px_minmax(180px,2fr)_90px_100px_80px_100px_90px_70px] gap-3 px-4 py-3 bg-[#0c0d10] border-b border-[#1c1f26]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-[#1c1f26] animate-pulse"
            />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[48px_minmax(180px,2fr)_90px_100px_80px_100px_90px_70px] gap-3 items-center px-4 py-3.5 border-b border-[#1c1f26] last:border-0"
          >
            <div className="h-4 w-6 mx-auto rounded bg-[#1c1f26] animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#1c1f26] animate-pulse flex-shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="h-4 w-24 rounded bg-[#1c1f26] animate-pulse" />
                <div className="h-3 w-16 rounded bg-[#1c1f26] animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-14 ml-auto rounded bg-[#1c1f26] animate-pulse" />
            <div className="h-4 w-16 ml-auto rounded bg-[#1c1f26] animate-pulse" />
            <div className="h-4 w-12 ml-auto rounded bg-[#1c1f26] animate-pulse" />
            <div className="h-4 w-14 ml-auto rounded bg-[#1c1f26] animate-pulse" />
            <div className="h-4 w-12 ml-auto rounded bg-[#1c1f26] animate-pulse" />
            <div className="h-4 w-8 ml-auto rounded bg-[#1c1f26] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Mobile cards skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#1c1f26] bg-[#0c0d10] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="h-10 w-10 rounded-full bg-[#1c1f26] animate-pulse flex-shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-28 rounded bg-[#1c1f26] animate-pulse" />
                <div className="h-3 w-20 rounded bg-[#1c1f26] animate-pulse" />
              </div>
              <div className="h-5 w-14 rounded bg-[#1c1f26] animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-1.5 px-3 pb-2.5">
              <div className="h-7 w-20 rounded-lg bg-[#1c1f26] animate-pulse" />
              <div className="h-7 w-20 rounded-lg bg-[#1c1f26] animate-pulse" />
              <div className="h-7 w-16 rounded-lg bg-[#1c1f26] animate-pulse" />
              <div className="h-7 w-10 rounded-lg bg-[#1c1f26] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}