# Trends: A Longer-Horizon Insight View (v0.11)

Status: PROPOSED - default decision, agent-doable now. Not a hard review gate
like [REMINDER_SCHEDULING.md](REMINDER_SCHEDULING.md): every choice below is an
overridable default, so the user can accept the lot with one word or redirect
any single line. Written 2026-07-20 as a product-role increment whose job was
specifically to define a genuine new capability, not another polish or
hygiene pass.

## 0. Why this document exists

v0.10 (theme consistency) shipped and closed out its own follow-ups (PRs #93,
#94). The backlog's remaining open items are all RECURRING streams (CI sweep,
DevSecOps audit, QA accessibility audit) plus v0.5 (Stripe entitlement design),
which stays deprioritized per the 2026-07-19 frontend/UI/UX direction - no
v0.11 milestone existed. Per the user's standing direction (see
[feedback_autodev_expansion.md] in the autodev memory), autodev should show
more genuine new-feature output, not just polish and bugfix work. This
document reads the app's actual shipped surfaces (not the pre-launch backlog's
original feature list, which predates v0.6-v0.9) to find a real capability gap
and defines v0.11 to fill it.

## 1. Candidates considered

Five real gaps were on the table, evaluated against: genuine new capability
(not polish), frontend/BaaS-only (no dedicated server), milestone-sized (one
to two PRs), and no conflict with the no-streaks/no-pressure product rules.

1. **Trends over time - a longer-horizon insight view (this document).** Every
   "trend" the app currently shows is a single rolling 7-day window compared
   against the prior 7-day window (`getWeekOverWeekChange` in
   [src/lib/review-insights.ts](../../src/lib/review-insights.ts)). The
   underlying history is not bounded to a week - `browser-checkins.ts` retains
   every check-in ever recorded, and Firestore does too - but nothing reads
   more than fourteen days of it. This is a real, currently-unaddressed gap
   with the data already sitting there unused.
2. **Cross-device continuity gaps.** Check-ins (v0.4) and journal entries
   (v0.9) both already sync through client-SDK Firestore adapters. The one
   remaining named gap - guest-to-signed-in-user journal migration - is
   explicitly scoped OUT of v0.9 in
   [JOURNAL_FIRESTORE_SYNC.md section 3](JOURNAL_FIRESTORE_SYNC.md), as a
   small, already-understood follow-up, not a fresh capability. Closing it
   would be legitimate work but it is closing a known small gap, not defining
   a new capability area - weaker fit for what this run was asked to find.
3. **Expanding the reminder system's reach.** Three channels already ship
   (in-app Web Notifications, .ics calendar export, browser reminder draft -
   see [REMINDER_SCHEDULING.md](REMINDER_SCHEDULING.md)). The next plausible
   reach expansion is real push notifications via Firebase Cloud Messaging,
   which is BaaS-only in principle, but it needs a service worker, VAPID key
   generation, and console-side FCM setup - multiple USER-ONLY console gates
   before any of the code is exercisable, and the mandate explicitly prefers
   agent-doable-now work. Set aside for a future milestone once the user wants
   to clear those gates.
4. **Planner enhancements (multi-day / forward planning).** The Focus, Execute,
   Review loop is deliberately today-only by product design
   (`deriveTodayLoopPercent` in
   [src/lib/planner-derivations.ts](../../src/lib/planner-derivations.ts):
   "This intentionally presents today only: no history, no streaks"). Adding
   forward planning risks drifting toward the exact streak/pressure mechanics
   the product rules forbid, and is a bigger product judgment call than this
   run should make unilaterally. Set aside.
5. **Cross-referencing journal reflections with check-in data.** Interesting,
   but on its own it is a smaller UI curation feature (surface a relevant past
   entry) rather than a new capability area. Folded into candidate 1 in a
   minimal form (see section 3) rather than treated as its own milestone.

