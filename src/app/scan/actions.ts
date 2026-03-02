"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { setScanStage, setScanContext, captureScanError } from "@/lib/sentry";
import { extractTextFromPdf } from "@/lib/pdf";
import { analyzeResume, type AnalysisResult } from "@/lib/analyze";
import { FAILURE_MODES } from "@/lib/ai-analysis-contract";

interface ScanResult {
  ok: boolean;
  error: string | null;
  analysis?: AnalysisResult;
}

function userMessageForError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("No text extracted") || msg.includes("pdf") || msg.includes("PDF")) {
    return FAILURE_MODES.NO_TEXT_EXTRACTED.userMessage;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 429
  ) {
    return FAILURE_MODES.API_RATE_LIMIT.userMessage;
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return FAILURE_MODES.API_TIMEOUT.userMessage;
  }
  if (
    msg.includes("schema") ||
    msg.includes("validation") ||
    msg.includes("OPENAI_API_KEY")
  ) {
    if (msg.includes("OPENAI_API_KEY")) {
      return "Server configuration error. Please try again later.";
    }
    return FAILURE_MODES.SCHEMA_VALIDATION_FAILED.userMessage;
  }
  if (msg.includes("Empty") || msg.includes("invalid") || msg.includes("empty")) {
    return FAILURE_MODES.INVALID_RESPONSE.userMessage;
  }
  return "Something went wrong. Please try again.";
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
        return await runScanPipeline(resume, jd.trim());
      } catch (err) {
        captureScanError(err, { stage: "validation", code: "scan_pipeline_error" });
        return {
          ok: false,
          error: userMessageForError(err),
        };
      }
    }
  );
}

async function runScanPipeline(resume: File, jd: string): Promise<ScanResult> {
  setScanStage("pdf_extract");
  const buffer = Buffer.from(await resume.arrayBuffer());
  const resumeText = await extractTextFromPdf(buffer);

  setScanStage("llm_analysis");
  const analysis = await analyzeResume(resumeText, jd);

  return {
    ok: true,
    error: null,
    analysis,
  };
}
