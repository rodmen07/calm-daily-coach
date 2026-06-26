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

## Next implementation steps

1. Add authentication and per-user persistence.
2. Add time-based reminder scheduling through a backend worker.
3. Replace local storage with per-user database sync.
4. Add Stripe billing and paid trial gating.
