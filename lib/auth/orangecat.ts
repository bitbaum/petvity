/**
 * "Sign in with OrangeCat" — the OIDC provider and the rule that keys a
 * petvity user on OrangeCat's `sub` (the actor id), never on email.
 *
 * Kept free of any runtime next-auth import so it can be unit-tested without
 * a Next runtime or a database.
 *
 * Two provider settings are load-bearing and were paid for once already by
 * Loki's debugging:
 *  - OrangeCat's token endpoint accepts ONLY `client_secret_post`. Auth.js
 *    defaults to `client_secret_basic`, which OrangeCat rejects at the code
 *    exchange with a 400 reading "client_id is required" — the wrong problem.
 *  - PKCE (and state) are required even for this confidential client.
 *
 * Identity only: no token refresh, no capability scopes.
 */
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";

export const ORANGECAT_PROVIDER_ID = "orangecat";

export function orangecatIssuer(): string {
  return process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch";
}

/** The client pair, or null when unset — the provider is then ABSENT, not broken. */
export function orangecatCredentials(): { id: string; secret: string } | null {
  const id = process.env.ORANGECAT_OAUTH_CLIENT_ID;
  const secret = process.env.ORANGECAT_OAUTH_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function orangecatEnabled(): boolean {
  return orangecatCredentials() !== null;
}

export interface OrangecatClaims {
  sub?: string;
  name?: string | null;
  preferred_username?: string | null;
  email?: string | null;
  picture?: string | null;
}

/**
 * What the provider hands Auth.js as "the user". Deliberately carries NO
 * `email` key: Auth.js's OAuth flow calls `getUserByEmail(profile.email)` for
 * an unknown account and either links (dangerous) or refuses — skipping that
 * lookup is what lets a new sub always become a new user. The address rides
 * along as `contactEmail`, profile data only.
 */
export function orangecatProfile(claims: OrangecatClaims) {
  if (!claims.sub) throw new Error("OrangeCat id_token has no sub");
  return {
    id: claims.sub,
    name: claims.name ?? claims.preferred_username ?? null,
    image: claims.picture ?? null,
    orangecatSub: claims.sub,
    contactEmail: claims.email ? claims.email.trim().toLowerCase() : null,
  };
}

export function orangecatProvider(id: string, secret: string) {
  return {
    id: ORANGECAT_PROVIDER_ID,
    name: "OrangeCat",
    type: "oidc" as const,
    issuer: orangecatIssuer(),
    clientId: id,
    clientSecret: secret,
    client: { token_endpoint_auth_method: "client_secret_post" as const },
    checks: ["pkce" as const, "state" as const],
    authorization: { params: { scope: "openid profile email" } },
    profile: orangecatProfile,
    // Never let anyone flip this on: OrangeCat's email_verified is untrustworthy.
    allowDangerousEmailAccountLinking: false,
  };
}

/**
 * Address stored when the OrangeCat email already belongs to another petvity
 * user (users.email is NOT NULL UNIQUE). `.invalid` is reserved (RFC 2606) and
 * can never be delivered to, registered or reset.
 */
export function placeholderEmail(sub: string): string {
  return `orangecat-${sub.replace(/[^a-zA-Z0-9-]/g, "")}@users.invalid`;
}

/** The few DB operations the OrangeCat identity rule needs. */
export interface OrangecatUserStore {
  findBySub(sub: string): Promise<AdapterUser | null>;
  emailTaken(email: string): Promise<boolean>;
  insert(data: {
    orangecatSub: string;
    email: string;
    name: string | null;
    image: string | null;
  }): Promise<AdapterUser>;
  /** Attach a sub to a user who is ALREADY signed in. False if they hold a different sub. */
  attachSub(userId: string, sub: string): Promise<boolean>;
}

/**
 * Wrap the Drizzle adapter so the OrangeCat provider resolves users by
 * `users.orangecat_sub` alone. Every other provider passes straight through.
 * OrangeCat tokens are not stored (identity only), so the column is the single
 * source of truth for the link.
 */
export function withOrangecatIdentity(base: Adapter, store: OrangecatUserStore): Adapter {
  return {
    ...base,
    async getUserByAccount(ref) {
      if (ref.provider === ORANGECAT_PROVIDER_ID) return store.findBySub(ref.providerAccountId);
      return base.getUserByAccount!(ref);
    },
    async createUser(data) {
      const sub = (data as { orangecatSub?: unknown }).orangecatSub;
      if (typeof sub !== "string" || !sub) return base.createUser!(data);
      const contact = (data as { contactEmail?: unknown }).contactEmail;
      const wanted = typeof contact === "string" && contact ? contact : null;
      const email = wanted && !(await store.emailTaken(wanted)) ? wanted : placeholderEmail(sub);
      return store.insert({
        orangecatSub: sub,
        email,
        name: data.name ?? null,
        image: data.image ?? null,
      });
    },
    async linkAccount(account: AdapterAccount) {
      if (account.provider !== ORANGECAT_PROVIDER_ID) {
        await base.linkAccount!(account);
        return null;
      }
      const ok = await store.attachSub(account.userId, account.providerAccountId);
      if (!ok) throw new Error("This account is already connected to a different OrangeCat login");
      return null;
    },
  };
}
