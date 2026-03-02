/**
 * AI Analysis Contract for Resume Match
 *
 * Defines the strict contract between the application and AI models
 * for resume analysis. Includes schema, prompts, fallback strategies,
 * confidence handling, and edge case documentation.
 */

// ============================================================================
// 1. STRICT JSON SCHEMA
// ============================================================================

/**
 * Strict JSON Schema for gpt-4o-mini structured output.
 * Used with OpenAI's response_format: { type: "json_schema", json_schema: {...} }
 */
export const SCAN_ANALYSIS_JSON_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "resume_scan_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        matchScore: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description:
            "Overall match score 0-100. Higher = better fit. Based on keyword overlap, skill alignment, experience relevance, and ATS compatibility.",
        },
        missingKeywords: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          minItems: 0,
          maxItems: 20,
          description:
            "Keywords from the job description that are not clearly present in the resume. Include technical terms, tools, frameworks, methodologies. Must be exact or near-exact matches from JD.",
        },
        missingSkills: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          minItems: 0,
          maxItems: 15,
          description:
            "Skills or competencies the job explicitly requires that are not evidenced in the resume. Must be skills mentioned in JD, not inferred requirements. Output in priority order: most critical first.",
        },
        criticalMissingKeywords: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          minItems: 0,
          maxItems: 5,
          description:
            "OPTIONAL: The most critical missing keywords that materially threaten fit—explicitly mandatory in JD, core to day-one role, or repeatedly stated as essential. For matchScore >= 75 (strong fit), use very sparingly: 0-2 total items. Do NOT list as critical: optional tools, mild wording gaps, nice-to-have technologies, or adjacent skills not central to role fit. If not using this field, ensure missingKeywords is ordered by priority (most critical first).",
        },
        criticalMissingSkills: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          minItems: 0,
          maxItems: 5,
          description:
            "OPTIONAL: The most critical missing skills that materially threaten fit—explicitly mandatory in JD, core to day-one role, or repeatedly stated as essential. For matchScore >= 75 (strong fit), use very sparingly: 0-2 total items. Do NOT list as critical: optional tools, mild wording gaps, nice-to-have technologies, or adjacent skills not central to role fit. If not using this field, ensure missingSkills is ordered by priority (most critical first).",
        },
        atsRisks: {
          type: "array",
          items: {
            type: "string",
            minLength: 10,
            maxLength: 200,
          },
          minItems: 0,
          maxItems: 6,
          description:
            "Concrete ATS parsing risks that materially affect parsing or screening. Limit to 3-5 high-impact risks. Prioritize issues that materially affect parsing or matching: layout problems, missing sections, non-standard dates, parsing blockers. De-emphasize generic formatting nags ('use standard headings', 'ensure consistent formatting') unless there is a specific problem. Do not list multiple variations of the same issue. Omit template-like advice. Examples: 'Two-column layout may confuse parsers', 'Missing skills section', 'Non-standard date format'. Must be specific and actionable.",
        },
        gapGroups: {
          type: "array",
          items: {
            type: "object",
            properties: {
              theme: {
                type: "string",
                minLength: 1,
                maxLength: 60,
                description: "Theme name describing the type of mismatch (e.g., 'Core frontend stack', 'Backend/integration', 'Process/environment', 'Testing/tooling', 'Optional/nice-to-have').",
              },
              items: {
                type: "array",
                items: {
                  type: "string",
                  minLength: 1,
                  maxLength: 100,
                },
                minItems: 1,
                maxItems: 15,
                description: "Missing keywords or skills that belong to this theme. Each item must be from the JD.",
              },
            },
            required: ["theme", "items"],
            additionalProperties: false,
          },
          minItems: 0,
          maxItems: 8,
          description:
            "OPTIONAL: Group missing keywords/skills into meaningful themes when it improves diagnostic clarity (e.g., 3+ distinct themes). Each group has a theme name and items. Suggested themes: core frontend stack, legacy stack mismatch, backend/integration, process/environment, testing/tooling, optional/nice-to-have. Only use gapGroups when grouping adds clarity—if gaps don't naturally group into 3+ distinct themes, leave gapGroups empty and use missingKeywords/missingSkills. Items in gapGroups should be from missingKeywords/missingSkills (no duplication required, but items should align).",
        },
        weakBullets: {
          type: "array",
          items: {
            type: "string",
            minLength: 10,
            maxLength: 300,
          },
          minItems: 0,
          maxItems: 10,
          description:
            "Original bullet points from the resume that are vague, passive, lack metrics, or use weak verbs. Quote or paraphrase the exact bullet. Must exist in the resume text. ONLY include bullets where you can provide a genuinely stronger rewrite—omit bullets that are already strong or where the rewrite would be only a minor cosmetic change.",
        },
        rewrittenBullets: {
          type: "array",
          items: {
            type: "string",
            minLength: 20,
            maxLength: 300,
          },
          minItems: 0,
          maxItems: 10,
          description:
            "Improved versions of weakBullets, in the same order (1:1 mapping). Each rewrite must be materially stronger: tighter wording, sharper verbs, clearer outcome, or better role alignment. Prefer concise, punchy rewrites. Stay grounded in the original—never invent metrics, team sizes, impact, or scope not supported by the source. FORBIDDEN: cosmetic adjective swaps; empty intensifiers ('successfully', 'effectively', 'significantly' unless they add real value); business-school filler; longer-but-not-better sentences; turning an already-good bullet into a softer, more verbose one. Only output pairs where the rewrite is clearly stronger than the original.",
        },
        tailoredSummary: {
          type: "string",
          minLength: 50,
          maxLength: 500,
          description:
            "2-3 sentence professional summary tailored to this specific job. TONE: Strategic and useful—'this is how your profile aligns with this role'—not robotic or defensive. For strong fit (high matchScore): Emphasize alignment clearly; highlight 2-3 relevant strengths from the resume; mention only meaningful gaps. For weak fit (low matchScore): Be honest about where the candidate is strong and where the mismatch is material; frame as a fair fit assessment, not a rejection or apology. Use only facts present in the resume. No fabrication.",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "Confidence score 0-1. 1.0 = high confidence (clear resume, good extraction). <0.7 = low confidence (poor parsing, ambiguous content, very short resume). Used to trigger fallback model.",
        },
        extractionQuality: {
          type: "string",
          enum: ["high", "medium", "low"],
          description:
            "Quality of text extraction from PDF. 'high' = clean, structured text. 'medium' = some formatting issues but readable. 'low' = significant parsing problems, missing sections, garbled text.",
        },
        matchScoreReasoning: {
          type: "string",
          minLength: 20,
          maxLength: 200,
          description:
            "Required 1-2 sentence explanation of why the match score was assigned. E.g. 'Strong keyword overlap in React and TypeScript; experience level aligns; minor ATS formatting risks.'",
        },
        applyRecommendation: {
          type: "string",
          enum: ["apply_now", "apply_with_edits", "improve_first", "low_priority"],
          description:
            "Practical apply verdict: apply_now = strong match, submit as-is; apply_with_edits = good match, 1-2 targeted changes first; improve_first = partial match, meaningful work needed; low_priority = weak match, significant mismatch. Must align with matchScore and gap profile.",
        },
        applyRecommendationNote: {
          type: "string",
          minLength: 20,
          maxLength: 200,
          description:
            "One-sentence rationale for applyRecommendation. E.g. 'Submit as-is—your experience and keywords align well with the role.' or 'Address the two critical gaps above, then apply.' Honest and grounded.",
        },
        scoreMeaning: {
          type: "string",
          minLength: 0,
          maxLength: 80,
          description:
            "One line explaining what the score means for this role (e.g. 'Strong alignment on core stack; minor gaps in tooling.'). Use empty string to fall back to matchScoreReasoning in UI.",
        },
        missingSignalInsights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              term: {
                type: "string",
                minLength: 1,
                maxLength: 100,
                description: "The missing keyword or skill.",
              },
              whyItMatters: {
                type: "string",
                minLength: 0,
                maxLength: 80,
                description:
                  "Why this signal matters for the role. Use empty string when not applicable.",
              },
              gapType: {
                type: "string",
                enum: ["fully_missing", "phrasing", "experience_gap", "unspecified"],
                description:
                  "fully_missing = not in resume; phrasing = likely present but not stated; experience_gap = likely real gap; unspecified = when unclear.",
              },
            },
            required: ["term", "whyItMatters", "gapType"],
            additionalProperties: false,
          },
          minItems: 0,
          maxItems: 10,
          description:
            "OPTIONAL: For the most important missing keywords/skills (top 5-8), add term, whyItMatters (empty string if not applicable), and gapType (use 'unspecified' when unclear). Keeps report diagnostic.",
        },
        rewriteReasons: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 60,
          },
          minItems: 0,
          maxItems: 10,
          description:
            "OPTIONAL: One short reason per rewrittenBullets (same order), e.g. 'Clearer action/result', 'Better role alignment', 'Stronger keyword fit', 'Tighter phrasing'. Only output when rewrite is materially stronger.",
        },
      },
      required: [
        "matchScore",
        "matchScoreReasoning",
        "applyRecommendation",
        "applyRecommendationNote",
        "missingKeywords",
        "missingSkills",
        "criticalMissingKeywords",
        "criticalMissingSkills",
        "atsRisks",
        "gapGroups",
        "weakBullets",
        "rewrittenBullets",
        "tailoredSummary",
        "confidence",
        "extractionQuality",
        "scoreMeaning",
        "missingSignalInsights",
        "rewriteReasons",
      ],
      additionalProperties: false,
    },
  },
} as const;

