/**
 * FEATURES:
 * - Thin client for a locally-running Ollama server (free, no API key,
 *   no usage cap — runs entirely on your machine)
 * - parseResumeText(): sends raw resume text to the local LLM and gets back
 *   structured JSON (skills, education, experience, projects)
 * - embedText(): generates a vector embedding via Ollama's embeddings API,
 *   used later for resume <-> job-posting similarity matching
 * - Both functions throw a clear, actionable error if Ollama isn't running
 *   or the model hasn't been pulled yet, instead of a cryptic fetch failure
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

class OllamaConnectionError extends Error {
  constructor(cause: unknown) {
    super(
      `Couldn't reach Ollama at ${OLLAMA_BASE_URL}. Make sure it's running ` +
        `("ollama serve") and the model is pulled ("ollama pull ${OLLAMA_MODEL}" ` +
        `and "ollama pull ${OLLAMA_EMBED_MODEL}").`
    );
    this.name = "OllamaConnectionError";
    this.cause = cause;
  }
}

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
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: RESUME_PARSE_SYSTEM_PROMPT },
          { role: "user", content: resumeText.slice(0, 12000) },
        ],
        format: "json",
        stream: false,
      }),
    });
  } catch (err) {
    throw new OllamaConnectionError(err);
  }

  if (!res.ok) {
    throw new Error(`Ollama returned an error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const content: string = data?.message?.content ?? "{}";

  try {
    return JSON.parse(content) as ParsedResume;
  } catch {
    throw new Error("Ollama returned malformed JSON while parsing the resume. Try again.");
  }
}

export async function embedText(text: string): Promise<number[]> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: text.slice(0, 8000),
      }),
    });
  } catch (err) {
    throw new OllamaConnectionError(err);
  }

  if (!res.ok) {
    throw new Error(`Ollama returned an error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return data.embedding as number[];
}