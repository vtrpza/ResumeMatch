"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { setScanStage, setScanContext, captureScanError } from "@/lib/sentry";

interface ScanResult {
  ok: boolean;
  error: string | null;
  analysis?: {
    matchScore: number;
    missingKeywords: string[];
    missingSkills: string[];
    atsRisks: string[];
    weakBullets: string[];
    rewrittenBullets: string[];
    tailoredSummary: string;
  };
}

export async function runScan(formData: FormData): Promise<ScanResult> {
  return Sentry.withServerActionInstrumentation(
    "runScan",
    {
      headers: await headers(),
      recordResponse: true,
    },
    async () => {
      setScanStage("validation");
      const resume = formData.get("resume") as File | null;
      const jd = formData.get("jd") as string | null;

      if (!resume || !jd) {
        return { ok: false, error: "Resume and job description are required." };
      }

      if (resume.size > 5 * 1024 * 1024) {
        return { ok: false, error: "Resume must be under 5 MB." };
      }

      setScanContext({ resumeSizeBytes: resume.size, jdLength: jd.length });

      try {
        return await runScanPipeline(resume, jd);
      } catch (err) {
        captureScanError(err, { stage: "validation", code: "scan_pipeline_error" });
        return {
          ok: false,
          error: "Something went wrong. Please try again.",
        };
      }
    }
  );
}

// Stub implementation; real pipeline will call PDF extract → LLM → validate
/* eslint-disable @typescript-eslint/no-unused-vars -- params used when real pipeline is wired */
async function runScanPipeline(
  _resume: File,
  _jd: string
): Promise<ScanResult> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  setScanStage("validation");

  return {
    ok: true,
    error: null,
    analysis: {
      matchScore: 72,
      missingKeywords: ["CI/CD", "Kubernetes", "GraphQL"],
      missingSkills: ["Cloud architecture", "Performance optimization"],
      atsRisks: [
        "Resume uses two-column layout which may confuse ATS parsers",
        "No quantified achievements in first 3 bullets",
      ],
      weakBullets: [
        "Responsible for managing team projects",
        "Helped with code reviews",
      ],
      rewrittenBullets: [
        "Led cross-functional team of 8 to deliver 3 major product launches on schedule, reducing time-to-market by 20%",
        "Conducted 150+ code reviews per quarter, catching critical bugs pre-deploy and improving team code quality score by 35%",
      ],
      tailoredSummary:
        "Full-stack engineer with 5+ years building scalable web applications. Proven track record in React, Node.js, and cloud-native architectures with a focus on performance and developer experience.",
    },
  };
}
