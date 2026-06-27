import {
  addCheckin as addBrowserCheckin,
  getWeeklySummary as getBrowserWeeklySummary,
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
};

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
    };
  }

  return localStore;
}