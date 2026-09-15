import { notFound } from "next/navigation";
import { getInstance } from "@/lib/db";
import { adoptionListings, pets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { APP, APP_URL } from "@/lib/config/app";
import { SPECIES_CONFIG } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import {
  Heart,
  MapPin,
  DollarSign,
  PawPrint,
  Baby,
  Dog,
  Cat,
  Star,
  ChevronLeft,
} from "lucide-react";
import { LISTING_STATUS_CONFIG, LISTING_TRAIT_CONFIG } from "@/lib/config/adoptions";
import type { ListingStatusId, ListingTraitKey } from "@/lib/config/adoptions";
import { formatPetAge, formatAdoptionFee } from "@/lib/utils/format";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";
import { UploadedImage } from "@/components/ui/UploadedImage";

/** Cache adoption listing detail for 30 s — status changes propagate quickly. */
export const revalidate = 30;

type Params = { params: Promise<{ locale: string; listingId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { listingId, locale } = await params;
  const db = getInstance();
  const [[row], t] = await Promise.all([
    db
      .select({ title: adoptionListings.title, petName: pets.name, species: pets.species })
      .from(adoptionListings)
      .innerJoin(pets, eq(pets.id, adoptionListings.petId))
      .where(eq(adoptionListings.id, listingId))
      .limit(1),
    getTranslations({ locale, namespace: "public" }),
  ]);

  if (!row) return { title: APP.name };
  return {
    title: t("adoptListingMetaTitle", { name: row.petName ?? "", app: APP.name }),
    description: row.title,
    alternates: buildAlternates(`/adopt/${listingId}`),
  };
}

export default async function PublicListingDetailPage({ params }: Params) {
  const { locale, listingId } = await params;
  const t = await getTranslations({ locale, namespace: "public" });
  const db = getInstance();

  const [row] = await db
    .select({
      id: adoptionListings.id,
      title: adoptionListings.title,
      description: adoptionListings.description,
      feeCents: adoptionListings.feeCents,
      location: adoptionListings.location,
      status: adoptionListings.status,
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
    .where(eq(adoptionListings.id, listingId))
    .limit(1);

  if (!row) notFound();

  const emoji = SPECIES_CONFIG[row.pet.species as SpeciesId]?.emoji ?? "🐾";
  const age = formatPetAge(row.pet.birthDate, t);
  const isAvailable = row.status === "available";

  const listingSchema = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: row.title,
    description: row.description ?? undefined,
    url: `${APP_URL}/${locale}/adopt/${listingId}`,
    image: row.pet.avatarUrl ?? undefined,
    about: {
      "@type": "Thing",
      name: row.pet.name,
      description: [SPECIES_CONFIG[row.pet.species as SpeciesId]?.label, row.pet.breed, row.pet.sex]
        .filter(Boolean)
        .join(", "),
    },
    ...(row.location ? { contentLocation: { "@type": "Place", name: row.location } } : {}),
    offers:
      row.feeCents !== null
        ? {
            "@type": "Offer",
            price: (row.feeCents / 100).toFixed(2),
            priceCurrency: "USD",
            availability: isAvailable ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          }
        : undefined,
  };

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingSchema) }}
      />
      {/* Nav */}
      <nav className="bg-white border-b border-[var(--border)] px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <Link
          href={`/${locale}`}
          className="font-bold text-[var(--teal)] text-lg no-underline flex items-center gap-2"
        >
          <PawPrint className="w-5 h-5" />
          {APP.name}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[var(--ink2)] hover:text-[var(--teal)] no-underline transition-colors"
          >
            {t("signIn")}
          </Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            {t("joinFree")}
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href={`/${locale}/adopt`}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--teal)] no-underline mb-5 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t("allListings")}
        </Link>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-5">
          {/* Photo */}
          <div className="aspect-video bg-[var(--teal-light)] flex items-center justify-center text-8xl">
            {row.pet.avatarUrl ? (
              <UploadedImage
                src={row.pet.avatarUrl}
                alt={row.pet.name}
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
                <h1 className="text-2xl font-bold text-[var(--ink)]">{row.pet.name}</h1>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {t(`species_${row.pet.species}` as Parameters<typeof t>[0])}
                  {row.pet.breed ? ` · ${row.pet.breed}` : ""}
                  {age ? ` · ${age}` : ""}
                  {row.pet.sex && row.pet.sex !== "unknown"
                    ? ` · ${t(`sex_${row.pet.sex}` as Parameters<typeof t>[0])}`
                    : ""}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${LISTING_STATUS_CONFIG[row.status as ListingStatusId].className}`}
              >
                {t(`listingStatus_${row.status}` as Parameters<typeof t>[0])}
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)] mb-5">
              {row.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {row.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 flex-shrink-0" />
                {row.feeCents
                  ? t("adoptionFee", { price: formatAdoptionFee(row.feeCents) })
                  : t("freeAdoption")}
              </span>
            </div>

            {/* Traits — icons are UI-layer only; labels come from translation keys */}
            {LISTING_TRAIT_CONFIG.some((trait) => row[trait.field]) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {LISTING_TRAIT_CONFIG.map((trait) => {
                  if (!row[trait.field]) return null;
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
                      {icon[trait.field]} {t(`trait_${trait.field}` as Parameters<typeof t>[0])}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Title + description */}
            <h2 className="font-semibold text-[var(--ink)] mb-2">{row.title}</h2>
            {row.description && (
              <p className="text-sm text-[var(--ink2)] leading-relaxed whitespace-pre-line">
                {row.description}
              </p>
            )}

            {/* Public profile link */}
            {row.pet.handle && (
              <Link
                href={`/${locale}/pets/${row.pet.handle}`}
                className="text-sm text-[var(--teal)] hover:underline mt-3 inline-block no-underline"
              >
                {t("viewFullProfile", { name: row.pet.name })}
              </Link>
            )}
          </div>
        </div>

        {/* Apply CTA */}
        {isAvailable && (
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 text-center shadow-sm">
            <Heart className="w-8 h-8 text-[var(--teal)] mx-auto mb-3" />
            <p className="font-semibold text-[var(--ink)] mb-1">
              {t("interestedIn", { name: row.pet.name })}
            </p>
            <p className="text-sm text-[var(--muted)] mb-5">{t("signUpDesc", { app: APP.name })}</p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/register?returnTo=/portal/adopt/${row.id}`}
                className="btn-primary flex items-center gap-2"
              >
                <Heart className="w-4 h-4" />
                {t("signUpButton")}
              </Link>
              <Link href="/login" className="btn-outline">
                {t("signIn")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