/**
 * TypeScript interface matching the JSON schema.
 */
export interface GapGroup {
  theme: string;
  items: string[];
}

/** Optional: why a missing keyword/skill matters and whether it's phrasing vs experience gap. */
export interface MissingSignalInsight {
  term: string;
  whyItMatters?: string;
  gapType?: "fully_missing" | "phrasing" | "experience_gap";
}

/** Premium: single experience bullet rewrite with rationale. */
export interface ExperienceRewrite {
  original: string;
  rewritten: string;
  rationale: string;
}

export type ApplyRecommendation =
  | "apply_now"
  | "apply_with_edits"
  | "improve_first"
  | "low_priority";

export interface ScanAnalysis {
  matchScore: number; // 0-100
  missingKeywords: string[];
  missingSkills: string[];
  criticalMissingKeywords?: string[]; // Optional: 3-5 most critical keywords
  criticalMissingSkills?: string[]; // Optional: 3-5 most critical skills
  atsRisks: string[];
  weakBullets: string[];
  rewrittenBullets: string[]; // 1:1 with weakBullets, same order
  tailoredSummary: string;
  confidence: number; // 0-1
  extractionQuality: "high" | "medium" | "low";
  matchScoreReasoning?: string; // optional 20-200 chars
  gapGroups?: GapGroup[]; // Optional: thematic grouping of gaps
  applyRecommendation: ApplyRecommendation;
  applyRecommendationNote: string; // 20-200 chars
  /** Optional: one line what the score means for this role (20-80 chars). */
  scoreMeaning?: string;
  /** Optional: contextualized insight for top missing keywords/skills. */
  missingSignalInsights?: MissingSignalInsight[];
  /** Optional: short "why better" per rewrittenBullets, same order. */
  rewriteReasons?: string[];
  /** Premium: tailored cover letter for this role. */
  coverLetter?: string;
  /** Premium: all experience bullets rewritten for this role. */
  fullRewrite?: ExperienceRewrite[];
}