**Decision: promote candidate 1, Trends over time, to v0.11.** It is the
strongest match on every criterion: genuinely new (no page like it exists
today), frontend/BaaS-only (extends the exact client-SDK query pattern v0.4
already established), milestone-sized, and it uses data the app already
collects and already retains in full, just never surfaces past one week.

**Overridable default:** if the user would rather see candidate 2, 3, or 4
prioritized first, that is a one-word redirect.

## 2. What's actually there today (the audit)

Read directly rather than assumed:

- [src/lib/browser-checkins.ts](../../src/lib/browser-checkins.ts):
  `listCheckins` returns the entire local history, unbounded, sorted newest
  first. `getWeeklySummary` filters that full list down to a hardcoded 7-day
  window (`startDate.setDate(endDate.getDate() - 6)`, line 95).
- [src/lib/firestore-checkins.ts](../../src/lib/firestore-checkins.ts):
  `getFirestoreWeeklySummary` runs the same shape of query against Firestore -
  `where("date", ">=", startKey), where("date", "<=", endKey)` - with the
  window hardcoded to 7 days and no `limit()`. No pagination exists anywhere
  in this file; widening the window is not introducing a new risk class, it
  is widening an existing, already-accepted one.
- [src/lib/review-insights.ts](../../src/lib/review-insights.ts):
  `getWeekOverWeekChange` compares the current 7-day window against the 7
  days immediately before it - the app's only "trend" today, and it never
  looks back further than 14 days total.
- **A real bug found while tracing this data path**: `review/page.tsx`'s
  `checkinsInWindow` and `weekOverWeek` (lines 32-48) call
  `listCheckins(storageScope)` directly from
  [src/lib/browser-checkins.ts](../../src/lib/browser-checkins.ts) - bypassing
  `checkin-store.ts`'s `CheckinStoreAdapter` entirely. For a signed-in user
  resolved to the Firestore backend, this reads an empty (or stale) local
  list, so the week-over-week and skip-reason-insights panels silently show
  "no prior data" even though the user's real history lives in Firestore.
  `weeklySummary` itself is unaffected (it is fetched correctly through the
  adapter inside `use-coach-planner.ts`); only these two supplementary
  review-page computations bypass it. This is filed as a MED bug in the
  backlog (section below) rather than fixed here - it is a defect in
  already-shipped v0.9-era code, out of scope for a product-definition
  increment - but it directly shapes the technical plan below: v0.11 must not
  repeat the same bypass.
- [docs/FIRESTORE_RULES.md](../FIRESTORE_RULES.md) lines 75-79: the
  `checkins` match block already grants `allow read, create: if isOwner(uid)`
  with no window restriction. A wider date-range read of the same collection
  needs no rules change - it is still just a `read` by the owning uid.
- Keyboard chords: [keyboard-help.tsx](../../src/app/components/keyboard-help.tsx)
  keeps `GO_TO_TARGETS` (line 16) and `SHORTCUT_ROWS` (line 35) as the single
  source of truth for "g then X" navigation, currently `d` / `f` / `e` / `r` /
  `j`. Adding a target is a two-line change, proven every milestone since v0.6.
