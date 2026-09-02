/**
 * FEATURES:
 * - Thin client for the Groq API (free tier, cloud-hosted, OpenAI-compatible
 *   endpoint) — replaces the local-Ollama client entirely
 * - Chosen because Vercel's serverless functions can't run a persistent
 *   local Ollama process or hold a multi-GB model in memory
 * - parseResumeText(): resume text -> structured JSON (skills, education,
 *   experience, projects)
 * - scoreJobFit(): resume summary + job description -> fit score (0-100),
 *   reasoning, and missing-skills gap list. Replaces the old embedding-based
 *   similarity approach — Groq has no embeddings endpoint, and a direct LLM
 *   judgment per posting is more accurate at personal-use volume anyway
 * - generateCoverLetter(): resume + job -> a tailored draft cover letter
 * - All functions throw a clear error if GROQ_API_KEY is missing or the
 *   request fails, instead of a cryptic fetch/parse failure downstream
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys and add it to .env.local."
    );
  }
  return key;
}

async function groqChat(systemPrompt: string, userContent: string, jsonMode = true): Promise<string> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ---------- Resume parsing ----------

export interface ParsedResume {
  fullName: string | null;
  skills: string[];
  experienceYears: number | null;
  education: { degree: string; institution: string; year: string | null }[];
  experience: { title: string; company: string; duration: string | null; summary: string }[];
  projects: { name: string; description: string }[];
}

const RESUME_PARSE_SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the resume text the user provides.
Respond with ONLY valid JSON (no markdown fences, no commentary), matching exactly this shape:
{
  "fullName": string | null,
  "skills": string[],
  "experienceYears": number | null,
  "education": [{ "degree": string, "institution": string, "year": string | null }],
  "experience": [{ "title": string, "company": string, "duration": string | null, "summary": string }],
  "projects": [{ "name": string, "description": string }]
}
Infer experienceYears as total professional/internship experience in years (estimate reasonably from dates, use null if unclear).
If a section is absent from the resume, return an empty array for it. Do not invent information not present in the text.`;

export async function parseResumeText(resumeText: string): Promise<ParsedResume> {
  const content = await groqChat(RESUME_PARSE_SYSTEM_PROMPT, resumeText.slice(0, 12000));
  try {
    return JSON.parse(content) as ParsedResume;
  } catch {
    throw new Error("Groq returned malformed JSON while parsing the resume. Try again.");
  }
}

// ---------- Job fit scoring ----------

export interface JobFitResult {
  score: number;
  reasoning: string;
  missingSkills: string[];
}

const JOB_FIT_SYSTEM_PROMPT = `You are an internship-fit evaluator. Given a candidate's resume summary and a job posting,
score how well they fit on a 0-100 scale, with brief reasoning and a list of skills the posting wants that the candidate is missing.
Respond with ONLY valid JSON, matching exactly this shape:
{ "score": number, "reasoning": string, "missingSkills": string[] }
"reasoning" must be 2-3 sentences. Be honest and calibrated — most candidates should NOT score above 85 unless it's a strong match.`;

export async function scoreJobFit(resumeSummary: string, job: { title: string; company: string; description: string }): Promise<JobFitResult> {
  const userContent = `RESUME SUMMARY:\n${resumeSummary}\n\nJOB POSTING:\nTitle: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description.slice(0, 4000)}`;
  const content = await groqChat(JOB_FIT_SYSTEM_PROMPT, userContent);
  try {
    const parsed = JSON.parse(content) as JobFitResult;
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      reasoning: parsed.reasoning,
      missingSkills: parsed.missingSkills ?? [],
    };
  } catch {
    throw new Error("Groq returned malformed JSON while scoring job fit.");
  }
}

// ---------- Cover letter drafting ----------

const COVER_LETTER_SYSTEM_PROMPT = `You write concise, specific internship cover letters (180-250 words). Ground every claim in the candidate's
actual resume content provided — never invent experience. Avoid generic phrases like "I am a hard worker" or "I am passionate about".
Reference 1-2 concrete details from the job description and 1-2 concrete details from the resume. Output plain text only, no markdown, no subject line.`;

export async function generateCoverLetter(
  resumeSummary: string,
  job: { title: string; company: string; description: string }
): Promise<string> {
  const userContent = `RESUME SUMMARY:\n${resumeSummary}\n\nJOB POSTING:\nTitle: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description.slice(0, 4000)}`;
  return groqChat(COVER_LETTER_SYSTEM_PROMPT, userContent, false);
}