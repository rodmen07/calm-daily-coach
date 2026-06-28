import Link from "next/link";

const plans = [
  {
    name: "Starter",
    amount: "$0",
    cadence: "forever",
    description: "Deliberate daily flow for personal habit momentum.",
    features: [
      "Dashboard, Focus, Execute, Review cycle",
      "Local plan and check-in storage",
      "Weekly completion summary",
    ],
    ctaLabel: "Current free plan",
    ctaHref: "/",
    featured: false,
  },
  {
    name: "Pro",
    amount: "$8",
    cadence: "per month",
    description: "Adaptive coaching for people who want stronger follow-through.",
    features: [
      "Weekly narrative insights and recommendations",
      "Smart reminders with preferred windows",
      "Cloud sync status and recovery guardrails",
      "Priority feature access",
    ],
    ctaLabel: "Join Pro early access",
    ctaHref: "mailto:hello@calmdailycoach.com?subject=Calm%20Daily%20Coach%20Pro%20early%20access",
    featured: true,
  },
  {
    name: "Team",
    amount: "$24",
    cadence: "per month",
    description: "Shared accountability for small teams and coaching cohorts.",
    features: [
      "Shared weekly review templates",
      "Manager or coach visibility snapshots",
      "Seat-based access control",
    ],
    ctaLabel: "Talk to us",
    ctaHref: "mailto:hello@calmdailycoach.com?subject=Calm%20Daily%20Coach%20Team%20plan",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel">
          <p className="eyebrow">Pricing</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">Calm plans for deliberate growth</h1>
          <p className="mb-5 text-sm leading-6 text-slate-700 sm:text-base">
            Start free, then upgrade when you want coaching depth, automation, and resilient sync.
          </p>

          <div className="pricing-grid">
            {plans.map((plan) => (
              <article key={plan.name} className={`pricing-card ${plan.featured ? "is-featured" : ""}`}>
                <div>
                  <p className="eyebrow">{plan.name}</p>
                  <p className="pricing-amount">
                    {plan.amount}
                    <span className="ml-1 text-sm font-medium text-slate-700">{plan.cadence}</span>
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{plan.description}</p>
                </div>
                <ul className="pricing-list list-disc pl-5">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {plan.ctaHref.startsWith("/") ? (
                  <Link className={plan.featured ? "primary-button" : "secondary-button"} href={plan.ctaHref}>
                    {plan.ctaLabel}
                  </Link>
                ) : (
                  <a className={plan.featured ? "primary-button" : "secondary-button"} href={plan.ctaHref}>
                    {plan.ctaLabel}
                  </a>
                )}
              </article>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-700">
            <p>
              Questions about monetization roadmap? Review the product plan in the docs, then return to your daily
              workflow from the dashboard.
            </p>
            <div className="mt-3">
              <Link className="secondary-button" href="/">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
