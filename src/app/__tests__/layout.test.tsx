import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

// next/font/google has no vitest transform, so stub the font loaders to return
// only the className variables the layout spreads onto <html>.
vi.mock("next/font/google", () => ({
  Sora: () => ({ variable: "--font-sora" }),
  IBM_Plex_Mono: () => ({ variable: "--font-plex-mono" }),
}));

// The header widgets each pull in firebase or the router; the layout's own
// landmark structure is what this suite checks, so stub them out.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
vi.mock("@/app/components/subscription-guard", () => ({
  SubscriptionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/components/sync-status-badge", () => ({
  SyncStatusBadge: () => null,
}));
vi.mock("@/app/components/keyboard-help", () => ({
  KeyboardHelp: () => null,
}));
vi.mock("@/app/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

describe("RootLayout accessibility scaffolding", () => {
  afterEach(() => {
    cleanup();
  });

  function renderLayout() {
    // Rendering <html>/<body> into a container nests document tags; jsdom
    // tolerates it and the queries below only care about the landmark and link.
    return render(
      <RootLayout>
        <p data-testid="child-content">Route content</p>
      </RootLayout>,
    );
  }

  it("offers a skip link that targets the main landmark", () => {
    const { container } = renderLayout();

    const skip = container.querySelector("a.skip-link");
    expect(skip).not.toBeNull();
    expect(skip?.getAttribute("href")).toBe("#main-content");
    expect(skip?.textContent).toBe("Skip to main content");
  });

  it("renders exactly one main landmark, focusable and matching the skip target", () => {
    const { container } = renderLayout();

    const mains = container.querySelectorAll("main");
    expect(mains).toHaveLength(1);

    const main = mains[0];
    expect(main.getAttribute("id")).toBe("main-content");
    // tabIndex -1 lets focus land here when the skip link is followed.
    expect(main.getAttribute("tabindex")).toBe("-1");

    // The route content lives inside the single main landmark.
    expect(main.querySelector('[data-testid="child-content"]')).not.toBeNull();
  });

  it("keeps the primary navigation labelled", () => {
    const { container } = renderLayout();
    const nav = container.querySelector('nav[aria-label="Primary"]');
    expect(nav).not.toBeNull();
  });
});
