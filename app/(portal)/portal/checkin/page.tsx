import { auth } from "@/lib/auth";
import { getInstance } from "@/lib/db";
import { pets, healthMetrics, vaccinations } from "@/lib/db/schema";
import { and, eq, desc, inArray, gte } from "drizzle-orm";
import Link from "next/link";
import { AlertTriangle, CalendarDays, ChevronRight, CheckCircle } from "lucide-react";
import { SPECIES_CONFIG } from "@/lib/config/species";
import {
  SIGNAL_BG_CLASSES,
  SIGNAL_SORT_ORDER,
  SIGNAL_METRIC_WINDOW_DAYS,
  SIGNAL_TEXT_CLASSES,
} from "@/lib/config/pet-signal";
import { countOverdueVaccinations } from "@/lib/config/vaccinations";
import { computePetSignal } from "@/lib/domain/pet-signal";
import type { SpeciesId } from "@/lib/config/species";
import type { PetWellnessSignal } from "@/lib/config/pet-signal";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/portal/PageHeader";
import { getPortalLocale } from "@/lib/i18n/portal-locale";
import { translateSignalReason } from "@/lib/i18n/signal-reason";
import { UploadedImage } from "@/components/ui/UploadedImage";

export default async function CheckinPage() {
  const session = await auth();
  if (!session) return null;

  const locale = await getPortalLocale();
  const [t, tSignal, tPub] = await Promise.all([
    getTranslations({ locale, namespace: "portal" }),
    getTranslations({ locale, namespace: "signal" }),
    getTranslations({ locale, namespace: "public" }),
  ]);

  const db = getInstance();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sinceStr = new Date(now.getTime() - SIGNAL_METRIC_WINDOW_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);

  const userPets = await db.query.pets.findMany({
    where: eq(pets.ownerId, session.user.id),
    orderBy: [desc(pets.createdAt)],
  });

  const petIds = userPets.map((p) => p.id);

  // Batch-fetch today's check-ins + recent metrics + vaccinations (3 queries, no N+1)
  const [todayRows, allMetrics, allVacc] =
    petIds.length > 0
      ? await Promise.all([
          db
            .select({ petId: healthMetrics.petId })
            .from(healthMetrics)
            .where(and(inArray(healthMetrics.petId, petIds), eq(healthMetrics.date, todayStr))),
          db
            .select()
            .from(healthMetrics)
            .where(and(inArray(healthMetrics.petId, petIds), gte(healthMetrics.date, sinceStr))),
          db.select().from(vaccinations).where(inArray(vaccinations.petId, petIds)),
        ])
      : [[], [], []];

  // Group by petId in memory
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

  const checkedInToday = new Set(todayRows.map((r) => r.petId));

  // Compute live signal for each pet (includes vaccination state)
  const petsWithSignal = userPets.map((pet) => {
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
    return { ...pet, signal };
  });

  // Pending first (sorted by signal severity: concern → watch → healthy), then done
  const sorted = [...petsWithSignal].sort((a, b) => {
    const aDone = checkedInToday.has(a.id);
    const bDone = checkedInToday.has(b.id);
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aOrder = SIGNAL_SORT_ORDER[a.signal.signal as PetWellnessSignal] ?? 2;
    const bOrder = SIGNAL_SORT_ORDER[b.signal.signal as PetWellnessSignal] ?? 2;
    return aOrder - bOrder;
  });

  const pendingCount = userPets.length - checkedInToday.size;

  return (
    <div>
      <PageHeader title={t("checkinTitle")} purpose={t("checkinPurpose")} flush />

      {/* Today's progress — a status line, not the page's purpose */}
      <p className="text-[var(--muted)] mt-2 mb-6 text-sm">
        {userPets.length === 0
          ? t("checkinNoPets")
          : pendingCount === 0
            ? t("allCheckedIn", { total: userPets.length })
            : t("partialCheckedIn", {
                done: userPets.length - pendingCount,
                total: userPets.length,
              })}
      </p>

      {userPets.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--teal-light)] flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-7 h-7 text-[var(--teal)]" />
          </div>
          <p className="font-medium text-[var(--ink)] mb-1">{t("noPetsYet")}</p>
          <p className="text-sm text-[var(--muted)] mb-5">{t("checkinNoPets")}</p>
          <Link href="/portal/pets/new" className="btn-primary">
            {t("addPet")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-lg">
          {sorted.map((pet) => {
            const speciesDef = SPECIES_CONFIG[pet.species as SpeciesId];
            const sig = pet.signal.signal;
            const done = checkedInToday.has(pet.id);

            return (
              <Link
                key={pet.id}
                href={`/portal/pets/${pet.id}/health/log`}
                className={`card p-4 flex items-center gap-4 transition-all no-underline ${
                  done
                    ? "opacity-60 hover:opacity-80"
                    : "hover:border-[var(--teal)] hover:shadow-sm"
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-[var(--teal-light)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
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

                {/* Name + species + signal reason */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--ink)]">{pet.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {tPub(`species_${pet.species}` as Parameters<typeof tPub>[0])}
                  </div>
                  {!done && sig !== "healthy" && (
                    <div
                      className={`flex items-center gap-1 mt-1 text-xs ${SIGNAL_TEXT_CLASSES[sig as PetWellnessSignal]}`}
                    >
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {translateSignalReason(pet.signal.reasonData, tSignal)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                {done ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--green-text)] flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t("loggedToday")}
                  </span>
                ) : (
                  <span className={`${SIGNAL_BG_CLASSES[sig]} flex-shrink-0`}>{tSignal(sig)}</span>
                )}

                <ChevronRight className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
