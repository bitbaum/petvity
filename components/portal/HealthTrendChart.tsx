import { LineChart } from "@bitbaum/chartkit/react";

/** One day's readings: `date` is the ISO day (YYYY-MM-DD), every other key a metric. */
export type ChartDataPoint = { date: string } & Record<string, number | string | null>;

type Props = {
  data: ChartDataPoint[];
  lines: { dataKey: string; name: string }[];
  /** Shown with every value: "kg", "°C", "bpm". Left out for the 1–5 scales. */
  unit?: string;
  title: string;
  normalMin?: number;
  normalMax?: number;
  locale: string;
  periodLabel: string;
  noDataText?: string;
  normalRangeLabel?: string;
};

/**
 * A 30-day health trend on @bitbaum/chartkit: one line per metric, the
 * species' normal range as a reference band, dates on the axis. A day with no
 * reading for a metric is left out of that line rather than drawn as zero.
 */
export function HealthTrendChart({
  data,
  lines,
  unit,
  title,
  normalMin,
  normalMax,
  locale,
  periodLabel,
  noDataText = "No data yet",
  normalRangeLabel = "Normal range",
}: Props) {
  const series = lines
    .map((l) => ({
      id: l.dataKey,
      label: l.name,
      points: data.flatMap((d) => {
        const y = d[l.dataKey];
        return typeof y === "number" ? [{ x: d.date, y }] : [];
      }),
    }))
    .filter((s) => s.points.length > 0);

  return (
    <div className="card p-5 min-w-0">
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">{title}</h3>
      {series.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-[var(--faint)]">
          {noDataText}
        </div>
      ) : (
        <LineChart
          series={series}
          unit={unit}
          caption={title}
          height={160}
          yFrom="data"
          locale={locale}
          periodLabel={periodLabel}
          referenceBands={
            normalMin != null && normalMax != null
              ? [{ from: normalMin, to: normalMax, label: normalRangeLabel }]
              : []
          }
        />
      )}
    </div>
  );
}
