import { describe, expect, it, vi } from "vitest";
import { buildDailyPlan, dailyPlanInputSchema, DOSE_OPTIONS, FOCUS_AREAS } from "@/lib/plan";

describe("buildDailyPlan", () => {
  it("builds a medium plan with the expected shape", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00.000Z"));

    const plan = buildDailyPlan({
      focus: "Deep Work",
      dose: "medium",
      notes: "Protect maker time",
    });

    expect(plan.date).toBe("2026-06-27");
    expect(plan.minutes).toBe(10);
    expect(plan.focus).toBe("Deep Work");
    expect(plan.optionalResource).toBeTruthy();
    expect(plan.capMessage).toBe("You reached today's plan. See you tomorrow.");

    vi.useRealTimers();
  });

  it("omits optional resource for light dose", () => {
    const plan = buildDailyPlan({
      focus: "Fitness",
      dose: "light",
      notes: "",
    });

    expect(plan.optionalResource).toBeNull();
    expect(plan.minutes).toBe(3);
  });

  it("keeps activity text aligned with dose time windows", () => {
    const expectedMinutesByDose = {
      light: 3,
      medium: 10,
      deep: 20,
    } as const;

    for (const focus of FOCUS_AREAS) {
      for (const dose of DOSE_OPTIONS) {
        const plan = buildDailyPlan({ focus, dose, notes: "timing-check" });
        expect(plan.minutes).toBe(expectedMinutesByDose[dose]);
        const minutePattern = new RegExp(`${expectedMinutesByDose[dose]}(-minute| minutes)`, "i");
        expect(plan.action).toMatch(minutePattern);
      }
    }
  });

  it("offers deterministic variety for the same focus and dose", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00.000Z"));

    const first = buildDailyPlan({ focus: "Fitness", dose: "medium", notes: "variant-a" });
    const second = buildDailyPlan({ focus: "Fitness", dose: "medium", notes: "variant-b" });

    expect(first.action).not.toBe(second.action);
    expect(first.action).toContain("10-minute");
    expect(second.action).toContain("10-minute");

    vi.useRealTimers();
  });
});

describe("dailyPlanInputSchema", () => {
  it("rejects notes longer than 280 characters", () => {
    const result = dailyPlanInputSchema.safeParse({
      focus: "Sleep",
      dose: "deep",
      notes: "x".repeat(281),
    });

    expect(result.success).toBe(false);
  });
});
