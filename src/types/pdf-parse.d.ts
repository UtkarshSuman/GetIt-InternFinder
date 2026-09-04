declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  type PdfParse = (dataBuffer: Buffer) => Promise<PdfParseResult>;

  const pdfParse: PdfParse;
  export default pdfParse;
}
