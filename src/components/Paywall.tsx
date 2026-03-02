"use client";

import { useState, useEffect } from "react";
import { capture } from "@/lib/analytics";

export function Paywall({
  onClose,
  onPay,
  loading,
}: {
  onClose: () => void;
  onPay: () => void;
  loading: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const isBusy = loading || busy;

  useEffect(() => {
    capture("paywall_viewed");
  }, []);

  async function handlePay() {
    setBusy(true);
    try {
      await onPay();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 p-6 shadow-xl ring-1 ring-zinc-800">
        <h2 className="text-lg font-semibold text-white">
          You&apos;ve used your free scan
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Get the same full report for your next application. $2 per scan, one-time payment, no subscription.
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handlePay}
            disabled={isBusy}
            className="focus-ring active:opacity-90 w-full rounded-lg bg-white py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <span className="flex items-center justify-center gap-3">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                <span>Processing…</span>
              </span>
            ) : (
              "Pay $2 — one-time"
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="focus-ring mt-4 flex min-h-[44px] w-full items-center justify-center text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
