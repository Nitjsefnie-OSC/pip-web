import type { Card } from '@/lib/poker/cards'
import type { SettledBy } from './rating'

// The drill contract. A drill is a generated spot, a decision, and a grade that
// can explain itself in one sentence from our own engine.
//
// Pure and React-free, like the engine it sits on: a drill is data, the runner
// only draws it. Nothing here reads or writes storage, nothing counts how many
// you have done, and nothing can read the clock. See the note on DrillKindId
// and the one at the top of rating.ts.

/**
 * The kinds. One today, and it is free forever and unmetered: "which hand
 * wins" was ruled the free kind on 2026-08-14 (technology#38) and that
 * commitment cannot be taken back.
 *
 * It is that kind because `determineWinners` grades it exactly rather than by
 * simulation, so the drill a stranger meets first is the one we can never mark
 * wrong. **Never meter it**: no counter, no "you have used N", no interstitial.
 * If we ever want to sample more of the practice layer, we make another whole
 * thing free rather than slicing this one.
 */
export type DrillKindId = 'which-hand-wins'

/** One of the answers on offer. */
export interface DrillChoice {
  /** Stable within a drill; what an answer is compared against. */
  id: string
  /** What the button says, e.g. "Hand A". */
  label: string
  /** The cards this choice stands for. Empty where it stands for an outcome. */
  cards: Card[]
  /**
   * Part of the right answer, once the answer is out. Usually just the one the
   * grader accepts, but not always: a split pot is two winning hands and one
   * correct button, and the runner should show all three as right.
   */
  winning: boolean
  /** The made hand in words once the answer is out, e.g. "Two pair". */
  detail?: string
  /** The five cards this hand actually plays, shown with the answer. */
  plays?: Card[]
}

/** A generated spot: everything the runner draws and the grader needs. */
export interface Drill {
  kind: DrillKindId
  /**
   * The seed this spot was generated from, and the load-bearing property of the
   * whole contract: same seed, same spot, same grade, forever. The grader, the
   * explanation and the tests all read one generation rather than re-deriving
   * anything, so they cannot drift apart.
   */
  seed: number
  /** The community cards. */
  board: Card[]
  choices: DrillChoice[]
  /** The id of the correct choice. */
  answer: string
  /**
   * What settled it, taken from the same evaluation that set `answer` and wrote
   * `explanation`. One reading of the hand feeds the grade, the sentence and
   * the difficulty, so none of the three can disagree with the other two.
   */
  settledBy: SettledBy
  /**
   * What this spot is rated, on the same scale as the player's rating. Carried
   * on the drill rather than recomputed by whatever is scoring, for the same
   * reason the seed is: the spot answers for itself, forever.
   */
  difficulty: number
  /**
   * Why, in one sentence, written at generation time out of the same evaluation
   * that set `answer`. A drill that cannot explain its own answer is not a
   * drill we ship, so the generator throws that spot away instead.
   */
  explanation: string
}

/** What the runner shows once a choice is made. */
export interface Grade {
  correct: boolean
  /** The id of the correct choice, whether or not it was picked. */
  answer: string
  explanation: string
  /** What the spot was rated. What the answer is worth is arithmetic on this. */
  difficulty: number
}

/**
 * Why a generated spot was thrown away instead of shown. Generation is a
 * filtered stream, not a raw one, and this is the filter's vocabulary.
 *
 * - `one-sided`: the two hands are more than one category apart, so the spot
 *   is a look rather than a question.
 * - `unexplainable`: the winner cannot be explained from the same evaluation
 *   that graded it. Silence over noise, at generation time.
 *
 * **An equity-graded kind adds `ambiguous` here**, and rejects any spot where
 * required and actual equity sit inside the margin (4 points is a guess and
 * wants play-testing, not theory). Two rules come with it, and they are why
 * this vocabulary exists before there is a kind that needs it: the rng handed
 * to `estimateEquity` is `mulberry32(drill.seed)`, so the grade and the
 * sentence under it cannot drift; and iterations go **up** there rather than
 * down, because generation happens once per spot and not once per render.
 */
export type RejectReason = 'one-sided' | 'unexplainable'

/** The result of generating at one seed: a spot, or the reason there isn't one. */
export interface Generated {
  drill: Drill | null
  rejected: RejectReason | null
}

/** Helpers so a generator reads as accept/reject rather than as null-juggling. */
export const accept = (drill: Drill): Generated => ({ drill, rejected: null })
export const reject = (rejected: RejectReason): Generated => ({ drill: null, rejected })
