/**
 * FEATURES:
 * - Protected dashboard home — redirects to /login if not authenticated
 * - Now links to the resume upload page (Phase 2)
 * - Pipeline stat cards remain placeholders until job matching (Phase 3+)
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FlightPath } from "@/components/flight-path";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <FlightPath className="w-40 h-6 mb-3" />
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome, {session.user.name}
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Phase 2 checkpoint: resume upload and AI parsing are live. Matches come next.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/resume"
            className="rounded-lg bg-ink text-white text-sm font-medium px-4 py-2 hover:bg-ink/90 transition"
          >
            Manage resume
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {["New Matches", "Drafting", "Submitted"].map((label) => (
          <div key={label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-sm font-medium text-ink-muted">{label}</p>
            <p className="font-display text-3xl font-semibold text-ink mt-2">0</p>
          </div>
        ))}
      </div>
    </main>
  );
}
