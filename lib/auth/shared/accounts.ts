/**
 * A person AccountKit created itself (a first OrangeCat or bitbaum sign-in)
 * gets Petvity's `users` row under the same id, so every Petvity table can
 * reference them. Linking OrangeCat to an existing person records the sub.
 * Idempotent: AccountKit may call this more than once for one person.
 */
import { and, eq, isNull } from "drizzle-orm";
import { ORANGECAT_PROVIDER_ID } from "@bitbaum/accountkit/orangecat";
import { getInstance } from "@/lib/db";
import { authUsers } from "@/lib/db/accountkit";
import { users } from "@/lib/db/schema";

export async function ensurePetvityUser(account: {
  userId: string;
  providerId: string;
  accountId: string;
}): Promise<void> {
  const db = getInstance();
  const sub = account.providerId === ORANGECAT_PROVIDER_ID ? account.accountId : null;
  const existing = await db.query.users.findFirst({
    where: eq(users.id, account.userId),
    columns: { id: true },
  });
  if (existing) {
    if (sub) {
      await db
        .update(users)
        .set({ orangecatSub: sub })
        .where(and(eq(users.id, account.userId), isNull(users.orangecatSub)));
    }
    return;
  }
  const [shared] = await db
    .select({ email: authUsers.email, name: authUsers.name, verified: authUsers.emailVerified })
    .from(authUsers)
    .where(eq(authUsers.id, account.userId))
    .limit(1);
  if (!shared) return;
  // An address from a provider is never proof (AccountKit gives OIDC people a
  // `.invalid` placeholder), so a new person starts as a pet owner, unverified.
  await db
    .insert(users)
    .values({
      id: account.userId,
      email: shared.email,
      name: shared.name || null,
      emailVerified: shared.verified ? new Date() : null,
      orangecatSub: sub,
    })
    .onConflictDoNothing();
}
