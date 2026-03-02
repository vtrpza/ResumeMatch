import { setScanStage, captureScanError } from "./sentry";

/**
 * Extract plain text from a PDF buffer.
 * Uses pdf-parse (Node.js). Returns trimmed string or throws.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  setScanStage("pdf_extract");
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const text = typeof data?.text === "string" ? data.text : "";
    const trimmed = text.trim();
    if (!trimmed) throw new Error("No text extracted from PDF");
    return trimmed;
  } catch (err) {
    captureScanError(err, { stage: "pdf_extract", code: "pdf_parse_failed" });
    throw err;
  }
}
