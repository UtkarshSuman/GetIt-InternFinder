/**
 * FEATURES:
 * - GET /api/preferences — returns the signed-in user's saved search
 *   preferences (listing type, roles, locations, min stipend, etc.), or
 *   sensible defaults if none saved yet
 * - PUT /api/preferences — upserts preferences (creates on first save,
 *   updates thereafter — one row per user)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { preferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const [existing] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      preferences: existing ?? {
        listingType: "BOTH",
        roles: [],
        locations: [],
        remoteOk: true,
        minStipend: null,
        excludedCompanies: [],
        matchThreshold: 65,
      },
    });
  } catch (err) {
    console.error("[preferences] GET error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const listingType = ["INTERNSHIP", "JOB", "BOTH"].includes(body.listingType) ? body.listingType : "BOTH";

    const values = {
      userId: session.user.id,
      listingType,
      roles: Array.isArray(body.roles) ? body.roles : [],
      industries: Array.isArray(body.industries) ? body.industries : [],
      locations: Array.isArray(body.locations) ? body.locations : [],
      remoteOk: typeof body.remoteOk === "boolean" ? body.remoteOk : true,
      minStipend: typeof body.minStipend === "number" ? body.minStipend : null,
      excludedCompanies: Array.isArray(body.excludedCompanies) ? body.excludedCompanies : [],
      matchThreshold: typeof body.matchThreshold === "number" ? body.matchThreshold : 65,
      updatedAt: new Date().toISOString(),
    };

    const [existing] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, session.user.id))
      .limit(1);

    let saved;
    if (existing) {
      [saved] = await db
        .update(preferences)
        .set(values)
        .where(eq(preferences.userId, session.user.id))
        .returning();
    } else {
      [saved] = await db.insert(preferences).values(values).returning();
    }

    return NextResponse.json({ preferences: saved });
  } catch (err) {
    console.error("[preferences] PUT error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}