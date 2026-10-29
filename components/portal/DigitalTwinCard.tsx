"use client";

import Link from "next/link";
import { Meter } from "@bitbaum/chartkit/react";
import {
  Zap,
  Smile,
  Wind,
  Users,
  Brain,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { TWIN_STATE_CONFIG, TWIN_TREND_CONFIG } from "@/lib/config/digital-twin";
import type { TwinState, TwinTrend } from "@/lib/domain/digital-twin";
import { useTranslations } from "next-intl";
import { petHealthLogPath } from "@/lib/config/routes";

const METRIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mood: Smile,
  energy: Zap,
  anxiety: Wind,
  socialization: Users,
};

// Explicit lookup tables — safe fallback if a metric id is unexpected
const TWIN_METRIC_LABEL_KEYS: Record<string, string> = {
  energy: "metricEnergy",
  mood: "metricMood",
  anxiety: "metricAnxiety",
  socialization: "metricSocialization",
};
const TWIN_SCALE_KEYS: Record<string, string[]> = {
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

// Icon mapping stays in the component (React component references are UI, not config)
const TREND_ICONS: Record<TwinTrend, React.ComponentType<{ className?: string }>> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
  insufficient_data: Minus,
};

type Props = {
  twin: TwinState;
  petId: string;
  petName: string;
};

export function DigitalTwinCard({ twin, petId, petName }: Props) {
  const t = useTranslations("portal");
  const tTwin = useTranslations("twin");
  const cfg = TWIN_STATE_CONFIG[twin.id];
  const trendCfg = TWIN_TREND_CONFIG[twin.trend];
  const TrendIcon = TREND_ICONS[twin.trend];

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 ${cfg.bg} border-b border-[var(--border)]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className={`w-4 h-4 ${cfg.text}`} />
            <span className={`text-sm font-semibold ${cfg.text}`}>{t("digitalTwinTitle")}</span>
          </div>
          <div className="flex items-center gap-3">
            {twin.trend !== "insufficient_data" && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trendCfg.color}`}>
                <TrendIcon className="w-3.5 h-3.5" />
                <span>{tTwin(twin.trend)}</span>
                {twin.trendDelta !== 0 && (
                  <span className="tabular-nums">
                    {twin.trendDelta > 0 ? `+${twin.trendDelta}` : twin.trendDelta}
                  </span>
                )}
              </div>
            )}
            {twin.daysAgo !== null && (
              <span className="text-xs text-[var(--muted)]">
                {twin.daysAgo === 0
                  ? t("today")
                  : twin.daysAgo === 1
                    ? t("yesterday")
                    : t("daysAgo", { count: twin.daysAgo })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        {twin.id === "no_data" ? (
          /* ── No data ──────────────────────────────────────────── */
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--teal-light)] flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-[var(--teal)]" />
            </div>
            <p className="text-sm font-medium text-[var(--ink)] mb-1">
              {t("twinNotActiveTitle", { name: petName })}
            </p>
            <p className="text-xs text-[var(--muted)] mb-4 max-w-xs mx-auto">
              {t("twinNotActiveDesc", { name: petName })}
            </p>
            <Link href={petHealthLogPath(petId)} className="btn-primary text-sm">
              <CalendarDays className="w-4 h-4" />
              {t("healthLogFirst")}
            </Link>
          </div>
        ) : (
          /* ── Active twin ──────────────────────────────────────── */
          <div className="space-y-4">
            {/* Score + summary */}
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <p className={`text-xl font-bold ${cfg.text}`}>{tTwin(twin.id)}</p>
                <p className="text-sm text-[var(--ink2)] mt-0.5">
                  {tTwin(twin.summaryKey as Parameters<typeof tTwin>[0])}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-3xl font-extrabold tabular-nums ${cfg.text}`}>
                  {twin.scorePercent}
                </span>
                <span className="text-sm text-[var(--muted)] ms-1">/ 100</span>
                {/* Distinguishes this emotional-only score from the all-metric
                    wellness % on the health page */}
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)] mt-0.5">
                  {tTwin("emotionalScoreLabel")}
                </p>
                <Meter
                  value={twin.scorePercent}
                  max={100}
                  label={tTwin("emotionalScoreLabel")}
                  tone={cfg.meterTone}
                  showValue={false}
                />
              </div>
            </div>

            {/* Individual metric rows */}
            {twin.metrics.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {twin.metrics.map((m) => {
                  const Icon = METRIC_ICONS[m.id] ?? Brain;
                  const metricLabel = tTwin(
                    (TWIN_METRIC_LABEL_KEYS[m.id] ?? m.id) as Parameters<typeof tTwin>[0],
                  );
                  const scaleLabel = tTwin(
                    (TWIN_SCALE_KEYS[m.id]?.[m.rawValue - 1] ?? String(m.rawValue)) as Parameters<
                      typeof tTwin
                    >[0],
                  );
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--muted)]" />
                        <span className="text-xs font-medium text-[var(--ink2)]">
                          {metricLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[var(--muted)] text-end">{scaleLabel}</span>
                        <Meter
                          value={m.fillPercent}
                          max={100}
                          label={metricLabel}
                          tone={cfg.meterTone}
                          showValue={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stale data nudge */}
            {twin.daysAgo !== null && twin.daysAgo > 0 && (
              <div className="pt-1 border-t border-[var(--border)]">
                <Link
                  href={petHealthLogPath(petId)}
                  className="text-xs text-[var(--teal)] hover:underline inline-flex items-center gap-1"
                >
                  <CalendarDays className="w-3 h-3" />
                  {t("twinLogToUpdate")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
