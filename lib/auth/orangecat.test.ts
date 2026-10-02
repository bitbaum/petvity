import { describe, it, expect, vi, afterEach } from "vitest";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import {
  orangecatProvider,
  orangecatProfile,
  orangecatEnabled,
  placeholderEmail,
  withOrangecatIdentity,
  type OrangecatUserStore,
} from "./orangecat";

/**
 * The OIDC quirks, asserted rather than remembered: a silent revert of either
 * surfaces as an opaque 400 at the code exchange.
 */
afterEach(() => vi.unstubAllEnvs());

describe("orangecatProvider", () => {
  const provider = orangecatProvider("petvity", "secret");

  it("authenticates at the token endpoint with client_secret_post", () => {
    // Auth.js defaults to client_secret_basic; OrangeCat rejects it with a
    // 400 reading "client_id is required".
    expect(provider.client.token_endpoint_auth_method).toBe("client_secret_post");
  });

  it("checks PKCE and state", () => {
    expect(provider.checks).toContain("pkce");
    expect(provider.checks).toContain("state");
  });

  it("is OIDC with id 'orangecat' (callback /api/auth/callback/orangecat), identity scopes only", () => {
    expect(provider.type).toBe("oidc");
    expect(provider.id).toBe("orangecat");
    expect(provider.authorization.params.scope).toBe("openid profile email");
    expect(provider.allowDangerousEmailAccountLinking).toBe(false);
  });

  it("uses https://orangecat.ch unless ORANGECAT_OAUTH_ISSUER overrides it", () => {
    vi.stubEnv("ORANGECAT_OAUTH_ISSUER", undefined);
    expect(orangecatProvider("a", "b").issuer).toBe("https://orangecat.ch");
    vi.stubEnv("ORANGECAT_OAUTH_ISSUER", "https://staging.example");
    expect(orangecatProvider("a", "b").issuer).toBe("https://staging.example");
  });
});

describe("orangecatEnabled", () => {
  it("is false unless both halves of the client pair are set", () => {
    vi.stubEnv("ORANGECAT_OAUTH_CLIENT_ID", "petvity");
    vi.stubEnv("ORANGECAT_OAUTH_CLIENT_SECRET", "");
    expect(orangecatEnabled()).toBe(false);
    vi.stubEnv("ORANGECAT_OAUTH_CLIENT_SECRET", "s");
    expect(orangecatEnabled()).toBe(true);
  });
});

describe("orangecatProfile", () => {
  it("keys on sub and carries NO email key, so Auth.js never looks a user up by email", () => {
    const p = orangecatProfile({ sub: "actor-1", name: "Ana", email: "Ana@Example.test" });
    expect(p.id).toBe("actor-1");
    expect(p.orangecatSub).toBe("actor-1");
    expect("email" in p).toBe(false);
    expect(p.contactEmail).toBe("ana@example.test");
  });

  it("refuses a token without a sub rather than inventing an id", () => {
    expect(() => orangecatProfile({ email: "x@example.test" })).toThrow();
  });
});

// ── The identity rule: a new sub is a new user, never an email match ──────

const EXISTING: AdapterUser = {
  id: "existing-user",
  email: "victim@example.test",
  emailVerified: new Date(),
  name: "Victim",
};

function fakeStore() {
  const rows: (AdapterUser & { orangecatSub: string | null })[] = [
    { ...EXISTING, orangecatSub: null },
  ];
  const store: OrangecatUserStore = {
    findBySub: async (sub) => rows.find((r) => r.orangecatSub === sub) ?? null,
    emailTaken: async (email) => rows.some((r) => r.email === email),
    insert: async (data) => {
      const row = { id: `new-${rows.length}`, emailVerified: null, ...data };
      rows.push(row);
      return row;
    },
    attachSub: async (userId, sub) => {
      const row = rows.find((r) => r.id === userId);
      if (!row || (row.orangecatSub && row.orangecatSub !== sub)) return false;
      row.orangecatSub = sub;
      return true;
    },
  };
  return { rows, store };
}

