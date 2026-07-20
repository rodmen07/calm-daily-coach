"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  clearMonetizationEvents,
  getMonetizationEvents,
  summarizeMonetizationEvents,
} from "@/lib/monetization";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("monetizationchange", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("monetizationchange", callback);
  };
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "No activity yet";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "No activity yet";
  }

  return parsed.toLocaleString();
}

export default function MonetizationPage() {
  const events = useSyncExternalStore(subscribe, getMonetizationEvents, () => []);
  const summary = useMemo(() => summarizeMonetizationEvents(events), [events]);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel animate-status-rise">
          <p className="eyebrow">Monetization</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">Conversion analytics snapshot</h1>
          <p className="mb-5 text-sm leading-6 text-slate-700 sm:text-base">
            This local analytics view shows pricing intent and CTA activity so you can validate monetization UX before
            backend analytics is wired.
          </p>

          <div className="monetization-analytics-grid mb-4">
            <article className="summary-card">
              <p className="summary-label">Total events</p>
              <p className="summary-value" data-testid="analytics-total-events">{summary.totalEvents}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Plan selections</p>
              <p className="summary-value">{summary.planSelections}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Pricing CTA clicks</p>
              <p className="summary-value">{summary.pricingCtaClicks}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Dashboard CTA clicks</p>
              <p className="summary-value">{summary.dashboardPricingClicks + summary.dashboardEarlyAccessClicks}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Onboarding starts</p>
              <p className="summary-value">{summary.onboardingStarted}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Onboarding completions</p>
              <p className="summary-value">{summary.onboardingCompleted}</p>
            </article>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card">
              <p className="eyebrow">Membership Interest</p>
              <ul className="pricing-list list-disc pl-5">
                <li>Free Trial logs: {summary.byTier.free ?? 0}</li>
                <li>Premium Membership logs: {summary.byTier.premium ?? 0}</li>
              </ul>
            </article>
            <article className="pricing-card">
              <p className="eyebrow">CTA Click Mix</p>
              <ul className="pricing-list list-disc pl-5">
                <li>Free Trial CTA clicks: {summary.ctaByTier.free ?? 0}</li>
                <li>Premium Upgrade CTA clicks: {summary.ctaByTier.premium ?? 0}</li>
              </ul>
            </article>
            <article className="pricing-card">
              <p className="eyebrow">Recent activity</p>
              <p className="text-sm text-slate-700">Last event: {formatTimestamp(summary.latestTimestamp)}</p>
              <p className="mt-2 text-sm text-slate-700">Stored events: {events.length}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="pricing-card">
              <p className="eyebrow">Onboarding funnel</p>
              <ul className="pricing-list list-disc pl-5">
                <li>Step views: {summary.onboardingStepViews}</li>
                <li>Preset selections: {summary.onboardingPresetSelections}</li>
                <li>Skips: {summary.onboardingSkipped}</li>
                <li>Completions: {summary.onboardingCompleted}</li>
              </ul>
            </article>
            <article className="pricing-card">
              <p className="eyebrow">Onboarding detail</p>
              <ul className="pricing-list list-disc pl-5">
                <li>Step 1 views: {summary.onboardingStepViewByStep.step_1 ?? 0}</li>
                <li>Step 2 views: {summary.onboardingStepViewByStep.step_2 ?? 0}</li>
                <li>Step 3 views: {summary.onboardingStepViewByStep.step_3 ?? 0}</li>
                <li>Top preset logs: {Object.keys(summary.onboardingPresetById).length}</li>
              </ul>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button className="secondary-button" type="button" onClick={clearMonetizationEvents}>
              Clear local analytics
            </button>
            <Link className="secondary-button" href="/pricing">
              Back to pricing
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
