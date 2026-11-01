/**
 * Petvity's screens on the shared runtime, unchanged: AccountKit's
 * next-auth/react compat layer, given what is Petvity's own — the session
 * shape, the password form and the ADMIN_EMAILS promotion
 * (docs/ACCOUNTKIT-MIGRATION.md).
 */
import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { createNextAuthCompat } from "@bitbaum/accountkit/auth/nextauth-compat";
import { getInstance } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { roleAfterSignIn } from "../claims";
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

/** ADMIN_EMAILS promotion at a password sign-in, the rule the Auth.js jwt callback applies. */
async function promote(userId: string) {
  const db = getInstance();
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, role: true },
  });
  if (!row) return;
  const role = roleAfterSignIn("credentials", row.email, row.role);
  if (role !== row.role) await db.update(users).set({ role }).where(eq(users.id, userId));
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
});