// ============================================================================
// 2. GROUNDED PROMPT DRAFT
// ============================================================================

/**
 * System prompt for gpt-4o-mini (default model).
 * Grounded in facts, anti-fabrication, production-ready.
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are a resume analysis expert. Analyze resumes against job descriptions and output structured JSON.

CRITICAL RULES:
1. NEVER fabricate candidate experience, achievements, skills, or metrics.
2. ONLY derive insights from the provided resume text and job description.
3. If information is missing or unclear, mark it as missing—do not infer or invent.
4. All rewritten bullets must use ONLY facts present in the original resume.
5. Confidence score must reflect actual extraction quality and content clarity.

OUTPUT REQUIREMENTS:
- matchScore (0-100): Weighted score based on keyword overlap (40%), skill alignment (30%), experience relevance (20%), ATS compatibility (10%). Always include matchScoreReasoning (20-200 chars) with a brief justification for the score.
- scoreMeaning (OPTIONAL): One line (20-80 chars) explaining what the score means for this role, e.g. "Strong alignment on core stack; minor gaps in tooling." Enables a decisive header.
- applyRecommendation: One of apply_now | apply_with_edits | improve_first | low_priority. Must align with matchScore and gap profile. apply_now = strong match, submit as-is; apply_with_edits = good match, 1-2 targeted changes first; improve_first = partial match, meaningful work needed; low_priority = weak match, significant mismatch.
- applyRecommendationNote: One-sentence honest rationale for the apply verdict (20-200 chars). Must give a clear "what to do": e.g. "Submit as-is—your experience and keywords align well." or "Address the two critical gaps above, then apply." or "Deprioritize this role relative to stronger matches."

GAP PRIORITIZATION:
- criticalMissingKeywords (OPTIONAL): Output the most critical missing keywords that materially threaten fit—explicitly mandatory in JD, core to day-one role, or repeatedly stated as essential. For matchScore >= 75 (strong fit), use very sparingly: 0-2 total items. Do NOT list as critical: optional tools, mild wording gaps, nice-to-have technologies, or adjacent skills not central to role fit. Secondary/nice-to-have deficiencies belong in missingKeywords only.
- criticalMissingSkills (OPTIONAL): Output the most critical missing skills using the same criteria. For matchScore >= 75, use very sparingly: 0-2 total items.
- missingKeywords: All other missing keywords from JD, ordered by priority (most critical first if not using criticalMissingKeywords).
- missingSkills: All other missing skills, ordered by priority (most critical first if not using criticalMissingSkills).
- gapGroups (OPTIONAL): When gaps naturally group into 3+ distinct themes, output gapGroups ordered by impact—first group = biggest blockers for this role. Each group has a theme (e.g., "Core frontend stack", "Backend/integration", "Process/environment", "Testing/tooling", "Optional/nice-to-have") and items (missing keywords/skills from JD). Only use gapGroups when grouping adds diagnostic clarity—if gaps don't naturally group into meaningful themes, leave gapGroups empty and use missingKeywords/missingSkills. Items in gapGroups should align with missingKeywords/missingSkills (no strict duplication required, but should represent the same gaps).
- missingSignalInsights (OPTIONAL): For the most important missing keywords/skills (top 5-8), output an array of { term, whyItMatters (one short sentence, max 80 chars), gapType when clear: fully_missing | phrasing | experience_gap }. Helps the report feel smarter than a raw checklist. Keep concise.

ATS RISKS:
- atsRisks: Limit to 3-5 high-impact risks that materially affect parsing or screening. Prioritize issues that materially affect parsing or matching: layout problems, missing sections, non-standard dates, parsing blockers. De-emphasize generic formatting nags ("use standard headings", "ensure consistent formatting") unless there is a specific problem. Do not list multiple variations of the same issue. Omit template-like advice. Prefer quality over quantity. Be concrete: "Two-column layout may confuse parsers", "Missing skills section", "Non-standard date format".

BULLET REWRITES:
- weakBullets: ONLY include bullets where you can provide a genuinely stronger rewrite. Omit bullets that are already strong or where the rewrite would be only a minor cosmetic change.
- rewrittenBullets: Each rewrite must be materially stronger: tighter wording, sharper verbs, clearer outcome, or better role alignment. Prefer concise, punchy rewrites. FORBIDDEN: cosmetic adjective swaps; empty intensifiers ('successfully', 'effectively', 'significantly' unless they add real value); business-school filler; longer-but-not-better sentences; turning an already-good bullet into a softer, more verbose one. Stay grounded—never invent metrics, team sizes, impact, or scope not supported by the source. Only output pairs where the rewrite is clearly stronger than the original.
- rewriteReasons (OPTIONAL): For each rewrittenBullets item, output a short reason (max 60 chars), same order. Examples: "Clearer action/result", "Better role alignment", "Stronger keyword fit", "Tighter phrasing". Do not add cosmetic or purely longer rewrites; only output pairs where the rewrite is materially better.

TAILORED SUMMARY:
- tailoredSummary: 2-3 sentences. STRUCTURE: First sentence must state fit level clearly (e.g., "Strong fit for this role." / "Partial fit—strengths in X but material gaps in Y." / "Limited fit given the role's focus on Z."). TONE: Strategic and useful—'this is how your profile aligns with this role'—not robotic or defensive. For strong fit (matchScore >= 75): Confident tone; reinforce why the role fits; lead with 2-3 real strengths; mention only 1-2 meaningful refinements. The report should feel like "strong match + actionable refinements," not "you are missing too much despite a high score." For weak fit: Decisive tone; name the mismatch type (e.g., technical stack, experience level, domain); be honest about strengths and material gaps; no watered-down or apologetic language. Avoid vague consultant phrasing ("Consider highlighting," "You may want to"); prefer direct, strategic language. Do not claim strength in an area that you also list as a critical gap unless you explain the nuance (e.g., partial experience). Use only facts from the resume. No fabrication.

QUALITY METRICS:
- confidence (0-1): 1.0 = excellent extraction, clear content. <0.7 = poor parsing, ambiguous, very short. Use to flag fallback needs.
- extractionQuality: Assess PDF text extraction quality. "high" = clean structured text. "medium" = some formatting issues. "low" = significant parsing problems.

CONSISTENCY:
- Ensure the report is internally aligned: (a) If matchScore is high, tailoredSummary must emphasize alignment and strengths; do not list as a critical gap an area the summary describes as a strength. (b) If a skill/area is partially present in the resume, prefer listing it in missingKeywords/missingSkills as secondary, or omit from critical; avoid calling it critical while also stating the candidate is strong in that area. (c) matchScoreReasoning, tailoredSummary, applyRecommendation, applyRecommendationNote, and gap lists must tell one coherent story (strong fit → apply_now or apply_with_edits, few critical gaps; weak fit → improve_first or low_priority, honest gaps).

REPORT QUALITY:
Output should feel strategic and human-useful, not a generic keyword checklist. Prioritize what matters most. Focus on actionable insights that help the candidate understand fit and improve their resume. For strong-fit roles, the reader should feel "this role fits me well" and "these are useful refinements," not punished for an 85% score.

PROPORTIONALITY:
Report density must match fit level. Strong-fit reports (matchScore >= 75) should feel like "strong match + a few refinements"—few critical gaps, summary that leads with alignment, actionable polish opportunities. Weak-fit reports should clearly explain the mismatch type and avoid piling on keywords—honest assessment of why the fit is limited, not just a long list of missing items.

TONE: Professional, credible, practical. Avoid hype or guarantees.`;

/**
 * User prompt template. Insert resume text and job description.
 */
