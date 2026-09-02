/**
 * FEATURES:
 * - POST /api/applications — given a jobPostingId, generates a tailored
 *   cover letter via Groq (using the user's latest resume) and creates a
 *   DRAFT application row. If one already exists for this job, returns it
 *   instead of duplicating.
 * - This is the "prepare the application" step — nothing is ever sent
 *   anywhere automatically. The user reviews the draft, then applies via
 *   the real posting link themselves (see README for why: no platform
 *   offers a genuine candidate-facing submission API).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumes, jobPostings, applications } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateCoverLetter } from "@/lib/ai/groq";
import { buildResumeSummary } from "@/lib/resume-summary";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const jobPostingId: string = body.jobPostingId;
    if (!jobPostingId) {
      return NextResponse.json({ error: "jobPostingId is required." }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, session.user.id), eq(applications.jobPostingId, jobPostingId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ application: existing });
    }

    const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, jobPostingId)).limit(1);
    if (!job) {
      return NextResponse.json({ error: "Job posting not found." }, { status: 404 });
    }

    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, session.user.id))
      .orderBy(desc(resumes.createdAt))
      .limit(1);

    if (!resume || !resume.parsedJson) {
      return NextResponse.json({ error: "Upload and parse a resume first." }, { status: 400 });
    }

    const resumeSummary = buildResumeSummary(
      resume.parsedJson as Parameters<typeof buildResumeSummary>[0],
      resume.skills ?? []
    );

    const coverLetter = await generateCoverLetter(resumeSummary, job);

    const [created] = await db
      .insert(applications)
      .values({
        userId: session.user.id,
        jobPostingId,
        coverLetter,
        status: "DRAFT",
      })
      .returning();

    return NextResponse.json({ application: created }, { status: 201 });
  } catch (err) {
    console.error("[applications] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}