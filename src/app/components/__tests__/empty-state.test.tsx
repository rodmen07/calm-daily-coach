import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CalmEmptyState } from "@/app/components/empty-state";

describe("CalmEmptyState", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the calm copy with a decorative illustration and an optional action", () => {
    render(
      <CalmEmptyState
        variant="plan"
        title="No plan yet, and that is okay"
        message="Start whenever you are ready."
        actionHref="/focus"
        actionLabel="Start in Focus"
        actionVariant="primary"
      />,
    );

    const shell = screen.getByTestId("empty-state-plan");
    expect(screen.getByText("No plan yet, and that is okay")).toBeTruthy();
    expect(screen.getByText("Start whenever you are ready.")).toBeTruthy();

    // The illustration is decorative only; the text carries the meaning.
    const art = shell.querySelector("svg");
    expect(art?.getAttribute("aria-hidden")).toBe("true");

    const action = screen.getByRole("link", { name: "Start in Focus" });
    expect(action.getAttribute("href")).toBe("/focus");
    expect(action.className).toContain("primary-button");
  });

  it("renders without an action link when none is provided", () => {
    render(
      <CalmEmptyState
        variant="insights"
        title="Your insights are still sprouting"
        message="One calm session is all it takes to begin."
      />,
    );

    expect(screen.getByTestId("empty-state-insights")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("supports a compact layout for tight side panels", () => {
    render(
      <CalmEmptyState
        variant="slices"
        compact
        title="No slices yet"
        message="Slice a task above."
      />,
    );

    expect(screen.getByTestId("empty-state-slices").className).toContain("is-compact");
  });
});
