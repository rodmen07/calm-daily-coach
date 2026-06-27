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
Autonomous execution roadmap is tracked in `docs/AUTONOMOUS_IMPLEMENTATION_PLAN.md`.

## Maintainability structure

- Auth effects and login actions are isolated in `src/app/hooks/use-coach-auth.ts`.
- Planner state, persistence, and check-in actions are isolated in `src/app/hooks/use-coach-planner.ts`.
- Check-in persistence flows through `src/lib/checkin-store.ts` to support backend migration without UI rewrites.
- `src/app/page.tsx` focuses on view composition and wiring.

### Check-in backend mode

- Configure `NEXT_PUBLIC_CHECKIN_BACKEND` as `local` (default) or `firestore`.
- In `firestore` mode, the app uses Firestore when available and automatically falls back to local storage on backend errors.
- Firestore collection path is `users/{uid}/checkins`.
- On sign-in, guest check-ins are migrated to the signed-in scope once per backend mode with an idempotent migration marker.

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
