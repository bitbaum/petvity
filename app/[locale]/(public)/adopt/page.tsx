import { getInstance } from "@/lib/db";
import { adoptionListings, pets } from "@/lib/db/schema";
import { and, desc, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { APP } from "@/lib/config/app";
import { LISTING_TRAIT_CONFIG } from "@/lib/config/adoptions";
import { SPECIES_CONFIG } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import { Heart, MapPin, PawPrint, Search, X } from "lucide-react";
import { formatPetAgeShort, formatAdoptionFee } from "@/lib/utils/format";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";
import { UploadedImage } from "@/components/ui/UploadedImage";

export const revalidate = 30;

type Params = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ species?: string; location?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });
  const title = t("adoptMetaTitle", { app: APP.name });
  const description = t("adoptMetaDesc", { app: APP.name });
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    alternates: buildAlternates("/adopt"),
  };
}

function speciesEmoji(species: string): string {
  return SPECIES_CONFIG[species as SpeciesId]?.emoji ?? "🐾";
}

const FILTER_SPECIES: SpeciesId[] = [
  "dog",
  "cat",
  "rabbit",
  "bird",
  "horse",
  "guinea_pig",
  "hamster",
  "reptile",
  "fish",
  "other",
];

export default async function PublicAdoptPage({ params, searchParams }: Params) {
  const { locale } = await params;
  const { species: speciesFilter, location: locationFilter } = await searchParams;
  const t = await getTranslations({ locale, namespace: "public" });
  // Filter-bar labels live in the portal namespace (shared with /portal/adopt).
  const tPortal = await getTranslations({ locale, namespace: "portal" });
  const db = getInstance();

  const activeSpecies = FILTER_SPECIES.includes(speciesFilter as SpeciesId)
    ? (speciesFilter as SpeciesId)
    : null;
  const activeLocation = locationFilter?.trim() ?? "";

  const conditions = [eq(adoptionListings.status, "available")];
  if (activeSpecies) conditions.push(eq(pets.species, activeSpecies));
  if (activeLocation) conditions.push(ilike(adoptionListings.location, `%${activeLocation}%`));

  const listings = await db
    .select({
      id: adoptionListings.id,
      title: adoptionListings.title,
      feeCents: adoptionListings.feeCents,
      location: adoptionListings.location,
      requiresExperience: adoptionListings.requiresExperience,
      goodWithKids: adoptionListings.goodWithKids,
      goodWithDogs: adoptionListings.goodWithDogs,
      goodWithCats: adoptionListings.goodWithCats,
      createdAt: adoptionListings.createdAt,
      pet: {
        id: pets.id,
        name: pets.name,
        species: pets.species,
        breed: pets.breed,
        birthDate: pets.birthDate,
        sex: pets.sex,
        avatarUrl: pets.avatarUrl,
        handle: pets.handle,
      },
    })
    .from(adoptionListings)
    .innerJoin(pets, eq(pets.id, adoptionListings.petId))
    .where(and(...conditions))
    .orderBy(desc(adoptionListings.createdAt))
    .limit(100);

  const isFiltered = !!(activeSpecies || activeLocation);

  return (
    <div className="min-h-screen bg-[var(--off)]">
      {/* Nav */}
      <nav className="bg-white border-b border-[var(--border)] px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <Link
          href={`/${locale}`}
          className="font-bold text-[var(--warm-ink)] text-lg no-underline flex items-center gap-2"
        >
          <PawPrint className="w-5 h-5" />
          {APP.name}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[var(--ink2)] hover:text-[var(--warm-ink)] no-underline transition-colors"
          >
            {t("signIn")}
          </Link>
          <Link href="/register" className="btn-editorial-sm">
            {t("joinFree")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--ink)] mb-3">
            {t("adoptHeroTitle")}
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto mb-6">{t("adoptHeroDesc")}</p>
          <Link href="/register" className="btn-editorial inline-flex items-center gap-2">
            <Heart className="w-4 h-4" />
            {t("adoptListButton")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <form method="GET" action={`/${locale}/adopt`} className="space-y-3">
            {/* Species pills */}
            <div className="browse-chip-row flex-wrap">
              <button
                type="submit"
                name="species"
                value=""
                className={`browse-chip ${!activeSpecies ? "browse-chip-active" : ""}`}
              >
                {tPortal("adoptFilterAll")}
              </button>
              {FILTER_SPECIES.map((sp) => (
                <button
                  key={sp}
                  type="submit"
                  name="species"
                  value={sp}
                  className={`browse-chip ${activeSpecies === sp ? "browse-chip-active" : ""}`}
                >
                  {SPECIES_CONFIG[sp].emoji} {t(`species_${sp}` as Parameters<typeof t>[0])}
                </button>
              ))}
              {/* Preserve location when clicking species pills */}
              {activeLocation && <input type="hidden" name="location" value={activeLocation} />}
            </div>

            {/* Location search */}
            <div className="flex gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                <input
                  type="text"
                  name="location"
                  defaultValue={activeLocation}
                  placeholder={tPortal("adoptFilterLocation")}
                  className="form-input form-input-icon text-sm py-2 w-full"
                />
              </div>
              <button
                type="submit"
                className="btn-editorial-ghost text-sm py-2 px-4 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                {tPortal("adoptSearch")}
              </button>
              {/* Preserve species when submitting location */}
              {activeSpecies && <input type="hidden" name="species" value={activeSpecies} />}
            </div>
          </form>

          {/* Active filters summary + clear */}
          {isFiltered && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-[var(--muted)]">
                {t("adoptCount", { count: listings.length })}
              </span>
              <Link
                href={`/${locale}/adopt`}
                className="inline-flex items-center gap-1 text-xs text-[var(--danger-text)] hover:underline no-underline"
              >
                <X className="w-3 h-3" />
                {t("adoptClearFilters")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-3">{isFiltered ? "🔍" : "🐾"}</p>
            <p className="font-medium text-[var(--ink)] mb-1">
              {isFiltered ? t("adoptNoResults") : t("adoptEmptyTitle")}
            </p>
            <p className="text-sm text-[var(--muted)] mb-5">
              {isFiltered ? (
                <Link href={`/${locale}/adopt`} className="text-[var(--accent)] hover:underline">
                  {t("adoptClearFilters")}
                </Link>
              ) : (
                t("adoptEmptyDesc")
              )}
            </p>
            {!isFiltered && (
              <Link href="/register" className="btn-editorial">
                {t("adoptEmptyAction")}
              </Link>
            )}
          </div>
        ) : (
          <>
            {!isFiltered && (
              <p className="text-sm text-[var(--muted)] mb-5">
                {t("adoptCount", { count: listings.length })}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((listing) => {
                const emoji = speciesEmoji(listing.pet.species);
                const age = formatPetAgeShort(listing.pet.birthDate, t);
                return (
                  <Link
                    key={listing.id}
                    href={`/${locale}/adopt/${listing.id}`}
                    className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow no-underline group"
                  >
                    {/* Photo */}
                    <div className="aspect-[4/3] bg-[var(--light)] flex items-center justify-center text-5xl relative overflow-hidden">
                      {listing.pet.avatarUrl ? (
                        <UploadedImage
                          src={listing.pet.avatarUrl}
                          alt={listing.pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{emoji}</span>
                      )}
                      <div className="absolute top-2 end-2 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--ink2)]">
                        {listing.feeCents ? formatAdoptionFee(listing.feeCents) : t("adoptFree")}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="font-semibold text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {listing.pet.name}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {t(`species_${listing.pet.species}` as Parameters<typeof t>[0])}
                        {listing.pet.breed ? ` · ${listing.pet.breed}` : ""}
                        {age ? ` · ${age}` : ""}
                        {listing.pet.sex && listing.pet.sex !== "unknown"
                          ? ` · ${t(`sex_${listing.pet.sex}` as Parameters<typeof t>[0])}`
                          : ""}
                      </p>
                      {listing.location && (
                        <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-2">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {listing.location}
                        </p>
                      )}
                      {/* Trait pills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {LISTING_TRAIT_CONFIG.map((trait) =>
                          listing[trait.field] ? (
                            <span
                              key={trait.field}
                              className={`text-xs font-medium ${trait.className} px-2 py-0.5 rounded-full`}
                            >
                              {t(`traitShort_${trait.field}` as Parameters<typeof t>[0])}
                            </span>
                          ) : null,
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CTA footer */}
      <div className="border-t border-[var(--border)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 text-center">
          <p className="font-medium text-[var(--ink)] mb-2">{t("adoptCtaTitle")}</p>
          <p className="text-sm text-[var(--muted)] mb-5">{t("adoptCtaDesc")}</p>
          <Link href="/register" className="btn-editorial inline-flex items-center gap-2">
            <PawPrint className="w-4 h-4" />
            {t("adoptCtaButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}
