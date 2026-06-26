import type { DailyDose, FocusArea } from "@/lib/plan";

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
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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

export function getWeeklySummary(endDateInput?: string, scopeKey = "guest"): WeeklySummary {
  const endDate = new Date(endDateInput ?? todayDate());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  const focusAreas: FocusArea[] = [
    "Fitness",
    "Sleep",
    "Deep Work",
    "Communication",
    "Mindfulness",
    "Finances",
  ];

  const byFocus = Object.fromEntries(
    focusAreas.map((focusArea) => [focusArea, { done: 0, skipped: 0 }]),
  ) as Record<FocusArea, { done: number; skipped: number }>;

  const inWindow = listCheckins(scopeKey).filter((checkin) => {
    const date = new Date(checkin.date);
    return date >= startDate && date <= endDate;
  });

  for (const checkin of inWindow) {
    byFocus[checkin.focus][checkin.status] += 1;
  }

  const done = inWindow.filter((entry) => entry.status === "done").length;
  const skipped = inWindow.filter((entry) => entry.status === "skipped").length;

  return {
    windowStart: startDate.toISOString().slice(0, 10),
    windowEnd: endDate.toISOString().slice(0, 10),
    total: inWindow.length,
    done,
    skipped,
    completionRate: inWindow.length > 0 ? Number((done / inWindow.length).toFixed(2)) : 0,
    byFocus,
  };
}
