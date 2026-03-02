"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { runScan } from "./actions";
import { Paywall } from "@/components/Paywall";
import {
  shouldShowPaywall,
  setFreeScanUsed,
  setPremium,
  getOrCreateSessionId,
} from "@/lib/cookies";

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (searchParams.get("success") === "1") {
        const u = await fetch("/api/usage").then((r) => r.json());
        if (u?.hasSubscription) setPremium();
        router.replace("/scan", { scroll: false });
      }
      const u = await fetch("/api/usage").then((r) => r.json()).catch(() => null);
      if (!cancelled) {
        if (u && typeof u.scanCount === "number" && typeof u.hasSubscription === "boolean") {
          setShowPaywall(u.scanCount >= 1 && !u.hasSubscription);
        } else {
          setShowPaywall(shouldShowPaywall());
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, [searchParams, router]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await runScan(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFreeScanUsed(); // fallback when DB unavailable
      sessionStorage.setItem("scan_analysis", JSON.stringify(result.analysis));
      router.push("/result");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(plan: "sprint" | "pro") {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, sessionId: getOrCreateSessionId() }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setError(data.error ?? "Checkout failed");
  }

  if (showPaywall === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-zinc-400">Loading…</p>
      </main>
    );
  }

  if (showPaywall) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="-mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Back
        </Link>
        <Paywall
          onClose={() => router.push("/")}
          onSelectSprint={() => handleCheckout("sprint")}
          onSelectPro={() => handleCheckout("pro")}
          loading={loading}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-10 pb-24 sm:px-6 sm:py-12 sm:pb-12">
      <Link
        href="/"
        className="-mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
        Scan your resume
      </h1>
      <p className="mt-2 text-zinc-400">
        Upload your resume (PDF) and paste the job description below.
      </p>

      <form action={handleSubmit} className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
        <input
          type="hidden"
          name="sessionId"
          value={getOrCreateSessionId()}
        />
        <div>
          <label
            htmlFor="resume"
            className="block text-sm font-medium text-zinc-300"
          >
            Resume (PDF)
          </label>
          <p className="mt-1 text-xs text-zinc-500">Max 5 MB</p>
          <input
            id="resume"
            name="resume"
            type="file"
            accept="application/pdf"
            required
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-4 file:min-h-[44px] file:rounded file:border-0 file:bg-zinc-700 file:px-4 file:py-2.5 file:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="jd"
            className="block text-sm font-medium text-zinc-300"
          >
            Job description
          </label>
          <textarea
            id="jd"
            name="jd"
            rows={10}
            required
            placeholder="Paste the full job description here..."
            className="mt-2 min-h-[140px] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:min-h-[180px]"
          />
        </div>
        {error && (
          <p className="break-words rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="sticky bottom-0 -mx-4 bg-zinc-950 py-4 px-4 sm:static sm:mx-0 sm:bg-transparent sm:p-0">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-6 py-3.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Analyzing…" : "Run scan"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12"><p className="text-zinc-400">Loading…</p></main>}>
      <ScanContent />
    </Suspense>
  );
}
