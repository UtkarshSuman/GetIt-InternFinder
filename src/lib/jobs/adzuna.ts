/**
 * FEATURES:
 * - Client for Adzuna's search API (free tier: ~250 calls/day)
 * - searchJobs() now accepts a listingType switch: INTERNSHIP biases the
 *   query toward internships explicitly; JOB excludes internship listings
 *   via Adzuna's what_exclude param; BOTH leaves the query as-is
 * - salary_min is passed as a soft hint for JOB/BOTH mode (most internship
 *   postings lack structured salary data, so this filter is weak for them —
 *   the real stipend enforcement happens via text extraction downstream)
 */

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || "in";

export interface AdzunaJob {
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  url: string;
  postedAt: string | null;
}

export type ListingType = "INTERNSHIP" | "JOB" | "BOTH";

export async function searchJobs(
  query: string,
  options: { location?: string; listingType?: ListingType; minStipend?: number | null } = {}
): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error(
      "ADZUNA_APP_ID / ADZUNA_APP_KEY are not set. Get a free key at https://developer.adzuna.com/ and add them to .env.local."
    );
  }

  const { location, listingType = "BOTH", minStipend } = options;

  let what = query;
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "20",
  });

  if (listingType === "INTERNSHIP") {
    what = `${query} intern`;
  } else if (listingType === "JOB") {
    params.set("what_exclude", "internship intern");
  }

  params.set("what", what);
  if (location) params.set("where", location);
  if (minStipend && listingType !== "INTERNSHIP") {
    params.set("salary_min", String(minStipend * 12));
  }

  const res = await fetch(`${ADZUNA_BASE_URL}/${ADZUNA_COUNTRY}/search/1?${params.toString()}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna API error (${res.status}): ${body}`);
  }

  const data = await res.json();

  return (data.results ?? []).map((r: {
    id: string;
    title: string;
    company?: { display_name?: string };
    location?: { display_name?: string };
    description: string;
    redirect_url: string;
    created: string;
  }) => ({
    externalId: r.id,
    title: r.title,
    company: r.company?.display_name ?? "Unknown company",
    location: r.location?.display_name ?? null,
    description: r.description,
    url: r.redirect_url,
    postedAt: r.created ?? null,
  }));
}