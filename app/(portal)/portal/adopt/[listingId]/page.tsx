"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  ChevronLeft,
  MapPin,
  DollarSign,
  CheckCircle,
  Dog,
  Cat,
  Baby,
  Star,
  Loader2,
  Send,
  Mail,
} from "lucide-react";
import { SPECIES_CONFIG } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import {
  APPLICATION_STATUS_CONFIG,
  HOUSING_TYPE_OPTIONS,
  LISTING_STATUS_CONFIG,
  LISTING_TRAIT_CONFIG,
} from "@/lib/config/adoptions";
import type { ApplicationStatusId, ListingStatusId, ListingTraitKey } from "@/lib/config/adoptions";
import { DEFAULT_LOCALE } from "@/lib/config/locales";
import { formatPetAge, formatAdoptionFee } from "@/lib/utils/format";
import { useTranslations } from "next-intl";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AdoptionPet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  sex: string | null;
  avatarUrl: string | null;
  handle: string | null;
}

interface Listing {
  id: string;
  title: string;
  description: string | null;
  feeCents: number | null;
  location: string | null;
  requiresExperience: boolean;
  goodWithKids: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
  status: string;
  createdAt: string;
  ownerId: string;
  pet: AdoptionPet;
}

interface FormState {
  message: string;
  experience: string;
  housingType: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ListingDetailPage() {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  const { listingId } = useParams<{ listingId: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [applied, setApplied] = useState(false);
  const [existingStatus, setExistingStatus] = useState<ApplicationStatusId | null>(null);
  const [ownerContact, setOwnerContact] = useState<{ name: string | null; email: string } | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({ message: "", experience: "", housingType: "" });

  const loadListing = useCallback(() => {
    setLoading(true);
    setFetchError("");
    Promise.all([
      fetch(`/api/adoptions/${listingId}`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch("/api/adoptions?applied=1")
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ])
      .then(([listingRes, appsRes]) => {
        setListing(listingRes.data ?? null);
        const apps: {
          listingId: string;
          applicationStatus: ApplicationStatusId;
          ownerName: string | null;
          ownerEmail: string;
        }[] = appsRes.data ?? [];
        const match = apps.find((a) => a.listingId === listingId);
        if (match) {
          setExistingStatus(match.applicationStatus);
          if (match.applicationStatus === "approved") {
            setOwnerContact({ name: match.ownerName, email: match.ownerEmail });
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("loadFailed"));
        setLoading(false);
      });
  }, [listingId, t]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/adoptions/${listingId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: form.message.trim() || null,
        experience: form.experience.trim() || null,
        housingType: form.housingType || null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      setError(data.error ?? t("listingSubmitFailed"));
      return;
    }
    setApplied(true);
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--off)] rounded w-48" />
        <div className="card h-80" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="card py-12 text-center">
        <p className="text-[var(--danger-text)] font-medium mb-3">{fetchError}</p>
        <button onClick={loadListing} className="btn-outline text-sm">
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="card py-16 text-center">
        <p className="font-medium text-[var(--ink)] mb-1">{t("listingNotFound")}</p>
        <Link href="/portal/adopt" className="btn-primary mt-4">
          {t("listingBackToListings")}
        </Link>
      </div>
    );
  }

  const emoji = SPECIES_CONFIG[listing.pet.species as SpeciesId]?.emoji ?? "🐾";
  const age = formatPetAge(listing.pet.birthDate, tPub);
  const isAvailable = listing.status === "available";

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/portal/adopt"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--teal)] no-underline mb-5 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        {t("listingAllListings")}
      </Link>

      {/* Hero card */}
      <div className="card overflow-hidden mb-5">
        {/* Photo */}
        <div className="aspect-video bg-[var(--teal-light)] flex items-center justify-center text-8xl">
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

        <div className="p-6">
          {/* Pet info */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="page-title">{listing.pet.name}</h1>
              <p className="page-sub">
                {tPub(`species_${listing.pet.species}` as Parameters<typeof tPub>[0])}
                {listing.pet.breed ? ` · ${listing.pet.breed}` : ""}
                {age ? ` · ${age}` : ""}
                {listing.pet.sex && listing.pet.sex !== "unknown"
                  ? ` · ${tPub(`sex_${listing.pet.sex}` as Parameters<typeof tPub>[0])}`
                  : ""}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${LISTING_STATUS_CONFIG[listing.status as ListingStatusId].className}`}
            >
              {t(`listingStatus_${listing.status}` as Parameters<typeof t>[0])}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)] mb-5">
            {listing.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {listing.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              {listing.feeCents
                ? t("listingAdoptionFee", { price: formatAdoptionFee(listing.feeCents) })
                : t("adoptFree")}
            </span>
          </div>

          {/* Traits — icons are UI-layer only; labels come from LISTING_TRAIT_CONFIG */}
          {LISTING_TRAIT_CONFIG.some((trait) => listing[trait.field]) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {LISTING_TRAIT_CONFIG.map((trait) => {
                if (!listing[trait.field]) return null;
                const icon: Record<ListingTraitKey, React.ReactNode> = {
                  goodWithKids: <Baby className="w-3.5 h-3.5" />,
                  goodWithDogs: <Dog className="w-3.5 h-3.5" />,
                  goodWithCats: <Cat className="w-3.5 h-3.5" />,
                  requiresExperience: <Star className="w-3.5 h-3.5" />,
                };
                return (
                  <span
                    key={trait.field}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${trait.className} px-3 py-1 rounded-full`}
                  >
                    {icon[trait.field]} {tPub(`trait_${trait.field}` as Parameters<typeof tPub>[0])}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title + description */}
          <h2 className="font-semibold text-[var(--ink)] mb-2">{listing.title}</h2>
          {listing.description && (
            <p className="text-sm text-[var(--ink2)] leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          )}

          {/* Public profile link */}
          {listing.pet.handle && (
            <Link
              href={`/${DEFAULT_LOCALE}/pets/${listing.pet.handle}`}
              className="text-sm text-[var(--teal)] hover:underline mt-3 inline-block no-underline"
            >
              {t("listingViewProfile", { name: listing.pet.name })}
            </Link>
          )}
        </div>
      </div>

      {/* Apply section */}
      {applied ? (
        <div className="card p-6 text-center border-2 border-[var(--green)]">
          <CheckCircle className="w-10 h-10 text-[var(--green-text)] mx-auto mb-3" />
          <p className="font-semibold text-[var(--ink)] mb-1">{t("listingApplicationSubmitted")}</p>
          <p className="text-sm text-[var(--muted)]">{t("listingOwnerWillReview")}</p>
        </div>
      ) : existingStatus ? (
        <div
          className={`card p-6 border-2 ${
            existingStatus === "approved"
              ? "border-[var(--green)]"
              : existingStatus === "rejected"
                ? "border-[var(--border)]"
                : "border-[var(--warn-bg)]"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${APPLICATION_STATUS_CONFIG[existingStatus].className}`}
            >
              {t(`appStatus_${existingStatus}` as Parameters<typeof t>[0])}
            </span>
            <p className="text-sm font-medium text-[var(--ink)]">
              {existingStatus === "approved"
                ? t("listingStatusApproved", { name: listing.pet.name })
                : existingStatus === "rejected"
                  ? t("listingStatusRejected")
                  : existingStatus === "withdrawn"
                    ? t("listingStatusWithdrawn")
                    : t("listingStatusPending", { name: listing.pet.name })}
            </p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {existingStatus === "approved"
              ? t("listingStatusApprovedDesc")
              : existingStatus === "pending"
                ? t("listingOwnerWillReview")
                : t("listingStatusOtherDesc")}
          </p>
          {existingStatus === "approved" && ownerContact && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--ink2)] mb-2">
                {t("listingApprovedContactPrompt")}
              </p>
              <a
                href={`mailto:${ownerContact.email}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--teal)] hover:text-[var(--teal-dark)] no-underline"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                {ownerContact.name ?? ownerContact.email}
                {ownerContact.name && (
                  <span className="text-[var(--muted)] font-normal">({ownerContact.email})</span>
                )}
              </a>
            </div>
          )}
          <Link
            href="/portal/adopt"
            className="text-sm text-[var(--teal)] hover:underline mt-3 inline-block no-underline"
          >
            {t("listingBrowseOther")}
          </Link>
        </div>
      ) : isAvailable ? (
        showForm ? (
          <div className="card p-6 border-2 border-[var(--teal-light)]">
            <div className="flex items-center gap-2 mb-5">
              <div className="icon-tile bg-[var(--teal-light)]">
                <Heart className="w-4 h-4 text-[var(--teal)]" />
              </div>
              <h2 className="font-semibold text-[var(--ink)]">
                {t("listingApplyTitle", { name: listing.pet.name })}
              </h2>
            </div>

            {error && <p className="alert-error mb-4">{error}</p>}

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="form-label">
                  {t("listingHousingType")}{" "}
                  <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
                </label>
                <select
                  className="form-input"
                  value={form.housingType}
                  onChange={(e) => setForm((f) => ({ ...f, housingType: e.target.value }))}
                >
                  <option value="">{t("listingSelectHousingType")}</option>
                  {HOUSING_TYPE_OPTIONS.map(({ value }) => (
                    <option key={value} value={value}>
                      {t(`housingType_${value}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  {t("listingExperienceLabel")}
                  <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
                </label>
                <textarea
                  className="form-input min-h-[80px] resize-y"
                  placeholder={t("listingExperiencePlaceholder")}
                  value={form.experience}
                  onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">
                  {t("listingMessageLabel")}
                  <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
                </label>
                <textarea
                  className="form-input min-h-[80px] resize-y"
                  placeholder={t("listingMessagePlaceholder", { name: listing.pet.name })}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {saving ? t("listingSubmitting") : t("listingSubmitApplication")}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            <Heart className="w-5 h-5" />
            {t("listingApplyTitle", { name: listing.pet.name })}
          </button>
        )
      ) : (
        <div className="card p-5 text-center bg-[var(--off)]">
          <p className="text-sm text-[var(--muted)]">{t("listingClosed")}</p>
        </div>
      )}
    </div>
  );
}
