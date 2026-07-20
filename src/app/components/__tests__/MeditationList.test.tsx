import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeditationList } from "@/app/components/MeditationList";
import { MEDITATIONS } from "@/lib/meditations";

describe("MeditationList", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders every meditation's title and formatted duration", () => {
    render(<MeditationList />);

    for (const m of MEDITATIONS) {
      expect(screen.getByText(m.title)).toBeTruthy();
    }
    // body-scan is 600s -> "10m" (formatDuration drops the seconds when they're zero).
    expect(screen.getByText("10m")).toBeTruthy();
    // breathing-space is 180s -> "3m".
    expect(screen.getByText("3m")).toBeTruthy();
  });

  it("calls onSelect with the chosen meditation when its Play button is clicked", () => {
    const onSelect = vi.fn();
    render(<MeditationList onSelect={onSelect} />);

    const playButtons = screen.getAllByRole("button", { name: "Play" });
    expect(playButtons).toHaveLength(MEDITATIONS.length);

    fireEvent.click(playButtons[0]);
    expect(onSelect).toHaveBeenCalledWith(MEDITATIONS[0]);
  });

  it("does not render a Play button when onSelect is omitted", () => {
    render(<MeditationList />);
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
  });

  // Regression test for the live contrast bug: the description text used to be
  // set via an inline `color: 'rgba(0,0,0,0.6)'` style, which reads as a dark
  // gray on a light background but is a near-black-on-near-black, effectively
  // invisible color the moment this app's theme is dark (--background is
  // near-black in dark mode). theme-token-guard.test.ts cannot see this class
  // of bug at all - it only scans Tailwind className strings, never inline
  // `style={{...}}` objects - so this component-level test is the only guard
  // against it regressing. Fails without the fix (asserting the literal
  // `var(--muted)` token, which flips per-theme in globals.css) and passes
  // with it.
  it("uses the theme-aware --muted token for description text instead of a hardcoded rgba() color", () => {
    render(<MeditationList />);

    const description = screen.getByText(MEDITATIONS[0].description as string);
    expect(description.style.color).toBe("var(--muted)");
    expect(description.style.color).not.toMatch(/rgba?\(/i);
  });

  // Same defect class, same file, same fix mechanism: the badge background
  // and the card border were both hardcoded `rgba(0,0,0,0.06)` literals that
  // silently assume a light theme. Covered here in the same regression test
  // suite as the invisible-text bug since all three came from the same
  // un-themed inline-style block.
  it("uses theme-aware tokens for the duration badge background and the card border, not hardcoded rgba(0,0,0,...) literals", () => {
    render(<MeditationList />);

    const badge = screen.getByText("10m");
    expect(badge.style.background).toBe("var(--field)");
    expect(badge.style.background).not.toMatch(/rgba?\(/i);

    const card = screen.getByText(MEDITATIONS[0].title).closest("li");
    expect(card).not.toBeNull();
    expect(card?.style.border).toBe("1px solid var(--line)");
    expect(card?.style.border).not.toMatch(/rgba?\(/i);
  });
});
