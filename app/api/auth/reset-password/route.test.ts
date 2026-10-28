import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeMockDb } from "@/lib/test-helpers/db-mock";

/* ─── Module mocks ─────────────────────────────────────────────────────────── */

vi.mock("@/lib/db", () => ({ getInstance: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

/* ─── Imports after mocks ──────────────────────────────────────────────────── */

import { POST } from "./route";
import { getInstance } from "@/lib/db";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const VALID_TOKEN = "a".repeat(64); // 32 bytes hex = 64 chars

const MOCK_TOKEN_RECORD = {
  identifier: "pw-reset:owner@example.com",
  token: VALID_TOKEN,
  expires: new Date(Date.now() + 3600000), // 1 hour from now
};

const MOCK_USER = { id: "user-1", email: "owner@example.com" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ─── Tests ────────────────────────────────────────────────────────────────── */

describe("POST /api/auth/reset-password", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    vi.mocked(getInstance).mockReturnValue(db as any);
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ password: "newpassword123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short (< 8 chars)", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN, password: "short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("at least");
  });

  it("returns 400 when token is invalid or expired", async () => {
    db._queryFindFirst.mockResolvedValueOnce(undefined); // token not found
    const res = await POST(makeRequest({ token: VALID_TOKEN, password: "newpassword123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("invalid or has expired");
    // The shared recovery form goes back to "request a link" on this code.
    expect(body.code).toBe("INVALID_TOKEN");
  });

  it("returns 200 and resets password on valid token", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_TOKEN_RECORD); // token found
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER); // user found
    const res = await POST(makeRequest({ token: VALID_TOKEN, password: "newpassword123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when token is valid but user account no longer exists", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_TOKEN_RECORD); // token found
    db._queryFindFirst.mockResolvedValueOnce(undefined); // user not found
    const res = await POST(makeRequest({ token: VALID_TOKEN, password: "newpassword123" }));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("INVALID_TOKEN");
  });
});
