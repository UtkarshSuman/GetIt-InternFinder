/**
 * FEATURES:
 * - Postgres schema (Supabase/Neon-compatible) via drizzle-orm/pg-core
 * - Same 6 tables as before: users, resumes, preferences, job_postings,
 *   matches, applications
 * - IDs are app-generated UUIDs (crypto.randomUUID(), stored as text) —
 *   no pgcrypto extension required
 * - JSON columns use jsonb; enums use native Postgres enums instead of
 *   SQLite's text-with-check-constraint approach
 * - Dropped the unused "embedding" columns from resumes/job_postings —
 *   matching moved to direct Groq LLM scoring, so vector storage was
 *   dead weight
 */
import { pgTable, pgEnum, text, integer, boolean, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const listingTypeEnum = pgEnum("listing_type", ["INTERNSHIP", "JOB", "BOTH"]);
export const matchStatusEnum = pgEnum("match_status", ["NEW", "REVIEWED", "DISMISSED"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "REJECTED",
  "INTERVIEW",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`now()`),
});

export const resumes = pgTable("resumes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  parsedJson: jsonb("parsed_json"),
  skills: jsonb("skills").$type<string[]>().default(sql`'[]'::jsonb`),
  experienceYears: real("experience_years"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`now()`),
});

export const preferences = pgTable("preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  listingType: listingTypeEnum("listing_type").default("BOTH"),
  roles: jsonb("roles").$type<string[]>().default(sql`'[]'::jsonb`),
  industries: jsonb("industries").$type<string[]>().default(sql`'[]'::jsonb`),
  locations: jsonb("locations").$type<string[]>().default(sql`'[]'::jsonb`),
  remoteOk: boolean("remote_ok").default(true),
  minStipend: integer("min_stipend"),
  startDateFrom: text("start_date_from"),
  startDateTo: text("start_date_to"),
  excludedCompanies: jsonb("excluded_companies").$type<string[]>().default(sql`'[]'::jsonb`),
  matchThreshold: integer("match_threshold").default(65),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`now()`),
});

export const jobPostings = pgTable("job_postings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text("source").notNull(), // 'adzuna' | 'greenhouse' | 'lever' | 'scraper'
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  remote: boolean("remote").default(false),
  description: text("description").notNull(),
  url: text("url").notNull(),
  postedAt: text("posted_at"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`now()`),
});

export const matches = pgTable("matches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobPostingId: text("job_posting_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  reasoning: text("reasoning"),
  missingSkills: jsonb("missing_skills").$type<string[]>().default(sql`'[]'::jsonb`),
  status: matchStatusEnum("status").default("NEW"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`now()`),
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobPostingId: text("job_posting_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  answers: jsonb("answers").$type<Record<string, string>>().default(sql`'{}'::jsonb`),
  status: applicationStatusEnum("status").default("DRAFT"),
  submittedAt: text("submitted_at"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`now()`),
});