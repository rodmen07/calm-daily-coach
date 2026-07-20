/**
 * Check-in persistence store with backend selection.
 *
 * Backend resolution matrix (v0.4 "sync by default" flip):
 *
 * | NEXT_PUBLIC_CHECKIN_BACKEND | Firebase config | Signed in | Resolved backend |
 * |-----------------------------|-----------------|-----------|------------------|
 * | "local" (any case)          | any             | any       | local            |
 * | "firestore" (any case)      | any             | any       | firestore        |
 * | unset / empty / whitespace  | present         | yes       | firestore        |
 * | unset / empty / whitespace  | present         | no        | local            |
 * | unset / empty / whitespace  | absent          | any       | local            |
 * | any unrecognized value      | any             | any       | local            |
 *
 * Notes:
 * - "Signed in" is runtime state, so callers pass it via CheckinBackendContext
 *   (it defaults to false, which keeps server prerenders and signed-out visitors
 *   on local storage). "Firebase config" defaults to whether a Firestore client
 *   can be created from NEXT_PUBLIC_FIREBASE_* env vars.
 * - A resolved "firestore" backend still degrades safely: createCheckinStore
 *   returns the "firestore-fallback" adapter (pure local semantics) when the
 *   Firestore client is unavailable, and every Firestore write/read falls back
 *   to local storage on error, so a check-in is never lost. Under the automatic
 *   default, "firestore" is only chosen when Firebase config is present, so
 *   "firestore-fallback" can only arise from an explicit firestore setting.
 * - Rollback lever: set the repository variable NEXT_PUBLIC_CHECKIN_BACKEND to
 *   "local" (inlined by .github/workflows/deploy-pages.yml) to force local mode
 *   without a code change.
 */
import {
  addCheckin as addBrowserCheckin,
  getWeeklySummary as getBrowserWeeklySummary,
  listCheckins,
  listCheckinsInRange as listBrowserCheckinsInRange,
  type BrowserCheckin,
  type WeeklySummary,
} from "@/lib/browser-checkins";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  addFirestoreCheckin,
  getFirestoreCheckinsInRange,
  getFirestoreWeeklySummary,
} from "@/lib/firestore-checkins";

export type CheckinBackendMode = "local" | "firestore";

export type CheckinBackendContext = {
  /**
   * Whether Firebase client config is present (a Firestore client can be
   * created). Defaults to probing the Firebase env config.
   */
  firebaseConfigured?: boolean;
  /**
   * Whether a user is currently signed in. Auth state is async and only the
   * caller knows it, so it must be passed in; defaults to false (safe: local).
   */
  signedIn?: boolean;
};

export type CheckinInput = Omit<BrowserCheckin, "id" | "createdAt">;

export type CheckinStoreAdapter = {
  backend: CheckinBackendMode | "firestore-fallback";
  addCheckin: (input: CheckinInput, scopeKey: string) => Promise<void>;
  getWeeklySummary: (
    endDateInput: string | undefined,
    scopeKey: string,
  ) => Promise<WeeklySummary>;
  /**
   * Every check-in in a caller-chosen `days`-long window (v0.11 Trends). This
   * is the ONLY sanctioned way to read a wider check-in history: a real bug
   * was found in review/page.tsx (filed in the backlog, not fixed here)
   * where the review page bypasses this adapter and calls
   * browser-checkins.ts's listCheckins directly, silently showing empty data
   * for signed-in Firestore-synced users. Every caller of check-in history
   * beyond the current single-week summary must go through this method.
   */
  getCheckinsInRange: (
    days: number,
    endDateInput: string | undefined,
    scopeKey: string,
  ) => Promise<BrowserCheckin[]>;
  migrateGuestCheckins: (targetScopeKey: string) => Promise<{
    status: "migrated" | "already-migrated" | "skipped" | "error";
    migratedCount: number;
  }>;
};

const MIGRATION_MARKER_KEY = "calm-daily-coach-migrated-guest";

function migrationMarker(targetScopeKey: string, backend: CheckinStoreAdapter["backend"]) {
  return `${MIGRATION_MARKER_KEY}:${targetScopeKey}:${backend}`;
}

