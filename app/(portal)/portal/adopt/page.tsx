"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { PawPrint, MapPin, Users, Search, Filter, ChevronRight, Sparkles } from "lucide-react";
import { LISTING_TRAIT_CONFIG } from "@/lib/config/adoptions";
import { SPECIES_CONFIG, SPECIES_OPTIONS as SPECIES_OPTS } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import { formatPetAgeShort, formatAdoptionFee } from "@/lib/utils/format";
import { EmptyState, ErrorState } from "@/components/portal/PageState";
import { useTranslations } from "next-intl";
import HubTabs from "@/components/portal/HubTabs";
import PageHeader from "@/components/portal/PageHeader";

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

interface AdoptionListing {
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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/* ─── Listing Card ───────────────────────────────────────────────────────── */

function ListingCard({ listing }: { listing: AdoptionListing }) {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  const emoji = SPECIES_CONFIG[listing.pet.species as SpeciesId]?.emoji ?? "🐾";
  const age = formatPetAgeShort(listing.pet.birthDate, tPub);

  return (
    <Link
      href={`/portal/adopt/${listing.id}`}
      className="card overflow-hidden hover:shadow-md transition-shadow no-underline group"
    >
      {/* Avatar */}
      <div className="aspect-[4/3] bg-[var(--teal-light)] flex items-center justify-center text-5xl relative overflow-hidden">
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
        <div className="absolute top-2 end-2 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--ink2)]">
          {listing.feeCents
            ? t("adoptFee", { price: formatAdoptionFee(listing.feeCents) })
            : t("adoptFree")}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--ink)] truncate">{listing.pet.name}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {tPub(`species_${listing.pet.species}` as Parameters<typeof tPub>[0])}
              {listing.pet.breed ? ` · ${listing.pet.breed}` : ""}
              {age ? ` · ${age}` : ""}
              {listing.pet.sex && listing.pet.sex !== "unknown"
                ? ` · ${tPub(`sex_${listing.pet.sex}` as Parameters<typeof tPub>[0])}`
                : ""}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--teal)] transition-colors flex-shrink-0 mt-0.5" />
        </div>

        {listing.location && (
          <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {listing.location}
          </p>
        )}

        {/* Traits */}
        <div className="flex flex-wrap gap-1 mt-3">
          {LISTING_TRAIT_CONFIG.map((trait) =>
            listing[trait.field] ? (
              <span
                key={trait.field}
                className={`text-xs font-medium ${trait.className} px-2 py-0.5 rounded-full`}
              >
                {tPub(`traitShort_${trait.field}` as Parameters<typeof tPub>[0])}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AdoptPage() {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [species, setSpecies] = useState("");
  const [locationQ, setLocationQ] = useState("");

  const loadListings = useCallback(
    (currentSpecies: string) => {
      setLoading(true);
      setFetchError("");
      const url = currentSpecies ? `/api/adoptions?species=${currentSpecies}` : "/api/adoptions";
      fetch(url)
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
    },
    [t],
  );

  useEffect(() => {
    loadListings(species);
  }, [species, loadListings]);

  const displayed = locationQ
    ? listings.filter((l) => l.location?.toLowerCase().includes(locationQ.toLowerCase()))
    : listings;

  return (
    <div>
      <HubTabs
        tabs={[
          { href: "/portal/adopt", label: t("adopt") },
          { href: "/portal/adoptions", label: t("myAdoptions") },
        ]}
      />
      <PageHeader
        title={t("adoptTitle")}
        purpose={t("adoptSubtitle")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/portal/adopt/applications"
              className="btn-ghost text-sm flex items-center gap-2"
            >
              {t("adoptMyApplications")}
            </Link>
            <Link href="/portal/adoptions" className="btn-ghost text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("adoptMyListings")}
            </Link>
            <Link href="/portal/pets" className="btn-outline text-sm flex items-center gap-2">
              <PawPrint className="w-4 h-4" />
              {t("adoptListAPet")}
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder={t("adoptFilterLocation")}
            className="form-input form-input-icon text-sm"
            value={locationQ}
            onChange={(e) => setLocationQ(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <select
            className="form-input form-input-icon pe-4 text-sm"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="">{t("allSpecies")}</option>
            {SPECIES_OPTS.map(({ value }) => (
              <option key={value} value={value}>
                {SPECIES_CONFIG[value as SpeciesId].emoji}{" "}
                {tPub(`species_${value}` as Parameters<typeof tPub>[0])}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-72 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState
          message={fetchError}
          onRetry={() => loadListings(species)}
          retryLabel={t("retry")}
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("adoptNoListings")}
          body={species || locationQ ? t("adoptNoListingsFiltered") : t("adoptNoListingsEmpty")}
          cta={{ label: t("adoptListForAdoption"), href: "/portal/pets" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
