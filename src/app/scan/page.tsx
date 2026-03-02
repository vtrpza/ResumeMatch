"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
import { ScanLoadingView } from "@/components/ScanLoadingView";
import { PageLoadingView } from "@/components/PageLoadingView";

const LOADING_STEPS = [
  "Reading your resume…",
  "Comparing to job requirements…",
  "Building your report…",
] as const;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState<boolean | null>(null);
  const [usageError, setUsageError] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRoute("scan");
  }, []);

  const JD_DRAFT_KEY = "scan_jd_draft";

  // Prefill JD from draft after scan error
  useEffect(() => {
    const draft = sessionStorage.getItem(JD_DRAFT_KEY);
    if (!draft) return;
    sessionStorage.removeItem(JD_DRAFT_KEY);
    const ta = document.getElementById("jd");
    if (ta && ta instanceof HTMLTextAreaElement && !ta.value.trim()) {
      ta.value = draft;
    }
  }, []);

  // Step-based loading progress
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    const sessionId = getOrCreateSessionId();
    async function check() {
      if (searchParams.get("success") === "1") {
        const res = await fetch(`/api/usage?sessionId=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const u = await res.json();
          if (u && typeof u.purchasedScans === "number" && u.purchasedScans > 0) {
            setPremium();
            capture("checkout_completed", { source: "redirect" });
            capture("premium_unlocked", { source: "checkout" });
          }
        }
        router.replace("/scan", { scroll: false });
      }

      const res = await fetch(`/api/usage?sessionId=${encodeURIComponent(sessionId)}`).catch(() => null);
      if (cancelled) return;
      if (!res || res.status === 503 || res.status >= 500) {
        setUsageError(!!res);
        setShowPaywall(false);
        return;
      }
      setUsageError(false);
      if (res.ok) {
        const u = await res.json().catch(() => null);
        if (u != null && typeof u.scanCount === "number" && typeof u.purchasedScans === "number") {
          setShowPaywall(u.scanCount >= 1 + u.purchasedScans);
          return;
        }
      }
      setShowPaywall(shouldShowPaywall());
    }
    check();
    return () => { cancelled = true; };
  }, [searchParams, router]);

  const MIN_JD_LENGTH = 50;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const resume = formData.get("resume") as File | null;
    const jd = formData.get("jd") as string | null;
    const jdTrimmed = (jd ?? "").trim();
    if (jdTrimmed.length < MIN_JD_LENGTH) {
      setError("Please paste a longer job description so we can give you useful feedback.");
      setLoading(false);
      return;
    }
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
        if (jdTrimmed) sessionStorage.setItem(JD_DRAFT_KEY, jdTrimmed);
        return;
      }
      if (result.analysis) {
        captureScanCompleted({
          matchScore: result.analysis.matchScore,
          confidence: result.analysis.confidence,
          extractionQuality: result.analysis.extractionQuality,
          model: result.analysis.model,
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
      if (jdTrimmed) sessionStorage.setItem(JD_DRAFT_KEY, jdTrimmed);
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

  if (showPaywall === null && !usageError) {
    return <PageLoadingView variant="scan" />;
  }

  if (usageError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="-mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Back
        </Link>
        <p className="mt-4 text-zinc-300">
          Usage check unavailable. Please try again later.
        </p>
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

  function setFile(file: File | null) {
    const input = fileInputRef.current;
    if (!input) return;
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      setSelectedFileName(file.name);
      captureFileUpload(file);
    } else {
      input.value = "";
      setSelectedFileName(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File must be under 5 MB.");
      return;
    }
    setError(null);
    setFile(file);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-10 pb-24 sm:px-6 sm:py-12 sm:pb-12">
      <Link
        href="/"
        className="focus-ring -mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Back
      </Link>

      {loading && (
        <ScanLoadingView loadingStep={loadingStep} steps={LOADING_STEPS} />
      )}

      <div
        aria-hidden={loading}
        className={loading ? "absolute h-0 w-0 overflow-hidden opacity-0 pointer-events-none" : undefined}
      >
        <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
          Scan your resume
        </h1>
        <p className="mt-2 text-zinc-400">
          Upload your resume (PDF) and paste the job description. Your data is processed securely and not stored.
        </p>

        <form
          id="scan-form"
          className="mt-8 space-y-6 sm:space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(new FormData(e.currentTarget));
          }}
        >
        <input
          type="hidden"
          name="sessionId"
          value={getOrCreateSessionId()}
        />
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Resume (PDF)
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Max 5 MB. We don&apos;t store your file.
          </p>
          <input
            ref={fileInputRef}
            id="resume"
            name="resume"
            type="file"
            accept="application/pdf"
            required
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFile(file || null);
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload resume PDF (required). Click or drop file here."
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`focus-ring mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition-colors duration-150 sm:min-h-[140px] ${
              dragActive
                ? "border-zinc-500 bg-zinc-800/50"
                : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/30"
            }`}
          >
            {selectedFileName ? (
              <>
                <span className="text-lg text-emerald-400">✓</span>
                <p className="mt-2 text-sm font-medium text-white">{selectedFileName}</p>
                <p className="mt-0.5 text-xs text-zinc-500">Click or drop a different file</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-300">Drop your PDF here or click to browse</p>
                <p className="mt-1 text-xs text-zinc-500">PDF only, max 5 MB</p>
              </>
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor="jd"
            className="block text-sm font-medium text-zinc-300"
          >
            Job description
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Paste the full job posting—requirements, responsibilities, and qualifications.
          </p>
          <textarea
            id="jd"
            name="jd"
            rows={10}
            required
            placeholder="Paste the full job description here…"
            className="mt-2 min-h-[140px] w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 sm:min-h-[180px]"
            onFocus={() => {
              const textarea = document.getElementById("jd") as HTMLTextAreaElement;
              if (textarea && textarea.value.length === 0) {
                captureTextInput("", "jd");
              }
            }}
            onChange={(e) => {
              const text = e.target.value;
              if (text.length > 50 && text.length < 200) {
                captureTextInput(text, "jd");
              }
            }}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="break-words rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-300"
          >
            {error}
          </p>
        )}
      </form>
      </div>

      <div className="sticky bottom-0 -mx-4 bg-zinc-950 py-4 px-4 sm:static sm:mx-0 sm:bg-transparent sm:p-0">
        <button
          form="scan-form"
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-live={loading ? "polite" : undefined}
          aria-label={loading ? `Scan in progress: ${LOADING_STEPS[loadingStep]}` : "Run scan"}
          className="focus-ring active:opacity-90 w-full min-w-[7.5rem] rounded-lg bg-white px-6 py-3.5 text-sm font-medium text-zinc-900 transition-[background-color,opacity] duration-200 ease-out hover:bg-zinc-200 disabled:opacity-90 disabled:cursor-not-allowed sm:w-auto"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2.5" aria-hidden>
              <span className="spinner-ring shrink-0" />
              <span>{LOADING_STEPS[loadingStep]}</span>
            </span>
          ) : (
            "Run scan"
          )}
        </button>
      </div>
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<PageLoadingView variant="suspense" />}>
      <ScanContent />
    </Suspense>
  );
}
