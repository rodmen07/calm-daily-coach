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
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel">
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
          </div>

          <div className="pricing-grid">
            <article className="pricing-card">
              <p className="eyebrow">Tier interest</p>
              <ul className="pricing-list list-disc pl-5">
                <li>Starter events: {summary.byTier.starter}</li>
                <li>Pro events: {summary.byTier.pro}</li>
                <li>Team events: {summary.byTier.team}</li>
              </ul>
            </article>
            <article className="pricing-card">
              <p className="eyebrow">CTA mix</p>
              <ul className="pricing-list list-disc pl-5">
                <li>Starter CTA clicks: {summary.ctaByTier.starter}</li>
                <li>Pro CTA clicks: {summary.ctaByTier.pro}</li>
                <li>Team CTA clicks: {summary.ctaByTier.team}</li>
              </ul>
            </article>
            <article className="pricing-card">
              <p className="eyebrow">Recent activity</p>
              <p className="text-sm text-slate-700">Last event: {formatTimestamp(summary.latestTimestamp)}</p>
              <p className="mt-2 text-sm text-slate-700">Stored events: {events.length}</p>
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
      </main>
    </div>
  );
}
