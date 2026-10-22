import test from 'ava'
import { VENUES } from '@/config/venues'
import { mulberry32 } from '@/lib/poker/cards'
import { legalActions, type Action } from '@/lib/poker/engine'
import {
  act,
  addBots,
  configure,
  createRoom,
  disconnect,
  join,
  markSeen,
  setPre,
  start,
  tick,
  PRE_MS,
  SLOW_HISTORY,
  type Joiner,
  type Result,
  type RoomState,
} from '@/lib/multiplayer/room'
import { viewFor } from '@/lib/multiplayer/view'
import { parseClientMessage } from '@/lib/multiplayer/protocol'
import { settle } from '@/lib/multiplayer/ledger'
import { inQuiet, placesByChips, slowDeadline, type Quiet } from '@/lib/multiplayer/slow'

const H = 60 * 60 * 1000
const M = 60 * 1000
const london: Quiet = { from: 23 * 60, to: 8 * 60, tz: 'Europe/London' }

// --- the clock --------------------------------------------------------------

test('without quiet hours the clock is the clock', (t) => {
  t.is(slowDeadline(1000, 4 * H, undefined), 1000 + 4 * H)
  t.is(slowDeadline(1000, 4 * H, { from: 600, to: 600, tz: 'Europe/London' }), 1000 + 4 * H)
  t.is(slowDeadline(1000, 4 * H, { from: 0, to: 60, tz: 'Not/AZone' }), 1000 + 4 * H)
})

test('a turn that runs into quiet hours stops for them', (t) => {
  // 22:00 BST on a summer evening; a four-hour clock has an hour before 23:00
  // and three after 08:00.
  const from = Date.parse('2026-07-01T21:00:00Z')
  t.is(slowDeadline(from, 4 * H, london), Date.parse('2026-07-02T10:00:00Z'))
})

test('a turn that begins in quiet hours starts counting when they end', (t) => {
  const from = Date.parse('2026-07-02T01:00:00Z') // 02:00 BST
  t.is(slowDeadline(from, 1 * H, london), Date.parse('2026-07-02T08:00:00Z')) // 09:00 BST
})

test('a day-long clock counts only waking hours', (t) => {
  const from = Date.parse('2026-07-01T07:00:00Z') // 08:00 BST: 15 hours to 23:00
  // 15 hours today, 9 more from 08:00 tomorrow: 17:00 BST.
  t.is(slowDeadline(from, 24 * H, london), Date.parse('2026-07-02T16:00:00Z'))
})

test('the clocks going forward do not cost a player an hour', (t) => {
  // 28 March 2026, 22:30 GMT. The clocks go forward at 01:00 on the 29th.
  const from = Date.parse('2026-03-28T22:30:00Z')
  // 30 minutes to 23:00, quiet until 08:00 BST (07:00Z), 30 minutes more.
  t.is(slowDeadline(from, 1 * H, london), Date.parse('2026-03-29T07:30:00Z'))
})

test('nor going back give them one', (t) => {
  // 24 October 2026, 22:30 BST. The clocks go back at 02:00 on the 25th.
  const from = Date.parse('2026-10-24T21:30:00Z')
  // 30 minutes to 23:00 BST (22:00Z), quiet until 08:00 GMT (08:00Z), 30 more.
  t.is(slowDeadline(from, 1 * H, london), Date.parse('2026-10-25T08:30:00Z'))
})

test('quiet hours inside a day, and in another timezone', (t) => {
  const lunch: Quiet = { from: 12 * 60, to: 14 * 60, tz: 'America/New_York' }
  const from = Date.parse('2026-07-01T15:00:00Z') // 11:00 EDT
  t.is(slowDeadline(from, 2 * H, lunch), Date.parse('2026-07-01T19:00:00Z')) // 15:00 EDT
  t.true(inQuiet(Date.parse('2026-07-01T16:30:00Z'), lunch))
  t.false(inQuiet(Date.parse('2026-07-01T18:00:00Z'), lunch))
})

test('in quiet hours across midnight', (t) => {
  t.true(inQuiet(Date.parse('2026-07-01T22:30:00Z'), london)) // 23:30 BST
  t.true(inQuiet(Date.parse('2026-07-02T06:59:00Z'), london)) // 07:59 BST
  t.false(inQuiet(Date.parse('2026-07-02T07:00:00Z'), london)) // 08:00 BST
  t.false(inQuiet(Date.parse('2026-07-01T21:59:00Z'), london))
})

