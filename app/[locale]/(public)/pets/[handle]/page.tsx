import { notFound } from "next/navigation";
import { getInstance } from "@/lib/db";
import { pets, healthMetrics, vaccinations } from "@/lib/db/schema";
import { and, eq, gte, desc } from "drizzle-orm";
import { APP, APP_URL } from "@/lib/config/app";
import { SPECIES_CONFIG } from "@/lib/config/species";
import { SIGNAL_BG_CLASSES, SIGNAL_METRIC_WINDOW_DAYS } from "@/lib/config/pet-signal";
import { TWIN_STATE_CONFIG } from "@/lib/config/digital-twin";
import { HEALTH_CHART_WINDOW_DAYS } from "@/lib/config/health-metrics";
import type { SpeciesId } from "@/lib/config/species";
import { computePetSignal } from "@/lib/domain/pet-signal";
import { countOverdueVaccinations } from "@/lib/config/vaccinations";
import { computeDigitalTwin } from "@/lib/domain/digital-twin";
import { formatDateShort } from "@/lib/utils/format";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/i18n/alternates";
import { translateSignalReason } from "@/lib/i18n/signal-reason";
import { UploadedImage } from "@/components/ui/UploadedImage";

/** Cache public pet profiles for 60 s (ISR stale-while-revalidate). */
export const revalidate = 60;

const TWIN_METRIC_LABELS: Record<string, string> = {
  energy: "metricEnergy",
  mood: "metricMood",
  anxiety: "metricAnxiety",
  socialization: "metricSocialization",
};
const TWIN_SCALE: Record<string, string[]> = {
  energy: ["energyScale1", "energyScale2", "energyScale3", "energyScale4", "energyScale5"],
  mood: ["moodScale1", "moodScale2", "moodScale3", "moodScale4", "moodScale5"],
  anxiety: ["anxietyScale1", "anxietyScale2", "anxietyScale3", "anxietyScale4", "anxietyScale5"],
  socialization: [
    "socializationScale1",
    "socializationScale2",
    "socializationScale3",
    "socializationScale4",
    "socializationScale5",
  ],
};

type Params = { params: Promise<{ handle: string; locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle, locale } = await params;
  const db = getInstance();

  const pet = await db.query.pets.findFirst({
    where: and(eq(pets.handle, handle), eq(pets.isPublic, true)),
  });
  if (!pet) return { title: APP.name };

  const tPub = await getTranslations({ locale, namespace: "public" });
  const speciesLabel = tPub(`species_${pet.species}` as Parameters<typeof tPub>[0]);
  const title = `${pet.name} · ${APP.name}`;
  const description =
    [speciesLabel, pet.breed, pet.bio].filter(Boolean).join(" · ") ||
    `${pet.name} is on ${APP.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_URL}/${locale}/pets/${handle}`,
      siteName: APP.name,
      type: "profile",
      ...(pet.avatarUrl ? { images: [{ url: pet.avatarUrl, alt: pet.name }] } : {}),
    },
    twitter: {
      card: pet.avatarUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(pet.avatarUrl ? { images: [pet.avatarUrl] } : {}),
    },
    alternates: buildAlternates(`/pets/${handle}`),
  };
}

