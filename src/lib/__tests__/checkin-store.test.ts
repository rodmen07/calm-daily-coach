import { createCheckinStore, resolveCheckinBackend } from "@/lib/checkin-store";
import { addCheckin, getWeeklySummary, listCheckins } from "@/lib/browser-checkins";
import { addFirestoreCheckin, getFirestoreWeeklySummary } from "@/lib/firestore-checkins";
import { getFirebaseFirestore } from "@/lib/firebase";
import type { Firestore } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  getFirebaseFirestore: vi.fn(() => null),
}));

vi.mock("@/lib/browser-checkins", () => ({
  addCheckin: vi.fn(),
  listCheckins: vi.fn(() => []),
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
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

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

  it("migrates guest checkins into signed-in scope once", async () => {
    vi.mocked(listCheckins).mockReturnValue([
      {
        id: "1",
        createdAt: "2026-06-27T10:00:00.000Z",
        date: "2026-06-27",
        focus: "Deep Work",
        dose: "light",
        minutes: 3,
        status: "done",
      },
    ]);

    const store = createCheckinStore("local");
    const first = await store.migrateGuestCheckins("user-123");
    const second = await store.migrateGuestCheckins("user-123");

    expect(first.status).toBe("migrated");
    expect(first.migratedCount).toBe(1);
    expect(second.status).toBe("already-migrated");
    expect(vi.mocked(addCheckin)).toHaveBeenCalledTimes(1);
  });

  it("skips migration for guest scope", async () => {
    const store = createCheckinStore("local");
    const result = await store.migrateGuestCheckins("guest");

    expect(result.status).toBe("skipped");
    expect(result.migratedCount).toBe(0);
  });
});