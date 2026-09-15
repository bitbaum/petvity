"use client";

import { useState } from "react";

/**
 * The add/edit-a-product state machine, once.
 *
 * `/admin/products` and `/portal/my-products` look nothing alike — one is a table
 * with an inline panel, the other a grid with a modal, and only one of them is
 * translated — but underneath they ran the same 55 lines: the same form shape,
 * the same "blank means unlimited stock", the same dollars-to-cents rounding, the
 * same POST-or-PATCH decision, the same optimistic list update.
 *
 * That arithmetic is the part worth having in one place. `parseFloat * 100` is
 * where a product silently goes on sale for the wrong money, and it was written
 * twice.
 *
 * What the pages keep is what actually differs: their markup, their copy, and
 * where the list of products lives.
 */

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: string;
  stock: number | null;
  isActive: boolean;
}

export interface ProductFormState {
  name: string;
  description: string;
  priceDollars: string;
  imageUrl: string;
  category: string;
  stock: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  description: "",
  priceDollars: "",
  imageUrl: "",
  category: "other",
  stock: "",
};

export interface ProductEditorOptions {
  /**
   * Where a NEW product is posted. The admin page appends `?platform=true` to
   * create a platform product (no seller) rather than a user's listing — the one
   * behavioural difference between the two callers.
   */
  createUrl: string;
  invalidPriceMessage: string;
  saveFailedMessage: string;
  /**
   * The saved product, and the id it replaced — `null` when it is new. The page
   * owns its list, so the page decides how to fold the row in.
   */
  onSaved: (product: ProductRecord, replacedId: string | null) => void;
}

export function useProductEditor({
  createUrl,
  invalidPriceMessage,
  saveFailedMessage,
  onSaved,
}: ProductEditorOptions) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_PRODUCT_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(p: ProductRecord) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      priceDollars: (p.priceCents / 100).toFixed(2),
      imageUrl: p.imageUrl ?? "",
      category: p.category,
      stock: p.stock != null ? String(p.stock) : "",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_PRODUCT_FORM);
    setError("");
  }

  function field<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const priceCents = Math.round(parseFloat(form.priceDollars) * 100);
    if (!priceCents || priceCents <= 0) {
      setError(invalidPriceMessage);
      setSaving(false);
      return;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceCents,
      imageUrl: form.imageUrl.trim() || null,
      category: form.category,
      // Blank means unlimited, which is a null column rather than a zero.
      stock: form.stock !== "" ? parseInt(form.stock) : null,
    };

    const isEdit = editingId !== null;
    const res = await fetch(isEdit ? `/api/products/${editingId}` : createUrl, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      setError(data.error ?? saveFailedMessage);
      return;
    }

    onSaved(data.data as ProductRecord, editingId);
    closeForm();
  }

  return {
    showForm,
    editingId,
    form,
    field,
    saving,
    error,
    openAdd,
    openEdit,
    closeForm,
    handleSubmit,
  };
}
