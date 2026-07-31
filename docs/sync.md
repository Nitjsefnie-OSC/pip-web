# Sync (optional accounts)

Pip is a local-first app. Your profile lives in `localStorage` and nothing leaves the device.
**Sync is an optional account on top of that**, and its only job is carrying your progress to a
second device.

This document is the why. The code is `src/lib/sync/*`, `src/store/sync.ts` and
`supabase/schema.sql`.

## The rules the build keeps

1. **Opt-in is absolute.** No account means no client, no request, no identity and no stored row.
   Not "we don't track you much", literally no network call. That is what makes the privacy claim
   checkable rather than promised.
2. **Signed out is a first-class state, permanently.** No banner, no interstitial, no "sync your
   progress!" anywhere. One quiet section in Settings.
3. **Sync never blocks play.** Every push is fire-and-forget. A failure marks the profile dirty
   and retries on reconnect, on the next change, or on the next app open. A dropped connection
   must never cost a hand.
4. **Never silently destroy progress.** Additive fields always merge in the player's favour. The
   one case that can't merge asks.
5. **Free forever, and never sold.** Sync shipped free, so it stays free.

## What is stored

One row per user in `public.profiles`: the persisted profile's `state` blob, the
`PERSIST_VERSION` that wrote it, a timestamp, and a `device_id` for the conflict prompt. Plus the
email address, which Supabase Auth holds.

That is everything. The `state` blob is the same object already sitting in `localStorage`, so
sync stores nothing the device didn't already have.

**RLS is the entire security model.** The publishable key ships in the client bundle and this repo
is public, so anyone can call the API as an anonymous user. The one policy in
`supabase/schema.sql` is what stops them reading somebody else's row. Treat any change to that
file as security-sensitive.

## Versioning

A row can have been written by an older client on another device that hasn't updated yet. So the
reader runs `migrateProfile()` (the same chain zustand's persist uses) over the row's `state`
before anything merges it, and **refuses a row from a newer version than it understands** rather
than guessing. That mirrors what the backup-restore path already does with a pasted code.

## The merge policy

Two devices both played offline. The phone says Roll 4,200, the laptop says 900. **There is no
correct answer here, only a chosen one, and it has to be a rule a player can predict.**

Field by field:

| Field | Rule |
|---|---|
| `peakRoll` | `max()` — monotonic, always safe |
| `awards` | union, keeping the earliest time earned |
| `owned` | union |
| `rollHistory` | union by timestamp, sorted, capped at 300 |
| `venueRecords`, `castRecords` | per key, the better of the two |
| `created` | either side saying yes wins |
| cosmetics (`name`, `avatar`, `cardBack`, `deckFace`, `tableFinish`, `tableTalk`) | chosen side |
| `daily` | later day; same day, a played run beats an abandoned one |
| **`roll`, `stats`, `tendencies`** | **the side the player picks** |

**Why `roll` can't merge.** Adding invents chips. `max()` rewards keeping a losing session
unsynced. Latest-write-wins silently destroys a good night. All three are worse than asking.

**Why `stats` follows `roll` rather than being maxed.** The counters are cumulative, so `max()`
loses the smaller device's hands and summing double-counts everything before the split. Both are
wrong; at least following the same side as the Roll leaves a profile that is internally coherent.
Doing this properly needs a per-device ancestor snapshot for a real three-way merge, which is a
much bigger build for a single-player game where one device is almost always the active one. If
players complain, that is the upgrade path.

## When the player actually gets asked

Only when all three are true:

1. The remote row moved since this device last saw it, **and** a different device wrote it.
2. This device has local changes waiting to go up.
3. The two sides disagree about the Roll or about hands played.

Change your card back on the bus and nothing prompts. Play a session on each of two devices and
it does. If only one side moved, the merge is silent because there is nothing to lose.

## Bundle cost

`@supabase/supabase-js` is **imported dynamically**, not statically. Importing it normally put
~54 KB (brotli) into the shared chunk that every page loads, including the marketing landing page
where it can never be used. It is now a lazy chunk fetched only when someone has a session or
opens the sign-in form. **Keep it that way** — `getSupabase()` returns a promise for this reason
and for no other.

## Running without a backend

Leave `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` empty and sync does not
exist: no client, no Account section in Settings, and the app is exactly the local-first app it
was. **A contributor never needs to set up a backend to run Pip.**

## Known limits

- **Email confirmation is off** for v1. Less signup friction and one less delivery failure mode,
  at the cost of a typo'd email being unrecoverable. The mitigation already exists: the transfer
  code and QR still work, so nobody's profile is ever trapped behind an account.
- **Supabase's free tier pauses a project after inactivity.** Fine now. Needs a real answer before
  this is a feature people rely on.
- **The Data safety declaration on any app-store listing has to match this page.** Pip collecting
  nothing was true before sync and isn't any more. If a store listing exists, updating it ships in
  the same week, not whenever someone remembers.
