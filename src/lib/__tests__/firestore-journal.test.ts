import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import {
  addFirestoreJournalEntry,
  listFirestoreJournalEntries,
} from "@/lib/firestore-journal";

// Unlike journal-store.test.ts (which mocks this whole module out), these
// tests exercise the real listFirestoreJournalEntries/addFirestoreJournalEntry
// bodies against a mocked firebase/firestore client SDK, since that is the
// only way to prove the field-presence check inside listFirestoreJournalEntries
// actually runs.
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

function docSnapshot(data: unknown) {
  return { data: () => data };
}

describe("firestore-journal", () => {
  const db = {} as Firestore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns well-formed entries unchanged", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        docSnapshot({
          date: "2026-07-20",
          text: "Grateful for warm coffee.",
          createdAt: "2026-07-20T00:00:00.000Z",
          updatedAt: "2026-07-20T00:00:00.000Z",
        }),
      ],
    });

    const entries = await listFirestoreJournalEntries(db, "user-123");

    expect(entries).toEqual([
      {
        date: "2026-07-20",
        text: "Grateful for warm coffee.",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z",
      },
    ]);
  });

  it("skips a malformed document missing required fields instead of returning it with undefined date/text", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        docSnapshot({
          date: "2026-07-20",
          text: "Well-formed entry.",
          createdAt: "2026-07-20T00:00:00.000Z",
          updatedAt: "2026-07-20T00:00:00.000Z",
        }),
        // Missing "text" entirely (e.g. a partially failed write).
        docSnapshot({
          date: "2026-07-19",
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        }),
        // Missing "date" entirely.
        docSnapshot({
          text: "Orphaned entry with no date key.",
          createdAt: "2026-07-18T00:00:00.000Z",
          updatedAt: "2026-07-18T00:00:00.000Z",
        }),
        // Present but empty string fields should be treated as absent too.
        docSnapshot({
          date: "",
          text: "",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        }),
      ],
    });

    const entries = await listFirestoreJournalEntries(db, "user-123");

    // Without the fix this would be a 4-entry array carrying undefined date
    // or text fields straight through to the caller instead of being skipped.
    expect(entries).toEqual([
      {
        date: "2026-07-20",
        text: "Well-formed entry.",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z",
      },
    ]);
  });

  it("adds an entry via setDoc, trimming the text and preserving createdAt on update", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        date: "2026-07-20",
        text: "Earlier text.",
        createdAt: "2026-07-20T08:00:00.000Z",
        updatedAt: "2026-07-20T08:00:00.000Z",
      }),
    });

    const entry = await addFirestoreJournalEntry(
      db,
      "2026-07-20",
      "  Grateful for warm coffee.  ",
      "user-123",
    );

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(entry).not.toBeNull();
    expect(entry?.text).toBe("Grateful for warm coffee.");
    expect(entry?.createdAt).toBe("2026-07-20T08:00:00.000Z");
  });
});
