CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_posting_id` text NOT NULL,
	`cover_letter` text,
	`answers` text DEFAULT '{}',
	`status` text DEFAULT 'DRAFT',
	`submitted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `job_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text,
	`remote` integer DEFAULT false,
	`description` text NOT NULL,
	`url` text NOT NULL,
	`posted_at` text,
	`embedding` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_posting_id` text NOT NULL,
	`score` integer NOT NULL,
	`reasoning` text,
	`missing_skills` text DEFAULT '[]',
	`status` text DEFAULT 'NEW',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`roles` text DEFAULT '[]',
	`industries` text DEFAULT '[]',
	`locations` text DEFAULT '[]',
	`remote_ok` integer DEFAULT true,
	`min_stipend` integer,
	`start_date_from` text,
	`start_date_to` text,
	`excluded_companies` text DEFAULT '[]',
	`match_threshold` integer DEFAULT 65,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preferences_user_id_unique` ON `preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_url` text NOT NULL,
	`file_name` text NOT NULL,
	`parsed_json` text,
	`skills` text DEFAULT '[]',
	`experience_years` real,
	`embedding` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);