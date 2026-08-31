/**
 * FEATURES:
 * - POST /api/resume/upload — accepts a multipart form upload (PDF/DOCX)
 * - Auth-gated: rejects if there's no signed-in session
 * - Saves the raw file to disk under /uploads/{userId}/ (outside /public,
 *   so it's never served directly — only via the authenticated file route)
 * - Extracts text, parses it into structured JSON via local Ollama, and
 *   generates an embedding for later job-matching
 * - Stores everything in the resumes table
 * - If Ollama parsing fails (e.g. not running), the file is still saved and
 *   a resume row is still created with parsedJson: null, so the upload
 *   isn't lost — the error is returned so the UI can explain what to do
 * - CHANGED: the whole handler is now wrapped in try/catch. Previously an
 *   unexpected server error (e.g. a disk write failure) would crash into
 *   Next's HTML error page, and the client's res.json() call on that HTML
 *   would throw "unexpected character at line 1 column 1". Now any error
 *   always comes back as valid JSON with a real message.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { extractTextFromFile } from "@/lib/parsing/extract-text";
import { parseResumeText, embedText } from "@/lib/ai/ollama";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File is too large. Max size is 5MB." }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") {
      return NextResponse.json({ error: "Only PDF and DOCX files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const userDir = path.join(UPLOADS_DIR, session.user.id);
    await mkdir(userDir, { recursive: true });
    const storedFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const filePath = path.join(userDir, storedFileName);
    await writeFile(filePath, buffer);

    let parseError: string | null = null;
    let parsedJson = null;
    let skills: string[] = [];
    let experienceYears: number | null = null;
    let embedding: number[] | null = null;

    try {
      const text = await extractTextFromFile(buffer, file.name);
      const parsed = await parseResumeText(text);
      parsedJson = parsed;
      skills = parsed.skills ?? [];
      experienceYears = parsed.experienceYears ?? null;
      embedding = await embedText(text);
    } catch (err) {
      parseError = err instanceof Error ? err.message : "Failed to parse resume.";
      console.error("[resume/upload] parsing step failed:", err);
    }

    const [created] = await db
      .insert(resumes)
      .values({
        userId: session.user.id,
        fileUrl: filePath,
        fileName: file.name,
        parsedJson,
        skills,
        experienceYears,
        embedding,
      })
      .returning();

    return NextResponse.json(
      {
        resume: created,
        warning: parseError
          ? `File uploaded, but AI parsing didn't complete: ${parseError}`
          : null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[resume/upload] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error during upload." },
      { status: 500 }
    );
  }
}