"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { setRoute } from "@/lib/sentry";
import { capture, captureResultViewed } from "@/lib/analytics";
import type { ScanAnalysis } from "@/lib/ai-analysis-contract";
import { validateAndNormalizeAnalysis } from "@/lib/ai-analysis-validation";
import { PageLoadingView } from "@/components/PageLoadingView";

export default function ResultPage() {
  const [analysis, setAnalysis] = useState<ScanAnalysis | null | undefined>(undefined);

  useEffect(() => {
    setRoute("result");
  }, []);

  useEffect(() => {
    const analysisJson = sessionStorage.getItem("scan_analysis");
    if (!analysisJson) {
      setAnalysis(null);
      return;
    }
    try {
      const parsed = JSON.parse(analysisJson) as unknown;
      const validated = validateAndNormalizeAnalysis(parsed);
      setAnalysis(validated ?? null);
    } catch {
      setAnalysis(null);
    }
  }, []);

  const resultViewedSent = useRef(false);
  useEffect(() => {
    if (analysis == null || resultViewedSent.current) return;
    resultViewedSent.current = true;
    captureResultViewed({
      matchScore: analysis.matchScore,
      missingKeywords: analysis.missingKeywords,
      atsRisks: analysis.atsRisks,
    });
  }, [analysis]);

  if (analysis === undefined) {
    return <PageLoadingView variant="result" showSkeleton />;
  }

  if (analysis === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-zinc-400">
          Your report isn&apos;t here—it may have been cleared. Run a new scan
          to get your analysis.
        </p>
        <Link
          href="/scan"
          className="focus-ring active:opacity-90 mt-6 inline-block rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
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
        className="focus-ring -mx-2 inline-block min-h-[44px] py-2 pl-2 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-white">Your scan results</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Review your fit and refinements below.
      </p>
      <div className="mt-4">
        <ExportReportButton analysis={analysis} />
      </div>

      <AnalysisView data={analysis} />

      {/* Upsell: next scan = $2 */}
      <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <p className="text-sm font-medium text-zinc-300">
          Scan another job for $2 — same full report.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          One-time payment per scan. No subscription.
        </p>
        <Link
          href="/scan"
          className="focus-ring active:opacity-90 mt-4 inline-block min-h-[44px] rounded-lg bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Scan another resume
        </Link>
      </div>
    </main>
  );
}

function buildReportMarkdown(analysis: ScanAnalysis): string {
  const lines: string[] = [
    "# Resume Match Report",
    "",
    `## Match score: ${analysis.matchScore}%`,
    "",
  ];
  if (analysis.matchScoreReasoning) {
    lines.push(analysis.matchScoreReasoning, "");
  }

  // Summary (moved up)
  lines.push("## Fit summary", "", analysis.tailoredSummary, "");

  // Gaps to close
  lines.push("## Where to improve", "");

  // Check if gapGroups is present
  const hasGapGroups = analysis.gapGroups && analysis.gapGroups.length > 0;

  if (hasGapGroups) {
    // Render by theme groups
    analysis.gapGroups!.forEach((group) => {
      lines.push(`### ${group.theme}`, "");
      group.items.forEach((item) => {
        lines.push(`- ${item}`);
      });
      lines.push("");
    });
  } else {
    // Fallback to Critical/Other/flat structure
    const hasCriticalKeywords = analysis.criticalMissingKeywords && analysis.criticalMissingKeywords.length > 0;
    const hasCriticalSkills = analysis.criticalMissingSkills && analysis.criticalMissingSkills.length > 0;
    const hasCriticalGaps = hasCriticalKeywords || hasCriticalSkills;

    if (hasCriticalGaps) {
      lines.push("### Critical gaps", "");
      if (hasCriticalKeywords) {
        lines.push("**Keywords:**", "", ...analysis.criticalMissingKeywords!.map((k) => `- ${k}`), "");
      }
      if (hasCriticalSkills) {
        lines.push("**Skills:**", "", ...analysis.criticalMissingSkills!.map((s) => `- ${s}`), "");
      }
      lines.push("");
    }

    // Other gaps (excluding items already in critical)
    const criticalKeywordSet = new Set(analysis.criticalMissingKeywords || []);
    const criticalSkillSet = new Set(analysis.criticalMissingSkills || []);
    const otherKeywords = analysis.missingKeywords.filter((k) => !criticalKeywordSet.has(k));
    const otherSkills = analysis.missingSkills.filter((s) => !criticalSkillSet.has(s));

    if (otherKeywords.length > 0 || otherSkills.length > 0) {
      lines.push("### Other gaps", "");
      if (otherKeywords.length > 0) {
        lines.push("**Keywords:**", "", ...otherKeywords.map((k) => `- ${k}`), "");
      }
      if (otherSkills.length > 0) {
        lines.push("**Skills:**", "", ...otherSkills.map((s) => `- ${s}`), "");
      }
      lines.push("");
    } else if (!hasCriticalGaps) {
      // Fallback: show all gaps if no critical gaps structure
      if (analysis.missingKeywords.length > 0) {
        lines.push("### Missing keywords", "", ...analysis.missingKeywords.map((k) => `- ${k}`), "");
      }
      if (analysis.missingSkills.length > 0) {
        lines.push("### Missing skills", "", ...analysis.missingSkills.map((s) => `- ${s}`), "");
      }
      if (analysis.missingKeywords.length === 0 && analysis.missingSkills.length === 0) {
        lines.push("No major keyword or skill gaps identified.", "");
      }
    }
  }

  lines.push("## Format & parsing", "");
  if (analysis.atsRisks.length > 0) {
    lines.push("### ATS risk flags", "", ...analysis.atsRisks.map((r) => `- ${r}`), "");
  } else {
    lines.push("No ATS risk flags identified.", "");
  }
  lines.push("");

  if (analysis.weakBullets.length > 0 && analysis.rewrittenBullets.length === analysis.weakBullets.length) {
    lines.push("## Bullet improvements", "");
    analysis.weakBullets.forEach((weak, i) => {
      lines.push("**Original:**", weak, "", "**Suggested:**", analysis.rewrittenBullets[i] ?? "", "");
    });
  }

  return lines.join("\n");
}

