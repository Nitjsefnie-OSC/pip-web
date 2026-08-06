import test from 'ava'
import { WHO_WINS, toCards } from '@/config/learnExamples'
import { determineWinners } from '@/lib/poker/handEval'

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

test('every example has an id and an explanation', (t) => {
  const ids = WHO_WINS.map((e) => e.id)
  t.is(new Set(ids).size, ids.length)
  for (const example of WHO_WINS) {
    t.true(example.id.length > 0)
    t.true(example.why.length > 0, `${example.id}: no explanation`)
  }
})
