import { describe, expect, it } from "vitest";
import type { BrowserCheckin } from "@/lib/browser-checkins";
import {
  bucketCheckinsByWeek,
  getTrendNarrative,
  getTrendSummary,
} from "@/lib/trend-insights";

function checkin(partial: Partial<BrowserCheckin>): BrowserCheckin {
  return {
    id: partial.id ?? "1",
    date: partial.date ?? "2026-07-20",
    focus: partial.focus ?? "Deep Work",
    dose: partial.dose ?? "medium",
    minutes: partial.minutes ?? 15,
    status: partial.status ?? "done",
    skipReason: partial.skipReason,
    createdAt: partial.createdAt ?? "2026-07-20T09:00:00.000Z",
  };
}

// A fixed anchor date keeps every boundary assertion below deterministic,
// independent of whatever day the suite actually runs on.
const END = "2026-07-20";

describe("bucketCheckinsByWeek", () => {
  it("splits a 28-day range into 4 contiguous weekly buckets, oldest first", () => {
    const buckets = bucketCheckinsByWeek([], 4, END);

    expect(buckets).toHaveLength(4);
    expect(buckets[0].windowStart).toBe("2026-06-23");
    expect(buckets[0].windowEnd).toBe("2026-06-29");
    expect(buckets[1].windowStart).toBe("2026-06-30");
    expect(buckets[1].windowEnd).toBe("2026-07-06");
    expect(buckets[2].windowStart).toBe("2026-07-07");
    expect(buckets[2].windowEnd).toBe("2026-07-13");
    expect(buckets[3].windowStart).toBe("2026-07-14");
    expect(buckets[3].windowEnd).toBe(END);
  });

  it("lands a boundary check-in in the correct week, not the adjacent one", () => {
    const checkins = [
      checkin({ id: "edge-1", date: "2026-06-29" }), // last day of the oldest bucket
      checkin({ id: "edge-2", date: "2026-06-30" }), // first day of the next bucket
    ];

    const buckets = bucketCheckinsByWeek(checkins, 4, END);

    expect(buckets[0].total).toBe(1);
    expect(buckets[0].done).toBe(1);
    expect(buckets[1].total).toBe(1);
  });

  it("computes completion rate and byFocus per bucket", () => {
    const checkins = [
      checkin({ id: "1", date: "2026-07-16", status: "done", focus: "Fitness" }),
      checkin({
        id: "2",
        date: "2026-07-17",
        status: "skipped",
        focus: "Fitness",
        skipReason: "busy",
      }),
      checkin({ id: "3", date: "2026-07-18", status: "done", focus: "Deep Work" }),
    ];

    const buckets = bucketCheckinsByWeek(checkins, 4, END);
    const currentWeek = buckets[3];

    expect(currentWeek.total).toBe(3);
    expect(currentWeek.done).toBe(2);
    expect(currentWeek.skipped).toBe(1);
    expect(currentWeek.completionRate).toBe(0.67);
    expect(currentWeek.byFocus.Fitness).toEqual({ done: 1, skipped: 1 });
    expect(currentWeek.byFocus["Deep Work"]).toEqual({ done: 1, skipped: 0 });
  });

  it("handles less than 28 days of real history: early buckets stay at zero", () => {
    const checkins = [
      checkin({ id: "1", date: "2026-07-13", status: "done" }),
      checkin({ id: "2", date: "2026-07-19", status: "done" }),
    ];

    const buckets = bucketCheckinsByWeek(checkins, 4, END);

    expect(buckets[0].total).toBe(0);
    expect(buckets[1].total).toBe(0);
    expect(buckets[2].total).toBe(1);
    expect(buckets[3].total).toBe(1);
  });

  it("returns all-zero buckets for zero check-in history", () => {
    const buckets = bucketCheckinsByWeek([], 4, END);

    for (const bucket of buckets) {
      expect(bucket.total).toBe(0);
      expect(bucket.done).toBe(0);
      expect(bucket.skipped).toBe(0);
      expect(bucket.completionRate).toBe(0);
    }
  });

  it("does not require every day in the window to have a check-in", () => {
    const checkins = [checkin({ id: "1", date: "2026-07-15", status: "done" })];

    const buckets = bucketCheckinsByWeek(checkins, 4, END);

    expect(buckets[3].total).toBe(1);
    expect(buckets[2].total).toBe(0);
  });
});

