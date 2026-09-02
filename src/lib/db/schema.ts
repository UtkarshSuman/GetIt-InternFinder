import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// NOTE: This schema targets SQLite for local dev (zero setup, no external
// service). To move to Postgres (Supabase/Neon free tier) for production,
// see src/lib/db/schema.pg.ts and swap the import in src/lib/db/index.ts —
// the shape of every table stays the same.

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  parsedJson: text("parsed_json", { mode: "json" }), // structured resume: skills, experience, education, projects
  skills: text("skills", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  experienceYears: real("experience_years"),
  embedding: text("embedding", { mode: "json" }).$type<number[]>(), // vector, stored as JSON array in sqlite
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const preferences = sqliteTable("preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  listingType: text("listing_type", { enum: ["INTERNSHIP", "JOB", "BOTH"] }).default("BOTH"),
  roles: text("roles", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  industries: text("industries", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  locations: text("locations", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  remoteOk: integer("remote_ok", { mode: "boolean" }).default(true),
  minStipend: integer("min_stipend"),
  startDateFrom: text("start_date_from"),
  startDateTo: text("start_date_to"),
  excludedCompanies: text("excluded_companies", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  matchThreshold: integer("match_threshold").default(65),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobPostings = sqliteTable("job_postings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text("source").notNull(), // 'adzuna' | 'greenhouse' | 'lever' | 'scraper'
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  remote: integer("remote", { mode: "boolean" }).default(false),
  description: text("description").notNull(),
  url: text("url").notNull(),
  postedAt: text("posted_at"),
  embedding: text("embedding", { mode: "json" }).$type<number[]>(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const matches = sqliteTable("matches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobPostingId: text("job_posting_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  reasoning: text("reasoning"),
  missingSkills: text("missing_skills", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  status: text("status", { enum: ["NEW", "REVIEWED", "DISMISSED"] }).default("NEW"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobPostingId: text("job_posting_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  answers: text("answers", { mode: "json" }).$type<Record<string, string>>().default(sql`'{}'`),
  status: text("status", {
    enum: ["DRAFT", "READY", "SUBMITTED", "REJECTED", "INTERVIEW"],
  }).default("DRAFT"),
  submittedAt: text("submitted_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
