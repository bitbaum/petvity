"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Minus,
  Package,
  ShoppingBag,
  X,
  Store,
  BadgeCheck,
  Search,
} from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import { APP } from "@/lib/config/app";
import { EmptyState, ErrorState } from "@/components/portal/PageState";
import { ProductArt } from "@/components/shop/ProductArt";
import {
  PRODUCT_SORT_OPTIONS,
  DEFAULT_PRODUCT_SORT,
  type ProductSortId,
} from "@/lib/config/products";
import { useTranslations } from "next-intl";
import HubTabs from "@/components/portal/HubTabs";
import PageHeader from "@/components/portal/PageHeader";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: string;
  stock: number | null;
  sellerId: string | null;
  sellerName: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Shipping {
  shippingName: string;
  shippingLine1: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPhone: string;
}

const EMPTY_SHIPPING: Shipping = {
  shippingName: "",
  shippingLine1: "",
  shippingPostalCode: "",
  shippingCity: "",
  shippingCountry: "",
  shippingPhone: "",
};

/* ─── Cart ───────────────────────────────────────────────────────────────── */

function CartDrawer({
  cart,
  onClose,
  onQty,
  onRemove,
  onPlace,
  placing,
  notes,
  onNotes,
  ship,
  onShip,
  success,
  error,
}: {
  cart: CartItem[];
  onClose: () => void;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onPlace: () => void;
  placing: boolean;
  notes: string;
  onNotes: (v: string) => void;
  ship: Shipping;
  onShip: (patch: Partial<Shipping>) => void;
  success: boolean;
  error: string;
}) {
  const t = useTranslations("portal");
  const total = cart.reduce((s, i) => s + i.product.priceCents * i.quantity, 0);
  const shipReady =
    ship.shippingName.trim() &&
    ship.shippingLine1.trim() &&
    ship.shippingPostalCode.trim() &&
    ship.shippingCity.trim() &&
    ship.shippingCountry.trim().length === 2;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--ink)]">
            {t("shopCartTitle", { count: cart.length })}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--green-bg)] flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-[var(--green-text)]" />
            </div>
            <p className="font-semibold text-[var(--ink)] mb-1">{t("shopOrderPlaced")}</p>
            <p className="text-sm text-[var(--muted)] mb-5">{t("shopOrderPlacedDesc")}</p>
            <Link href="/portal/orders" onClick={onClose} className="btn-primary">
              {t("shopViewOrders")}
            </Link>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <ShoppingCart className="w-12 h-12 text-[var(--faint)] mb-3" />
            <p className="text-sm text-[var(--muted)]">{t("shopCartEmpty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--off)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <ProductArt
                      imageUrl={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] leading-snug">
                      {product.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {t("shopEach", { price: formatPrice(product.priceCents) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onQty(product.id, -1)}
                      className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                    <button
                      onClick={() => onQty(product.id, +1)}
                      className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemove(product.id)}
                      className="ms-1 p-2 hover:text-[var(--danger-text)] text-[var(--muted)] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-[var(--border)] space-y-3">
              <p className="text-sm font-semibold text-[var(--ink)]">{t("shopDeliveryTitle")}</p>
              <input
                className="form-input text-sm"
                placeholder={t("shopShipName")}
                autoComplete="name"
                value={ship.shippingName}
                onChange={(e) => onShip({ shippingName: e.target.value })}
              />
              <input
                className="form-input text-sm"
                placeholder={t("shopShipAddress")}
                autoComplete="street-address"
                value={ship.shippingLine1}
                onChange={(e) => onShip({ shippingLine1: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="form-input text-sm"
                  placeholder={t("shopShipPostal")}
                  autoComplete="postal-code"
                  value={ship.shippingPostalCode}
                  onChange={(e) => onShip({ shippingPostalCode: e.target.value })}
                />
                <input
                  className="form-input text-sm col-span-2"
                  placeholder={t("shopShipCity")}
                  autoComplete="address-level2"
                  value={ship.shippingCity}
                  onChange={(e) => onShip({ shippingCity: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="form-input text-sm uppercase"
                  placeholder={t("shopShipCountry")}
                  autoComplete="country"
                  maxLength={2}
                  value={ship.shippingCountry}
                  onChange={(e) => onShip({ shippingCountry: e.target.value })}
                />
                <input
                  className="form-input text-sm col-span-2"
                  placeholder={t("shopShipPhone")}
                  autoComplete="tel"
                  value={ship.shippingPhone}
                  onChange={(e) => onShip({ shippingPhone: e.target.value })}
                />
              </div>
              <textarea
                className="form-input min-h-[60px] resize-none text-sm"
                placeholder={t("shopOrderNotes")}
                value={notes}
                onChange={(e) => onNotes(e.target.value)}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted)]">{t("shopTotal")}</span>
                <span className="font-semibold text-[var(--ink)]">{formatPrice(total)}</span>
              </div>
              {error && <p className="alert-error text-sm">{error}</p>}
              <button
                onClick={onPlace}
                disabled={placing || !shipReady}
                className="btn-primary w-full disabled:opacity-60"
              >
                {placing ? t("shopPlacingOrder") : t("shopPlaceOrder")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ShopPage() {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProductSortId>(DEFAULT_PRODUCT_SORT);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [notes, setNotes] = useState("");
  const [ship, setShip] = useState<Shipping>(EMPTY_SHIPPING);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(() => {
    setLoading(true);
    setFetchError("");
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("shopLoadFailed"));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  // The full catalogue is already in memory, so search and sort are applied
  // here rather than round-tripping to the API — results appear as you type.
  const needle = query.trim().toLowerCase();
  const filtered = products
    .filter((p) => activeCategory === "all" || p.category === activeCategory)
    .filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle),
    )
    .sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.priceCents - b.priceCents;
        case "price_desc":
          return b.priceCents - a.priceCents;
        case "name":
          return a.name.localeCompare(b.name);
        // The API already returns newest first; keep that order.
        default:
          return 0;
      }
    });

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [...prev, { product, quantity: 1 }];
    });
  }

  function adjustQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  async function placeOrder() {
    setError("");
    setPlacing(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        notes: notes.trim() || undefined,
        shippingName: ship.shippingName.trim(),
        shippingLine1: ship.shippingLine1.trim(),
        shippingPostalCode: ship.shippingPostalCode.trim(),
        shippingCity: ship.shippingCity.trim(),
        shippingCountry: ship.shippingCountry.trim().toUpperCase(),
        shippingPhone: ship.shippingPhone.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setCart([]);
      setNotes("");
      if (data.data?.checkoutUrl) {
        // Payments enabled — hand off to Stripe Checkout (leave `placing` on
        // so the button stays disabled during the redirect).
        window.location.href = data.data.checkoutUrl;
        return;
      }
      setPlacing(false);
      setSuccess(true);
    } else {
      setPlacing(false);
      setError(data.error ?? t("shopOrderFailed"));
    }
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <HubTabs
        tabs={[
          { href: "/portal/shop", label: t("shop") },
          { href: "/portal/orders", label: t("orders") },
        ]}
      />
      <PageHeader
        title={t("shop")}
        purpose={t("shopSubtitle")}
        action={
          <button
            onClick={() => {
              setSuccess(false);
              setCartOpen(true);
            }}
            className="relative btn-outline flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {t("shopCartLabel")}
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        }
      />

      {/* Search + sort */}
      {!loading && products.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--muted)] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tPub("shopSearchPlaceholder")}
              aria-label={tPub("shopSearchPlaceholder")}
              className="form-input form-input-icon"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-[var(--muted)] flex-shrink-0">
              {tPub("shopSortLabel")}
            </span>
            {PRODUCT_SORT_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setSort(o.id)}
                className={`flex-shrink-0 text-sm px-2.5 py-1 rounded-lg transition-colors ${
                  sort === o.id
                    ? "bg-[var(--teal-light)] text-[var(--teal)] font-medium"
                    : "text-[var(--ink2)] hover:bg-[var(--light)]"
                }`}
              >
                {tPub(o.labelKey as Parameters<typeof tPub>[0])}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {!loading && products.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === cat
                  ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                  : "border-[var(--border)] text-[var(--ink2)] hover:border-[var(--teal)] hover:text-[var(--teal)]"
              }`}
            >
              {cat === "all" ? t("shopAll") : tPub(`cat_${cat}` as Parameters<typeof tPub>[0])}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-56 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={loadProducts} retryLabel={t("shopRetry")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("shopEmpty")}
          body={t("shopEmptyDesc")}
          actions={
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/portal/dashboard" className="btn-primary text-sm">
                {t("shopGoToDashboard")}
              </Link>
              <Link href="/portal/find" className="btn-outline text-sm">
                {t("shopFindPro")}
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const inCart = cart.find((i) => i.product.id === product.id);
            const outOfStock = product.stock !== null && product.stock === 0;
            return (
              <div key={product.id} className="card overflow-hidden flex flex-col">
                <div className="h-36 bg-[var(--off)] flex items-center justify-center">
                  <ProductArt
                    imageUrl={product.imageUrl}
                    alt={product.name}
                    category={product.category}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <span className="text-xs text-[var(--muted)] mb-0.5">
                    {tPub(`cat_${product.category}` as Parameters<typeof tPub>[0])}
                  </span>
                  <p className="font-medium text-[var(--ink)] text-sm leading-snug mb-1">
                    {product.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-[var(--muted)] mb-1 flex-1">
                    {product.sellerId ? (
                      <Store className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <BadgeCheck className="w-3 h-3 text-[var(--teal)] flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {product.sellerId
                        ? (product.sellerName ?? t("shopSellerFallback"))
                        : APP.name}
                    </span>
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="font-semibold text-[var(--accent)]">
                      {formatPrice(product.priceCents)}
                    </span>
                    {outOfStock ? (
                      <span className="text-xs text-[var(--muted)]">{t("shopOutOfStock")}</span>
                    ) : inCart ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustQty(product.id, -1)}
                          className="w-8 h-8 rounded-full bg-[var(--teal-light)] text-[var(--teal)] flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-medium">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => adjustQty(product.id, +1)}
                          className="w-8 h-8 rounded-full bg-[var(--teal-light)] text-[var(--teal)] flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="text-xs px-2 py-1 rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] transition-colors"
                      >
                        {t("shopAdd")}
                      </button>
                    )}
                  </div>
                  {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                    <p className="text-xs text-[var(--warn-text)] mt-1">
                      {t("shopOnlyLeft", { count: product.stock })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => {
            setCartOpen(false);
            setError("");
          }}
          onQty={adjustQty}
          onRemove={removeFromCart}
          onPlace={placeOrder}
          placing={placing}
          notes={notes}
          ship={ship}
          onShip={(patch) => setShip((s) => ({ ...s, ...patch }))}
          onNotes={setNotes}
          success={success}
          error={error}
        />
      )}
    </div>
  );
}
