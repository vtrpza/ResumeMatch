/**
 * Sentry helpers for Resume Gap Scanner.
 * Sets tags/context for the scan journey. No PII (no resume/JD content).
 */

import * as Sentry from "@sentry/nextjs";

export type ScanStage =
  | "validation"
  | "upload"
  | "pdf_extract"
  | "jd_validation"
  | "llm_analysis"
  | "analysis_validation"
  | "result";

/** Set current scan stage for error grouping and debugging. */
export function setScanStage(stage: ScanStage): void {
  Sentry.setTag("scan_stage", stage);
}

/** Set route/page tag (e.g. "scan", "result", "api_usage"). */
export function setRoute(route: string): void {
  Sentry.setTag("route", route);
}

/** Attach safe scan context to the current scope. No raw resume or JD text. */
export function setScanContext(ctx: {
  resumeSizeBytes?: number;
  resumeExtractLength?: number;
  jdLength?: number;
  pdfParseSucceeded?: boolean;
  model?: string;
  confidence?: number;
  extractionQuality?: string;
  analysisValid?: boolean;
  /** Reason when validation fails after all retries (e.g. all_attempts_returned_null). */
  validationFailureReason?: string;
}): void {
  Sentry.setContext("scan", ctx);
}

/** Capture a scan pipeline failure with stage and optional code. */
export function captureScanError(
  error: unknown,
  opts: { stage: ScanStage; code?: string }
): void {
  setScanStage(opts.stage);
  if (opts.code) Sentry.setTag("error_code", opts.code);
  Sentry.captureException(error);
}
