/**
 * Validation utilities for AI analysis contract.
 * Ensures outputs conform to schema and handles edge cases.
 */

import type { ScanAnalysis } from "./ai-analysis-contract";
import {
  normalizeConfidence,
  normalizeMatchScore,
} from "./ai-analysis-contract";

/**
 * Validate and normalize a ScanAnalysis result.
 * Handles edge cases, clamps values, ensures array consistency.
 */
export function validateAndNormalizeAnalysis(
  raw: unknown
): ScanAnalysis | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Validate and normalize matchScore
  const matchScore = normalizeMatchScore(obj.matchScore);

  // Validate arrays
  const missingKeywords = validateStringArray(obj.missingKeywords, 0, 20, 100);
  const missingSkills = validateStringArray(obj.missingSkills, 0, 15, 100);
  const atsRisks = validateStringArray(obj.atsRisks, 0, 10, 200);
  const weakBullets = validateStringArray(obj.weakBullets, 0, 10, 300);
  const rewrittenBullets = validateStringArray(
    obj.rewrittenBullets,
    0,
    10,
    300
  );

  // Ensure 1:1 mapping between weakBullets and rewrittenBullets
  const normalizedBullets = normalizeBulletPairs(weakBullets, rewrittenBullets);

  // Validate tailoredSummary
  const tailoredSummary = validateString(
    obj.tailoredSummary,
    50,
    500,
    "Professional with relevant experience."
  );

  // Validate confidence
  const confidence = normalizeConfidence(obj.confidence);

  // Validate extractionQuality
  const extractionQuality = validateExtractionQuality(
    obj.extractionQuality
  ) as "high" | "medium" | "low";

  return {
    matchScore,
    missingKeywords,
    missingSkills,
    atsRisks,
    weakBullets: normalizedBullets.weak,
    rewrittenBullets: normalizedBullets.rewritten,
    tailoredSummary,
    confidence,
    extractionQuality,
  };
}

/**
 * Validate string array with length and item constraints.
 */
function validateStringArray(
  value: unknown,
  minItems: number,
  maxItems: number,
  maxItemLength: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, maxItems)
    .map((item) => {
      if (typeof item !== "string") {
        return String(item).slice(0, maxItemLength);
      }
      return item.trim().slice(0, maxItemLength);
    })
    .filter((item) => item.length > 0);
}

/**
 * Validate string with length constraints.
 */
function validateString(
  value: unknown,
  minLength: number,
  maxLength: number,
  fallback: string
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

/**
 * Validate extractionQuality enum.
 */
function validateExtractionQuality(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium"; // Default to medium if invalid
}

/**
 * Normalize bullet pairs to ensure 1:1 mapping.
 * If lengths don't match, truncate longer array or pad shorter one.
 */
function normalizeBulletPairs(
  weak: string[],
  rewritten: string[]
): { weak: string[]; rewritten: string[] } {
  if (weak.length === rewritten.length) {
    return { weak, rewritten };
  }

  // Truncate longer array to match shorter
  const minLength = Math.min(weak.length, rewritten.length);
  return {
    weak: weak.slice(0, minLength),
    rewritten: rewritten.slice(0, minLength),
  };
}

/**
 * Check if resume text indicates edge cases.
 */
export function detectEdgeCases(resumeText: string): {
  isEmpty: boolean;
  isGarbled: boolean;
  isVeryLong: boolean;
  isNonEnglish: boolean;
} {
  const trimmed = resumeText.trim();

  // Empty or very short
  const isEmpty = trimmed.length < 200;

  // Garbled: excessive non-ASCII, merged words (heuristic)
  const nonAsciiRatio =
    (trimmed.match(/[^\x00-\x7F]/g) || []).length / trimmed.length;
  const isGarbled = nonAsciiRatio > 0.3 || trimmed.match(/\S{30,}/g) !== null; // Very long words suggest merging

  // Very long
  const isVeryLong = trimmed.length > 12000;

  // Non-English: heuristic based on common English words
  const commonEnglishWords = [
    "the",
    "and",
    "for",
    "with",
    "experience",
    "skills",
    "education",
    "work",
    "project",
  ];
  const lowerText = trimmed.toLowerCase();
  const englishWordCount = commonEnglishWords.filter((word) =>
    lowerText.includes(word)
  ).length;
  const isNonEnglish = trimmed.length > 500 && englishWordCount < 3;

  return {
    isEmpty,
    isGarbled,
    isVeryLong,
    isNonEnglish,
  };
}

/**
 * Adjust confidence based on detected edge cases.
 */
export function adjustConfidenceForEdgeCases(
  baseConfidence: number,
  edgeCases: ReturnType<typeof detectEdgeCases>
): number {
  let adjusted = baseConfidence;

  if (edgeCases.isEmpty) {
    adjusted = Math.min(adjusted, 0.5);
  }

  if (edgeCases.isGarbled) {
    adjusted = Math.min(adjusted, 0.6);
  }

  if (edgeCases.isNonEnglish) {
    adjusted = Math.min(adjusted, 0.6);
  }

  return Math.max(0, Math.min(1, adjusted));
}