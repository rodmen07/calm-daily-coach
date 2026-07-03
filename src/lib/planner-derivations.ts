import type { WeeklySummary } from "@/lib/browser-checkins";
import type { DailyDose, FocusArea } from "@/lib/plan";

export function doseToRustEffort(dose: DailyDose): "low" | "medium" | "high" {
  if (dose === "light") {
    return "low";
  }
  if (dose === "deep") {
    return "high";
  }
  return "medium";
}

export function deriveTopFocus(weeklySummary: WeeklySummary | null): FocusArea | null {
  if (!weeklySummary) {
    return null;
  }

  const ranked = Object.entries(weeklySummary.byFocus)
    .map(([focusArea, counts]) => ({
      focus: focusArea as FocusArea,
      completed: counts.done,
    }))
    .sort((a, b) => b.completed - a.completed);

  return ranked[0]?.completed > 0 ? ranked[0].focus : null;
}

export function parsePlannerDate(input: string | Date | null | undefined): string | null {
  if (!input) {
    return null;
  }
  try {
    const date = typeof input === "string" ? new Date(input) : input;
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}
