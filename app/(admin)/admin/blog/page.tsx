"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, X, Eye, EyeOff, Trash2, ExternalLink, FileText } from "lucide-react";
import PageHeader from "@/components/portal/PageHeader";
import { readingTime } from "bip-kit";
import "bip-kit/styles.css";
import "@/app/longform.css";
import { slugify, SLUG_PATTERN } from "@/lib/domain/blog";
import { parseLongform } from "@/lib/domain/longform";
import LongformPreview from "./LongformPreview";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
}

interface FormState {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
}

const EMPTY_FORM: FormState = { slug: "", title: "", excerpt: "", body: "" };

const FORMAT_HINT = [
  "## Subheading · - bullet · 1. numbered · > quote · > [!TIP] callout",
  "![alt](url) image · ``` code fence · | tables | · $$math$$ · [^1] footnotes",
  "Anything else is a paragraph. Blank line = new block. Markdown, no raw HTML.",
].join("\n");

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // The slug is a permanent URL, so it stops tracking the title as soon as the
  // author types one — renaming a published post must never silently move it.
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Two-step delete rather than a confirm() dialog: deleting a published post
  // breaks its public URL, and a browser dialog is both easy to click through
  // and impossible to drive from a test.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/blog");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPosts(data.data);
    } catch {
      setFetchError("Could not load posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Post) {
    setEditingId(p.id);
    setForm({ slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body });
    setSlugTouched(true);
    setError("");
    setShowForm(true);
  }

  function setTitle(title: string) {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!SLUG_PATTERN.test(form.slug)) {
      setError("The URL may only contain lowercase letters, numbers and hyphens.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/admin/blog/${editingId}` : "/api/admin/blog", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setShowForm(false);
      await load();
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(p: Post, status: Post["status"]) {
    await fetch(`/api/admin/blog/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    await load();
  }

  const preview = parseLongform(form.body);

  return (
    <div>
      <PageHeader
        title="Blog"
        purpose="Write and publish posts. Published posts appear at /blog straight away — no deploy needed."
        action={
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New post
          </button>
        }
      />

      {/* Editor */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={save} className="card p-6 w-full max-w-3xl my-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--ink)]">
                {editingId ? "Edit post" : "New post"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-ghost p-2 rounded-lg"
              >
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>

            <div>
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div>
              <label className="form-label">
                URL{" "}
                <span className="text-[var(--muted)] font-normal ms-1">
                  /blog/{form.slug || "…"}
                </span>
              </label>
              <input
                className="form-input"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                required
                maxLength={200}
              />
              {editingId && (
                <p className="text-xs text-[var(--warn-text)] mt-1">
                  Changing this breaks any existing link to the post.
                </p>
              )}
            </div>

            <div>
              <label className="form-label">
                Excerpt{" "}
                <span className="text-[var(--muted)] font-normal ms-1">
                  — shown on the index and in search results
                </span>
              </label>
              <textarea
                className="form-input min-h-[70px] resize-y"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                required
                maxLength={500}
              />
              <p className="text-xs text-[var(--muted)] mt-1">{form.excerpt.length}/500</p>
            </div>

            <div>
              <label className="form-label">Body</label>
              <textarea
                className="form-input min-h-[280px] resize-y font-mono text-sm"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
                placeholder={FORMAT_HINT}
              />
              <p className="text-xs text-[var(--muted)] mt-1 whitespace-pre-line">{FORMAT_HINT}</p>
            </div>

            {/* Live preview — the same parse + reference renderer as the
                public post page, so a mistyped bullet (or callout, table,
                fence…) is visible before publishing. */}
            {form.body.trim() && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--off)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)] mb-3">
                  Preview · {preview.length} blocks · {readingTime(preview).minutes} min read
                </p>
                <div className="max-h-64 overflow-y-auto">
                  <LongformPreview blocks={preview} />
                </div>
              </div>
            )}

            {error && <p className="alert-error">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : editingId ? "Save changes" : "Create draft"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="card p-8 text-center text-[var(--muted)]">Loading…</div>
      ) : fetchError ? (
        <div className="card p-8 text-center">
          <p className="text-[var(--danger-text)] mb-3">{fetchError}</p>
          <button onClick={load} className="btn-outline">
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
          <p className="font-medium text-[var(--ink)] mb-1">No posts yet</p>
          <p className="text-sm text-[var(--muted)] mb-5">
            Write the first one — it goes live the moment you publish it.
          </p>
          <button onClick={openNew} className="btn-primary">
            New post
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div key={p.id} className="card p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-[var(--ink)]">{p.title}</span>
                  <span className={p.status === "published" ? "signal-healthy" : "signal-watch"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] line-clamp-2">{p.excerpt}</p>
                <p className="text-xs text-[var(--faint)] mt-1">/blog/{p.slug}</p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {p.status === "published" && (
                  <a
                    href={`/en/blog/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost p-2 rounded-lg"
                    title="View"
                  >
                    <ExternalLink className="w-4 h-4 text-[var(--muted)]" />
                  </a>
                )}
                <button
                  onClick={() => setStatus(p, p.status === "published" ? "draft" : "published")}
                  className="btn-ghost p-2 rounded-lg"
                  title={p.status === "published" ? "Unpublish" : "Publish"}
                >
                  {p.status === "published" ? (
                    <EyeOff className="w-4 h-4 text-[var(--muted)]" />
                  ) : (
                    <Eye className="w-4 h-4 text-[var(--teal)]" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="btn-ghost p-2 rounded-lg"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4 text-[var(--muted)]" />
                </button>
                {confirmDelete === p.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => remove(p.id)}
                      className="text-xs font-medium px-2 py-1.5 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)]"
                    >
                      Delete for good
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="btn-ghost text-xs px-2 py-1.5"
                    >
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="btn-ghost p-2 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-[var(--muted)]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
