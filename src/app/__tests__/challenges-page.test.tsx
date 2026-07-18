import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ChallengesPage from "@/app/challenges/page";

afterEach(() => {
  cleanup();
});

describe("Challenges Page", () => {
  it("renders streak-free progress stats, daily recommendation and complete control filters", () => {
    render(<ChallengesPage />);

    expect(screen.getByText("Micro-Challenges")).toBeTruthy();
    expect(screen.getByText("Challenges Completed")).toBeTruthy();
    expect(screen.getByText("Today's Practice")).toBeTruthy();
    expect(screen.queryByText("Current Streak")).toBeNull();
    expect(screen.queryByText("Longest Streak")).toBeNull();
    expect(screen.getByText("Discover Habits Card")).toBeTruthy();

    expect(screen.getByRole("button", { name: "📋 All Tasks" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "🧘 Mindful" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "⚡ Focus" })).toBeTruthy();
  });

  it("filters micro tasks according to active category selection click", () => {
    render(<ChallengesPage />);

    // Click "🧘 Mindful"
    const mindfulBtn = screen.getByRole("button", { name: "🧘 Mindful" });
    fireEvent.click(mindfulBtn);

    // Let's verify that a productivity-category item is filtered out
    expect(screen.queryByText("Tomorrow's Top Three")).toBeNull();
  });
});