test('the deadline is never earlier than the clock alone, and lands outside quiet hours', (t) => {
  const rng = mulberry32(7)
  for (let i = 0; i < 300; i++) {
    const from = Date.parse('2026-01-01T00:00:00Z') + Math.floor(rng() * 365 * 24 * 60) * M
    const move = [1, 4, 12, 24][Math.floor(rng() * 4)] * H
    const due = slowDeadline(from, move, london)
    t.true(due >= from + move)
    t.false(inQuiet(due - 1, london), new Date(from).toISOString())
  }
})

test('places on the chips share a place when level', (t) => {
  const places = placesByChips([
    { id: 'a', stack: 500, place: null },
    { id: 'b', stack: 900, place: null },
    { id: 'c', stack: 500, place: null },
    { id: 'd', stack: 0, place: 4 },
  ])
  t.deepEqual([...places.entries()].sort(), [
    ['a', 2],
    ['b', 1],
    ['c', 2],
  ])
})

// --- the room ---------------------------------------------------------------

const venue = VENUES[1]
const person = (n: number, quiet?: Quiet): Joiner => ({
  userId: `user-${n}`,
  name: `Player ${n}`,
  avatar: { seed: `s${n}`, backgroundColor: 'b6e3f4' },
  ring: null,
  ...(quiet ? { quiet } : {}),
})
const must = (r: Result): RoomState => {
  if (!r.ok) throw new Error(r.error)
  return r.state
}

function slowRoom(now = 0, quiet?: Quiet): RoomState {
  const s = createRoom({ code: 'SLOWGM', kind: 'slow', venue, host: person(0, quiet), now })
  return must(join(s, person(1, quiet), now))
}

/** Whoever is to act, by account. */
const toActUser = (s: RoomState): string => {
  const id = s.hand!.players[s.hand!.toActIndex].id
  return s.players.find((p) => p.id === id)!.userId!
}

/** Everyone calls or checks, hands dealt as they come, until the game ends or `hands` are played. */
function playHands(s: RoomState, hands: number, now: number, rng: () => number): RoomState {
  for (let i = 0; i < 5000 && s.phase === 'playing' && s.handIndex <= hands; i++) {
    if (s.dueKind === 'next-hand' || s.dueKind === 'pre') {
      now = s.dueAt!
      s = tick(s, now, rng)
      continue
    }
    const legal = legalActions(s.hand!)!
    const action: Action = legal.canCheck ? { type: 'check' } : { type: 'call' }
    s = must(act(s, toActUser(s), action, now))
  }
  return s
}

test('a slow room is heads-up with a 12-hour clock and plays to the last one standing', (t) => {
  const s = createRoom({ code: 'SLOWGM', kind: 'slow', venue, host: person(0), now: 0 })
  t.is(s.maxSeats, 2)
  t.is(s.settings.moveHours, 12)
  t.deepEqual(s.settings.ending, { kind: 'last-standing' })
  t.is(s.dueKind, 'expire')
  t.is(s.dueAt, 3 * 24 * H)
})

test('a slow room takes two to four seats, slow clocks and endings, and no bots', (t) => {
  const s = slowRoom()
  t.true(configure(s, 'user-0', { seats: 4, moveHours: 1 }).ok)
  t.false(configure(s, 'user-0', { seats: 6 }).ok)
  t.false(configure(s, 'user-0', { moveHours: 3 as never }).ok)
  t.true(configure(s, 'user-0', { ending: { kind: 'hands', hands: 50 } }).ok)
  t.false(configure(s, 'user-0', { ending: { kind: 'hands', hands: 7 as never } }).ok)
  t.false(configure(s, 'user-1', { seats: 3 }).ok)
  t.false(addBots(s, 'user-0', 1, mulberry32(1)).ok)
  // A live room keeps its own rules.
  const live = createRoom({ code: 'LIVEGM', kind: 'private', venue, host: person(0), now: 0 })
  t.false(configure(live, 'user-0', { moveHours: 4 }).ok)
})

test('a slow turn lasts the move clock, and skips the mover’s quiet hours', (t) => {
  const now = Date.parse('2026-07-01T21:00:00Z') // 22:00 BST
  let s = slowRoom(now, london)
  s = must(configure(s, 'user-0', { moveHours: 4 }))
  s = must(start(s, 'user-0', now, mulberry32(3)))
  t.is(s.dueKind, 'turn')
  t.is(s.dueAt, Date.parse('2026-07-02T10:00:00Z'))
  // Going offline changes nothing in a slow game.
  const off = disconnect(s, toActUser(s), now + H)
  t.is(off.dueAt, s.dueAt)
})

