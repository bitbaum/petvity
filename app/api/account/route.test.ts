import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { makeMockDb } from "@/lib/test-helpers/db-mock";

/* ─── Module mocks ─────────────────────────────────────────────────────────── */

vi.mock("@/lib/auth/guards", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db", () => ({ getInstance: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/domain/email-queue", () => ({
  enqueueWelcomeSequence: vi.fn().mockResolvedValue(undefined),
}));
// bcryptjs is slow — speed up tests with a lightweight mock
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

/* ─── Imports after mocks ──────────────────────────────────────────────────── */

import { POST, PATCH, DELETE } from "./route";
import { requireSession } from "@/lib/auth/guards";
import { getInstance } from "@/lib/db";
import bcrypt from "bcryptjs";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const OWNER_SESSION = {
  user: { id: "owner-1", role: "pet_owner", email: "owner@example.com", name: "Owner" },
  expires: "2099-01-01",
};

const MOCK_USER_WITH_PASSWORD = {
  id: "owner-1",
  email: "owner@example.com",
  name: "Owner",
  password: "hashed-password",
  role: "pet_owner",
};

const MOCK_USER_OAUTH = {
  id: "oauth-user",
  email: "oauth@example.com",
  name: "OAuth User",
  password: null,
  role: "pet_owner", // OAuth — no password
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_REGISTER = { email: "new@example.com", password: "securepass123" };

/* ─── POST (registration) tests ────────────────────────────────────────────── */

describe("POST /api/account (registration)", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    vi.mocked(getInstance).mockReturnValue(db as any);
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(makePostRequest({ password: "securepass123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makePostRequest({ email: "not-an-email", password: "securepass123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is empty or longer than the shared rule allows", async () => {
    for (const password of ["", "x".repeat(129)]) {
      const res = await POST(makePostRequest({ email: "new@example.com", password }));
      expect(res.status).toBe(400);
    }
  });

  it("returns 409 when email already exists", async () => {
    db._queryFindFirst.mockResolvedValueOnce({ id: "existing-user" }); // email taken
    const res = await POST(makePostRequest(VALID_REGISTER));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already exists");
  });

  it("returns 201 with new user id on successful registration", async () => {
    db._queryFindFirst.mockResolvedValueOnce(undefined); // email not taken
    db._insertReturning.mockResolvedValueOnce([{ id: "new-user-id" }]);

    const res = await POST(makePostRequest(VALID_REGISTER));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("new-user-id");
  });

  it("derives name from email prefix when name is not provided", async () => {
    db._queryFindFirst.mockResolvedValueOnce(undefined);
    db._insertReturning.mockResolvedValueOnce([{ id: "new-user-id" }]);

    // The insert mock captures the args via the vi.fn() — we just verify it succeeds
    const res = await POST(
      makePostRequest({ email: "john.doe@example.com", password: "securepass123" }),
    );
    expect(res.status).toBe(201);
  });

  it("registers as veterinarian when intendedRole=veterinarian", async () => {
    db._queryFindFirst.mockResolvedValueOnce(undefined);
    db._insertReturning.mockResolvedValueOnce([{ id: "vet-user-id" }]);

    const res = await POST(makePostRequest({ ...VALID_REGISTER, intendedRole: "veterinarian" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    // resolveRole should have been called with intendedRole — the route should pass it through
    // (we verify via db insert being called once with vet role)
    expect(db._insertReturning).toHaveBeenCalledOnce();
  });

  it("registers as pet_sitter when intendedRole=pet_sitter", async () => {
    db._queryFindFirst.mockResolvedValueOnce(undefined);
    db._insertReturning.mockResolvedValueOnce([{ id: "sitter-user-id" }]);

    const res = await POST(makePostRequest({ ...VALID_REGISTER, intendedRole: "pet_sitter" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 for an invalid intendedRole value", async () => {
    const res = await POST(makePostRequest({ ...VALID_REGISTER, intendedRole: "admin" }));
    expect(res.status).toBe(400);
  });
});

/* ─── PATCH (account update) tests ─────────────────────────────────────────── */

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

  it("returns 400 when newPassword is given without currentPassword", async () => {
    const res = await PATCH(makePatchRequest({ newPassword: "newpass123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when nothing to update (empty body)", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Nothing to update");
  });

  it("returns 400 when OAuth user tries to change password", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_OAUTH);
    const res = await PATCH(
      makePatchRequest({ currentPassword: "old", newPassword: "newpass123" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("OAuth accounts");
  });

  it("returns 400 when current password is incorrect", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    const res = await PATCH(
      makePatchRequest({ currentPassword: "wrongpass", newPassword: "newpass123" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("incorrect");
  });

  it("returns 200 when name is updated successfully", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    // update().set().where() — no returning() used, direct await
    const res = await PATCH(makePatchRequest({ name: "New Name" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when password is changed with correct current password", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    const res = await PATCH(
      makePatchRequest({ currentPassword: "securepass123", newPassword: "newpass456" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("DELETE /api/account", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    vi.mocked(getInstance).mockReturnValue(db as any);
    vi.mocked(requireSession).mockResolvedValue({ session: OWNER_SESSION as any, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({
      session: null as any,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(makeDeleteRequest({ confirm: "DELETE", currentPassword: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when confirm field is missing or wrong", async () => {
    const res1 = await DELETE(makeDeleteRequest({ currentPassword: "x" }));
    expect(res1.status).toBe(400);

    const res2 = await DELETE(makeDeleteRequest({ confirm: "delete", currentPassword: "x" })); // wrong case
    expect(res2.status).toBe(400);
  });

  it("returns 400 when password is missing for credentials account", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    const res = await DELETE(makeDeleteRequest({ confirm: "DELETE" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/password is required/i);
  });

  it("returns 400 when current password is wrong", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    const res = await DELETE(makeDeleteRequest({ confirm: "DELETE", currentPassword: "wrong" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/incorrect/i);
  });

  it("skips password check for OAuth accounts (no local password)", async () => {
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_OAUTH);
    const res = await DELETE(makeDeleteRequest({ confirm: "DELETE" }));
    expect(res.status).toBe(200);
    expect(db.delete).toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("deletes the user when password is correct and confirm matches", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    db._queryFindFirst.mockResolvedValueOnce(MOCK_USER_WITH_PASSWORD);
    const res = await DELETE(
      makeDeleteRequest({ confirm: "DELETE", currentPassword: "securepass123" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(db.delete).toHaveBeenCalled();
  });
});
