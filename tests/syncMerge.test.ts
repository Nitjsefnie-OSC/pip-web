// The sync merge policy. These rules decide what happens to a player's chips
// when two devices disagree, so they get tested properly: there is no store
// test infrastructure in this repo, which is exactly why the merge lives in
// pure functions rather than in the sync store.

import test from 'ava'
import { hasDivergence, mergeProfiles, summarise, type ProfileData } from '../src/lib/sync/merge'
import { emptySeatStats } from '../src/lib/reads'

function profile(over: Partial<ProfileData> = {}): ProfileData {
  return {
    created: true,
    name: 'Player',
    avatar: null,
    roll: 1_000,
    peakRoll: 1_000,
    stats: {
      handsPlayed: 0,
      handsWon: 0,
      biggestPot: 0,
      showdownsWon: 0,
      tournamentsEntered: 0,
      tournamentsWon: 0,
    },
    rollHistory: [],
    venueRecords: {},
    tendencies: emptySeatStats(),
    cardBack: 'classic',
    awards: {},
    cameFromFreeroll: false,
    castRecords: {},
    tableTalk: true,
    daily: null,
    owned: [],
    deckFace: 'classic',
    tableFinish: null,
    ...over,
  } as ProfileData
}

// --- the contested fields --------------------------------------------------

test('merge › roll follows the chosen side and is never summed', (t) => {
  const local = profile({ roll: 900 })
  const remote = profile({ roll: 4_200 })

  t.is(mergeProfiles(local, remote, 'local').roll, 900)
  t.is(mergeProfiles(local, remote, 'remote').roll, 4_200)
})

test('merge › picking the smaller Roll is allowed (no silent max)', (t) => {
  // The whole point of asking: max() would reward keeping a losing session
  // unsynced, so "keep this device's" has to be able to lose chips.
  const local = profile({ roll: 50 })
  const remote = profile({ roll: 10_000 })
  t.is(mergeProfiles(local, remote, 'local').roll, 50)
})

test('merge › lifetime stats follow the same side as the roll', (t) => {
  const local = profile({ roll: 900, stats: { ...profile().stats, handsPlayed: 40 } })
  const remote = profile({ roll: 4_200, stats: { ...profile().stats, handsPlayed: 300 } })

  const kept = mergeProfiles(local, remote, 'local')
  t.is(kept.roll, 900)
  t.is(kept.stats.handsPlayed, 40, 'stats stay coherent with the Roll rather than being maxed')
})

// --- the additive fields, which must merge whichever side wins -------------

test('merge › peak Roll is monotonic regardless of side', (t) => {
  const local = profile({ peakRoll: 5_000 })
  const remote = profile({ peakRoll: 12_000 })
  t.is(mergeProfiles(local, remote, 'local').peakRoll, 12_000)
  t.is(mergeProfiles(local, remote, 'remote').peakRoll, 12_000)
})

test('merge › awards union, keeping the earliest time earned', (t) => {
  const local = profile({ awards: { rounder: 500, grinder: 900 } })
  const remote = profile({ awards: { rounder: 100, nightowl: 700 } })

  const merged = mergeProfiles(local, remote, 'local').awards
  t.deepEqual(merged, { rounder: 100, grinder: 900, nightowl: 700 })
})

test('merge › purchases union so nobody loses a bought item', (t) => {
  const local = profile({ owned: ['ocean', 'face-fourcolor'] })
  const remote = profile({ owned: ['ocean', 'felt-emerald'] })

  const merged = mergeProfiles(local, remote, 'remote').owned
  t.deepEqual([...merged].sort(), ['face-fourcolor', 'felt-emerald', 'ocean'])
})

test('merge › roll history unions by timestamp, sorted, and caps at 300', (t) => {
  const local = profile({
    rollHistory: [
      { t: 3, roll: 30 },
      { t: 1, roll: 10 },
    ],
  })
  const remote = profile({
    rollHistory: [
      { t: 2, roll: 20 },
      { t: 3, roll: 30 },
    ],
  })

  const merged = mergeProfiles(local, remote, 'local').rollHistory
  t.deepEqual(merged, [
    { t: 1, roll: 10 },
    { t: 2, roll: 20 },
    { t: 3, roll: 30 },
  ])

  const big = profile({ rollHistory: Array.from({ length: 400 }, (_, i) => ({ t: i, roll: i })) })
  t.is(mergeProfiles(big, profile(), 'local').rollHistory.length, 300)
})

