"use client";

import { useState, useEffect } from "react";
import { Plus, Package, Pencil, X, Eye, EyeOff } from "lucide-react";
import { PRODUCT_CATEGORY_OPTIONS, productCategoryLabel } from "@/lib/config/products";
import { ProductImageField } from "@/components/shop/ProductImageField";
import { formatPrice } from "@/lib/utils/format";
import PageHeader from "@/components/portal/PageHeader";
import { useProductEditor, type ProductRecord } from "@/hooks/use-product-editor";

// Sourced from lib/config/products — SSOT for category labels
const CATEGORIES = PRODUCT_CATEGORY_OPTIONS;

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ?platform=true creates a platform product (sellerId=null), not a user listing
  const editor = useProductEditor({
    createUrl: "/api/products?platform=true",
    invalidPriceMessage: "Enter a valid price.",
    saveFailedMessage: "Failed to save.",
    onSaved: (product, replacedId) =>
      setProducts((prev) =>
        replacedId ? prev.map((p) => (p.id === replacedId ? product : p)) : [product, ...prev],
      ),
  });
  const { showForm, editingId, form, field, saving, error, openAdd, openEdit, closeForm } = editor;

  useEffect(() => {
    // Admin fetches all products including inactive
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggleActive(product: ProductRecord) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.data : p)));
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        purpose="Every product in the shop, from any seller. Edit price and stock, or take a listing off sale."
        action={
          !showForm ? (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add product
            </button>
          ) : undefined
        }
      />

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6 border-2 border-[var(--teal-light)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="icon-tile bg-[var(--teal-light)]">
                <Package className="w-4 h-4 text-[var(--teal)]" />
              </div>
              <h2 className="font-semibold text-[var(--ink)]">
                {editingId ? "Edit product" : "New product"}
              </h2>
            </div>
            <button type="button" onClick={closeForm} className="btn-ghost p-1 rounded-lg">
              <X className="w-4 h-4 text-[var(--muted)]" />
            </button>
          </div>

          {error && <p className="alert-error mb-4">{error}</p>}

          <form onSubmit={editor.handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">
                Name <span className="text-[var(--danger-text)]">*</span>
              </label>
              <input
                className="form-input"
                required
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
                placeholder="e.g. Premium Salmon Dog Food"
              />
            </div>

            <div>
              <label className="form-label">
                Price ($) <span className="text-[var(--danger-text)]">*</span>
              </label>
              <input
                className="form-input"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.priceDollars}
                onChange={(e) => field("priceDollars", e.target.value)}
                placeholder="19.99"
              />
            </div>

            <div>
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => field("category", e.target.value)}
              >
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Stock{" "}
                <span className="text-[var(--muted)] font-normal ms-1">(blank = unlimited)</span>
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => field("stock", e.target.value)}
                placeholder="e.g. 100"
              />
            </div>

            <div>
              <ProductImageField
                value={form.imageUrl}
                onChange={(url) => field("imageUrl", url)}
                category={form.category}
                name={form.name}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                Description <span className="text-[var(--muted)] font-normal ms-1">(optional)</span>
              </label>
              <textarea
                className="form-input min-h-[80px] resize-y"
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                placeholder="Describe the product…"
              />
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update product" : "Save product"}
              </button>
              <button type="button" onClick={closeForm} className="btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="card h-48 animate-pulse bg-[var(--off)]" />
      ) : products.length === 0 ? (
        <div className="card py-16 text-center">
          <Package className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
          <p className="font-medium text-[var(--ink)] mb-1">No products yet</p>
          <p className="text-sm text-[var(--muted)]">Add your first product to open the shop.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--off)]">
              <tr>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  Product
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hidden sm:table-cell">
                  Category
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  Price
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hidden md:table-cell">
                  Stock
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  Status
                </th>
                <th className="py-3 px-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--off)] transition-colors"
                >
                  <td className="py-3 px-4">
                    <p className="font-medium text-[var(--ink)]">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-[var(--muted)] truncate max-w-[200px]">
                        {p.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)] hidden sm:table-cell">
                    {productCategoryLabel(p.category)}
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--ink2)]">
                    {formatPrice(p.priceCents)}
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)] hidden md:table-cell">
                    {p.stock != null ? p.stock : <span className="text-[var(--faint)]">∞</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.isActive
                          ? "bg-[var(--green-bg)] text-[var(--green-text)]"
                          : "bg-[var(--off)] text-[var(--muted)]"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg hover:bg-[var(--teal-light)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="p-1.5 rounded-lg hover:bg-[var(--off)] text-[var(--muted)] transition-colors"
                        title={p.isActive ? "Deactivate" : "Activate"}
                      >
                        {p.isActive ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
