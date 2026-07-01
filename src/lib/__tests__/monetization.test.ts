import {
  summarizeMonetizationEvents,
  trackMonetizationEvent,
  getMonetizationEvents,
  clearMonetizationEvents,
} from "@/lib/monetization";
import { beforeEach, describe, expect, it } from "vitest";

describe("monetization utils", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearMonetizationEvents();
  });

  it("summarizes local monetization events by type and tier", () => {
    trackMonetizationEvent("pricing_plan_selected", "pro", "pricing");
    trackMonetizationEvent("pricing_cta_clicked", "pro", "pricing");
    trackMonetizationEvent("dashboard_pricing_clicked", "starter", "dashboard");
    trackMonetizationEvent("dashboard_early_access_clicked", "team", "dashboard");

    const events = getMonetizationEvents();
    const summary = summarizeMonetizationEvents(events);

    expect(summary.totalEvents).toBe(4);
    expect(summary.planSelections).toBe(1);
    expect(summary.pricingCtaClicks).toBe(1);
    expect(summary.dashboardPricingClicks).toBe(1);
    expect(summary.dashboardEarlyAccessClicks).toBe(1);
    // pro/team are mapped to premium, starter is mapped to free
    expect(summary.byTier.premium).toBe(3);
    expect(summary.byTier.free).toBe(1);
    expect(summary.ctaByTier.premium).toBe(2);
    expect(summary.ctaByTier.free).toBe(0);
    expect(summary.latestTimestamp).toBeTruthy();
  });
});
