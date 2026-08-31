/**
 * FEATURES:
 * - Drizzle ORM database client using libSQL as the driver
 * - Local dev: reads/writes a SQLite file on disk (./dev.db) — no native
 *   compilation needed, so `npm install` works on any OS without build tools
 * - Production-ready: swap DATABASE_URL to a hosted Turso libSQL URL, or
 *   see README for switching to Postgres (Supabase/Neon) instead
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

export const db = drizzle(client, { schema });