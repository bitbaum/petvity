import { auth } from "@/lib/auth";
import { getInstance } from "@/lib/db";
import {
  pets,
  healthMetrics,
  vaccinations,
  adoptionListings,
  adoptionApplications,
  bookings,
  orders,
  orderItems,
  products,
} from "@/lib/db/schema";
import { and, count, countDistinct, desc, eq, gte, inArray } from "drizzle-orm";
import Link from "next/link";
import { computePetSignal } from "@/lib/domain/pet-signal";
import { computeDigitalTwin } from "@/lib/domain/digital-twin";
import {
  SIGNAL_BG_CLASSES,
  SIGNAL_STRIP_CLASSES,
  SIGNAL_SORT_ORDER,
  SIGNAL_METRIC_WINDOW_DAYS,
  SIGNAL_TEXT_CLASSES,
} from "@/lib/config/pet-signal";
import type { PetWellnessSignal } from "@/lib/config/pet-signal";
import { TWIN_STATE_CONFIG, TWIN_TREND_CONFIG } from "@/lib/config/digital-twin";
import { SPECIES_CONFIG } from "@/lib/config/species";
import { countOverdueVaccinations } from "@/lib/config/vaccinations";
import type { SpeciesId } from "@/lib/config/species";
import type { TwinTrend } from "@/lib/domain/digital-twin";
import {
  Plus,
  PawPrint,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  AlertTriangle,
  Stethoscope,
  Syringe,
  Heart,
  CalendarCheck,
  Store,
  Package,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPortalLocale } from "@/lib/i18n/portal-locale";
import { translateSignalReason } from "@/lib/i18n/signal-reason";
import { users } from "@/lib/db/schema";
import PageHeader from "@/components/portal/PageHeader";
import QuickActions from "@/components/portal/QuickActions";
import { formatPrice, formatIsoDate } from "@/lib/utils/format";
import { BOOKING_STATUS_CONFIG, ORDER_STATUS_CONFIG } from "@/lib/config/orders";
import type { BookingStatusId, OrderStatusId } from "@/lib/config/orders";
import { UploadedImage } from "@/components/ui/UploadedImage";

