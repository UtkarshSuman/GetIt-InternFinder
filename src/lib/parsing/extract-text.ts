/**
 * FEATURES:
 * - Extracts raw plain text from an uploaded resume file buffer
 * - Supports PDF (via pdf-parse v2's class-based API) and DOCX (via mammoth)
 * - Throws a descriptive error for unsupported file types
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload a PDF or DOCX resume.`);
}