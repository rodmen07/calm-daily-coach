/**
 * Journal persistence store with backend selection (v0.9).
 *
 * Reuses the check-in backend's resolution policy wholesale: same
 * NEXT_PUBLIC_CHECKIN_BACKEND repo variable, same "Firebase configured AND
 * signed in => firestore" default (see resolveCheckinBackend in
 * checkin-store.ts for the full matrix). There is no
 * NEXT_PUBLIC_JOURNAL_BACKEND variable and none is planned: one resolution
 * policy is one less config surface to keep consistent, and there is no
 * product reason for check-ins and journal entries to sync on different
 * conditions. If that ever changes, this is the one place to add a
 * journal-specific override.
 *
 * Safety property (mirrors check-ins): a resolved "firestore" backend still
 * degrades safely. createJournalStore returns the "firestore-fallback"
 * adapter (pure local semantics) when the Firestore client is unavailable,
 * and every Firestore write/read falls back to local storage on error, so a
 * journal entry is never lost. Explicitly out of scope for v0.9: migrating
 * existing guest localStorage entries into a signed-in scope (tracked as a
 * named follow-up, not silently dropped).
 */
import {
  resolveCheckinBackend,
  type CheckinBackendContext,
  type CheckinBackendMode,
} from "@/lib/checkin-store";
import {
  listJournalEntries as listLocalJournalEntries,
  saveJournalEntry as saveLocalJournalEntry,
  type JournalEntry,
} from "@/lib/journal";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  addFirestoreJournalEntry,
  listFirestoreJournalEntries,
} from "@/lib/firestore-journal";

export type JournalBackendContext = CheckinBackendContext;
export type JournalBackendMode = CheckinBackendMode;

export type JournalStoreAdapter = {
  backend: JournalBackendMode | "firestore-fallback";
  listJournalEntries: (scopeKey: string) => Promise<JournalEntry[]>;
  saveJournalEntry: (
    dateKey: string,
    text: string,
    scopeKey: string,
  ) => Promise<JournalEntry | null>;
};

export function createJournalStore(
  rawBackend?: string,
  context: JournalBackendContext = {},
): JournalStoreAdapter {
  const db = getFirebaseFirestore();
  const backend = resolveCheckinBackend(rawBackend, {
    ...context,
    firebaseConfigured: context.firebaseConfigured ?? db !== null,
  });

  const localStore: JournalStoreAdapter = {
    backend: "local",
    listJournalEntries: async (scopeKey) => listLocalJournalEntries(scopeKey),
    saveJournalEntry: async (dateKey, text, scopeKey) =>
      saveLocalJournalEntry(dateKey, text, scopeKey),
  };

  if (backend === "firestore") {
    if (!db) {
      return {
        ...localStore,
        backend: "firestore-fallback",
      };
    }

    return {
      backend: "firestore",
      listJournalEntries: async (scopeKey) => {
        try {
          return await listFirestoreJournalEntries(db, scopeKey);
        } catch {
          return listLocalJournalEntries(scopeKey);
        }
      },
      saveJournalEntry: async (dateKey, text, scopeKey) => {
        try {
          return await addFirestoreJournalEntry(db, dateKey, text, scopeKey);
        } catch {
          return saveLocalJournalEntry(dateKey, text, scopeKey);
        }
      },
    };
  }

  return localStore;
}
