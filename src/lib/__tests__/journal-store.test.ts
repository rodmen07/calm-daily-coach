import { createJournalStore } from "@/lib/journal-store";
import { listJournalEntries, saveJournalEntry } from "@/lib/journal";
import {
  addFirestoreJournalEntry,
  listFirestoreJournalEntries,
} from "@/lib/firestore-journal";
import { getFirebaseFirestore } from "@/lib/firebase";
import type { Firestore } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  getFirebaseFirestore: vi.fn(() => null),
}));

vi.mock("@/lib/journal", () => ({
  listJournalEntries: vi.fn(() => []),
  saveJournalEntry: vi.fn((dateKey: string, text: string) => ({
    date: dateKey,
    text: text.trim(),
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  })),
}));

vi.mock("@/lib/firestore-journal", () => ({
  addFirestoreJournalEntry: vi.fn((_db: unknown, dateKey: string, text: string) =>
    Promise.resolve({
      date: dateKey,
      text: text.trim(),
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    }),
  ),
  listFirestoreJournalEntries: vi.fn(() => Promise.resolve([])),
}));

// Mirrors src/lib/__tests__/checkin-store.test.ts's local/firestore/fallback/
// override coverage, adapted to the journal's read/write pair. The scenarios
// come straight from docs/design/JOURNAL_FIRESTORE_SYNC.md's done-when:
// unconfigured or signed-out stays local; configured and signed-in resolves
// firestore; a thrown Firestore error falls back to local; firestore mode is
// requested but Firestore itself is unavailable (misconfigured/offline, not
// a thrown error) falls back to local too; explicit local override always
// wins regardless of config.
describe("journal-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFirebaseFirestore).mockReturnValue(null);
    window.localStorage.clear();
  });

  it("pure local: stays local when unconfigured or signed out", async () => {
    const store = createJournalStore(undefined, { signedIn: false });
    expect(store.backend).toBe("local");

    await store.saveJournalEntry("2026-07-20", "Grateful for warm coffee.", "guest");
    await store.listJournalEntries("guest");

    expect(vi.mocked(saveJournalEntry)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(listJournalEntries)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(addFirestoreJournalEntry)).not.toHaveBeenCalled();
    expect(vi.mocked(listFirestoreJournalEntries)).not.toHaveBeenCalled();
  });

  it("pure firestore: resolves firestore when configured and signed in", async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValue({} as Firestore);
    const store = createJournalStore(undefined, { signedIn: true });
    expect(store.backend).toBe("firestore");

    await store.saveJournalEntry("2026-07-20", "Grateful for warm coffee.", "user-123");
    await store.listJournalEntries("user-123");

    expect(vi.mocked(addFirestoreJournalEntry)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(listFirestoreJournalEntries)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveJournalEntry)).not.toHaveBeenCalled();
    expect(vi.mocked(listJournalEntries)).not.toHaveBeenCalled();
  });

  it("firestore-with-fallback-to-local: a thrown Firestore error falls back to local", async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValue({} as Firestore);
    vi.mocked(addFirestoreJournalEntry).mockRejectedValueOnce(new Error("permission-denied"));
    vi.mocked(listFirestoreJournalEntries).mockRejectedValueOnce(new Error("permission-denied"));
    vi.mocked(listJournalEntries).mockReturnValueOnce([
      {
        date: "2026-07-19",
        text: "Yesterday's local fallback entry.",
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      },
    ]);

    const store = createJournalStore(undefined, { signedIn: true });
    expect(store.backend).toBe("firestore");

    const saved = await store.saveJournalEntry("2026-07-20", "Grateful for warm coffee.", "user-123");
    const listed = await store.listJournalEntries("user-123");

    expect(vi.mocked(addFirestoreJournalEntry)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(listFirestoreJournalEntries)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveJournalEntry)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(listJournalEntries)).toHaveBeenCalledTimes(1);
    // Call counts alone don't prove the caller actually gets usable data back
    // on the fallback path: assert the returned VALUES too.
    expect(saved).toEqual({
      date: "2026-07-20",
      text: "Grateful for warm coffee.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    expect(listed).toEqual([
      {
        date: "2026-07-19",
        text: "Yesterday's local fallback entry.",
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      },
    ]);
  });

  it("firestore-fallback: uses the local fallback adapter when firestore mode is requested but not configured", async () => {
    // Mirrors checkin-store.test.ts's "uses local fallback adapter when
    // firestore mode is requested but not configured" (getFirebaseFirestore
    // returns null here via the beforeEach default, i.e. misconfigured or
    // offline, not a thrown-error case like the test above).
    const store = createJournalStore("firestore");

    expect(store.backend).toBe("firestore-fallback");

    await store.saveJournalEntry("2026-07-20", "Grateful for warm coffee.", "guest");
    await store.listJournalEntries("guest");

    expect(vi.mocked(saveJournalEntry)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(listJournalEntries)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(addFirestoreJournalEntry)).not.toHaveBeenCalled();
    expect(vi.mocked(listFirestoreJournalEntries)).not.toHaveBeenCalled();
  });

  it("explicit override: an explicit local setting always wins regardless of config", async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValue({} as Firestore);
    const store = createJournalStore("local", { signedIn: true });
    expect(store.backend).toBe("local");

    await store.saveJournalEntry("2026-07-20", "Grateful for warm coffee.", "user-123");

    expect(vi.mocked(saveJournalEntry)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(addFirestoreJournalEntry)).not.toHaveBeenCalled();
  });
});
