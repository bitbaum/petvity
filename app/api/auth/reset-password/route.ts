import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, like } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getInstance } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { BCRYPT_SALT_ROUNDS, PASSWORD_MIN_LENGTH } from "@/lib/config/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
        { status: 400 },
      );
    }

    const db = getInstance();
    const now = new Date();

    const record = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        like(verificationTokens.identifier, "pw-reset:%"),
        gte(verificationTokens.expires, now),
      ),
    });

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: "This reset link is invalid or has expired. Please request a new one.",
          // The shared recovery form returns to "request a link" on this code.
          code: "INVALID_TOKEN",
        },
        { status: 400 },
      );
    }

    const email = record.identifier.replace("pw-reset:", "");

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Account not found", code: "INVALID_TOKEN" },
        { status: 404 },
      );
    }

    const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await db.update(users).set({ password: hashed }).where(eq(users.id, user.id));

    // Consume the token (one-time use)
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, record.identifier));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Reset failed" }, { status: 500 });
  }
}
