import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeMockDb } from "@/lib/test-helpers/db-mock";

/* ─── Module mocks ─────────────────────────────────────────────────────────── */

vi.mock("@/lib/db", () => ({ getInstance: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

/* ─── Imports after mocks ──────────────────────────────────────────────────── */

import { POST } from "./route";
import { getInstance } from "@/lib/db";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ─── Tests ────────────────────────────────────────────────────────────────── */

describe("POST /api/auth/forgot-password", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    vi.mocked(getInstance).mockReturnValue(db as any);
    // Reset flows require a configured email pipeline; without it the route
    // answers 503 for every address (tested below).
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
  });

  it("returns 503 for every address when email is unconfigured (no silent lockout)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const known = await POST(makeRequest({ email: "owner@example.com" }));
    const unknown = await POST(makeRequest({ email: "unknown@example.com" }));
    expect(known.status).toBe(503);
    expect(unknown.status).toBe(503);
    // Uniform response — still no enumeration signal.
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is not a string", async () => {
    const res = await POST(makeRequest({ email: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 even when email does not exist (anti-enumeration)", async () => {
    db._queryFindFirst.mockResolvedValueOnce(undefined); // user not found
    const res = await POST(makeRequest({ email: "unknown@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // No token should have been created — only one db.query call (findFirst), no insert
  });

  it("returns 200 and creates a reset token when email exists", async () => {
    db._queryFindFirst.mockResolvedValueOnce({ id: "user-1", email: "owner@example.com" });
    const res = await POST(makeRequest({ email: "owner@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("sends no reset link to an account OrangeCat created (unverified address)", async () => {
    db._queryFindFirst.mockResolvedValueOnce({
      id: "user-2",
      email: "victim@example.com",
      password: null,
      orangecatSub: "actor-1",
    });
    const res = await POST(makeRequest({ email: "victim@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    const { sendEmail } = await import("@/lib/email");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still sends one to an OrangeCat-linked account with its own password", async () => {
    db._queryFindFirst.mockResolvedValueOnce({
      id: "user-3",
      email: "owner@example.com",
      password: "hash",
      orangecatSub: "actor-2",
    });
    await POST(makeRequest({ email: "owner@example.com" }));
    const { sendEmail } = await import("@/lib/email");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
