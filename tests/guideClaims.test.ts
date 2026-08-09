import test from 'ava'
import { cardFromString } from '@/lib/poker/cards'
import { determineWinners, evaluateHand } from '@/lib/poker/handEval'

// Claims a guide makes in prose rather than through a worked-example widget.
// The widgets are covered by learnExamples.test.ts; this file exists so a
// sentence that names five specific cards and says who wins is settled by the
// same evaluator the game uses, not by the author's arithmetic.

const cards = (strings: string[]) => strings.map(cardFromString)

// /learn/how-to-play-texas-holdem, "A hand, from the deal to the showdown".
// The page walks a full hand and then reads both hands out. The point of the
// passage is the villain's jack playing, which is exactly the sort of detail
// that is easy to write wrong and impossible for a beginner to check.
const BOARD = ['Kd', '8s', '3h', '5c', 'Qh']
const HERO = ['Ks', 'Qs']
const VILLAIN = ['Kh', 'Jd']

test('the worked hand: the hero wins with two pair, kings and queens', (t) => {
  const { winners } = determineWinners(
    [
      { id: 'hero' as const, hole: cards(HERO) },
      { id: 'villain' as const, hole: cards(VILLAIN) },
    ],
    cards(BOARD),
  )
  t.deepEqual(winners, ['hero'])

  const hero = evaluateHand(cards(HERO), cards(BOARD))
  t.is(hero.name, 'Two Pair')
  t.is(hero.description, "Two Pair, K's & Q's")
})

test('the worked hand: the villain has one pair, and his jack plays', (t) => {
  const villain = evaluateHand(cards(VILLAIN), cards(BOARD))
  t.is(villain.name, 'Pair')
  t.is(villain.description, "Pair, K's")
  // The page says his best five are K♥ K♦ Q♥ J♦ 8♠. The jack is the claim: it
  // comes from his own hand and beats the eight already on the table.
  const best = (villain.solved as unknown as { cards: unknown[] }).cards.map(String)
  t.deepEqual(best, ['Kh', 'Kd', 'Qh', 'Jd', '8s'])
})

test('the worked hand deals no card twice', (t) => {
  const all = [...BOARD, ...HERO, ...VILLAIN]
  t.is(new Set(all).size, all.length)
})
