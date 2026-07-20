# Journal Firestore Sync Design (v0.9)

Status: PROPOSED - default decision, agent-doable now. Not a hard review gate
like [REMINDER_SCHEDULING.md](REMINDER_SCHEDULING.md): every choice below is an
overridable default, so the user can accept the lot with one word or redirect
any single line. Written 2026-07-20 as part of a roadmap-audit / product
increment.

## 0. Why this document exists

[docs/ROADMAP.md](../ROADMAP.md) and the autodev backlog carried a v0.9
definition of "paid-value expansion design doc," explicitly gated behind "the
v0.5 entitlement design" being approved. v0.5 (Stripe webhook entitlement
design) is itself DEPRIORITIZED per the user's 2026-07-19 frontend/UI-UX
direction, which has no re-approval date. A milestone whose only dependency is
a deprioritized item is not a milestone, it is a stall, so this document
re-slots v0.9 to a candidate with no backend/entitlement dependency at all.

## 1. Candidates considered

Three frontend-scoped candidates were on the table (identified incidental to
earlier PRs, listed in the backlog's `## Bugs` and "Later" sections):

1. **`checkinStatus` persistence bug** (LOW, backlog `## Bugs`): the dashboard
   ProgressRing resets to 50 percent on reload instead of persisting the 100
   percent check-in state, because `checkinStatus` is in-memory per page
   mount. Real, but it is a single small fix inside one existing component,
   not milestone-sized work, and it does not require a version bump or a
   design doc to execute correctly.
2. **Gratitude journal Firestore sync** (this document): journal entries are
   localStorage-only by deliberate v0.7 design choice, noted in
   [docs/ROADMAP.md](../ROADMAP.md#later--candidates-unscheduled) as a "Later"
   candidate pending a documented ruleset. See section 2 for why this is safe
   to promote now.
3. **General UI/UX polish pass**: valid but not concrete enough to write a
   checkable done-when without first picking specific surfaces, which would
   just be this same exercise one level removed.

**Decision: promote candidate 2, gratitude journal Firestore sync, to v0.9.**
It is the only one of the three that is both milestone-sized (matches the
v0.4 "adapter plus rules doc plus tests" shape, 1 PR) and genuinely new
capability rather than a bug fix or unscoped polish. Candidate 1 stays a
standalone bug-fix pickup for a future dev-stream increment (still tracked in
the backlog `## Bugs` section, unaffected by this document). Candidate 3 stays
in "Later / candidates" until it has specific surfaces named.

**Overridable default:** if the user would rather see the `checkinStatus` fix
or a named UI polish item ship first, that is a one-word redirect; nothing
here presumes journal sync is more urgent, only that it is the most
milestone-shaped of the three.

## 2. Why this is frontend work, not backend work

The user's 2026-07-19 direction deprioritizes "Stripe webhooks, entitlement
server logic" specifically, because a static GitHub Pages export cannot run a
webhook receiver and needs a server component (Firebase Functions or
equivalent) that does not exist yet. Journal sync has no such gap:

- The existing check-in sync (v0.4, PR #82) is the proof. Read
  [src/lib/firestore-checkins.ts](../../src/lib/firestore-checkins.ts): every
  call (`addDoc`, `getDocs`, `query`, `collection`, `where`) is imported
  directly from the `firebase/firestore` client SDK and runs in the browser.
  There is no Cloud Function, no API route, no server the static export would
  need to host. It is a frontend integration against an already-provisioned
  BaaS, exactly like calling any other browser-side SDK.
- Journal sync would be the same shape: a new
  `src/lib/firestore-journal.ts` calling the same client SDK against a new
  `users/{uid}/journal/{entryId}` path, wired through a resolution adapter
  identical in structure to
  [src/lib/checkin-store.ts](../../src/lib/checkin-store.ts)'s
  `resolveCheckinBackend` / `createCheckinStore`.
- No new paid-account decision, no new billing surface, no webhook receiver.
  The only console action involved (publishing an updated ruleset) is the
  same *kind* of USER-ONLY step v0.4 already needed and already normalized
  ("agent ships code and docs, user publishes rules and confirms quotas").

## 3. Technical plan

Mirrors the v0.4 pattern (`checkin-store.ts` / `firestore-checkins.ts`) with
the journal's existing local store
([src/lib/journal.ts](../../src/lib/journal.ts)) as the local half:

- Add `src/lib/firestore-journal.ts`: `addFirestoreJournalEntry` (upsert by
  date key, matching `saveJournalEntry`'s one-entry-per-day contract) and
  `listFirestoreJournalEntries`, both client-SDK-only against
  `users/{uid}/journal/{entryId}` (or an `addDoc`/deterministic-id equivalent
  that still enforces one document per date).
- Add a resolution adapter (either a new `journal-store.ts` or resolution
  functions added to `journal.ts`) with the same three-state shape as
  `CheckinStoreAdapter`: `"local" | "firestore" | "firestore-fallback"`, safe
  fallback to localStorage on any Firestore error, and an explicit `local`
  override that always wins.
- **Default:** reuse the existing `NEXT_PUBLIC_CHECKIN_BACKEND` resolution
  policy (Firebase configured AND signed in => firestore) rather than adding a
  new `NEXT_PUBLIC_JOURNAL_BACKEND` variable. One resolution policy is one
  less config surface to keep consistent, and there is no product reason for
  check-ins and journal entries to sync on different conditions.
  **Overridable:** if the user wants journal sync to be independently
  toggleable, a separate variable is a small addition on top of this plan.
- Update [docs/FIRESTORE_RULES.md](../FIRESTORE_RULES.md) with a
  `users/{uid}/journal/{entryId}` match block: owner-only, using the same
  `isOwner(uid)` helper already in the documented ruleset. Decide read/create
  as owner-only (matches check-ins) and update as owner-only too, since unlike
  check-ins the journal is edit-in-place by product design (v0.7); deletion
  stays denied (no delete flow exists client-side).
- **Explicitly out of scope for v0.9** (keeps this a 1-PR milestone, matching
  the "one or two small PRs" sizing convention): guest-to-signed-in-user
  migration of existing localStorage journal entries. Check-ins got a
  migration path because that was already-shipped infrastructure being
  reused; journal migration is new work and is called out here as a named
  follow-up rather than silently dropped.

## 4. Why shipping code before the console rules-publish is safe

Firestore denies any path with no matching rule (deny-by-default, documented
in `FIRESTORE_RULES.md`). Until the user publishes the updated ruleset in the
console, a signed-in, Firebase-configured user's journal writes hit the
*currently live* rules, which have no `journal` match block, so every write is
denied and throws. The adapter's fallback-on-error path (same as check-ins)
catches that and writes to localStorage instead: no data loss, no visible
breakage, behavior identical to today until the user publishes the rules. This
is the same safety property that let v0.4 ship code ahead of its own
console-billing confirmation.

## 5. Done-when (checkable)

- [ ] `src/lib/firestore-journal.ts` exists, imports only from
      `firebase/firestore` (no server/API route), and only touches
      `users/{uid}/journal/*`.
- [ ] The journal store exposes a backend resolution adapter with
      `local` / `firestore` / `firestore-fallback` semantics, unit-tested the
      same way as `src/lib/__tests__/checkin-store.test.ts` (mocked
      `firebase/firestore`, mocked local store, asserting: unconfigured or
      signed-out stays local; configured and signed-in resolves firestore; a
      thrown Firestore error falls back to local; explicit `local` override
      always wins regardless of config).
- [ ] `docs/FIRESTORE_RULES.md` documents the `users/{uid}/journal/{entryId}`
      ruleset, consistent with the existing deny-by-default posture.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` are
      green in CI on the implementation PR (the same required quality-gate
      check PR #86 consolidated).
- [ ] `package.json` is bumped to `0.9.0` **in the implementation PR**, not in
      this proposal PR: this document only defines the milestone, and a
      version bump before code ships would misstate what is actually live.
- [ ] USER-ONLY, does not block merge (see section 4 for why it's safe to
      trail): publish the updated ruleset in the Firebase console. Until then
      journal entries keep behaving exactly as they do today.

## 6. Disposition of the old v0.9 (paid-value expansion)

Not deleted: it is real future direction once entitlement automation ships,
and it already lives correctly in
[docs/ROADMAP.md "Later / candidates"](../ROADMAP.md#later--candidates-unscheduled)
as "deferred until entitlement automation ships." The only change is removing
its stale claim to the "v0.9" slot in the backlog, since that number now
belongs to journal sync. **Overridable default:** if the user judges paid-value
scoping work valuable even while entitlement stays deprioritized (for example,
just enumerating candidate features without committing to build order), that
is a redirect this document does not preclude.
