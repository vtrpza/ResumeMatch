"use client";

import { useEffect } from "react";

/**
 * PostHog initialization. Loads PostHog script if key is configured.
 * Must be a client component and placed in the root layout.
 * Uses PostHog snippet approach for lean integration.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"; // pragma: allowlist secret

    if (!key || typeof window === "undefined") return;

    // Only load if not already loaded
    if ((window as unknown as { posthog?: unknown }).posthog) return;

    // PostHog snippet initialization
    (function () {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = `${host}/static/array.js`;
      script.onload = () => {
        // Initialize PostHog after script loads
        const posthog = (window as unknown as { posthog?: { init: (key: string, options: { api_host: string }) => void } }).posthog;
        if (posthog) {
          posthog.init(key, {
            api_host: host,
          });
          if (process.env.NODE_ENV === "development") {
            console.log("PostHog initialized");
          }
        }
      };
      const firstScript = document.getElementsByTagName("script")[0];
      if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    })();
  }, []);

  return <>{children}</>;
}
