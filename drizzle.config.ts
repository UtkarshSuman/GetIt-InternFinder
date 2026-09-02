/**
 * FEATURES:
 * - drizzle-kit configuration targeting Postgres (Supabase)
 * - Reads DATABASE_URL from .env.local — must be set before running
 *   `npx drizzle-kit generate` or `migrate`
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});