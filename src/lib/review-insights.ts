import type { BrowserCheckin, WeeklySummary } from "@/lib/browser-checkins";
import type { DailyDose } from "@/lib/plan";

export type SkipReasonInsight = {
  date: string;
  focus: string;
  reason: string;
  recommendation: string;
};

export function getCompletionPercent(weeklySummary: WeeklySummary | null): number {
  if (!weeklySummary || weeklySummary.total === 0) {
    return 0;
  }

  return Math.round((weeklySummary.done / weeklySummary.total) * 100);
}

export function filterCheckinsInWindow(
  checkins: BrowserCheckin[],
  weeklySummary: WeeklySummary | null,
): BrowserCheckin[] {
  if (!weeklySummary) {
    return [];
  }

  return checkins.filter((checkin) => {
    return checkin.date >= weeklySummary.windowStart && checkin.date <= weeklySummary.windowEnd;
  });
}

export function getMostUsedDose(checkinsInWindow: BrowserCheckin[]): DailyDose | "N/A" {
  if (checkinsInWindow.length === 0) {
    return "N/A";
  }

  const counts: Record<DailyDose, number> = { light: 0, medium: 0, deep: 0 };
  for (const checkin of checkinsInWindow) {
    counts[checkin.dose] += 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? (sorted[0][0] as DailyDose) : "N/A";
}

export function getPeakCompletionWindow(checkinsInWindow: BrowserCheckin[]): string {
  const completed = checkinsInWindow.filter((checkin) => checkin.status === "done");
  if (completed.length === 0) {
    return "N/A";
  }

  const windows = {
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
    Night: 0,
  };

  for (const checkin of completed) {
    if (!checkin.createdAt) {
      continue;
    }

    const hour = new Date(checkin.createdAt).getHours();
    if (hour >= 5 && hour < 12) {
      windows.Morning += 1;
    } else if (hour >= 12 && hour < 17) {
      windows.Afternoon += 1;
    } else if (hour >= 17 && hour < 21) {
      windows.Evening += 1;
    } else {
      windows.Night += 1;
    }
  }

  const sorted = Object.entries(windows).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? `${sorted[0][0]} (${sorted[0][1]} complete)` : "N/A";
}

export function getPatternSummary(completionPercent: number): string {
  if (completionPercent === 100) {
    return "Incredible discipline! You executed every single daily dose this week with zero skips. Plan details and doses matched your target energy perfectly.";
  }

  if (completionPercent >= 70) {
    return "Excellent consistency. You are building strong momentum, protecting your focus across most sessions while keeping skipped items minimal.";
  }

  if (completionPercent >= 40) {
    return "Steady progress. You are balancing execution with intentional skips when reality intervenes. Try keeping notes detailed to help adapt tomorrow's focus.";
  }

  if (completionPercent > 0) {
    return "Early momentum. Focus on setting light doses (5 minutes) until the habit of logging feels frictionless and natural.";
  }

  return "No completions yet in this window. Choose focus areas that fit your current energy limits and begin with light doses.";
}

function recommendationForSkipReason(reason: string): string {
  const reasonLower = reason.toLowerCase();

  if (reasonLower.includes("switching") || reasonLower.includes("context") || reasonLower.includes("task")) {
    return "Try a 3-minute warm-up transition before starting your focus task.";
  }

  if (reasonLower.includes("time") || reasonLower.includes("busy") || reasonLower.includes("schedule")) {
    return "Default to a light (5-minute) dose tomorrow to guard against crowded calendar blocks.";
  }

  if (reasonLower.includes("distract") || reasonLower.includes("interrupted") || reasonLower.includes("phone")) {
    return "Enable quiet modes or use full-screen focus timers for this session.";
  }

  if (reasonLower.includes("energy") || reasonLower.includes("tired") || reasonLower.includes("exhausted")) {
    return "Choose restorative focus steps or reduce the session's friction.";
  }

  return "Simplify action steps or scale down the duration.";
}

export function getSkipReasonInsights(checkinsInWindow: BrowserCheckin[]): SkipReasonInsight[] {
  return checkinsInWindow
    .filter((checkin) => checkin.status === "skipped" && checkin.skipReason)
    .map((checkin) => {
      const reason = checkin.skipReason ?? "";
      return {
        date: checkin.date,
        focus: checkin.focus,
        reason,
        recommendation: recommendationForSkipReason(reason),
      };
    });
}
