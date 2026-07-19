import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyboardHelp } from "@/app/components/keyboard-help";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

describe("KeyboardHelp", () => {
  afterEach(() => {
    cleanup();
    push.mockReset();
  });

  it("opens with the ? key and lists the shortcuts that really exist", () => {
    render(<KeyboardHelp />);

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "?" });

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    // The list stays honest: help keys, the go-to chords implemented here,
    // the step-card arrows, and standard browser focus behavior.
    expect(screen.getByText("Open this help")).toBeTruthy();
    expect(screen.getByText("Close this help")).toBeTruthy();
    expect(screen.getByText("Go to Dashboard")).toBeTruthy();
    expect(screen.getByText("Go to Focus")).toBeTruthy();
    expect(screen.getByText("Go to Execute")).toBeTruthy();
    expect(screen.getByText("Go to Review")).toBeTruthy();
    expect(screen.getByText("Go to Journal")).toBeTruthy();
    expect(
      screen.getByText("Previous or next step while a step card is focused"),
    ).toBeTruthy();
    expect(screen.getByText("Move focus between controls")).toBeTruthy();
    expect(screen.getByText("Activate the focused control")).toBeTruthy();
  });

  it("does not open while typing in an input or textarea", () => {
    render(
      <div>
        <label>
          Notes
          <input type="text" />
        </label>
        <label>
          Longer notes
          <textarea />
        </label>
        <KeyboardHelp />
      </div>,
    );

    fireEvent.keyDown(screen.getByLabelText("Notes"), { key: "?" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(screen.getByLabelText("Longer notes"), { key: "?" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus into the dialog on open, closes on Escape, and returns focus to the trigger", () => {
    render(<KeyboardHelp />);

    const trigger = screen.getByRole("button", { name: "Keyboard shortcuts" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes from the close button and the backdrop", () => {
    render(<KeyboardHelp />);

    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    fireEvent.click(screen.getByTestId("keyboard-help-overlay"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Tab focus inside the dialog while it is open", () => {
    render(<KeyboardHelp />);

    fireEvent.keyDown(window, { key: "?" });
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    const close = screen.getByRole("button", { name: "Close" });

    expect(document.activeElement).toBe(close);

    // The close button is the only focusable control, so Tab wraps onto it in
    // both directions instead of escaping the dialog.
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(close);
  });

  it("navigates with the g chords", () => {
    render(<KeyboardHelp />);

    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "d" });
    expect(push).toHaveBeenCalledWith("/");

    push.mockReset();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "f" });
    expect(push).toHaveBeenCalledWith("/focus");

    push.mockReset();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "e" });
    expect(push).toHaveBeenCalledWith("/execute");

    push.mockReset();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "r" });
    expect(push).toHaveBeenCalledWith("/review");

    push.mockReset();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "j" });
    expect(push).toHaveBeenCalledWith("/journal");
  });

  it("ignores chord keys while typing, without an armed prefix, and while the dialog is open", () => {
    render(
      <div>
        <label>
          Notes
          <input type="text" />
        </label>
        <KeyboardHelp />
      </div>,
    );

    // Typing "gd" into an input never navigates.
    const input = screen.getByLabelText("Notes");
    fireEvent.keyDown(input, { key: "g" });
    fireEvent.keyDown(input, { key: "d" });
    expect(push).not.toHaveBeenCalled();

    // A destination key with no armed g prefix does nothing.
    fireEvent.keyDown(window, { key: "d" });
    expect(push).not.toHaveBeenCalled();

    // A non-destination key quietly disarms the prefix.
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(window, { key: "d" });
    expect(push).not.toHaveBeenCalled();

    // While the help dialog is open the chords stay off.
    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "d" });
    expect(push).not.toHaveBeenCalled();
  });
});
