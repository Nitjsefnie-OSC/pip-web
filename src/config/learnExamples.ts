import { cardFromString, type Card } from '@/lib/poker/cards'

// Worked examples for the written guides. Pure data, deliberately kept out of
// the components: every one of these is a claim about who wins a hand, and
// tests/learnExamples.test.ts settles each of them against the real evaluator
// rather than against the author's arithmetic.
//
// They are illustrations of what a guide already says in prose, not practice.
// Nothing here is generated, scored or remembered — see the Learn section's
// dividing line in ../../marketing/strategy/monetisation.md ("words are free,
// feedback is paid").

export type Outcome = 'a' | 'b' | 'split'

export interface WhoWinsExample {
  id: string
  /** The five community cards, as "Ah"/"Td" strings. */
  board: string[]
  /** The two players' hole cards. */
  a: string[]
  b: string[]
  /** Who takes it. Verified against determineWinners() in the tests. */
  answer: Outcome
  /** One line, said once the answer is showing. The guide's own explanation. */
  why: string
}

export const WHO_WINS: WhoWinsExample[] = [
  {
    id: 'kickers',
    board: ['Ac', '8d', '5s', '3h', '2d'],
    a: ['As', 'Kd'],
    b: ['Ah', 'Qc'],
    answer: 'a',
    why: 'Both make a pair of aces, so the next card decides. The king outkicks the queen. This is where most beginner pots are quietly lost.',
  },
  {
    id: 'board-plays',
    board: ['As', 'Ks', 'Qd', 'Jc', 'Th'],
    a: ['7d', '2c'],
    b: ['9s', '4h'],
    answer: 'split',
    why: 'The best five cards are all on the table, and neither hand improves on them. Everyone still in has the same straight, so the pot splits.',
  },
  {
    id: 'flush-over-straight',
    board: ['9d', '7d', '5c', '2d', 'Ks'],
    a: ['Ad', '3d'],
    b: ['8s', '6h'],
    answer: 'a',
    why: 'A flush beats a straight because it is harder to make, and that holds all the way down the list.',
  },
]

/** Parse an example's strings into cards for rendering. */
export function toCards(codes: readonly string[]): Card[] {
  return codes.map(cardFromString)
}
