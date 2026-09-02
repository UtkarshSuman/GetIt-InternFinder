/**
 * FEATURES:
 * - GET /api/matches — returns all of the signed-in user's scored matches,
 *   joined with job posting details, sorted best-fit first
 * - Computes a detected monthly stipend per job at read-time (not stored —
 *   always reflects the current extraction logic) so the UI can show a
 *   real figure or an honest "not listed" note
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, jobPostings, applications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { extractMonthlyStipend } from "@/lib/matching/stipend";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const rows = await db
      .select({
        matchId: matches.id,
        score: matches.score,
        reasoning: matches.reasoning,
        missingSkills: matches.missingSkills,
        status: matches.status,
        job: {
          id: jobPostings.id,
          title: jobPostings.title,
          company: jobPostings.company,
          location: jobPostings.location,
          url: jobPostings.url,
          postedAt: jobPostings.postedAt,
          description: jobPostings.description,
        },
      })
      .from(matches)
      .innerJoin(jobPostings, eq(matches.jobPostingId, jobPostings.id))
      .where(eq(matches.userId, session.user.id))
      .orderBy(desc(matches.score));

    const apps = await db
      .select({ jobPostingId: applications.jobPostingId, status: applications.status, id: applications.id })
      .from(applications)
      .where(eq(applications.userId, session.user.id));

    const appByJob = new Map(apps.map((a) => [a.jobPostingId, a]));

    const result = rows.map((r) => {
      const { description, ...jobRest } = r.job;
      return {
        ...r,
        job: jobRest,
        detectedStipend: extractMonthlyStipend(description),
        application: appByJob.get(r.job.id) ?? null,
      };
    });

    return NextResponse.json({ matches: result });
  } catch (err) {
    console.error("[matches] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}