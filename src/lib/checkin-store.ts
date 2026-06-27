import {
  addCheckin as addBrowserCheckin,
  getWeeklySummary as getBrowserWeeklySummary,
  listCheckins,
  type BrowserCheckin,
  type WeeklySummary,
} from "@/lib/browser-checkins";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  addFirestoreCheckin,
  getFirestoreWeeklySummary,
} from "@/lib/firestore-checkins";

export type CheckinBackendMode = "local" | "firestore";

export type CheckinInput = Omit<BrowserCheckin, "id" | "createdAt">;

export type CheckinStoreAdapter = {
  backend: CheckinBackendMode | "firestore-fallback";
  addCheckin: (input: CheckinInput, scopeKey: string) => Promise<void>;
  getWeeklySummary: (
    endDateInput: string | undefined,
    scopeKey: string,
  ) => Promise<WeeklySummary>;
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

export function resolveCheckinBackend(rawBackend = process.env.NEXT_PUBLIC_CHECKIN_BACKEND) {
  if (rawBackend?.toLowerCase() === "firestore") {
    return "firestore" as const;
  }

  return "local" as const;
}

export function createCheckinStore(rawBackend?: string): CheckinStoreAdapter {
  const backend = resolveCheckinBackend(rawBackend);
  const db = getFirebaseFirestore();

  const localStore: CheckinStoreAdapter = {
    backend: "local",
    addCheckin: async (input, scopeKey) => {
      addBrowserCheckin(input, scopeKey);
    },
    getWeeklySummary: async (endDateInput, scopeKey) => {
      return getBrowserWeeklySummary(endDateInput, scopeKey);
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