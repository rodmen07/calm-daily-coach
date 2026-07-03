import { describe, expect, it } from "vitest";
import { doseToRustEffort, deriveTopFocus, parsePlannerDate } from "@/lib/planner-derivations";
import type { WeeklySummary } from "@/lib/browser-checkins";

function emptySummary(): WeeklySummary {
  return {
    windowStart: "2026-06-27",
    windowEnd: "2026-07-03",
    total: 0,
    done: 0,
    skipped: 0,
    completionRate: 0,
    byFocus: {
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
    },
  };
}

describe("planner derivations", () => {
  it("maps daily dose to rust effort", () => {
    expect(doseToRustEffort("light")).toBe("low");
    expect(doseToRustEffort("medium")).toBe("medium");
    expect(doseToRustEffort("deep")).toBe("high");
  });

  it("derives top focus from weekly summary", () => {
    const summary = emptySummary();
    summary.byFocus.Fitness.done = 2;
    summary.byFocus["Deep Work"].done = 4;

    expect(deriveTopFocus(summary)).toBe("Deep Work");
    expect(deriveTopFocus(emptySummary())).toBeNull();
    expect(deriveTopFocus(null)).toBeNull();
  });

  describe("parsePlannerDate", () => {
    it("parses valid date strings into clean YYYY-MM-DD strings", () => {
      expect(parsePlannerDate("2026-07-03")).toBe("2026-07-03");
      // Test different format
      expect(parsePlannerDate("2026/07/03")).toBe("2026-07-03");
      expect(parsePlannerDate("Jul 3, 2026")).toBe("2026-07-03");
    });

    it("parses Date objects into clean YYYY-MM-DD strings", () => {
      const date = new Date(2026, 6, 3); // 2026-07-03 local time, but we should make sure we test safely since UTC/ISO splitting can vary by timezone
      const parsed = parsePlannerDate(date);
      expect(parsed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns null for invalid inputs", () => {
      expect(parsePlannerDate("invalid-date-format")).toBeNull();
      expect(parsePlannerDate(null)).toBeNull();
      expect(parsePlannerDate(undefined)).toBeNull();
    });
  });
});
