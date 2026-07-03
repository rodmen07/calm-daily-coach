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
    expect(screen.getByText("Select your primary focus area")).toBeTruthy();
    expect(screen.getByText("Takes about 30 seconds. You can finish from any step.")).toBeTruthy();
    expect(screen.getAllByText("Deep Work").length).toBeGreaterThan(0);
    expect(screen.getByText("Continue customizing")).toBeTruthy();
    expect(screen.getByText("Save and start now")).toBeTruthy();
  });

  it("applies a quick-start preset and completes onboarding from step 1", () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(<Onboarding onComplete={handleComplete} onSkip={handleSkip} />);

    fireEvent.click(screen.getByRole("button", { name: /Balanced start/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save and start now" }));

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
