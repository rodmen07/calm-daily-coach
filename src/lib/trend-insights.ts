import { FOCUS_AREAS, type DailyDose, type FocusArea } from "@/lib/plan";
import type { BrowserCheckin } from "@/lib/browser-checkins";

/**
 * Trends (v0.11): a longer-horizon insight view over the check-in history
 * review-insights.ts's getWeekOverWeekChange never looks past (it only ever
 * compares two 7-day windows). This module is a pure derivation layer, same
 * shape as review-insights.ts: it takes raw check-ins already fetched through
 * CheckinStoreAdapter.getCheckinsInRange (src/lib/checkin-store.ts) and
 * derives everything the /trends page renders. No I/O happens here.
 */

export type TrendWeekBucket = {
  windowStart: string;
  windowEnd: string;
  total: number;
  done: number;
  skipped: number;
  completionRate: number;
  byFocus: Record<FocusArea, { done: number; skipped: number }>;
};

export type TrendSummary = {
  buckets: TrendWeekBucket[];
  /** Percent (0-100), matching review-insights.ts's getCompletionPercent. */
  overallCompletionRate: number;
  doseDistribution: Record<DailyDose, number>;
  narrative: string;
};

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

function addDays(dateInput: string, delta: number): string {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyByFocus(): Record<FocusArea, { done: number; skipped: number }> {
  return Object.fromEntries(
    FOCUS_AREAS.map((focusArea) => [focusArea, { done: 0, skipped: 0 }]),
  ) as Record<FocusArea, { done: number; skipped: number }>;
}

/**
 * Splits the range ending on `endDateInput` (defaults to today) into `weeks`
 * contiguous, non-overlapping 7-day buckets, oldest first. Each bucket is
 * shaped like the existing WeeklySummary (total, done, skipped,
 * completionRate, byFocus) so the UI can reuse the exact same rendering
 * patterns (progress-track / progress-fill / focus-row) already proven on
 * the Dashboard and Review pages. A bucket with no check-ins (less than the
 * full window's worth of history, or a genuinely quiet week) is simply an
 * all-zero bucket, not an error case.
 */
export function bucketCheckinsByWeek(
  checkins: BrowserCheckin[],
  weeks: number,
  endDateInput?: string,
): TrendWeekBucket[] {
  const endKey = toDateOnly(endDateInput);
  const buckets: TrendWeekBucket[] = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const windowEnd = addDays(endKey, -7 * index);
    const windowStart = addDays(windowEnd, -6);

    const inWindow = checkins.filter(
      (checkin) => checkin.date >= windowStart && checkin.date <= windowEnd,
    );

    const byFocus = emptyByFocus();
    for (const checkin of inWindow) {
      byFocus[checkin.focus][checkin.status] += 1;
    }

    const done = inWindow.filter((entry) => entry.status === "done").length;
    const skipped = inWindow.filter((entry) => entry.status === "skipped").length;

    buckets.push({
      windowStart,
      windowEnd,
      total: inWindow.length,
      done,
      skipped,
      completionRate: inWindow.length > 0 ? Number((done / inWindow.length).toFixed(2)) : 0,
      byFocus,
    });
  }

  return buckets;
}

function topFocusAcrossBuckets(buckets: TrendWeekBucket[]): FocusArea | null {
  const doneByFocus = new Map<FocusArea, number>();

  for (const bucket of buckets) {
    for (const focusArea of FOCUS_AREAS) {
      const count = bucket.byFocus[focusArea].done;
      if (count > 0) {
        doneByFocus.set(focusArea, (doneByFocus.get(focusArea) ?? 0) + count);
      }
    }
  }

  let top: FocusArea | null = null;
  let topCount = 0;
  for (const [focusArea, count] of doneByFocus) {
    if (count > topCount) {
      top = focusArea;
      topCount = count;
    }
  }

  return top;
}

/**
 * A calm, descriptive summary of the whole window, deliberately never
 * comparing to a single prior day the way getWeekOverWeekChange compares two
 * weeks. Never uses streak-shaped language ("day N", "keep it going",
 * consecutive-day counts) - the same calm-tone bar getPatternSummary and
 * getWeekOverWeekChange already hold themselves to (no streaks, no pressure).
 */
export function getTrendNarrative(buckets: TrendWeekBucket[]): string {
  const totalDone = buckets.reduce((sum, bucket) => sum + bucket.done, 0);
  const totalAll = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const weekCount = buckets.length;
  const weekWord = weekCount === 1 ? "week" : "weeks";

  if (totalAll === 0) {
    return "No check-ins yet in this window. Whenever you are ready, one calm session is enough to begin.";
  }

  const completionPercent = Math.round((totalDone / totalAll) * 100);
  const topFocus = topFocusAcrossBuckets(buckets);

  if (completionPercent < 40) {
    let narrative = `The last ${weekCount} ${weekWord} show lighter activity than usual - that's fine, pick back up whenever feels right.`;
    if (topFocus) {
      narrative += ` ${topFocus} was still the area you returned to most.`;
    }
    return narrative;
  }

  let narrative = `Over the last ${weekCount} ${weekWord} you completed about ${completionPercent}% of your planned sessions`;
  narrative += topFocus ? `, with ${topFocus} the most consistent focus area.` : ".";
  return narrative;
}

/**
 * The full derived Trends view for a raw check-in list already scoped to the
 * caller's window (see CheckinStoreAdapter.getCheckinsInRange). doseDistribution
 * counts every check-in regardless of status, mirroring review-insights.ts's
 * getMostUsedDose, which is the existing "which dose did you actually use"
 * convention this app already has.
 */
export function getTrendSummary(
  checkins: BrowserCheckin[],
  weeks: number,
  endDateInput?: string,
): TrendSummary {
  const buckets = bucketCheckinsByWeek(checkins, weeks, endDateInput);

  const endKey = toDateOnly(endDateInput);
  const startKey = addDays(endKey, -7 * weeks + 1);
  const checkinsInWindow = checkins.filter(
    (checkin) => checkin.date >= startKey && checkin.date <= endKey,
  );

  const totalDone = checkinsInWindow.filter((checkin) => checkin.status === "done").length;
  const totalAll = checkinsInWindow.length;
  const overallCompletionRate = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  const doseDistribution: Record<DailyDose, number> = { light: 0, medium: 0, deep: 0 };
  for (const checkin of checkinsInWindow) {
    doseDistribution[checkin.dose] += 1;
  }

  return {
    buckets,
    overallCompletionRate,
    doseDistribution,
    narrative: getTrendNarrative(buckets),
  };
}