test('two timeouts running sit a player out until they come back', (t) => {
  const rng = mulberry32(5)
  let s = must(start(slowRoom(), 'user-0', 0, rng))
  const sleeper = toActUser(s)
  let now = 0
  // The sleeper's turns run out; the other player checks or calls.
  for (let i = 0; i < 200 && s.phase === 'playing'; i++) {
    const me = s.players.find((p) => p.userId === sleeper)!
    if (me.timeouts >= 2) break
    if (s.dueKind === 'next-hand' || toActUser(s) === sleeper) {
      now = s.dueAt!
      s = tick(s, now, rng)
    } else {
      const legal = legalActions(s.hand!)!
      s = must(act(s, toActUser(s), legal.canCheck ? { type: 'check' } : { type: 'call' }, now))
    }
  }
  // Find their next turn: it is taken for them at once.
  for (let i = 0; i < 50 && s.phase === 'playing' && toActUser(s) !== sleeper; i++) {
    if (s.dueKind === 'next-hand') {
      now = s.dueAt!
      s = tick(s, now, rng)
    } else {
      const legal = legalActions(s.hand!)!
      s = must(act(s, toActUser(s), legal.canCheck ? { type: 'check' } : { type: 'call' }, now))
    }
  }
  if (s.phase !== 'playing') return t.pass()
  t.is(s.dueKind, 'turn')
  t.true(s.dueAt! - now <= 400)
  // Opening the game puts them back on the full clock, counted from when the turn began.
  const back = must(join(s, person(Number(sleeper.slice(5))), now + 100))
  t.is(back.dueAt, (back.turnFrom ?? now) + 12 * H)
})

test('check/fold made ahead of time is made when the turn comes', (t) => {
  const rng = mulberry32(9)
  let s = must(start(slowRoom(), 'user-0', 0, rng))
  const first = toActUser(s)
  const other = first === 'user-0' ? 'user-1' : 'user-0'
  // Not your turn: you may set one. Your turn: you just act.
  t.false(setPre(s, first, { kind: 'check-fold' }).ok)
  s = must(setPre(s, other, { kind: 'check-fold' }))
  // Nobody else sees it.
  t.deepEqual(viewFor(s, other).pre?.kind, 'check-fold')
  t.is(viewFor(s, first).pre, null)
  // Heads-up preflop, the button raises; the pre-action folds.
  const legal = legalActions(s.hand!)!
  s = must(act(s, first, { type: 'raise', amount: legal.minRaiseTo }, 10))
  t.is(s.dueKind, 'pre')
  t.is(s.dueAt, 10 + PRE_MS)
  const before = s.handIndex
  s = tick(s, s.dueAt!, rng)
  // Folded: heads-up, that ends the hand.
  t.is(s.handIndex, before)
  t.is(s.dueKind, 'next-hand')
  t.is(s.players.find((p) => p.userId === other)!.pre, undefined)
})

test('a call set ahead lapses when the bet changes', (t) => {
  const rng = mulberry32(11)
  let s = slowRoom()
  s = must(configure(s, 'user-0', { seats: 3 }))
  s = must(join(s, person(2), 0))
  s = must(start(s, 'user-0', 0, rng))
  // The last to act preflop sets a call for the big blind, then somebody raises.
  const order = s.hand!.players.map((p) => s.players.find((q) => q.id === p.id)!.userId!)
  const first = toActUser(s)
  const later = order.find((u) => u !== first && u !== toActUser(s))!
  const callNow = legalActions(s.hand!)!.callAmount
  const mine = s.hand!.players.find((p) => p.id === s.players.find((q) => q.userId === later)!.id)!
  const owed = s.hand!.currentBet - mine.committedThisStreet
  if (owed <= 0) return t.pass()
  s = must(setPre(s, later, { kind: 'call', amount: owed }))
  const legal = legalActions(s.hand!)!
  s = must(act(s, first, { type: 'raise', amount: legal.minRaiseTo + callNow }, 1))
  // Whenever their turn comes, it is theirs to take: the call no longer stands.
  for (let i = 0; i < 5 && toActUser(s) !== later; i++) {
    const l = legalActions(s.hand!)!
    s = must(act(s, toActUser(s), l.canCheck ? { type: 'check' } : { type: 'call' }, 2))
  }
  if (toActUser(s) !== later) return t.pass()
  t.is(s.dueKind, 'turn')
  t.is(s.players.find((p) => p.userId === later)!.pre, undefined)
})

