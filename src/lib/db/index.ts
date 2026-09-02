/**
 * FEATURES:
 * - Drizzle ORM database client using postgres-js, pointed at Supabase
 * - { prepare: false } is required for Supabase's connection pooler
 *   (transaction mode / port 6543) — prepared statements aren't supported
 *   there. If you connect via the direct connection (port 5432) instead,
 *   this setting is harmless either way.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add your Supabase connection string to .env.local — see README for how to get it."
  );
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });