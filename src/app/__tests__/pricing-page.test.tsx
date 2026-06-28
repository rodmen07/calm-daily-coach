import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PricingPage from "@/app/pricing/page";

describe("Pricing page", () => {
  it("renders monetization tiers and core calls to action", () => {
    render(<PricingPage />);

    expect(screen.getByText("Pricing")).toBeTruthy();
    expect(screen.getByText("Calm plans for deliberate growth")).toBeTruthy();

    expect(screen.getByText("Starter")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByText("Team")).toBeTruthy();

    expect(screen.getByRole("link", { name: "Join Pro early access" }).getAttribute("href")).toContain(
      "mailto:hello@calmdailycoach.com",
    );
    expect(screen.getByRole("link", { name: "Back to dashboard" }).getAttribute("href")).toBe("/");
  });
});
