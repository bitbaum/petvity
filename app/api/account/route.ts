import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getInstance } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema, resolveRole } from "@/lib/domain/auth";
import { enqueueWelcomeSequence } from "@/lib/domain/email-queue";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@bitbaum/accountkit/auth/password";
import { BCRYPT_SALT_ROUNDS } from "@/lib/config/auth";
import { sendEmail } from "@/lib/email";
import { ownerWelcome } from "@/lib/email/templates";
import { requireSession } from "@/lib/auth/guards";
import { isDemoEmail } from "@/lib/config/demo";
import { makeUnsubscribeUrl } from "@/lib/auth/unsubscribe-token";

const updateAccountSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).optional(),
    digestOptOut: z.boolean().optional(),
  })
  .refine((d) => !(d.newPassword && !d.currentPassword), {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name: rawName, email, password, intendedRole } = parsed.data;
    // Derive a display name from the email prefix if not provided
    const name =
      rawName?.trim() ||
      email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const db = getInstance();

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const role = resolveRole(email, intendedRole);

    const [user] = await db
      .insert(users)
      .values({ name, email: email.toLowerCase(), password: hashed, role })
      .returning({ id: users.id });

    // Queue the full welcome sequence (day 1, 3, 7 follow-ups)
    await enqueueWelcomeSequence(user.id, { name, email: email.toLowerCase() });

    // Send the welcome email immediately (don't wait for cron)
    const welcome = ownerWelcome({ name, unsubscribeUrl: makeUnsubscribeUrl(user.id) });
    await sendEmail({ to: email.toLowerCase(), ...welcome }).catch((err) =>
      console.error("[account] Welcome email failed:", err),
    );

    return NextResponse.json({ success: true, data: { id: user.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}

/** GET /api/account — returns the current user's editable preferences. */
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const db = getInstance();
  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      locale: users.locale,
      digestOptOut: users.digestOptOut,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const db = getInstance();
    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const updates: Partial<typeof user> = {};

    if (parsed.data.name) {
      updates.name = parsed.data.name.trim();
    }

    if (typeof parsed.data.digestOptOut === "boolean") {
      updates.digestOptOut = parsed.data.digestOptOut;
    }

    if (parsed.data.newPassword) {
      // The shared demo account must stay explorable — a visitor changing its
      // password would lock out everyone after them.
      if (isDemoEmail(user.email)) {
        return NextResponse.json(
          { success: false, error: "The demo account's password cannot be changed" },
          { status: 403 },
        );
      }
      if (!user.password) {
        return NextResponse.json(
          { success: false, error: "Password change is not available for OAuth accounts" },
          { status: 400 },
        );
      }
      const valid = await bcrypt.compare(parsed.data.currentPassword!, user.password);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 },
        );
      }
      updates.password = await bcrypt.hash(parsed.data.newPassword, BCRYPT_SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}

const deleteAccountSchema = z.object({
  /** For credentials accounts: re-confirm the password before deletion. */
  currentPassword: z.string().optional(),
  /** Require typing the literal string "DELETE" to guard against accidental clicks. */
  confirm: z.literal("DELETE"),
});

/** DELETE /api/account — permanently delete the user and all related data.
 *  GDPR right-to-erasure. Cascade FKs handle pets, health metrics, vaccinations,
 *  medications, records, bookings, reviews, orders, products listed by them,
 *  adoption listings/applications, signal history, and the email queue. */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Type DELETE in the confirmation field" },
      { status: 400 },
    );
  }

  const db = getInstance();
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!user) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  // For credentials accounts, require the current password as a re-auth check.
  // OAuth accounts skip this since they have no local password.
  if (user.password) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json(
        { success: false, error: "Current password is required" },
        { status: 400 },
      );
    }
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 },
      );
    }
  }

  await db.delete(users).where(eq(users.id, session.user.id));
  return NextResponse.json({ success: true });
}
