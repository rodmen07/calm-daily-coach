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
