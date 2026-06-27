import {
  addCheckin as addBrowserCheckin,
  getWeeklySummary as getBrowserWeeklySummary,
  type BrowserCheckin,
  type WeeklySummary,
} from "@/lib/browser-checkins";

export type CheckinBackendMode = "local" | "firestore";

export type CheckinInput = Omit<BrowserCheckin, "id" | "createdAt">;

export type CheckinStoreAdapter = {
  backend: CheckinBackendMode | "firestore-fallback";
  addCheckin: (input: CheckinInput, scopeKey: string) => void;
  getWeeklySummary: (endDateInput: string | undefined, scopeKey: string) => WeeklySummary;
};

export function resolveCheckinBackend(rawBackend = process.env.NEXT_PUBLIC_CHECKIN_BACKEND) {
  if (rawBackend?.toLowerCase() === "firestore") {
    return "firestore" as const;
  }

  return "local" as const;
}

export function createCheckinStore(rawBackend?: string): CheckinStoreAdapter {
  const backend = resolveCheckinBackend(rawBackend);

  if (backend === "firestore") {
    // Planned migration target: keep the app functional by falling back to local storage
    // until Firestore-backed persistence is implemented.
    return {
      backend: "firestore-fallback",
      addCheckin: addBrowserCheckin,
      getWeeklySummary: getBrowserWeeklySummary,
    };
  }

  return {
    backend: "local",
    addCheckin: addBrowserCheckin,
    getWeeklySummary: getBrowserWeeklySummary,
  };
}