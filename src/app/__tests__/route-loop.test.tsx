import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import FocusPage from "@/app/focus/page";
import ExecutePage from "@/app/execute/page";
import ReviewPage from "@/app/review/page";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

const push = vi.fn();

vi.mock("@/app/hooks/use-coach-auth", () => ({
  useCoachAuth: vi.fn(),
}));

vi.mock("@/app/hooks/use-coach-planner", () => ({
  useCoachPlanner: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
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
  focus: "Deep Work",
  setFocus: vi.fn(),
  dose: "light",
  setDose: vi.fn(),
  notes: "",
  setNotes: vi.fn(),
  email: "",
  setEmail: vi.fn(),
  plan: null,
  loading: false,
  canGenerate: true,
  reminderStatus: { type: "idle" },
  sendReminder: vi.fn(),
  checkinStatus: { type: "idle" },
  submitCheckin: vi.fn(),
  skipReason: "",
  setSkipReason: vi.fn(),
  weeklySummary: null,
  migrationStatus: { type: "idle" },
  topFocus: null,
  generatePlan: vi.fn(),
  startNextDay: vi.fn(),
};

const activePlan = {
  date: "2026-06-27",
  focus: "Deep Work",
  dose: "medium",
  minutes: 15,
  action: "Run one 15-minute focus block with zero context switching.",
  reflection: "What interrupted your focus, and how will you prevent it tomorrow?",
  optionalResource: "Optional: Use a single-task timer for your next block.",
  capMessage: "You reached today's plan. See you tomorrow.",
};

const weeklySummary = {
  windowStart: "2026-06-21",
  windowEnd: "2026-06-27",
  total: 4,
  done: 3,
  skipped: 1,
  completionRate: 0.75,
  byFocus: {
    "Deep Work": { done: 2, skipped: 0 },
    Fitness: { done: 1, skipped: 1 },
  },
};

function mockPlanner(overrides = {}) {
  vi.mocked(useCoachPlanner).mockReturnValue({
    ...basePlannerMock,
    ...overrides,
  } as never);
}

describe("route loop smoke test", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the dashboard cycle across the full frontend flow", () => {
    vi.mocked(useCoachAuth).mockReturnValue(authMock as never);

    mockPlanner();
    render(<Home />);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Today-first coaching")).toBeTruthy();
    expect(screen.getByText("Dashboard - Focus - Execute - Review - Dashboard")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start today's session" }).getAttribute("href")).toBe("/focus");
    expect(screen.getByRole("link", { name: "Start a fresh plan" }).getAttribute("href")).toBe("/focus");

    cleanup();

    mockPlanner({ plan: null });
    render(<FocusPage />);

    expect(screen.getByRole("article", { name: "Set your focus" })).toBeTruthy();
    expect(screen.getByText("Set your focus")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Next: Execute" }).getAttribute("href")).toBe("/execute");

    cleanup();

    mockPlanner({ plan: activePlan });
    render(<ExecutePage />);

    expect(screen.getByRole("article", { name: "Execute your plan" })).toBeTruthy();
    expect(screen.getByText("Execute your plan")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back: Focus" }).getAttribute("href")).toBe("/focus");
    expect(screen.getByRole("link", { name: "Next: Review" }).getAttribute("href")).toBe("/review");
    expect(screen.getByText("Mark complete")).toBeTruthy();
    expect(screen.getByText("Skip today")).toBeTruthy();

    cleanup();

    mockPlanner({
      weeklySummary,
      topFocus: "Deep Work",
      checkinStatus: { type: "ok", message: "Great work. Check-in saved." },
    });
    render(<ReviewPage />);

    expect(screen.getByRole("article", { name: "Review and adjust" })).toBeTruthy();
    expect(screen.getByText("Review and adjust")).toBeTruthy();
    expect(screen.getByText("Weekly summary")).toBeTruthy();
    expect(screen.getByText("Top focus area")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Complete loop: Dashboard" }).getAttribute("href")).toBe("/");
  });
});