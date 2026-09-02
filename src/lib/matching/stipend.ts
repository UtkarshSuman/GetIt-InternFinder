/**
 * FEATURES:
 * - Best-effort extraction of a monthly stipend/salary figure from a job
 *   description's free text, since Adzuna's structured salary_min filter
 *   only works for postings that provide structured salary data — most
 *   internship stipends are just mentioned in the text
 * - Handles common formats: "₹15,000/month", "stipend of 20k per month",
 *   "$1,500 monthly", "Rs. 25000/month", "20,000 - 30,000 per month"
 * - Returns null (not 0) when nothing is found — callers should treat
 *   "unknown" differently from "confirmed too low"
 * - Deliberately conservative: only matches amounts with an explicit
 *   monthly/stipend cue nearby, to avoid misreading unrelated numbers
 *   (like a phone number or a company's founding year) as a stipend
 */

const MONTHLY_PATTERNS: RegExp[] = [
  // "₹15,000/month", "Rs 20000 per month", "$1,500/month"
  /(?:₹|rs\.?|inr|\$|usd)\s?([\d,]{3,7})\s?(?:\/|per\s)\s?month/gi,
  // "stipend of 20,000" / "stipend: 15000" / "stipend up to 25k"
  /stipend[^\d]{0,15}([\d,]{3,7}|\d+\s?k)/gi,
  // "20k per month" / "20k/month"
  /([\d,]{2,6}\s?k)\s?(?:\/|per\s)\s?month/gi,
];

function normalizeAmount(raw: string): number {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned.endsWith("k")) {
    return parseFloat(cleaned.replace(/k$/, "").replace(/,/g, "")) * 1000;
  }
  return parseFloat(cleaned.replace(/,/g, ""));
}

export function extractMonthlyStipend(text: string): number | null {
  const found: number[] = [];

  for (const pattern of MONTHLY_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const amount = normalizeAmount(match[1]);
      if (!isNaN(amount) && amount > 0 && amount < 1_000_000) {
        found.push(amount);
      }
    }
  }

  if (found.length === 0) return null;
  // If a range was mentioned, prefer the lowest figure (conservative — matches "at least X" intent)
  return Math.min(...found);
}