/**
 * FEATURES:
 * - Client page for uploading a resume (PDF/DOCX) via drag-and-drop or
 *   file picker
 * - Shows live upload/parsing status, then displays the AI-extracted
 *   skills, experience years, education, and projects once parsing
 *   completes
 * - Surfaces a clear warning banner (not a hard failure) if Ollama parsing
 *   didn't complete, since the file itself still uploaded successfully
 * - Fetches and displays the most recent resume on page load, so refreshing
 *   doesn't lose state
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FlightPath } from "@/components/flight-path";

interface ParsedResume {
  fullName: string | null;
  skills: string[];
  experienceYears: number | null;
  education: { degree: string; institution: string; year: string | null }[];
  experience: { title: string; company: string; duration: string | null; summary: string }[];
  projects: { name: string; description: string }[];
}

interface Resume {
  id: string;
  fileName: string;
  parsedJson: ParsedResume | null;
  skills: string[];
  experienceYears: number | null;
  createdAt: string;
}

export default function ResumePage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/resume/current");
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok) {
        setResume(data.resume);
      } else {
        setError(data.error ?? "Couldn't load your resume.");
      }
    } catch {
      setError("Couldn't reach the server. Is the dev server still running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);


  async function handleFile(file: File) {
    setError(null);
    setWarning(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setError(data.error ?? `Upload failed (status ${res.status}).`);
        return;
      }

      if (data.warning) setWarning(data.warning);
      setResume(data.resume);
    } catch {
      setError("Something went wrong reading the server's response. Check the terminal running `npm run dev` for the real error.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
      <FlightPath className="w-40 h-6 mb-3" />
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-semibold text-ink">Your resume</h1>
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink transition">
          ← Dashboard
        </Link>
      </div>
      <p className="text-ink-muted text-sm mb-8">
        Upload a PDF or DOCX. It's parsed locally by Ollama — nothing leaves your machine.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-accent bg-accent/5" : "border-line bg-white"
        }`}
      >
        <p className="text-sm text-ink-muted mb-3">Drag a resume here, or</p>
        <label className="inline-block cursor-pointer rounded-lg bg-ink text-white text-sm font-medium px-4 py-2 hover:bg-ink/90 transition">
          {uploading ? "Uploading…" : "Choose a file"}
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        <p className="text-xs text-ink-muted mt-3">PDF or DOCX, up to 5MB</p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {warning && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      {loading && <p className="text-sm text-ink-muted mt-8">Loading…</p>}

      {!loading && resume && (
        <div className="mt-8 rounded-xl border border-line bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-ink">{resume.fileName}</p>
              <p className="text-xs text-ink-muted">
                Uploaded {new Date(resume.createdAt).toLocaleString()}
              </p>
            </div>
            <a
              href={`/api/resume/file/${resume.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-deep font-medium hover:underline"
            >
              View file
            </a>
          </div>

          {resume.parsedJson ? (
            <div className="space-y-5 border-t border-line pt-4">
              {resume.experienceYears !== null && (
                <p className="text-sm text-ink-muted">
                  <span className="font-medium text-ink">{resume.experienceYears} years</span> of
                  experience detected
                </p>
              )}

              {resume.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ink mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-canvas border border-line rounded-full px-3 py-1 text-ink-muted"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resume.parsedJson.education.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ink mb-2">Education</p>
                  <ul className="space-y-1">
                    {resume.parsedJson.education.map((edu, i) => (
                      <li key={i} className="text-sm text-ink-muted">
                        {edu.degree} — {edu.institution} {edu.year ? `(${edu.year})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resume.parsedJson.experience.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ink mb-2">Experience</p>
                  <ul className="space-y-2">
                    {resume.parsedJson.experience.map((exp, i) => (
                      <li key={i} className="text-sm text-ink-muted">
                        <span className="text-ink font-medium">{exp.title}</span> at {exp.company}{" "}
                        {exp.duration ? `(${exp.duration})` : ""}
                        {exp.summary && <p className="mt-0.5">{exp.summary}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resume.parsedJson.projects.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ink mb-2">Projects</p>
                  <ul className="space-y-1">
                    {resume.parsedJson.projects.map((proj, i) => (
                      <li key={i} className="text-sm text-ink-muted">
                        <span className="text-ink font-medium">{proj.name}</span> — {proj.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted border-t border-line pt-4">
              File saved, but AI parsing hasn't completed yet. Make sure Ollama is running and
              re-upload.
            </p>
          )}
        </div>
      )}
    </main>
  );
}