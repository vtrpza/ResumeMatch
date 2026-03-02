"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", padding: "2rem", background: "#18181b", color: "#fafafa" }}>
        <h1>Something went wrong</h1>
        <p>We&apos;ve been notified. Please try again or come back later.</p>
      </body>
    </html>
  );
}
