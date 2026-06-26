# Calm Daily Coach MVP

A deliberate self-improvement app where users choose a daily content dose and receive exactly that amount.

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

## Configure Google auth

1. Create a Firebase project.
2. Enable Authentication and turn on Google provider.
3. Add authorized domains:
	- localhost
	- rodmen07.github.io
4. Copy [.env.example](.env.example) to `.env.local` and fill all NEXT_PUBLIC_FIREBASE values.
5. Restart local dev server after env changes.

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

## Live URL

https://rodmen07.github.io/calm-daily-coach/

## Dependabot updates

- This repository pins npm to the public registry in [.npmrc](.npmrc).
- Dependabot registry behavior is configured in [.github/dependabot.yml](.github/dependabot.yml).
- These settings prevent private-registry resolution errors during npm security update runs.

## Next implementation steps

1. Replace local browser storage with Firestore sync per authenticated user.
2. Add time-based reminder scheduling through a backend worker.
3. Add Stripe billing and paid trial gating.
