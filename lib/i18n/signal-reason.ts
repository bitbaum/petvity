import type { SignalReasonData } from "@/lib/domain/pet-signal";

/**
 * Just enough of next-intl's `t` to build these sentences.
 *
 * It is written structurally rather than imported because this module is also
 * called from a server component and from a client one, and because the key is
 * composed at runtime (`metric_${id}`) — which the real, literal-keyed type
 * rejects by design. The values a reason interpolates are counts, days,
 * formatted measurements and nested translations: numbers and strings, so that
 * is what this says. It used to say `any`, which asserted nothing at all.
 */
type TSignal = (key: string, values?: Record<string, string | number>) => string;

export function translateSignalReason(data: SignalReasonData, tSignal: TSignal): string {
  const parts: string[] = [];

  switch (data.type) {
    case "no_metrics":
      parts.push(tSignal("reasonNoMetrics"));
      if (data.overdueVaccinations > 0)
        parts.push(tSignal("reasonOverdueVaccinations", { count: data.overdueVaccinations }));
      break;
    case "stale":
      parts.push(tSignal("reasonStale", { days: data.days }));
      if (data.overdueVaccinations > 0)
        parts.push(tSignal("reasonOverdueVaccinations", { count: data.overdueVaccinations }));
      break;
    case "out_of_range":
      for (const d of data.details)
        parts.push(
          tSignal("reasonOutOfRange", {
            metric: tSignal(`metric_${d.id}`),
            value: d.formattedValue,
            range: d.formattedRange,
          }),
        );
      if (data.overdueVaccinations > 0)
        parts.push(tSignal("reasonOverdueVaccinations", { count: data.overdueVaccinations }));
      break;
    case "overdue_only":
      parts.push(tSignal("reasonOverdueVaccinations", { count: data.count }));
      break;
    case "healthy":
      break;
  }

  return parts.join(" · ");
}
