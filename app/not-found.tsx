import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <p className="text-sm text-[#6b7280] mb-2">404</p>
      <h1 className="text-2xl font-semibold mb-3">Page not found</h1>
      <p className="text-[#8b93a1] max-w-md mb-8">
        This page does not exist. It may have been removed or the link is
        wrong.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[#b8ff3d] px-4 py-2.5 text-sm font-medium text-[#07080a] hover:bg-[#c8ff66] transition"
      >
        Back to Filtard
      </Link>
    </div>
  );
}