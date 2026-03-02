import OpenAI from "openai";
import { setScanStage, setScanContext, captureScanError } from "./sentry";

/**
 * Structured analysis result from GPT-5-mini (using gpt-4o-mini).
 * Never fabricate candidate experience; only derive from resume + JD.
 */
export interface ScanAnalysis {
  matchScore: number;
  missingKeywords: string[];
  missingSkills: string[];
  atsRisks: string[];
  weakBullets: string[];
  rewrittenBullets: string[];
  tailoredSummary: string;
}

const ANALYSIS_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "scan_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        matchScore: {
          type: "integer",
          description: "Overall match score 0-100",
        },
        missingKeywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords from the job description not clearly present in the resume",
        },
        missingSkills: {
          type: "array",
          items: { type: "string" },
          description: "Skills the job asks for that are not evidenced in the resume",
        },
        atsRisks: {
          type: "array",
          items: { type: "string" },
          description: "ATS risk flags (e.g. non-standard formatting, missing section)",
        },
        weakBullets: {
          type: "array",
          items: { type: "string" },
          description: "Original bullet points that are vague or weak",
        },
        rewrittenBullets: {
          type: "array",
          items: { type: "string" },
          description: "Improved versions of weak bullets (same order as weakBullets), outcome-focused",
        },
        tailoredSummary: {
          type: "string",
          description: "2-3 sentence summary tailored to this job (only using facts from the resume)",
        },
      },
      required: [
        "matchScore",
        "missingKeywords",
        "missingSkills",
        "atsRisks",
        "weakBullets",
        "rewrittenBullets",
        "tailoredSummary",
      ],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You analyze resumes against job descriptions. Output strict JSON only.
Rules:
- Base everything on the resume and job description. Do not invent achievements, skills, or experience.
- matchScore: 0-100, how well the resume matches the job.
- missingKeywords: terms from the JD that do not appear or are not clearly reflected in the resume.
- missingSkills: job requirements (skills) not evidenced in the resume.
- atsRisks: concrete ATS risks (e.g. "No clear skills section", "Tables may not parse").
- weakBullets: resume bullet points that are vague, passive, or lack impact (quote or paraphrase briefly).
- rewrittenBullets: one improved bullet per weak bullet, same order; use strong verbs and outcomes.
- tailoredSummary: 2-3 sentences positioning the candidate for this role using only resume facts.`;

const DEFAULT_MODEL = "gpt-4o-mini";

export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<ScanAnalysis> {
  setScanStage("llm_analysis");
  const model = DEFAULT_MODEL;
  setScanContext({ model });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY is not set");
    captureScanError(err, { stage: "llm_analysis", code: "config_missing" });
    throw err;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const truncatedResume = resumeText.slice(0, 12000);
    const truncatedJd = jobDescription.slice(0, 8000);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Resume:\n${truncatedResume}\n\nJob description:\n${truncatedJd}`,
        },
      ],
      response_format: ANALYSIS_SCHEMA,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      const err = new Error("Empty analysis response");
      captureScanError(err, { stage: "llm_analysis", code: "empty_response" });
      throw err;
    }

    const parsed = JSON.parse(raw) as ScanAnalysis;
    if (typeof parsed.matchScore !== "number") {
      parsed.matchScore = Math.min(100, Math.max(0, Number(parsed.matchScore) || 0));
    }
    setScanContext({ model, analysisValid: true });
    return parsed;
  } catch (err) {
    const code =
      err && typeof err === "object" && "status" in err
        ? "openai_api_error"
        : err instanceof SyntaxError
          ? "malformed_analysis_output"
          : "llm_analysis_failed";
    captureScanError(err, { stage: "llm_analysis", code });
    throw err;
  }
}
