"use client";

import { useState, useEffect } from "react";
import { capture } from "@/lib/analytics";

const SPRINT_PRICE = "$12/week";
const PRO_PRICE = "$29/month";

export function Paywall({
  onClose,
  onSelectSprint,
  onSelectPro,
  loading,
}: {
  onClose: () => void;
  onSelectSprint: () => void;
  onSelectPro: () => void;
  loading: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const isBusy = loading || busy;

  useEffect(() => {
    capture("paywall_viewed");
  }, []);

  async function handleSprint() {
    setBusy(true);
    try {
      await onSelectSprint();
    } finally {
      setBusy(false);
    }
  }

  async function handlePro() {
    setBusy(true);
    try {
      await onSelectPro();
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
          Unlock more scans and premium features.
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleSprint}
            disabled={isBusy}
            className="w-full rounded-lg bg-white py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            Sprint — {SPRINT_PRICE}
          </button>
          <button
            type="button"
            onClick={handlePro}
            disabled={isBusy}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            Pro — {PRO_PRICE}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center text-sm text-zinc-500 hover:text-zinc-300"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
