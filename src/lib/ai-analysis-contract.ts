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
 * Strict JSON Schema for GPT-5-mini structured output.
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
            "Skills or competencies the job explicitly requires that are not evidenced in the resume. Must be skills mentioned in JD, not inferred requirements.",
        },
        atsRisks: {
          type: "array",
          items: {
            type: "string",
            minLength: 10,
            maxLength: 200,
          },
          minItems: 0,
          maxItems: 10,
          description:
            "Concrete ATS parsing risks. Examples: 'Two-column layout may confuse parsers', 'Missing skills section', 'Non-standard date format', 'Graphics/tables not parseable'. Must be specific and actionable.",
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
            "Original bullet points from the resume that are vague, passive, lack metrics, or use weak verbs. Quote or paraphrase the exact bullet. Must exist in the resume text.",
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
            "Improved versions of weakBullets, in the same order (1:1 mapping). Use strong action verbs, quantify outcomes, show impact. Must only use facts/achievements present in the resume. Do not invent metrics or results.",
        },
        tailoredSummary: {
          type: "string",
          minLength: 50,
          maxLength: 500,
          description:
            "2-3 sentence professional summary tailored to this specific job. Highlight relevant experience, skills, and achievements from the resume that align with the JD. Use only facts present in the resume. No fabrication.",
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
      },
      required: [
        "matchScore",
        "matchScoreReasoning",
        "missingKeywords",
        "missingSkills",
        "atsRisks",
        "weakBullets",
        "rewrittenBullets",
        "tailoredSummary",
        "confidence",
        "extractionQuality",
        "matchScoreReasoning",
      ],
      additionalProperties: false,
    },
  },
} as const;

/**
 * TypeScript interface matching the JSON schema.
 */
export interface ScanAnalysis {
  matchScore: number; // 0-100
  missingKeywords: string[];
  missingSkills: string[];
  atsRisks: string[];
  weakBullets: string[];
  rewrittenBullets: string[]; // 1:1 with weakBullets, same order
  tailoredSummary: string;
  confidence: number; // 0-1
  extractionQuality: "high" | "medium" | "low";
  matchScoreReasoning?: string; // optional 20-200 chars
}

// ============================================================================
// 2. GROUNDED PROMPT DRAFT
// ============================================================================

/**
 * System prompt for GPT-5-mini (default model).
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
- missingKeywords: Exact terms from JD that are absent or not clearly present in resume. Include technical terms, tools, frameworks.
- missingSkills: Skills explicitly required in JD but not evidenced in resume. Must be mentioned in JD.
- atsRisks: Specific, actionable ATS parsing issues. Be concrete: "Two-column layout", "Missing skills section", "Non-standard date format".
- weakBullets: Quote or paraphrase actual weak bullets from resume. Must exist in the text.
- rewrittenBullets: One improved bullet per weakBullet, same order. Use strong verbs, quantify where possible, but ONLY use metrics/facts from the resume.
- tailoredSummary: 2-3 sentences positioning candidate for this role using ONLY resume facts. No invented achievements.
- confidence (0-1): 1.0 = excellent extraction, clear content. <0.7 = poor parsing, ambiguous, very short. Use to flag fallback needs.
- extractionQuality: Assess PDF text extraction quality. "high" = clean structured text. "medium" = some formatting issues. "low" = significant parsing problems.

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
 * Conditions that trigger fallback to GPT-5 (premium model).
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
 * Determine if fallback to GPT-5 is needed.
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
 * Fallback prompt for GPT-5 (more capable model).
 * Same schema, but with additional instructions for handling edge cases.
 */
export const FALLBACK_SYSTEM_PROMPT = `${ANALYSIS_SYSTEM_PROMPT}

FALLBACK MODE:
You are using the premium model (GPT-5) because the default model encountered issues.
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
  missingKeywords: ["GraphQL", "Docker", "AWS Lambda"],
  missingSkills: ["Kubernetes orchestration", "Event-driven architecture"],
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
    "Full-stack engineer with 6 years of experience building scalable web applications using React, Node.js, and PostgreSQL. Proven track record of improving application performance and leading technical initiatives in fast-paced startup environments.",
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
  missingKeywords: [
    "TypeScript",
    "CI/CD",
    "Microservices",
    "REST API",
    "Agile",
  ],
  missingSkills: [
    "Cloud infrastructure (AWS/GCP/Azure)",
    "Test-driven development",
    "System design",
  ],
  atsRisks: [
    "Two-column layout may confuse ATS parsers",
    "No clear skills section—skills embedded in experience bullets",
    "Contact information in header graphic may not parse",
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
    "Software engineer with 3 years of experience developing web applications. Strong foundation in React and Python with experience in full-stack development and bug resolution.",
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
  missingKeywords: [
    "React",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
    "AWS",
    "CI/CD",
    "GraphQL",
  ],
  missingSkills: [
    "Modern JavaScript frameworks",
    "Cloud platforms",
    "Container orchestration",
    "API design",
  ],
  atsRisks: [
    "Text extraction appears incomplete or garbled",
    "Missing or unclear skills section",
    "Experience dates may not parse correctly",
  ],
  weakBullets: [],
  rewrittenBullets: [],
  tailoredSummary:
    "Software professional with experience in web development. Limited details available due to resume parsing issues. Recommend manual review.",
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
   * Handling: Retry with default model, then fallback to GPT-5
   */
  SCHEMA_VIOLATION: {
    condition: "Model output does not match strict JSON schema",
    handling:
      "Retry up to maxRetries (2), then fallback to GPT-5, if still fails return error",
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