export function buildAnalysisPrompt(
  resumeText: string,
  jobDescription: string
): string {
  return `Analyze this resume against the job description.

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Output strict JSON matching the schema. Base all analysis on the provided texts only.`;
}

// ============================================================================
// 3. FALLBACK STRATEGY
// ============================================================================

/**
 * Conditions that trigger fallback to gpt-4o (premium/fallback model).
 */
export interface FallbackConditions {
  confidenceThreshold: number; // < 0.7 triggers fallback
  extractionQualityThreshold: "low"; // "low" triggers fallback
  maxRetries: number; // Max retries with default model before fallback
  parseErrors: boolean; // JSON parse errors trigger fallback
  schemaViolations: boolean; // Schema validation failures trigger fallback
}

export const DEFAULT_FALLBACK_CONDITIONS: FallbackConditions = {
  confidenceThreshold: 0.7,
  extractionQualityThreshold: "low",
  maxRetries: 2,
  parseErrors: true,
  schemaViolations: true,
};

/**
 * Determine if fallback to gpt-4o is needed.
 */
export function shouldUseFallback(
  result: ScanAnalysis | null,
  error: Error | null,
  attemptCount: number
): boolean {
  if (error) {
    // Parse errors, API errors, etc.
    return attemptCount >= DEFAULT_FALLBACK_CONDITIONS.maxRetries;
  }

  if (!result) {
    return true;
  }

  // Low confidence
  if (result.confidence < DEFAULT_FALLBACK_CONDITIONS.confidenceThreshold) {
    return true;
  }

  // Poor extraction quality
  if (
    result.extractionQuality ===
    DEFAULT_FALLBACK_CONDITIONS.extractionQualityThreshold
  ) {
    return true;
  }

  return false;
}

