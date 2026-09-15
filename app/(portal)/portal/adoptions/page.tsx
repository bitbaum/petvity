"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Heart, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { SPECIES_CONFIG } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import { LISTING_STATUS_CONFIG, APPLICATION_STATUS_CONFIG } from "@/lib/config/adoptions";
import { formatAdoptionFee } from "@/lib/utils/format";
import { EmptyState, ErrorState } from "@/components/portal/PageState";
import { useTranslations } from "next-intl";
import HubTabs from "@/components/portal/HubTabs";
import PageHeader from "@/components/portal/PageHeader";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Application {
  id: string;
  listingId: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  message: string | null;
  experience: string | null;
  housingType: string | null;
  createdAt: string;
  applicant: { id: string; name: string | null; email: string };
}

interface AdoptionListing {
  id: string;
  title: string;
  status: "available" | "on_hold" | "adopted" | "withdrawn";
  feeCents: number | null;
  location: string | null;
  createdAt: string;
  pet: { id: string; name: string; species: string; avatarUrl: string | null };
}

// Labels/colors sourced from lib/config/adoptions SSOT; className = bg + color combined

/* ─── Application row ─────────────────────────────────────────────────────── */

function ApplicationRow({
  app,
  listingId,
  onUpdate,
  onApproved,
}: {
  app: Application;
  listingId: string;
  onUpdate: (updated: Application) => void;
  /** Called when this application is approved so the listing card can sync state. */
  onApproved?: () => void;
}) {
  const t = useTranslations("portal");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function setStatus(status: Application["status"]) {
    setBusy(true);
    setActionError("");
    const res = await fetch(`/api/adoptions/${listingId}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: app.id, status }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.success) {
      setActionError(data.error ?? t("loadFailed"));
      return;
    }
    onUpdate({ ...app, status });
    if (status === "approved") onApproved?.();
  }

  const badge = APPLICATION_STATUS_CONFIG[app.status] ?? APPLICATION_STATUS_CONFIG.pending;

  return (
    <div className="py-3 px-4 border-t border-[var(--border)] first:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--ink)] truncate">
            {app.applicant.name ?? app.applicant.email}
          </p>
          <p className="text-xs text-[var(--muted)]">{app.applicant.email}</p>
          {app.housingType && (
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t(`housingType_${app.housingType}` as Parameters<typeof t>[0])}
            </p>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badge.className}`}
        >
          {t(`appStatus_${app.status}` as Parameters<typeof t>[0])}
        </span>
      </div>
      {app.message && (
        <p className="text-sm text-[var(--ink2)] mt-2 leading-relaxed">{app.message}</p>
      )}
      {app.experience && (
        <p className="text-xs text-[var(--muted)] mt-1 italic">{app.experience}</p>
      )}
      {app.status === "pending" && (
        <div className="mt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("approved")}
              disabled={busy}
              className="text-xs font-medium text-[var(--green-text)] hover:underline disabled:opacity-60 flex items-center gap-1"
            >
              {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              {t("adoptionsApprove")}
            </button>
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy}
              className="text-xs font-medium text-[var(--danger-text)] hover:underline disabled:opacity-60 flex items-center gap-1"
            >
              <XCircle className="w-3 h-3" />
              {t("adoptionsReject")}
            </button>
          </div>
          {actionError && <p className="text-xs text-[var(--danger-text)] mt-1">{actionError}</p>}
        </div>
      )}
      {app.status === "approved" && (
        <a
          href={`mailto:${app.applicant.email}`}
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[var(--teal)] hover:text-[var(--teal-dark)] no-underline"
        >
          <Mail className="w-3 h-3" />
          {t("adoptionsEmailApplicant")}
        </a>
      )}
    </div>
  );
}

/* ─── Listing card ────────────────────────────────────────────────────────── */

