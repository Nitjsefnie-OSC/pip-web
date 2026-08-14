// Thin, typed wrapper over pokersolver. We delegate the fiddly 5-from-7 ranking
// and kicker logic to a battle-tested library; the rest of the engine is ours.

import pokersolver, { type Hand as SolvedHand } from 'pokersolver'
import type { Card, Rank, Suit } from './cards'

// pokersolver is CommonJS; grab Hand off the default (module.exports) object.
// The named import above is type-only (erased at runtime) for the SolvedHand type.
const { Hand } = pokersolver
import { cardsToStrings } from './cards'

export interface EvaluatedHand {
  /** Category label, e.g. "Full House". */
  name: string
  /** Full description incl. kickers, e.g. "Two Pair, A's & K's". */
  description: string
  /** Category rank from pokersolver (higher = better category). */
  categoryRank: number
  /** Opaque solved hand, used for winner comparison. */
  readonly solved: SolvedHand
}

/** Evaluate the best 5-card hand from a player's hole + community cards. */
export function evaluateHand(
  holeCards: readonly Card[],
  communityCards: readonly Card[],
): EvaluatedHand {
  const all = cardsToStrings([...holeCards, ...communityCards])
  const solved = Hand.solve(all)
  return {
    name: solved.name,
    description: solved.descr,
    categoryRank: solved.rank,
    solved,
  }
}

/**
 * The five cards the evaluator actually used, in its own order: the cards that
 * make the hand first, then the kickers, each descending.
 *
 * That order is the useful part. Two hands of the same category can be walked
 * card by card until they differ, and the card they differ on is the one that
 * settled it, which is how a grade explains itself in a sentence instead of
 * asserting a winner.
 *
 * Two things the solver does that the name here does not: it hands back **six
 * or seven cards** where more than five are eligible (every card of a six-card
 * flush, both trips of a full house), and it renames an ace playing low in a
 * five-high straight to '1'. Both are handled. The list stays in its own
 * descending order through the overflow, so the first five are the hand.
 */
export function bestFive(hand: EvaluatedHand): Card[] {
  return hand.solved.cards.slice(0, 5).map((card) => ({
    rank: (card.value === '1' ? 'A' : card.value) as Rank,
    suit: card.suit as Suit,
  }))
}

/**
 * "a full house" / "two pair". A made hand in words, ready to sit in a
 * sentence. The article is part of the phrase because English will not give it
 * up. Names come from the solver; anything unrecognised returns null and the
 * caller leaves the clause off rather than shipping "won with undefined".
 *
 * Here rather than beside one of its callers: the recap says this after a hand
 * and a drill says it in a grade, and two copies of this map is one copy too
 * many.
 */
const HAND_PHRASES: Record<string, string> = {
  'High Card': 'high card',
  Pair: 'a pair',
  'Two Pair': 'two pair',
  'Three of a Kind': 'three of a kind',
  Straight: 'a straight',
  Flush: 'a flush',
  'Full House': 'a full house',
  'Four of a Kind': 'four of a kind',
  // A royal is a straight flush by name; only the description tells them apart.
  'Straight Flush': 'a straight flush',
}

export function handPhrase(hand: Pick<EvaluatedHand, 'name' | 'description'>): string | null {
  if (hand.description === 'Royal Flush') return 'a royal flush'
  return HAND_PHRASES[hand.name] ?? null
}

export interface HandContenders<T> {
  /** Caller-supplied id/handle for a player. */
  id: T
  hole: readonly Card[]
}

export interface ShowdownResult<T> {
  /** Winning player ids (more than one on a tie). */
  winners: T[]
  /** Every contender's evaluated hand, keyed by id, for display. */
  evaluations: Map<T, EvaluatedHand>
}

/**
 * Compare contenders sharing a board and return the winner id(s). Ties (equal
 * hands) yield multiple winners so the caller can split the pot.
 */
export function determineWinners<T>(
  contenders: readonly HandContenders<T>[],
  communityCards: readonly Card[],
): ShowdownResult<T> {
  const evaluations = new Map<T, EvaluatedHand>()
  for (const c of contenders) {
    evaluations.set(c.id, evaluateHand(c.hole, communityCards))
  }

  const solvedList = contenders.map((c) => evaluations.get(c.id)!.solved)
  const winningSolved = new Set(Hand.winners(solvedList))

  const winners = contenders
    .filter((c) => winningSolved.has(evaluations.get(c.id)!.solved))
    .map((c) => c.id)

  return { winners, evaluations }
}
