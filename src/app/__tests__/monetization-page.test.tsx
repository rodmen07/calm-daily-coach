import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MonetizationPage from "@/app/monetization/page";

afterEach(() => {
  document.body.innerHTML = "";
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
      ]),
    );

    render(<MonetizationPage />);

    expect(screen.getByText("Monetization")).toBeTruthy();
    expect(screen.getByText("Conversion analytics snapshot")).toBeTruthy();
    expect(screen.getByTestId("analytics-total-events").textContent).toBe("2");
    expect(screen.getByRole("link", { name: "Back to pricing" }).getAttribute("href")).toBe("/pricing");
  });
});
