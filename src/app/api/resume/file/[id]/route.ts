/**
 * FEATURES:
 * - GET /api/resume/file/[id] — streams the original uploaded resume file
 * - Ownership check: 404s if the resume doesn't belong to the signed-in
 *   user, so resumes are never accessible by guessing another user's ID
 * - Files live outside /public specifically so this route is the only way
 *   to reach them
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, session.user.id)))
    .limit(1);

  if (!resume) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const buffer = await readFile(resume.fileUrl);
  const isPdf = resume.fileName.toLowerCase().endsWith(".pdf");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `inline; filename="${resume.fileName}"`,
    },
  });
}