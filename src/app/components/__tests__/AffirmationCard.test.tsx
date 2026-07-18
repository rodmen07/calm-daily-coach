import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AffirmationCard } from "@/app/components/AffirmationCard";
import { formatDateKey, getDailyAffirmation } from "@/lib/affirmations";

const TEST_DATE = new Date("2026-07-18T12:00:00.000Z");
const DATE_KEY = formatDateKey(TEST_DATE);

describe("AffirmationCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the deterministic affirmation for the given day", () => {
    render(<AffirmationCard date={TEST_DATE} />);

    expect(screen.getByText("Daily affirmation")).toBeTruthy();
    expect(screen.getByText(getDailyAffirmation(DATE_KEY))).toBeTruthy();
    expect(screen.getByText("A new one arrives each day. Refresh any time.")).toBeTruthy();
  });

  it("cycles to the next affirmation on refresh", () => {
    render(<AffirmationCard date={TEST_DATE} />);

    fireEvent.click(screen.getByRole("button", { name: "Show me another" }));
    expect(screen.getByText(getDailyAffirmation(DATE_KEY, 1))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show me another" }));
    expect(screen.getByText(getDailyAffirmation(DATE_KEY, 2))).toBeTruthy();
  });

  it("exposes an accessible section landmark", () => {
    render(<AffirmationCard date={TEST_DATE} />);

    expect(screen.getByRole("region", { name: "Daily affirmation" })).toBeTruthy();
  });
});
