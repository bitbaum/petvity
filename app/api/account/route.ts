import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getInstance } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/guards";

/**
 * /api/account: Petvity's own profile fields. Sign-up, password changes,
 * recovery and deletion are AccountKit's (lib/auth/shared/runtime.ts), so
 * nothing here writes a credential.
 */
const updateAccountSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    digestOptOut: z.boolean().optional(),
  })
  .strict();

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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}
