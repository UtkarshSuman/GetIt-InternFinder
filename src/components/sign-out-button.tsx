"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm font-medium text-ink-muted hover:text-ink transition"
    >
      Sign out
    </button>
  );
}