async function migrateGuestCheckinsWithAdapter(
  adapter: Pick<CheckinStoreAdapter, "addCheckin" | "backend">,
  targetScopeKey: string,
) {
  if (typeof window === "undefined") {
    return { status: "skipped" as const, migratedCount: 0 };
  }

  if (!targetScopeKey || targetScopeKey === "guest") {
    return { status: "skipped" as const, migratedCount: 0 };
  }

  const marker = migrationMarker(targetScopeKey, adapter.backend);
  if (window.localStorage.getItem(marker) === "1") {
    return { status: "already-migrated" as const, migratedCount: 0 };
  }

  const guestCheckins = listCheckins("guest");
  if (guestCheckins.length === 0) {
    window.localStorage.setItem(marker, "1");
    return { status: "skipped" as const, migratedCount: 0 };
  }

  let migratedCount = 0;

  try {
    for (const checkin of guestCheckins) {
      await adapter.addCheckin(
        {
          date: checkin.date,
          focus: checkin.focus,
          dose: checkin.dose,
          minutes: checkin.minutes,
          status: checkin.status,
          skipReason: checkin.skipReason,
        },
        targetScopeKey,
      );
      migratedCount += 1;
    }

    window.localStorage.setItem(marker, "1");
    return { status: "migrated" as const, migratedCount };
  } catch {
    return { status: "error" as const, migratedCount };
  }
}

export function resolveCheckinBackend(
  rawBackend = process.env.NEXT_PUBLIC_CHECKIN_BACKEND,
  context: CheckinBackendContext = {},
): CheckinBackendMode {
  const normalized = rawBackend?.trim().toLowerCase() ?? "";

  if (normalized === "firestore") {
    return "firestore";
  }

  if (normalized !== "") {
    // Explicit "local" and any unrecognized value force the safest mode.
    return "local";
  }

  // Unset: default to cloud sync only when it can actually work right now.
  const firebaseConfigured =
    context.firebaseConfigured ?? getFirebaseFirestore() !== null;
  const signedIn = context.signedIn ?? false;

  return firebaseConfigured && signedIn ? "firestore" : "local";
}

export function createCheckinStore(
  rawBackend?: string,
  context: CheckinBackendContext = {},
): CheckinStoreAdapter {
  const db = getFirebaseFirestore();
  const backend = resolveCheckinBackend(rawBackend, {
    ...context,
    firebaseConfigured: context.firebaseConfigured ?? db !== null,
  });

  const localStore: CheckinStoreAdapter = {
    backend: "local",
    addCheckin: async (input, scopeKey) => {
      addBrowserCheckin(input, scopeKey);
    },
    getWeeklySummary: async (endDateInput, scopeKey) => {
      return getBrowserWeeklySummary(endDateInput, scopeKey);
    },
    getCheckinsInRange: async (days, endDateInput, scopeKey) => {
      return listBrowserCheckinsInRange(days, endDateInput, scopeKey);
    },
    migrateGuestCheckins: async (targetScopeKey) => {
      return migrateGuestCheckinsWithAdapter(localStore, targetScopeKey);
    },
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
      addCheckin: async (input, scopeKey) => {
        try {
          await addFirestoreCheckin(db, input, scopeKey);
        } catch {
          addBrowserCheckin(input, scopeKey);
        }
      },
      getWeeklySummary: async (endDateInput, scopeKey) => {
        try {
          return await getFirestoreWeeklySummary(db, endDateInput, scopeKey);
        } catch {
          return getBrowserWeeklySummary(endDateInput, scopeKey);
        }
      },
      getCheckinsInRange: async (days, endDateInput, scopeKey) => {
        try {
          return await getFirestoreCheckinsInRange(db, days, endDateInput, scopeKey);
        } catch {
          return listBrowserCheckinsInRange(days, endDateInput, scopeKey);
        }
      },
      migrateGuestCheckins: async (targetScopeKey) => {
        const firestoreAdapter: Pick<CheckinStoreAdapter, "addCheckin" | "backend"> = {
          backend: "firestore",
          addCheckin: async (input, scopeKey) => {
            await addFirestoreCheckin(db, input, scopeKey);
          },
        };

        const result = await migrateGuestCheckinsWithAdapter(firestoreAdapter, targetScopeKey);

        if (result.status === "error") {
          return migrateGuestCheckinsWithAdapter(localStore, targetScopeKey);
        }

        return result;
      },
    };
  }

  return localStore;
}