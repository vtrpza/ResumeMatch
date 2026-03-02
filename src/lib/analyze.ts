import OpenAI from "openai";
import { setScanStage, setScanContext, captureScanError } from "./sentry";
import {
  type ScanAnalysis,
  SCAN_ANALYSIS_JSON_SCHEMA,
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  FALLBACK_SYSTEM_PROMPT,
  shouldUseFallback,
  DEFAULT_FALLBACK_CONDITIONS,
} from "./ai-analysis-contract";
import { validateAndNormalizeAnalysis } from "./ai-analysis-validation";

const DEFAULT_MODEL = "gpt-4o-mini";
const FALLBACK_MODEL = "gpt-4o";

export type { ScanAnalysis } from "./ai-analysis-contract";

export interface AnalysisResult extends ScanAnalysis {
  model?: string;
}

/**
 * Call OpenAI and parse/validate response. Returns validated ScanAnalysis or null on parse/validation failure.
 */
async function callAnalysis(
  openai: OpenAI,
  resumeText: string,
  jobDescription: string,
  options: { model: string; systemPrompt: string }
): Promise<ScanAnalysis | null> {
  const truncatedResume = resumeText.slice(0, 12000);
  const truncatedJd = jobDescription.slice(0, 8000);
  const userContent = buildAnalysisPrompt(truncatedResume, truncatedJd);

  const response = await openai.chat.completions.create({
    model: options.model,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: SCAN_ANALYSIS_JSON_SCHEMA,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return validateAndNormalizeAnalysis(parsed);
}

/**
 * Analyze resume against job description using contract schema and validation.
 * Uses gpt-4o-mini by default; falls back to gpt-4o on low confidence, extractionQuality "low", or parse/validation failure.
 */
export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<AnalysisResult> {
  setScanStage("llm_analysis");
  setScanContext({ model: DEFAULT_MODEL });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY is not set");
    captureScanError(err, { stage: "llm_analysis", code: "config_missing" });
    throw err;
  }

  const openai = new OpenAI({ apiKey });
  let lastError: Error | null = null;

  // 1. Try default model up to maxRetries
  for (let attempt = 1; attempt <= DEFAULT_FALLBACK_CONDITIONS.maxRetries; attempt++) {
    setScanContext({ model: DEFAULT_MODEL });
    try {
      const result = await callAnalysis(openai, resumeText, jobDescription, {
        model: DEFAULT_MODEL,
        systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      });

      if (result && !shouldUseFallback(result, null, attempt)) {
        setScanContext({ model: DEFAULT_MODEL, analysisValid: true });
        return { ...result, model: DEFAULT_MODEL };
      }

      if (result && shouldUseFallback(result, null, attempt)) {
        setScanContext({ model: FALLBACK_MODEL });
        try {
          const fallbackResult = await callAnalysis(openai, resumeText, jobDescription, {
            model: FALLBACK_MODEL,
            systemPrompt: FALLBACK_SYSTEM_PROMPT,
          });
          if (fallbackResult) {
            setScanContext({ model: FALLBACK_MODEL, analysisValid: true });
            return { ...fallbackResult, model: FALLBACK_MODEL };
          }
        } catch (fallbackErr) {
          captureScanError(
            fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)),
            { stage: "llm_analysis", code: "fallback_failed" }
          );
        }
        setScanContext({ model: DEFAULT_MODEL, analysisValid: true });
        return { ...result, model: DEFAULT_MODEL };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const code =
        lastError && typeof lastError === "object" && "status" in lastError
          ? "openai_api_error"
          : "llm_analysis_failed";
      captureScanError(lastError, { stage: "llm_analysis", code });
    }
  }

  // 2. Try fallback model once
  setScanContext({ model: FALLBACK_MODEL });
  try {
    const fallbackResult = await callAnalysis(openai, resumeText, jobDescription, {
      model: FALLBACK_MODEL,
      systemPrompt: FALLBACK_SYSTEM_PROMPT,
    });
    if (fallbackResult) {
      setScanContext({ model: FALLBACK_MODEL, analysisValid: true });
      return { ...fallbackResult, model: FALLBACK_MODEL };
    }
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    captureScanError(lastError, { stage: "llm_analysis", code: "fallback_failed" });
  }

  const finalError =
    lastError ||
    new Error("AI response does not match expected schema or validation failed");
  captureScanError(finalError, { stage: "llm_analysis", code: "validation_failed" });
  throw finalError;
}
