import { readFileSync } from 'node:fs'
import test from 'ava'
import {
  BLIND_CHOICES,
  DEPTH_CHOICES,
  LEAVING_CHOICES,
  SEAT_CHOICES,
  TURN_CHOICES,
} from '@/config/roomRules'
import { VENUES } from '@/config/venues'
import { configure, createRoom, MAX_ROOM_SEATS, type RoomSettings } from '@/lib/multiplayer/room'

// The choices a host is offered, as a room is opened and on `/membership?for=multiplayer`.
// The server's `configure` is the rule, so every choice the page lists must be one it
// accepts, and every seat count it accepts must be listed. If either drifts, the
// membership page promises a room the server will not open.
//
// What this cannot cover: how the pills wrap on a phone. That needs somebody to open
// the page.

const room = () =>
  createRoom({
    code: 'ABCDEF',
    kind: 'private',
    venue: VENUES[1],
    host: {
      userId: 'host',
      name: 'Host',
      avatar: { seed: 'h', backgroundColor: 'b6e3f4' },
      ring: null,
    },
    now: 0,
  })

const accepts = (patch: Partial<RoomSettings>) => configure(room(), 'host', patch).ok

const values = <T>(options: readonly (readonly [T, string])[]) => options.map(([v]) => v)

test('the server accepts every choice the host is shown', (t) => {
  for (const seats of values(SEAT_CHOICES)) t.true(accepts({ seats }), `seats ${seats}`)
  for (const depth of values(DEPTH_CHOICES)) t.true(accepts({ depth }), `depth ${depth}`)
  for (const blinds of values(BLIND_CHOICES)) t.true(accepts({ blinds }), `blinds ${blinds}`)
  for (const turnSeconds of values(TURN_CHOICES))
    t.true(accepts({ turnSeconds }), `turn ${turnSeconds}`)
  for (const leaving of values(LEAVING_CHOICES)) t.true(accepts({ leaving }), `leaving ${leaving}`)
  t.true(accepts({ forRoll: true }))
  t.true(accepts({ forRoll: false }))
})

test('every seat count the server opens is on the list, and no other', (t) => {
  const opened = Array.from({ length: MAX_ROOM_SEATS + 2 }, (_, n) => n).filter((seats) =>
    accepts({ seats }),
  )
  t.deepEqual(values(SEAT_CHOICES), opened)
})

test('a multiplayer tap on the membership page lists the rules', (t) => {
  const tapped = readFileSync('src/components/membership/TappedFor.tsx', 'utf8')
  t.regex(tapped, /feature\.id === 'multiplayer' && <TappedMultiplayer \/>/)
  const sample = readFileSync('src/components/membership/TappedMultiplayer.tsx', 'utf8')
  for (const list of [
    'SEAT_CHOICES',
    'DEPTH_CHOICES',
    'BLIND_CHOICES',
    'TURN_CHOICES',
    'LEAVING_CHOICES',
  ]) {
    t.regex(sample, new RegExp(`label\\(${list}\\)`))
  }
})
