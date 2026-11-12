import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ getInstance: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") } }));
vi.mock("@/lib/api/signal-cache", () => ({ refreshSignalCache: vi.fn() }));

import bcrypt from "bcryptjs";
import { POST } from "./route";
import { getInstance } from "@/lib/db";
import { users, pets } from "@/lib/db/schema";
import { DEMO_ACCOUNT } from "@/lib/config/demo";

/** Records every insert so a test can assert what the reset writes. */
function mockDb(opts: { failOn?: unknown } = {}) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  /** Every step in order, so a test can assert what happens before what. */
  const steps: string[] = [];
  const tx = {
    delete: () => ({
      where: () => {
        steps.push("delete");
        return Promise.resolve();
      },
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        steps.push(table === users ? "insert-user" : "insert");
        if (opts.failOn === table) throw new Error("duplicate key value");
        inserts.push({ table, values });
        // The route awaits some inserts directly and calls .returning() on
        // others, so the same object has to satisfy both.
        return Object.assign(Promise.resolve(), {
          returning: () => Promise.resolve([{ id: "row-id" }]),
        });
      },
    }),
    query: { pets: { findFirst: () => Promise.resolve(undefined) } },
  };
  const db = {
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      steps.push("begin");
      try {
        const out = await fn(tx);
        steps.push("commit");
        return out;
      } catch (e) {
        steps.push("rollback");
        throw e;
      }
    },
  };
  vi.mocked(getInstance).mockReturnValue(db as never);
  return Object.assign(inserts, { steps });
}

function req(secret = "test-secret") {
  return { headers: new Headers({ authorization: `Bearer ${secret}` }) } as never;
}

describe("POST /api/cron/reset-demo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects a request without the cron secret", async () => {
    mockDb();
    const res = await POST({ headers: new Headers() } as never);
    expect(res.status).toBe(401);
  });

  it("reseeds the demo user under a pinned id, not a generated one", async () => {
    // The reset deletes the user row to cascade the wipe. If the insert let the
    // id be generated, every run minted a new identity while already-issued
    // sessions (30 days) still carried the old one — so a returning visitor was
    // signed in as a user that no longer existed and the demo read as empty.
    const inserts = mockDb();
    const res = await POST(req());
    expect(res.status).toBe(200);

    const userInsert = inserts.find((i) => i.table === users);
    expect(userInsert).toBeDefined();
    expect(userInsert!.values).toMatchObject({
      id: DEMO_ACCOUNT.id,
      email: DEMO_ACCOUNT.email,
    });
  });

  it("hashes before it deletes, and resets inside one transaction", async () => {
    // bcrypt between the delete and the insert left the demo account missing
    // for a few hundred milliseconds every run; a demo sign-in in that gap got
    // a demo row of its own and the pinned insert failed (HTTP 500, 2026-11-12).
    const hash = vi.mocked(bcrypt.hash);
    const calls = mockDb();
    hash.mockImplementationOnce(async () => {
      calls.steps.push("hash");
      return "hashed";
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(calls.steps.slice(0, 4)).toEqual(["hash", "begin", "delete", "insert-user"]);
    expect(calls.steps).toContain("commit");
  });

  it("rolls the whole reset back when a step fails", async () => {
    const calls = mockDb({ failOn: pets });
    await expect(POST(req())).rejects.toThrow("duplicate key value");
    expect(calls.steps).toContain("rollback");
    expect(calls.steps).not.toContain("commit");
  });

  it("seeds a pet owned by the demo user", async () => {
    const inserts = mockDb();
    await POST(req());
    const petInsert = inserts.find((i) => i.table === pets);
    expect(petInsert).toBeDefined();
    expect(petInsert!.values).toMatchObject({ name: "Luna", species: "dog" });
  });
});
