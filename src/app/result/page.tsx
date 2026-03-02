"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { capture } from "@/lib/analytics";

export default function ResultPage() {
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analysisJson = sessionStorage.getItem("scan_analysis");
    if (analysisJson) {
      try {
        setAnalysis(JSON.parse(analysisJson) as unknown);
      } catch {
        setAnalysis(null);
      }
    }
    setLoading(false);
  }, []);

  const resultViewedSent = useRef(false);
  useEffect(() => {
    if (analysis !== null && !resultViewedSent.current) {
      resultViewedSent.current = true;
      capture("result_viewed");
    }
  }, [analysis]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white"></div>
          <p className="mt-4 text-sm text-zinc-400">Loading your results...</p>
        </div>
      </main>
    );
  }

  if (analysis === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-base text-zinc-300">
            Your report isn&apos;t here—it may have been cleared.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Run a new scan to get your analysis.
          </p>
          <Link
            href="/scan"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Run a new scan
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="-mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 transition hover:text-zinc-300"
      >
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
        Your scan results
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Review the analysis below and take action on the recommendations.
      </p>

      <AnalysisView data={analysis} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/scan"
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Scan another resume →
        </Link>
      </div>
    </main>
  );
}

const cardClass =
  "rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6";

function AnalysisView({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedBullets, setCopiedBullets] = useState<Record<number, boolean>>({});
  const summary =
    typeof d.tailoredSummary === "string" ? d.tailoredSummary : "";

  const handleCopySummary = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // no-op
    }
  }, [summary]);

  const handleCopyBullet = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBullets((prev) => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopiedBullets((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }, 2000);
    } catch {
      // no-op
    }
  }, []);

  const weakBullets = Array.isArray(d.weakBullets) ? d.weakBullets as string[] : [];
  const rewrittenBullets = Array.isArray(d.rewrittenBullets)
    ? (d.rewrittenBullets as string[])
    : [];
  const canPair =
    weakBullets.length > 0 &&
    rewrittenBullets.length > 0 &&
    weakBullets.length === rewrittenBullets.length;

  const showLowQualityNotice =
    d.extractionQuality === "low" ||
    (typeof d.confidence === "number" && d.confidence < 0.7);

  const matchScore = typeof d.matchScore === "number" ? d.matchScore : null;
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };
  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-950/20 border-emerald-800/30";
    if (score >= 60) return "bg-amber-950/20 border-amber-800/30";
    return "bg-red-950/20 border-red-800/30";
  };
  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong match";
    if (score >= 60) return "Moderate match";
    return "Needs improvement";
  };

  const missingKeywords = Array.isArray(d.missingKeywords) ? d.missingKeywords as string[] : [];
  const missingSkills = Array.isArray(d.missingSkills) ? d.missingSkills as string[] : [];
  const atsRisks = Array.isArray(d.atsRisks) ? d.atsRisks as string[] : [];

  return (
    <div className="mt-6 space-y-6">
      {showLowQualityNotice && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-medium text-amber-200">
            ⚠️ PDF quality notice
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            We had trouble reading some parts of your PDF. Results may be less accurate.
          </p>
        </div>
      )}

      {matchScore !== null && (
        <section className={cardClass}>
          <div className={`flex flex-col items-center rounded-lg border ${getScoreBg(matchScore)} py-8 px-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Match score
            </p>
            <p className={`mt-2 text-5xl font-bold tracking-tight sm:text-6xl ${getScoreColor(matchScore)}`}>
              {matchScore}%
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-300">
              {getScoreLabel(matchScore)}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Overall alignment with job requirements
            </p>
          </div>
        </section>
      )}

      {missingKeywords.length > 0 && (
        <section className={cardClass}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Missing keywords
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Add these terms to improve ATS matching
              </p>
            </div>
            <span className="ml-4 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {missingKeywords.length}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {missingKeywords.map((k, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300"
              >
                {k}
              </span>
            ))}
          </div>
        </section>
      )}

      {missingSkills.length > 0 && (
        <section className={cardClass}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Missing skills
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Consider highlighting related experience or learning these
              </p>
            </div>
            <span className="ml-4 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {missingSkills.length}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {missingSkills.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {atsRisks.length > 0 && (
        <section className={cardClass}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                ATS risk flags
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Fix these to improve parsing accuracy
              </p>
            </div>
            <span className="ml-4 rounded-full bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-300">
              {atsRisks.length}
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {atsRisks.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 text-red-400">⚠️</span>
                <p className="flex-1 text-sm text-zinc-300">{r}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canPair && (
        <section className={cardClass}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Bullet improvements
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Before and after suggestions with quantified impact
              </p>
            </div>
            <span className="ml-4 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {weakBullets.length}
            </span>
          </div>
          <div className="mt-5 space-y-6">
            {weakBullets.map((weak, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Original
                  </p>
                  <p className="mt-2 text-sm text-zinc-400 line-through">
                    {weak}
                  </p>
                </div>
                <div>
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Suggested
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyBullet(rewrittenBullets[i], i)}
                      className="ml-2 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
                    >
                      {copiedBullets[i] ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">
                    {rewrittenBullets[i]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!canPair && weakBullets.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-white">
            Weak bullets
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            These bullets lack quantified impact or specific achievements
          </p>
          <ul className="mt-4 space-y-2">
            {weakBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-600"></span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!canPair && rewrittenBullets.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-white">
            Rewritten bullets
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Improved versions with quantified impact
          </p>
          <ul className="mt-4 space-y-3">
            {rewrittenBullets.map((b, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <p className="flex-1 text-sm text-zinc-200">{b}</p>
                <button
                  type="button"
                  onClick={() => handleCopyBullet(b, i)}
                  className="flex-shrink-0 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
                >
                  {copiedBullets[i] ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary && (
        <section className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white">
                Tailored summary
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                ATS-optimized summary tailored to this job
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700"
            >
              {copiedSummary ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="text-sm leading-relaxed text-zinc-200">{summary}</p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/50 p-6">
        <h2 className="text-base font-semibold text-white">
          Want more?
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Get a full resume rewrite, cover letter generation, and unlimited scans.
        </p>
        <div className="mt-4">
          <button
            type="button"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
            onClick={() => {
              capture("paywall_viewed", { source: "result_page" });
              // Premium path will be implemented later
            }}
          >
            View premium options
          </button>
        </div>
      </section>
    </div>
  );
}
