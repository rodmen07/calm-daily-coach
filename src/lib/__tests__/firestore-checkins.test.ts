import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import { getFirestoreCheckinsInRange } from "@/lib/firestore-checkins";

// firestore-checkins.ts had no dedicated test file of its own before v0.11 -
// it was only exercised indirectly through checkin-store.test.ts's mocked
// adapter (docs/design/TRENDS_OVER_TIME.md section 3.4). This mocks
// firebase/firestore directly and exercises the real
// getFirestoreCheckinsInRange body, following the precedent
// firestore-journal.test.ts set in PR #90.
const mockGetDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

function docSnapshot(id: string, data: unknown) {
  return { id, data: () => data };
}

describe("firestore-checkins: getFirestoreCheckinsInRange", () => {
  const db = {} as Firestore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns well-formed check-in records with the document id attached", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        docSnapshot("doc-1", {
          date: "2026-07-15",
          focus: "Deep Work",
          dose: "medium",
          minutes: 15,
          status: "done",
          createdAt: "2026-07-15T09:00:00.000Z",
        }),
      ],
    });

    const result = await getFirestoreCheckinsInRange(db, 28, "2026-07-20", "user-123");

    expect(result).toEqual([
      {
        id: "doc-1",
        date: "2026-07-15",
        focus: "Deep Work",
        dose: "medium",
        minutes: 15,
        status: "done",
        skipReason: undefined,
        createdAt: "2026-07-15T09:00:00.000Z",
      },
    ]);
  });

  it("skips a malformed document missing required fields instead of returning it with undefined date/focus/status", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        docSnapshot("well-formed", {
          date: "2026-07-15",
          focus: "Fitness",
          dose: "light",
          minutes: 5,
          status: "done",
          createdAt: "2026-07-15T09:00:00.000Z",
        }),
        // Missing "status" entirely (e.g. a partially failed write).
        docSnapshot("missing-status", {
          date: "2026-07-14",
          focus: "Fitness",
          dose: "light",
          minutes: 5,
          createdAt: "2026-07-14T09:00:00.000Z",
        }),
        // Missing "focus" entirely.
        docSnapshot("missing-focus", {
          date: "2026-07-13",
          dose: "light",
          minutes: 5,
          status: "done",
          createdAt: "2026-07-13T09:00:00.000Z",
        }),
        // Missing "date" entirely.
        docSnapshot("missing-date", {
          focus: "Fitness",
          dose: "light",
          minutes: 5,
          status: "done",
          createdAt: "2026-07-12T09:00:00.000Z",
        }),
      ],
    });

    const result = await getFirestoreCheckinsInRange(db, 28, "2026-07-20", "user-123");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("well-formed");
  });

  it("returns an empty array when the collection has no documents in range", async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getFirestoreCheckinsInRange(db, 28, "2026-07-20", "user-123");

    expect(result).toEqual([]);
  });
});
