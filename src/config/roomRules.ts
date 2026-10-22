// The choices a private room's host has, with the words each is shown in.
//
// One list for the two places that show them: the rules as a room is opened
// (`SettingsList`), and the answer to a tap on the multiplayer padlock on
// `/membership` (`TappedMultiplayer`), which says what a host gets to set. The
// server's `configure` is still the rule; `tests/roomRules.test.ts` holds
// every value here to it, so the page cannot offer a choice the server refuses.

import {
  type BlindSpeed,
  type LeavingRule,
  ROOM_SEATS,
  type RoomSettings,
} from '@/lib/multiplayer/room'
import {
  ENDING_HANDS,
  MOVE_HOURS,
  SLOW_SEATS,
  type MoveHours,
  type SlowEnding,
} from '@/lib/multiplayer/slow'

type Options<T> = readonly (readonly [T, string])[]

export const SEAT_CHOICES: Options<number> = ROOM_SEATS.map((n) => [n, String(n)] as const)

export const DEPTH_CHOICES: Options<RoomSettings['depth']> = [
  [1, 'Standard'],
  [2, 'Deep'],
  [3, 'Very deep'],
]

export const BLIND_CHOICES: Options<BlindSpeed> = [
  ['slow', 'Slow'],
  ['normal', 'Normal'],
  ['turbo', 'Turbo'],
  ['flat', 'Fixed'],
]

export const TURN_CHOICES: Options<RoomSettings['turnSeconds']> = [
  [15, '15s'],
  [30, '30s'],
  [60, '60s'],
]

export const LEAVING_CHOICES: Options<LeavingRule> = [
  ['keep-seat', 'Keep their seat'],
  ['out', 'They’re out'],
]

// --- slow games ---------------------------------------------------------------

export const SLOW_SEAT_CHOICES: Options<number> = SLOW_SEATS.map((n) => [n, String(n)] as const)

export const MOVE_CHOICES: Options<MoveHours> = MOVE_HOURS.map((h) => [h, `${h}h`] as const)

export type EndingKind = SlowEnding['kind']

export const ENDING_CHOICES: Options<EndingKind> = [
  ['last-standing', 'Last standing'],
  ['hands', 'After hands'],
  ['date', 'On a date'],
]

export const ENDING_HAND_CHOICES: Options<(typeof ENDING_HANDS)[number]> = ENDING_HANDS.map(
  (n) => [n, String(n)] as const,
)

export type Pace = 'live' | 'slow'

export const PACE_CHOICES: Options<Pace> = [
  ['live', 'Live'],
  ['slow', 'Slow'],
]
