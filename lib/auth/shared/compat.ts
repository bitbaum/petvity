/**
 * /api/auth/*: AccountKit's own endpoints (its sign-in, sign-up, recovery and
 * account screens call them), plus the next-auth/react protocol that
 * `useSession` and `signOut` on Petvity's pages still speak, answered with
 * Petvity's session shape (roles live on `users`). The demo button signs in
 * through the credentials callback. docs/ACCOUNTKIT-MIGRATION.md.
 */
import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { createNextAuthCompat } from "@bitbaum/accountkit/auth/nextauth-compat";
import { getInstance } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { promote } from "./petvity-plugin";
import { sharedAuth, siteUrl } from "./runtime";

/** Petvity's session from the `users` row, re-read on every request. */
async function petvitySession(userId: string, expiresAt: Date | string): Promise<Session | null> {
  const row = await getInstance().query.users.findFirst({ where: eq(users.id, userId) });
  if (!row) return null;
  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role,
      emailVerified: row.emailVerified,
    },
    expires: new Date(expiresAt).toISOString(),
  };
}

export const compat = createNextAuthCompat<Session>({
  runtime: sharedAuth,
  siteUrl: () => siteUrl(),
  signInPath: "/login",
  landing: "/portal",
  toSession: (shared) => petvitySession(shared.user.id, shared.session.expiresAt),
  credentials: {
    credentials: {
      name: "Credentials",
      resolve: async (form) => {
        const email = String(form.get("email") ?? "").trim();
        return email ? { email } : null;
      },
    },
  },
  onSignedIn: ({ user }) => promote(user.id),
  // "Sign in with OrangeCat" always signs in; Petvity has no "connect" screen.
  linkWhenSignedIn: () => false,
  // Petvity renders AccountKit's screens and has no credential writer of its own.
  screens: "accountkit",
});
