import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getInstance } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { setOrderStatus } from "@/lib/domain/orders";
import { slidingWindow } from "limitkit";
import { clientKey } from "@/lib/utils/rate-limit";

const patchSchema = z.object({
  // Cancelling is the only thing a buyer may do to their own order, so this is
  // an enum of one rather than the full status list.
  status: z.literal("cancelled"),
});

const cancels = slidingWindow({ limit: 10, windowMs: 60_000 });

/**
 * PATCH /api/shop/order/[token] — a guest cancels their own pending order.
 *
 * The same right an account holder has on /api/orders/[orderId]; the receipt
 * token stands in for the session. Without it a guest who ordered by mistake
 * would have no way out and the stock would stay reserved forever.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limit = cancels.check(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { token } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Only cancelling is available here" },
      { status: 400 },
    );
  }

  const db = getInstance();
  const [order] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);

  // Unknown token and account order answer alike — neither confirms to a prober
  // that a token is real.
  if (!order || order.userId !== null) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "Only pending orders can be cancelled" },
      { status: 400 },
    );
  }

  const updated = await setOrderStatus(order, "cancelled");
  return NextResponse.json({ success: true, data: { status: updated.status } });
}
