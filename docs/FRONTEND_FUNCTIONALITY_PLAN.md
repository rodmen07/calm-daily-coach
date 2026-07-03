# Calm Daily Coach - Frontend Functionality Plan

## Goal

Grow the site from a polished flow shell into a more useful daily coaching product while keeping the work frontend-first.

## Latest Iteration (2026-07-02)

- Dashboard membership panel now reflects the real single-plan model instead of legacy multi-tier messaging.
- Membership status messaging is now state-aware: signed out, checking, trial days remaining, active, or expired.
- Dashboard CTA language was simplified to align with one $5/month membership after a 30-day free trial.
- Dashboard tests were updated to cover the new copy and call-to-action behavior.

## Completed (2026-07-02)

- Focused onboarding UX pass shipped to reduce first-session friction.
- Added a quick-start preset path that configures focus, dose, and theme in one action.
- Added finish-early actions so users can save onboarding defaults from step 1 or step 2.
- Added a live defaults summary panel during onboarding for clearer decision confidence.
- Updated onboarding component tests to cover quick-start completion and persisted preferences.

## In Progress (2026-07-02)

- Add onboarding funnel analytics events for start, step views, preset picks, skip, and completion. Completed.
- Surface onboarding funnel metrics in the local analytics page to measure first-session drop-off. Completed.

## Completed (2026-07-02) - Onboarding Analytics

- Added onboarding funnel event tracking in the shared local analytics utility.
- Wired onboarding UI interactions to log start, step views, preset selections, skip, and completion.
- Extended analytics dashboard cards with onboarding starts, completions, step views, and preset usage detail.
- Updated monetization analytics tests for onboarding funnel summary expectations.

## In Progress (2026-07-02) - Dashboard UX

- Add a compact onboarding funnel health badge to the dashboard for at-a-glance adoption visibility. Completed.

## Completed (2026-07-02) - Dashboard Onboarding Health

- Added a dashboard onboarding health badge with starts, completions, skips, and conversion rate.
- Added status labels for onboarding funnel quality (no runs, strong, moderate, needs iteration).
- Added dashboard shortcut to the detailed onboarding funnel analytics page.
- Updated dashboard tests to validate onboarding health badge rendering and conversion state display.

## Guiding Rule

- Prefer frontend changes first.
- Add middleware or backend work only when the frontend needs it to keep moving.
- Keep each step small, testable, and shippable.

## Priority Order

### 1. Dashboard Action Rail

Build a clearer dashboard action rail that shows the current cycle state and gives users one obvious next step.

Deliverables:
- Prominent action cards for Focus, Execute, and Review.
- State-aware copy such as ready, locked, or complete.
- A single primary action that matches the current cycle state.

Success criteria:
- Users can tell what to do next without reading the whole page.
- The dashboard remains a reflection point, not a duplicate planner screen.

### 2. Lightweight Onboarding

Add a short first-visit setup flow to capture default focus areas, preferred dose, and theme preference.

Deliverables:
- First-run onboarding panel or modal.
- Saved local preferences for focus, dose, and theme.
- A skip path so returning users are not blocked.

Success criteria:
- New users can reach a useful default setup in under a minute.
- Returning users skip onboarding automatically.

### 3. Weekly Insights

Add a more meaningful weekly summary that explains patterns, not just totals.

Deliverables:
- Focus-area trend breakdown.
- Most-used dose and strongest completion window.
- A short “what changed this week” summary.

Success criteria:
- The weekly view helps users make a next-cycle decision.
- Insights are easy to scan on mobile.

### 4. Daily Plan Editor

Allow small, constrained edits to today’s generated plan so users can adapt it without opening the door to unlimited editing.

Deliverables:
- Edit action and limited plan fields.
- Guardrails that keep the plan deliberate.
- Clear reset behavior when the plan is regenerated.

Success criteria:
- Users can adjust today’s plan when reality changes.
- The plan still feels bounded and intentional.

### 5. Browser Reminders

Add reminder setup in the UI first, with the lightest delivery mechanism that fits the static site.

Deliverables:
- Reminder preference UI.
- Optional browser scheduling or email draft support.
- Clear copy explaining what is and is not sent automatically.

Success criteria:
- Users can opt into reminders without leaving the site flow.
- Reminder behavior stays compatible with GitHub Pages deployment.

### 6. Offline and Sync Status

Expose whether the app is using local data or account-backed sync, and make that state visible in the dashboard.

Deliverables:
- Sync/local status indicator.
- Clear fallback messaging when backend support is unavailable.
- Explicit status in the dashboard header or action rail.

Success criteria:
- Users know whether their data is local or synced.
- Backend support does not block frontend usage.

## Suggested Execution Rhythm

1. Implement the smallest visible slice for the highest-priority item.
2. Add or update focused tests in the same change.
3. Validate with lint, typecheck, test, and build where relevant.
4. Update the README or implementation notes when the behavior changes.

## Current Starting Point

- Start with the dashboard action rail.
- Keep the next work constrained to the existing frontend flow.
- Only introduce supporting backend or middleware work when a frontend feature needs it to function.