- Empty states: [empty-state.tsx](../../src/app/components/empty-state.tsx)
  already has an `"insights"` variant ("a young sprout: insights grow on their
  own schedule") used by the Review page's own empty state. It reads as
  appropriate for a trends page too - no new illustration is required to hit
  the calm-tone bar.

## 3. Technical plan

Mirrors the v0.4 / v0.9 shape: extend the existing store layer with one new
read path, add pure derivation functions beside `review-insights.ts`, and add
one new page wired the same way `/journal` and `/monetization` already are.

### 3.1 Store layer (new range-read, not a new backend)

- `src/lib/browser-checkins.ts`: add `listCheckinsInRange(days: number,
  endDateInput: string | undefined, scopeKey: string): BrowserCheckin[]` - a
  pure filter over the already-fully-retained local list (`listCheckins`
  already returns everything; this just windows it by `days` instead of the
  hardcoded 6). Zero new I/O.
- `src/lib/firestore-checkins.ts`: add `getFirestoreCheckinsInRange(db,
  days: number, endDateInput: string | undefined, scopeKey: string):
  Promise<BrowserCheckin[]>` - same `where("date", ">=", ...).where("date",
  "<=", ...)` query shape as `getFirestoreWeeklySummary`, parameterized by
  `days` instead of the hardcoded 7, returning the raw check-in records
  instead of a pre-aggregated summary. Aggregation (by-week, by-focus, by-dose)
  happens once in the new pure module (3.2), not duplicated a third time the
  way `getWeeklySummary` and `getFirestoreWeeklySummary` currently each
  reimplement `byFocus` counting independently.
- `src/lib/checkin-store.ts`: add `getCheckinsInRange: (days: number,
  endDateInput: string | undefined, scopeKey: string) =>
  Promise<BrowserCheckin[]>` to the `CheckinStoreAdapter` type and all three
  branches (`local`, `firestore`, `firestore-fallback`), mirroring
  `getWeeklySummary`'s existing three-branch shape (lines 160-217) including
  the try/catch-and-fall-back-to-local safety on the Firestore branch.
  **This is the fix that avoids repeating the review-page bug from section
  2**: the Trends page reads exclusively through this adapter method, never
  through `browser-checkins.ts` directly.
- **Default: 28 days (4 weeks), fixed, not user-selectable in v0.11.**
  Overridable: a window-size selector (4 / 8 / 12 weeks) is a natural
  follow-up once the fixed default is live; adding it now would turn a
  1-2 PR milestone into a bigger one. 28 days at realistic check-in volume
  (at most a handful of documents per day) stays a small, single unlimited
  `getDocs` call, consistent with the existing unlimited 7-day query - no
  pagination is introduced or needed at this window size.

### 3.2 Pure derivation module (new file, mirrors review-insights.ts)

New `src/lib/trend-insights.ts`:

- `bucketCheckinsByWeek(checkins: BrowserCheckin[], weeks: number,
  endDateInput?: string): TrendWeekBucket[]` - splits the range into `weeks`
  contiguous 7-day buckets (oldest first), each shaped like the existing
  `WeeklySummary` (`total`, `done`, `skipped`, `completionRate`, `byFocus`) so
  the UI can reuse the exact same rendering patterns (`progress-track` /
  `progress-fill` / `focus-row`) already proven on the Dashboard and Review
  pages instead of inventing a new visual vocabulary.
- `getTrendSummary(checkins: BrowserCheckin[], weeks: number,
  endDateInput?: string): TrendSummary` - `{ buckets, overallCompletionRate,
  doseDistribution, narrative }`. `doseDistribution` is a
  `Record<DailyDose, number>` count across the whole window (the dose
  equivalent of `byFocus`, which the buckets already carry per-week).
- `getTrendNarrative(buckets: TrendWeekBucket[]): string` - calm, descriptive,
  comparison-free of any single day (e.g. "Over the last 4 weeks you completed
  about 65% of your planned sessions, with Deep Work the most consistent
  focus area." / "The last 4 weeks show lighter activity than usual - that's
  fine, pick back up whenever feels right."). Deliberately never uses
  streak-shaped language ("day N", "keep it going", consecutive-day counts) -
  same calm-tone bar `getPatternSummary` and `getWeekOverWeekChange` already
  hold themselves to.
- **Small optional addition, flagged separately so it can be cut without
  reshaping anything else**: a `journalEntryCountInWindow` stat, sourced from
  the existing `listJournalEntries` (local) / `listFirestoreJournalEntries`
  (Firestore, already shipped in v0.9) adapters, surfaced as a single line
  ("You wrote 3 reflections in this window") linking Trends back to Journal.
  No new journal code is needed - both list functions already exist and
  already return full history. **Overridable/cuttable**: if this widens PR1's
  diff more than it's worth, it moves to a PR2 or to "Later" without changing
  anything else in this document.

### 3.3 New page: `/trends`

- `src/app/trends/page.tsx`, following the `/journal` and `/monetization`
  precedent: `page-shell` + `panel` wrapper, NOT `SwipeStepCard` (Trends is a
  standalone reflection surface, not a fourth step in the Focus -> Execute ->
  Review loop, so it should not imply it belongs in that step sequence).
- Data flow: `createCheckinStore(undefined, { signedIn })` (same memoization
  pattern `use-coach-planner.ts` already uses), then
  `checkinStore.getCheckinsInRange(28, undefined, storageScope)`, then
  `getTrendSummary(...)` client-side. No new hook is required; a page-local
  `useEffect` + `useState` (async adapter calls are already the norm - see
  `journal/page.tsx`'s async load/save wiring from v0.9) is enough.
- Rendering: four weekly bars reusing `.progress-track` / `.progress-fill`
  (one row per bucket, oldest to newest, each labeled by its date range), an
  overall completion stat card reusing `.summary-card`, a focus-distribution
  list reusing `.focus-row`, a dose-distribution row (three `.summary-card`s:
  light / medium / deep), and the narrative text in the same
  `border-(--line) bg-(--field)` panel style Review already uses for
  `patternSummary`.
- Empty state: `<CalmEmptyState variant="insights" .../>` (reused, not a new
  illustration - see section 2) when the window contains zero check-ins,
  matching Review's own "at least one check-in" threshold rather than
  inventing a different bar.
- Nav: `src/app/components/site-nav.tsx` - add `{ href: "/trends", label:
  "Trends" }` to `NAV_LINKS`.
- Keyboard: `src/app/components/keyboard-help.tsx` - add `t: "/trends"` to
  `GO_TO_TARGETS` and `{ keys: ["g", "t"], separator: "then", description: "Go
  to Trends" }` to `SHORTCUT_ROWS`, following the exact two-line pattern every
  prior chord addition used.
- Optional small teaser: a one-line link from `/review` to `/trends` ("See
  your 4-week trend"). **Overridable/cuttable**: purely a discoverability nice-
  to-have: the nav link and keyboard chord alone make the page fully
  reachable without it.

### 3.4 Tests

- `src/lib/__tests__/trend-insights.test.ts` (new): bucketing correctness
  (boundary dates land in the right week), `overallCompletionRate` math,
  `doseDistribution` counts, and `getTrendNarrative` calm-tone assertions
  (no streak-shaped substrings), mirroring
  `src/lib/__tests__/review-insights.test.ts`'s existing structure.
- `src/lib/__tests__/checkin-store.test.ts` (extended): `getCheckinsInRange`
  covers local / firestore / firestore-fallback / thrown-error-falls-back-to-
  local, mirroring the file's existing `getWeeklySummary` coverage.
- **New direct-SDK-mock test for the Firestore range read**: unlike
  `firestore-checkins.ts` today (which has no dedicated test file of its own
  and is only exercised indirectly through `checkin-store.test.ts`'s mocked
  adapter - a real, separate, pre-existing gap noted here but not fixed by
  this milestone), `getFirestoreCheckinsInRange` gets its own
  `src/lib/__tests__/firestore-checkins.test.ts` that mocks `firebase/firestore`
  directly and exercises the real function body, following the precedent
  `firestore-journal.test.ts` set in PR #90. This closes the gap for the new
  function without being asked to backfill coverage for the whole file.
- `src/app/__tests__/trends-page.test.tsx` (new, matching the
  `review-page.test.tsx` / `journal-page.test.tsx` naming convention):
  renders with seeded local check-ins across 4+ weeks, asserts the buckets
  render in order and the narrative and empty-state paths both work.
- `keyboard-help.test.tsx` and `page.test.tsx` (site-nav related): extend the
  existing chord-list assertion to include the new `g t` target, following
  the same pattern used when `g j` was added for Journal.

## 4. Why this doesn't need a user decision to start

Every read added is a wider window over a collection the app already reads
(`users/{uid}/checkins`, already `allow read: if isOwner(uid)` in the
published rules per [FIRESTORE_RULES.md](../FIRESTORE_RULES.md)). No new
Firestore rule, no new environment variable, no new npm dependency (charts are
hand-rolled from CSS classes already in `globals.css`), and no server
component of any kind - it is client-SDK reads only, the same shape v0.4 and
v0.9 already established and the user has already accepted twice. The one
genuine product call (the 28-day fixed window vs. a selectable range) is
called out as an overridable default in section 3.1, not a blocking decision.

## 5. Done-when (checkable)

- [ ] `src/lib/trend-insights.ts` exists with `bucketCheckinsByWeek`,
      `getTrendSummary`, and `getTrendNarrative`, covered by
      `src/lib/__tests__/trend-insights.test.ts`.
- [ ] `CheckinStoreAdapter` (`src/lib/checkin-store.ts`) exposes
      `getCheckinsInRange`, implemented for all three backend branches
      (`local`, `firestore`, `firestore-fallback`), with the same Firestore-
      error-falls-back-to-local safety the existing methods have, covered by
      extended tests in `checkin-store.test.ts`.
- [ ] `src/lib/firestore-checkins.ts` exposes `getFirestoreCheckinsInRange`,
      imports only from `firebase/firestore` (no server/API route), reads
      only `users/{uid}/checkins`, and has its own direct-SDK-mock test file
      `src/lib/__tests__/firestore-checkins.test.ts`.
- [ ] `src/app/trends/page.tsx` exists, is reachable from `site-nav.tsx`'s
      `NAV_LINKS` and from the `g` then `t` keyboard chord in
      `keyboard-help.tsx`, reads check-in history exclusively through
      `CheckinStoreAdapter` (never a direct `browser-checkins.ts` import,
      per section 2's bug finding), and renders a working empty state via
      `CalmEmptyState variant="insights"` when the window has no check-ins.
- [ ] `docs/FIRESTORE_RULES.md` is confirmed unchanged as part of this work
      (no new rule needed - see section 4); if implementation finds a rule
      change is actually required, that is a signal this plan missed
      something and should be re-reviewed before shipping.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` are
      green on the quality-gate check (the same consolidated required check
      PR #86 established).
- [ ] `package.json` is bumped to `0.11.0` **in the implementation PR**, not
      in this proposal PR, matching the v0.9/v0.10 precedent.

## 6. Disposition of candidates set aside

- Cross-device continuity (guest-to-signed-in journal migration): stays
  exactly where [JOURNAL_FIRESTORE_SYNC.md section 3](JOURNAL_FIRESTORE_SYNC.md)
  already left it - a named, small, unclaimed follow-up. Unaffected by this
  document.
- Reminder system reach (Firebase Cloud Messaging push): not written anywhere
  yet as a candidate; recorded here so it is not lost. A real future
  direction once the user is ready to clear its console/VAPID-key USER-ONLY
  gates - added to `docs/ROADMAP.md`'s "Later / candidates" as part of this
  same PR.
- Planner forward-planning / multi-day intentions: deliberately not
  recommended at all given the streak/pressure-mechanic risk called out in
  section 1 candidate 4 - if the user wants this explored, it needs an
  explicit product decision first, not a default this document should set.
- The `review/page.tsx` adapter-bypass bug (section 2): filed in the backlog
  `## Bugs` section as MED, not fixed here - this document's job is to define
  a milestone, not to expand it into an unrelated bug fix, but the bug is
  real and is now tracked rather than only living in this design doc's audit
  trail.