/**
 * Fallback prompt for gpt-4o (more capable model).
 * Same schema, but with additional instructions for handling edge cases.
 */
export const FALLBACK_SYSTEM_PROMPT = `You are a resume analysis expert. Analyze resumes against job descriptions and output structured JSON.

CRITICAL RULES:
1. NEVER fabricate candidate experience, achievements, skills, or metrics.
2. ONLY derive insights from the provided resume text and job description.
3. If information is missing or unclear, mark it as missing—do not infer or invent.
4. All rewritten bullets must use ONLY facts present in the original resume.
5. Confidence score must reflect actual extraction quality and content clarity.

OUTPUT REQUIREMENTS:
- matchScore (0-100): Weighted score based on keyword overlap (40%), skill alignment (30%), experience relevance (20%), ATS compatibility (10%). Always include matchScoreReasoning (20-200 chars) with a brief justification for the score.
- scoreMeaning (OPTIONAL): One line (20-80 chars) explaining what the score means for this role, e.g. "Strong alignment on core stack; minor gaps in tooling." Enables a decisive header.
- applyRecommendation: One of apply_now | apply_with_edits | improve_first | low_priority. Must align with matchScore and gap profile. apply_now = strong match, submit as-is; apply_with_edits = good match, 1-2 targeted changes first; improve_first = partial match, meaningful work needed; low_priority = weak match, significant mismatch.
- applyRecommendationNote: One-sentence honest rationale for the apply verdict (20-200 chars). Must give a clear "what to do": e.g. "Submit as-is—your experience and keywords align well." or "Address the two critical gaps above, then apply." or "Deprioritize this role relative to stronger matches."

GAP PRIORITIZATION:
- criticalMissingKeywords (OPTIONAL): Output the most critical missing keywords that materially threaten fit—explicitly mandatory in JD, core to day-one role, or repeatedly stated as essential. For matchScore >= 75 (strong fit), use very sparingly: 0-2 total items. Do NOT list as critical: optional tools, mild wording gaps, nice-to-have technologies, or adjacent skills not central to role fit. Secondary/nice-to-have deficiencies belong in missingKeywords only.
- criticalMissingSkills (OPTIONAL): Output the most critical missing skills using the same criteria. For matchScore >= 75, use very sparingly: 0-2 total items.
- missingKeywords: All other missing keywords from JD, ordered by priority (most critical first if not using criticalMissingKeywords).
- missingSkills: All other missing skills, ordered by priority (most critical first if not using criticalMissingSkills).
- gapGroups (OPTIONAL): When gaps naturally group into 3+ distinct themes, output gapGroups ordered by impact—first group = biggest blockers for this role. Each group has a theme (e.g., "Core frontend stack", "Backend/integration", "Process/environment", "Testing/tooling", "Optional/nice-to-have") and items (missing keywords/skills from JD). Only use gapGroups when grouping adds diagnostic clarity—if gaps don't naturally group into meaningful themes, leave gapGroups empty and use missingKeywords/missingSkills. Items in gapGroups should align with missingKeywords/missingSkills (no strict duplication required, but should represent the same gaps).
- missingSignalInsights (OPTIONAL): For the most important missing keywords/skills (top 5-8), output an array of { term, whyItMatters (one short sentence, max 80 chars), gapType when clear: fully_missing | phrasing | experience_gap }. Helps the report feel smarter than a raw checklist. Keep concise.

ATS RISKS:
- atsRisks: Limit to 3-5 high-impact risks that materially affect parsing or screening. Prioritize issues that materially affect parsing or matching: layout problems, missing sections, non-standard dates, parsing blockers. De-emphasize generic formatting nags ("use standard headings", "ensure consistent formatting") unless there is a specific problem. Do not list multiple variations of the same issue. Omit template-like advice. Prefer quality over quantity. Be concrete: "Two-column layout may confuse parsers", "Missing skills section", "Non-standard date format".

BULLET REWRITES:
- weakBullets: ONLY include bullets where you can provide a genuinely stronger rewrite. Omit bullets that are already strong or where the rewrite would be only a minor cosmetic change.
- rewrittenBullets: Each rewrite must be materially stronger: tighter wording, sharper verbs, clearer outcome, or better role alignment. Prefer concise, punchy rewrites. FORBIDDEN: cosmetic adjective swaps; empty intensifiers ('successfully', 'effectively', 'significantly' unless they add real value); business-school filler; longer-but-not-better sentences; turning an already-good bullet into a softer, more verbose one. Stay grounded—never invent metrics, team sizes, impact, or scope not supported by the source. Only output pairs where the rewrite is clearly stronger than the original.
- rewriteReasons (OPTIONAL): For each rewrittenBullets item, output a short reason (max 60 chars), same order. Examples: "Clearer action/result", "Better role alignment", "Stronger keyword fit", "Tighter phrasing". Do not add cosmetic or purely longer rewrites; only output pairs where the rewrite is materially better.

TAILORED SUMMARY:
- tailoredSummary: 2-3 sentences. STRUCTURE: First sentence must state fit level clearly (e.g., "Strong fit for this role." / "Partial fit—strengths in X but material gaps in Y." / "Limited fit given the role's focus on Z."). TONE: Strategic and useful—'this is how your profile aligns with this role'—not robotic or defensive. For strong fit (matchScore >= 75): Confident tone; reinforce why the role fits; lead with 2-3 real strengths; mention only 1-2 meaningful refinements. The report should feel like "strong match + actionable refinements," not "you are missing too much despite a high score." For weak fit: Decisive tone; name the mismatch type (e.g., technical stack, experience level, domain); be honest about strengths and material gaps; no watered-down or apologetic language. Avoid vague consultant phrasing ("Consider highlighting," "You may want to"); prefer direct, strategic language. Do not claim strength in an area that you also list as a critical gap unless you explain the nuance (e.g., partial experience). Use only facts from the resume. No fabrication.

QUALITY METRICS:
- confidence (0-1): 1.0 = excellent extraction, clear content. <0.7 = poor parsing, ambiguous, very short. Use to flag fallback needs.
- extractionQuality: Assess PDF text extraction quality. "high" = clean structured text. "medium" = some formatting issues. "low" = significant parsing problems.

CONSISTENCY:
- Ensure the report is internally aligned: (a) If matchScore is high, tailoredSummary must emphasize alignment and strengths; do not list as a critical gap an area the summary describes as a strength. (b) If a skill/area is partially present in the resume, prefer listing it in missingKeywords/missingSkills as secondary, or omit from critical; avoid calling it critical while also stating the candidate is strong in that area. (c) matchScoreReasoning, tailoredSummary, applyRecommendation, applyRecommendationNote, and gap lists must tell one coherent story (strong fit → apply_now or apply_with_edits, few critical gaps; weak fit → improve_first or low_priority, honest gaps).

REPORT QUALITY:
Output should feel strategic and human-useful, not a generic keyword checklist. Prioritize what matters most. Focus on actionable insights that help the candidate understand fit and improve their resume. For strong-fit roles, the reader should feel "this role fits me well" and "these are useful refinements," not punished for an 85% score.

PROPORTIONALITY:
Report density must match fit level. Strong-fit reports (matchScore >= 75) should feel like "strong match + a few refinements"—few critical gaps, summary that leads with alignment, actionable polish opportunities. Weak-fit reports should clearly explain the mismatch type and avoid piling on keywords—honest assessment of why the fit is limited, not just a long list of missing items.

TONE: Professional, credible, practical. Avoid hype or guarantees.

FALLBACK MODE:
You are using the premium model (gpt-4o) because the default model encountered issues.
- Handle ambiguous or poorly extracted text more carefully.
- If resume text is garbled or incomplete, mark confidence low and extractionQuality as "low".
- Be extra cautious about not fabricating content when text is unclear.
- Provide best-effort analysis even with suboptimal input.`;

