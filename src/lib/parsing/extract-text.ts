/**
 * FEATURES:
 * - Extracts raw plain text from an uploaded resume file buffer
 * - Supports PDF (via pdf-parse@1.1.1) and DOCX (via mammoth)
 * - Throws a descriptive error for unsupported file types
 * - Imports pdf-parse's library entry directly. The package root runs a
 *   debug/test block under dynamic ESM import and tries to read a missing
 *   ./test/data PDF before our uploaded file is parsed.
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
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
