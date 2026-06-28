import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PricingPage from "@/app/pricing/page";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Pricing page", () => {
  it("renders monetization tiers and core calls to action", () => {
    window.localStorage.clear();
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

  it("stores selected plan interest in local storage", () => {
    window.localStorage.clear();
    render(<PricingPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Select Team" })[0]);

    expect(window.localStorage.getItem("calm-daily-coach:plan-interest")).toBe("team");
    expect(screen.getAllByText("Current plan interest: Team").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Team selected" }).length).toBeGreaterThan(0);
  });
});
