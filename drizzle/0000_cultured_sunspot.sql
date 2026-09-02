CREATE TYPE "public"."application_status" AS ENUM('DRAFT', 'READY', 'SUBMITTED', 'REJECTED', 'INTERVIEW');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('INTERNSHIP', 'JOB', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('NEW', 'REVIEWED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_posting_id" text NOT NULL,
	"cover_letter" text,
	"answers" jsonb DEFAULT '{}'::jsonb,
	"status" "application_status" DEFAULT 'DRAFT',
	"submitted_at" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"remote" boolean DEFAULT false,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"posted_at" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_posting_id" text NOT NULL,
	"score" integer NOT NULL,
	"reasoning" text,
	"missing_skills" jsonb DEFAULT '[]'::jsonb,
	"status" "match_status" DEFAULT 'NEW',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"listing_type" "listing_type" DEFAULT 'BOTH',
	"roles" jsonb DEFAULT '[]'::jsonb,
	"industries" jsonb DEFAULT '[]'::jsonb,
	"locations" jsonb DEFAULT '[]'::jsonb,
	"remote_ok" boolean DEFAULT true,
	"min_stipend" integer,
	"start_date_from" text,
	"start_date_to" text,
	"excluded_companies" jsonb DEFAULT '[]'::jsonb,
	"match_threshold" integer DEFAULT 65,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"parsed_json" jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"experience_years" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;