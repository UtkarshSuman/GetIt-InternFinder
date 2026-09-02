/**
 * FEATURES:
 * - POST /api/jobs/search — searches Adzuna for a query/location/listing
 *   type, scores each result against the signed-in user's resume via Groq,
 *   and stores both the posting and the match
 * - Listing type switch: "INTERNSHIP" | "JOB" | "BOTH" — shapes the Adzuna
 *   query (include/exclude "intern" keyword)
 * - Stipend filter: enforced via text-extraction, not just Adzuna's
 *   structured salary_min. Listings with no detectable figure are kept and
 *   flagged "stipend not listed" rather than dropped.
 * - Auto-saves the search's filters as the user's preferences, so the
 *   listing-type switch and stipend floor persist as defaults next time
 * - Deduplicates against postings already in the DB (by source+externalId)
 * - Scoring runs sequentially with a small delay to respect Groq's free
 *   tier rate limit
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumes, jobPostings, matches, preferences } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { searchJobs, type ListingType } from "@/lib/jobs/adzuna";
import { scoreJobFit } from "@/lib/ai/groq";
import { buildResumeSummary } from "@/lib/resume-summary";
import { extractMonthlyStipend } from "@/lib/matching/stipend";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const query: string = body.query?.trim();
    const location: string | undefined = body.location?.trim() || undefined;
    const listingType: ListingType = ["INTERNSHIP", "JOB", "BOTH"].includes(body.listingType)
      ? body.listingType
      : "BOTH";
    const minStipend: number | null =
      typeof body.minStipend === "number" && body.minStipend > 0 ? body.minStipend : null;

    if (!query) {
      return NextResponse.json({ error: "Please provide a search query (e.g. a role or keyword)." }, { status: 400 });
    }

    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, session.user.id))
      .orderBy(desc(resumes.createdAt))
      .limit(1);

    if (!resume || !resume.parsedJson) {
      return NextResponse.json(
        { error: "Upload and parse a resume first — job scoring needs it to compare against." },
        { status: 400 }
      );
    }

    const resumeSummary = buildResumeSummary(
      resume.parsedJson as Parameters<typeof buildResumeSummary>[0],
      resume.skills ?? []
    );

    const [existingPrefs] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, session.user.id))
      .limit(1);

    const prefValues = { userId: session.user.id, listingType, minStipend, updatedAt: new Date().toISOString() };
    if (existingPrefs) {
      await db.update(preferences).set(prefValues).where(eq(preferences.userId, session.user.id));
    } else {
      await db.insert(preferences).values(prefValues);
    }

    const results = await searchJobs(query, { location, listingType, minStipend });

    const created: { jobId: string; matchId: string; score: number }[] = [];
    const errors: string[] = [];
    let filteredByStipend = 0;

    for (const job of results) {
      try {
        if (minStipend) {
          const detected = extractMonthlyStipend(job.description);
          if (detected !== null && detected < minStipend) {
            filteredByStipend++;
            continue;
          }
        }

        const [existing] = await db
          .select()
          .from(jobPostings)
          .where(and(eq(jobPostings.source, "adzuna"), eq(jobPostings.externalId, job.externalId)))
          .limit(1);

        let jobPostingId: string;
        if (existing) {
          jobPostingId = existing.id;
        } else {
          const [insertedJob] = await db
            .insert(jobPostings)
            .values({
              source: "adzuna",
              externalId: job.externalId,
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              url: job.url,
              postedAt: job.postedAt,
            })
            .returning();
          jobPostingId = insertedJob.id;
        }

        const [existingMatch] = await db
          .select()
          .from(matches)
          .where(and(eq(matches.userId, session.user.id), eq(matches.jobPostingId, jobPostingId)))
          .limit(1);

        if (existingMatch) {
          created.push({ jobId: jobPostingId, matchId: existingMatch.id, score: existingMatch.score });
          continue;
        }

        const fit = await scoreJobFit(resumeSummary, job);

        const [insertedMatch] = await db
          .insert(matches)
          .values({
            userId: session.user.id,
            jobPostingId,
            score: fit.score,
            reasoning: fit.reasoning,
            missingSkills: fit.missingSkills,
          })
          .returning();

        created.push({ jobId: jobPostingId, matchId: insertedMatch.id, score: fit.score });
        await sleep(400);
      } catch (err) {
        errors.push(`${job.title} at ${job.company}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    return NextResponse.json({
      found: results.length,
      scored: created.length,
      filteredByStipend,
      errors: errors.length ? errors : null,
    });
  } catch (err) {
    console.error("[jobs/search] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error during search." },
      { status: 500 }
    );
  }
}