export default async function PublicPetPage({ params }: Params) {
  const { handle, locale } = await params;
  const [t, tNav, tSignal, tTwin] = await Promise.all([
    getTranslations({ locale, namespace: "public" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "signal" }),
    getTranslations({ locale, namespace: "twin" }),
  ]);
  const db = getInstance();

  const pet = await db.query.pets.findFirst({
    where: and(eq(pets.handle, handle), eq(pets.isPublic, true)),
  });
  if (!pet) notFound();

  const speciesDef = SPECIES_CONFIG[pet.species as SpeciesId];

  // Fetch recent metrics (30-day window for chart/twin) and vaccinations (for live signal)
  const now = new Date();
  const since30 = new Date(now.getTime() - HEALTH_CHART_WINDOW_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const sinceSignal = new Date(now.getTime() - SIGNAL_METRIC_WINDOW_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const [recentMetrics, petVaccinations] = await Promise.all([
    db.query.healthMetrics.findMany({
      where: and(eq(healthMetrics.petId, pet.id), gte(healthMetrics.date, since30)),
      orderBy: [desc(healthMetrics.date)],
    }),
    db
      .select({ nextDueDate: vaccinations.nextDueDate, status: vaccinations.status })
      .from(vaccinations)
      .where(eq(vaccinations.petId, pet.id)),
  ]);

  // Compute signal live (consistent with portal pet profile)
  const signalMetrics = recentMetrics.filter((m) => m.date >= sinceSignal);
  const overdueCount = countOverdueVaccinations(petVaccinations, today);
  const signalResult = computePetSignal({
    species: pet.species as SpeciesId,
    recentMetrics: signalMetrics,
    overdueVaccinations: overdueCount,
    petCreatedAt: pet.createdAt,
  });
  const signal = signalResult.signal;

  const twin = computeDigitalTwin(recentMetrics);
  const twinCfg = TWIN_STATE_CONFIG[twin.id];

  const petSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${pet.name} on ${APP.name}`,
    url: `${APP_URL}/${locale}/pets/${pet.handle}`,
    mainEntity: {
      "@type": "Thing",
      name: pet.name,
      description: pet.bio ?? undefined,
      image: pet.avatarUrl ?? undefined,
    },
  };

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(petSchema) }}
      />
      {/* Nav */}
      <nav className="bg-white border-b border-[var(--border)] px-6 h-14 flex items-center justify-between">
        <Link href={`/${locale}`} className="font-bold text-[var(--warm-ink)] text-lg no-underline">
          {APP.name}
        </Link>
        <Link href="/register" className="btn-editorial-sm">
          {t("trackYourPet")}
        </Link>
      </nav>

      {/* Profile */}
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
          {/* Avatar header */}
          <div className="bg-[var(--warm-dark)] h-28 flex items-end justify-center pb-0 relative">
            <div className="absolute bottom-0 translate-y-1/2 w-24 h-24 rounded-full bg-[var(--accent-light)] border-4 border-white flex items-center justify-center text-4xl overflow-hidden">
              {pet.avatarUrl ? (
                <UploadedImage src={pet.avatarUrl} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                (speciesDef?.emoji ?? "🐾")
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pt-16 pb-6 px-6 text-center">
            <h1 className="font-display font-light text-4xl text-[var(--warm-ink)]">{pet.name}</h1>
            {pet.handle && <p className="text-sm text-[var(--muted)] mb-2">@{pet.handle}</p>}
            <span className={`${SIGNAL_BG_CLASSES[signal]} mt-1`}>{tSignal(signal)}</span>
            {signal !== "healthy" && (
              <p className="text-xs text-[var(--muted)] mt-1 mb-1">
                {translateSignalReason(signalResult.reasonData, tSignal)}
              </p>
            )}
            <p className="text-sm text-[var(--muted)] mt-2">
              {t(`species_${pet.species}` as Parameters<typeof t>[0])}
              {pet.breed ? ` · ${pet.breed}` : ""}
              {pet.sex !== "unknown" ? ` · ${t(`sex_${pet.sex}` as Parameters<typeof t>[0])}` : ""}
              {pet.birthDate
                ? ` · ${t("bornDate", { date: formatDateShort(pet.birthDate, locale) })}`
                : ""}
            </p>
            {pet.bio && <p className="mt-4 text-sm text-[var(--ink2)]">{pet.bio}</p>}
          </div>

          {/* Digital twin — only shown when data exists */}
          {twin.id !== "no_data" && (
            <div className={`border-t border-[var(--border)] px-6 py-5 ${twinCfg.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-sm font-semibold ${twinCfg.text}`}>{tTwin(twin.id)}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {tTwin(twin.summaryKey as Parameters<typeof tTwin>[0])}
                  </p>
                </div>
                <span className={`text-2xl font-extrabold tabular-nums ${twinCfg.text}`}>
                  {twin.scorePercent}
                  <span className="text-sm font-normal text-[var(--muted)] ms-1">/ 100</span>
                </span>
              </div>
              {/* Overall bar */}
              <div className="h-2 rounded-full bg-[var(--border)] mb-4">
                <div
                  className={`h-2 rounded-full ${twinCfg.barColor}`}
                  style={{ width: `${twin.scorePercent}%` }}
                />
              </div>
              {/* Metric bars */}
              {twin.metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {twin.metrics.map((m) => (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--muted)]">
                          {tTwin((TWIN_METRIC_LABELS[m.id] ?? m.id) as Parameters<typeof tTwin>[0])}
                        </span>
                        <span className="text-[var(--ink2)]">
                          {tTwin(
                            (TWIN_SCALE[m.id]?.[m.rawValue - 1] ??
                              String(m.rawValue)) as Parameters<typeof tTwin>[0],
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--border)]">
                        <div
                          className={`h-1.5 rounded-full ${twinCfg.barColor}`}
                          style={{ width: `${m.fillPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Species info */}
          {speciesDef && (
            <div className="border-t border-[var(--border)] px-6 py-4 bg-[var(--off)] text-sm text-center text-[var(--muted)]">
              {t("typicalLifespan", {
                min: speciesDef.typicalLifespanYears.min,
                max: speciesDef.typicalLifespanYears.max,
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--muted)] mb-3">{t("trackOwn", { app: APP.name })}</p>
          <Link href="/register" className="btn-editorial">
            {tNav("getStartedFree")}
          </Link>
        </div>
      </div>
    </div>
  );
}
