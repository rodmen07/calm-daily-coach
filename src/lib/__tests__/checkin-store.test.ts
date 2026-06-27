import { createCheckinStore, resolveCheckinBackend } from "@/lib/checkin-store";
import { addCheckin, getWeeklySummary } from "@/lib/browser-checkins";
import { addFirestoreCheckin, getFirestoreWeeklySummary } from "@/lib/firestore-checkins";
import { getFirebaseFirestore } from "@/lib/firebase";
import type { Firestore } from "firebase/firestore";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  getFirebaseFirestore: vi.fn(() => null),
}));

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

vi.mock("@/lib/firestore-checkins", () => ({
  addFirestoreCheckin: vi.fn(),
  getFirestoreWeeklySummary: vi.fn(() =>
    Promise.resolve({
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
    }),
  ),
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

  it("creates local adapter when backend is local", async () => {
    const store = createCheckinStore("local");

    expect(store.backend).toBe("local");
    await store.addCheckin(
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

  it("uses local fallback adapter when firestore mode is requested but not configured", async () => {
    const store = createCheckinStore("firestore");

    expect(store.backend).toBe("firestore-fallback");
    await store.getWeeklySummary(undefined, "guest");
    expect(vi.mocked(getWeeklySummary)).toHaveBeenCalledTimes(1);
  });

  it("uses Firestore adapter when configured", async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValue({} as Firestore);
    const store = createCheckinStore("firestore");

    expect(store.backend).toBe("firestore");
    await store.addCheckin(
      {
        date: "2026-06-27",
        focus: "Deep Work",
        dose: "light",
        minutes: 3,
        status: "done",
      },
      "guest",
    );

    await store.getWeeklySummary(undefined, "guest");

    expect(vi.mocked(addFirestoreCheckin)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getFirestoreWeeklySummary)).toHaveBeenCalledTimes(1);
  });
});