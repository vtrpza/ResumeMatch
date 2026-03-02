/**
 * Validation utilities for AI analysis contract.
 * Ensures outputs conform to schema and handles edge cases.
 */

import * as Sentry from "@sentry/nextjs";
import type { ScanAnalysis, GapGroup } from "./ai-analysis-contract";
import {
  normalizeConfidence,
  normalizeMatchScore,
} from "./ai-analysis-contract";

// Re-export for type compatibility
export type { ScanAnalysis } from "./ai-analysis-contract";

/**
 * Validate and normalize a ScanAnalysis result.
 * Handles edge cases, clamps values, ensures array consistency.
 */
export function validateAndNormalizeAnalysis(
  raw: unknown
): ScanAnalysis | null {
  if (!raw || typeof raw !== "object") {
    Sentry.setTag(
      "validation_fail",
      !raw ? "raw_falsy" : "raw_not_object"
    );
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Validate and normalize matchScore
  const matchScore = normalizeMatchScore(obj.matchScore);

  // Validate arrays
  const missingKeywords = validateStringArray(obj.missingKeywords, 0, 20, 100);
  const missingSkills = validateStringArray(obj.missingSkills, 0, 15, 100);
  let atsRisks = validateStringArray(obj.atsRisks, 0, 6, 200);
  const weakBullets = validateStringArray(obj.weakBullets, 0, 10, 300);
  const rewrittenBullets = validateStringArray(
    obj.rewrittenBullets,
    0,
    10,
    300
  );

  // Validate optional critical gap arrays
  const criticalMissingKeywords = validateStringArray(
    obj.criticalMissingKeywords,
    0,
    5,
    100
  );
  const criticalMissingSkills = validateStringArray(
    obj.criticalMissingSkills,
    0,
    5,
    100
  );

  // Validate optional gapGroups
  const gapGroups = validateGapGroups(obj.gapGroups);

  // Filter ATS risks: dedupe near-duplicates and remove generic low-value phrases
  atsRisks = filterAtsRisks(atsRisks);

  // Ensure 1:1 mapping between weakBullets and rewrittenBullets
  const normalizedBullets = normalizeBulletPairs(weakBullets, rewrittenBullets);

  // Filter out cosmetic rewrites (optional similarity check)
  const filteredBullets = filterCosmeticRewrites(
    normalizedBullets.weak,
    normalizedBullets.rewritten
  );

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

  // Optional matchScoreReasoning (20-200 chars)
  let matchScoreReasoning: string | undefined;
  if (typeof obj.matchScoreReasoning === "string") {
    const s = obj.matchScoreReasoning.trim().slice(0, 200);
    if (s.length >= 20) matchScoreReasoning = s;
  }

  const result: ScanAnalysis = {
    matchScore,
    missingKeywords,
    missingSkills,
    atsRisks,
    weakBullets: filteredBullets.weak,
    rewrittenBullets: filteredBullets.rewritten,
    tailoredSummary,
    confidence,
    extractionQuality,
    ...(matchScoreReasoning !== undefined && { matchScoreReasoning }),
  };

  // Add optional critical gap fields if present
  if (criticalMissingKeywords.length > 0) {
    result.criticalMissingKeywords = criticalMissingKeywords;
  }
  if (criticalMissingSkills.length > 0) {
    result.criticalMissingSkills = criticalMissingSkills;
  }

  // Add optional gapGroups if present
  if (gapGroups.length > 0) {
    result.gapGroups = gapGroups;
  }

  // Recalibrate critical gaps for high-fit roles (matchScore >= 75)
  const recalibrated = recalibrateCriticalGapsForHighFit(result);

  return recalibrated;
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
 * Validate gapGroups array.
 */
function validateGapGroups(value: unknown): GapGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const groups: GapGroup[] = [];
  for (const group of value.slice(0, 8)) {
    if (!group || typeof group !== "object") {
      continue;
    }

    const theme = typeof group.theme === "string" ? group.theme.trim().slice(0, 60) : "";
    if (!theme) {
      continue;
    }

    const items = validateStringArray(group.items, 1, 15, 100);
    if (items.length === 0) {
      continue;
    }

    groups.push({ theme, items });
  }

  return groups;
}

/**
 * Filter ATS risks: remove near-duplicates and generic low-value phrases.
 */
function filterAtsRisks(risks: string[]): string[] {
  if (risks.length === 0) {
    return [];
  }

  // Generic low-value phrase patterns (minimal blocklist)
  const genericPatterns = [
    /^consider using standard section headings$/i,
    /^ensure consistent formatting$/i,
  ];

  // Filter out generic phrases
  let filtered = risks.filter((risk) => {
    const trimmed = risk.trim().toLowerCase();
    return !genericPatterns.some((pattern) => pattern.test(trimmed));
  });

  // Dedupe near-duplicates (high string similarity)
  const deduped: string[] = [];
  for (const risk of filtered) {
    const riskLower = risk.toLowerCase().trim();
    const isDuplicate = deduped.some((existing) => {
      const existingLower = existing.toLowerCase().trim();
      const similarity = calculateStringSimilarity(riskLower, existingLower);
      return similarity > 0.85; // 85% similarity threshold
    });

    if (!isDuplicate) {
      deduped.push(risk);
    }
  }

  return deduped;
}

/**
 * Calculate string similarity ratio (0-1) using word overlap and edit distance.
 */
function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;

  // Word overlap ratio
  const words1 = new Set(s1.split(/\s+/).filter(Boolean));
  const words2 = new Set(s2.split(/\s+/).filter(Boolean));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  const wordOverlap = union.size > 0 ? intersection.size / union.size : 0;

  // Edit distance ratio
  const maxLen = Math.max(s1.length, s2.length);
  const editDistance = simpleEditDistance(s1, s2);
  const editRatio = maxLen > 0 ? 1 - editDistance / maxLen : 0;

  // Weighted combination (favor word overlap for ATS risks)
  return wordOverlap * 0.7 + editRatio * 0.3;
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

/** Common typography/safe Unicode to exclude from "garbled" non-ASCII ratio (curly quotes, dashes, bullet). */
const SAFE_UNICODE = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g;

/**
 * Recalibrate critical gaps for high-fit roles (matchScore >= 75).
 * Caps total critical gaps at 2 and moves excess to missingKeywords/missingSkills.
 */
function recalibrateCriticalGapsForHighFit(
  analysis: ScanAnalysis
): ScanAnalysis {
  // Only recalibrate for strong-fit roles
  if (analysis.matchScore < 75) {
    return analysis;
  }

  const criticalKeywords = analysis.criticalMissingKeywords || [];
  const criticalSkills = analysis.criticalMissingSkills || [];
  const totalCritical = criticalKeywords.length + criticalSkills.length;

  // If total critical gaps <= 2, no recalibration needed
  if (totalCritical <= 2) {
    return analysis;
  }

  // Cap at 2 total, prioritizing keywords over skills
  const maxCriticalKeywords = Math.min(criticalKeywords.length, 2);
  const remainingSlots = 2 - maxCriticalKeywords;
  const maxCriticalSkills = Math.min(criticalSkills.length, remainingSlots);

  const keptKeywords = criticalKeywords.slice(0, maxCriticalKeywords);
  const keptSkills = criticalSkills.slice(0, maxCriticalSkills);
  const movedKeywords = criticalKeywords.slice(maxCriticalKeywords);
  const movedSkills = criticalSkills.slice(maxCriticalSkills);

  // Build new result with recalibrated gaps
  const result: ScanAnalysis = {
    ...analysis,
    missingKeywords: [...(analysis.missingKeywords || []), ...movedKeywords],
    missingSkills: [...(analysis.missingSkills || []), ...movedSkills],
  };

  // Only include critical arrays if they have items
  if (keptKeywords.length > 0) {
    result.criticalMissingKeywords = keptKeywords;
  } else {
    delete result.criticalMissingKeywords;
  }

  if (keptSkills.length > 0) {
    result.criticalMissingSkills = keptSkills;
  } else {
    delete result.criticalMissingSkills;
  }

  return result;
}

/**
 * Filter out cosmetic rewrites that are too similar to the original.
 * Uses word overlap and edit distance heuristics to identify low-value rewrites.
 * Also filters out filler-heavy rewrites (empty intensifiers, long-but-same).
 */
function filterCosmeticRewrites(
  weak: string[],
  rewritten: string[]
): { weak: string[]; rewritten: string[] } {
  if (weak.length !== rewritten.length) {
    return { weak, rewritten };
  }

  const filtered: { weak: string[]; rewritten: string[] } = {
    weak: [],
    rewritten: [],
  };

  // Filler words that indicate low-value padding if added to original
  const fillerStarters = ["successfully", "effectively", "significantly", "proactively"];

  for (let i = 0; i < weak.length; i++) {
    const original = weak[i].toLowerCase().trim();
    const rewrite = rewritten[i].toLowerCase().trim();

    // Skip if either is empty
    if (!original || !rewrite) {
      continue;
    }

    // Calculate word overlap ratio
    const originalWords = new Set(original.split(/\s+/));
    const rewriteWords = new Set(rewrite.split(/\s+/));
    const intersection = new Set(
      [...originalWords].filter((w) => rewriteWords.has(w))
    );
    const union = new Set([...originalWords, ...rewriteWords]);
    const overlapRatio = union.size > 0 ? intersection.size / union.size : 0;

    // Calculate simple edit distance ratio (Levenshtein-like heuristic)
    const maxLen = Math.max(original.length, rewrite.length);
    const editDistance = simpleEditDistance(original, rewrite);
    const editRatio = maxLen > 0 ? editDistance / maxLen : 0;

    // Filler-start filter: exclude if rewrite starts with filler and original doesn't,
    // and rewrite is not substantially different
    const rewriteStartsWithFiller = fillerStarters.some((filler) =>
      rewrite.startsWith(filler)
    );
    const originalStartsWithFiller = fillerStarters.some((filler) =>
      original.startsWith(filler)
    );
    const hasFillerPadding =
      rewriteStartsWithFiller && !originalStartsWithFiller;
    const isSubstantiallyDifferent = editRatio > 0.25;
    const isSignificantlyLonger = rewrite.length > original.length * 1.3;
    const hasLowOverlap = overlapRatio < 0.7;

    // Exclude if filler padding without substantial change
    if (
      hasFillerPadding &&
      !isSubstantiallyDifferent &&
      !(isSignificantlyLonger && hasLowOverlap)
    ) {
      continue;
    }

    // Long-but-same heuristic: exclude if rewrite is >1.4x length with high overlap
    // unless edit ratio > 0.2 (substantial textual change)
    const isLongButSame =
      rewrite.length > original.length * 1.4 &&
      overlapRatio > 0.75 &&
      editRatio <= 0.2;

    if (isLongButSame) {
      continue;
    }

    // Keep if rewrite is meaningfully different:
    // - Word overlap < 0.85 (not just reordering/synonyms)
    // - Edit distance ratio > 0.15 (substantial changes)
    // - Or rewrite is significantly longer (likely added specificity)
    const isSignificantlyLongerForKeep = rewrite.length > original.length * 1.3;

    if (
      overlapRatio < 0.85 ||
      editRatio > 0.15 ||
      isSignificantlyLongerForKeep
    ) {
      filtered.weak.push(weak[i]);
      filtered.rewritten.push(rewritten[i]);
    }
  }

  return filtered;
}

/**
 * Simple edit distance calculation (Levenshtein-like).
 * Returns the minimum number of single-character edits needed.
 */
function simpleEditDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if resume text indicates edge cases.
 * Heuristics are tuned to avoid false positives: normal PDF typography and single merged tokens do not trigger "garbled".
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

  // Garbled: strong evidence only. (1) Non-ASCII: exclude safe typography, then require >50% suspicious chars.
  // (2) Merged words: require at least one token ≥50 chars, or at least two tokens ≥25 chars (single 35-char token is not enough).
  const withoutSafeUnicode = trimmed.replace(SAFE_UNICODE, " ");
  const nonAsciiCount = (withoutSafeUnicode.match(/[^\x00-\x7F]/g) || []).length;
  const nonAsciiRatio = trimmed.length > 0 ? nonAsciiCount / trimmed.length : 0;
  const isGarbledByNonAscii = nonAsciiRatio > 0.5;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const longTokens = tokens.filter((t) => t.length >= 25);
  const hasVeryLongToken = tokens.some((t) => t.length >= 50);
  const isGarbledByMerge = hasVeryLongToken || longTokens.length >= 2;

  const isGarbled = isGarbledByNonAscii || isGarbledByMerge;

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

  // Do not cap for isGarbled; rely on model's confidence/extractionQuality from the prompt note.

  if (edgeCases.isNonEnglish) {
    adjusted = Math.min(adjusted, 0.6);
  }

  return Math.max(0, Math.min(1, adjusted));
}