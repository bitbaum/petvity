import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { makeMockDb } from "@/lib/test-helpers/db-mock";

/* ─── Module mocks ─────────────────────────────────────────────────────────── */

vi.mock("@/lib/auth/guards", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db", () => ({ getInstance: vi.fn() }));

/* ─── Imports after mocks ──────────────────────────────────────────────────── */

import * as route from "./route";
import { PATCH } from "./route";
import { requireSession } from "@/lib/auth/guards";
import { getInstance } from "@/lib/db";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const OWNER_SESSION = {
  user: { id: "owner-1", role: "pet_owner", email: "owner@example.com", name: "Owner" },
  expires: "2099-01-01",
};

const MOCK_USER = {
  id: "owner-1",
  email: "owner@example.com",
  name: "Owner",
  password: "hashed-password",
  role: "pet_owner",
};

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/account writes no credential", () => {
  it("has no registration (POST) and no deletion (DELETE): both are AccountKit's", () => {
    expect("POST" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});

describe("PATCH /api/account", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    vi.mocked(getInstance).mockReturnValue(db as any);
    vi.mocked(requireSession).mockResolvedValue({ session: OWNER_SESSION as any, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      session: null as any,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makePatchRequest({ name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("refuses a password change: it is AccountKit's change-password", async () => {
    const res = await PATCH(makePatchRequest({ currentPassword: "old", newPassword: "new" }));
    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 400 when nothing to update (empty body)", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER);
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Nothing to update");
  });

  it("returns 200 when name is updated successfully", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER);
    const res = await PATCH(makePatchRequest({ name: "New Name" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when the digest preference is saved", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER);
    const res = await PATCH(makePatchRequest({ digestOptOut: true }));
    expect(res.status).toBe(200);
  });
});
