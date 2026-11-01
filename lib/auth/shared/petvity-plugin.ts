/**
 * What is Petvity's own on AccountKit's endpoints (`plugins` in runtime.ts):
 *
 * - The shared demo account (lib/config/demo.ts) stays explorable. Its
 *   credentials are public, so nobody signed in as it may change how it signs
 *   in (password, second factor, passkey, linked identity, address), end its
 *   other sessions or delete it, and no link is mailed to its address. The
 *   reset cron wipes anything else a visitor does.
 * - ADMIN_EMAILS promotes at a password or email-link sign-in, never at an
 *   OIDC one (lib/auth/claims.ts), the rule Auth.js and the compat layer used.
 */
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { eq } from "drizzle-orm";
import { DEMO_ACCOUNT, isDemoEmail } from "@/lib/config/demo";
import { getInstance } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { roleAfterSignIn } from "../claims";

/** Endpoints that change how an account signs in, or end it. */
const SECURITY_PATHS = [
  "/change-password",
  "/set-password",
  "/change-email",
  "/delete-user",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
  "/passkey/delete-passkey",
  "/link-social",
  "/oauth2/link",
  "/unlink-account",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
];

/** Endpoints that mail a link to the address in the body. */
const MAILING_PATHS = [
  "/request-password-reset",
  "/forget-password",
  "/sign-in/magic-link",
  "/send-verification-email",
];

/** Sign-ins whose address Petvity trusts for ADMIN_EMAILS (`credentials` in claims.ts). */
const TRUSTED_SIGN_IN_PATHS = ["/sign-in/email", "/magic-link/verify"];

export const DEMO_REFUSAL =
  "The demo account is shared, so its sign-in settings cannot be changed. Create your own account to set them.";

function demoRefusal(): APIError {
  return new APIError("FORBIDDEN", { code: "DEMO_ACCOUNT", message: DEMO_REFUSAL });
}

/** ADMIN_EMAILS promotion after a sign-in Petvity trusts the address of. */
export async function promote(userId: string): Promise<void> {
  const db = getInstance();
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, role: true },
  });
  if (!row) return;
  const role = roleAfterSignIn("credentials", row.email, row.role);
  if (role !== row.role) await db.update(users).set({ role }).where(eq(users.id, userId));
}

export function petvityPlugin(): BetterAuthPlugin {
  return {
    id: "petvity",
    hooks: {
      before: [
        {
          matcher: ({ path }) => Boolean(path && MAILING_PATHS.includes(path)),
          handler: createAuthMiddleware(async (ctx) => {
            const body = ctx.body as { email?: unknown } | undefined;
            if (typeof body?.email === "string" && isDemoEmail(body.email)) throw demoRefusal();
          }),
        },
        {
          matcher: ({ path }) => Boolean(path && SECURITY_PATHS.includes(path)),
          handler: createAuthMiddleware(async (ctx) => {
            const current = await getSessionFromCtx(ctx, { disableRefresh: true });
            if (current?.user.id === DEMO_ACCOUNT.id) throw demoRefusal();
          }),
        },
      ],
      after: [
        {
          matcher: ({ path }) => Boolean(path && TRUSTED_SIGN_IN_PATHS.includes(path)),
          handler: createAuthMiddleware(async (ctx) => {
            const userId = ctx.context.newSession?.user.id;
            if (!userId) return;
            // A promotion that fails must never fail the sign-in.
            await promote(userId).catch((error) =>
              console.error("[auth] ADMIN_EMAILS promotion failed", {
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }),
        },
      ],
    },
  };
}