// ============================================================================
// 4. CONFIDENCE HANDLING
// ============================================================================

/**
 * Confidence scoring guidelines for the model.
 * These are instructions embedded in the prompt to help the model self-assess.
 */
export const CONFIDENCE_GUIDELINES = `
Confidence scoring (0-1):
- 1.0: Excellent extraction, clear resume structure, all sections present, unambiguous content
- 0.9-0.99: Very good extraction, minor formatting quirks, clear content
- 0.8-0.89: Good extraction, some formatting issues, mostly clear content
- 0.7-0.79: Acceptable extraction, noticeable formatting problems, some ambiguity
- 0.6-0.69: Poor extraction, significant formatting issues, ambiguous content
- <0.6: Very poor extraction, garbled text, missing sections, unparseable content

Extraction quality assessment:
- "high": Clean, structured text. All sections parseable. Standard formatting.
- "medium": Some formatting issues (e.g., merged words, spacing problems) but readable. Most sections intact.
- "low": Significant parsing problems. Missing sections, garbled text, unreadable content, or very short resume (<200 chars).
`;

/**
 * Validate and clamp confidence values from model output.
 */
export function normalizeConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value) || 0;
  return Math.max(0, Math.min(1, num));
}

/**
 * Validate and clamp match score values.
 */
export function normalizeMatchScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

// ============================================================================
// 5. EXAMPLE VALID OUTPUTS
// ============================================================================

/**
 * Example 1: High-quality resume, good match
 */