test('a game played to a hand count ends on the chips', (t) => {
  const rng = mulberry32(21)
  let s = slowRoom()
  s = must(configure(s, 'user-0', { ending: { kind: 'hands', hands: 20 } }))
  s = must(start(s, 'user-0', 0, rng))
  s = playHands(s, 25, 0, rng)
  t.is(s.phase, 'finished')
  if (s.players.every((p) => p.stack > 0)) t.is(s.handIndex, 20)
  t.true(s.players.some((p) => p.place === 1))
  // The result shows on Home for a week.
  t.is(s.dueKind, 'expire')
  t.true(s.dueAt! >= 7 * 24 * H && s.dueAt! < 7 * 24 * H + H)
})

test('a game played to a date finishes the hand in play, then ends', (t) => {
  const rng = mulberry32(23)
  let s = slowRoom()
  t.false(
    start(must(configure(s, 'user-0', { ending: { kind: 'date', at: 5 } })), 'user-0', 10, rng).ok,
  )
  s = must(configure(s, 'user-0', { ending: { kind: 'date', at: 10 * H } }))
  s = must(start(s, 'user-0', 0, rng))
  s = playHands(s, 3, 0, rng)
  t.is(s.phase, 'playing')
  const hand = s.handIndex
  s = playHands(s, hand, 11 * H, rng)
  t.is(s.phase, 'finished')
  t.is(s.handIndex, hand)
})

test('a slow game keeps its last hands, and each player sees only their own cards in them', (t) => {
  const rng = mulberry32(31)
  let s = slowRoom()
  s = must(start(s, 'user-0', 0, rng))
  // Fold every hand at once: no showdowns, so nobody else's cards are ever shown.
  for (let i = 0; i < 400 && s.phase === 'playing' && s.handIndex <= SLOW_HISTORY + 4; i++) {
    if (s.dueKind === 'next-hand') s = tick(s, s.dueAt!, rng)
    else s = must(act(s, toActUser(s), { type: 'fold' }, 0))
  }
  t.is(s.history!.length, SLOW_HISTORY)
  for (const user of ['user-0', 'user-1']) {
    const view = viewFor(s, user)
    for (const { hand: h } of view.history) {
      t.is(h.deck.length, 0)
      for (const p of h.players) if (p.id !== view.you) t.is(p.hole.length, 0)
    }
  }
})

test('acting marks how far you have watched, and so does saying so', (t) => {
  const rng = mulberry32(41)
  let s = must(start(slowRoom(), 'user-0', 0, rng))
  const first = toActUser(s)
  s = must(act(s, first, { type: 'call' }, 0))
  t.deepEqual(viewFor(s, first).seen, { hand: 1, actions: 1 })
  const other = first === 'user-0' ? 'user-1' : 'user-0'
  t.is(viewFor(s, other).seen, null)
  s = must(markSeen(s, other))
  t.deepEqual(viewFor(s, other).seen, { hand: 1, actions: 1 })
})

test('quiet hours show only at a slow table', (t) => {
  const s = slowRoom(0, london)
  t.deepEqual(viewFor(s, 'user-0').players[1].quiet, london)
  const live = must(
    join(
      createRoom({ code: 'LIVEGM', kind: 'private', venue, host: person(0, london), now: 0 }),
      person(1, london),
      0,
    ),
  )
  t.is(viewFor(live, 'user-0').players[1].quiet, undefined)
})

// --- the wire ---------------------------------------------------------------

test('the protocol reads pre-actions, catching up, quiet hours and slow settings', (t) => {
  t.deepEqual(parseClientMessage(JSON.stringify({ t: 'pre', pre: { kind: 'check-fold' } })), {
    t: 'pre',
    pre: { kind: 'check-fold' },
  })
  t.deepEqual(parseClientMessage(JSON.stringify({ t: 'pre', pre: null })), { t: 'pre', pre: null })
  t.deepEqual(parseClientMessage(JSON.stringify({ t: 'pre', pre: { kind: 'call', amount: 40 } })), {
    t: 'pre',
    pre: { kind: 'call', amount: 40 },
  })
  t.is(parseClientMessage(JSON.stringify({ t: 'pre', pre: { kind: 'call' } })), null)
  t.is(parseClientMessage(JSON.stringify({ t: 'pre', pre: { kind: 'raise' } })), null)
  t.deepEqual(parseClientMessage(JSON.stringify({ t: 'seen' })), { t: 'seen' })

  const hello = {
    t: 'hello',
    token: 'x',
    name: 'A',
    avatar: { seed: 'a', backgroundColor: 'ffffff' },
    ring: null,
  }
  const withQuiet = parseClientMessage(JSON.stringify({ ...hello, quiet: london }))
  t.deepEqual(withQuiet?.t === 'hello' && withQuiet.quiet, london)
  const badQuiet = parseClientMessage(
    JSON.stringify({ ...hello, quiet: { from: 2000, to: 0, tz: 'Europe/London' } }),
  )
  t.true(badQuiet?.t === 'hello' && badQuiet.quiet === undefined)

  t.deepEqual(
    parseClientMessage(
      JSON.stringify({
        t: 'configure',
        settings: { moveHours: 4, ending: { kind: 'date', at: 1_800_000_000_000 } },
      }),
    ),
    { t: 'configure', settings: { moveHours: 4, ending: { kind: 'date', at: 1_800_000_000_000 } } },
  )
  t.is(parseClientMessage(JSON.stringify({ t: 'configure', settings: { moveHours: 2 } })), null)
})

