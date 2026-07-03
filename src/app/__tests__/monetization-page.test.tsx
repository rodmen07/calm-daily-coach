import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MonetizationPage from "@/app/monetization/page";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Monetization page", () => {
  it("renders conversion analytics metrics and navigation", () => {
    window.localStorage.setItem(
      "calm-daily-coach:monetization-events",
      JSON.stringify([
        {
          name: "pricing_plan_selected",
          tier: "pro",
          source: "pricing",
          timestamp: "2026-06-27T12:00:00.000Z",
        },
        {
          name: "pricing_cta_clicked",
          tier: "pro",
          source: "pricing",
          timestamp: "2026-06-27T12:01:00.000Z",
        },
        {
          name: "onboarding_started",
          tier: "free",
          source: "onboarding",
          timestamp: "2026-06-27T12:02:00.000Z",
        },
        {
          name: "onboarding_completed",
          tier: "free",
          source: "onboarding",
          timestamp: "2026-06-27T12:03:00.000Z",
          detail: "step_2:balanced",
        },
      ]),
    );

    render(<MonetizationPage />);

    expect(screen.getByText("Monetization")).toBeTruthy();
    expect(screen.getByText("Conversion analytics snapshot")).toBeTruthy();
    expect(screen.getByTestId("analytics-total-events").textContent).toBe("4");
    expect(screen.getByText("Onboarding starts")).toBeTruthy();
    expect(screen.getByText("Onboarding completions")).toBeTruthy();
    expect(screen.getByText("Onboarding funnel")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to pricing" }).getAttribute("href")).toBe("/pricing");
  });
});
