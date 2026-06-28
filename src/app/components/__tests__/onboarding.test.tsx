import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Onboarding } from "@/app/components/onboarding";

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
    expect(screen.getByText("Deep Work")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
  });
});
