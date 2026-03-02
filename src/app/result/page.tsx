"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  if (analysis === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-zinc-400">No scan data. Start from the scan page.</p>
        <Link
          href="/scan"
          className="mt-4 inline-block min-h-[44px] py-2 text-white underline hover:text-zinc-200"
        >
          Go to scan
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

function AnalysisView({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  return (
    <div className="mt-6 space-y-6">
      {typeof d.matchScore === "number" && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Match score</h2>
          <p className="mt-1 text-2xl font-semibold text-white">{d.matchScore}%</p>
        </section>
      )}
      {Array.isArray(d.missingKeywords) && d.missingKeywords.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Missing keywords</h2>
          <ul className="mt-1 list-inside list-disc text-zinc-300">
            {(d.missingKeywords as string[]).map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </section>
      )}
      {Array.isArray(d.missingSkills) && d.missingSkills.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Missing skills</h2>
          <ul className="mt-1 list-inside list-disc text-zinc-300">
            {(d.missingSkills as string[]).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {Array.isArray(d.atsRisks) && d.atsRisks.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">ATS risk flags</h2>
          <ul className="mt-1 list-inside list-disc text-zinc-300">
            {(d.atsRisks as string[]).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      {Array.isArray(d.weakBullets) && d.weakBullets.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Weak bullets</h2>
          <ul className="mt-1 space-y-1 text-zinc-300">
            {(d.weakBullets as string[]).map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}
      {Array.isArray(d.rewrittenBullets) && d.rewrittenBullets.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Rewritten bullets</h2>
          <ul className="mt-1 space-y-2 text-zinc-300">
            {(d.rewrittenBullets as string[]).map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}
      {typeof d.tailoredSummary === "string" && d.tailoredSummary && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Tailored summary</h2>
          <p className="mt-1 text-zinc-300">{d.tailoredSummary}</p>
        </section>
      )}
    </div>
  );
}
