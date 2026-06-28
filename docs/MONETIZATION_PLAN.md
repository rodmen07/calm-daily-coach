# Calm Daily Coach Monetization Plan

## Outcome

Introduce sustainable revenue without breaking the product promise of deliberate, low-noise coaching.

## Packaging

- Starter: Free habit loop with local storage and basic weekly summary.
- Pro: Personal monetized tier focused on deeper insights, automation, and reliability.
- Team: Higher-value tier for coaches and small teams.

## Price Hypothesis

- Pro: $8 per month.
- Team: $24 per month starting point, then move to per-seat as usage proves value.

## Monetization Ladder

1. Build conversion surfaces in product:
   - Pricing route.
   - Dashboard upgrade card.
   - Primary navigation access to pricing.
   - Local plan-interest persistence and click-event logging for conversion analysis.
2. Capture demand before payments:
   - Early-access mailto flow.
   - Track click-through and interest by plan.
   - Expose an in-app local analytics snapshot to validate conversion UX changes quickly.
3. Add billing integration:
   - Stripe Checkout for Pro and Team.
   - Simple post-checkout confirmation state.
4. Add entitlement controls:
   - Feature flags for Pro and Team surfaces.
   - Clear locked-state messaging in free mode.
5. Expand paid value:
   - Advanced weekly narratives.
   - Reminder automation.
   - Cloud sync and recovery support.

## Feature Gate Proposal

- Free:
  - Daily flow routes.
  - Basic weekly totals.
- Pro:
  - Narrative weekly insights.
  - Adaptive plan tuning suggestions.
  - Reminder automation windows.
  - Cloud sync status and restore.
- Team:
  - Shared review templates.
  - Team summary panels.
  - Coach visibility snapshots.

## Metrics To Track

- Pricing page visits.
- Click-through rate on upgrade calls to action.
- Selected plan-interest distribution (Starter/Pro/Team).
- Early access sign-up rate.
- Free to Pro conversion rate.
- 30-day Pro retention.

## Delivery Sequence

1. Frontend conversion surface rollout.
2. Demand capture and measurement.
3. Billing plumbing.
4. Entitlement enforcement.
5. Paid feature expansion.
