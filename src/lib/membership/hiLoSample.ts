import { type Card, cardFromString, cardToString, rankName } from '@/lib/poker/cards'
import { bestFive, determineWinners, handPhrase } from '@/lib/poker/handEval'
import { determineLowWinners } from '@/lib/poker/hiLo'

/**
 * The showdown `/membership?for=hilo` deals, the Hi-Lo twin of `omahaSample`.
 *
 * The blurb says every pot is cut in half and that the two cards you use for
 * each half "are rarely the same two". This is a hand where both happen: three
 * kings take the high half, and your ace and three make the best low and take
 * the other, while your queens, the pair you would have played for, win
 * nothing.
 *
 * **The cards are typed; nothing else is.** Who takes each half, what each hand
 * is and which cards play all come from the two evaluators that settle a pot at
 * The Split (`determineWinners` for the high, `determineLowWinners` for the
 * low), so the page cannot say something the table would not.
 * `tests/hiLoSample.test.ts` holds the lesson to them.
 */
const BOARD = ['2c', '5d', '7h', 'Kd', '9s']
const HERO = ['As', '3h', 'Qc', 'Qd']
const THEM = ['Ks', 'Kh', '8c', '4c']

interface HiLoHolding {
  cards: Card[]
  /** The five that make the high hand, two of these and three of the board. */
  high: Card[]
  /** The high hand in words: "three of a kind". */
  highPhrase: string
  /** The five that make the low, or null when this hand has none. */
  low: Card[] | null
  /** The low read out, "7-5-3-2-A", or null. */
  lowPhrase: string | null
}

interface HiLoShowdown {
  board: Card[]
  hero: HiLoHolding
  them: HiLoHolding
  highWinner: 'hero' | 'them' | 'split'
  /** Null when nobody qualifies and the high hand takes the whole pot. */
  lowWinner: 'hero' | 'them' | 'split' | null
}

const side = <T>(winners: readonly T[]): T | 'split' => (winners.length > 1 ? 'split' : winners[0])

export function hiLoSample(): HiLoShowdown {
  const board = BOARD.map(cardFromString)
  const hero = HERO.map(cardFromString)
  const them = THEM.map(cardFromString)
  const contenders = [
    { id: 'hero' as const, hole: hero },
    { id: 'them' as const, hole: them },
  ]
  const high = determineWinners(contenders, board, 'omahahilo')
  const low = determineLowWinners(contenders, board)
  const holding = (id: 'hero' | 'them', cards: Card[]): HiLoHolding => {
    const hand = high.evaluations.get(id)!
    const lowHand = low.lows.get(id)
    return {
      cards,
      high: bestFive(hand),
      highPhrase: handPhrase(hand) ?? hand.name.toLowerCase(),
      low: lowHand?.cards ?? null,
      lowPhrase: lowHand?.description ?? null,
    }
  }
  return {
    board,
    hero: holding('hero', hero),
    them: holding('them', them),
    highWinner: side(high.winners),
    lowWinner: low.winners.length === 0 ? null : side(low.winners),
  }
}

/** The hole cards among five that play, said out loud: "queens", "ace and three". */
function holeWords(hole: readonly Card[], plays: readonly Card[]): string {
  const playing = new Set(plays.map(cardToString))
  const [a, b] = hole.filter((card) => playing.has(cardToString(card)))
  if (a.rank === b.rank) return a.rank === '6' ? 'sixes' : `${rankName(a.rank)}s`
  return `${rankName(a.rank)} and ${rankName(b.rank)}`
}

/**
 * The line under the felt. Worded for the one hand this deals (their high,
 * your low, nothing for your high); `tests/hiLoSample.test.ts` fails if the
 * evaluators ever settle it another way.
 */
export function hiLoLine(showdown: HiLoShowdown, opponent: string): string {
  const { hero, them } = showdown
  return `${opponent} takes the high half with ${them.highPhrase}. Your ${holeWords(hero.cards, hero.low ?? [])} make ${hero.lowPhrase}, the best low, and take the other half. Your ${holeWords(hero.cards, hero.high)} win nothing.`
}
