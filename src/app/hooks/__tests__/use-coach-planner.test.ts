import { act, renderHook, waitFor } from "@testing-library/react";
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

describe("useCoachPlanner check-in status persistence (regression: dashboard ring survives reload)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    lastAdapter = null;
    mockCreateCheckinStore.mockImplementation(() => createAdapterMock("local"));
  });

  it("rehydrates checkinStatus as ok from a fresh mount after a check-in was submitted", async () => {
    const today = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(
      "calm-daily-coach:guest",
      JSON.stringify({
        focus: "Deep Work",
        dose: "light",
        notes: "",
        email: "",
        plan: {
          date: today,
          focus: "Deep Work",
          dose: "light",
          minutes: 5,
          action: "Action",
          reflection: "Reflection",
          optionalResource: null,
          capMessage: "Done",
        },
        checkedIn: null,
      }),
    );

    const first = renderHook(() => useCoachPlanner({ storageScope: "guest" }));
    await waitFor(() => {
      expect(first.result.current.plan?.date).toBe(today);
    });

    await act(async () => {
      await first.result.current.submitCheckin("done");
    });

    expect(first.result.current.checkinStatus).toEqual({
      type: "ok",
      message: "Great work. Check-in saved.",
    });

    // Without the fix, checkinStatus lives only in this component's useState,
    // so unmounting (a reload in the real app) always throws it away and a
    // fresh mount starts back at { type: "idle" } (the dashboard ring's
    // reported 50 percent regression).
    first.unmount();

    const reloaded = renderHook(() => useCoachPlanner({ storageScope: "guest" }));
    await waitFor(() => {
      expect(reloaded.result.current.checkinStatus.type).toBe("ok");
    });

    expect(reloaded.result.current.checkinStatus).toEqual({
      type: "ok",
      message: "Great work. Check-in saved.",
    });
    expect(reloaded.result.current.plan?.date).toBe(today);
  });
});
