import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReviewPage from "@/app/review/page";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

vi.mock("@/app/hooks/use-coach-auth", () => ({
  useCoachAuth: vi.fn(),
}));

vi.mock("@/app/hooks/use-coach-planner", () => ({
  useCoachPlanner: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const authMock = {
  authUser: null,
  authMessage: "",
  authConfigured: false,
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
};

const basePlannerMock = {
  weeklySummary: null,
  topFocus: null,
  checkinStatus: { type: "idle" },
};

const weeklySummary = {
  windowStart: "2026-07-12",
  windowEnd: "2026-07-18",
  total: 3,
  done: 2,
  skipped: 1,
  completionRate: 0.67,
  byFocus: {
    "Deep Work": { done: 2, skipped: 0 },
    Fitness: { done: 0, skipped: 1 },
  },
};

describe("Review page empty state", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a calm empty state before the first check-in", () => {
    vi.mocked(useCoachAuth).mockReturnValue(authMock as never);
    vi.mocked(useCoachPlanner).mockReturnValue(basePlannerMock as never);

    render(<ReviewPage />);

    expect(screen.getByTestId("empty-state-insights")).toBeTruthy();
    expect(screen.getByText("Your insights are still sprouting")).toBeTruthy();
    expect(
      screen.getByText(
        "Complete at least one check-in to unlock weekly insights. One calm session is all it takes to begin.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Set today's focus" }).getAttribute("href")).toBe(
      "/focus",
    );
    expect(screen.queryByText("Weekly summary")).toBeNull();
  });

  it("replaces the empty state with insights once a summary exists", () => {
    vi.mocked(useCoachAuth).mockReturnValue(authMock as never);
    vi.mocked(useCoachPlanner).mockReturnValue({
      ...basePlannerMock,
      weeklySummary,
      topFocus: "Deep Work",
      checkinStatus: { type: "ok", message: "Great work. Check-in saved." },
    } as never);

    render(<ReviewPage />);

    expect(screen.queryByTestId("empty-state-insights")).toBeNull();
    expect(screen.getByText("Weekly summary")).toBeTruthy();
    expect(screen.getByText("Top focus area")).toBeTruthy();
  });
});
