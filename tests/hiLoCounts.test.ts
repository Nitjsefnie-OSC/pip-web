// The counts and hands `/blog/omaha-hi-lo-how-often-a-low` prints.
//
// A low only cares about ranks A-8, so the exact rows are counted by rank:
// eight low ranks of four cards each, and twenty cards that might as well be
// one rank. That runs in under a second. The shortcut is then checked against
// `bestLow`, the evaluator that settles the low half at The Split, on a seeded
// sample of dealt hands, so the count and the table cannot disagree.

import test from 'ava'
import {
  ACE_DEUCE_DEALS,
  ACE_DEUCE_LOWS,
  BOARDS,
  COUNTERFEIT,
  LOW_BOARDS,
  NOT_COUNTERFEIT,
  ONE_HAND_DEALS,
  ONE_HAND_LOW_BOARD_DEALS,
  ONE_HAND_LOWS,
  TABLE_SAMPLE,
} from '@/config/hiLoCounts'
import { type Card, cardFromString, mulberry32, shuffledDeck } from '@/lib/poker/cards'
import { bestLow } from '@/lib/poker/hiLo'

const LOW_RANKS = 'A2345678'

const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

/** Every way to put `sum` cards on the eight low ranks, at most `cap[i]` on rank i. */
function spreads(sum: number, cap: readonly number[]): number[][] {
  const out: number[][] = []
  const v = new Array<number>(8).fill(0)
  const fill = (i: number, left: number) => {
    if (i === 7) {
      if (left <= cap[7]) out.push([...v.slice(0, 7), left])
      return
    }
    for (let x = 0; x <= Math.min(cap[i], left); x++) {
      v[i] = x
      fill(i + 1, left - x)
    }
  }
  fill(0, sum)
  return out
}

/** Two hole ranks and three other board ranks, all different: a low. */
function lowByRank(board: readonly number[], hole: readonly number[]): boolean {
  const onBoard = [0, 1, 2, 3, 4, 5, 6, 7].filter((r) => board[r] > 0)
  const inHand = [0, 1, 2, 3, 4, 5, 6, 7].filter((r) => hole[r] > 0)
  for (let a = 0; a < inHand.length; a++) {
    for (let b = a + 1; b < inHand.length; b++) {
      const rest = onBoard.filter((r) => r !== inHand[a] && r !== inHand[b])
      if (rest.length >= 3) return true
    }
  }
  return false
}

function count() {
  const totals = { boards: 0, lowBoards: 0, deals: 0, lows: 0, lowBoardDeals: 0, a2: 0, a2Lows: 0 }
  for (let boardLow = 0; boardLow <= 5; boardLow++) {
    for (const board of spreads(boardLow, new Array(8).fill(4))) {
      const boardHigh = 5 - boardLow
      const boardWays = board.reduce((w, x) => w * choose(4, x), 1) * choose(20, boardHigh)
      const lowBoard = board.filter((x) => x > 0).length >= 3
      totals.boards += boardWays
      if (lowBoard) totals.lowBoards += boardWays
      const left = board.map((x) => 4 - x)
      for (let holeLow = 0; holeLow <= 4; holeLow++) {
        for (const hole of spreads(holeLow, left)) {
          const ways =
            boardWays *
            hole.reduce((w, x, i) => w * choose(left[i], x), 1) *
            choose(20 - boardHigh, 4 - holeLow)
          const low = lowByRank(board, hole)
          totals.deals += ways
          if (low) totals.lows += ways
          if (lowBoard) totals.lowBoardDeals += ways
          if (hole[0] > 0 && hole[1] > 0) {
            totals.a2 += ways
            if (low) totals.a2Lows += ways
          }
        }
      }
    }
  }
  return totals
}

const byRank = (cards: readonly Card[]): number[] => {
  const v = new Array<number>(8).fill(0)
  for (const card of cards) {
    const i = LOW_RANKS.indexOf(card.rank)
    if (i >= 0) v[i]++
  }
  return v
}

test('the exact rows are what counting every deal by rank gives', (t) => {
  const totals = count()
  t.is(totals.boards, BOARDS)
  t.is(totals.boards, choose(52, 5))
  t.is(totals.lowBoards, LOW_BOARDS)
  t.is(totals.deals, ONE_HAND_DEALS)
  t.is(totals.deals, choose(52, 5) * choose(47, 4))
  t.is(totals.lows, ONE_HAND_LOWS)
  t.is(totals.lowBoardDeals, ONE_HAND_LOW_BOARD_DEALS)
  t.is(totals.a2, ACE_DEUCE_DEALS)
  t.is(totals.a2Lows, ACE_DEUCE_LOWS)
})

test('counting by rank agrees with the evaluator on dealt hands', (t) => {
  const rng = mulberry32(7)
  for (let i = 0; i < 20_000; i++) {
    const deck = shuffledDeck(rng)
    const board = deck.slice(0, 5)
    const hole = deck.slice(5, 9)
    t.is(bestLow(hole, board) !== null, lowByRank(byRank(board), byRank(hole)))
  }
})

test('the sample rows climb towards the boards that allow a low', (t) => {
  const rows = TABLE_SAMPLE.someoneLow
  t.is(rows.length, 6)
  for (let i = 1; i < rows.length; i++) t.true(rows[i] > rows[i - 1])
  t.true(rows[5] < (TABLE_SAMPLE.deals * LOW_BOARDS) / BOARDS)
})

test('a deuce on the board takes the low away from ace-deuce', (t) => {
  const low = (hand: { hole: readonly string[]; board: readonly string[] }) =>
    bestLow(hand.hole.map(cardFromString), hand.board.map(cardFromString))
  t.is(byRank(COUNTERFEIT.board.map(cardFromString)).filter((x) => x > 0).length, 3)
  t.is(low(COUNTERFEIT), null)
  t.is(low(NOT_COUNTERFEIT)?.description, '7-5-3-2-A')
})
