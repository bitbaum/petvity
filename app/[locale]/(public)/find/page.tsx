import { getInstance } from "@/lib/db";
import { vetProfiles, sitterProfiles, groomerProfiles, users, reviews } from "@/lib/db/schema";
import { eq, and, ilike, avg, count, inArray, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { PublicPageNav } from "@/components/sections/PublicPageNav";
import { APP, APP_URL } from "@/lib/config/app";
import { Search, Stethoscope, Home, Scissors, MapPin, Star, BadgeCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";

/**
 * Public professional directory — the answer to "how do I find a groomer in
 * Zürich?" for someone who has never heard of Petvity. SSR, no auth, city
 * filter, links to public profiles. Signing up is the booking CTA.
 */

export const revalidate = 60;

type Params = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; city?: string }>;
};

const TYPES = ["vets", "sitters", "groomers"] as const;
type ProType = (typeof TYPES)[number];

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { locale } = await params;
  const { city } = await searchParams;
  const t = await getTranslations({ locale, namespace: "public" });
  const title = city
    ? t("dirMetaTitleCity", { app: APP.name, city })
    : t("dirMetaTitle", { app: APP.name });
  const description = t("dirMetaDesc", { app: APP.name });
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    alternates: buildAlternates("/find"),
  };
}

export default async function PublicDirectoryPage({ params, searchParams }: Params) {
  const { locale } = await params;
  const { type: typeParam, city: cityParam } = await searchParams;
  const t = await getTranslations({ locale, namespace: "public" });
  const tPortal = await getTranslations({ locale, namespace: "portal" });
  const db = getInstance();

  const activeType: ProType = TYPES.includes(typeParam as ProType)
    ? (typeParam as ProType)
    : "vets";
  const city = cityParam?.trim() ?? "";

  const PAGE = 50;
  let rows: {
    userId: string;
    name: string | null;
    headline: string | null;
    priceLabel: string | null;
    city: string | null;
    country: string | null;
    bio: string | null;
    isVerified: boolean;
  }[] = [];

  if (activeType === "vets") {
    const conditions = [
      eq(users.role, "veterinarian"),
      eq(vetProfiles.isAcceptingClients, true),
      isNotNull(vetProfiles.clinicName),
      isNotNull(vetProfiles.specialty),
      isNotNull(vetProfiles.city),
      isNotNull(vetProfiles.phone),
      sql`length(coalesce(${vetProfiles.bio}, '')) >= 40`,
    ];
    if (city) conditions.push(ilike(vetProfiles.city, `%${city}%`));
    const r = await db
      .select({
        userId: vetProfiles.userId,
        name: users.name,
        specialty: vetProfiles.specialty,
        clinicName: vetProfiles.clinicName,
        city: vetProfiles.city,
        country: vetProfiles.country,
        bio: vetProfiles.bio,
        isVerified: vetProfiles.isVerified,
      })
      .from(vetProfiles)
      .innerJoin(users, eq(users.id, vetProfiles.userId))
      .where(and(...conditions))
      .limit(PAGE);
    rows = r.map((v) => ({
      userId: v.userId,
      name: v.name,
      headline: [v.specialty, v.clinicName].filter(Boolean).join(" · ") || null,
      priceLabel: null,
      city: v.city,
      country: v.country,
      bio: v.bio,
      isVerified: v.isVerified,
    }));
  } else if (activeType === "sitters") {
    const conditions = [
      eq(users.role, "pet_sitter"),
      eq(sitterProfiles.isAcceptingClients, true),
      isNotNull(sitterProfiles.services),
      isNotNull(sitterProfiles.pricePerDay),
      isNotNull(sitterProfiles.city),
      isNotNull(sitterProfiles.phone),
      sql`length(coalesce(${sitterProfiles.bio}, '')) >= 40`,
    ];
    if (city) conditions.push(ilike(sitterProfiles.city, `%${city}%`));
    const r = await db
      .select({
        userId: sitterProfiles.userId,
        name: users.name,
        pricePerDay: sitterProfiles.pricePerDay,
        city: sitterProfiles.city,
        country: sitterProfiles.country,
        bio: sitterProfiles.bio,
        isVerified: sitterProfiles.isVerified,
      })
      .from(sitterProfiles)
      .innerJoin(users, eq(users.id, sitterProfiles.userId))
      .where(and(...conditions))
      .limit(PAGE);
    rows = r.map((s) => ({
      userId: s.userId,
      name: s.name,
      headline: null,
      priceLabel:
        s.pricePerDay != null
          ? `${formatPrice(s.pricePerDay, locale)}${tPortal("findPerDay")}`
          : null,
      city: s.city,
      country: s.country,
      bio: s.bio,
      isVerified: s.isVerified,
    }));
  } else {
    const conditions = [
      eq(users.role, "groomer"),
      eq(groomerProfiles.isAcceptingClients, true),
      isNotNull(groomerProfiles.salonName),
      isNotNull(groomerProfiles.services),
      isNotNull(groomerProfiles.priceFrom),
      isNotNull(groomerProfiles.city),
      isNotNull(groomerProfiles.phone),
      sql`length(coalesce(${groomerProfiles.bio}, '')) >= 40`,
    ];
    if (city) conditions.push(ilike(groomerProfiles.city, `%${city}%`));
    const r = await db
      .select({
        userId: groomerProfiles.userId,
        name: users.name,
        salonName: groomerProfiles.salonName,
        priceFrom: groomerProfiles.priceFrom,
        city: groomerProfiles.city,
        country: groomerProfiles.country,
        bio: groomerProfiles.bio,
        isVerified: groomerProfiles.isVerified,
      })
      .from(groomerProfiles)
      .innerJoin(users, eq(users.id, groomerProfiles.userId))
      .where(and(...conditions))
      .limit(PAGE);
    rows = r.map((g) => ({
      userId: g.userId,
      name: g.name,
      headline: g.salonName,
      priceLabel:
        g.priceFrom != null
          ? tPortal("findPriceFrom", { price: formatPrice(g.priceFrom, locale) })
          : null,
      city: g.city,
      country: g.country,
      bio: g.bio,
      isVerified: g.isVerified,
    }));
  }

  // Review aggregates for the listed professionals
  const ids = rows.map((r) => r.userId);
  const ratingRows = ids.length
    ? await db
        .select({
          professionalId: reviews.professionalId,
          avgRating: avg(reviews.rating),
          reviewCount: count(reviews.id),
        })
        .from(reviews)
        .where(inArray(reviews.professionalId, ids))
        .groupBy(reviews.professionalId)
    : [];
  const ratingMap = new Map(
    ratingRows.map((r) => [
      r.professionalId,
      { avg: r.avgRating ? Number(Number(r.avgRating).toFixed(1)) : null, n: r.reviewCount },
    ]),
  );

  const TYPE_META: Record<ProType, { icon: React.ElementType; label: string }> = {
    vets: { icon: Stethoscope, label: t("dirTabVets") },
    sitters: { icon: Home, label: t("dirTabSitters") },
    groomers: { icon: Scissors, label: t("dirTabGroomers") },
  };

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${APP_URL}/${locale}/pros/${r.userId}`,
      name: r.name ?? TYPE_META[activeType].label,
    })),
  };

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />
      {/* Nav */}
      <PublicPageNav
        locale={locale}
        sticky
        signIn={{ href: "/login", label: t("signIn") }}
        cta={{ href: "/register", label: t("joinFree") }}
      />

      {/* Hero */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--teal-light)] flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-[var(--teal)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--ink)] mb-3">
            {t("dirHeroTitle")}
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">{t("dirHeroDesc")}</p>
        </div>
      </div>

      {/* Type tabs + city filter */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Scrolls rather than overflows: three pills do not fit a 375px phone. */}
          <div className="browse-chip-row">
            {TYPES.map((tp) => {
              const { icon: Icon, label } = TYPE_META[tp];
              const href = `/${locale}/find?type=${tp}${city ? `&city=${encodeURIComponent(city)}` : ""}`;
              return (
                <Link
                  key={tp}
                  href={href}
                  className={`browse-chip ${activeType === tp ? "browse-chip-active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
          <form method="GET" action={`/${locale}/find`} className="flex gap-2 sm:ms-auto">
            <input type="hidden" name="type" value={activeType} />
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
              <input
                type="text"
                name="city"
                defaultValue={city}
                placeholder={tPortal("filterByCity")}
                className="form-input form-input-icon text-sm py-2"
              />
            </div>
            <button type="submit" className="btn-editorial-ghost-sm">
              {tPortal("adoptSearch")}
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-3">🔍</p>
            <p className="font-medium text-[var(--ink)] mb-1">
              {city ? t("dirEmptyCity", { city }) : t("dirEmpty")}
            </p>
            <p className="text-sm text-[var(--muted)] mb-5">{t("dirEmptyDesc")}</p>
            <Link href={`/${locale}/pros`} className="btn-editorial">
              {t("dirJoinCta")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)] mb-5">
              {t("dirCount", { count: rows.length })}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {rows.map((r) => {
                const rating = ratingMap.get(r.userId);
                return (
                  <Link
                    key={r.userId}
                    href={`/${locale}/pros/${r.userId}`}
                    className="bg-white rounded-2xl border border-[var(--border)] p-5 no-underline hover:shadow-md transition-shadow flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--ink)]">
                        {r.name ?? TYPE_META[activeType].label}
                      </p>
                      {r.isVerified && (
                        <span className="badge badge-green">
                          <BadgeCheck className="w-3 h-3" />
                          {t("proVerified")}
                        </span>
                      )}
                      {rating?.avg != null && (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--warn-text)]">
                          <Star className="w-3 h-3 fill-current" />
                          {rating.avg.toFixed(1)} ({rating.n})
                        </span>
                      )}
                    </div>
                    {r.headline && <p className="text-sm text-[var(--teal)]">{r.headline}</p>}
                    {r.priceLabel && (
                      <p className="text-sm font-medium text-[var(--accent)]">{r.priceLabel}</p>
                    )}
                    {(r.city || r.country) && (
                      <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                        <MapPin className="w-3.5 h-3.5" />
                        {[r.city, r.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {r.bio && <p className="text-sm text-[var(--ink2)] line-clamp-2">{r.bio}</p>}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Provider CTA */}
      <div className="bg-[var(--obsidian-deep)] py-14 text-center">
        <p className="ed-title-sm ed-title-on-dark mb-2">{t("dirProviderCtaTitle")}</p>
        <p className="text-[var(--platinum-dim)] text-sm max-w-md mx-auto mb-6">
          {t("dirProviderCtaDesc")}
        </p>
        <Link
          href={`/${locale}/pros`}
          className="btn-editorial-light inline-flex items-center gap-2"
        >
          {t("dirJoinCta")}
        </Link>
      </div>
    </div>
  );
}
