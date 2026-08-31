# InternPilot

Your internship search, on autopilot. This is Phase 1: project scaffold, database, and auth, confirmed working end to end.

## What's built (Phase 1)

- Next.js 14+ App Router, TypeScript, Tailwind
- Drizzle ORM + SQLite (local, zero setup) — schema for users, resumes, preferences, job postings, matches, applications
- Auth: email/password (NextAuth credentials provider, bcrypt-hashed passwords) — no external OAuth account needed
- Login / register / protected dashboard pages, styled with a custom design system (not a template)

## Run it locally

```bash
npm install
cp .env.local.example .env.local   # then generate a real secret:
npx auth secret                     # writes a fresh AUTH_SECRET into .env.local

npx drizzle-kit migrate             # creates dev.db and applies the schema
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`. Click through to `/register` to create your first account.

## Why Drizzle instead of Prisma

Same idea (type-safe schema, migrations, works with SQLite locally and Postgres in prod) but pure JS/TS with no external binary download step — simpler to set up and audit.

## Environment variables

See `.env.local.example` for the full list. For Phase 1 you only need `DATABASE_URL` (defaults to local SQLite) and `AUTH_SECRET`. The Ollama/Adzuna/email variables are there for the next phases and aren't required yet.

## Moving to Postgres later (Supabase/Neon free tier)

The schema in `src/lib/db/schema.ts` is SQLite-flavored (JSON columns as `text` with `{ mode: "json" }`). Swapping to Postgres means:
1. `npm install postgres` (already installed) and change `src/lib/db/index.ts` to use `drizzle-orm/postgres-js` instead of `drizzle-orm/better-sqlite3`
2. Change `dialect: "sqlite"` to `dialect: "postgresql"` in `drizzle.config.ts`
3. Set `DATABASE_URL` to your Supabase/Neon connection string
4. Re-run `npx drizzle-kit generate` and `migrate`

## Next phases

Resume upload/parsing, preferences UI, job source integration (Adzuna/Greenhouse/Lever), Ollama-based matching, application drafting, and the dashboard pipeline. Say the word and we'll build the next one.
