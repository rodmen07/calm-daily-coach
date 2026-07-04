import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BreathePage from "@/app/breathe/page";

afterEach(() => {
  cleanup();
});

describe("Breathe page", () => {
  it("renders the pacer and all rhythm presets", () => {
    render(<BreathePage />);

    expect(screen.getByText("Breathe")).toBeTruthy();
    expect(screen.getByText("Choose a rhythm")).toBeTruthy();
    expect(screen.getByText("Box Breathing")).toBeTruthy();
    expect(screen.getByText("4-7-8 Relax")).toBeTruthy();
    expect(screen.getByText("Coherent 5-5")).toBeTruthy();
    expect(screen.getByText("Calm Down")).toBeTruthy();
  });

  it("starts and pauses the session with the toggle button", () => {
    render(<BreathePage />);

    const startButton = screen.getByRole("button", { name: "Start" });
    fireEvent.click(startButton);

    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("switches the active rhythm when a preset is selected", () => {
    render(<BreathePage />);

    fireEvent.click(screen.getByText("4-7-8 Relax"));

    const selectedBadges = screen.getAllByText("Selected");
    expect(selectedBadges.length).toBe(1);
  });
});
