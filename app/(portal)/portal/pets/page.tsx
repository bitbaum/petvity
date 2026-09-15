import { auth } from "@/lib/auth";
import { getInstance } from "@/lib/db";
import { pets, healthMetrics, vaccinations } from "@/lib/db/schema";
import { eq, desc, inArray, max, gte, and } from "drizzle-orm";
import Link from "next/link";
import { SPECIES_CONFIG } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import {
  SIGNAL_BG_CLASSES,
  SIGNAL_SORT_ORDER,
  SIGNAL_METRIC_WINDOW_DAYS,
} from "@/lib/config/pet-signal";
import type { PetWellnessSignal } from "@/lib/config/pet-signal";
import { computePetSignal } from "@/lib/domain/pet-signal";
import { countOverdueVaccinations } from "@/lib/config/vaccinations";
import { formatRelativeDate } from "@/lib/utils/format";
import { EmptyState } from "@/components/portal/PageState";
import PageHeader from "@/components/portal/PageHeader";
import { Plus, ChevronRight, PawPrint } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPortalLocale } from "@/lib/i18n/portal-locale";
import { UploadedImage } from "@/components/ui/UploadedImage";

export default async function PetsPage() {
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

  // Batch-fetch: last check-in date (all-time) + recent metrics + vaccinations (no N+1)
  const [lastLogRows, allMetrics, allVacc] =
    petIds.length > 0
      ? await Promise.all([
          db
            .select({ petId: healthMetrics.petId, lastDate: max(healthMetrics.date) })
            .from(healthMetrics)
            .where(inArray(healthMetrics.petId, petIds))
            .groupBy(healthMetrics.petId),
          db
            .select()
            .from(healthMetrics)
            .where(and(inArray(healthMetrics.petId, petIds), gte(healthMetrics.date, sinceStr))),
          db.select().from(vaccinations).where(inArray(vaccinations.petId, petIds)),
        ])
      : [[], [], []];

  const lastLogMap = new Map(lastLogRows.map((r) => [r.petId, r.lastDate]));

  // Group metrics + vaccinations by petId for O(1) lookup
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

  // Compute live signal for each pet
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

  // Sort by live signal severity (concern → watch → healthy), then newest first
  const sortedPets = [...petsWithSignal].sort((a, b) => {
    const aOrder = SIGNAL_SORT_ORDER[a.signal.signal as PetWellnessSignal] ?? 2;
    const bOrder = SIGNAL_SORT_ORDER[b.signal.signal as PetWellnessSignal] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div>
      <PageHeader
        title={t("myPets")}
        purpose={t("petsPurpose")}
        action={
          <Link href="/portal/pets/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            {t("addPet")}
          </Link>
        }
      />

      {userPets.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={t("noPetsYet")}
          body={t("petsEmptyDesc")}
          actions={
            <Link href="/portal/pets/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              {t("addYourFirstPet")}
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedPets.map((pet) => {
            const speciesDef = SPECIES_CONFIG[pet.species as SpeciesId];
            const sig = pet.signal.signal as PetWellnessSignal;
            const lastDate = lastLogMap.get(pet.id) ?? null;
            return (
              <Link
                key={pet.id}
                href={`/portal/pets/${pet.id}`}
                className="card p-4 flex items-center gap-4 hover:border-[var(--teal)] hover:shadow-md transition-all no-underline group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--light)] flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--ink)] group-hover:text-[var(--teal)] transition-colors">
                    {pet.name}
                  </p>
                  <p className="text-sm text-[var(--muted)] truncate">
                    {tPub(`species_${pet.species}` as Parameters<typeof tPub>[0])}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                    {pet.sex !== "unknown"
                      ? ` · ${tPub(`sex_${pet.sex}` as Parameters<typeof tPub>[0])}`
                      : ""}
                  </p>
                  {lastDate && (
                    <p className="text-xs text-[var(--faint)] mt-0.5">
                      {t("lastCheckin", { date: formatRelativeDate(lastDate, locale) })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${SIGNAL_BG_CLASSES[sig]}`}
                  >
                    {tSignal(sig)}
                  </span>
                  {pet.isPublic && (
                    <span className="text-xs bg-[var(--teal-light)] text-[var(--teal)] px-2.5 py-1 rounded-full font-medium hidden sm:inline">
                      {t("publicBadge")}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[var(--faint)] group-hover:text-[var(--teal)] transition-colors" />
                </div>
              </Link>
            );
          })}

          {/* Add another */}
          <Link
            href="/portal/pets/new"
            className="card p-4 flex items-center gap-4 border-dashed text-[var(--muted)] hover:text-[var(--teal)] hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all no-underline"
          >
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-current flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{t("addAnotherPet")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
