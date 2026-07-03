import type { AsyncStatus } from "@/lib/async-status";
import type { WeeklySummary } from "@/lib/browser-checkins";
import type { CheckinStoreAdapter } from "@/lib/checkin-store";
import type { SavedPlannerState } from "@/lib/planner-state";

export type HydratePlannerSessionInput = {
  initialState: SavedPlannerState;
  authEmail?: string | null;
  storageScope: string;
  checkinStore: Pick<CheckinStoreAdapter, "migrateGuestCheckins" | "getWeeklySummary">;
};

export type HydratePlannerSessionResult = {
  nextState: SavedPlannerState;
  migrationStatus: AsyncStatus;
  weeklySummary: WeeklySummary | null;
};

export async function hydratePlannerSession({
  initialState,
  authEmail,
  storageScope,
  checkinStore,
}: HydratePlannerSessionInput): Promise<HydratePlannerSessionResult> {
  let migrationStatus: AsyncStatus = { type: "idle" };

  if (storageScope !== "guest") {
    const migration = await checkinStore.migrateGuestCheckins(storageScope);

    if (migration.status === "migrated" && migration.migratedCount > 0) {
      migrationStatus = {
        type: "ok",
        message: `Migrated ${migration.migratedCount} guest check-in${migration.migratedCount === 1 ? "" : "s"} to your account.`,
      };
    } else if (migration.status === "error") {
      migrationStatus = {
        type: "error",
        message: "Could not migrate guest check-ins to your account.",
      };
    }
  }

  let weeklySummary: WeeklySummary | null = null;
  try {
    weeklySummary = await checkinStore.getWeeklySummary(undefined, storageScope);
  } catch {
    weeklySummary = null;
  }

  return {
    nextState: {
      ...initialState,
      email: initialState.email || authEmail || "",
    },
    migrationStatus,
    weeklySummary,
  };
}
