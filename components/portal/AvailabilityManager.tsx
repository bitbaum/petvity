"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { formatDateShort } from "@/lib/utils/format";
import { useTranslations } from "next-intl";
import { DateInput } from "@/components/ui/date-input";

/**
 * A professional's unavailable date ranges. Bookings that overlap any of these
 * are rejected by the booking API, so owners can only book free time.
 */

interface BlockedRange {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AvailabilityManager() {
  const t = useTranslations("portal");
  const [ranges, setRanges] = useState<BlockedRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then(({ success, data }) => {
        if (success) setRanges(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function addRange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, reason: reason.trim() || null }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (data?.success) {
      setRanges((prev) =>
        [...prev, data.data].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      );
      setReason("");
    } else {
      setError(data?.error ?? t("saveFailed"));
    }
  }

  async function removeRange(id: string) {
    setError("");
    const res = await fetch(`/api/availability/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRanges((prev) => prev.filter((r) => r.id !== id));
    } else {
      setError(t("deleteFailed"));
    }
  }

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="icon-tile bg-[var(--warn-bg)]">
          <CalendarOff className="w-4 h-4 text-[var(--warn-text)]" />
        </div>
        <h2 className="font-semibold text-[var(--ink)]">{t("availabilityTitle")}</h2>
      </div>
      <p className="text-sm text-[var(--muted)] mb-4">{t("availabilityDesc")}</p>

      {error && <p className="alert-error mb-4">{error}</p>}

      <form onSubmit={addRange} className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="form-label">{t("availabilityFrom")}</label>
          <DateInput
            type="date"
            className="form-input text-sm"
            value={startDate}
            min={today()}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) setEndDate(e.target.value);
            }}
            required
          />
        </div>
        <div>
          <label className="form-label">{t("availabilityUntil")}</label>
          <DateInput
            type="date"
            className="form-input text-sm"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="form-label">{t("availabilityReason")}</label>
          <input
            type="text"
            className="form-input text-sm"
            placeholder={t("availabilityReasonPlaceholder")}
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {t("availabilityAdd")}
        </button>
      </form>

      {loading ? (
        <div className="h-10 rounded-lg bg-[var(--off)] animate-pulse" />
      ) : ranges.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("availabilityEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {ranges.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {r.startDate === r.endDate
                    ? formatDateShort(r.startDate)
                    : `${formatDateShort(r.startDate)} – ${formatDateShort(r.endDate)}`}
                </p>
                {r.reason && <p className="text-xs text-[var(--muted)] truncate">{r.reason}</p>}
              </div>
              <button
                onClick={() => removeRange(r.id)}
                className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors flex-shrink-0"
                aria-label={t("availabilityRemove")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
