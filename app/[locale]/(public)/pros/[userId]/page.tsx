import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getInstance } from "@/lib/db";
import { vetProfiles, sitterProfiles, groomerProfiles, users, reviews } from "@/lib/db/schema";
import { APP, APP_URL } from "@/lib/config/app";
import { BadgeCheck, MapPin, Phone, Star, Stethoscope, Home, Scissors } from "lucide-react";
import Link from "next/link";
import { PublicPageNav } from "@/components/sections/PublicPageNav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";

/** Cache professional profiles for 60 s — profiles don't change frequently. */
export const revalidate = 60;

type Params = { params: Promise<{ userId: string; locale: string }> };

/* ─── Metadata ───────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { userId, locale } = await params;
  const db = getInstance();
  const [u] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const name = u?.name ?? "Professional";
  return {
    title: `${name} · ${APP.name}`,
    description: `View ${name}'s professional profile on ${APP.name}`,
    openGraph: {
      title: `${name} · ${APP.name}`,
      url: `${APP_URL}/${locale}/pros/${userId}`,
    },
    alternates: buildAlternates(`/pros/${userId}`),
  };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= rating ? "text-[var(--warn-text)] fill-current" : "text-[var(--faint)]"}`}
        />
      ))}
    </div>
  );
}

function formatServices(
  services: string | null,
  t: Awaited<ReturnType<typeof getTranslations<"portal">>>,
): string {
  if (!services) return "";
  return services
    .split(",")
    .map((s) => t(`service_${s.trim()}` as Parameters<typeof t>[0]))
    .filter(Boolean)
    .join(" · ");
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default async function PublicProPage({ params }: Params) {
  const { userId, locale } = await params;
  const [t, tPortal] = await Promise.all([
    getTranslations({ locale, namespace: "public" }),
    getTranslations({ locale, namespace: "portal" }),
  ]);
  const db = getInstance();

  // Query both profile types in parallel; one will be null
  const [[vetRow], [sitterRow], [groomerRow], reviewRows] = await Promise.all([
    db
      .select({
        name: users.name,
        bio: vetProfiles.bio,
        specialty: vetProfiles.specialty,
        clinicName: vetProfiles.clinicName,
        clinicAddress: vetProfiles.clinicAddress,
        city: vetProfiles.city,
        country: vetProfiles.country,
        phone: vetProfiles.phone,
        isAcceptingClients: vetProfiles.isAcceptingClients,
        isVerified: vetProfiles.isVerified,
      })
      .from(vetProfiles)
      .innerJoin(users, eq(users.id, vetProfiles.userId))
      .where(eq(vetProfiles.userId, userId))
      .limit(1),

    db
      .select({
        name: users.name,
        bio: sitterProfiles.bio,
        services: sitterProfiles.services,
        pricePerDay: sitterProfiles.pricePerDay,
        city: sitterProfiles.city,
        country: sitterProfiles.country,
        phone: sitterProfiles.phone,
        isAcceptingClients: sitterProfiles.isAcceptingClients,
        isVerified: sitterProfiles.isVerified,
      })
      .from(sitterProfiles)
      .innerJoin(users, eq(users.id, sitterProfiles.userId))
      .where(eq(sitterProfiles.userId, userId))
      .limit(1),

    db
      .select({
        name: users.name,
        salonName: groomerProfiles.salonName,
        bio: groomerProfiles.bio,
        services: groomerProfiles.services,
        priceFrom: groomerProfiles.priceFrom,
        city: groomerProfiles.city,
        country: groomerProfiles.country,
        phone: groomerProfiles.phone,
        isAcceptingClients: groomerProfiles.isAcceptingClients,
        isVerified: groomerProfiles.isVerified,
      })
      .from(groomerProfiles)
      .innerJoin(users, eq(users.id, groomerProfiles.userId))
      .where(eq(groomerProfiles.userId, userId))
      .limit(1),

    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.reviewerId))
      .where(eq(reviews.professionalId, userId))
      .orderBy(desc(reviews.createdAt)),
  ]);

  if (!vetRow && !sitterRow && !groomerRow) notFound();

  const isVet = !!vetRow;
  const isGroomer = !vetRow && !sitterRow && !!groomerRow;
  const profile = vetRow ?? sitterRow ?? groomerRow!;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  const avgRating =
    reviewRows.length > 0
      ? reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length
      : null;

  const proSchema = {
    "@context": "https://schema.org",
    "@type": isVet ? "VeterinaryCare" : "LocalBusiness",
    name: profile.name ?? (isVet ? "Veterinarian" : isGroomer ? "Pet Groomer" : "Pet Sitter"),
    url: `${APP_URL}/${locale}/pros/${userId}`,
    ...(profile.city || profile.country
      ? {
          address: {
            "@type": "PostalAddress",
            ...(profile.city ? { addressLocality: profile.city } : {}),
            ...(profile.country ? { addressCountry: profile.country } : {}),
          },
        }
      : {}),
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(isVet && vetRow?.clinicName
      ? { branchOf: { "@type": "Organization", name: vetRow.clinicName } }
      : {}),
    ...(avgRating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviewRows.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(proSchema) }}
      />
      {/* Nav */}
      <PublicPageNav
        locale={locale}
        cta={{ href: "/login", label: t("proBookOn", { app: APP.name }) }}
      />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          {/* Header band */}
          <div className="h-24 bg-[var(--warm-dark)]" />

          <div className="px-6 pb-6">
            {/* Avatar + name */}
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-[var(--accent-light)] text-[var(--accent)] flex-shrink-0">
                {isVet ? (
                  <Stethoscope className="w-9 h-9" />
                ) : isGroomer ? (
                  <Scissors className="w-9 h-9" />
                ) : (
                  <Home className="w-9 h-9" />
                )}
              </div>
              <div className="pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-light text-3xl text-[var(--warm-ink)]">
                    {profile.name ??
                      (isVet ? t("proVet") : isGroomer ? t("proGroomer") : t("proSitter"))}
                  </h1>
                  {profile.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--green-text)] bg-[var(--green-bg)] px-2 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3" />
                      {t("proVerified")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {isVet ? t("proVet") : isGroomer ? t("proGroomer") : t("proSitter")}
                  {isVet && vetRow.specialty ? ` · ${vetRow.specialty}` : ""}
                  {isGroomer && groomerRow.salonName ? ` · ${groomerRow.salonName}` : ""}
                </p>
              </div>
            </div>

            {/* Availability */}
            <span
              className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full mb-4 ${
                profile.isAcceptingClients
                  ? "bg-[var(--green-bg)] text-[var(--green-text)]"
                  : "bg-[var(--off)] text-[var(--muted)]"
              }`}
            >
              {profile.isAcceptingClients ? t("proAccepting") : t("proNotAccepting")}
            </span>

            {/* Rating summary */}
            {avgRating !== null && (
              <div className="flex items-center gap-2 mb-4">
                <StarRow rating={Math.round(avgRating)} />
                <span className="text-sm font-medium text-[var(--ink)]">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-sm text-[var(--muted)]">
                  {t("proReviewCount", { count: reviewRows.length })}
                </span>
              </div>
            )}

            {/* Location + phone */}
            <div className="space-y-1.5 mb-4">
              {(location || (isVet && vetRow.clinicName)) && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {isVet && vetRow.clinicName ? `${vetRow.clinicName} · ` : ""}
                    {location}
                  </span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`tel:${profile.phone}`}
                    className="hover:text-[var(--accent)] transition-colors"
                  >
                    {profile.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-[var(--ink2)] leading-relaxed">{profile.bio}</p>
            )}

            {/* Groomer: services + starting price */}
            {isGroomer && groomerRow && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                {groomerRow.services && (
                  <p className="text-sm text-[var(--muted)]">
                    {formatServices(groomerRow.services, tPortal)}
                  </p>
                )}
                {groomerRow.priceFrom != null && (
                  <p className="text-sm font-semibold text-[var(--accent)] mt-1">
                    {t("proPriceFrom", { price: (groomerRow.priceFrom / 100).toFixed(0) })}
                  </p>
                )}
              </div>
            )}

            {/* Sitter: services + price */}
            {!isVet && sitterRow && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                {sitterRow.services && (
                  <p className="text-sm text-[var(--muted)]">
                    {formatServices(sitterRow.services, tPortal)}
                  </p>
                )}
                {sitterRow.pricePerDay != null && (
                  <p className="text-sm font-semibold text-[var(--accent)] mt-1">
                    {t("proPerDay", { price: (sitterRow.pricePerDay / 100).toFixed(0) })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        {reviewRows.length > 0 && (
          <section>
            <h2 className="font-display font-light text-2xl text-[var(--warm-ink)] mb-3">
              {t("proReviewsTitle", { count: reviewRows.length })}
            </h2>
            <div className="space-y-3">
              {reviewRows.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] font-bold text-xs flex-shrink-0">
                        {(r.reviewerName ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[var(--ink)]">
                        {r.reviewerName ?? t("proPetOwner")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRow rating={r.rating} />
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(r.createdAt).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-[var(--ink2)]">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 text-center">
          <p className="font-medium text-[var(--ink)] mb-1">
            {t("proReadyToBook", { name: profile.name?.split(" ")[0] ?? profile.name ?? "" })}
          </p>
          <p className="text-sm text-[var(--muted)] mb-4">{t("proBookDesc", { app: APP.name })}</p>
          <Link href="/login" className="btn-editorial">
            {t("proSignInBook")}
          </Link>
        </div>
      </div>
    </div>
  );
}
