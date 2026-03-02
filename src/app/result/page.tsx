"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { capture } from "@/lib/analytics";

export default function ResultPage() {
  const [analysis, setAnalysis] = useState<unknown>(null);

  useEffect(() => {
    const analysisJson = sessionStorage.getItem("scan_analysis");
    if (analysisJson) {
      try {
        setAnalysis(JSON.parse(analysisJson) as unknown);
      } catch {
        setAnalysis(null);
      }
    }
  }, []);

  const resultViewedSent = useRef(false);
  useEffect(() => {
    if (analysis !== null && !resultViewedSent.current) {
      resultViewedSent.current = true;
      capture("result_viewed");
    }
  }, [analysis]);

  if (analysis === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-zinc-400">
          Your report isn&apos;t here—it may have been cleared. Run a new scan
          to get your analysis.
        </p>
        <Link
          href="/scan"
          className="mt-6 inline-block rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Run a new scan
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="-mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-white">Scan result</h1>

      <AnalysisView data={analysis} />

      <Link
        href="/scan"
        className="mt-8 inline-block min-h-[44px] py-2 text-sm text-zinc-500 hover:text-zinc-300"
      >
        Scan another resume
      </Link>
    </main>
  );
}

const cardClass =
  "rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6";

function AnalysisView({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const [copied, setCopied] = useState(false);
  const summary =
    typeof d.tailoredSummary === "string" ? d.tailoredSummary : "";

  const handleCopySummary = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  }, [summary]);

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

  return (
    <div className="mt-6 space-y-5">
      {showLowQualityNotice && (
        <p className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          We had trouble reading some parts of your PDF; results may be less
          accurate.
        </p>
      )}
      {typeof d.matchScore === "number" && (
        <section className={cardClass}>
          <div className="flex flex-col items-center rounded-lg ring-1 ring-zinc-700/50 bg-zinc-900/80 py-6 px-4">
            <p className="text-sm font-medium text-zinc-500">
              Match score
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {d.matchScore}%
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Overall alignment with job requirements
            </p>
          </div>
        </section>
      )}

      {Array.isArray(d.missingKeywords) && d.missingKeywords.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500">
            Missing keywords
          </h2>
          <ul className="mt-2 list-inside list-disc text-zinc-300">
            {(d.missingKeywords as string[]).map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(d.missingSkills) && d.missingSkills.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500">
            Missing skills
          </h2>
          <ul className="mt-2 list-inside list-disc text-zinc-300">
            {(d.missingSkills as string[]).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(d.atsRisks) && d.atsRisks.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500">
            ATS risk flags
          </h2>
          <ul className="mt-2 list-inside list-disc text-zinc-300">
            {(d.atsRisks as string[]).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {canPair ? (
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500">
            Bullet improvements
          </h2>
          <ul className="mt-4 space-y-5">
            {weakBullets.map((weak, i) => (
              <li key={i} className="space-y-2">
                <p className="text-xs font-medium text-zinc-500">Original</p>
                <p className="text-zinc-400 line-through">{weak}</p>
                <p className="text-xs font-medium text-zinc-500">Suggested</p>
                <p className="text-zinc-300">{rewrittenBullets[i]}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {weakBullets.length > 0 && (
            <section className={cardClass}>
              <h2 className="text-sm font-medium text-zinc-500">
                Weak bullets
              </h2>
              <ul className="mt-2 space-y-1 text-zinc-300">
                {weakBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          )}
          {rewrittenBullets.length > 0 && (
            <section className={cardClass}>
              <h2 className="text-sm font-medium text-zinc-500">
                Rewritten bullets
              </h2>
              <ul className="mt-2 space-y-2 text-zinc-300">
                {rewrittenBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {summary && (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-500">
              Tailored summary
            </h2>
            <button
              type="button"
              onClick={handleCopySummary}
              className="min-h-[36px] rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
            >
              {copied ? "Copied" : "Copy summary"}
            </button>
          </div>
          <p className="mt-3 text-zinc-300">{summary}</p>
        </section>
      )}
    </div>
  );
}
