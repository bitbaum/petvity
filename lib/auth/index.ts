import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { and, eq, isNull, or } from "drizzle-orm";
import { getInstance } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema, resolveRole } from "@/lib/domain/auth";
import type { UserRole } from "./types";
import {
  ORANGECAT_PROVIDER_ID,
  orangecatCredentials,
  orangecatProvider,
  withOrangecatIdentity,
  type OrangecatUserStore,
} from "./orangecat";
import "./types"; // ensure module augmentation is applied

// Functional config pattern — DrizzleAdapter(getInstance()) is only called on
// the first actual request, never at module evaluation time. This prevents the
// Next.js build from throwing when DATABASE_URL is absent in CI/build env.
type Db = ReturnType<typeof getInstance>;

/** users.orangecat_sub is the only thing an OrangeCat login resolves on. */
function orangecatUserStore(db: Db): OrangecatUserStore {
  return {
    async findBySub(sub) {
      const row = await db.query.users.findFirst({ where: eq(users.orangecatSub, sub) });
      return row ?? null;
    },
    async emailTaken(email) {
      const row = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true },
      });
      return Boolean(row);
    },
    async insert(data) {
      const [row] = await db.insert(users).values(data).returning();
      return row;
    },
    async attachSub(userId, sub) {
      const rows = await db
        .update(users)
        .set({ orangecatSub: sub })
        .where(
          and(eq(users.id, userId), or(isNull(users.orangecatSub), eq(users.orangecatSub, sub))),
        )
        .returning({ id: users.id });
      return rows.length > 0;
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getInstance();
  const orangecat = orangecatCredentials();
  return {
    adapter: withOrangecatIdentity(DrizzleAdapter(db), orangecatUserStore(db)),
    session: { strategy: "jwt" },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    providers: [
      // Absent (not broken) until the box has the client pair.
      ...(orangecat ? [orangecatProvider(orangecat.id, orangecat.secret)] : []),
      // Kept for any Google-linked account; OrangeCat now carries Google in the UI.
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
      Credentials({
        async authorize(credentials) {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const user = await db.query.users.findFirst({
            where: eq(users.email, parsed.data.email),
          });

          if (!user?.password) return null;

          const valid = await bcrypt.compare(parsed.data.password, user.password);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          } as {
            id: string;
            email: string;
            name: string | null;
            role: UserRole;
            emailVerified: Date | null;
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger, account }) {
        if (user) {
          token.id = user.id;
          token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;

          const existingRole = ((user as { role?: UserRole }).role ?? "pet_owner") as UserRole;
          // ADMIN_EMAILS may only PROMOTE at login — resolveRole without an
          // intendedRole returns "pet_owner" for everyone else, and writing
          // that back would silently demote every vet/sitter on their next
          // login (and did, until this guard).
          //
          // Never for an OrangeCat login: its email is unverified profile data,
          // so promoting on it would make admin a matter of typing an address.
          const viaOrangecat = account?.provider === ORANGECAT_PROVIDER_ID;
          const effectiveRole: UserRole =
            !viaOrangecat && resolveRole(user.email ?? "") === "admin" ? "admin" : existingRole;

          if (effectiveRole !== existingRole && user.id) {
            await db.update(users).set({ role: effectiveRole }).where(eq(users.id, user.id));
          }
          token.role = effectiveRole;
        }

        // Re-read name + role from DB on any update trigger so settings changes
        // and self-serve role upgrades take effect without re-login
        if (trigger === "update" && token.id) {
          const fresh = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
            columns: { name: true, role: true },
          });
          if (fresh) {
            token.name = fresh.name;
            token.role = fresh.role;
          }
        }

        return token;
      },
      session({ session, token }) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.emailVerified = (token.emailVerified as Date | null | undefined) ?? null;
        // Propagate name from token (updated via trigger="update" when settings are saved)
        if (token.name !== undefined) session.user.name = token.name as string | null;
        return session;
      },
    },
  };
});
