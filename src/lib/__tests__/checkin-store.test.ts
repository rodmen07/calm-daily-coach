import { createCheckinStore, resolveCheckinBackend } from "@/lib/checkin-store";
import { addCheckin, getWeeklySummary } from "@/lib/browser-checkins";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/browser-checkins", () => ({
  addCheckin: vi.fn(),
  getWeeklySummary: vi.fn(() => ({
    windowStart: "2026-06-21",
    windowEnd: "2026-06-27",
    total: 0,
    done: 0,
    skipped: 0,
    completionRate: 0,
    byFocus: {
      Fitness: { done: 0, skipped: 0 },
      Sleep: { done: 0, skipped: 0 },
      "Deep Work": { done: 0, skipped: 0 },
      Communication: { done: 0, skipped: 0 },
      Mindfulness: { done: 0, skipped: 0 },
      Finances: { done: 0, skipped: 0 },
    },
  })),
}));

describe("checkin-store", () => {
  it("resolves local mode by default", () => {
    expect(resolveCheckinBackend(undefined)).toBe("local");
    expect(resolveCheckinBackend("LOCAL")).toBe("local");
  });

  it("resolves firestore mode explicitly", () => {
    expect(resolveCheckinBackend("firestore")).toBe("firestore");
    expect(resolveCheckinBackend("FIRESTORE")).toBe("firestore");
  });

  it("creates local adapter when backend is local", () => {
    const store = createCheckinStore("local");

    expect(store.backend).toBe("local");
    store.addCheckin(
      {
        date: "2026-06-27",
        focus: "Deep Work",
        dose: "light",
        minutes: 3,
        status: "done",
      },
      "guest",
    );

    expect(vi.mocked(addCheckin)).toHaveBeenCalledTimes(1);
  });

  it("uses local fallback adapter when backend is firestore", () => {
    const store = createCheckinStore("firestore");

    expect(store.backend).toBe("firestore-fallback");
    store.getWeeklySummary(undefined, "guest");
    expect(vi.mocked(getWeeklySummary)).toHaveBeenCalledTimes(1);
  });
});