import { describe, expect, it, vi } from "vitest";
import type { CheckinStoreAdapter } from "@/lib/checkin-store";
import type { SavedPlannerState } from "@/lib/planner-state";
import { hydratePlannerSession } from "@/lib/planner-session";

function baseState(): SavedPlannerState {
  return {
    focus: "Deep Work",
    dose: "light",
    notes: "",
    email: "",
    plan: null,
  };
}

function makeStore() {
  const weeklySummary = {
    windowStart: "2026-06-27",
    windowEnd: "2026-07-03",
    total: 1,
    done: 1,
    skipped: 0,
    completionRate: 1,
    byFocus: {
      Career: { done: 0, skipped: 0 },
      Communication: { done: 0, skipped: 0 },
      Creativity: { done: 0, skipped: 0 },
      "Deep Work": { done: 1, skipped: 0 },
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

  const store: Pick<CheckinStoreAdapter, "migrateGuestCheckins" | "getWeeklySummary"> = {
    migrateGuestCheckins: vi.fn(async () => ({ status: "skipped" as const, migratedCount: 0 })),
    getWeeklySummary: vi.fn(async () => weeklySummary),
  };

  return { store, weeklySummary };
}

describe("hydratePlannerSession", () => {
  it("hydrates guest scope without migration and preserves summary", async () => {
    const { store, weeklySummary } = makeStore();

    const result = await hydratePlannerSession({
      initialState: baseState(),
      authEmail: "user@example.com",
      storageScope: "guest",
      checkinStore: store,
    });

    expect(result.nextState.email).toBe("user@example.com");
    expect(result.migrationStatus.type).toBe("idle");
    expect(result.weeklySummary).toEqual(weeklySummary);
    expect(store.migrateGuestCheckins).not.toHaveBeenCalled();
  });

  it("returns migration success status for signed-in scope", async () => {
    const { store } = makeStore();
    vi.mocked(store.migrateGuestCheckins).mockResolvedValueOnce({
      status: "migrated",
      migratedCount: 2,
    });

    const result = await hydratePlannerSession({
      initialState: baseState(),
      authEmail: null,
      storageScope: "uid-123",
      checkinStore: store,
    });

    expect(result.migrationStatus.type).toBe("ok");
    if (result.migrationStatus.type === "ok") {
      expect(result.migrationStatus.message).toContain("Migrated 2 guest check-ins");
    }
  });

  it("returns migration error status and null summary on summary failure", async () => {
    const { store } = makeStore();
    vi.mocked(store.migrateGuestCheckins).mockResolvedValueOnce({
      status: "error",
      migratedCount: 1,
    });
    vi.mocked(store.getWeeklySummary).mockRejectedValueOnce(new Error("summary failed"));

    const result = await hydratePlannerSession({
      initialState: {
        ...baseState(),
        email: "persisted@example.com",
      },
      authEmail: "auth@example.com",
      storageScope: "uid-123",
      checkinStore: store,
    });

    expect(result.nextState.email).toBe("persisted@example.com");
    expect(result.migrationStatus.type).toBe("error");
    expect(result.weeklySummary).toBeNull();
  });
});
