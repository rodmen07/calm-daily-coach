import {
  JOURNAL_ENTRY_MAX_LENGTH,
  JOURNAL_PROMPTS,
  formatJournalDate,
  getJournalEntry,
  getJournalPrompt,
  journalPromptIndexForDate,
  listJournalEntries,
  localDateKey,
  saveJournalEntry,
} from "@/lib/journal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("journal store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("localDateKey", () => {
    it("formats the local calendar date with zero padding", () => {
      expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
      expect(localDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
    });

    it("keys a late evening by the local day, whatever UTC thinks", () => {
      expect(localDateKey(new Date(2026, 6, 19, 23, 30))).toBe("2026-07-19");
      expect(localDateKey(new Date(2026, 6, 19, 0, 15))).toBe("2026-07-19");
    });
  });

  describe("one entry per day", () => {
    it("saves a trimmed entry and lists it", () => {
      const saved = saveJournalEntry("2026-07-19", "  Warm coffee on the porch.  ", "guest");

      expect(saved?.text).toBe("Warm coffee on the porch.");
      const entries = listJournalEntries("guest");
      expect(entries).toHaveLength(1);
      expect(entries[0]?.date).toBe("2026-07-19");
    });

    it("re-saving the same date edits the single entry in place", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 19, 9, 0));
      const first = saveJournalEntry("2026-07-19", "First draft", "guest");

      vi.setSystemTime(new Date(2026, 6, 19, 21, 30));
      const second = saveJournalEntry("2026-07-19", "Second thoughts, kinder ones", "guest");

      const entries = listJournalEntries("guest");
      expect(entries).toHaveLength(1);
      expect(entries[0]?.text).toBe("Second thoughts, kinder ones");
      expect(second?.createdAt).toBe(first?.createdAt);
      expect(second?.updatedAt).not.toBe(first?.updatedAt);
    });

    it("treats whitespace-only saves as a quiet no-op", () => {
      expect(saveJournalEntry("2026-07-19", "   \n  ", "guest")).toBeNull();
      expect(listJournalEntries("guest")).toHaveLength(0);
    });

    it("bounds how much a single entry can store", () => {
      const saved = saveJournalEntry("2026-07-19", "a".repeat(JOURNAL_ENTRY_MAX_LENGTH + 500), "guest");
      expect(saved?.text).toHaveLength(JOURNAL_ENTRY_MAX_LENGTH);
    });
  });

  describe("date rollover", () => {
    it("starts a fresh entry after midnight and leaves yesterday's untouched", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 19, 21, 0));
      const dayOneKey = localDateKey();
      saveJournalEntry(dayOneKey, "Evening calm", "guest");

      vi.setSystemTime(new Date(2026, 6, 20, 0, 10));
      const dayTwoKey = localDateKey();
      expect(dayTwoKey).not.toBe(dayOneKey);
      expect(getJournalEntry(dayTwoKey, "guest")).toBeNull();

      saveJournalEntry(dayTwoKey, "A new quiet morning", "guest");

      const entries = listJournalEntries("guest");
      expect(entries).toHaveLength(2);
      expect(entries[0]?.date).toBe("2026-07-20");
      expect(entries[1]?.date).toBe("2026-07-19");
      expect(entries[1]?.text).toBe("Evening calm");
    });
  });

  describe("scoping and resilience", () => {
    it("keeps entries scoped by user key", () => {
      saveJournalEntry("2026-07-19", "Guest gratitude", "guest");
      saveJournalEntry("2026-07-19", "Account gratitude", "user-a");

      expect(listJournalEntries("guest")).toHaveLength(1);
      expect(listJournalEntries("guest")[0]?.text).toBe("Guest gratitude");
      expect(listJournalEntries("user-a")).toHaveLength(1);
      expect(listJournalEntries("user-a")[0]?.text).toBe("Account gratitude");
    });

    it("lists newest date first", () => {
      saveJournalEntry("2026-07-10", "Older", "guest");
      saveJournalEntry("2026-07-18", "Newest", "guest");
      saveJournalEntry("2026-07-14", "Middle", "guest");

      expect(listJournalEntries("guest").map((entry) => entry.date)).toEqual([
        "2026-07-18",
        "2026-07-14",
        "2026-07-10",
      ]);
    });

    it("returns an empty list for corrupted storage", () => {
      window.localStorage.setItem("calm-daily-coach-journal:guest", "{not json");
      expect(listJournalEntries("guest")).toEqual([]);

      window.localStorage.setItem("calm-daily-coach-journal:guest", JSON.stringify({ nope: true }));
      expect(listJournalEntries("guest")).toEqual([]);
    });
  });

  describe("prompt rotation", () => {
    it("is deterministic for a given date", () => {
      expect(getJournalPrompt("2026-07-19")).toBe(getJournalPrompt("2026-07-19"));
    });

    it("always selects a prompt from the fixed list", () => {
      for (let day = 1; day <= 28; day += 1) {
        const key = `2026-07-${String(day).padStart(2, "0")}`;
        const index = journalPromptIndexForDate(key);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(JOURNAL_PROMPTS.length);
        expect(getJournalPrompt(key)).toBe(JOURNAL_PROMPTS[index]);
      }
    });

    it("varies across nearby dates so the page never feels stuck", () => {
      const prompts = new Set(
        Array.from({ length: 10 }, (_, offset) =>
          getJournalPrompt(`2026-07-${String(offset + 1).padStart(2, "0")}`),
        ),
      );
      expect(prompts.size).toBeGreaterThan(1);
    });
  });

  describe("formatJournalDate", () => {
    it("renders a friendly date without time zone drift", () => {
      expect(formatJournalDate("2026-07-19")).toBe("July 19, 2026");
      expect(formatJournalDate("2026-01-05")).toBe("January 5, 2026");
      expect(formatJournalDate("2025-12-31")).toBe("December 31, 2025");
    });

    it("falls back to the raw key for malformed dates", () => {
      expect(formatJournalDate("not-a-date")).toBe("not-a-date");
      expect(formatJournalDate("2026-13-05")).toBe("2026-13-05");
    });
  });
});
