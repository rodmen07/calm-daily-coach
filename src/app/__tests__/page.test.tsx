import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { getWeeklySummary } from "@/lib/browser-checkins";
import { getFirebaseAuth } from "@/lib/firebase";
import { FOCUS_AREAS, type FocusArea } from "@/lib/plan";

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: vi.fn(() => null),
  getFirebaseFirestore: vi.fn(() => null),
}));

const emptyByFocus: Record<FocusArea, { done: number; skipped: number }> = Object.fromEntries(
  FOCUS_AREAS.map((focusArea) => [focusArea, { done: 0, skipped: 0 }]),
) as Record<FocusArea, { done: number; skipped: number }>;

vi.mock("@/lib/browser-checkins", () => ({
  addCheckin: vi.fn(),
  getWeeklySummary: vi.fn(() => ({
    windowStart: "2026-06-21",
    windowEnd: "2026-06-27",
    total: 0,
    done: 0,
    skipped: 0,
    completionRate: 0,
    byFocus: emptyByFocus,
  })),
}));

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows dashboard framing and loop navigation", async () => {
    render(<Home />);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Reflection loop")).toBeTruthy();
    expect(screen.getByText("Dashboard - Focus - Execute - Review - Dashboard")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Start today's cycle" }).getAttribute("href")).toBe("/focus");
      expect(screen.getByRole("link", { name: "New cycle from Focus" }).getAttribute("href")).toBe("/focus");
    });
  });

  it("shows active-cycle link to Execute when a plan already exists", async () => {
    const today = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(
      "calm-daily-coach:guest",
      JSON.stringify({
        focus: "Deep Work",
        dose: "medium",
        notes: "Keep momentum",
        email: "",
        plan: {
          date: today,
          focus: "Deep Work",
          dose: "medium",
          minutes: 15,
          action: "Run one 15-minute focus block with zero context switching.",
          reflection: "What interrupted your focus, and how will you prevent it tomorrow?",
          optionalResource: "Optional: Use a single-task timer for your next block.",
          capMessage: "You reached today's plan. See you tomorrow.",
        },
      }),
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Continue active cycle" }).getAttribute("href")).toBe("/execute");
    });
  });

  it("shows guest mode and auth configuration warning when Firebase auth is unavailable", async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(null);

    render(<Home />);

    expect(screen.getByText("Guest mode")).toBeTruthy();
    expect(
      screen.getByText(
        "Google login is not configured yet. Add Firebase environment variables to enable it.",
      ),
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Weekly completion trend")).toBeTruthy();
    });
  });

  it("renders weekly summary metrics and focus breakdown", async () => {
    vi.mocked(getWeeklySummary).mockReturnValue({
      windowStart: "2026-06-21",
      windowEnd: "2026-06-27",
      total: 5,
      done: 4,
      skipped: 1,
      completionRate: 0.8,
      byFocus: {
        ...emptyByFocus,
        Fitness: { done: 3, skipped: 0 },
        Learning: { done: 1, skipped: 0 },
        Sleep: { done: 0, skipped: 1 },
      },
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Weekly summary")).toBeTruthy();
      expect(screen.getByRole("img", { name: "Weekly completion 80%" })).toBeTruthy();
      expect(screen.getByText(/Top focus: Fitness/)).toBeTruthy();
      expect(screen.getByRole("img", { name: "Fitness completion 100%" })).toBeTruthy();
    });
  });

  it("counts weekly summary values up to the final totals", async () => {
    vi.useFakeTimers();
    vi.mocked(getWeeklySummary).mockReturnValue({
      windowStart: "2026-06-21",
      windowEnd: "2026-06-27",
      total: 8,
      done: 6,
      skipped: 2,
      completionRate: 0.75,
      byFocus: {
        ...emptyByFocus,
        Fitness: { done: 4, skipped: 0 },
        "Deep Work": { done: 2, skipped: 1 },
        Sleep: { done: 0, skipped: 1 },
      },
    });

    render(<Home />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("weekly-total-count").textContent).toBe("0");
    expect(screen.getByTestId("weekly-done-count").textContent).toBe("0");
    expect(screen.getByTestId("weekly-skipped-count").textContent).toBe("0");
    expect(screen.getByTestId("weekly-completion-percent").textContent).toBe("0%");

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByTestId("weekly-total-count").textContent).toBe("8");
    expect(screen.getByTestId("weekly-done-count").textContent).toBe("6");
    expect(screen.getByTestId("weekly-skipped-count").textContent).toBe("2");
    expect(screen.getByTestId("weekly-completion-percent").textContent).toBe("75%");

    vi.useRealTimers();
  });
});
