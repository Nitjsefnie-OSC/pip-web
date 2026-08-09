// The starting-hand chart on /learn/starting-hands.
//
// The grid is 169 cells and the prose above it quotes three percentages. Both
// are derived from the three lists below rather than written out, so the chart
// and the sentence describing it cannot drift apart, which is the failure mode
// for a page like this, where a reader has no way to check either one.
//
// The bands are conventional taught beginner ranges, not solver output, and the
// page says so in its own words. What the code guarantees is consistency, not
// correctness of the strategy: tests/startingHands.test.ts checks the lists are
// disjoint, name real hands, and add up to the percentages the copy quotes.

/** Aces first, so the grid reads the way every printed chart does. */
export const CHART_RANKS = [
  'A',
  'K',
  'Q',
  'J',
  'T',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
] as const

/** The earliest seat a hand is worth opening from, when it folds round to you. */
export type Band = 'any' | 'middle' | 'late'

/** The symbol printed in the cell. Unbanded hands get nothing, and fold. */
export const BAND_SYMBOL: Record<Band, string> = {
  any: '●',
  middle: '◐',
  late: '○',
}

export const BAND_LABEL: Record<Band, string> = {
  any: 'Any position',
  middle: 'Middle onwards',
  late: 'Late only, the cutoff or the button',
}

// Written out rather than expressed as "22+" / "ATs+" shorthand. The shorthand
// is shorter to write and slower to check, and this list is the one thing on
// the page a reader is trusting us with.
const ANY_POSITION = [
  'AA',
  'KK',
  'QQ',
  'JJ',
  'TT',
  '99',
  '88',
  '77',
  '66',
  '55',
  '44',
  '33',
  '22',
  'AKs',
  'AQs',
  'AJs',
  'ATs',
  'KQs',
  'KJs',
  'KTs',
  'QJs',
  'QTs',
  'JTs',
  'T9s',
  '98s',
  'AKo',
  'AQo',
  'AJo',
  'KQo',
]

const MIDDLE_ONWARDS = [
  'A9s',
  'A8s',
  'A7s',
  'A6s',
  'A5s',
  'A4s',
  'A3s',
  'A2s',
  'K9s',
  'Q9s',
  'J9s',
  'T8s',
  '87s',
  '76s',
  '65s',
  'ATo',
  'KJo',
  'QJo',
]

const LATE_ONLY = [
  'K8s',
  'K7s',
  'K6s',
  'K5s',
  'K4s',
  'K3s',
  'K2s',
  'Q8s',
  'J8s',
  'T7s',
  '97s',
  '86s',
  '75s',
  '64s',
  '54s',
  '53s',
  '43s',
  'A9o',
  'A8o',
  'A7o',
  'A6o',
  'A5o',
  'A4o',
  'A3o',
  'A2o',
  'KTo',
  'K9o',
  'QTo',
  'Q9o',
  'JTo',
  'J9o',
  'T9o',
  '98o',
  '87o',
]

/** Hand -> band. Anything absent folds. */
export const HAND_BANDS: Record<string, Band> = Object.fromEntries([
  ...ANY_POSITION.map((h) => [h, 'any' as Band]),
  ...MIDDLE_ONWARDS.map((h) => [h, 'middle' as Band]),
  ...LATE_ONLY.map((h) => [h, 'late' as Band]),
])

export const BAND_LISTS: Record<Band, readonly string[]> = {
  any: ANY_POSITION,
  middle: MIDDLE_ONWARDS,
  late: LATE_ONLY,
}

/**
 * The hand in row `row`, column `col` of the grid. Suited hands sit above the
 * diagonal and offsuit below it, which is the convention every printed chart
 * uses, so a reader who has seen one before can read this one without a key.
 */
export function chartHand(row: number, col: number): string {
  const a = CHART_RANKS[row]
  const b = CHART_RANKS[col]
  if (row === col) return `${a}${a}`
  // CHART_RANKS runs strongest first, so the lower index is the higher card.
  const [hi, lo] = row < col ? [a, b] : [b, a]
  return `${hi}${lo}${row < col ? 's' : 'o'}`
}

/** How many of the 1,326 two-card combinations make this hand. */
export function comboCount(hand: string): number {
  if (hand.length === 2) return 6
  return hand.endsWith('s') ? 4 : 12
}

export const TOTAL_COMBOS = 1326

/** The share of hands a band covers, cumulatively with the bands above it. */
export function cumulativeShare(band: Band): number {
  const order: Band[] = ['any', 'middle', 'late']
  const upTo = order.slice(0, order.indexOf(band) + 1)
  const combos = upTo.flatMap((b) => BAND_LISTS[b]).reduce((sum, hand) => sum + comboCount(hand), 0)
  return (combos / TOTAL_COMBOS) * 100
}
