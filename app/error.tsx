"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <p className="text-sm text-[#6b7280] mb-2">Error</p>
      <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
      <p className="text-[#8b93a1] max-w-md mb-8">
        Please try again. If it keeps happening, come back in a few minutes.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-[#b8ff3d] px-4 py-2.5 text-sm font-medium text-[#07080a] hover:bg-[#c8ff66] transition"
      >
        Try again
      </button>
    </div>
  );
}