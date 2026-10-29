import type { SpeciesId } from "./species";
import type { PetWellnessSignal } from "./pet-signal";
import { SIGNAL_WATCH_METRIC_COUNT, SIGNAL_CONCERN_METRIC_COUNT } from "./pet-signal";

export type MetricCategory = "physical" | "emotional";

export type MetricId =
  "weight" | "temperature" | "heart_rate" | "energy" | "mood" | "anxiety" | "socialization";

export type NormalRange = { min: number; max: number };

export type MetricDef = {
  id: MetricId;
  category: MetricCategory;
  label: string;
  unit: string;
  /** Conversion: stored value → display value */
  toDisplay: (stored: number) => number;
  /** Conversion: display value → stored value */
  toStorage: (display: number) => number;
  /**
   * Normal ranges keyed by species ID.
   * Falls back to "default" if the species has no specific range.
   */
  normalRange: Partial<Record<SpeciesId, NormalRange>> & {
    default: NormalRange;
  };
  /** For 1–5 scale metrics */
  scale?: { min: number; max: number };
  /** Lucide icon name */
  icon: string;
  description: string;
  /**
   * true = higher stored value = worse outcome (e.g. anxiety).
   * The signal algorithm inverts the out-of-range check for these.
   */
  inverted?: boolean;
};

/** Days of health metric history shown in charts and public profiles. */
export const HEALTH_CHART_WINDOW_DAYS = 30;

export const HEALTH_METRIC_CONFIG: Record<MetricId, MetricDef> = {
  // ── Physical ────────────────────────────────────────────────────────────

  weight: {
    id: "weight",
    category: "physical",
    label: "Weight",
    unit: "kg",
    toDisplay: (g) => parseFloat((g / 1000).toFixed(3)),
    toStorage: (kg) => Math.round(kg * 1000),
    normalRange: {
      dog: { min: 1500, max: 90000 },
      cat: { min: 2500, max: 8000 },
      horse: { min: 380000, max: 1200000 },
      bird: { min: 15, max: 1500 },
      rabbit: { min: 1000, max: 8000 },
      guinea_pig: { min: 700, max: 1200 },
      hamster: { min: 25, max: 200 },
      reptile: { min: 10, max: 60000 },
      fish: { min: 5, max: 10000 },
      default: { min: 50, max: 200000 },
    },
    icon: "Scale",
    description: "Body weight in kilograms",
  },

  temperature: {
    id: "temperature",
    category: "physical",
    label: "Temperature",
    unit: "°C",
    toDisplay: (cd) => parseFloat((cd / 100).toFixed(2)),
    toStorage: (c) => Math.round(c * 100),
    normalRange: {
      dog: { min: 3800, max: 3900 },
      cat: { min: 3800, max: 3925 },
      horse: { min: 3750, max: 3850 },
      bird: { min: 4100, max: 4300 },
      rabbit: { min: 3850, max: 4000 },
      guinea_pig: { min: 3720, max: 3950 },
      hamster: { min: 3700, max: 3850 },
      reptile: { min: 2500, max: 3800 },
      fish: { min: 1800, max: 2800 },
      default: { min: 3700, max: 4100 },
    },
    icon: "Thermometer",
    description: "Body temperature in degrees Celsius",
  },

  heart_rate: {
    id: "heart_rate",
    category: "physical",
    label: "Heart Rate",
    unit: "bpm",
    toDisplay: (v) => v,
    toStorage: (v) => Math.round(v),
    normalRange: {
      dog: { min: 60, max: 140 },
      cat: { min: 120, max: 220 },
      horse: { min: 28, max: 44 },
      bird: { min: 150, max: 500 },
      rabbit: { min: 130, max: 325 },
      guinea_pig: { min: 230, max: 380 },
      hamster: { min: 300, max: 600 },
      reptile: { min: 30, max: 150 },
      default: { min: 40, max: 400 },
    },
    icon: "HeartPulse",
    description: "Resting heart rate in beats per minute",
  },

  // ── Emotional (1–5 scale) ────────────────────────────────────────────────

  energy: {
    id: "energy",
    category: "emotional",
    label: "Energy Level",
    unit: "/5",
    toDisplay: (v) => v,
    toStorage: (v) => Math.round(v),
    scale: { min: 1, max: 5 },
    normalRange: { default: { min: 3, max: 5 } },
    icon: "Zap",
    description: "1 = depleted, 5 = very energetic",
  },

  mood: {
    id: "mood",
    category: "emotional",
    label: "Mood",
    unit: "/5",
    toDisplay: (v) => v,
    toStorage: (v) => Math.round(v),
    scale: { min: 1, max: 5 },
    normalRange: { default: { min: 3, max: 5 } },
    icon: "Smile",
    description: "1 = very low, 5 = very happy",
  },

  anxiety: {
    id: "anxiety",
    category: "emotional",
    label: "Anxiety",
    unit: "/5",
    toDisplay: (v) => v,
    toStorage: (v) => Math.round(v),
    scale: { min: 1, max: 5 },
    normalRange: { default: { min: 1, max: 2 } },
    icon: "Activity",
    description: "1 = calm, 5 = highly anxious",
    inverted: true,
  },

  socialization: {
    id: "socialization",
    category: "emotional",
    label: "Socialization",
    unit: "/5",
    toDisplay: (v) => v,
    toStorage: (v) => Math.round(v),
    scale: { min: 1, max: 5 },
    normalRange: { default: { min: 3, max: 5 } },
    icon: "Users",
    description: "1 = withdrawn, 5 = very sociable",
  },
};

export const PHYSICAL_METRICS: MetricId[] = ["weight", "temperature", "heart_rate"];
export const EMOTIONAL_METRICS: MetricId[] = ["energy", "mood", "anxiety", "socialization"];

/** Get the normal range for a metric, falling back to "default". */
export function getNormalRange(metricId: MetricId, speciesId: SpeciesId): NormalRange {
  const def = HEALTH_METRIC_CONFIG[metricId];
  return def.normalRange[speciesId] ?? def.normalRange.default;
}

/** Check whether a stored metric value is within the normal range for the species. */
export function isMetricInRange(
  metricId: MetricId,
  storedValue: number,
  speciesId: SpeciesId,
): boolean {
  const range = getNormalRange(metricId, speciesId);
  return storedValue >= range.min && storedValue <= range.max;
}

/** Compute the wellness signal from a set of out-of-range metric counts. */
export function signalFromOutOfRangeCount(count: number): PetWellnessSignal {
  if (count >= SIGNAL_CONCERN_METRIC_COUNT) return "concern";
  if (count >= SIGNAL_WATCH_METRIC_COUNT) return "watch";
  return "healthy";
}
