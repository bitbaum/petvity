/**
 * Petvity on AccountKit's shared account runtime. Off until
 * AUTH_RUNTIME=accountkit; Auth.js stays authoritative until the import and the
 * switch (docs/ACCOUNTKIT-MIGRATION.md).
 */
import bcrypt from "bcryptjs";
import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { createAuthMailer } from "@bitbaum/accountkit/auth/mail";
import { APP_URL } from "@/lib/config/app";
import { getInstance } from "@/lib/db";
import { authTables } from "@/lib/db/accountkit";
import { ensurePetvityUser } from "./accounts";

/** Whether the shared runtime answers. Auth.js answers otherwise. */
export function sharedAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUTH_RUNTIME === "accountkit";
}

/** The public origin every redirect and every AccountKit origin check uses. */
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.AUTH_URL || APP_URL).replace(/\/$/, "");
}

const site = { url: siteUrl(), title: "Petvity", slug: "petvity" };

// The secret is BETTER_AUTH_SECRET, or the AUTH_SECRET the box already holds.
export const sharedAuth = createAuthRuntime({
  site,
  // Account mail through the fleet transport (RESEND_*), as Petvity's own is.
  mail: createAuthMailer({ site }),
  isDatabaseConfigured: (env) => sharedAuthEnabled(env) && Boolean(env.DATABASE_URL),
  getDatabase: () => getInstance(),
  schema: authTables,
  // Imported bcrypt hashes (users.password) keep working, and Petvity's own
  // writers (registration, reset, password change) keep writing bcrypt.
  legacyBcrypt: bcrypt,
  // users.id is a uuid that every Petvity table references.
  ids: "uuid",
  onAccountCreated: ensurePetvityUser,
});
