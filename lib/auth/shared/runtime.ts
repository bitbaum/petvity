/**
 * Petvity's accounts, on AccountKit's shared runtime: email and password, an
 * email sign-in link, passkeys, two-factor codes, password recovery, Sign in
 * with OrangeCat and the shared bitbaum sign-in, each shown when its env is set
 * (signInMethods in lib/auth/methods.ts). AccountKit is the only writer of
 * credentials (docs/ACCOUNTKIT-MIGRATION.md).
 */
import bcrypt from "bcryptjs";
import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { createAuthMailer } from "@bitbaum/accountkit/auth/mail";
import { APP_URL } from "@/lib/config/app";
import { getInstance } from "@/lib/db";
import { authTables } from "@/lib/db/accountkit";
import { ensurePetvityUser } from "./accounts";
import { petvityPlugin } from "./petvity-plugin";

/** The public origin every redirect and every AccountKit origin check uses. */
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.AUTH_URL || APP_URL).replace(/\/$/, "");
}

const site = { url: siteUrl(), title: "Petvity", slug: "petvity" };

/** Account mail through the fleet transport (RESEND_*), as Petvity's own is. */
export const authMail = createAuthMailer({ site });

// The secret is BETTER_AUTH_SECRET, or the AUTH_SECRET the box already holds.
export const sharedAuth = createAuthRuntime({
  site,
  mail: authMail,
  isDatabaseConfigured: (env) => Boolean(env.DATABASE_URL),
  getDatabase: () => getInstance(),
  schema: authTables,
  // Hashes imported from Auth.js (and the demo account's, which the reset cron
  // writes to users.password and the mirror copies) are bcrypt; every password
  // set through AccountKit is its native scrypt.
  legacyBcrypt: bcrypt,
  // users.id is a uuid that every Petvity table references.
  ids: "uuid",
  onAccountCreated: ensurePetvityUser,
  plugins: [petvityPlugin()],
});
