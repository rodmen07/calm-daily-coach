import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/app/components/theme-toggle";

describe("ThemeToggle", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
    vi.restoreAllMocks();
  });

  it("keeps dark mode when the user cancels the light-mode confirmation", async () => {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("calm-daily-coach:theme", "dark");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Dark mode is the default because it is easier to read. Switch to light mode anyway?",
    );
    expect(window.localStorage.getItem("calm-daily-coach:theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
  });

  it("switches to light mode when the user confirms", async () => {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("calm-daily-coach:theme", "dark");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(window.localStorage.getItem("calm-daily-coach:theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeTruthy();
  });
});