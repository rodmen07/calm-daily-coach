import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/app/components/theme-toggle";

describe("ThemeToggle", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
  });

  it("defaults to dark mode and lets the user switch to light mode", async () => {
    document.documentElement.dataset.theme = "light";
    window.localStorage.setItem("calm-daily-coach:theme", "light");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    expect(window.localStorage.getItem("calm-daily-coach:theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});