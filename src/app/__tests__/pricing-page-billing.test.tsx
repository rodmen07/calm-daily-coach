import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PricingPage from "@/app/pricing/page";
import type { MonetizationEvent } from "@/lib/monetization";

vi.mock("@/app/hooks/use-coach-auth", () => ({
  useCoachAuth: () => ({
    authUser: { uid: "uid-123", email: "user@example.com" },
    authConfigured: true,
    authMessage: null,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

const EVENTS_KEY = "calm-daily-coach:monetization-events";

function storedEvents(): MonetizationEvent[] {
  return JSON.parse(window.localStorage.getItem(EVENTS_KEY) ?? "[]");
}

describe("Pricing page billing CTA", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  });

  it("opens the Stripe Payment Link in a new tab with uid attribution when configured", () => {
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_abc";

    render(<PricingPage />);

    const cta = screen.getByRole("link", { name: "Join Membership ($5/mo)" });
    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("https://buy.stripe.com/test_abc")).toBe(true);
    expect(href).toContain("client_reference_id=uid-123");
    expect(href).toContain("prefilled_email=user%40example.com");
    expect(cta.getAttribute("target")).toBe("_blank");
    expect(cta.getAttribute("rel")).toBe("noopener noreferrer");

    fireEvent.click(cta);
    const events = storedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: "pricing_cta_clicked",
      source: "pricing",
      detail: "stripe_payment_link",
    });
  });

  it("falls back to the mailto upgrade flow when the Payment Link is unset", () => {
    render(<PricingPage />);

    const cta = screen.getByRole("link", { name: "Join Membership ($5/mo)" });
    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:hello@calmdailycoach.com")).toBe(true);
    expect(href).toContain("uid-123");

    fireEvent.click(cta);
    const events = storedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: "pricing_cta_clicked",
      source: "pricing",
      detail: "mailto_upgrade",
    });
  });
});
