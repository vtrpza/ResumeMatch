"use server";

import * as Sentry from "@sentry/nextjs";
import { headers, cookies } from "next/headers";
import { setScanStage, setScanContext, captureScanError } from "@/lib/sentry";
import { extractTextFromPdf } from "@/lib/pdf";
import { analyzeResume, type AnalysisResult } from "@/lib/analyze";
import { generatePremiumContent } from "@/lib/premium-generate";
import { detectEdgeCases, adjustConfidenceForEdgeCases } from "@/lib/ai-analysis-validation";
import { FAILURE_MODES } from "@/lib/ai-analysis-contract";
import {
  getOrCreateAndIncrementScan,
  getUsageForIdentity,
  incrementScanForIdentity,
} from "@/lib/db";
import { isFullAppEnabled, isDatabaseAvailable } from "@/lib/feature-config";
import { getIdentityFromCookie, IDENTITY_COOKIE_NAME } from "@/lib/identity-auth";

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

      const jdTrimmed = jd.trim();
      if (jdTrimmed.length < 50) {
        return {
          ok: false,
          error: "Please paste a longer job description so we can give you useful feedback.",
        };
      }

      if (resume.size > 5 * 1024 * 1024) {
        return { ok: false, error: "Resume must be under 5 MB." };
      }

      setScanContext({ resumeSizeBytes: resume.size, jdLength: jd.length });

      const sessionId = (formData.get("sessionId") as string | null)?.trim() || null;
      const fullApp = isFullAppEnabled();
      const dbAvailable = isDatabaseAvailable();

      if (fullApp && !dbAvailable) {
        return {
          ok: false,
          error: "Service temporarily unavailable. Database is not configured.",
        };
      }

      let identityId: string | null = null;

      // Full app: enforce paywall by verified identity (cookie), not client sessionId
      if (fullApp && dbAvailable) {
        const cookieStore = await cookies();
        const token = cookieStore.get(IDENTITY_COOKIE_NAME)?.value;
        const identity = await getIdentityFromCookie(token);
        if (!identity) {
          return {
            ok: false,
            error: "Verify your email to run your free scan.",
          };
        }
        identityId = identity.id;
        const usage = await getUsageForIdentity(identity.id);
        if (usage) {
          const allowed = 1 + usage.purchasedScans;
          if (usage.scanCount >= allowed) {
            return {
              ok: false,
              error: "You've used your free scan. Unlock another scan for $2 to continue.",
            };
          }
        }
      }

      try {
        const result = await runScanPipeline(resume, jdTrimmed);
        if (result.ok) {
          if (identityId) {
            await incrementScanForIdentity(identityId);
          } else if (sessionId) {
            await getOrCreateAndIncrementScan(sessionId);
          }
        }
        return result;
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

/** PDF magic bytes: %PDF- (RFC 3778). Reject non-PDF before parsing. */
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"

function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return PDF_MAGIC.compare(buffer, 0, 5, 0, 5) === 0;
}

async function runScanPipeline(resume: File, jd: string): Promise<ScanResult> {
  setScanStage("pdf_extract");
  const buffer = Buffer.from(await resume.arrayBuffer());
  if (!isPdfBuffer(buffer)) {
    return {
      ok: false,
      error: "Upload a valid PDF file. This file doesn't appear to be a PDF.",
    };
  }
  const resumeText = await extractTextFromPdf(buffer);

  const edgeCases = detectEdgeCases(resumeText);
  const resumeContext = {
    ...edgeCases,
    charCount: resumeText.length,
  };

  setScanStage("llm_analysis");
  const analysis = await analyzeResume(resumeText, jd, { resumeContext });

  analysis.confidence = adjustConfidenceForEdgeCases(analysis.confidence, edgeCases);

  setScanContext({
    resumeExtractLength: resumeText.length,
    model: analysis.model,
    confidence: analysis.confidence,
    extractionQuality: analysis.extractionQuality,
    analysisValid: true,
    edgeCaseEmpty: edgeCases.isEmpty,
    edgeCaseGarbled: edgeCases.isGarbled,
    edgeCaseVeryLong: edgeCases.isVeryLong,
    edgeCaseNonEnglish: edgeCases.isNonEnglish,
  });

  // Premium: cover letter + full experience rewrite (sequential, graceful failure)
  try {
    const premium = await generatePremiumContent(resumeText, jd, analysis);
    if (premium) {
      analysis.coverLetter = premium.coverLetter;
      analysis.fullRewrite = premium.fullRewrite;
    }
  } catch {
    // Scan still succeeds without premium content
  }

  return {
    ok: true,
    error: null,
    analysis,
  };
}