function ExportReportButton({ analysis }: { analysis: ScanAnalysis }) {
  const handleExport = useCallback(() => {
    const md = buildReportMarkdown(analysis);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-match-report.md";
    a.click();
    URL.revokeObjectURL(url);
    capture("export_clicked", { format: "md" });
  }, [analysis]);
  return (
    <button
      type="button"
      onClick={handleExport}
      className="focus-ring active:opacity-90 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
    >
      Export report (MD)
    </button>
  );
}

const cardClass =
  "rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6";

const scoreCardClass =
  "rounded-xl border-2 border-zinc-700 bg-zinc-900/80 p-6 sm:p-8";

function scoreBand(score: number): { label: string; ring: string } {
  if (score >= 80) return { label: "Strong match. Your resume aligns well with this role.", ring: "ring-emerald-500/30 bg-emerald-950/20" };
  if (score >= 60) return { label: "Good match. Consider adding missing keywords to improve your score.", ring: "ring-amber-500/30 bg-amber-950/20" };
  return { label: "Room for improvement. Review missing keywords and skills below.", ring: "ring-red-500/20 bg-red-950/10" };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </p>
  );
}

function AnalysisView({ data }: { data: ScanAnalysis }) {
  const [copied, setCopied] = useState(false);
  const [copiedBulletIndex, setCopiedBulletIndex] = useState<number | null>(null);
  const summary = data.tailoredSummary;

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

  const handleCopyBullet = useCallback(async (text: string, index: number) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBulletIndex(index);
      capture("bullet_copied", { index });
      setTimeout(() => setCopiedBulletIndex(null), 2000);
    } catch {
      // no-op
    }
  }, []);

  const weakBullets = data.weakBullets;
  const rewrittenBullets = data.rewrittenBullets;
  const canPair =
    weakBullets.length > 0 &&
    rewrittenBullets.length > 0 &&
    weakBullets.length === rewrittenBullets.length;

  const showLowQualityNotice = data.extractionQuality === "low";

  const score = data.matchScore;
  const band = scoreBand(score);

  return (
    <div className="mt-8 space-y-12">
      {showLowQualityNotice && (
        <p className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          We had trouble reading some parts of your PDF; results may be less
          accurate.
        </p>
      )}

      {/* Match score hero */}
      <section className={`${scoreCardClass} ring-2 ${band.ring}`}>
          <h2 className="text-sm font-medium text-zinc-500 mb-4">Match score</h2>
          <div className="flex flex-col items-center py-4 sm:py-6">
            <p className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
              {score}%
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Overall alignment with job requirements
            </p>
            <p className="mt-4 text-sm text-zinc-300 text-center max-w-sm">
              {band.label}
            </p>
            {data.matchScoreReasoning && (
              <p className="mt-3 text-xs text-zinc-500 text-center max-w-md">
                {data.matchScoreReasoning}
              </p>
            )}
          </div>
        </section>

      {/* Summary - moved up */}
      {summary && (
        <div className="space-y-5">
          <SectionLabel>Summary</SectionLabel>
          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium text-zinc-400">
                  Fit summary
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Job-specific summary you can drop into applications or cover letters.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySummary}
                className="focus-ring active:opacity-90 shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                {copied ? "✓ Copied" : "Copy summary"}
              </button>
            </div>
            <p className="mt-4 text-zinc-300 leading-relaxed">{summary}</p>
          </section>
        </div>
      )}

      {/* Gaps to close */}
      <div className="space-y-5">
        <SectionLabel>Where to improve</SectionLabel>
        {(() => {
          // Check if gapGroups is present and non-empty
          const hasGapGroups = data.gapGroups && data.gapGroups.length > 0;

          if (hasGapGroups) {
            // Render by theme groups
            return (
              <>
                {data.gapGroups!.map((group, groupIdx) => (
                  <section key={groupIdx} className={cardClass}>
                    <h2 className="text-sm font-medium text-zinc-400">
                      {group.theme}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map((item, itemIdx) => (
                        <span
                          key={itemIdx}
                          className="inline-flex items-center rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            );
          }

          // Fallback to Critical/Other/flat structure
          const hasCriticalKeywords = data.criticalMissingKeywords && data.criticalMissingKeywords.length > 0;
          const hasCriticalSkills = data.criticalMissingSkills && data.criticalMissingSkills.length > 0;
          const hasCriticalGaps = hasCriticalKeywords || hasCriticalSkills;

          // Calculate other gaps (excluding items already in critical)
          const criticalKeywordSet = new Set(data.criticalMissingKeywords || []);
          const criticalSkillSet = new Set(data.criticalMissingSkills || []);
          const otherKeywords = data.missingKeywords.filter((k) => !criticalKeywordSet.has(k));
          const otherSkills = data.missingSkills.filter((s) => !criticalSkillSet.has(s));

          const hasOtherGaps = otherKeywords.length > 0 || otherSkills.length > 0;
          const hasAnyGaps = hasCriticalGaps || hasOtherGaps || data.missingKeywords.length > 0 || data.missingSkills.length > 0;

          if (!hasAnyGaps) {
            return (
              <p className="text-sm text-zinc-400">
                No major keyword or skill gaps identified.
              </p>
            );
          }

          return (
            <>
              {hasCriticalGaps && (
                <section className={cardClass}>
                  <h2 className="text-sm font-medium text-zinc-400">
                    Critical gaps
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    These are the most important gaps for this role—core requirements, repeatedly mentioned skills, or explicitly mandatory items.
                  </p>
                  {hasCriticalKeywords && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-zinc-500 mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {data.criticalMissingKeywords!.map((k, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-red-950/40 border border-red-800/50 px-2.5 py-1 text-xs font-medium text-red-300">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasCriticalSkills && (
                    <div className={hasCriticalKeywords ? "mt-3" : "mt-3"}>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {data.criticalMissingSkills!.map((s, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-red-950/40 border border-red-800/50 px-2.5 py-1 text-xs font-medium text-red-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {hasOtherGaps && (
                <>
                  {otherKeywords.length > 0 && (
                    <section className={cardClass}>
                      <h2 className="text-sm font-medium text-zinc-400">
                        Other missing keywords
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Terms from the job description not in your resume. Adding them where they fit can improve ATS compatibility.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {otherKeywords.map((k, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                            {k}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  {otherSkills.length > 0 && (
                    <section className={cardClass}>
                      <h2 className="text-sm font-medium text-zinc-400">
                        Other missing skills
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Skills the job requires that aren&apos;t clearly present. Only add skills you actually have.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {otherSkills.map((s, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {!hasCriticalGaps && !hasOtherGaps && (
                <>
                  {data.missingKeywords.length > 0 && (
                    <section className={cardClass}>
                      <h2 className="text-sm font-medium text-zinc-400">
                        Missing keywords
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Terms from the job description not in your resume. Listed in order of importance to this role. Adding them where they fit can improve ATS compatibility.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.missingKeywords.map((k, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                            {k}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  {data.missingSkills.length > 0 && (
                    <section className={cardClass}>
                      <h2 className="text-sm font-medium text-zinc-400">
                        Missing skills
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Skills the job requires that aren&apos;t clearly present. Listed in order of importance to this role. Only add skills you actually have.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.missingSkills.map((s, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* Risks to fix */}
      <div className="space-y-5">
        <SectionLabel>Format & parsing</SectionLabel>
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-400">
            ATS risk flags
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Formatting or content issues that could affect how applicant tracking systems read your resume. Address these before you apply.
          </p>
          {data.atsRisks.length > 0 ? (
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-zinc-300">
              {data.atsRisks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              No ATS risk flags identified.
            </p>
          )}
        </section>
      </div>

      {/* Improvements */}
      {(canPair || weakBullets.length > 0 || rewrittenBullets.length > 0) ? (
        <div className="space-y-5">
          <SectionLabel>Improvements</SectionLabel>
          {canPair ? (
            <section className={cardClass}>
              <h2 className="text-sm font-medium text-zinc-400">
                Bullet improvements
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Stronger, more impactful versions using only what&apos;s in your resume—no invented metrics.
              </p>
              <ul className="mt-4 space-y-6">
                {weakBullets.map((weak, i) => (
                  <li key={i} className="space-y-2 border-t border-zinc-800 pt-5 first:border-t-0 first:pt-0">
                    <p className="text-xs font-medium text-zinc-500">Original</p>
                    <p className="text-zinc-400 line-through">{weak}</p>
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-500">Suggested</p>
                      <button
                        type="button"
                        onClick={() => handleCopyBullet(rewrittenBullets[i], i)}
                        className="focus-ring active:opacity-90 shrink-0 rounded border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
                      >
                        {copiedBulletIndex === i ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-zinc-300">{rewrittenBullets[i]}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <>
              {weakBullets.length > 0 && (
                <section className={cardClass}>
                  <h2 className="text-sm font-medium text-zinc-400">Weak bullets</h2>
                  <ul className="mt-2 space-y-1.5 text-zinc-300">
                    {weakBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </section>
              )}
              {rewrittenBullets.length > 0 && (
                <section className={cardClass}>
                  <h2 className="text-sm font-medium text-zinc-400">Rewritten bullets</h2>
                  <ul className="mt-2 space-y-2 text-zinc-300">
                    {rewrittenBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Next steps */}
      <div className="space-y-5">
        <SectionLabel>Next steps</SectionLabel>
        <section className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-400">
            What to do next
          </h2>
          <p className="mt-1 text-xs text-zinc-500 mb-4">
            Prioritize these actions before you apply.
          </p>
          <ul className="space-y-3 text-sm text-zinc-300">
            {data.atsRisks.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">1.</span>
                <span>Fix format & parsing issues first—formatting problems can prevent your resume from being parsed correctly.</span>
              </li>
            )}
            {(() => {
              const hasGapGroups = data.gapGroups && data.gapGroups.length > 0;
              const hasCriticalKeywords = data.criticalMissingKeywords && data.criticalMissingKeywords.length > 0;
              const hasAnyKeywords = data.missingKeywords.length > 0;
              if (!hasAnyKeywords && !hasGapGroups) return null;
              return (
                <li className="flex items-start gap-2">
                  <span className="text-zinc-500 mt-0.5">{data.atsRisks.length > 0 ? "2." : "1."}</span>
                  <span>
                    {hasGapGroups
                      ? "Address gaps by theme—prioritize the most critical areas for this role, then add other missing keywords where they naturally fit in your experience."
                      : hasCriticalKeywords
                      ? "Address critical gaps first—these are the most important for this role. Then add other missing keywords where they naturally fit in your experience."
                      : "Add missing keywords where they naturally fit in your experience. Only include terms that accurately describe your work."}
                  </span>
                </li>
              );
            })()}
            {canPair && (
              <li className="flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">{data.atsRisks.length > 0 || data.missingKeywords.length > 0 || (data.gapGroups && data.gapGroups.length > 0) ? "3." : data.atsRisks.length > 0 ? "2." : "1."}</span>
                <span>Consider using the suggested bullet rewrites to strengthen your resume&apos;s impact.</span>
              </li>
            )}
            {summary && (
              <li className="flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">
                  {data.atsRisks.length > 0 || data.missingKeywords.length > 0 || (data.gapGroups && data.gapGroups.length > 0) || canPair
                    ? "4."
                    : data.atsRisks.length > 0
                    ? "2."
                    : "1."}
                </span>
                <span>Use the fit summary in your application or cover letter to highlight your most relevant experience.</span>
              </li>
            )}
            {!data.atsRisks.length && !data.missingKeywords.length && !canPair && !summary && !(data.gapGroups && data.gapGroups.length > 0) && (
              <li className="flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">1.</span>
                <span>Review your match score and consider how your experience aligns with the role requirements.</span>
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
