// The rating: one number that says how well you read these spots, on the same
// scale as the spots themselves.
//
// **Why a rating rather than a streak.** Will asked for something that keeps a
// player coming back ("no score keeping, no rating, streaks or anything",
// 15 Aug) and there are two ways to build that. One is a clock: a daily streak,
// a goal, a thing you lose by not turning up. That is the exact chess.com
// behaviour this app is positioned against, and `lib/daily.ts` already refuses
// it ("no streaks, no history pressure"). The other is a mirror: a number that
// only ever reflects what you actually did, that moves both ways, and that is
// exactly where you left it whenever you come back. This is the mirror.
//
// So, three properties, and all three are held by a test rather than by this
// comment:
//
// 1. **Nothing here reads the clock.** No decay, no day, no "last played". A
//    rating cannot rot while you are away because nothing in the drills layer
//    can tell that you were away.
// 2. **Nothing here caps anything.** The rating is not a currency and not an
//    allowance; the free kind is unmetered by ruling (technology#38) and a
//    number on the screen must never become a number you run out of.
// 3. **The arithmetic is Elo and it is honest.** An easy spot answered right by
//    a strong player is worth nothing, and it says nothing rather than
//    inventing a point for turning up.

/** Where everybody starts, and roughly where a spot settled by the hand ranks sits. */
export const STARTING_RATING = 1000

/**
 * The rating cannot fall below this.
 *
 * Not a kindness, an honesty: below the floor the number stops carrying
 * information (it only means "answered a lot at random") and starts being a
 * thing to feel bad about. The ceiling is left open on purpose because the
 * spots supply their own: the hardest spot this kind can deal is rated
 * {@link HARDEST_SPOT}, so gains shrink to nothing above it on their own rather
 * than by a rule.
 */
export const RATING_FLOOR = 400

/**
 * How a "which hand wins" spot was settled, easiest first. This is the drill's
 * own reading of the hand, taken from the same evaluation that set the answer
 * and wrote the sentence, so the difficulty cannot disagree with the grade.
 *
 * - `category`: the two hands are different hands. You need the hand ranking.
 * - `rank`: the same hand twice, settled inside the made cards (the higher two
 *   pair, the bigger trips).
 * - `kicker`: the same hand twice, made of the same cards, settled by a kicker.
 *   The one people get wrong.
 * - `split`: neither is higher. The one people do not think to look for.
 */
export type SettledBy = 'category' | 'rank' | 'kicker' | 'split'

/**
 * What each shape is rated.
 *
 * These are a judgement about the spots, not a measurement of players: nobody
 * has played this yet, so calibrating from real answers is not available and
 * pretending otherwise would be the invented-authority failure the whole build
 * avoids. The ordering is the defensible part and it is the part that matters
 * (a kicker asks more than a flush against a pair). Re-derive the numbers from
 * real accuracy per shape once there is any, and expect them to move.
 */
const BASE: Record<SettledBy, number> = {
  category: 820,
  rank: 1010,
  kicker: 1240,
  split: 1400,
}

/**
 * Added when the hand that loses holds the higher card, so the spot reads like
 * the wrong answer at a glance. The only adjustment there is, because it is the
 * only one that can be computed from the cards rather than asserted about them.
 */
const DECOY = 120

/** The least a spot can be rated. Two different hands, and the higher card wins. */
export const EASIEST_SPOT = BASE.category

/** The most a spot can be rated, and therefore where the rating flattens out. */
export const HARDEST_SPOT = BASE.split

/**
 * What this spot is worth. Splits take no decoy adjustment: with two winners
 * there is no losing hand to be misled by.
 */
export function spotDifficulty(settledBy: SettledBy, decoy: boolean): number {
  return BASE[settledBy] + (decoy && settledBy !== 'split' ? DECOY : 0)
}

/** Elo's expectation: the share of spots at this difficulty you should get right. */
export function expectedScore(player: number, difficulty: number): number {
  return 1 / (1 + 10 ** ((difficulty - player) / 400))
}

/**
 * How far one answer can move the rating.
 *
 * High while the number means nothing, so the first twenty spots find roughly
 * the right level instead of grinding towards it, then settling so that a
 * distracted five minutes does not undo a month.
 */
export function kFactor(answered: number): number {
  if (answered < 15) return 48
  if (answered < 50) return 32
  return 20
}

/**
 * The rating after one answer. `answered` is the count *before* this spot.
 *
 * Rounded, floored, and deliberately capable of returning the number it was
 * given: an easy spot answered right by somebody well above it is worth a
 * fraction of a point, and rounding that to zero is the honest outcome. A
 * guaranteed +1 for every answer would make this a counter of how much you
 * played rather than a reading of how well, which is the whole distinction.
 */
export function nextRating(
  player: number,
  difficulty: number,
  correct: boolean,
  answered: number,
): number {
  const delta = kFactor(answered) * ((correct ? 1 : 0) - expectedScore(player, difficulty))
  return Math.max(RATING_FLOOR, Math.round(player + delta))
}