test('level stacks sharing first split the prize, and an open game’s buy-in is not forgotten', (t) => {
  const rng = mulberry32(51)
  let s = must(start(slowRoom(), 'user-0', 0, rng))
  const opened = settle({}, viewFor(s, 'user-0'), 0)
  t.is(opened.delta, -s.buyIn)
  // Seven weeks later the game is still on: no second buy-in.
  const later = settle(opened.ledger, viewFor(s, 'user-0'), 50 * 24 * H)
  t.is(later.delta, 0)
  // Finished level.
  s = {
    ...s,
    phase: 'finished',
    players: s.players.map((p) => ({ ...p, place: 1 })),
  }
  const end = settle(later.ledger, viewFor(s, 'user-0'), 50 * 24 * H)
  t.true(end.won)
  t.is(end.delta, Math.floor(s.prize / 2))
})

// --- the catch-up -------------------------------------------------------------

test('every hand of a slow game is rebuilt move by move, ending where it really did', async (t) => {
  const { rebuild, catchUpFrames } = await import('@/lib/multiplayer/catchUp')
  const rng = mulberry32(61)
  let s = slowRoom()
  s = must(start(s, 'user-0', 0, rng))
  let rebuilt = 0
  let hands = 0
  for (let i = 0; i < 3000 && s.phase === 'playing' && hands < 60; i++) {
    if (s.dueKind === 'next-hand' || s.dueKind === 'pre') {
      s = tick(s, s.dueAt!, rng)
      continue
    }
    const legal = legalActions(s.hand!)!
    // A mix of lines: some showdowns, some folds, some raises.
    const r = rng()
    const action: Action =
      r < 0.15
        ? { type: 'fold' }
        : r < 0.3 && (legal.canRaise || legal.canBet)
          ? { type: legal.canBet ? 'bet' : 'raise', amount: legal.minRaiseTo }
          : legal.canCheck
            ? { type: 'check' }
            : { type: 'call' }
    const before = s.handIndex
    s = must(act(s, toActUser(s), action, 0))
    if (s.history!.length && s.history!.at(-1)!.index === before && s.dueKind === 'next-hand') {
      hands++
      const real = s.history!.at(-1)!.hand
      for (const user of ['user-0', 'user-1']) {
        const view = viewFor(s, user)
        const frames = rebuild(view.history.at(-1)!.hand, view.you)
        t.truthy(frames, `hand ${before}`)
        if (!frames) continue
        t.is(frames.length, real.actions.length + 1)
        // Never a card you may not see, in any frame.
        for (const f of frames) {
          t.is(f.deck.length, 0)
          for (const p of f.players) {
            const shownAtEnd = view.history.at(-1)!.hand.players.find((q) => q.id === p.id)!.hole
            if (p.id !== view.you) t.deepEqual(p.hole, f.result ? shownAtEnd : [])
          }
        }
        rebuilt++
      }
    }
  }
  t.true(rebuilt > 20)
  // Somebody who has seen nothing since the deal is shown every hand kept.
  const fresh = viewFor(
    { ...s, players: s.players.map((p) => ({ ...p, seen: undefined })) },
    'user-0',
  )
  t.true(catchUpFrames(fresh).length > 10)
  // Somebody who has just acted has nothing to catch up on.
  const lastActor = s.hand!.actions.at(-1)!.playerId
  const mine = viewFor(s, s.players.find((p) => p.id === lastActor)!.userId!)
  t.is(catchUpFrames(mine).length, 0)
})
