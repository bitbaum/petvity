import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getInstance } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { startCheckoutForOrder, guestOrderPath, toLocale } from "@/lib/domain/orders";
import { slidingWindow } from "limitkit";
import { clientKey } from "@/lib/utils/rate-limit";

/** Opening a Stripe session costs an API call; nobody clicks "Pay" ten times a minute. */
const payAttempts = slidingWindow({ limit: 10, windowMs: 60_000 });

/**
 * POST /api/shop/order/[token]/pay — resume payment for a guest order.
 *
 * The unguessable token IS the authorisation: a guest has no session, and this
 * is the same key that reaches their receipt page. Account orders are refused
 * here — they have /api/orders/[orderId]/pay, which checks a real session.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limit = payAttempts.check(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { token } = await params;
  const body = await req.json().catch(() => null);
  const locale = toLocale((body as { locale?: unknown } | null)?.locale);
  const db = getInstance();

  const [order] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);

  // An unknown token and an account order both answer "not found" — neither
  // should confirm to a prober that a token is real.
  if (!order || order.userId !== null) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }

  const result = await startCheckoutForOrder(
    order,
    order.guestEmail,
    guestOrderPath(order.publicToken, locale),
  );
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: { checkoutUrl: result.checkoutUrl } });
}
