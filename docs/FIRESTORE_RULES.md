# Firestore Security Rules for Focus (Calm Daily Coach)

Status: rules documented for the v0.4 sync-by-default flip (2026-07-19).

> USER-ONLY: an agent cannot and must not deploy these rules. Publishing rules
> happens in the Firebase console (paid-account/console action):
> Firebase console -> Firestore Database -> Rules -> paste the ruleset below ->
> Publish. Until the user publishes them, whatever rules are currently live in
> the console apply, not this file.
>
> Related USER-ONLY step from docs/ROADMAP.md: confirm Firebase project quotas
> and billing before the v0.4 default flip goes live.

## What the client actually does

The static app touches exactly two paths, both keyed by the signed-in user's
Firebase Auth uid:

- `users/{uid}`: account document written by `upsertUserAccount` in
  [src/lib/firestore-user.ts](../src/lib/firestore-user.ts) (fields: `uid`,
  `email`, `displayName`, `createdAt`, `subscriptionStatus`) and read for the
  trial/membership panel.
- `users/{uid}/checkins/{checkinId}`: check-in documents created by
  `addFirestoreCheckin` and range-read by `getFirestoreWeeklySummary` in
  [src/lib/firestore-checkins.ts](../src/lib/firestore-checkins.ts) (fields:
  `date`, `focus`, `dose`, `minutes`, `status`, optional `skipReason`,
  `createdAt`). The app never updates or deletes a check-in.

Everything else should be denied.

## Recommended ruleset (deny by default, per-uid isolation)

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read: if isOwner(uid);

      // A user may create their own account doc, but only in the free trial
      // state; entitlement cannot be self-granted from the client.
      allow create: if isOwner(uid)
        && request.resource.data.get("subscriptionStatus", "free_trial") == "free_trial";

      // Profile fields may change, but subscriptionStatus must stay whatever
      // it already is. Console/Admin writes bypass rules, so the manual
      // entitlement flip described in the roadmap keeps working.
      allow update: if isOwner(uid)
        && request.resource.data.get("subscriptionStatus", "free_trial")
           == resource.data.get("subscriptionStatus", "free_trial");

      allow delete: if false;

      match /checkins/{checkinId} {
        // Owner-only, append-only: the app creates and reads check-ins but
        // never edits or deletes them.
        allow read, create: if isOwner(uid);
        allow update, delete: if false;
      }
    }

    // No other match blocks: every other path is denied by default.
  }
}
```

## Why these choices

- Deny by default: Firestore denies any path no rule matches, and this ruleset
  adds no catch-all allows. Only `users/{uid}` and its `checkins` subcollection
  are reachable, and only by that uid.
- Per-uid isolation: `request.auth.uid == uid` means signed-in users can only
  ever see and write their own data. Guests (no auth) get nothing; the app
  keeps them on local storage anyway per the resolution matrix in
  [src/lib/checkin-store.ts](../src/lib/checkin-store.ts).
- Append-only check-ins: the client has no edit/delete flows, so the rules do
  not grant them. This also limits blast radius if a session token leaks.
- `subscriptionStatus` pinning: `Map.get("subscriptionStatus", "free_trial")`
  tolerates older account docs that predate the field while still preventing a
  client from flipping itself to `active`. Real entitlement flips stay a
  console/Admin action (USER-ONLY), which bypasses rules by design.

## Verifying after publish

1. In the console Rules Playground: simulate `get` and `create` on
   `users/UID_A/checkins/any` as `UID_A` (allow) and as `UID_B` (deny).
2. Simulate `update` on `users/UID_A` changing `subscriptionStatus` from
   `free_trial` to `active` as `UID_A` (deny).
3. In the app, sign in on the deployed site: the header badge should read
   `CLOUD SYNCED`, and a submitted check-in should appear under
   `users/{uid}/checkins` in the console Data tab.
4. Rollback lever if anything misbehaves: set the repository variable
   `NEXT_PUBLIC_CHECKIN_BACKEND` to `local` and re-run the Pages deploy; the
   app returns to local-only persistence without a code change.
