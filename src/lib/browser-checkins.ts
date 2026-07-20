import { FOCUS_AREAS, type DailyDose, type FocusArea } from "@/lib/plan";

export type CheckinStatus = "done" | "skipped";

export type BrowserCheckin = {
  id: string;
  date: string;
  focus: FocusArea;
  dose: DailyDose;
  minutes: number;
  status: CheckinStatus;
  skipReason?: string;
  createdAt: string;
};

export type WeeklySummary = {
  windowStart: string;
  windowEnd: string;
  total: number;
  done: number;
  skipped: number;
  completionRate: number;
  byFocus: Record<FocusArea, { done: number; skipped: number }>;
};

const CHECKIN_STORAGE_KEY = "calm-daily-coach-checkins";

function storageKey(scopeKey: string) {
  return `${CHECKIN_STORAGE_KEY}:${scopeKey}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDateOnly(value?: string) {
  if (!value) {
    return todayDate();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return todayDate();
  }

  return parsed.toISOString().slice(0, 10);
}

function parseCheckins(raw: string | null): BrowserCheckin[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as BrowserCheckin[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function listCheckins(scopeKey = "guest"): BrowserCheckin[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(storageKey(scopeKey));
  return parseCheckins(raw)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addCheckin(input: Omit<BrowserCheckin, "id" | "createdAt">, scopeKey = "guest") {
  if (typeof window === "undefined") {
    return;
  }

  const next: BrowserCheckin = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const checkins = listCheckins(scopeKey);
  checkins.push(next);
  window.localStorage.setItem(storageKey(scopeKey), JSON.stringify(checkins));
}

/**
 * Every check-in in a caller-chosen `days`-long window ending on
 * `endDateInput` (defaults to today), sourced from the same fully-retained
 * local list `listCheckins` already returns. Unlike `getWeeklySummary`, this
 * returns the raw records rather than a pre-aggregated summary, so the same
 * window math can serve both the 7-day weekly summary shape and the wider
 * v0.11 Trends window without duplicating the aggregation logic in two
 * places (see src/lib/trend-insights.ts).
 */
export function listCheckinsInRange(
  days: number,
  endDateInput: string | undefined,
  scopeKey = "guest",
): BrowserCheckin[] {
  const endDate = new Date(toDateOnly(endDateInput));
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));
  const startKey = startDate.toISOString().slice(0, 10);
  const endKey = endDate.toISOString().slice(0, 10);

  return listCheckins(scopeKey).filter((checkin) => {
    return checkin.date >= startKey && checkin.date <= endKey;
  });
}

export function getWeeklySummary(endDateInput?: string, scopeKey = "guest"): WeeklySummary {
  const endDate = new Date(toDateOnly(endDateInput));
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  const startKey = startDate.toISOString().slice(0, 10);
  const endKey = endDate.toISOString().slice(0, 10);

  const byFocus = Object.fromEntries(
    FOCUS_AREAS.map((focusArea) => [focusArea, { done: 0, skipped: 0 }]),
  ) as Record<FocusArea, { done: number; skipped: number }>;

  const inWindow = listCheckins(scopeKey).filter((checkin) => {
    return checkin.date >= startKey && checkin.date <= endKey;
  });

  for (const checkin of inWindow) {
    byFocus[checkin.focus][checkin.status] += 1;
  }

  const done = inWindow.filter((entry) => entry.status === "done").length;
  const skipped = inWindow.filter((entry) => entry.status === "skipped").length;

  return {
    windowStart: startKey,
    windowEnd: endKey,
    total: inWindow.length,
    done,
    skipped,
    completionRate: inWindow.length > 0 ? Number((done / inWindow.length).toFixed(2)) : 0,
    byFocus,
  };
}
