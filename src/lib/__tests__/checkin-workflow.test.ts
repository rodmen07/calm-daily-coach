import { describe, expect, it, vi } from "vitest";
import type { CheckinStoreAdapter } from "@/lib/checkin-store";
import type { DailyPlan } from "@/lib/plan";
import { submitCheckinFlow } from "@/lib/checkin-workflow";

const plan: DailyPlan = {
  date: "2026-07-03",
  focus: "Deep Work",
  dose: "medium",
  minutes: 15,
  action: "Action",
  reflection: "Reflection",
  optionalResource: null,
  capMessage: "Done",
};

function makeStore() {
  const weeklySummary = {
    windowStart: "2026-06-27",
    windowEnd: "2026-07-03",
    total: 2,
    done: 1,
    skipped: 1,
    completionRate: 0.5,
    byFocus: {
      Career: { done: 0, skipped: 0 },
      Communication: { done: 0, skipped: 0 },
      Creativity: { done: 0, skipped: 0 },
      "Deep Work": { done: 1, skipped: 1 },
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

  const store: Pick<CheckinStoreAdapter, "addCheckin" | "getWeeklySummary"> = {
    addCheckin: vi.fn(async () => undefined),
    getWeeklySummary: vi.fn(async () => weeklySummary),
  };

  return { store, weeklySummary };
}

describe("submitCheckinFlow", () => {
  it("returns validation error for skipped check-in without reason", async () => {
    const { store } = makeStore();
    const result = await submitCheckinFlow({
      plan,
      status: "skipped",
      skipReason: "   ",
      storageScope: "guest",
      checkinStore: store,
      getAdvice: vi.fn(async () => "ok"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toBe("Add a short reason before skipping.");
    }
  });

  it("submits done check-in and returns summary with advice", async () => {
    const { store, weeklySummary } = makeStore();
    const getAdvice = vi.fn(async () => "Keep momentum");

    const result = await submitCheckinFlow({
      plan,
      status: "done",
      skipReason: "",
      storageScope: "guest",
      checkinStore: store,
      getAdvice,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statusMessage).toBe("Great work. Check-in saved.");
      expect(result.checkinAdvice).toBe("Keep momentum");
      expect(result.weeklySummary).toEqual(weeklySummary);
      expect(result.nextSkipReason).toBe("");
    }

    expect(store.addCheckin).toHaveBeenCalled();
    expect(getAdvice).toHaveBeenCalledWith({ mood: 4, energy: 4, friction: undefined });
  });

  it("submits skipped check-in with trimmed reason", async () => {
    const { store } = makeStore();
    const getAdvice = vi.fn(async () => "Reduce friction");

    const result = await submitCheckinFlow({
      plan,
      status: "skipped",
      skipReason: " busy day ",
      storageScope: "guest",
      checkinStore: store,
      getAdvice,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statusMessage).toBe("Skip logged with context.");
    }

    expect(getAdvice).toHaveBeenCalledWith({ mood: 2, energy: 2, friction: "busy day" });
  });

  it("returns storage error when addCheckin throws", async () => {
    const { store } = makeStore();
    vi.mocked(store.addCheckin).mockRejectedValueOnce(new Error("db down"));

    const result = await submitCheckinFlow({
      plan,
      status: "done",
      skipReason: "",
      storageScope: "guest",
      checkinStore: store,
      getAdvice: vi.fn(async () => "ok"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toBe("Could not save check-in.");
    }
  });
});
