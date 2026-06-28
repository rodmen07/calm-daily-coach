import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/app/components/theme-toggle";

describe("ThemeToggle", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
  });

  it("shows a confirmation panel before switching to light mode", async () => {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("calm-daily-coach:theme", "dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(screen.getByText("Dark mode is the default because it is easier to read. Switch to light mode anyway?")).toBeTruthy();
    expect(window.localStorage.getItem("calm-daily-coach:theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "Keep dark mode" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use light mode" })).toBeTruthy();
  });

  it("keeps dark mode when the user cancels", async () => {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("calm-daily-coach:theme", "dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep dark mode" }));

    expect(screen.queryByText("Dark mode is the default because it is easier to read. Switch to light mode anyway?")).toBeNull();
    expect(window.localStorage.getItem("calm-daily-coach:theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("switches to light mode when the user confirms", async () => {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("calm-daily-coach:theme", "dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Use light mode" }));

    expect(window.localStorage.getItem("calm-daily-coach:theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeTruthy();
  });
});