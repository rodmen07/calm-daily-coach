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
    trackMonetizationEvent("onboarding_started", "starter", "onboarding");
    trackMonetizationEvent("onboarding_step_viewed", "starter", "onboarding", "step_1");
    trackMonetizationEvent("onboarding_step_viewed", "starter", "onboarding", "step_2");
    trackMonetizationEvent("onboarding_preset_selected", "starter", "onboarding", "balanced");
    trackMonetizationEvent("onboarding_completed", "starter", "onboarding", "step_2:balanced");
    trackMonetizationEvent("onboarding_skipped", "starter", "onboarding", "step_1");

    const events = getMonetizationEvents();
    const summary = summarizeMonetizationEvents(events);

    expect(summary.totalEvents).toBe(10);
    expect(summary.planSelections).toBe(1);
    expect(summary.pricingCtaClicks).toBe(1);
    expect(summary.dashboardPricingClicks).toBe(1);
    expect(summary.dashboardEarlyAccessClicks).toBe(1);
    expect(summary.onboardingStarted).toBe(1);
    expect(summary.onboardingStepViews).toBe(2);
    expect(summary.onboardingPresetSelections).toBe(1);
    expect(summary.onboardingCompleted).toBe(1);
    expect(summary.onboardingSkipped).toBe(1);
    expect(summary.onboardingStepViewByStep.step_1).toBe(1);
    expect(summary.onboardingStepViewByStep.step_2).toBe(1);
    expect(summary.onboardingPresetById.balanced).toBe(1);
    // pro/team are mapped to premium, starter is mapped to free
    expect(summary.byTier.premium).toBe(3);
    expect(summary.byTier.free).toBe(7);
    expect(summary.ctaByTier.premium).toBe(2);
    expect(summary.ctaByTier.free).toBe(0);
    expect(summary.latestTimestamp).toBeTruthy();
  });
});