function fakeBase() {
  return {
    getUserByAccount: vi.fn(async () => null),
    getUserByEmail: vi.fn(async () => EXISTING),
    createUser: vi.fn(async (u: AdapterUser) => u),
    linkAccount: vi.fn(async () => undefined),
  } satisfies Adapter;
}

/** The order Auth.js's handleLoginOrRegister runs for an unknown OAuth account. */
async function signInAsNewOrangecatUser(adapter: Adapter, claims: { sub: string; email: string }) {
  const profile = orangecatProfile(claims);
  const account = {
    provider: "orangecat",
    providerAccountId: profile.id,
    type: "oidc" as const,
    userId: "",
  };
  const byAccount = await adapter.getUserByAccount!(account);
  if (byAccount) return byAccount;
  const byEmail =
    "email" in profile && typeof profile.email === "string"
      ? await adapter.getUserByEmail!(profile.email)
      : null;
  if (byEmail) throw new Error("OAuthAccountNotLinked");
  const user = await adapter.createUser!({
    ...(profile as unknown as AdapterUser),
    emailVerified: null,
  });
  await adapter.linkAccount!({ ...account, userId: user.id });
  return user;
}

describe("withOrangecatIdentity", () => {
  it("a new sub with an existing user's email becomes a NEW user, never the existing one", async () => {
    const { rows, store } = fakeStore();
    const base = fakeBase();
    const adapter = withOrangecatIdentity(base, store);

    const user = await signInAsNewOrangecatUser(adapter, {
      sub: "attacker-sub",
      email: "victim@example.test",
    });

    expect(user.id).not.toBe(EXISTING.id);
    expect(base.getUserByEmail).not.toHaveBeenCalled();
    // users.email is UNIQUE, so the taken address is not stored on the new row.
    expect(user.email).toBe(placeholderEmail("attacker-sub"));
    expect(rows.find((r) => r.id === EXISTING.id)?.orangecatSub).toBeNull();
    expect(rows.find((r) => r.id === user.id)?.orangecatSub).toBe("attacker-sub");
  });

  it("stores a free email as profile data and resolves the same sub to the same user next time", async () => {
    const { store } = fakeStore();
    const adapter = withOrangecatIdentity(fakeBase(), store);

    const first = await signInAsNewOrangecatUser(adapter, {
      sub: "s-1",
      email: "new@example.test",
    });
    expect(first.email).toBe("new@example.test");
    const again = await signInAsNewOrangecatUser(adapter, {
      sub: "s-1",
      email: "other@example.test",
    });
    expect(again.id).toBe(first.id);
  });

  it("will not attach a second, different sub to a user who already has one", async () => {
    const { store } = fakeStore();
    const adapter = withOrangecatIdentity(fakeBase(), store);
    await adapter.linkAccount!({
      provider: "orangecat",
      providerAccountId: "first",
      type: "oidc",
      userId: EXISTING.id,
    });
    await expect(
      adapter.linkAccount!({
        provider: "orangecat",
        providerAccountId: "second",
        type: "oidc",
        userId: EXISTING.id,
      }),
    ).rejects.toThrow();
  });

  it("leaves every other provider on the base adapter", async () => {
    const { store } = fakeStore();
    const base = fakeBase();
    const adapter = withOrangecatIdentity(base, store);
    await adapter.getUserByAccount!({ provider: "google", providerAccountId: "g-1" });
    await adapter.createUser!({ ...EXISTING, id: "x", email: "g@example.test" });
    await adapter.linkAccount!({
      provider: "google",
      providerAccountId: "g-1",
      type: "oidc",
      userId: "x",
    });
    expect(base.getUserByAccount).toHaveBeenCalledOnce();
    expect(base.createUser).toHaveBeenCalledOnce();
    expect(base.linkAccount).toHaveBeenCalledOnce();
  });
});
