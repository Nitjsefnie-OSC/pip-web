import test from 'ava'
import { bestFive, evaluateHand, determineWinners } from '@/lib/poker/handEval'
import { cardToString, cardFromString, type Card } from '@/lib/poker/cards'

const h = (...s: string[]): Card[] => s.map(cardFromString)

const five = (hole: Card[], board: Card[]): string =>
  bestFive(evaluateHand(hole, board)).map(cardToString).join(' ')

test('recognises a flush', (t) => {
  const ev = evaluateHand(h('Ah', 'Kh'), h('2h', '7h', 'Th', '3c', '4d'))
  t.is(ev.name, 'Flush')
})

test('recognises a full house', (t) => {
  const ev = evaluateHand(h('Ah', 'Ad'), h('As', 'Kh', 'Kd', '3c', '4d'))
  t.is(ev.name, 'Full House')
})

test('higher hand wins between two players', (t) => {
  const board = h('2c', '7s', 'Ts', 'Jc', '3d')
  const { winners } = determineWinners(
    [
      { id: 'aces', hole: h('Ah', 'Ad') },
      { id: 'kings', hole: h('Kh', 'Kd') },
    ],
    board,
  )
  t.deepEqual(winners, ['aces'])
})

test('identical hands split (both winners)', (t) => {
  // Board plays a broadway straight; both players just play the board.
  const board = h('Ts', 'Js', 'Qh', 'Kd', 'Ac')
  const { winners } = determineWinners(
    [
      { id: 'p1', hole: h('2c', '3d') },
      { id: 'p2', hole: h('4c', '5d') },
    ],
    board,
  )
  t.is(winners.length, 2)
  t.true(winners.includes('p1') && winners.includes('p2'))
})

// bestFive is what a reveal draws and what tells two same-category hands apart,
// so the shapes that matter are the ones where the solver hands back more than
// five cards. It does that for a six-card flush and for two trips, and both
// stay in their own descending order, which is why the first five are the hand.
test('bestFive is five cards, in the solver’s order, even where more are eligible', (t) => {
  t.is(five(h('9d', '7d'), h('Ad', 'Td', '5h', 'Kd', '4d')), 'Ad Kd Td 9d 7d')
  t.is(five(h('Ks', 'Kd'), h('Ah', 'Ad', 'As', 'Kh', '2c')), 'Ah Ad As Ks Kd')
  t.is(five(h('Ah', 'Kd'), h('As', '7d', '2c', 'Th', '4s')), 'Ah As Kd Th 7d')
})

// The ace the solver renames to '1' when it plays low. Left as '1' it would be
// an unreadable card face and a rank our own type does not have.
test('bestFive maps a low ace back to an ace', (t) => {
  t.is(five(h('Ac', 'Kh'), h('5h', '4d', '3h', '2d', '9s')), '5h 4d 3h 2d Ac')
})

test('kicker decides when top pair ties', (t) => {
  const board = h('As', '7d', '2c', 'Th', '4s')
  const { winners } = determineWinners(
    [
      { id: 'bigKicker', hole: h('Ah', 'Kd') },
      { id: 'smallKicker', hole: h('Ac', 'Qd') },
    ],
    board,
  )
  t.deepEqual(winners, ['bigKicker'])
})