export const EXAMPLE_OUTPUT_HIGH_QUALITY: ScanAnalysis = {
  matchScore: 85,
  applyRecommendation: "apply_now",
  applyRecommendationNote:
    "Submit as-is—your experience and keywords align well with the role; minor refinements are optional.",
  missingKeywords: ["GraphQL", "Docker", "AWS Lambda"],
  missingSkills: ["Kubernetes orchestration", "Event-driven architecture"],
  criticalMissingKeywords: [],
  criticalMissingSkills: [],
  atsRisks: [
    "Skills section uses icons instead of text, may not parse",
    "Date format inconsistent (MM/YYYY vs YYYY-MM)",
  ],
  weakBullets: [
    "Worked on improving application performance",
    "Helped with team code reviews",
    "Responsible for managing database migrations",
  ],
  rewrittenBullets: [
    "Optimized application performance, reducing page load times by 40% through code refactoring and caching strategies",
    "Conducted 200+ code reviews per quarter, identifying and preventing critical bugs before production deployment",
    "Managed database migrations for 5 major releases, ensuring zero-downtime deployments and data integrity",
  ],
  tailoredSummary:
    "Full-stack engineer with 6 years of experience building scalable web applications using React, Node.js, and PostgreSQL. Strong alignment with the role's core requirements—proven track record of improving application performance and leading technical initiatives in fast-paced startup environments. Consider adding Docker and AWS Lambda experience to strengthen your fit.",
  confidence: 0.95,
  extractionQuality: "high",
  matchScoreReasoning:
    "Strong keyword overlap in React and Node.js; experience level and scope align with role; minor ATS risks from skills section formatting.",
};

/**
 * Example 2: Medium-quality resume, moderate match
 */
export const EXAMPLE_OUTPUT_MEDIUM_QUALITY: ScanAnalysis = {
  matchScore: 62,
  applyRecommendation: "apply_with_edits",
  applyRecommendationNote:
    "Address the critical gaps (TypeScript, CI/CD, cloud) where you have experience, then apply.",
  missingKeywords: ["REST API", "Agile"],
  missingSkills: ["Test-driven development"],
  criticalMissingKeywords: ["TypeScript", "CI/CD", "Microservices"],
  criticalMissingSkills: [
    "Cloud infrastructure (AWS/GCP/Azure)",
    "System design",
  ],
  atsRisks: [
    "Two-column layout may confuse ATS parsers",
    "No clear skills section—skills embedded in experience bullets",
  ],
  weakBullets: [
    "Developed features for web application",
    "Fixed bugs and issues",
    "Participated in team meetings",
  ],
  rewrittenBullets: [
    "Developed and deployed 15+ user-facing features for production web application using React and Python, improving user engagement by 25%",
    "Resolved 50+ critical bugs across frontend and backend systems, reducing production incidents by 30%",
    "Collaborated with cross-functional team of 8 in daily standups and sprint planning, contributing to on-time delivery of 4 major releases",
  ],
  tailoredSummary:
    "Software engineer with 3 years of experience developing web applications. Strong foundation in React and Python with demonstrated full-stack development and bug resolution capabilities. The role requires TypeScript, CI/CD, and cloud infrastructure experience that isn't clearly evidenced in your resume—consider highlighting any related experience or learning plans.",
  confidence: 0.75,
  extractionQuality: "medium",
  matchScoreReasoning:
    "Moderate keyword match; several JD technologies and cloud skills not evidenced. Two-column layout and embedded skills may affect ATS parsing.",
};

/**
 * Example 3: Low-quality extraction, poor match
 */
export const EXAMPLE_OUTPUT_LOW_QUALITY: ScanAnalysis = {
  matchScore: 35,
  applyRecommendation: "improve_first",
  applyRecommendationNote:
    "The role requires React, Node.js, and cloud experience not clearly evidenced—build or highlight these before applying.",
  missingKeywords: ["GraphQL"],
  missingSkills: ["API design"],
  criticalMissingKeywords: [
    "React",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
  ],
  criticalMissingSkills: [
    "Modern JavaScript frameworks",
    "Cloud platforms",
    "Container orchestration",
  ],
  atsRisks: [
    "Text extraction appears incomplete or garbled",
    "Missing or unclear skills section",
  ],
  weakBullets: [],
  rewrittenBullets: [],
  tailoredSummary:
    "Software professional with experience in web development. Limited details available due to resume parsing issues—this analysis may not reflect your full qualifications. The role requires React, Node.js, and cloud platform experience that isn't clearly evidenced. Recommend manual review and ensuring your resume is in a text-parseable format.",
  confidence: 0.45,
  extractionQuality: "low",
  matchScoreReasoning:
    "Low score due to incomplete extraction and missing evidence for key JD requirements; parsing quality limits confidence in analysis.",
};

// ============================================================================
// 6. EDGE CASES AND FAILURE MODES
// ============================================================================

/**
 * Documented edge cases and how to handle them.
 */
