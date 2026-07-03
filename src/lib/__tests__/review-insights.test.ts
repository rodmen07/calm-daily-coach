import { describe, expect, it } from "vitest";
import type { BrowserCheckin, WeeklySummary } from "@/lib/browser-checkins";
import {
  filterCheckinsInWindow,
  getCompletionPercent,
  getMostUsedDose,
  getPatternSummary,
  getPeakCompletionWindow,
  getSkipReasonInsights,
} from "@/lib/review-insights";

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
