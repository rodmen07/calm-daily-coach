import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getInitialPlannerState,
  persistPlannerState,
  scopedPlannerStorageKey,
} from "@/lib/planner-state";

describe("planner state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("builds scoped storage key", () => {
    expect(scopedPlannerStorageKey("guest")).toBe("calm-daily-coach:guest");
  });

  it("uses onboarding defaults when no saved scope state exists", () => {
    window.localStorage.setItem(
      "calm-daily-coach:onboarding",
      JSON.stringify({ defaultFocus: "Fitness", defaultDose: "medium" }),
    );

    const initial = getInitialPlannerState("guest");
    expect(initial.focus).toBe("Fitness");
    expect(initial.dose).toBe("medium");
  });

  it("persists and restores planner state with current-day plan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T10:00:00.000Z"));

    persistPlannerState("guest", {
      focus: "Learning",
      dose: "deep",
      notes: "chapter 2",
      email: "dev@example.com",
      plan: {
        date: "2026-07-03",
        focus: "Learning",
        dose: "deep",
        minutes: 30,
        action: "Study",
        reflection: "Recall",
        optionalResource: null,
        capMessage: "Done",
      },
      checkedIn: { date: "2026-07-03", status: "done" },
    });

    const restored = getInitialPlannerState("guest");
    expect(restored.focus).toBe("Learning");
    expect(restored.dose).toBe("deep");
    expect(restored.plan?.date).toBe("2026-07-03");
    expect(restored.checkedIn).toEqual({ date: "2026-07-03", status: "done" });

    vi.useRealTimers();
  });

  it("drops stale plans from previous day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T10:00:00.000Z"));

    window.localStorage.setItem(
      scopedPlannerStorageKey("guest"),
      JSON.stringify({
        focus: "Deep Work",
        dose: "light",
        notes: "",
        email: "",
        plan: {
          date: "2026-07-02",
          focus: "Deep Work",
          dose: "light",
          minutes: 5,
          action: "A",
          reflection: "B",
          optionalResource: null,
          capMessage: "C",
        },
        checkedIn: { date: "2026-07-02", status: "done" },
      }),
    );

    const restored = getInitialPlannerState("guest");
    expect(restored.plan).toBeNull();
    expect(restored.checkedIn).toBeNull();

    vi.useRealTimers();
  });
});
