/**
 * Gratitude journal store (cdc-014): one calm entry per local day.
 *
 * This module is the local-storage half only, scoped by user key, matching
 * the slicer and reminder-preference surfaces. As of v0.9, journal entries
 * DO have a Firestore-backed sync path: `journal-store.ts` wraps this module
 * behind the same backend-resolution policy check-ins use (local vs.
 * firestore vs. firestore-fallback), `firestore-journal.ts` holds the actual
 * Firestore client calls, and `src/app/journal/page.tsx` reads and writes
 * through that adapter rather than calling this module directly. Functions
 * here remain the source of truth for the local shape and the one-entry-
 * per-day upsert rule; they are not a dead-end read/write path.
 *
 * Product rules baked into this module:
 * - Entries are keyed by local calendar date, so there is exactly one entry
 *   per day. Saving again on the same day edits that entry in place.
 * - Missing days leave no trace: no streaks, no gaps, no counters. The list
 *   is simply whatever was written, newest first.
 */

export type JournalEntry = {
  /** Local calendar date key (YYYY-MM-DD). Unique per scope. */
  date: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

const JOURNAL_STORAGE_KEY_PREFIX = "calm-daily-coach-journal";

/** Soft bound so a single entry can never grow unbounded in storage. */
export const JOURNAL_ENTRY_MAX_LENGTH = 2000;

// Gentle, optional prompts. One is offered per day; none of them demands an
// answer, and the rotation exists only so the page does not feel repetitive.
export const JOURNAL_PROMPTS: readonly string[] = [
  "What is one small thing that felt good today?",
  "Name something, or someone, you were glad to have around today.",
  "What is one moment from today you would like to keep?",
  "What made today a little lighter?",
  "What is something ordinary that quietly helped you today?",
];

function scopedJournalKey(scopeKey: string): string {
  return `${JOURNAL_STORAGE_KEY_PREFIX}:${scopeKey}`;
}

// Same stable string hash used for daily affirmations: deterministic across
// sessions so the day's prompt never changes underneath the writer.
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Local calendar date as YYYY-MM-DD. Deliberately not toISOString(): an
 * evening entry belongs to the writer's own day, not to UTC's.
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function journalPromptIndexForDate(dateKey: string): number {
  return stableHash(dateKey) % JOURNAL_PROMPTS.length;
}

export function getJournalPrompt(dateKey: string): string {
  return JOURNAL_PROMPTS[journalPromptIndexForDate(dateKey)];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Human-friendly date for the history list ("July 19, 2026"). Parsed by hand
 * so a date-only key never shifts across time zones.
 */
export function formatJournalDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return dateKey;
  }

  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return dateKey;
  }

  return `${MONTH_NAMES[monthIndex]} ${Number(match[3])}, ${match[1]}`;
}

function parseEntries(raw: string | null): JournalEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as JournalEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

/** All entries for a scope, newest date first. Finite by construction. */
export function listJournalEntries(scopeKey = "guest"): JournalEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(scopedJournalKey(scopeKey));
  return parseEntries(raw).sort((a, b) => b.date.localeCompare(a.date));
}

export function getJournalEntry(dateKey: string, scopeKey = "guest"): JournalEntry | null {
  return listJournalEntries(scopeKey).find((entry) => entry.date === dateKey) ?? null;
}

/**
 * Upsert the single entry for a date. Re-saving the same date edits that
 * entry in place (createdAt is preserved), so one-per-day always holds.
 * Whitespace-only text is a quiet no-op and returns null.
 */
export function saveJournalEntry(
  dateKey: string,
  text: string,
  scopeKey = "guest",
): JournalEntry | null {
  if (typeof window === "undefined") {
    return null;
  }

  const trimmed = text.trim().slice(0, JOURNAL_ENTRY_MAX_LENGTH);
  if (!trimmed) {
    return null;
  }

  const now = new Date().toISOString();
  const entries = listJournalEntries(scopeKey);
  const existing = entries.find((entry) => entry.date === dateKey);

  const next: JournalEntry = existing
    ? { ...existing, text: trimmed, updatedAt: now }
    : { date: dateKey, text: trimmed, createdAt: now, updatedAt: now };

  const updated = [...entries.filter((entry) => entry.date !== dateKey), next];
  window.localStorage.setItem(scopedJournalKey(scopeKey), JSON.stringify(updated));

  return next;
}
