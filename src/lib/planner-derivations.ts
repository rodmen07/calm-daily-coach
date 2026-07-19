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

/**
 * Today's loop progress for the dashboard ring. The daily cycle has two
 * tracked milestones: a plan exists (halfway) and the check-in is submitted
 * (complete). This intentionally presents today only: no history, no streaks.
 */
export function deriveTodayLoopPercent(hasPlan: boolean, hasCheckedIn: boolean): number {
  if (hasCheckedIn) {
    return 100;
  }
  if (hasPlan) {
    return 50;
  }
  return 0;
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
