import { auth } from "@/lib/auth";
import { getInstance } from "@/lib/db";
import {
  pets,
  healthMetrics,
  healthRecords,
  vaccinations,
  medications,
  petSignalHistory,
} from "@/lib/db/schema";
import { and, eq, gte, desc, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { computePetSignal } from "@/lib/domain/pet-signal";
import { computeDigitalTwin } from "@/lib/domain/digital-twin";
import {
  SIGNAL_BG_CLASSES,
  SIGNAL_HERO_BG,
  SIGNAL_METRIC_WINDOW_DAYS,
} from "@/lib/config/pet-signal";
import { SPECIES_CONFIG } from "@/lib/config/species";
import { countOverdueVaccinations } from "@/lib/config/vaccinations";
import type { SpeciesId } from "@/lib/config/species";
import { formatDateShort, formatPetAge } from "@/lib/utils/format";
import { getPortalLocale } from "@/lib/i18n/portal-locale";
import { getTranslations } from "next-intl/server";
import { translateSignalReason } from "@/lib/i18n/signal-reason";
import {
  Activity,
  Syringe,
  FileText,
  Pill,
  Pencil,
  Trash2,
  ChevronLeft,
  CalendarDays,
  Heart,
  Stethoscope,
} from "lucide-react";
import { DigitalTwinCard } from "@/components/portal/DigitalTwinCard";
import { SignalHistoryTimeline } from "@/components/portal/SignalHistoryTimeline";
import { UploadedImage } from "@/components/ui/UploadedImage";

type Params = { params: Promise<{ petId: string }> };

export default async function PetProfilePage({ params }: Params) {
  const session = await auth();
  if (!session) return null;

  const { petId } = await params;
  const db = getInstance();

  const pet = await db.query.pets.findFirst({
    where: and(eq(pets.id, petId), eq(pets.ownerId, session.user.id)),
  });
  if (!pet) notFound();

  const now = new Date();
  const sinceStr = new Date(now.getTime() - SIGNAL_METRIC_WINDOW_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  const locale = await getPortalLocale();
  const [t, tSignal, tPub] = await Promise.all([
    getTranslations({ locale, namespace: "portal" }),
    getTranslations({ locale, namespace: "signal" }),
    getTranslations({ locale, namespace: "public" }),
  ]);

  const [recentMetrics, allVacc, activeMeds, [{ recordCount }], signalHistory] = await Promise.all([
    db.query.healthMetrics.findMany({
      where: and(eq(healthMetrics.petId, pet.id), gte(healthMetrics.date, sinceStr)),
      orderBy: [desc(healthMetrics.date)],
    }),
    db.query.vaccinations.findMany({ where: eq(vaccinations.petId, pet.id) }),
    db.query.medications.findMany({
      where: and(eq(medications.petId, pet.id), eq(medications.status, "active")),
    }),
    db.select({ recordCount: count() }).from(healthRecords).where(eq(healthRecords.petId, pet.id)),
    db
      .select()
      .from(petSignalHistory)
      .where(eq(petSignalHistory.petId, pet.id))
      .orderBy(desc(petSignalHistory.recordedAt))
      .limit(5),
  ]);

  const overdueCount = countOverdueVaccinations(allVacc, todayStr);

  const signalResult = computePetSignal({
    species: pet.species as SpeciesId,
    recentMetrics,
    overdueVaccinations: overdueCount,
    petCreatedAt: pet.createdAt,
    now,
  });

  const speciesDef = SPECIES_CONFIG[pet.species as SpeciesId];
  const sig = signalResult.signal;
  const age = formatPetAge(pet.birthDate ?? null, tPub);

  const twin = computeDigitalTwin(recentMetrics, now);

  const tabLinks = [
    {
      href: `/portal/pets/${pet.id}/health`,
      icon: Activity,
      label: t("healthBack"),
      desc: t("petNavHealthDesc"),
    },
    {
      href: `/portal/pets/${pet.id}/records`,
      icon: FileText,
      label: t("petNavRecords"),
      desc:
        recordCount > 0
          ? t("petNavRecordsCount", { count: recordCount })
          : t("petNavHealthHistory"),
    },
    {
      href: `/portal/pets/${pet.id}/vaccinations`,
      icon: Syringe,
      label: t("petNavVaccinations"),
      desc:
        overdueCount > 0
          ? t("petNavVaccOverdue", { count: allVacc.length, overdue: overdueCount })
          : t("petNavVaccLogged", { count: allVacc.length }),
    },
    {
      href: `/portal/pets/${pet.id}/medications`,
      icon: Pill,
      label: t("petNavMedications"),
      desc:
        activeMeds.length > 0
          ? t("petNavMedsActive", { count: activeMeds.length })
          : t("petNavMedsNone"),
    },
  ];

  return (
    <div>
      {/* Back */}
      <Link
        href="/portal/pets"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--teal)] no-underline mb-5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("myPets")}
      </Link>

      {/* Hero header */}
      <div
        className={`card overflow-hidden mb-6 bg-gradient-to-b ${SIGNAL_HERO_BG[sig as keyof typeof SIGNAL_HERO_BG] ?? ""}`}
      >
        <div className="p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl lg:rounded-3xl bg-white shadow-sm flex items-center justify-center text-4xl lg:text-5xl overflow-hidden flex-shrink-0 border border-[var(--border)]">
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

              {/* Info */}
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold text-[var(--ink)]">{pet.name}</h1>
                  <span className={SIGNAL_BG_CLASSES[sig as keyof typeof SIGNAL_BG_CLASSES]}>
                    {tSignal(sig)}
                  </span>
                </div>

                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {tPub(`species_${pet.species}` as Parameters<typeof tPub>[0])}
                  {pet.breed ? ` · ${pet.breed}` : ""}
                  {pet.sex !== "unknown"
                    ? ` · ${tPub(`sex_${pet.sex}` as Parameters<typeof tPub>[0])}`
                    : ""}
                  {age
                    ? ` · ${age}`
                    : pet.birthDate
                      ? ` · ${t("petBorn", { date: formatDateShort(pet.birthDate, locale) })}`
                      : ""}
                </p>

                {pet.bio && <p className="text-sm text-[var(--ink2)] mt-2 max-w-md">{pet.bio}</p>}
              </div>
            </div>

            {/* Edit / delete — delete lives with edit so it is findable
                without hunting through a settings page. */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/portal/pets/${pet.id}/edit`} className="btn-outline text-sm">
                <Pencil className="w-3.5 h-3.5" />
                {t("editButton")}
              </Link>
              <Link
                href={`/portal/pets/${pet.id}/edit#danger`}
                className="btn-ghost text-sm text-[var(--muted)] hover:text-[var(--danger-text)]"
                aria-label={t("petDeleteAria", { name: pet.name ?? "" })}
                title={t("editPetDelete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Signal reason + CTAs */}
          <div className="mt-5 pt-5 border-t border-white/60 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-[var(--ink2)] flex-1">
              {translateSignalReason(signalResult.reasonData, tSignal)}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {sig !== "healthy" && overdueCount > 0 && (
                <Link href={`/portal/pets/${pet.id}/vaccinations`} className="btn-outline text-sm">
                  <Syringe className="w-4 h-4" />
                  {t("updateVaccinations")}
                </Link>
              )}
              {sig !== "healthy" && signalResult.outOfRangeMetrics.length > 0 && (
                <Link href="/portal/find" className="btn-outline text-sm">
                  <Stethoscope className="w-4 h-4" />
                  {t("findAVet")}
                </Link>
              )}
              <Link href={`/portal/pets/${pet.id}/health/log`} className="btn-primary text-sm">
                <CalendarDays className="w-4 h-4" />
                {t("logToday")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Twin */}
      <DigitalTwinCard twin={twin} petId={pet.id} petName={pet.name} />

      {/* Signal History — shown only once at least one transition has been recorded */}
      <SignalHistoryTimeline rows={signalHistory} locale={locale} />

      {/* Section tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {tabLinks.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="card p-4 hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all no-underline group"
          >
            <Icon className="w-5 h-5 text-[var(--teal)] mb-2" />
            <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--teal)]">
              {label}
            </p>
            <p className="text-xs text-[var(--muted)]">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Adoption shortcut */}
      <Link
        href={`/portal/pets/${pet.id}/list-for-adoption`}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors no-underline"
      >
        <Heart className="w-4 h-4 flex-shrink-0" />
        {t("listForAdoption", { petName: pet.name })}
      </Link>
    </div>
  );
}
