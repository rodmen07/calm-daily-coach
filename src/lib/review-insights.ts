import type { BrowserCheckin, WeeklySummary } from "@/lib/browser-checkins";
import type { DailyDose } from "@/lib/plan";

export type SkipReasonInsight = {
  date: string;
  focus: string;
  reason: string;
  recommendation: string;
};

export type WeekOverWeekChange = {
  hasPriorData: boolean;
  doneDelta: number;
  completionDelta: number;
  currentTopFocus: string | null;
  priorTopFocus: string | null;
  narrative: string;
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

function addDays(dateInput: string, delta: number): string {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function topFocusFromCheckins(checkins: BrowserCheckin[]): string | null {
  const doneByFocus = new Map<string, number>();
  for (const checkin of checkins) {
    if (checkin.status === "done") {
      doneByFocus.set(checkin.focus, (doneByFocus.get(checkin.focus) ?? 0) + 1);
    }
  }

  let top: string | null = null;
  let topCount = 0;
  for (const [focus, count] of doneByFocus) {
    if (count > topCount) {
      top = focus;
      topCount = count;
    }
  }

  return top;
}

/**
 * Compares the current 7-day summary window against the 7 days immediately
 * before it, derived purely from the raw check-in list. Narratives stay calm
 * and judgment-free: a slower week is framed as flexing, never as failure.
 */
export function getWeekOverWeekChange(
  checkins: BrowserCheckin[],
  weeklySummary: WeeklySummary | null,
): WeekOverWeekChange | null {
  if (!weeklySummary) {
    return null;
  }

  const priorStart = addDays(weeklySummary.windowStart, -7);
  const priorEnd = addDays(weeklySummary.windowStart, -1);
  const priorCheckins = checkins.filter(
    (checkin) => checkin.date >= priorStart && checkin.date <= priorEnd,
  );

  const currentTopFocus = topFocusFromCheckins(
    checkins.filter(
      (checkin) => checkin.date >= weeklySummary.windowStart && checkin.date <= weeklySummary.windowEnd,
    ),
  );

  if (priorCheckins.length === 0) {
    return {
      hasPriorData: false,
      doneDelta: 0,
      completionDelta: 0,
      currentTopFocus,
      priorTopFocus: null,
      narrative:
        "This is your first tracked week in this window. Keep logging and next week's review will show what changed.",
    };
  }

  const priorDone = priorCheckins.filter((checkin) => checkin.status === "done").length;
  const priorCompletionPercent = Math.round((priorDone / priorCheckins.length) * 100);
  const currentCompletionPercent = getCompletionPercent(weeklySummary);

  const doneDelta = weeklySummary.done - priorDone;
  const completionDelta = currentCompletionPercent - priorCompletionPercent;
  const priorTopFocus = topFocusFromCheckins(priorCheckins);

  const sessionWord = (count: number) => (Math.abs(count) === 1 ? "session" : "sessions");
  let narrative: string;
  if (doneDelta > 0) {
    narrative = `You completed ${doneDelta} more ${sessionWord(doneDelta)} than last week. Whatever you changed is working, so keep the doses that felt natural.`;
  } else if (doneDelta < 0) {
    narrative = `You completed ${Math.abs(doneDelta)} fewer ${sessionWord(doneDelta)} than last week. Doses are meant to flex with real life; a lighter week still counts.`;
  } else {
    narrative = "You matched last week's completions. A steady rhythm is exactly what deliberate practice looks like.";
  }

  if (priorTopFocus && currentTopFocus && priorTopFocus !== currentTopFocus) {
    narrative += ` Your energy shifted from ${priorTopFocus} to ${currentTopFocus}.`;
  }

  return {
    hasPriorData: true,
    doneDelta,
    completionDelta,
    currentTopFocus,
    priorTopFocus,
    narrative,
  };
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
