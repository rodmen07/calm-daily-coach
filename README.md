# Calm Daily Coach MVP

A deliberate self-improvement app where users choose a daily content dose and receive exactly that amount.

Core principles:

- No infinite feed.
- No streak pressure.
- Daily cap message once the selected dose is completed.

## Implemented in this first slice

- Mobile-first daily plan flow in [src/app/page.tsx](src/app/page.tsx)
- Plan generation API in [src/app/api/daily-plan/route.ts](src/app/api/daily-plan/route.ts)
- Reminder email API in [src/app/api/reminders/route.ts](src/app/api/reminders/route.ts)
- Plan and rule definitions in [src/lib/plan.ts](src/lib/plan.ts)
- Email transport with SMTP or preview mode in [src/lib/mailer.ts](src/lib/mailer.ts)

## Added in this second slice

- Persistent check-in storage in [src/lib/checkins.ts](src/lib/checkins.ts)
- Check-in API in [src/app/api/checkins/route.ts](src/app/api/checkins/route.ts)
- Weekly summary API in [src/app/api/weekly-summary/route.ts](src/app/api/weekly-summary/route.ts)
- Completion and skip controls plus weekly stats UI in [src/app/page.tsx](src/app/page.tsx)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Email reminders

For real email delivery, copy [.env.example](.env.example) to `.env.local` and set SMTP credentials.

If SMTP is not configured, the reminder API still works in preview mode so you can validate product flow without email infra.

## API contracts

`POST /api/daily-plan`

```json
{
	"focus": "Deep Work",
	"dose": "light",
	"notes": "optional context"
}
```

`POST /api/reminders`

```json
{
	"email": "you@example.com",
	"focus": "Deep Work",
	"dose": "light",
	"action": "Run one 15-minute focus sprint...",
	"minutes": 3
}
```

`POST /api/checkins`

```json
{
	"date": "2026-06-26",
	"focus": "Deep Work",
	"dose": "light",
	"minutes": 3,
	"status": "done"
}
```

`GET /api/weekly-summary`

Returns rolling 7-day totals and completion rate.

## Persistence notes

- Check-ins are stored in `.data/checkins.json` for local development.
- This is an intentional MVP storage layer and should be replaced with a real database when auth is added.

## Next implementation steps

1. Add authentication and per-user persistence.
2. Add time-based reminder scheduling instead of immediate send.
3. Add weekly summary generation and delivery.
4. Add Stripe billing and paid trial gating.
