import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SlicerPage from "@/app/slicer/page";

// Mock matchMedia or similar browser systems if needed
if (typeof window !== "undefined") {
  Object.defineProperty(window, "navigator", {
    value: { vibrate: vi.fn() },
    writable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("ADHD Task Slicer Page", () => {
  it("renders the creation form, instructions and illustration wait mode initially", () => {
    render(<SlicerPage />);

    expect(screen.getByText("ADHD Task Slicer")).toBeTruthy();
    expect(screen.getByText("Slice a Task")).toBeTruthy();
    expect(screen.getByText("The Intimidating Task")).toBeTruthy();
    expect(screen.getByText("Primary Domain")).toBeTruthy();
    expect(screen.getByText("Waiting for an intimidating task")).toBeTruthy();

    // Before any slices exist, the history list shows a calm empty state.
    expect(screen.getByTestId("empty-state-slices")).toBeTruthy();
    expect(screen.getByText("No slices yet")).toBeTruthy();
  });

  it("procedurally generates step slices when submitting the form and shows the checklist", () => {
    render(<SlicerPage />);

    const input = screen.getByPlaceholderText("e.g., Clean off my chaotic desk");
    fireEvent.change(input, { target: { value: "Refactor my code modules" } });

    // Select Coding Domain
    const codingLabel = screen.getByText("Programming");
    fireEvent.click(codingLabel);

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "🚀 Slice It!" });
    fireEvent.click(submitBtn);

    // Should render active focus step block
    expect(screen.getByText("Current Focus Task")).toBeTruthy();

    // The empty state clears as soon as a slice exists.
    expect(screen.queryByTestId("empty-state-slices")).toBeNull();

    // Total count of steps should show ("Micro-Step 1 of ...")
    expect(screen.queryByText(/micro-step 1 of/i)).toBeTruthy();

    // Verify checklist has steps structure (hides other steps in Focus Mode)
    expect(screen.getByText("Other Hidden Steps")).toBeTruthy();
  });

  it("advances step by step when marked complete and triggers success when done", () => {
    render(<SlicerPage />);

    const input = screen.getByPlaceholderText("e.g., Clean off my chaotic desk");
    fireEvent.change(input, { target: { value: "Short errand" } });

    // Submit General domain by default
    const submitBtn = screen.getByRole("button", { name: "🚀 Slice It!" });
    fireEvent.click(submitBtn);

    // Let's complete the steps by clicking the "Completed! Next Step" button until all steps are done.
    let nextBtn = screen.queryByRole("button", { name: "Completed! Next Step" });
    while (nextBtn) {
      fireEvent.click(nextBtn);
      nextBtn = screen.queryByRole("button", { name: "Completed! Next Step" });
    }

    // After completing all steps, we should see the finished state card (Task fully processed!)
    expect(screen.getByText("Task fully processed!")).toBeTruthy();
  });
});
