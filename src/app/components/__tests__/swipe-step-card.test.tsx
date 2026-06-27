import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SwipeStepCard } from "@/app/components/swipe-step-card";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

describe("SwipeStepCard", () => {
  afterEach(() => {
    cleanup();
    push.mockReset();
  });

  it("renders the step content and navigation links", () => {
    render(
      <SwipeStepCard
        stepLabel="Step 1"
        title="Set your focus"
        description="Start here"
        nextHref="/execute"
        nextLabel="Next: Execute"
      >
        <p>Body content</p>
      </SwipeStepCard>,
    );

    expect(screen.getByRole("article", { name: "Set your focus" })).toBeTruthy();
    expect(screen.getByText("Body content")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Next: Execute" }).getAttribute("href")).toBe("/execute");
  });

  it("navigates with arrow keys", () => {
    render(
      <SwipeStepCard
        stepLabel="Step 2"
        title="Execute your plan"
        description="Continue"
        previousHref="/focus"
        previousLabel="Back: Focus"
        nextHref="/review"
        nextLabel="Next: Review"
      >
        <p>Body content</p>
      </SwipeStepCard>,
    );

    fireEvent.keyDown(screen.getByRole("article", { name: "Execute your plan" }), { key: "ArrowLeft" });
    expect(push).toHaveBeenCalledWith("/focus");

    push.mockReset();
    fireEvent.keyDown(screen.getByRole("article", { name: "Execute your plan" }), { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/review");
  });

  it("navigates on horizontal swipes and ignores vertical or short gestures", () => {
    render(
      <SwipeStepCard
        stepLabel="Step 3"
        title="Review and adjust"
        description="Finish"
        previousHref="/execute"
        previousLabel="Back: Execute"
        nextHref="/"
        nextLabel="Complete loop: Dashboard"
      >
        <p>Body content</p>
      </SwipeStepCard>,
    );

    const card = screen.getByRole("article", { name: "Review and adjust" });

    fireEvent.touchStart(card, {
      changedTouches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(card, {
      changedTouches: [{ clientX: 100, clientY: 104 }],
    });
    expect(push).toHaveBeenCalledWith("/");

    push.mockReset();

    fireEvent.touchStart(card, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(card, {
      changedTouches: [{ clientX: 170, clientY: 104 }],
    });
    expect(push).toHaveBeenCalledWith("/execute");

    push.mockReset();

    fireEvent.touchStart(card, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(card, {
      changedTouches: [{ clientX: 130, clientY: 160 }],
    });
    expect(push).not.toHaveBeenCalled();

    fireEvent.touchStart(card, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(card, {
      changedTouches: [{ clientX: 140, clientY: 102 }],
    });
    expect(push).not.toHaveBeenCalled();
  });
});