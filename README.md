# Calm Daily Coach

Calm Daily Coach is a deliberate self-improvement app: pick your focus and dose, get one bounded plan, then stop on purpose.

## Core principles

- No infinite feed
- No streak pressure
- Clear daily cap message after the selected dose is completed

## Current features

- Daily plan generation from focus area + dose + optional context
- Three dose options: light (3 min), medium (10 min), deep (20 min)
- Check-ins with **complete** and **skip** flows (skip requires a reason)
- Weekly summary with completion rate and top focus
- Optional Google login with Firebase Authentication
- Local data scoped per user (`guest` or Firebase user id) in browser storage
- Reminder action that opens a prefilled `mailto:` draft

## Project structure

- Main UI: [/src/app/page.tsx](/src/app/page.tsx)
- Plan rules and generation: [/src/lib/plan.ts](/src/lib/plan.ts)
- Check-in persistence and weekly stats: [/src/lib/browser-checkins.ts](/src/lib/browser-checkins.ts)
- Firebase auth setup: [/src/lib/firebase.ts](/src/lib/firebase.ts)
- GitHub Pages workflow: [/.github/workflows/deploy-pages.yml](/.github/workflows/deploy-pages.yml)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Configure Google auth (optional)

1. Create a Firebase project.
2. Enable Authentication and turn on the Google provider.
3. Add authorized domains:
   - `localhost`
   - `rodmen07.github.io`
4. Copy [.env.example](.env.example) to `.env.local`.
5. Fill all `NEXT_PUBLIC_FIREBASE_*` values.
6. Restart the dev server.

If these environment variables are not set, the app still works in guest mode.

## Deployment

This project is configured as a static Next.js export for GitHub Pages (`output: "export"`).

1. Push to `main`.
2. Workflow [/.github/workflows/deploy-pages.yml](/.github/workflows/deploy-pages.yml) builds and deploys the `out/` artifact.
3. In repository settings, set Pages source to **GitHub Actions**.

## Persistence notes

- Plans and check-ins are stored in browser local storage.
- Data is scoped by user id when signed in, but remains local to the current browser/device.
