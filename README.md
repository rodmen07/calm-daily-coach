# Calm Daily Coach MVP

A deliberate self-improvement app where users choose a daily content dose and receive exactly that amount.

Live site: https://rodmen07.github.io/calm-daily-coach/

Core principles:

- No infinite feed.
- No streak pressure.
- Daily cap message once the selected dose is completed.

## Implemented in this first slice

- Mobile-first daily plan flow in [src/app/page.tsx](src/app/page.tsx)
- Plan and rule definitions in [src/lib/plan.ts](src/lib/plan.ts)

## Added in this second slice

- Persistent check-in storage in [src/lib/browser-checkins.ts](src/lib/browser-checkins.ts)
- Completion and skip controls plus weekly stats UI in [src/app/page.tsx](src/app/page.tsx)
- Animated flow-state chips and celebratory completion feedback in [src/app/page.tsx](src/app/page.tsx)
- Explicit daily workflow stepper (Focus -> Plan -> Do -> Review) in [src/app/page.tsx](src/app/page.tsx)
- Hard step locks that prevent plan edits/regeneration until a daily check-in is submitted in [src/app/page.tsx](src/app/page.tsx)
- Animated weekly and focus progress feedback in [src/app/page.tsx](src/app/page.tsx)
- Reduced-motion fallbacks for animated feedback in [src/app/globals.css](src/app/globals.css)
- Animated count-up values for weekly summary totals in [src/app/page.tsx](src/app/page.tsx)
- Staggered reveal motion for weekly summary cards and focus breakdown rows in [src/app/page.tsx](src/app/page.tsx)
- Expanded improvement categories and 5/15/30-minute activity windows in [src/lib/plan.ts](src/lib/plan.ts)
- Added Career, Creativity, and Home focus areas, with the full focus list now kept alphabetical in [src/lib/plan.ts](src/lib/plan.ts)
- Visible improvement category chips in [src/app/page.tsx](src/app/page.tsx)
- Route-based multi-page UX flow for Focus, Execute, and Review in [src/app/focus/page.tsx](src/app/focus/page.tsx), [src/app/execute/page.tsx](src/app/execute/page.tsx), and [src/app/review/page.tsx](src/app/review/page.tsx)
- Shared top-level route navigation shell in [src/app/layout.tsx](src/app/layout.tsx) and [src/app/globals.css](src/app/globals.css)
- Dark-mode-first theme system with a persisted light/dark toggle in [src/app/layout.tsx](src/app/layout.tsx), [src/app/components/theme-toggle.tsx](src/app/components/theme-toggle.tsx), and [src/app/globals.css](src/app/globals.css)
- Switching to light mode now uses an inline confirmation panel so dark mode stays the default experience.
- Shared navigation and card chrome now track the active theme instead of keeping hardcoded light-only surfaces.
- Swipe-enabled step cards with left/right gesture navigation and arrow-key fallback in [src/app/components/swipe-step-card.tsx](src/app/components/swipe-step-card.tsx)
- Swipe-enabled step cards now expose explicit accessible labels and contextual swipe hints in [src/app/components/swipe-step-card.tsx](src/app/components/swipe-step-card.tsx)
- Dashboard now focuses on user metrics and cycle entry only, while step cards carry the primary progression and loop back to dashboard reflection in [src/app/page.tsx](src/app/page.tsx)
- Added monetization entry points with a dashboard Pro upsell panel and dedicated pricing route in [src/app/page.tsx](src/app/page.tsx), [src/app/pricing/page.tsx](src/app/pricing/page.tsx), and [src/app/layout.tsx](src/app/layout.tsx)
- Added local monetization telemetry with plan-interest persistence and CTA click tracking in [src/lib/monetization.ts](src/lib/monetization.ts) and [src/app/hooks/use-monetization.ts](src/app/hooks/use-monetization.ts)
- Added an in-app monetization analytics route for local conversion snapshots in [src/app/monetization/page.tsx](src/app/monetization/page.tsx)

## Added Google login

- Firebase Google Authentication integration in [src/lib/firebase.ts](src/lib/firebase.ts)
- Sign-in and sign-out controls in [src/app/page.tsx](src/app/page.tsx)
- Local data scoping by signed-in user id to avoid cross-user state on shared devices

## GitHub Pages deployment mode

- This app is configured as a fully static Next.js export for GitHub Pages.
- Plan generation, check-ins, and weekly summaries run in-browser and persist via local storage.
- Reminder action opens a pre-filled email draft using `mailto:`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quality and tests

```bash
npm run lint
npm run typecheck
npm run check
npm run test
npm run test:coverage
```

