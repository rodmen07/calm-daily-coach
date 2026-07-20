import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteNav } from "@/app/components/site-nav";

// The nav highlights the current route from the pathname. Mock it the same way
// the keyboard-help and route-loop suites mock next/navigation.
const usePathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

describe("SiteNav", () => {
  afterEach(() => {
    cleanup();
    usePathname.mockReset();
  });

  it("labels the navigation landmark", () => {
    usePathname.mockReturnValue("/");
    render(<SiteNav />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  });

  it("marks exactly the active link with aria-current=page", () => {
    usePathname.mockReturnValue("/journal");
    render(<SiteNav />);

    const active = screen.getByRole("link", { name: "Journal" });
    expect(active.getAttribute("aria-current")).toBe("page");

    // Every other link stays unmarked, so only one current item exists.
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);

    expect(
      screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("treats the exported trailing-slash path as the same route", () => {
    // The static export serves "/journal/", but the hrefs are written "/journal".
    usePathname.mockReturnValue("/journal/");
    render(<SiteNav />);
    expect(
      screen.getByRole("link", { name: "Journal" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the Dashboard root even when the pathname is empty", () => {
    usePathname.mockReturnValue("/");
    render(<SiteNav />);
    expect(
      screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("links to the Trends page (v0.11)", () => {
    usePathname.mockReturnValue("/");
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Trends" }).getAttribute("href")).toBe("/trends");
  });
});