test('merge › venue records take the best of each side', (t) => {
  const local = profile({
    venueRecords: { garage: { entered: 10, won: 2, bestFinish: 2, fastestWinHands: 40 } },
  })
  const remote = profile({
    venueRecords: {
      garage: { entered: 6, won: 4, bestFinish: 1, fastestWinHands: 55 },
      pub: { entered: 3, won: 0, bestFinish: 3, fastestWinHands: null },
    },
  })

  const merged = mergeProfiles(local, remote, 'local').venueRecords
  t.deepEqual(merged.garage, { entered: 10, won: 4, bestFinish: 1, fastestWinHands: 40 })
  t.deepEqual(merged.pub, remote.venueRecords.pub, 'a venue only one side knows survives')
})

test('merge › cast records keep the higher knockout count', (t) => {
  const local = profile({ castRecords: { sable: { stats: emptySeatStats(), kos: 5 } } })
  const remote = profile({ castRecords: { sable: { stats: emptySeatStats(), kos: 2 } } })
  t.is(mergeProfiles(local, remote, 'remote').castRecords.sable.kos, 5)
})

test('merge › a created profile on either side wins', (t) => {
  const fresh = profile({ created: false })
  const played = profile({ created: true })
  t.true(mergeProfiles(fresh, played, 'local').created)
})

// --- the Daily, where merging wrong would hand out a re-roll ---------------

test('merge › the Daily keeps the later day', (t) => {
  const older = profile({ daily: { date: '2026-07-30', dayNo: 10, place: 1, hands: 20 } })
  const newer = profile({ daily: { date: '2026-07-31', dayNo: 11, place: null, hands: 4 } })
  t.is(mergeProfiles(older, newer, 'local').daily?.date, '2026-07-31')
})

test('merge › same day: played beats abandoned, so syncing is not a re-roll', (t) => {
  const abandoned = profile({ daily: { date: '2026-07-31', dayNo: 11, place: null, hands: 3 } })
  const finished = profile({ daily: { date: '2026-07-31', dayNo: 11, place: 2, hands: 31 } })

  t.is(mergeProfiles(abandoned, finished, 'local').daily?.place, 2)
  t.is(mergeProfiles(finished, abandoned, 'local').daily?.place, 2)
})

// --- when to bother the player --------------------------------------------

test('divergence › identical progress never prompts', (t) => {
  t.false(hasDivergence(profile(), profile()))
})

test('divergence › a different Roll prompts', (t) => {
  t.true(hasDivergence(profile({ roll: 900 }), profile({ roll: 4_200 })))
})

test('divergence › cosmetics alone never prompt', (t) => {
  const a = profile({ cardBack: 'ocean', name: 'Al', deckFace: 'face-fourcolor' })
  const b = profile({ cardBack: 'midnight', name: 'Bea', deckFace: 'classic' })
  t.false(hasDivergence(a, b), 'changing a card back on the bus must not raise a dialog')
})

test('divergence › hands played apart prompts even at the same Roll', (t) => {
  // Same Roll by coincidence, but one device played a session. Taking either
  // side silently would throw away real history.
  const a = profile({ stats: { ...profile().stats, handsPlayed: 10 } })
  const b = profile({ stats: { ...profile().stats, handsPlayed: 90 } })
  t.true(hasDivergence(a, b))
})

test('summarise › gives the dialog the two numbers it shows', (t) => {
  const p = profile({ roll: 4_200, stats: { ...profile().stats, handsPlayed: 312 } })
  t.deepEqual(summarise(p), { roll: 4_200, handsPlayed: 312 })
})

// --- the safety property that matters most --------------------------------

test('merge › a player never loses an award or a purchase, whichever side wins', (t) => {
  const local = profile({ awards: { a: 1 }, owned: ['x'], peakRoll: 9_000 })
  const remote = profile({ awards: { b: 2 }, owned: ['y'], peakRoll: 3_000 })

  for (const side of ['local', 'remote'] as const) {
    const merged = mergeProfiles(local, remote, side)
    t.deepEqual(Object.keys(merged.awards).sort(), ['a', 'b'], `awards survive on ${side}`)
    t.deepEqual([...merged.owned].sort(), ['x', 'y'], `purchases survive on ${side}`)
    t.is(merged.peakRoll, 9_000, `peak Roll survives on ${side}`)
  }
})
