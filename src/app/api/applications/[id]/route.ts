/**
 * FEATURES:
 * - PATCH /api/applications/[id] — updates an application's status.
 *   Used for the "Mark as Applied" button once the user has actually
 *   submitted the application themselves via the real posting link.
 * - Ownership check: only the application's owner can update it.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_STATUSES = ["DRAFT", "READY", "SUBMITTED", "REJECTED", "INTERVIEW"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const [updated] = await db
      .update(applications)
      .set({
        status,
        submittedAt: status === "SUBMITTED" ? new Date().toISOString() : existing.submittedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(applications.id, id))
      .returning();

    return NextResponse.json({ application: updated });
  } catch (err) {
    console.error("[applications/:id] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}