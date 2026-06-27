import { addCheckin, getWeeklySummary, listCheckins } from "@/lib/browser-checkins";
import { beforeEach, describe, expect, it } from "vitest";

describe("browser-checkins", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty weekly summary when no check-ins exist", () => {
    const summary = getWeeklySummary("2026-06-27", "guest");

    expect(summary.windowStart).toBe("2026-06-21");
    expect(summary.windowEnd).toBe("2026-06-27");
    expect(summary.total).toBe(0);
    expect(summary.done).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.completionRate).toBe(0);
  });

  it("computes weekly totals and by-focus metrics inside the 7-day window", () => {
    addCheckin(
      {
        date: "2026-06-27",
        focus: "Fitness",
        dose: "light",
        minutes: 5,
        status: "done",
      },
      "guest",
    );

    addCheckin(
      {
        date: "2026-06-26",
        focus: "Sleep",
        dose: "medium",
        minutes: 15,
        status: "skipped",
        skipReason: "Travel day",
      },
      "guest",
    );

    addCheckin(
      {
        date: "2026-06-10",
        focus: "Deep Work",
        dose: "deep",
        minutes: 30,
        status: "done",
      },
      "guest",
    );

    const summary = getWeeklySummary("2026-06-27", "guest");

    expect(summary.total).toBe(2);
    expect(summary.done).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.completionRate).toBe(0.5);
    expect(summary.byFocus.Fitness.done).toBe(1);
    expect(summary.byFocus.Sleep.skipped).toBe(1);
    expect(summary.byFocus["Deep Work"].done).toBe(0);
  });

  it("keeps check-in history scoped by user key", () => {
    addCheckin(
      {
        date: "2026-06-27",
        focus: "Mindfulness",
        dose: "light",
        minutes: 5,
        status: "done",
      },
      "user-a",
    );

    addCheckin(
      {
        date: "2026-06-27",
        focus: "Communication",
        dose: "light",
        minutes: 5,
        status: "done",
      },
      "user-b",
    );

    expect(listCheckins("user-a")).toHaveLength(1);
    expect(listCheckins("user-a")[0]?.focus).toBe("Mindfulness");
    expect(listCheckins("user-b")).toHaveLength(1);
    expect(listCheckins("user-b")[0]?.focus).toBe("Communication");
  });
});
