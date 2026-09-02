/**
 * FEATURES:
 * - Turns a resume's structured JSON (from Groq parsing) into a compact
 *   plain-text summary, used as context for job-fit scoring and cover
 *   letter generation — keeps prompts short and consistent
 */
import type { ParsedResume } from "@/lib/ai/groq";

export function buildResumeSummary(parsed: ParsedResume, fallbackSkills: string[] = []): string {
  const skills = parsed.skills?.length ? parsed.skills : fallbackSkills;
  const lines: string[] = [];

  if (parsed.fullName) lines.push(`Name: ${parsed.fullName}`);
  if (skills.length) lines.push(`Skills: ${skills.join(", ")}`);
  if (parsed.experienceYears !== null) lines.push(`Experience: ${parsed.experienceYears} years`);

  if (parsed.education?.length) {
    lines.push(
      "Education: " +
        parsed.education.map((e) => `${e.degree} at ${e.institution}${e.year ? ` (${e.year})` : ""}`).join("; ")
    );
  }

  if (parsed.experience?.length) {
    lines.push(
      "Work history: " +
        parsed.experience.map((e) => `${e.title} at ${e.company}${e.summary ? ` — ${e.summary}` : ""}`).join("; ")
    );
  }

  if (parsed.projects?.length) {
    lines.push("Projects: " + parsed.projects.map((p) => `${p.name} — ${p.description}`).join("; "));
  }

  return lines.join("\n");
}