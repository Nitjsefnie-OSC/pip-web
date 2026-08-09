import test from 'ava'
import {
  BAND_LISTS,
  CHART_RANKS,
  chartHand,
  comboCount,
  cumulativeShare,
  HAND_BANDS,
  TOTAL_COMBOS,
} from '@/config/startingHands'

// The chart on /learn/starting-hands is 169 cells, and the prose above it says
// the bands cover 13%, 20% and 41% of hands. A reader cannot check either. So
// the grid and the percentages are both derived from the same three lists, and
// these tests check the lists are well formed and that the derivation lands
// where the copy says it does.

const ALL_HANDS = new Set(
  CHART_RANKS.flatMap((_, row) => CHART_RANKS.map((__, col) => chartHand(row, col))),
)

test('the grid is the standard 169 distinct starting hands', (t) => {
  t.is(CHART_RANKS.length, 13)
  t.is(ALL_HANDS.size, 169)
  const pairs = [...ALL_HANDS].filter((h) => h.length === 2)
  const suited = [...ALL_HANDS].filter((h) => h.endsWith('s'))
  const offsuit = [...ALL_HANDS].filter((h) => h.endsWith('o'))
  t.is(pairs.length, 13)
  t.is(suited.length, 78)
  t.is(offsuit.length, 78)
})

test('the combination counts add up to a 52-card deck', (t) => {
  const total = [...ALL_HANDS].reduce((sum, hand) => sum + comboCount(hand), 0)
  t.is(total, TOTAL_COMBOS)
  t.is(TOTAL_COMBOS, (52 * 51) / 2)
})

test('suited hands sit above the diagonal and offsuit below it', (t) => {
  // AKs must be the cell one right of AA, and AKo one below it. Getting this
  // backwards is the single easiest way to ship a chart that reads correctly
  // and says the opposite of what it means.
  t.is(chartHand(0, 0), 'AA')
  t.is(chartHand(0, 1), 'AKs')
  t.is(chartHand(1, 0), 'AKo')
  t.is(chartHand(12, 12), '22')
  t.is(chartHand(7, 8), '76s')
  t.is(chartHand(8, 7), '76o')
})

test('every banded hand is a real cell on the grid, and no hand is in two bands', (t) => {
  const seen = new Set<string>()
  for (const [band, hands] of Object.entries(BAND_LISTS)) {
    for (const hand of hands) {
      t.true(ALL_HANDS.has(hand), `${hand} (${band}) is not a hand on the grid`)
      t.false(seen.has(hand), `${hand} is in more than one band`)
      seen.add(hand)
    }
  }
  t.is(seen.size, Object.keys(HAND_BANDS).length)
})

test('the bands cover the share of hands the page claims', (t) => {
  // 13% early, 20% middle, 41% on the button, all quoted in the copy, and the
  // "roughly triples" sentence depends on the first and last.
  t.is(cumulativeShare('any').toFixed(1), '13.1')
  t.is(cumulativeShare('middle').toFixed(1), '20.4')
  t.is(cumulativeShare('late').toFixed(1), '40.9')
})

test('a few hands the copy names by hand are in the band the copy puts them in', (t) => {
  // Each of these is asserted in prose, so a silent edit to a list should fail
  // here rather than quietly contradict the sentence next to the chart.
  t.is(HAND_BANDS.KTs, 'any', 'the copy says KTs plays from anywhere')
  t.is(HAND_BANDS.KTo, 'late', 'and that KTo waits for the button')
  t.is(HAND_BANDS.ATo, 'middle')
  t.is(HAND_BANDS.KJo, 'middle')
  t.is(HAND_BANDS.JTo, 'late')
  t.is(HAND_BANDS.QJo, 'middle')
  t.is(HAND_BANDS.AA, 'any')
  t.false('72o' in HAND_BANDS, 'the worst hand in Hold’em folds everywhere')
  t.is(HAND_BANDS.J9s, 'middle', 'the copy calls J9s a fold from the first seat')
})
