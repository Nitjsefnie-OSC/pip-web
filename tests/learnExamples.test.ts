import test from 'ava'
import { ACE_RUNS, WHO_WINS, toCards } from '@/config/learnExamples'
import { determineWinners, evaluateHand } from '@/lib/poker/handEval'

// The whole point of this file: every worked example on a guide page states who
// wins a hand, in public, to people learning the rules. Getting one wrong is
// worse than not shipping the example. So the engine settles each of them, and
// the answers in the config are only ever a claim the tests have checked.

test('every example agrees with the evaluator about who wins', (t) => {
  for (const example of WHO_WINS) {
    const board = toCards(example.board)
    const { winners } = determineWinners(
      [
        { id: 'a' as const, hole: toCards(example.a) },
        { id: 'b' as const, hole: toCards(example.b) },
      ],
      board,
    )
    const actual = winners.length === 2 ? 'split' : winners[0]
    t.is(actual, example.answer, `${example.id}: evaluator disagrees`)
  }
})

test('every example uses five board cards, two hole cards, and no repeats', (t) => {
  for (const example of WHO_WINS) {
    t.is(example.board.length, 5, `${example.id}: board`)
    t.is(example.a.length, 2, `${example.id}: hand a`)
    t.is(example.b.length, 2, `${example.id}: hand b`)
    const all = [...example.board, ...example.a, ...example.b]
    t.is(new Set(all).size, all.length, `${example.id}: a card is dealt twice`)
  }
})

// Q-K-A-2-3 being nothing is the claim worth pinning: it is the one the page
// exists to correct, and it is the one a reader is least able to check.
test('the ace runs agree with the evaluator about what is a straight', (t) => {
  for (const run of ACE_RUNS) {
    const cards = toCards(run.cards)
    const solved = evaluateHand(cards, [])
    t.is(solved.name === 'Straight', run.isStraight, `${run.id}: evaluator says "${solved.name}"`)
  }
})

test('the ace runs are five distinct cards, and mixed suits so only the run is in question', (t) => {
  for (const run of ACE_RUNS) {
    t.is(run.cards.length, 5, `${run.id}: card count`)
    t.is(new Set(run.cards).size, 5, `${run.id}: a card is dealt twice`)
    const suits = new Set(run.cards.map((c) => c[1]))
    t.true(suits.size > 1, `${run.id}: all one suit would make it a flush question`)
    t.true(run.verdict.length > 0, `${run.id}: no verdict`)
  }
})

test('every example has an id and an explanation', (t) => {
  const ids = WHO_WINS.map((e) => e.id)
  t.is(new Set(ids).size, ids.length)
  for (const example of WHO_WINS) {
    t.true(example.id.length > 0)
    t.true(example.why.length > 0, `${example.id}: no explanation`)
  }
})
