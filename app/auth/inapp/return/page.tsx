export default async function XHandoffReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const failed = params.error === "1";

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-6">
      <p className="max-w-sm text-center text-[#f4f6f8]">
        {failed
          ? "Login did not finish. Go back and try again."
          : "You're logged in. Go back to the browser you started in."}
      </p>
    </div>
  );
}
