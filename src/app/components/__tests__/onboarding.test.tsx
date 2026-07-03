import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Onboarding } from "@/app/components/onboarding";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

describe("Onboarding Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders step 1 (Focus selection) initially", () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(<Onboarding onComplete={handleComplete} onSkip={handleSkip} />);

    expect(screen.getByText("Personalize your coach")).toBeTruthy();
    expect(screen.getByText("Pick your starting path")).toBeTruthy();
    expect(screen.getByText("Pick a path now. You can fine-tune anytime after your first loop.")).toBeTruthy();
    expect(screen.getAllByText("Deep Work").length).toBeGreaterThan(0);
    expect(screen.getByText("Customize step-by-step")).toBeTruthy();
    expect(screen.getByText("Quick start now")).toBeTruthy();
  });

  it("applies a quick-start preset and completes onboarding from step 1", () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(<Onboarding onComplete={handleComplete} onSkip={handleSkip} />);

    fireEvent.click(screen.getByRole("button", { name: /Balanced start/i }));
  fireEvent.click(screen.getByRole("button", { name: "Quick start now" }));

    expect(handleComplete).toHaveBeenCalledWith({
      defaultFocus: "Deep Work",
      defaultDose: "medium",
      defaultTheme: "dark",
    });

    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe(
      JSON.stringify({
        defaultFocus: "Deep Work",
        defaultDose: "medium",
        defaultTheme: "dark",
      }),
    );
  });
});