Current automated coverage focuses on core business logic in `src/lib/plan.ts` and `src/lib/browser-checkins.ts`.
It also includes app behavior tests in `src/app/__tests__/page.test.tsx` for state hydration and auth-unconfigured UX.
Interaction coverage includes generate-plan, mark-complete, and skip-validation actions in `src/app/page.tsx`.
Completion feedback styling and success-state behavior are also covered in `src/app/__tests__/page.test.tsx`.
Progress animation states in the weekly summary are also covered in `src/app/__tests__/page.test.tsx`.
Workflow-step labeling and completion-state transitions are also covered in `src/app/__tests__/page.test.tsx`.
Planner lock/unlock behavior around daily check-in is also covered in `src/app/__tests__/page.test.tsx`.
Explicit Start next day reset behavior after review is also covered in `src/app/__tests__/page.test.tsx`.
Post-reset confirmation messaging and keyboard focus return to the plan generator are also covered in `src/app/__tests__/page.test.tsx`.
Animated feedback respects reduced-motion preferences through CSS fallbacks in `src/app/globals.css`.
Weekly count-up values for totals, completion percentage, and focus counts are also covered in [src/app/__tests__/page.test.tsx](src/app/__tests__/page.test.tsx).
Staggered summary-card and focus-row animation coverage is kept lightweight through the same page interaction suite.
The expanded focus-area set and 5/15/30-minute plan generation are covered in [src/lib/__tests__/plan.test.ts](src/lib/__tests__/plan.test.ts).
The visible category strip is also covered in [src/app/__tests__/page.test.tsx](src/app/__tests__/page.test.tsx).
The route loop across Dashboard, Focus, Execute, and Review is covered in [src/app/__tests__/route-loop.test.tsx](src/app/__tests__/route-loop.test.tsx).
The theme toggle and persistence behavior are covered in [src/app/components/__tests__/theme-toggle.test.tsx](src/app/components/__tests__/theme-toggle.test.tsx).
Rust bridge request and fallback behavior are covered in [src/lib/__tests__/rust-coach-bridge.test.ts](src/lib/__tests__/rust-coach-bridge.test.ts).
Pricing route and monetization tier rendering are covered in [src/app/__tests__/pricing-page.test.tsx](src/app/__tests__/pricing-page.test.tsx).
Dashboard and pricing monetization state behavior is covered in [src/app/__tests__/page.test.tsx](src/app/__tests__/page.test.tsx) and [src/app/__tests__/pricing-page.test.tsx](src/app/__tests__/pricing-page.test.tsx).
Monetization summary calculations and analytics route rendering are covered in [src/lib/__tests__/monetization.test.ts](src/lib/__tests__/monetization.test.ts) and [src/app/__tests__/monetization-page.test.tsx](src/app/__tests__/monetization-page.test.tsx).
Autonomous execution roadmap is tracked in `docs/AUTONOMOUS_IMPLEMENTATION_PLAN.md`.
The frontend-first functionality plan is tracked in [docs/FRONTEND_FUNCTIONALITY_PLAN.md](docs/FRONTEND_FUNCTIONALITY_PLAN.md).
The monetization strategy is tracked in [docs/MONETIZATION_PLAN.md](docs/MONETIZATION_PLAN.md).

## Maintainability structure

- Auth effects and login actions are isolated in `src/app/hooks/use-coach-auth.ts`.
- Planner state, persistence, and check-in actions are isolated in `src/app/hooks/use-coach-planner.ts`.
- Check-in persistence flows through `src/lib/checkin-store.ts` to support backend migration without UI rewrites.
- `src/app/page.tsx` now focuses on dashboard-only metrics and cycle-entry routing.
- Route pages `src/app/focus/page.tsx`, `src/app/execute/page.tsx`, and `src/app/review/page.tsx` provide a deeper step-by-step UX while reusing the same planner and auth hooks.

### Check-in backend mode

- Configure `NEXT_PUBLIC_CHECKIN_BACKEND` as `local` (default) or `firestore`.
- In `firestore` mode, the app uses Firestore when available and automatically falls back to local storage on backend errors.
- Firestore collection path is `users/{uid}/checkins`.
- On sign-in, guest check-ins are migrated to the signed-in scope once per backend mode with an idempotent migration marker.

### Rust coaching bridge mode

- Configure `NEXT_PUBLIC_RUST_COACH_BRIDGE_URL` to enable optional Rust-powered coaching hints.
- When configured, planner flows call the bridge with JSON payloads compatible with `new-crate-project` stdin bridge semantics.
- If the bridge is unavailable or returns an error, calm-daily-coach automatically falls back to its local planner/check-in logic.
- GitHub Pages static deploy remains functional without this variable.

## Branch protection quality gate

- Workflow `.github/workflows/ci.yml` runs lint, tests, and coverage on pushes and pull requests to `main`.
- Coverage HTML artifacts are uploaded on each workflow run.

## Configure Google auth

1. Create a Firebase project.
2. Enable Authentication and turn on Google provider.
3. Add authorized domains:
	- localhost
	- rodmen07.github.io
4. Copy [.env.example](.env.example) to `.env.local` and fill all NEXT_PUBLIC_FIREBASE values.
5. Restart local dev server after env changes.

### OAuth troubleshooting checklist

If Google login fails on the live site, verify these first:

1. Firebase Authentication -> Sign-in method -> Google is enabled.
2. Firebase Authentication -> Settings -> Authorized domains includes `rodmen07.github.io`.
3. GitHub repository secrets for deploy workflow include all NEXT_PUBLIC_FIREBASE_* values.
4. `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` matches your Firebase project auth domain (usually `<project-id>.firebaseapp.com`).
5. Browser popup blockers are disabled for the live site.

The app now shows Firebase error codes/messages in UI to make production diagnosis faster.

## Email reminders

Reminder uses a `mailto:` draft flow in static mode so it works on GitHub Pages with zero backend cost.

## API contracts

No server API routes in Pages mode.

## Persistence notes

- Check-ins are stored in browser local storage for zero-cost hosting.
- Data is device/browser specific until database-backed auth is added.

## Deploy to GitHub Pages

1. Push to `main`.
2. Workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) builds and deploys automatically.
3. In repository settings, set Pages source to GitHub Actions if not already set.

## Dependabot updates

- This repository pins npm to the public registry in [.npmrc](.npmrc).
- Dependabot registry behavior is configured in [.github/dependabot.yml](.github/dependabot.yml).
- These settings prevent private-registry resolution errors during npm security update runs.

## Next implementation steps

1. Replace local browser storage with Firestore sync per authenticated user.
2. Add time-based reminder scheduling through a backend worker.
3. Add Stripe billing and paid trial gating.
