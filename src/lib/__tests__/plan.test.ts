import { describe, expect, it, vi } from "vitest";
import { buildDailyPlan, dailyPlanInputSchema } from "@/lib/plan";

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
