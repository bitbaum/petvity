"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from "lucide-react";
import { ProductArt } from "@/components/shop/ProductArt";
import { ORDER_STATUS_CONFIG } from "@/lib/config/orders";
import type { OrderStatusId } from "@/lib/config/orders";
import { formatPrice, formatIsoDate } from "@/lib/utils/format";
import { EmptyState, ErrorState } from "@/components/portal/PageState";
import { useTranslations } from "next-intl";
import HubTabs from "@/components/portal/HubTabs";
import PageHeader from "@/components/portal/PageHeader";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  priceCents: number;
  productName: string;
  productImageUrl: string | null;
  productCategory: string;
}

interface Order {
  id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  totalCents: number;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

// Icons are UI-layer; labels/colors sourced from lib/config/orders SSOT
const STATUS_ICONS: Record<OrderStatusId, React.ElementType> = {
  pending: Clock,
  confirmed: CheckCircle,
  shipped: Truck,
  delivered: ShoppingBag,
  cancelled: XCircle,
};

/* ─── Order Card ─────────────────────────────────────────────────────────── */

function OrderCard({
  order,
  paymentsEnabled,
  onCancel,
}: {
  order: Order;
  paymentsEnabled: boolean;
  onCancel: (id: string) => void;
}) {
  const t = useTranslations("portal");
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const cfg = ORDER_STATUS_CONFIG[order.status];
  const Icon = STATUS_ICONS[order.status];
  const awaitingPayment = paymentsEnabled && !order.paidAt && order.status !== "cancelled";

  async function handleCancel() {
    setCancelling(true);
    await onCancel(order.id);
    setCancelling(false);
  }

  async function handlePay() {
    setPayError("");
    setPaying(true);
    const res = await fetch(`/api/orders/${order.id}/pay`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (data?.success && data.data?.checkoutUrl) {
      window.location.href = data.data.checkoutUrl;
      return;
    }
    setPaying(false);
    setPayError(data?.error ?? t("loadFailed"));
  }

  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--off)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="icon-tile icon-tile-lg bg-[var(--teal-light)]">
            <ShoppingBag className="w-5 h-5 text-[var(--teal)]" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[var(--ink)] text-sm">
              {t("ordersOrderLabel")} · {formatIsoDate(order.createdAt)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {t("ordersItemCount", { count: order.items.length })} ·{" "}
              {formatPrice(order.totalCents)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {order.paidAt && (
            <span className="badge badge-green">
              <CreditCard className="w-3 h-3" />
              {t("ordersPaid")}
            </span>
          )}
          {awaitingPayment && (
            <span className="badge badge-warn">
              <Clock className="w-3 h-3" />
              {t("ordersAwaitingPayment")}
            </span>
          )}
          <span className={`badge ${cfg.badge}`}>
            <Icon className="w-3 h-3" />
            {t(`orderStatus_${order.status}` as Parameters<typeof t>[0])}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--off)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                <ProductArt
                  imageUrl={item.productImageUrl}
                  alt={item.productName}
                  category={item.productCategory}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--ink)]">{item.productName}</p>
                <p className="text-xs text-[var(--muted)]">
                  {item.quantity} × {formatPrice(item.priceCents)}
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--ink2)] flex-shrink-0">
                {formatPrice(item.priceCents * item.quantity)}
              </span>
            </div>
          ))}

          {order.notes && (
            <p className="text-xs text-[var(--muted)] pt-1 border-t border-[var(--border)]">
              {t("ordersNote", { text: order.notes })}
            </p>
          )}

          {payError && <p className="alert-error text-xs">{payError}</p>}

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--ink)]">
              {t("ordersTotal", { price: formatPrice(order.totalCents) })}
            </span>
            <div className="flex items-center gap-3">
              {awaitingPayment && (
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {paying ? t("ordersPayingNow") : t("ordersPayNow")}
                </button>
              )}
              {order.status === "pending" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xs text-[var(--danger-text)] hover:underline disabled:opacity-60"
                >
                  {cancelling ? t("ordersCancelling") : t("ordersCancelOrder")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function OrdersPage() {
  const t = useTranslations("portal");
  // Read once on mount (avoids the useSearchParams Suspense requirement)
  const [paymentReturn, setPaymentReturn] = useState<string | null>(null);
  useEffect(() => {
    setPaymentReturn(new URLSearchParams(window.location.search).get("payment"));
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [cancelError, setCancelError] = useState("");

  const loadOrders = useCallback(() => {
    setLoading(true);
    setFetchError("");
    fetch("/api/orders")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data, meta }) => {
        setOrders(data ?? []);
        setPaymentsEnabled(Boolean(meta?.paymentsEnabled));
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("loadFailed"));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function cancelOrder(orderId: string) {
    setCancelError("");
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
    } else {
      setCancelError(t("deleteFailed"));
    }
  }

  return (
    <div>
      <HubTabs
        tabs={[
          { href: "/portal/shop", label: t("shop") },
          { href: "/portal/orders", label: t("orders") },
        ]}
      />
      <PageHeader
        title={t("orders")}
        purpose={t("ordersSubtitle")}
        action={
          <Link href="/portal/shop" className="btn-outline flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            {t("shop")}
          </Link>
        }
      />

      {paymentReturn === "success" && (
        <p className="alert-success mb-4">{t("ordersPaymentSuccess")}</p>
      )}
      {paymentReturn === "cancelled" && (
        <p className="alert-error mb-4">{t("ordersPaymentCancelled")}</p>
      )}
      {cancelError && <p className="alert-error mb-4">{cancelError}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={loadOrders} retryLabel={t("retry")} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={t("ordersEmpty")}
          body={t("ordersEmptyDesc")}
          cta={{ label: t("ordersBrowseShop"), href: "/portal/shop" }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              paymentsEnabled={paymentsEnabled}
              onCancel={cancelOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
