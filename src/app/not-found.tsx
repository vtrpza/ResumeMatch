import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 text-zinc-400">
        The page you’re looking for doesn’t exist or was moved.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="focus-ring active:opacity-90 inline-block rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Home
        </Link>
        <Link
          href="/scan"
          className="focus-ring active:opacity-90 inline-block rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Scan resume
        </Link>
      </div>
    </main>
  );
}
