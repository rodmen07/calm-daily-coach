import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

const mockCreateCheckinStore = vi.fn();
vi.mock("@/lib/checkin-store", () => ({
  createCheckinStore: (...args: unknown[]) => mockCreateCheckinStore(...args),
}));

const emptySummary = {
  windowStart: "2026-07-13",
  windowEnd: "2026-07-19",
  total: 0,
  done: 0,
  skipped: 0,
  completionRate: 0,
  byFocus: {},
};

type AdapterMock = ReturnType<typeof createAdapterMock>;

let lastAdapter: AdapterMock | null = null;

function createAdapterMock(backend: string) {
  const adapter = {
    backend,
    addCheckin: vi.fn(async () => {}),
    getWeeklySummary: vi.fn(async () => emptySummary),
    migrateGuestCheckins: vi.fn(async () => ({
      status: "skipped" as const,
      migratedCount: 0,
    })),
  };
  lastAdapter = adapter;
  return adapter;
}

async function waitForHydration() {
  await waitFor(() => {
    expect(lastAdapter?.getWeeklySummary).toHaveBeenCalled();
  });
}

describe("useCoachPlanner check-in store wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    lastAdapter = null;
    mockCreateCheckinStore.mockImplementation(() => createAdapterMock("local"));
  });

  it("creates the store as signed out for the guest scope", async () => {
    renderHook(() => useCoachPlanner({ storageScope: "guest" }));

    expect(mockCreateCheckinStore).toHaveBeenCalledWith(undefined, { signedIn: false });
    await waitForHydration();
  });

  it("creates the store as signed in for a uid scope", async () => {
    renderHook(() =>
      useCoachPlanner({ storageScope: "user-123", authEmail: "me@example.com" }),
    );

    expect(mockCreateCheckinStore).toHaveBeenCalledWith(undefined, { signedIn: true });
    await waitForHydration();
  });

  it("re-creates the store when the scope transitions from guest to a uid", async () => {
    const { rerender } = renderHook(
      ({ storageScope }: { storageScope: string }) => useCoachPlanner({ storageScope }),
      { initialProps: { storageScope: "guest" } },
    );

    expect(mockCreateCheckinStore).toHaveBeenCalledWith(undefined, { signedIn: false });

    rerender({ storageScope: "user-123" });

    expect(mockCreateCheckinStore).toHaveBeenCalledWith(undefined, { signedIn: true });
    await waitForHydration();
  });
});
