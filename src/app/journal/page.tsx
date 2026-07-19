"use client";

import { useState, type FormEvent } from "react";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { CalmEmptyState } from "@/app/components/empty-state";
import {
  JOURNAL_ENTRY_MAX_LENGTH,
  formatJournalDate,
  getJournalPrompt,
  listJournalEntries,
  localDateKey,
  saveJournalEntry,
  type JournalEntry,
} from "@/lib/journal";

// Earlier entries surface in small, finite steps: never an endless feed.
const HISTORY_CHUNK = 7;

export default function JournalPage() {
  const { authUser } = useCoachAuth();
  const scope = authUser?.uid ?? "guest";

  // Capture the day once at mount, like the daily affirmation, so the page
  // never swaps its date underneath a writer mid-session. A visit after
  // midnight simply starts the new day's blank page, and the previous entry
  // settles into the earlier-entries list. Nothing marks the days between.
  const [todayKey] = useState(() => localDateKey());

  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(HISTORY_CHUNK);

  // Load (or reload) persisted entries when the auth scope resolves or
  // changes, using the same render-phase adjust pattern as the slicer page.
  if (scope !== loadedScope) {
    const loaded = listJournalEntries(scope);
    setLoadedScope(scope);
    setEntries(loaded);
    setDraft(loaded.find((entry) => entry.date === todayKey)?.text ?? "");
    setIsEditing(false);
    setVisibleCount(HISTORY_CHUNK);
  }

  const todayEntry = entries.find((entry) => entry.date === todayKey) ?? null;
  const earlierEntries = entries.filter((entry) => entry.date !== todayKey);
  const visibleEarlierEntries = earlierEntries.slice(0, visibleCount);
  const prompt = getJournalPrompt(todayKey);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const saved = saveJournalEntry(todayKey, draft, scope);
    if (!saved) {
      return;
    }
    setEntries(listJournalEntries(scope));
    setDraft(saved.text);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setDraft(todayEntry?.text ?? "");
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraft(todayEntry?.text ?? "");
    setIsEditing(false);
  };

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel mb-5">
          <p className="eyebrow">Gratitude journal</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A quiet page for today
          </h1>
          <p className="mb-4 text-sm leading-6 text-slate-700 sm:text-base">
            One small entry a day, only if you feel like it. Nothing here counts
            days, keeps score, or asks you to catch up.
          </p>

          {!todayEntry || isEditing ? (
            <form onSubmit={handleSave} aria-label="Today's journal entry">
              <label htmlFor="journal-entry" className="label">
                {prompt}
              </label>
              <textarea
                id="journal-entry"
                className="field min-h-28 text-sm"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={JOURNAL_ENTRY_MAX_LENGTH}
                placeholder="A few words are plenty."
              />
              <p className="field-hint mt-2">
                Write as little or as much as feels right. You can edit today&apos;s
                entry any time.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={draft.trim().length === 0}
                >
                  Save today&apos;s entry
                </button>
                {todayEntry ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleCancelEditing}
                  >
                    Keep it as it was
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <div aria-label="Today's saved entry">
              <p
                className="journal-saved-note"
                data-testid="journal-saved-note"
                aria-live="polite"
              >
                Saved for today. One grateful thought is plenty.
              </p>
              <div className="journal-entry-card mt-3">
                <p className="journal-entry-date">{formatJournalDate(todayEntry.date)}</p>
                <p className="journal-entry-text">{todayEntry.text}</p>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleStartEditing}
                >
                  Edit today&apos;s entry
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel" aria-label="Earlier entries">
          <h2 className="mb-3 text-xl font-semibold">Earlier entries</h2>
          {earlierEntries.length === 0 ? (
            <CalmEmptyState
              variant="journal"
              title="No earlier entries, and that is fine"
              message="Anything you save will rest here quietly. There is no order to keep and nothing to catch up on."
            />
          ) : (
            <>
              <ul className="journal-history">
                {visibleEarlierEntries.map((entry) => (
                  <li key={entry.date} className="journal-entry-card">
                    <p className="journal-entry-date">{formatJournalDate(entry.date)}</p>
                    <p className="journal-entry-text">{entry.text}</p>
                  </li>
                ))}
              </ul>
              {earlierEntries.length > visibleCount ? (
                <div className="mt-3">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setVisibleCount((count) => count + HISTORY_CHUNK)}
                  >
                    Show earlier entries
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
