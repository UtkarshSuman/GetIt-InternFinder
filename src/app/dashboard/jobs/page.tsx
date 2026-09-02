/**
 * FEATURES:
 * - Listing type switch: Internships / Jobs / Both — shapes the search
 *   query and is saved as a standing preference
 * - Min stipend filter: enforced via description text-extraction
 * - Loads saved preferences on mount so the switch/filter reflect your
 *   last search
 * - Results show: score, AI reasoning, missing skills, detected stipend
 *   (or "not listed"), real apply link, draft cover letter, mark applied
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FlightPath } from "@/components/flight-path";

type ListingType = "INTERNSHIP" | "JOB" | "BOTH";

interface Match {
  matchId: string;
  score: number;
  reasoning: string;
  missingSkills: string[];
  detectedStipend: number | null;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    url: string;
    postedAt: string | null;
  };
  application: { id: string; status: string } | null;
}

const TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: "INTERNSHIP", label: "Internships" },
  { value: "JOB", label: "Jobs" },
  { value: "BOTH", label: "Both" },
];

export default function JobsPage() {
  const [query, setQuery] = useState("software engineering intern");
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState<ListingType>("BOTH");
  const [minStipend, setMinStipend] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchInfo, setSearchInfo] = useState<string | null>(null);

  const [matchesList, setMatchesList] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [coverLetters, setCoverLetters] = useState<Record<string, string>>({});

  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/matches");
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok) setMatchesList(data.matches ?? []);
    } catch {
      // silent — page still works
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/preferences");
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok && data.preferences) {
        if (data.preferences.listingType) setListingType(data.preferences.listingType);
        if (data.preferences.minStipend) setMinStipend(String(data.preferences.minStipend));
      }
    } catch {
      // defaults are fine
    }
  }, []);

  useEffect(() => {
    loadMatches();
    loadPreferences();
  }, [loadMatches, loadPreferences]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setSearchInfo(null);

    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          location: location || undefined,
          listingType,
          minStipend: minStipend ? Number(minStipend) : undefined,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setSearchError(data.error ?? "Search failed.");
        return;
      }

      const filteredNote = data.filteredByStipend > 0 ? ` (${data.filteredByStipend} filtered out below stipend floor)` : "";
      setSearchInfo(`Found ${data.found}, scored ${data.scored}.${filteredNote}`);
      await loadMatches();
    } catch {
      setSearchError("Couldn't reach the server. Check the terminal running `npm run dev`.");
    } finally {
      setSearching(false);
    }
  }

  async function handleDraft(match: Match) {
    setDraftingId(match.matchId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: match.job.id }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok) {
        setCoverLetters((prev) => ({ ...prev, [match.matchId]: data.application.coverLetter }));
        await loadMatches();
      }
    } finally {
      setDraftingId(null);
    }
  }

  async function handleMarkApplied(applicationId: string) {
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUBMITTED" }),
    });
    await loadMatches();
  }

  return (
    <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
      <FlightPath className="w-40 h-6 mb-3" />
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-semibold text-ink">Find internships & jobs</h1>
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink transition">
          ← Dashboard
        </Link>
      </div>
      <p className="text-ink-muted text-sm mb-6">
        Searches live postings and scores each one against your resume. Nothing is ever submitted
        automatically — you review and apply via the real link.
      </p>

      <form onSubmit={handleSearch} className="space-y-3 mb-2">
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1 w-fit">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setListingType(opt.value)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition ${
                listingType === opt.value ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Role or keyword"
            className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="number"
            min={0}
            value={minStipend}
            onChange={(e) => setMinStipend(e.target.value)}
            placeholder="Min stipend/mo (₹)"
            className="w-full sm:w-40 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-ink text-white text-sm font-medium px-5 py-2 hover:bg-ink/90 transition disabled:opacity-60 whitespace-nowrap"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {searchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {searchError}
        </div>
      )}
      {searchInfo && <p className="text-sm text-ink-muted mb-4">{searchInfo}</p>}

      <h2 className="font-display text-lg font-semibold text-ink mt-8 mb-3">Ready to apply</h2>

      {loadingMatches && <p className="text-sm text-ink-muted">Loading…</p>}
      {!loadingMatches && matchesList.length === 0 && (
        <p className="text-sm text-ink-muted">No matches yet — run a search above.</p>
      )}

      <div className="space-y-4">
        {matchesList.map((m) => (
          <div key={m.matchId} className="rounded-xl border border-line bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{m.job.title}</p>
                <p className="text-sm text-ink-muted">
                  {m.job.company}
                  {m.job.location ? ` · ${m.job.location}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent/15 text-accent-deep text-sm font-semibold px-3 py-1">
                {m.score}
              </span>
            </div>

            <p className="text-sm text-ink-muted mt-3">{m.reasoning}</p>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {m.detectedStipend !== null ? (
                <span className="text-xs bg-success/10 text-success rounded-full px-2.5 py-1">
                  ₹{m.detectedStipend.toLocaleString()}/mo
                </span>
              ) : (
                <span className="text-xs bg-canvas border border-line text-ink-muted rounded-full px-2.5 py-1">
                  Stipend not listed — check manually
                </span>
              )}
              {m.missingSkills.length > 0 && (
                <span className="text-xs text-ink-muted">Gaps: {m.missingSkills.join(", ")}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <a
                href={m.job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent-deep font-medium hover:underline"
              >
                Open posting →
              </a>

              {!m.application && (
                <button
                  onClick={() => handleDraft(m)}
                  disabled={draftingId === m.matchId}
                  className="text-sm rounded-lg border border-line px-3 py-1.5 text-ink hover:bg-canvas transition disabled:opacity-60"
                >
                  {draftingId === m.matchId ? "Drafting…" : "Draft cover letter"}
                </button>
              )}

              {m.application && m.application.status !== "SUBMITTED" && (
                <button
                  onClick={() => handleMarkApplied(m.application!.id)}
                  className="text-sm rounded-lg bg-success text-white px-3 py-1.5 hover:opacity-90 transition"
                >
                  Mark as applied
                </button>
              )}

              {m.application?.status === "SUBMITTED" && (
                <span className="text-sm text-success font-medium">✓ Applied</span>
              )}
            </div>

            {coverLetters[m.matchId] && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm font-medium text-ink mb-2">Drafted cover letter</p>
                <textarea
                  readOnly
                  value={coverLetters[m.matchId]}
                  className="w-full text-sm text-ink-muted bg-canvas border border-line rounded-lg p-3 h-40 resize-y"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}