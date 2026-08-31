/**
 * FEATURES:
 * - GET /api/resume/current — returns the signed-in user's most recently
 *   uploaded resume (parsed data + metadata), or null if none exists yet
 * - Used by the dashboard/resume page to show upload status without
 *   needing a server component round-trip on every render
 * - CHANGED: wrapped in try/catch so a DB error returns JSON, not an HTML
 *   error page that breaks the client's res.json() call
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const [latest] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, session.user.id))
      .orderBy(desc(resumes.createdAt))
      .limit(1);

    return NextResponse.json({ resume: latest ?? null });
  } catch (err) {
    console.error("[resume/current] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}