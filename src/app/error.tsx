"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 text-zinc-400">
        We&apos;ve been notified. You can try again or head back home.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="focus-ring active:opacity-90 disabled:opacity-50 inline-block rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed"
        >
          Try again
        </button>
        <Link
          href="/"
          className="focus-ring active:opacity-90 inline-block rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
