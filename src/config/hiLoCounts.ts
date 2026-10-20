// How often a low is possible in Omaha Hi-Lo, for /blog/omaha-hi-lo-how-often-a-low.
//
// Counts rather than percentages, for the reason handFrequencies.ts gives. The
// exact rows are recomputed by tests/hiLoCounts.test.ts, which counts by rank
// (only whether a card is A-8, and which of those it is, decides a low) and
// checks that shortcut against `bestLow` on dealt hands. The table rows are a
// sample: two minutes for a million deals is too long for the suite.

/** Every five-card board: C(52,5). */
export const BOARDS = 2_598_960

/** Boards with three different ranks eight or lower. Nobody makes a low on the rest. */
export const LOW_BOARDS = 1_561_728

/** One four-card hand and a board, dealt from one deck: C(52,5) x C(47,4). */
export const ONE_HAND_DEALS = 463_563_500_400

/** ...of which the hand makes a qualifying low. */
export const ONE_HAND_LOWS = 161_374_983_168

/** The deals above whose board has three different low ranks. */
export const ONE_HAND_LOW_BOARD_DEALS = 278_557_614_720

/** Deals where the hand holds at least one ace and at least one deuce. */
export const ACE_DEUCE_DEALS = 29_650_256_064

/** ...of which it makes a low. */
export const ACE_DEUCE_LOWS = 13_947_611_904

/** A sample of a million deals, six hands each, everybody to the river. */
export const TABLE_SAMPLE = {
  deals: 1_000_000,
  seed: 20261020,
  /** Deals where at least one of the first n hands makes a low, n = 1 to 6. */
  someoneLow: [348_021, 495_914, 559_220, 585_243, 595_470, 599_126],
} as const

/** Ace-deuce with a deuce on the board: no low, though the board allows one. */
export const COUNTERFEIT = {
  hole: ['As', '2s', 'Kd', 'Kc'],
  board: ['2h', '5d', '7c', 'Jh', 'Qs'],
} as const

/** The same hand when that deuce is a three instead. */
export const NOT_COUNTERFEIT = {
  hole: ['As', '2s', 'Kd', 'Kc'],
  board: ['3h', '5d', '7c', 'Jh', 'Qs'],
} as const