// Icon mapping stays component-side (React components are UI, not config)
const TREND_ICONS: Record<TwinTrend, React.ComponentType<{ className?: string }>> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
  insufficient_data: Minus,
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const locale = await getPortalLocale();
  const [t, tSignal, tTwin, tPub] = await Promise.all([
    getTranslations({ locale, namespace: "portal" }),
    getTranslations({ locale, namespace: "signal" }),
    getTranslations({ locale, namespace: "twin" }),
    getTranslations({ locale, namespace: "public" }),
  ]);

  const db = getInstance();
  const userPets = await db
    .select()
    .from(pets)
    .where(eq(pets.ownerId, session.user.id))
    .orderBy(desc(pets.createdAt));

  const now = new Date();
  const sinceStr = new Date(now.getTime() - SIGNAL_METRIC_WINDOW_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const petIds = userPets.map((p) => p.id);

  const isProfessional =
    session.user.role === "veterinarian" ||
    session.user.role === "pet_sitter" ||
    session.user.role === "groomer";

  // Batch-fetch metrics + vaccinations + pending adoption applications
  // + role-specific attention counts (pro booking requests, seller open orders)
  const [allMetrics, allVacc, [pendingAppsRow], [proBookingsRow], [sellerOrdersRow]] =
    await Promise.all([
      petIds.length > 0
        ? db
            .select()
            .from(healthMetrics)
            .where(and(inArray(healthMetrics.petId, petIds), gte(healthMetrics.date, sinceStr)))
            .orderBy(desc(healthMetrics.date))
        : Promise.resolve([]),
      petIds.length > 0
        ? db.select().from(vaccinations).where(inArray(vaccinations.petId, petIds))
        : Promise.resolve([]),
      db
        .select({ total: count() })
        .from(adoptionApplications)
        .innerJoin(adoptionListings, eq(adoptionListings.id, adoptionApplications.listingId))
        .where(
          and(
            eq(adoptionListings.ownerId, session.user.id),
            eq(adoptionApplications.status, "pending"),
          ),
        ),
      isProfessional
        ? db
            .select({ total: count() })
            .from(bookings)
            .where(
              and(eq(bookings.professionalId, session.user.id), eq(bookings.status, "pending")),
            )
        : Promise.resolve([{ total: 0 }]),
      db
        .select({ total: countDistinct(orders.id) })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(
          and(
            eq(products.sellerId, session.user.id),
            inArray(orders.status, ["pending", "confirmed"]),
          ),
        ),
    ]);

  const pendingAppsCount = pendingAppsRow?.total ?? 0;
  const proBookingsCount = proBookingsRow?.total ?? 0;
  const sellerOrdersCount = sellerOrdersRow?.total ?? 0;

  // The dashboard is the whole platform, not only health: what is booked next
  // and what was ordered recently belong here as much as the pet cards do.
  const [upcomingBookings, recentOrders, [sellerRow]] = await Promise.all([
    db
      .select({
        id: bookings.id,
        startDate: bookings.startDate,
        status: bookings.status,
        petName: pets.name,
        proName: users.name,
      })
      .from(bookings)
      .innerJoin(pets, eq(pets.id, bookings.petId))
      .innerJoin(users, eq(users.id, bookings.professionalId))
      .where(
        and(
          eq(bookings.ownerId, session.user.id),
          inArray(bookings.status, ["pending", "confirmed"]),
          gte(bookings.startDate, new Date(todayStr + "T00:00:00Z")),
        ),
      )
      .orderBy(bookings.startDate)
      .limit(3),
    db
      .select({
        id: orders.id,
        status: orders.status,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, session.user.id))
      .orderBy(desc(orders.createdAt))
      .limit(3),
    db.select({ total: count() }).from(products).where(eq(products.sellerId, session.user.id)),
  ]);

  const isSeller = (sellerRow?.total ?? 0) > 0;

  // Group in memory by petId
  const metricsByPet = new Map<string, typeof allMetrics>();
  for (const m of allMetrics) {
    const arr = metricsByPet.get(m.petId) ?? [];
    arr.push(m);
    metricsByPet.set(m.petId, arr);
  }

  const vaccByPet = new Map<string, typeof allVacc>();
  for (const v of allVacc) {
    const arr = vaccByPet.get(v.petId) ?? [];
    arr.push(v);
    vaccByPet.set(v.petId, arr);
  }

  const petsWithData = userPets.map((pet) => {
    const recentMetrics = metricsByPet.get(pet.id) ?? [];
    const petVacc = vaccByPet.get(pet.id) ?? [];
    const overdueCount = countOverdueVaccinations(petVacc, todayStr);

    const signal = computePetSignal({
      species: pet.species as SpeciesId,
      recentMetrics,
      overdueVaccinations: overdueCount,
      petCreatedAt: pet.createdAt,
      now,
    });
    const twin = computeDigitalTwin(recentMetrics, now);

    return { ...pet, signal, twin, overdueCount };
  });

  // Sort: concern first, then watch, then healthy
  petsWithData.sort((a, b) => {
    const aOrder = SIGNAL_SORT_ORDER[a.signal.signal as PetWellnessSignal] ?? 3;
    const bOrder = SIGNAL_SORT_ORDER[b.signal.signal as PetWellnessSignal] ?? 3;
    return aOrder - bOrder;
  });

  const loggedToday = petsWithData.filter((p) => p.twin.daysAgo === 0).length;

  // Vaccinations due within 14 days (from already-fetched data — no extra query)
  const vaccDueSoonCount = allVacc.filter((v) => {
    if (!v.nextDueDate || v.status === "not_applicable") return false;
    const daysUntil =
      (new Date(v.nextDueDate + "T00:00:00Z").getTime() -
        new Date(todayStr + "T00:00:00Z").getTime()) /
      86_400_000;
    return daysUntil >= 0 && daysUntil <= 14;
  }).length;

  // Which pets have a due vaccination — used to make the strip actionable
  const petsWithDueVacc = petsWithData.filter((pet) => {
    const petVacc = vaccByPet.get(pet.id) ?? [];
    return petVacc.some((v) => {
      if (!v.nextDueDate || v.status === "not_applicable") return false;
      const daysUntil =
        (new Date(v.nextDueDate + "T00:00:00Z").getTime() -
          new Date(todayStr + "T00:00:00Z").getTime()) /
        86_400_000;
      return daysUntil >= 0 && daysUntil <= 14;
    });
  });
  const vaccHref =
    petsWithDueVacc.length === 1
      ? `/portal/pets/${petsWithDueVacc[0].id}/vaccinations`
      : "/portal/pets";

  return (
    <div>
      {/* Header — the greeting used to be derived from the server's clock, which
          is the box's UTC, not the reader's. A name-only greeting is honest. */}
      <PageHeader
        title={t("dashGreeting", { name: session.user.name?.split(" ")[0] ?? "" })}
        purpose={t("dashPurpose")}
        action={
          <Link href="/portal/pets/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            {t("addPetButton")}
          </Link>
        }
      />

      {/* Today's check-in status — an action line, not decoration */}
      <p className="text-sm text-[var(--muted)] -mt-2 mb-6">
        {userPets.length === 0 ? (
          t("checkinNoPets")
        ) : loggedToday === userPets.length ? (
          t("allCheckedIn", { total: userPets.length })
        ) : (
          <>
            {t("partialCheckedIn", { done: loggedToday, total: userPets.length })}
            {" · "}
            <Link href="/portal/checkin" className="text-[var(--teal)] hover:underline">
              {loggedToday > 0 ? t("logRemaining") : t("logTodayCheckin")}
            </Link>
          </>
        )}
      </p>

      {/* Needs-attention strip — everything across the user's roles that wants a reply */}
      {(pendingAppsCount > 0 ||
        vaccDueSoonCount > 0 ||
        proBookingsCount > 0 ||
        sellerOrdersCount > 0) && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {proBookingsCount > 0 && (
            <Link
              href="/portal/bookings"
              className="flex-1 flex items-center gap-3 rounded-xl border border-[var(--teal)] bg-[var(--teal-light)] px-4 py-3 no-underline hover:brightness-95 transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-[var(--teal)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--ink)] flex-1">
                {t("dashProBookingRequests", { count: proBookingsCount })}
              </span>
              <span className="text-xs font-medium text-[var(--teal)]">{t("dashReview")} →</span>
            </Link>
          )}
          {sellerOrdersCount > 0 && (
            <Link
              href="/portal/my-products/orders"
              className="flex-1 flex items-center gap-3 rounded-xl border border-[var(--teal)] bg-[var(--teal-light)] px-4 py-3 no-underline hover:brightness-95 transition-colors"
            >
              <Store className="w-4 h-4 text-[var(--teal)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--ink)] flex-1">
                {t("dashSellerOpenOrders", { count: sellerOrdersCount })}
              </span>
              <span className="text-xs font-medium text-[var(--teal)]">{t("dashReview")} →</span>
            </Link>
          )}
          {pendingAppsCount > 0 && (
            <Link
              href="/portal/adoptions"
              className="flex-1 flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-light)] px-4 py-3 no-underline hover:brightness-95 transition-colors"
            >
              <Heart className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--ink)] flex-1">
                {t("dashPendingApplications", { count: pendingAppsCount })}
              </span>
              <span className="text-xs font-medium text-[var(--accent)]">{t("dashReview")} →</span>
            </Link>
          )}
          {vaccDueSoonCount > 0 && (
            <Link
              href={vaccHref}
              className="flex-1 flex items-center gap-3 rounded-xl border border-[var(--warn)] bg-[var(--warn-bg)] px-4 py-3 no-underline hover:opacity-90 transition-opacity"
            >
              <Syringe className="w-4 h-4 text-[var(--warn-text)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--ink)] flex-1">
                {t("dashVaccDueSoon", { count: vaccDueSoonCount })}
              </span>
              <span className="text-xs font-medium text-[var(--warn-text)]">
                {t("dashReview")} →
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Empty state */}
      {petsWithData.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[var(--teal-light)] flex items-center justify-center mx-auto mb-5">
            <PawPrint className="w-9 h-9 text-[var(--teal)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-2">{t("meetFirstPet")}</h2>
          <p className="text-sm text-[var(--muted)] max-w-xs mx-auto mb-6 leading-relaxed">
            {t("meetFirstPetDesc")}
          </p>
          <Link href="/portal/pets/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            {t("addFirstPet")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {petsWithData.map((pet) => {
            const speciesDef = SPECIES_CONFIG[pet.species as SpeciesId];
            const sig = pet.signal.signal;
            const twin = pet.twin;
            const twinCfg = TWIN_STATE_CONFIG[twin.id];
            const needsCheckin = twin.daysAgo === null || twin.daysAgo > 0;

            const TrendIcon = TREND_ICONS[twin.trend];
            const trendColor = TWIN_TREND_CONFIG[twin.trend].color;

            return (
              /* Overlay-link pattern: outer div is the card; absolute <Link> covers the whole
                 card for the primary navigation; secondary links sit relative/z-10 above it.
                 This avoids nested <a> tags (invalid HTML) while keeping the whole card clickable. */
              <div
                key={pet.id}
                className="card overflow-hidden hover:shadow-md transition-all group relative"
              >
                {/* Primary card link — covers the full card */}
                <Link
                  href={`/portal/pets/${pet.id}`}
                  className="absolute inset-0 z-0"
                  aria-label={`View ${pet.name}`}
                />

                {/* Signal strip */}
                <div
                  className={`h-1 ${SIGNAL_STRIP_CLASSES[sig as keyof typeof SIGNAL_STRIP_CLASSES] ?? "bg-[var(--border)]"}`}
                />

                <div className="p-5">
                  {/* Row 1: avatar + signal badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--light)] flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
                      {pet.avatarUrl ? (
                        <UploadedImage
                          src={pet.avatarUrl}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (speciesDef?.emoji ?? "🐾")
                      )}
                    </div>
                    <span className={SIGNAL_BG_CLASSES[sig as keyof typeof SIGNAL_BG_CLASSES]}>
                      {tSignal(sig)}
                    </span>
                  </div>

                  {/* Row 2: name + species */}
                  <h3 className="font-semibold text-[var(--ink)] text-base group-hover:text-[var(--teal)] transition-colors mb-0.5">
                    {pet.name}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mb-3">
                    {tPub(`species_${pet.species}` as Parameters<typeof tPub>[0])}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                  </p>

                  {/* Row 3: twin mini-bar OR "Log today" shortcut */}
                  {needsCheckin ? (
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/portal/pets/${pet.id}/health/log`}
                        className="relative z-10 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors no-underline"
                      >
                        <CalendarDays className="w-3 h-3" />
                        {t("logToday")}
                      </Link>
                      {twin.daysAgo !== null && twin.daysAgo > 0 && (
                        <span className="text-xs text-[var(--muted)]">
                          {t("daysAgo", { count: twin.daysAgo })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${twinCfg.text}`}>
                            {tTwin(twin.id)}
                          </span>
                          {twin.trend !== "insufficient_data" && (
                            <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                          )}
                        </div>
                        <span className="text-xs text-[var(--muted)] tabular-nums">
                          {twin.scorePercent}/100
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--border)]">
                        <div
                          className={`h-1.5 rounded-full ${twinCfg.barColor}`}
                          style={{ width: `${twin.scorePercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Signal reason + action links — shown when watch/concern */}
                  {sig !== "healthy" && (
                    <div
                      className={`flex items-start gap-1.5 mt-2 text-xs ${SIGNAL_TEXT_CLASSES[sig as PetWellnessSignal]}`}
                    >
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="leading-snug">
                        {translateSignalReason(pet.signal.reasonData, tSignal)}
                      </span>
                    </div>
                  )}
                  {sig !== "healthy" && (
                    <div className="flex gap-3 mt-2 relative z-10 flex-wrap">
                      <Link
                        href={`/portal/pets/${pet.id}/health/log`}
                        className="text-xs font-medium text-[var(--teal)] hover:underline"
                      >
                        {t("logHealth")}
                      </Link>
                      {pet.overdueCount > 0 && (
                        <Link
                          href={`/portal/pets/${pet.id}/vaccinations`}
                          className="text-xs font-medium text-[var(--warn-text)] hover:underline flex items-center gap-0.5"
                        >
                          <Syringe className="w-3 h-3" />
                          {t("updateVaccinations")}
                        </Link>
                      )}
                      {pet.signal.outOfRangeMetrics.length > 0 && (
                        <Link
                          href="/portal/find"
                          className="text-xs font-medium text-[var(--muted)] hover:text-[var(--teal)] hover:underline flex items-center gap-0.5"
                        >
                          <Stethoscope className="w-3 h-3" />
                          {t("findAVet")}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add another */}
          <Link
            href="/portal/pets/new"
            className="card border-dashed p-5 flex flex-col items-center justify-center gap-3 text-[var(--muted)] hover:text-[var(--teal)] hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all no-underline min-h-[168px]"
          >
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{t("addAnotherPet")}</span>
          </Link>
        </div>
      )}

      {/* What is already in motion: appointments booked, orders placed */}
      {(upcomingBookings.length > 0 || recentOrders.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-10">
          {upcomingBookings.length > 0 && (
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  {t("dashUpcomingTitle")}
                </h2>
                <Link
                  href="/portal/bookings"
                  className="text-xs font-medium text-[var(--teal)] hover:underline"
                >
                  {t("dashSeeAll")}
                </Link>
              </div>
              <ul className="space-y-2">
                {upcomingBookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 text-sm">
                    <CalendarCheck className="w-4 h-4 text-[var(--teal)] flex-shrink-0" />
                    <span className="text-[var(--ink)] flex-1 min-w-0 truncate">
                      {t("dashBookingLine", { pet: b.petName, pro: b.proName ?? "" })}
                    </span>
                    <span className="text-xs text-[var(--muted)] tabular-nums flex-shrink-0">
                      {formatIsoDate(b.startDate.toISOString(), locale)}
                    </span>
                    <span
                      className={`badge ${BOOKING_STATUS_CONFIG[b.status as BookingStatusId]?.badge ?? "badge-neutral"}`}
                    >
                      {t(`bookingStatus_${b.status}` as Parameters<typeof t>[0])}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recentOrders.length > 0 && (
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  {t("dashRecentOrdersTitle")}
                </h2>
                <Link
                  href="/portal/orders"
                  className="text-xs font-medium text-[var(--teal)] hover:underline"
                >
                  {t("dashSeeAll")}
                </Link>
              </div>
              <ul className="space-y-2">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 text-sm">
                    <Package className="w-4 h-4 text-[var(--teal)] flex-shrink-0" />
                    <span className="text-[var(--ink)] flex-1 min-w-0 truncate">
                      {formatPrice(o.totalCents, locale)}
                    </span>
                    <span className="text-xs text-[var(--muted)] tabular-nums flex-shrink-0">
                      {formatIsoDate(o.createdAt.toISOString(), locale)}
                    </span>
                    <span
                      className={`badge ${ORDER_STATUS_CONFIG[o.status as OrderStatusId]?.badge ?? "badge-neutral"}`}
                    >
                      {t(`orderStatus_${o.status}` as Parameters<typeof t>[0])}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <QuickActions locale={locale} isProfessional={isProfessional} isSeller={isSeller} />
    </div>
  );
}
