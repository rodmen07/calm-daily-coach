# Focus (Calm Daily Coach) - Product Roadmap

Canonical forward roadmap as of 2026-07-18. This document supersedes the forward-looking
sections of docs/FRONTEND_FUNCTIONALITY_PLAN.md, docs/AUTONOMOUS_IMPLEMENTATION_PLAN.md,
and docs/MONETIZATION_PLAN.md; those files remain as historical records with status banners.

## Versioning convention

- Delivery is PR-based: releases are tracked by merged PR number on `main`, deployed
  automatically to GitHub Pages. There are no git tags.
- package.json has stayed at 0.1.0 since the project started. Starting with the roadmap
  consolidation PR, package.json is bumped once per roadmap milestone (0.2.0, 0.3.0, ...),
  targeting roughly one minor version per week.
- Milestones below are sized so each ships as one or two small PRs, matching the
  autonomous one-increment-per-run dev workflow.

## Product rules (non-negotiable, apply to every milestone)

- No infinite feed.
- No streak pressure (streak mechanics were deliberately removed in PR #73).
- Daily dose cap stays enforced.
- Calm, ADHD friendly UX: opt-in nudges only, no guilt or escalation mechanics.

## Current state (2026-07-18)

- App: "Focus: Your ADHD friendly self-improvement coach" (rebranded from Calm Daily
  Coach in PR #59). Next.js 16 / React 19 TypeScript static export on GitHub Pages at
  https://rodmen07.github.io/calm-daily-coach/. No server routes.
- Persistence: since the v0.4 flip (2026-07-19), an unset
  `NEXT_PUBLIC_CHECKIN_BACKEND` resolves to Firestore for signed-in users on
  Firebase-configured deployments and to localStorage otherwise; explicit
  `local|firestore` values still force their mode. Automatic local fallback and
  idempotent guest-to-account migration are unchanged. Signed-out and
  Firebase-less usage stays localStorage-only.
- Monetization: single $5/month membership after a 30-day free trial. Stripe Payment
  Link billing scaffolding shipped in PR #77 (src/lib/billing.ts,
  `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`, `client_reference_id` plus `prefilled_email`
  attribution, mailto fallback). Entitlement flips are manual in Firestore for now.
- PRs #69 through #77 all merged on 2026-07-18 (highest number is #77; the final merge
  to main that day was #76): automation PR reliability (#69), dev-agent backlog
  hygiene (#70), ReminderSettingsPanel (#71), sync-badge backend-mode fix (#72),
  challenges de-streaking (#73), week-over-week review insight (#74), postcss audit
  override with npm audit now clean (#75), dashboard AffirmationCard (#76), Stripe
  Payment Link (#77).
- All six items of the frontend functionality plan (action rail, onboarding, weekly
  insights, plan editor, browser reminders, offline/sync status) are complete as of
  2026-07-18.
- The repo also hosts a Python dev-agent pipeline in agents/dev-agent/ (backlog ids
  cdc-001 through cdc-016). Roadmap items may reference cdc ids, but files under
  agents/dev-agent/ must never be edited by roadmap work.

## Next milestones

### v0.2 - Roadmap consolidation and reminder delivery design (target week of 2026-07-25)

Resets the paper trail to reality and unblocks v0.3 and v0.5 with the design decisions
they wait on. All items agent-doable now.

- This document plus status banners on the three legacy planning docs and a one-line
  README pointer (1 PR). Bump package.json to 0.2.0 in the same PR and keep the
  versioning convention stated above.
- Reminder scheduling design doc: enumerate GitHub Actions cron plus email, client-side
  Web Notifications, and Firebase Functions options with cost, privacy, and calm-UX
  tradeoffs; ship as a docs-only PR for user review (1 PR).
- Done when: ROADMAP.md and banners are merged, package.json reads 0.2.0, and the
  reminder design doc is merged and awaiting user sign-off.

### v0.3 - Reminder delivery v1 (target week of 2026-08-01)

BLOCKED until the v0.2 reminder design doc merges with user sign-off.

- Design doc under review: [docs/design/REMINDER_SCHEDULING.md](design/REMINDER_SCHEDULING.md) scores the delivery options and proposes the phased plan this milestone implements.
- BLOCKED (design approval): implement the approved delivery mechanism (for example
  Web Notifications opt-in nudges that fire with the tab backgrounded, or a GitHub
  Actions cron email digest) behind the existing ReminderSettingsPanel channel choice
  (1 to 2 PRs).
- Keep the "nothing is sent automatically" copy truthful: update copy, README, and
  reminder tests to match the shipped behavior exactly.
- Product rules apply: reminders stay opt-in, single daily nudge, no escalation or
  guilt mechanics.
- Done when: an opted-in user receives exactly one daily nudge via the chosen channel
  and all reminder copy matches actual behavior.

### v0.4 - Sync by default: Firestore flip with safe fallback (target week of 2026-08-08)

The adapter, migration, and honest sync badge (PR #72) already exist, so the flip is
small and testable. Agent-doable now, except the listed USER-ONLY item.

Status (2026-07-19): agent-side work implemented; awaiting the USER-ONLY items below.

- DONE (2026-07-19): flipped the `NEXT_PUBLIC_CHECKIN_BACKEND` default with a safe
  resolution matrix (unset resolves to `firestore` only when Firebase config is
  present AND the user is signed in, `local` otherwise; explicit `local` still forces
  local), kept the existing automatic local fallback, and added migration notes plus
  a rollback lever (repository variable `NEXT_PUBLIC_CHECKIN_BACKEND=local`, inlined
  by deploy-pages.yml) to the README.
- DONE (2026-07-19): sync-badge and fallback tests extended for the new default
  (CLOUD SYNCED, SYNC OFF (LOCAL), SIGNED IN (LOCAL) states plus the resolution
  matrix and Firestore write/read/migration fallback paths).
- DONE (2026-07-19): Firestore security rules for `users/{uid}` and
  `users/{uid}/checkins` documented in docs/FIRESTORE_RULES.md (docs only;
  deploying the rules in the Firebase console is USER-ONLY).
- USER-ONLY: confirm Firebase project quotas and billing before the default flip goes
  live, and publish the documented security rules in the Firebase console.
- Done when: a fresh deploy defaults to Firestore sync for signed-in users, falls back
  to local cleanly when Firestore is unreachable, and the security rules doc is merged.

### v0.5 - Entitlement: webhook design and client-side membership state (target week of 2026-08-15)

Monetization ladder step 4. The static site cannot receive Stripe webhooks, so
automation needs a design doc first; meanwhile the client can honestly read the
manually-set entitlement.

- Stripe webhook entitlement automation design doc ONLY: Firebase Functions (or
  equivalent) receiver mapping `client_reference_id` to `users/{uid}.subscriptionStatus`,
  with cost estimate and failure modes; docs PR for user review (1 PR).
- Client-side entitlement read: dashboard membership panel reads `subscriptionStatus`
  from `users/{uid}` in Firestore with graceful local fallback and calm expired-state
  copy (1 PR).
- USER-ONLY: create the $5/month Stripe Payment Link and set repository variable
  `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`.
- USER-ONLY: flip `subscriptionStatus` to "active" in Firestore for real payments until
  webhook automation ships.
- Done when: the design doc is merged for review and the dashboard reflects real
  Firestore entitlement state with calm fallback copy.

### v0.6 - Calm UX polish from the dev-agent backlog (target week of 2026-08-22)

Burns down pending cdc items that fit the product rules, keeping the autonomous
pipeline fed with small well-scoped work. Agent-doable now. Reference cdc ids in PR
bodies but never edit agents/dev-agent/ files.

- DONE (2026-07-19, v0.6 PR1): wired the already-built ProgressRing component
  (cdc-003; cdc-015 was closed as its duplicate) into the dashboard today spotlight.
  It shows today's loop progress only (plan set is halfway, check-in submitted is
  complete), honors prefers-reduced-motion by rendering the final value with no
  fill animation, and keeps the zero state calm and inviting.
- DONE (2026-07-19, v0.6 PR2): keyboard shortcut help modal (cdc-004) plus
  empty-state illustration component (cdc-012). The header "?" button or the ?
  key opens an accessible dialog (focus trap, Escape, reduced-motion aware)
  listing only real shortcuts, including new "g then d/f/e/r" go-to chords that
  never fire while typing. A reusable CalmEmptyState component with hand-drawn
  inline SVG art now covers Execute (no plan), Review (no check-ins), and the
  Slicer history list.
- Backlog hygiene note: the PR #70 hygiene pass already closed cdc-010 (tag filter
  chips) and cdc-016 (scroll-to-top) as duplicates of cdc-007 and cdc-006, which stay
  pending. Skip any infinite-scroll-adjacent items as product-rule violations.
- Done when: both feature PRs are merged with tests and no product rule is violated.

### v0.7 - Gratitude journal (target week of 2026-08-29)

Agent-doable now. A single small PR, matching the one-or-two-PR milestone size.

- DONE (2026-07-19): gratitude journal entry form (cdc-014) at /journal as a
  bounded reflection surface. Entries are keyed by local calendar date so
  exactly one exists per day; after saving, the editor becomes a read view of
  today's entry with a gentle note, and editing updates that same entry in
  place. A soft prompt rotates deterministically by date. History is a finite
  newest-first list revealed in chunks of 7 ("Show earlier entries"), with a
  CalmEmptyState journal variant when empty; no streaks, counters, badges, or
  missed-day mechanics anywhere. Persistence is localStorage-only scoped per
  user (the slicer pattern); Firestore sync is deliberately deferred to
  "Later / candidates" rather than half-wired. Shipped with a header nav link,
  a "g then j" go-to chord listed in the keyboard help modal, and package.json
  bumped to 0.7.0.
- Done when: the journal PR is merged with tests and the surface enforces the
  one-entry-per-day bound.

## Later / candidates (unscheduled)

Valid direction from AUTONOMOUS_IMPLEMENTATION_PLAN.md Phases 4 to 6 and the
monetization ladder, plus housekeeping. Nothing here is scheduled until v0.2 through
v0.7 land.

- Performance pass: bundle analysis, web-vitals instrumentation, Firebase SDK load
  optimization (AUTONOMOUS plan Phase 4).
- Security hardening: replace the untouched template SECURITY.md with a real policy,
  secret scanning, dependency review (AUTONOMOUS plan Phase 5).
- Playwright E2E smoke test for the daily loop plus a PR template (AUTONOMOUS plan
  Phase 6).
- Remove the dead reminder-email helper src/lib/mailer.ts plus its nodemailer
  dependency once the reminder design settles: no other module imports it, and the
  static export has no server routes to run it.
- Paid value expansion (advanced weekly narratives, cloud restore): deferred until
  entitlement automation ships.
- Gratitude journal cloud sync: move journal entries onto the check-in style
  Firestore adapter once a users/{uid}/journal ruleset is documented next to
  docs/FIRESTORE_RULES.md and deployed in the console (deploy is USER-ONLY).
  Until then the journal stays localStorage-only by design.

## Blocked and user-only summary

Blocked (with reasons):

- Reminder delivery v1 (v0.3): blocked on the v0.2 design doc being approved by the
  user; a static GitHub Pages site cannot run background schedulers itself.
- Stripe webhook entitlement implementation: blocked on the v0.5 design doc approval
  and on the user provisioning Firebase Functions billing; a static site cannot
  receive webhooks.
- Rust coach bridge deployment (`NEXT_PUBLIC_RUST_COACH_BRIDGE_URL`): blocked; no
  backend exists to host it. The portfolio GCP/Fly infrastructure was decommissioned
  to zero on 2026-06-04 with all runtime data gone, so any idea that assumed reusing
  that infrastructure stays blocked until something is redeployed. This repo itself
  (GitHub Pages plus Firebase) is unaffected.

User-only (paid-account and console actions an agent must not perform):

- Create the $5/month Stripe Payment Link and set the repository variable
  `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`.
- Flip `subscriptionStatus` to "active" in Firestore for real paying users until
  webhook automation ships.
- Deploy Firestore security rules in the Firebase console (ruleset documented in
  docs/FIRESTORE_RULES.md).
- Confirm Firebase quotas and billing before the v0.4 default flip.

## History and supersession

- docs/FRONTEND_FUNCTIONALITY_PLAN.md: all six priority items shipped; weekly
  insights, browser reminders, and offline/sync status landed on 2026-07-18. The doc
  is now a historical completion log. Its "start with the dashboard action rail"
  starting point shipped long ago.
- docs/AUTONOMOUS_IMPLEMENTATION_PLAN.md: Phases 1 to 3 are done except Phase 3
  item 4 (server-side scheduled reminders), which became the v0.2/v0.3 reminder
  design work; Phases 4 to 6 are folded into "Later / candidates" above. Its progress
  log stops at 2026-06-27 and misses everything from PR #52 onward, including ambient
  audio (PR #52), micro challenges (PR #53), guided breathwork (PR #56), the Focus rebrand
  (PR #59), the ADHD Task Slicer (PR #61), and the dev-agent automation platform
  (PRs #63 through #70).
- docs/MONETIZATION_PLAN.md: the single $5/month membership (header updated 2026-07-18)
  replaced the Free/Pro/Team feature-gate and Starter/Pro/Team metrics framework;
  those sections are retired. Ladder steps 4 and 5 (entitlement controls, paid value
  expansion) carry forward as v0.5 and "Later / candidates".
- Challenge streaks shipped in PR #53 were deliberately removed in PR #73 to honor the
  no-streak-pressure promise; any roadmap item implying streaks is off-limits.
