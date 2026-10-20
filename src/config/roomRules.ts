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
