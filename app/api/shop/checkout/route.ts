import { NextRequest, NextResponse } from "next/server";
import { guestOrderCreateSchema, placeOrder, guestOrderUrl } from "@/lib/domain/orders";
import { slidingWindow } from "limitkit";
import { clientKey } from "@/lib/utils/rate-limit";

/**
 * A buyer placing more than this many orders a minute is a script, not a
 * shopper. Its own limiter with its own counts, which is also why the key needs
 * no `guest-checkout:` prefix any more.
 */
const guestOrders = slidingWindow({ limit: 5, windowMs: 60_000 });

/**
 * POST /api/shop/checkout — buy without an account.
 *
 * Deliberately public (not in PRIVATE_API_PREFIXES): requiring registration
 * before a first purchase is the single largest source of checkout abandonment,
 * and the public storefront is the page that receives cold traffic.
 *
 * Because it reserves stock without a session, it is rate limited per client.
 */
export async function POST(req: NextRequest) {
  const limit = guestOrders.check(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many orders in a row. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = guestOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, locale, ...order } = parsed.data;
  const result = await placeOrder({
    ...order,
    locale,
    buyer: { kind: "guest", email },
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  // Only what a guest needs to reach their receipt — never the whole order row,
  // which carries internal ids.
  return NextResponse.json(
    {
      success: true,
      data: {
        orderToken: result.order.publicToken,
        orderUrl: guestOrderUrl(result.order.publicToken),
        totalCents: result.order.totalCents,
        checkoutUrl: result.checkoutUrl,
      },
    },
    { status: 201 },
  );
}