function ListingCard({
  listing,
  onStatusChange,
}: {
  listing: AdoptionListing;
  onStatusChange: (id: string, status: AdoptionListing["status"]) => void;
}) {
  const t = useTranslations("portal");
  const [expanded, setExpanded] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState("");

  async function loadApps() {
    if (appsLoaded) return;
    setAppsLoading(true);
    const res = await fetch(`/api/adoptions/${listing.id}/applications`);
    const data = await res.json();
    setApplications(data.data ?? []);
    setAppsLoading(false);
    setAppsLoaded(true);
  }

  function toggle() {
    if (!expanded) loadApps();
    setExpanded((v) => !v);
  }

  async function setStatus(status: AdoptionListing["status"]) {
    setBusy(true);
    setStatusError("");
    const res = await fetch(`/api/adoptions/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.success) onStatusChange(listing.id, status);
    else setStatusError(data.error ?? t("loadFailed"));
  }

  /** Called when an application is approved — sync local state without refetch. */
  function handleApplicationApproved(approvedId: string) {
    onStatusChange(listing.id, "adopted");
    setApplications((prev) =>
      prev.map((a) =>
        a.id === approvedId
          ? a // already updated by onUpdate
          : a.status === "pending"
            ? { ...a, status: "rejected" }
            : a,
      ),
    );
  }

  const badge = LISTING_STATUS_CONFIG[listing.status] ?? LISTING_STATUS_CONFIG.available;
  const emoji = SPECIES_CONFIG[listing.pet.species as SpeciesId]?.emoji ?? "🐾";

  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--off)] transition-colors"
        onClick={toggle}
      >
        {/* Pet avatar */}
        <div className="w-12 h-12 rounded-xl bg-[var(--teal-light)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          {listing.pet.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.pet.avatarUrl}
              alt={listing.pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{emoji}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--ink)] truncate">{listing.title}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {listing.pet.name}
            {listing.location ? ` · ${listing.location}` : ""}
            {listing.feeCents
              ? ` · ${t("adoptFee", { price: formatAdoptionFee(listing.feeCents) })}`
              : ` · ${t("adoptFree")}`}
          </p>
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
            {t(`listingStatus_${listing.status}` as Parameters<typeof t>[0])}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)]">
          {/* Listing actions */}
          <div className="flex flex-wrap gap-2 px-4 py-3 bg-[var(--off)]">
            <Link
              href={`/portal/adopt/${listing.id}`}
              className="text-xs font-medium text-[var(--teal)] hover:underline"
            >
              {t("adoptionsViewListing")}
            </Link>
            {listing.status === "available" && (
              <>
                <button
                  onClick={() => setStatus("on_hold")}
                  disabled={busy}
                  className="text-xs font-medium text-[var(--warn-text)] hover:underline disabled:opacity-60"
                >
                  {t("adoptionsMarkOnHold")}
                </button>
                <button
                  onClick={() => setStatus("adopted")}
                  disabled={busy}
                  className="text-xs font-medium text-[var(--green-text)] hover:underline disabled:opacity-60"
                >
                  {t("adoptionsMarkAdopted")}
                </button>
              </>
            )}
            {listing.status === "on_hold" && (
              <button
                onClick={() => setStatus("available")}
                disabled={busy}
                className="text-xs font-medium text-[var(--teal)] hover:underline disabled:opacity-60"
              >
                {t("adoptionsReopen")}
              </button>
            )}
            {(listing.status === "available" || listing.status === "on_hold") && (
              <button
                onClick={() => setStatus("withdrawn")}
                disabled={busy}
                className="text-xs font-medium text-[var(--danger-text)] hover:underline disabled:opacity-60"
              >
                {t("adoptionsWithdraw")}
              </button>
            )}
            {statusError && (
              <p className="text-xs text-[var(--danger-text)] px-4 pb-2">{statusError}</p>
            )}
          </div>

          {/* Applications */}
          <div>
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide px-4 py-2">
              {t("adoptionsApplications")}
            </p>
            {appsLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--muted)]">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
              </div>
            ) : applications.length === 0 ? (
              <p className="text-sm text-[var(--muted)] px-4 py-3">
                {t("adoptionsNoApplications")}
              </p>
            ) : (
              applications.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  listingId={listing.id}
                  onUpdate={(updated) =>
                    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                  }
                  onApproved={() => handleApplicationApproved(app.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AdoptionsPage() {
  const t = useTranslations("portal");
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const loadListings = useCallback(() => {
    setLoading(true);
    setFetchError("");
    // GET /api/adoptions?mine=1 — the server requiresSession and returns only user's listings.
    fetch("/api/adoptions?mine=1")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data }) => {
        setListings(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("loadFailed"));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  function handleStatusChange(id: string, status: AdoptionListing["status"]) {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  return (
    <div>
      <HubTabs
        tabs={[
          { href: "/portal/adopt", label: t("adopt") },
          { href: "/portal/adoptions", label: t("myAdoptions") },
        ]}
      />
      <PageHeader
        title={t("adoptionsTitle")}
        purpose={t("adoptionsSubtitle")}
        action={
          <Link href="/portal/adopt" className="btn-outline flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4" />
            {t("adoptionsBrowse")}
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={loadListings} retryLabel={t("retry")} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("adoptionsEmpty")}
          body={t("adoptionsEmptyDesc")}
          cta={{ label: t("adoptionsGoToMyPets"), href: "/portal/pets" }}
        />
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
