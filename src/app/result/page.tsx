"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { setRoute } from "@/lib/sentry";
import { capture, captureResultViewed } from "@/lib/analytics";

export default function ResultPage() {
  const [analysis, setAnalysis] = useState<unknown>(null);

  useEffect(() => {
    setRoute("result");
  }, []);

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
      const data = analysis as Record<string, unknown>;
      captureResultViewed({
        matchScore: typeof data.matchScore === "number" ? data.matchScore : undefined,
        missingKeywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : undefined,
        atsRisks: Array.isArray(data.atsRisks) ? data.atsRisks : undefined,
      });
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
      <h1 className="mt-4 text-2xl font-semibold text-white">Your scan results</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Review your match score, gaps, and improvement suggestions below.
      </p>

      <AnalysisView data={analysis} />

      <div className="mt-8 space-y-3">
        <Link
          href="/scan"
          className="inline-block min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Scan another resume
        </Link>
        <p className="text-xs text-zinc-500">
          Tip: Copy the tailored summary and use it in your application or cover letter.
        </p>
      </div>
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
      capture("summary_copied", { summary_length: summary.length });
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
          <h2 className="text-sm font-medium text-zinc-500 mb-4">Match score</h2>
          <div className="flex flex-col items-center rounded-lg ring-1 ring-zinc-700/50 bg-zinc-900/80 py-6 px-4">
            <p className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {d.matchScore}%
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Overall alignment with job requirements
            </p>
            <p className="mt-3 text-xs text-zinc-500 text-center max-w-sm">
              {d.matchScore >= 80
                ? "Strong match. Your resume aligns well with this role."
                : d.matchScore >= 60
                ? "Good match. Consider adding missing keywords to improve your score."
                : "Room for improvement. Review missing keywords and skills below."}
            </p>
          </div>
        </section>
      )}

      {Array.isArray(d.missingKeywords) && d.missingKeywords.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500">
            Missing keywords
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            These terms appear in the job description but not in your resume. Adding them can improve ATS compatibility.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-300">
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
          <p className="mt-1 text-xs text-zinc-500">
            Skills mentioned in the job description that aren&apos;t clearly present in your resume. Only add skills you actually have.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-300">
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
          <p className="mt-1 text-xs text-zinc-500">
            Formatting or content issues that could cause problems with applicant tracking systems.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-300">
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
          <p className="mt-1 text-xs text-zinc-500">
            We&apos;ve rewritten weak bullets to be more impactful and quantifiable, using only what&apos;s in your resume.
          </p>
          <ul className="mt-4 space-y-5">
            {weakBullets.map((weak, i) => (
              <li key={i} className="space-y-2 border-t border-zinc-800 pt-4 first:border-t-0 first:pt-0">
                <p className="text-xs font-medium text-zinc-500">Original</p>
                <p className="text-zinc-400 line-through">{weak}</p>
                <p className="text-xs font-medium text-zinc-500 mt-3">Suggested</p>
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
            <div>
              <h2 className="text-sm font-medium text-zinc-500">
                Tailored summary
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                A job-specific summary highlighting your most relevant experience for this role.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySummary}
              className="min-h-[36px] rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
            >
              {copied ? "✓ Copied" : "Copy summary"}
            </button>
          </div>
          <p className="mt-4 text-zinc-300 leading-relaxed">{summary}</p>
        </section>
      )}
    </div>
  );
}