export const EDGE_CASES = {
  /**
   * Empty or very short resume text (< 200 chars)
   * Handling: Mark confidence < 0.6, extractionQuality "low", return minimal analysis
   */
  EMPTY_RESUME: {
    condition: "resumeText.length < 200",
    handling:
      "Set confidence < 0.6, extractionQuality 'low', minimal analysis, flag for fallback",
  },

  /**
   * Garbled or unparseable PDF text
   * Handling: Mark extractionQuality "low", confidence < 0.7, trigger fallback
   */
  GARBLED_TEXT: {
    condition: "Text contains excessive non-ASCII, merged words, or unreadable content",
    handling:
      "Set extractionQuality 'low', confidence < 0.7, attempt fallback model, return best-effort analysis",
  },

  /**
   * Resume with only images/graphics, no text
   * Handling: PDF extraction returns empty or near-empty string
   */
  IMAGE_ONLY_RESUME: {
    condition: "resumeText.trim().length === 0",
    handling:
      "Throw error: 'No text extracted from PDF. Resume may be image-only.'",
  },

  /**
   * Very long resume (> 12,000 chars after truncation)
   * Handling: Truncate to 12,000 chars, note in confidence if significant content lost
   */
  VERY_LONG_RESUME: {
    condition: "resumeText.length > 12000",
    handling:
      "Truncate to 12,000 chars, if >15,000 original, reduce confidence by 0.1",
  },

  /**
   * Very long job description (> 8,000 chars)
   * Handling: Truncate to 8,000 chars
   */
  VERY_LONG_JD: {
    condition: "jobDescription.length > 8000",
    handling: "Truncate to 8,000 chars",
  },

  /**
   * Job description with no clear requirements
   * Handling: Return lower match scores, fewer missing items, note ambiguity
   */
  VAGUE_JD: {
    condition: "JD lacks specific skills, technologies, or requirements",
    handling:
      "Return fewer missingKeywords/missingSkills, note in atsRisks if JD is too vague for meaningful analysis",
  },

  /**
   * Resume with no work experience section
   * Handling: Analyze education/skills only, adjust match score accordingly
   */
  NO_EXPERIENCE: {
    condition: "Resume contains only education, skills, or projects, no work history",
    handling:
      "Analyze available sections, adjust matchScore algorithm (weight education/skills higher), note in atsRisks",
  },

  /**
   * Non-English resume
   * Handling: Attempt analysis but mark confidence lower, note language mismatch
   */
  NON_ENGLISH: {
    condition: "Resume text is primarily non-English",
    handling:
      "Mark confidence < 0.6, note in atsRisks: 'Resume appears to be in non-English language'",
  },

  /**
   * JSON schema validation failure
   * Handling: Retry with default model, then fallback to gpt-4o
   */
  SCHEMA_VIOLATION: {
    condition: "Model output does not match strict JSON schema",
    handling:
      "Retry up to maxRetries (2), then fallback to gpt-4o, if still fails return error",
  },

  /**
   * API rate limit or timeout
   * Handling: Exponential backoff retry, then fallback model
   */
  API_ERROR: {
    condition: "OpenAI API returns rate limit, timeout, or 5xx error",
    handling:
      "Exponential backoff retry (1s, 2s, 4s), then try fallback model, if still fails return error",
  },

  /**
   * Mismatched array lengths (weakBullets vs rewrittenBullets)
   * Handling: Validate 1:1 mapping, pad or truncate to match, log warning
   */
  ARRAY_MISMATCH: {
    condition: "weakBullets.length !== rewrittenBullets.length",
    handling:
      "Truncate longer array to match shorter, log warning, proceed with analysis",
  },

  /**
   * Invalid match score (outside 0-100)
   * Handling: Clamp to 0-100 range
   */
  INVALID_MATCH_SCORE: {
    condition: "matchScore < 0 or matchScore > 100",
    handling: "Clamp to [0, 100] range using normalizeMatchScore()",
  },

  /**
   * Invalid confidence (outside 0-1)
   * Handling: Clamp to 0-1 range
   */
  INVALID_CONFIDENCE: {
    condition: "confidence < 0 or confidence > 1",
    handling: "Clamp to [0, 1] range using normalizeConfidence()",
  },

  /**
   * Rewritten bullets that invent metrics not in resume
   * Handling: Post-process validation (if possible), flag in confidence reduction
   */
  FABRICATED_METRICS: {
    condition: "rewrittenBullets contain numbers/metrics not present in original resume",
    handling:
      "Difficult to detect automatically. Rely on strict prompt instructions. If detected in post-processing, reduce confidence by 0.2",
  },
} as const;

/**
 * Failure mode handling strategy.
 */
export interface FailureMode {
  error: string;
  retry: boolean;
  fallback: boolean;
  userMessage: string;
}

export const FAILURE_MODES: Record<string, FailureMode> = {
  NO_TEXT_EXTRACTED: {
    error: "No text extracted from PDF",
    retry: false,
    fallback: false,
    userMessage:
      "Unable to extract text from your resume PDF. Please ensure it's not image-only and try a different file format.",
  },
  API_RATE_LIMIT: {
    error: "OpenAI API rate limit exceeded",
    retry: true,
    fallback: true,
    userMessage:
      "Service temporarily unavailable due to high demand. Please try again in a moment.",
  },
  API_TIMEOUT: {
    error: "OpenAI API request timed out",
    retry: true,
    fallback: true,
    userMessage:
      "Analysis is taking longer than expected. Please try again.",
  },
  SCHEMA_VALIDATION_FAILED: {
    error: "AI response does not match expected schema",
    retry: true,
    fallback: true,
    userMessage:
      "Analysis didn't complete. Try again in a moment; if it keeps happening, try a shorter job description or a different resume PDF.",
  },
  INVALID_RESPONSE: {
    error: "AI returned invalid or empty response",
    retry: true,
    fallback: true,
    userMessage:
      "Unable to process the analysis. Please try again.",
  },
  LOW_CONFIDENCE: {
    error: "Analysis confidence below threshold",
    retry: false,
    fallback: true,
    userMessage:
      "Resume analysis completed, but results may be less accurate due to PDF parsing issues. Consider using a text-based resume format.",
  },
} as const;