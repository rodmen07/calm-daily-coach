import { describe, expect, it } from "vitest";
import type { BrowserCheckin, WeeklySummary } from "@/lib/browser-checkins";
import {
  filterCheckinsInWindow,
  getCompletionPercent,
  getMostUsedDose,
  getPatternSummary,
  getPeakCompletionWindow,
  getSkipReasonInsights,
  getWeekOverWeekChange,
} from "@/lib/review-insights";

const EMPTY_BY_FOCUS: WeeklySummary["byFocus"] = {
  Career: { done: 0, skipped: 0 },
  Communication: { done: 0, skipped: 0 },
  Creativity: { done: 0, skipped: 0 },
  "Deep Work": { done: 0, skipped: 0 },
  Finances: { done: 0, skipped: 0 },
  Fitness: { done: 0, skipped: 0 },
  Hobbies: { done: 0, skipped: 0 },
  Home: { done: 0, skipped: 0 },
  Learning: { done: 0, skipped: 0 },
  Mindfulness: { done: 0, skipped: 0 },
  Nutrition: { done: 0, skipped: 0 },
  Organization: { done: 0, skipped: 0 },
  Relationships: { done: 0, skipped: 0 },
  Sleep: { done: 0, skipped: 0 },
  Writing: { done: 0, skipped: 0 },
};

function createSummary(partial: Partial<WeeklySummary>): WeeklySummary {
  return {
    windowStart: partial.windowStart ?? "2026-06-27",
    windowEnd: partial.windowEnd ?? "2026-07-03",
    total: partial.total ?? 0,
    done: partial.done ?? 0,
    skipped: partial.skipped ?? 0,
    completionRate: partial.completionRate ?? 0,
    byFocus: partial.byFocus ?? { ...EMPTY_BY_FOCUS },
  };
}

function createCheckin(partial: Partial<BrowserCheckin>): BrowserCheckin {
  return {
    id: partial.id ?? "1",
    date: partial.date ?? "2026-07-03",
    focus: partial.focus ?? "Deep Work",
    dose: partial.dose ?? "medium",
    minutes: partial.minutes ?? 15,
    status: partial.status ?? "done",
    skipReason: partial.skipReason,
    createdAt: partial.createdAt ?? "2026-07-03T09:00:00.000Z",
  };
}

describe("review insights helpers", () => {
  it("calculates completion percent from weekly summary", () => {
    const summary: WeeklySummary = {
      windowStart: "2026-06-27",
      windowEnd: "2026-07-03",
      total: 4,
      done: 3,
      skipped: 1,
      completionRate: 0.75,
      byFocus: {
        Career: { done: 0, skipped: 0 },
        Communication: { done: 0, skipped: 0 },
        Creativity: { done: 0, skipped: 0 },
        "Deep Work": { done: 3, skipped: 1 },
        Finances: { done: 0, skipped: 0 },
        Fitness: { done: 0, skipped: 0 },
        Hobbies: { done: 0, skipped: 0 },
        Home: { done: 0, skipped: 0 },
        Learning: { done: 0, skipped: 0 },
        Mindfulness: { done: 0, skipped: 0 },
        Nutrition: { done: 0, skipped: 0 },
        Organization: { done: 0, skipped: 0 },
        Relationships: { done: 0, skipped: 0 },
        Sleep: { done: 0, skipped: 0 },
        Writing: { done: 0, skipped: 0 },
      },
    };

    expect(getCompletionPercent(summary)).toBe(75);
    expect(getCompletionPercent(null)).toBe(0);
  });

  it("filters checkins in weekly window", () => {
    const checkins = [
      createCheckin({ date: "2026-06-26" }),
      createCheckin({ date: "2026-06-29", id: "2" }),
      createCheckin({ date: "2026-07-03", id: "3" }),
    ];

    const summary: WeeklySummary = {
      windowStart: "2026-06-27",
      windowEnd: "2026-07-03",
      total: 2,
      done: 2,
      skipped: 0,
      completionRate: 1,
      byFocus: {
        Career: { done: 0, skipped: 0 },
        Communication: { done: 0, skipped: 0 },
        Creativity: { done: 0, skipped: 0 },
        "Deep Work": { done: 2, skipped: 0 },
        Finances: { done: 0, skipped: 0 },
        Fitness: { done: 0, skipped: 0 },
        Hobbies: { done: 0, skipped: 0 },
        Home: { done: 0, skipped: 0 },
        Learning: { done: 0, skipped: 0 },
        Mindfulness: { done: 0, skipped: 0 },
        Nutrition: { done: 0, skipped: 0 },
        Organization: { done: 0, skipped: 0 },
        Relationships: { done: 0, skipped: 0 },
        Sleep: { done: 0, skipped: 0 },
        Writing: { done: 0, skipped: 0 },
      },
    };

    expect(filterCheckinsInWindow(checkins, summary)).toHaveLength(2);
    expect(filterCheckinsInWindow(checkins, null)).toHaveLength(0);
  });

  it("derives most-used dose and peak window", () => {
    const checkins = [
      createCheckin({ dose: "light", createdAt: "2026-07-03T06:15:00" }),
      createCheckin({ dose: "light", createdAt: "2026-07-03T07:15:00", id: "2" }),
      createCheckin({ dose: "medium", createdAt: "2026-07-03T18:15:00", id: "3" }),
    ];

    expect(getMostUsedDose(checkins)).toBe("light");
    expect(getMostUsedDose([])).toBe("N/A");
    expect(getPeakCompletionWindow(checkins)).toContain("Morning");
    expect(getPeakCompletionWindow([])).toBe("N/A");
  });

  it("maps skip reasons to recommendations", () => {
    const checkins = [
      createCheckin({
        id: "1",
        status: "skipped",
        skipReason: "Too many context switching tasks",
      }),
      createCheckin({
        id: "2",
        status: "skipped",
        skipReason: "Low energy after work",
      }),
    ];

    const insights = getSkipReasonInsights(checkins);
    expect(insights).toHaveLength(2);
    expect(insights[0].recommendation).toContain("warm-up transition");
    expect(insights[1].recommendation).toContain("restorative focus");
  });

  it("returns stable pattern summaries by completion band", () => {
    expect(getPatternSummary(100)).toContain("Incredible discipline");
    expect(getPatternSummary(70)).toContain("Excellent consistency");
    expect(getPatternSummary(45)).toContain("Steady progress");
    expect(getPatternSummary(10)).toContain("Early momentum");
    expect(getPatternSummary(0)).toContain("No completions yet");
  });
});

