import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PricingPage from "@/app/pricing/page";

afterEach(() => {
  cleanup();
});

describe("Pricing page", () => {
  it("renders monetization details and core calls to action", () => {
    window.localStorage.clear();
    render(<PricingPage />);

    expect(screen.getByText("Membership")).toBeTruthy();
    expect(screen.getByText("Simplicity first, no tiers.")).toBeTruthy();
    expect(screen.getByText("30 Days Free")).toBeTruthy();

    expect(screen.getByRole("button", { name: "Sign in to start 30-day Free Trial" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to dashboard" }).getAttribute("href")).toBe("/");
  });
});
