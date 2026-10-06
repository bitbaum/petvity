import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq, and, like } from "drizzle-orm";
import { getInstance } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { passwordReset } from "@/lib/email/templates";
import { APP, APP_URL } from "@/lib/config/app";
import { isDemoEmail } from "@/lib/config/demo";
import { PASSWORD_RESET_TOKEN_EXPIRY_MS } from "@/lib/config/auth";
import { mayReceivePasswordReset } from "@bitbaum/accountkit/orangecat";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 });
    }

    // If email delivery is unconfigured, say so — for EVERY address, before
    // any lookup, so the response can't be used for account enumeration.
    // Silently answering "success" while no email can ever arrive locks
    // users out permanently (this shipped: prod ran without RESEND_API_KEY).
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: `Password reset emails are temporarily unavailable. Please contact ${APP.supportEmail}.`,
        },
        { status: 503 },
      );
    }

    const normalised = email.toLowerCase().trim();

    // The shared demo account's password is fixed — a reset would lock the
    // demo for everyone. (Generic success: no enumeration signal.)
    if (isDemoEmail(normalised)) {
      return NextResponse.json({ success: true });
    }

    const db = getInstance();

    // Always respond with success to prevent email enumeration
    const user = await db.query.users.findFirst({ where: eq(users.email, normalised) });
    // A user "Sign in with OrangeCat" created has no password here, and its
    // address came from OrangeCat unverified: a reset link would give whoever
    // owns that address a password on the OrangeCat person's account. A
    // placeholder address can receive nothing. Same generic answer.
    if (
      !user ||
      !mayReceivePasswordReset({
        email: user.email,
        hasPassword: Boolean(user.password),
        orangecatLinked: Boolean(user.orangecatSub),
      })
    ) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing reset token for this email
    await db
      .delete(verificationTokens)
      .where(
        and(
          like(verificationTokens.identifier, "pw-reset:%"),
          eq(verificationTokens.identifier, `pw-reset:${normalised}`),
        ),
      );

    // Generate a new secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

    await db.insert(verificationTokens).values({
      identifier: `pw-reset:${normalised}`,
      token,
      expires,
    });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    // In dev without Resend, print only to server stderr (never to the browser)
    if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
      process.stderr.write(`[forgot-password] Reset URL: ${resetUrl}\n`);
    }

    const { subject, html } = passwordReset({ resetUrl }, user.locale);
    await sendEmail({ to: normalised, subject, html }).catch((err) =>
      console.error("[forgot-password] Email send failed:", err),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Request failed" }, { status: 500 });
  }
}
