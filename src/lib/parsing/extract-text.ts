/**
 * FEATURES:
 * - Extracts raw plain text from an uploaded resume file buffer
 * - Supports PDF (via pdf-parse@1.1.1) and DOCX (via mammoth)
 * - Throws a descriptive error for unsupported file types
 * - CHANGED: pinned to pdf-parse@1.1.1 instead of the v2 class-based API.
 *   v2 depends on pdfjs-dist's worker thread (pdf.worker.mjs), which
 *   Next.js's bundler doesn't place where pdfjs expects it, causing
 *   "Setting up fake worker failed" at runtime. v1 parses PDFs directly
 *   in Node with no worker involved, so this sidesteps the issue entirely.
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload a PDF or DOCX resume.`);
}