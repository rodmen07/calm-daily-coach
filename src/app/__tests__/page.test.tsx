import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { addCheckin, getWeeklySummary } from "@/lib/browser-checkins";
import { getFirebaseAuth } from "@/lib/firebase";

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: vi.fn(() => null),
  getFirebaseFirestore: vi.fn(() => null),
}));

vi.mock("@/lib/browser-checkins", () => ({
  addCheckin: vi.fn(),
  getWeeklySummary: vi.fn(() => ({
    windowStart: "2026-06-21",
    windowEnd: "2026-06-27",
    total: 0,
    done: 0,
    skipped: 0,
    completionRate: 0,
    byFocus: {
      Career: { done: 0, skipped: 0 },
      Communication: { done: 0, skipped: 0 },
      Creativity: { done: 0, skipped: 0 },
      "Deep Work": { done: 0, skipped: 0 },
      Finances: { done: 0, skipped: 0 },
      Fitness: { done: 0, skipped: 0 },
      Home: { done: 0, skipped: 0 },
      Learning: { done: 0, skipped: 0 },
      Mindfulness: { done: 0, skipped: 0 },
      Nutrition: { done: 0, skipped: 0 },
      Organization: { done: 0, skipped: 0 },
      Relationships: { done: 0, skipped: 0 },
      Sleep: { done: 0, skipped: 0 },
    },
  })),
}));

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
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

    expect(
      screen.getByText("Pick the effort level you can complete today without overextending."),
    ).toBeTruthy();
    expect(screen.getByText("0/280")).toBeTruthy();
  });

  it("hydrates state from guest scoped local storage", async () => {
    const today = new Date().toISOString().slice(0, 10);

    window.localStorage.setItem(
      "calm-daily-coach:guest",
      JSON.stringify({
        focus: "Sleep",
        dose: "deep",
        notes: "Wind down before 10 PM",
        email: "user@example.com",
        plan: {
          date: today,
          focus: "Sleep",
          dose: "deep",
          minutes: 30,
          action: "Audit your sleep environment and design a full bedtime routine.",
          reflection: "What is one adjustment that would improve tonight's sleep by 10%?",
          optionalResource: "Optional: Write a 5-step wind-down checklist in your notes app.",
          capMessage: "You reached today's plan. See you tomorrow.",
        },
      }),
    );

    render(<Home />);

    await waitFor(() => {
      const focus = screen.getByLabelText("Focus area") as HTMLSelectElement;
      const notes = screen.getByLabelText("Context for today (optional)") as HTMLTextAreaElement;
      const email = screen.getByLabelText("Reminder email (optional)") as HTMLInputElement;

      expect(focus.value).toBe("Sleep");
      expect(notes.value).toBe("Wind down before 10 PM");
      expect(email.value).toBe("user@example.com");
      expect(screen.getByText("Today's deliberate dose")).toBeTruthy();
    });

    expect(vi.mocked(getWeeklySummary)).toHaveBeenCalledWith(undefined, "guest");
  });

  it("clears invalid scoped persisted state", async () => {
    window.localStorage.setItem("calm-daily-coach:guest", "{invalid-json");

    render(<Home />);

    await waitFor(() => {
      const persisted = window.localStorage.getItem("calm-daily-coach:guest");
      expect(persisted).not.toBe("{invalid-json");
      const focus = screen.getByLabelText("Focus area") as HTMLSelectElement;
      expect(focus.value).toBe("Deep Work");
    });
  });

  it("generates a plan from selected focus and dose", async () => {
    render(<Home />);

    expect(screen.getAllByText("1. Focus").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2. Plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3. Do").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4. Review").length).toBeGreaterThan(0);
    const categoryList = screen.getByRole("list", { name: "Improvement categories" });
    expect(within(categoryList).getByText("Nutrition")).toBeTruthy();
    expect(within(categoryList).getByText("Learning")).toBeTruthy();
    expect(within(categoryList).getByText("Organization")).toBeTruthy();
    expect(within(categoryList).getByText("Relationships")).toBeTruthy();
    expect(within(categoryList).getByText("Career")).toBeTruthy();
    expect(within(categoryList).getByText("Creativity")).toBeTruthy();
    expect(within(categoryList).getByText("Home")).toBeTruthy();
    expect(screen.getByText("Step 4 review unlocks after you submit today's check-in.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Focus area"), {
      target: { value: "Fitness" },
    });
    fireEvent.click(screen.getByDisplayValue("medium"));
    fireEvent.change(screen.getByLabelText("Context for today (optional)"), {
      target: { value: "Need energy before calls" },
    });
    expect(
      screen.getByText((text) => text.endsWith("/280") && text !== "0/280"),
    ).toBeTruthy();
    fireEvent.submit(screen.getByRole("button", { name: "Generate today’s plan" }));

    await waitFor(() => {
      expect(screen.getByText("Today's deliberate dose")).toBeTruthy();
      expect(screen.getByText(/15-minute/i)).toBeTruthy();
    });
  });

  it("submits done check-in and refreshes weekly summary", async () => {
    render(<Home />);

    fireEvent.submit(screen.getByRole("button", { name: "Generate today’s plan" }));

    await waitFor(() => {
      expect(screen.getByText("Today's deliberate dose")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

    await waitFor(() => {
      expect(vi.mocked(addCheckin)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(getWeeklySummary)).toHaveBeenCalledTimes(2);
      const feedback = screen.getByText("Great work. Check-in saved.");
      expect(feedback).toBeTruthy();
      expect(feedback.className).toContain("status-celebrate");
      expect(screen.getAllByText("4. Review").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("Step 4 review unlocks after you submit today's check-in.")).toBeNull();
  });

  it("locks planning controls after plan generation until check-in", async () => {
    render(<Home />);

    const focus = screen.getByLabelText("Focus area") as HTMLSelectElement;
    const notes = screen.getByLabelText("Context for today (optional)") as HTMLTextAreaElement;
    const generate = screen.getByRole("button", { name: "Generate today’s plan" }) as HTMLButtonElement;

    expect(focus.disabled).toBe(false);
    expect(notes.disabled).toBe(false);
    expect(generate.disabled).toBe(false);

    fireEvent.submit(generate);

    await waitFor(() => {
      expect(screen.getByText("Planning is locked until you close today. Submit a check-in to unlock the next plan.")).toBeTruthy();
      expect((screen.getByLabelText("Focus area") as HTMLSelectElement).disabled).toBe(true);
      expect((screen.getByLabelText("Context for today (optional)") as HTMLTextAreaElement).disabled).toBe(true);
      const lockedButton = screen.getByRole("button", { name: "Finish check-in to unlock" }) as HTMLButtonElement;
      expect(lockedButton.disabled).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

    await waitFor(() => {
      expect((screen.getByLabelText("Focus area") as HTMLSelectElement).disabled).toBe(false);
      expect((screen.getByLabelText("Context for today (optional)") as HTMLTextAreaElement).disabled).toBe(false);
      expect(screen.getByRole("button", { name: "Generate today’s plan" })).toBeTruthy();
    });
  });

  it("resets the active plan when starting next day after check-in", async () => {
    render(<Home />);

    fireEvent.submit(screen.getByRole("button", { name: "Generate today’s plan" }));

    await waitFor(() => {
      expect(screen.getByText("Today's deliberate dose")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start next day" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Start next day" }));

    await waitFor(() => {
      expect(screen.queryByText("Today's deliberate dose")).toBeNull();
      const generate = screen.getByRole("button", { name: "Generate today’s plan" });
      expect(generate).toBeTruthy();
      expect(document.activeElement).toBe(generate);
      expect(screen.getByText("Ready for your next day. Set your focus and generate a fresh plan.")).toBeTruthy();
      expect(screen.getByText("Step 4 review unlocks after you submit today's check-in.")).toBeTruthy();
    });

    fireEvent.submit(screen.getByRole("button", { name: "Generate today’s plan" }));

    await waitFor(() => {
      expect(screen.queryByText("Ready for your next day. Set your focus and generate a fresh plan.")).toBeNull();
      expect(screen.getByText("Today's deliberate dose")).toBeTruthy();
    });
  });

  it("requires skip reason before submitting skipped check-in", async () => {
    render(<Home />);

    fireEvent.submit(screen.getByRole("button", { name: "Generate today’s plan" }));

    await waitFor(() => {
      expect(screen.getByText("Today's deliberate dose")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Skip today" }));

    await waitFor(() => {
      expect(screen.getByText("Add a short reason before skipping.")).toBeTruthy();
      expect(vi.mocked(addCheckin)).not.toHaveBeenCalled();
    });
  });

  it("shows animated progress feedback when weekly progress exists", async () => {
    vi.mocked(getWeeklySummary).mockReturnValue({
      windowStart: "2026-06-21",
      windowEnd: "2026-06-27",
      total: 4,
      done: 3,
      skipped: 1,
      completionRate: 0.75,
      byFocus: {
        Career: { done: 0, skipped: 0 },
        Communication: { done: 0, skipped: 0 },
        Creativity: { done: 0, skipped: 0 },
        "Deep Work": { done: 0, skipped: 0 },
        Finances: { done: 0, skipped: 0 },
        Fitness: { done: 2, skipped: 0 },
        Home: { done: 0, skipped: 0 },
        Learning: { done: 0, skipped: 0 },
        Mindfulness: { done: 0, skipped: 0 },
        Nutrition: { done: 0, skipped: 0 },
        Organization: { done: 0, skipped: 0 },
        Relationships: { done: 0, skipped: 0 },
        Sleep: { done: 1, skipped: 1 },
      },
    });

    render(<Home />);

    await waitFor(() => {
      const weeklyTrack = screen.getByRole("img", { name: "Weekly completion 75%" });
      expect(weeklyTrack.className).toContain("is-animated");
      expect(screen.getByText("Strong week").className).toContain("is-animated");
      expect(screen.getByRole("img", { name: "Fitness completion 100%" }).className).toContain(
        "is-animated",
      );
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
        Career: { done: 0, skipped: 0 },
        Communication: { done: 0, skipped: 0 },
        Creativity: { done: 0, skipped: 0 },
        "Deep Work": { done: 1, skipped: 0 },
        Finances: { done: 0, skipped: 0 },
        Fitness: { done: 3, skipped: 0 },
        Home: { done: 0, skipped: 0 },
        Learning: { done: 0, skipped: 0 },
        Mindfulness: { done: 0, skipped: 0 },
        Nutrition: { done: 0, skipped: 0 },
        Organization: { done: 0, skipped: 0 },
        Relationships: { done: 0, skipped: 0 },
        Sleep: { done: 2, skipped: 0 },
      },
    });

    render(<Home />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Weekly summary")).toBeTruthy();
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