describe("getWeekOverWeekChange", () => {
  it("returns null without a weekly summary", () => {
    expect(getWeekOverWeekChange([], null)).toBeNull();
  });

  it("flags the first tracked week when the prior window is empty", () => {
    const summary = createSummary({ total: 2, done: 2 });
    const checkins = [
      createCheckin({ date: "2026-06-28" }),
      createCheckin({ date: "2026-06-30", id: "2" }),
      // Just outside the prior window (windowStart - 8 days): must not count.
      createCheckin({ date: "2026-06-19", id: "3" }),
    ];

    const change = getWeekOverWeekChange(checkins, summary);
    expect(change).not.toBeNull();
    expect(change?.hasPriorData).toBe(false);
    expect(change?.narrative).toContain("first tracked week");
  });

  it("reports gains with sessions and completion-rate deltas", () => {
    const summary = createSummary({ total: 4, done: 3 });
    const checkins = [
      // Prior window 2026-06-20 .. 2026-06-26: 1 done of 2 (50%).
      createCheckin({ date: "2026-06-20", id: "p1", status: "done" }),
      createCheckin({ date: "2026-06-26", id: "p2", status: "skipped", skipReason: "busy" }),
      // Current window checkins.
      createCheckin({ date: "2026-06-28", id: "c1" }),
      createCheckin({ date: "2026-06-29", id: "c2" }),
      createCheckin({ date: "2026-07-01", id: "c3" }),
      createCheckin({ date: "2026-07-02", id: "c4", status: "skipped", skipReason: "tired" }),
    ];

    const change = getWeekOverWeekChange(checkins, summary);
    expect(change?.hasPriorData).toBe(true);
    expect(change?.doneDelta).toBe(2);
    expect(change?.completionDelta).toBe(25);
    expect(change?.narrative).toContain("2 more sessions");
  });

  it("frames a slower week gently instead of as failure", () => {
    const summary = createSummary({ total: 2, done: 1 });
    const checkins = [
      createCheckin({ date: "2026-06-21", id: "p1" }),
      createCheckin({ date: "2026-06-22", id: "p2" }),
      createCheckin({ date: "2026-06-23", id: "p3" }),
      createCheckin({ date: "2026-06-28", id: "c1" }),
      createCheckin({ date: "2026-06-29", id: "c2", status: "skipped", skipReason: "busy" }),
    ];

    const change = getWeekOverWeekChange(checkins, summary);
    expect(change?.doneDelta).toBe(-2);
    expect(change?.completionDelta).toBe(-50);
    expect(change?.narrative).toContain("2 fewer sessions");
    expect(change?.narrative).toContain("still counts");
  });

  it("mentions a focus shift between the two windows", () => {
    const summary = createSummary({ total: 1, done: 1 });
    const checkins = [
      createCheckin({ date: "2026-06-21", id: "p1", focus: "Fitness" }),
      createCheckin({ date: "2026-06-28", id: "c1", focus: "Deep Work" }),
    ];

    const change = getWeekOverWeekChange(checkins, summary);
    expect(change?.priorTopFocus).toBe("Fitness");
    expect(change?.currentTopFocus).toBe("Deep Work");
    expect(change?.narrative).toContain("from Fitness to Deep Work");
  });
});
