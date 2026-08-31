/**
 * FEATURES:
 * - drizzle-kit configuration for generating and running migrations
 * - Targets the "sqlite" dialect (compatible with the libSQL driver used
 *   in src/lib/db/index.ts)
 * - DATABASE_URL env var controls where migrations are applied — defaults
 *   to a local file, but works unchanged against a hosted Turso URL too
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});