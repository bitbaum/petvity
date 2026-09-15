"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { CalendarCheck, Clock, CheckCircle, XCircle, ChevronDown, Star, X } from "lucide-react";
import { BOOKING_STATUS_CONFIG } from "@/lib/config/orders";
import type { BookingStatusId } from "@/lib/config/orders";
import { formatIsoDate } from "@/lib/utils/format";
import { EmptyState, ErrorState } from "@/components/portal/PageState";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import HubTabs from "@/components/portal/HubTabs";
import PageHeader from "@/components/portal/PageHeader";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface BookingRow {
  id: string;
  petId: string;
  petName: string | null;
  ownerId: string;
  ownerName: string | null;
  professionalId: string;
  professionalRole: "veterinarian" | "pet_sitter" | "groomer";
  startDate: string;
  endDate: string;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  reviewId: string | null;
  createdAt: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

// Icons are UI-layer; labels/colors sourced from lib/config/orders SSOT
const STATUS_ICONS: Record<BookingStatusId, React.ElementType> = {
  pending: Clock,
  confirmed: CheckCircle,
  cancelled: XCircle,
  completed: CheckCircle,
};

function StatusBadge({ status }: { status: BookingRow["status"] }) {
  const t = useTranslations("portal");
  const cfg = BOOKING_STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`badge ${cfg.badge}`}>
      <Icon className="w-3 h-3" />
      {t(`bookingStatus_${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function BookingsPage() {
  const { data: session } = useSession();
  const t = useTranslations("portal");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<BookingRow | null>(null);
  const [, startTransition] = useTransition();

  const loadBookings = useCallback(() => {
    setLoading(true);
    setFetchError("");
    fetch("/api/bookings")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data }) => {
        setBookings(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("loadFailed"));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function load() {
    const res = await fetch("/api/bookings");
    if (res.ok) {
      const { data } = await res.json();
      setBookings(data ?? []);
    }
  }

  async function updateStatus(bookingId: string, status: BookingRow["status"]) {
    setMutationError("");
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) startTransition(() => load());
    else setMutationError(t("loadFailed"));
  }

  async function deleteBooking(bookingId: string) {
    setMutationError("");
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    if (res.ok) startTransition(() => load());
    else setMutationError(t("loadFailed"));
  }

  const upcoming = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const past = bookings.filter((b) => b.status === "cancelled" || b.status === "completed");

  return (
    <div>
      <HubTabs
        tabs={[
          { href: "/portal/find", label: t("findAPro") },
          { href: "/portal/bookings", label: t("bookings") },
        ]}
      />
      <PageHeader title={t("bookings")} purpose={t("bookingsSubtitle")} />

      {mutationError && <div className="alert-error mb-4">{mutationError}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={loadBookings} retryLabel={t("retry")} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={t("bookingsEmpty")}
          body={t("bookingsEmptyDesc")}
          cta={{ label: t("bookingsFindPro"), href: "/portal/find" }}
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                {t("bookingsUpcoming")}
              </h2>
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard
                    viewerId={session?.user?.id}
                    key={b.id}
                    booking={b}
                    onUpdateStatus={updateStatus}
                    onDelete={deleteBooking}
                    onReview={setReviewTarget}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                {t("bookingsPast")}
              </h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingCard
                    viewerId={session?.user?.id}
                    key={b.id}
                    booking={b}
                    onUpdateStatus={updateStatus}
                    onDelete={deleteBooking}
                    onReview={setReviewTarget}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewTarget(null);
            startTransition(() => load());
          }}
        />
      )}
    </div>
  );
}

function BookingCard({
  booking: b,
  onUpdateStatus,
  onDelete,
  onReview,
  viewerId,
}: {
  booking: BookingRow;
  onUpdateStatus: (id: string, status: BookingRow["status"]) => void;
  onDelete: (id: string) => void;
  onReview: (b: BookingRow) => void;
  viewerId?: string;
}) {
  const t = useTranslations("portal");
  const [actionsOpen, setActionsOpen] = useState(false);
  const isProfessionalView = viewerId != null && b.professionalId === viewerId;
  const roleLabel = t(`role_${b.professionalRole}` as Parameters<typeof t>[0]);
  const canReview = b.status === "completed" && !b.reviewId;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-[var(--ink)]">
              {b.petName ?? t("petFallback")} · {roleLabel}
            </p>
            <StatusBadge status={b.status} />
            {b.reviewId && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-light)] text-[var(--teal)]">
                <Star className="w-3 h-3 fill-current" />
                {t("bookingsReviewed")}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--muted)]">
            {formatIsoDate(b.startDate)}
            {b.startDate !== b.endDate && ` – ${formatIsoDate(b.endDate)}`}
          </p>
          {b.ownerName && (
            <p className="text-sm text-[var(--ink2)] mt-0.5">
              {t("bookingsOwner", { name: b.ownerName })}
            </p>
          )}
          {b.notes && <p className="text-sm text-[var(--muted)] mt-1.5 line-clamp-2">{b.notes}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* A pro's most common action is accepting a request — a button,
              not an item hidden inside a dropdown. */}
          {isProfessionalView && b.status === "pending" && (
            <button
              onClick={() => onUpdateStatus(b.id, "confirmed")}
              className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {t("bookingsAccept")}
            </button>
          )}
          {canReview && (
            <button
              onClick={() => onReview(b)}
              className="btn-outline text-sm flex items-center gap-1.5 px-3 py-1.5"
            >
              <Star className="w-3.5 h-3.5" />
              {t("bookingsReview")}
            </button>
          )}

          {(b.status === "pending" || b.status === "confirmed") && (
            <div className="relative">
              <button
                onClick={() => setActionsOpen((o) => !o)}
                className="btn-outline text-sm flex items-center gap-1.5 px-3 py-1.5"
              >
                {t("bookingsActions")} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {actionsOpen && (
                <div className="absolute end-0 top-full mt-1 w-44 bg-white border border-[var(--border)] rounded-xl shadow-lg z-10 py-1">
                  {b.status === "pending" && (
                    <button
                      className="w-full text-start px-3 py-2 text-sm text-[var(--green-text)] hover:bg-[var(--green-bg)] transition-colors"
                      onClick={() => {
                        setActionsOpen(false);
                        onUpdateStatus(b.id, "confirmed");
                      }}
                    >
                      {t("bookingsConfirm")}
                    </button>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      className="w-full text-start px-3 py-2 text-sm text-[var(--teal)] hover:bg-[var(--teal-light)] transition-colors"
                      onClick={() => {
                        setActionsOpen(false);
                        onUpdateStatus(b.id, "completed");
                      }}
                    >
                      {t("bookingsMarkCompleted")}
                    </button>
                  )}
                  <button
                    className="w-full text-start px-3 py-2 text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors"
                    onClick={() => {
                      setActionsOpen(false);
                      onUpdateStatus(b.id, "cancelled");
                    }}
                  >
                    {t("bookingsCancel")}
                  </button>
                  {b.status === "pending" && (
                    <button
                      className="w-full text-start px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--off)] transition-colors"
                      onClick={() => {
                        setActionsOpen(false);
                        onDelete(b.id);
                      }}
                    >
                      {t("listDelete")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Review Modal ───────────────────────────────────────────────────────── */

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-[var(--warn-text)] transition-transform hover:scale-110"
        >
          <Star className="w-7 h-7" fill={(hover || value) >= n ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function ReviewModal({
  booking: b,
  onClose,
  onSubmitted,
}: {
  booking: BookingRow;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const t = useTranslations("portal");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError(t("bookingsRatingRequired"));
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: b.id, rating, comment: comment.trim() || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) onSubmitted();
    else setError(data.error ?? t("bookingsReviewFailed"));
  }

  const roleLabel = t(`role_${b.professionalRole}` as Parameters<typeof t>[0]);

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold text-[var(--ink)]">{t("bookingsLeaveReview")}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {b.petName ?? t("petFallback")} · {roleLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <p className="alert-error">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-[var(--ink2)] mb-2">
              {t("bookingsRatingLabel")} *
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="form-label">{t("bookingsCommentLabel")}</label>
            <textarea
              className="form-input min-h-[88px] resize-none"
              placeholder={t("bookingsCommentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3 pb-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || rating === 0}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {saving ? t("bookingsSubmitting") : t("bookingsSubmitReview")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