describe("getTrendSummary", () => {
  it("computes overall completion rate and dose distribution across the whole window", () => {
    const checkins = [
      checkin({ id: "1", date: "2026-07-16", status: "done", dose: "light" }),
      checkin({ id: "2", date: "2026-07-17", status: "skipped", dose: "medium" }),
      checkin({ id: "3", date: "2026-07-18", status: "done", dose: "deep" }),
      checkin({ id: "4", date: "2026-06-24", status: "done", dose: "light" }),
    ];

    const summary = getTrendSummary(checkins, 4, END);

    expect(summary.overallCompletionRate).toBe(75);
    expect(summary.doseDistribution).toEqual({ light: 2, medium: 1, deep: 1 });
    expect(summary.buckets).toHaveLength(4);
  });

  it("returns a zero completion rate and empty dose distribution for zero history", () => {
    const summary = getTrendSummary([], 4, END);

    expect(summary.overallCompletionRate).toBe(0);
    expect(summary.doseDistribution).toEqual({ light: 0, medium: 0, deep: 0 });
  });

  it("ignores check-ins outside the window entirely", () => {
    const checkins = [
      checkin({ id: "in", date: "2026-07-01", status: "done" }),
      // More than 27 days before END: outside the 28-day window.
      checkin({ id: "out", date: "2026-05-01", status: "done" }),
    ];

    const summary = getTrendSummary(checkins, 4, END);

    expect(summary.overallCompletionRate).toBe(100);
    const totalAcrossBuckets = summary.buckets.reduce((sum, bucket) => sum + bucket.total, 0);
    expect(totalAcrossBuckets).toBe(1);
  });
});

describe("getTrendNarrative", () => {
  it("names the calm, no-history message for an all-empty window", () => {
    const buckets = bucketCheckinsByWeek([], 4, END);
    expect(getTrendNarrative(buckets)).toContain("No check-ins yet");
  });

  it("frames a lighter window gently instead of as failure", () => {
    const checkins = [
      checkin({ id: "1", date: "2026-07-16", status: "skipped", skipReason: "busy" }),
    ];
    const buckets = bucketCheckinsByWeek(checkins, 4, END);
    const narrative = getTrendNarrative(buckets);

    expect(narrative).toContain("lighter activity than usual");
  });

  it("reports the completion percent and top focus area for solid activity", () => {
    const checkins = [
      checkin({ id: "1", date: "2026-07-14", status: "done", focus: "Deep Work" }),
      checkin({ id: "2", date: "2026-07-15", status: "done", focus: "Deep Work" }),
      checkin({ id: "3", date: "2026-07-16", status: "done", focus: "Deep Work" }),
      checkin({ id: "4", date: "2026-07-17", status: "done", focus: "Fitness" }),
    ];
    const buckets = bucketCheckinsByWeek(checkins, 4, END);
    const narrative = getTrendNarrative(buckets);

    expect(narrative).toContain("Over the last 4 weeks");
    expect(narrative).toContain("100%");
    expect(narrative).toContain("Deep Work");
  });

  it("never uses streak-shaped language", () => {
    const checkins = [
      checkin({ id: "1", date: "2026-07-14", status: "done" }),
      checkin({ id: "2", date: "2026-07-15", status: "done" }),
      checkin({ id: "3", date: "2026-07-16", status: "done" }),
    ];
    const buckets = bucketCheckinsByWeek(checkins, 4, END);
    const narrative = getTrendNarrative(buckets).toLowerCase();

    expect(narrative).not.toMatch(/\bstreak/);
    expect(narrative).not.toMatch(/\bday \d+\b/);
    expect(narrative).not.toMatch(/keep it going/);
    expect(narrative).not.toMatch(/consecutive/);
  });
});
