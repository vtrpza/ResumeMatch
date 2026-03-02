"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setRoute } from "@/lib/sentry";
import { runScan } from "./actions";
import { Paywall } from "@/components/Paywall";
import {
  shouldShowPaywall,
  setFreeScanUsed,
  setPremium,
  getOrCreateSessionId,
} from "@/lib/cookies";
import { capture, captureFileUpload, captureTextInput, captureScanCompleted, captureScanFailed } from "@/lib/analytics";

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState<boolean | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    setRoute("scan");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sessionId = getOrCreateSessionId();
    async function check() {
      if (searchParams.get("success") === "1") {
        const u = await fetch(`/api/usage?sessionId=${encodeURIComponent(sessionId)}`).then((r) => r.json());
        if (u && typeof u.purchasedScans === "number" && u.purchasedScans > 0) {
          setPremium();
          capture("checkout_completed", { source: "redirect" });
          capture("premium_unlocked", { source: "checkout" });
        }
        router.replace("/scan", { scroll: false });
      }
      const u = await fetch(`/api/usage?sessionId=${encodeURIComponent(sessionId)}`).then((r) => r.json()).catch(() => null);
      if (!cancelled) {
        if (u && typeof u.scanCount === "number" && typeof u.purchasedScans === "number") {
          setShowPaywall(u.scanCount >= 1 + u.purchasedScans);
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
    const resume = formData.get("resume") as File | null;
    const jd = formData.get("jd") as string | null;
    capture("scan_started", {
      file_size: resume?.size,
      file_size_bucket: resume ? (resume.size < 100 * 1024 ? "<100KB" : resume.size < 500 * 1024 ? "100-500KB" : resume.size < 1024 * 1024 ? "500KB-1MB" : resume.size < 2 * 1024 * 1024 ? "1-2MB" : resume.size < 5 * 1024 * 1024 ? "2-5MB" : "5MB+") : undefined,
      jd_length: jd?.length,
      jd_length_bucket: jd ? (jd.length < 100 ? "<100" : jd.length < 500 ? "100-500" : jd.length < 1000 ? "500-1K" : jd.length < 2000 ? "1K-2K" : jd.length < 5000 ? "2K-5K" : "5K+") : undefined,
    });
    try {
      const result = await runScan(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        captureScanFailed(result.error);
        return;
      }
      if (result.analysis) {
        captureScanCompleted({
          matchScore: result.analysis.matchScore,
          // Note: confidence and extractionQuality would come from actual analysis
          // For now, we'll add them when the real implementation is in place
        });
      } else {
        capture("scan_completed");
      }
      setFreeScanUsed(); // fallback when DB unavailable
      sessionStorage.setItem("scan_analysis", JSON.stringify(result.analysis));
      router.push("/result");
    } catch (err) {
      captureScanFailed(err instanceof Error ? err.message : "Unknown error", {
        error_type: "exception",
      });
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    capture("checkout_started");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getOrCreateSessionId() }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      capture("checkout_failed", { error: data.error ?? "Unknown error" });
      setError(data.error ?? "Checkout failed");
    }
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
          onPay={handlePay}
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
        Upload your resume (PDF) and paste the job description below. Your data is processed securely and not stored.
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
          <p className="mt-1 text-xs text-zinc-500">
            Max 5 MB. Works best with standard single-column layouts. We don&apos;t store your file.
          </p>
          <input
            id="resume"
            name="resume"
            type="file"
            accept="application/pdf"
            required
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-4 file:min-h-[44px] file:rounded file:border-0 file:bg-zinc-700 file:px-4 file:py-2.5 file:text-white file:transition file:hover:bg-zinc-600"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setSelectedFileName(file ? file.name : null);
              captureFileUpload(file || null);
            }}
          />
          {selectedFileName && (
            <p className="mt-2 text-sm text-zinc-400">
              ✓ {selectedFileName}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="jd"
            className="block text-sm font-medium text-zinc-300"
          >
            Job description
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Paste the complete job posting, including requirements, responsibilities, and qualifications.
          </p>
          <textarea
            id="jd"
            name="jd"
            rows={10}
            required
            placeholder="Example:&#10;&#10;Senior Software Engineer&#10;Company: TechCorp Inc.&#10;&#10;Requirements:&#10;• 5+ years experience with React and Node.js&#10;• Experience with cloud platforms (AWS, GCP)&#10;• Strong problem-solving skills&#10;&#10;[Paste full job description here...]"
            className="mt-2 min-h-[140px] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:min-h-[180px]"
            onFocus={() => {
              // Track when user starts entering JD (first focus)
              const textarea = document.getElementById("jd") as HTMLTextAreaElement;
              if (textarea && textarea.value.length === 0) {
                captureTextInput("", "jd");
              }
            }}
            onChange={(e) => {
              // Track when user pastes/enters substantial content
              const text = e.target.value;
              if (text.length > 50 && text.length < 200) {
                // Only capture once when they start entering content
                captureTextInput(text, "jd");
              }
            }}
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
            className="w-full rounded-lg bg-white px-6 py-3.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent"></span>
                Analyzing your resume…
              </span>
            ) : (
              "Run scan"
            )}
          </button>
          {loading && (
            <p className="mt-2 text-xs text-zinc-500 sm:mt-3">
              Extracting content, comparing against job requirements, and generating your report. This usually takes 10–20 seconds.
            </p>
          )}
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
