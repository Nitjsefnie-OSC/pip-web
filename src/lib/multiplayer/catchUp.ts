// What you missed at a slow table, as frames to play on the felt.
//
// The view holds each hand as it is now (or as it ended), with every card you
// may not see taken out. To watch it happen you need it as it was after each
// move. Those states are rebuilt here by dealing the hand again with the
// engine: the same seats, stacks, blinds and button, a deck stacked so that it
// deals your cards and the board that came, and every recorded move applied in
// order. Cards nobody may see are stand-ins, and each frame is redacted again
// before it is drawn, so a stand-in never reaches the screen.
//
// If a rebuilt hand does not end where the real one did, it is not shown: a
// wrong replay is worse than none.

import { applyAction, startHand, type Action, type HandState } from '@/lib/poker/engine'
import { shuffledDeck, type Card } from '@/lib/poker/cards'
import type { RoomView } from './view'
import { redactHand } from './view'

export interface CatchUpFrame {
  /** The hand number the frame belongs to. */
  index: number
  hand: HandState
}

const key = (c: Card) => `${c.rank}${c.suit}`

/**
 * The hand dealt again from its start, and the state after each move.
 * Null when it cannot be rebuilt faithfully.
 */
export function rebuild(hand: HandState, viewerId: string | null): HandState[] | null {
  if (hand.variant !== 'holdem') return null
  const players = hand.players
  const payouts = hand.result?.payouts ?? {}
  // Stacks before the blinds: where they are now, less anything won, plus everything put in.
  const start = players.map((p) => p.stack - (payouts[p.id] ?? 0) + p.committedThisHand)
  if (start.some((s) => s < 0)) return null

  // The deck, stacked: hole cards round by round, then the board, drawn from the end.
  const known = new Set<string>()
  for (const p of players) for (const c of p.hole) known.add(key(c))
  for (const c of hand.community) known.add(key(c))
  // Any order will do for stand-ins: a fixed one keeps the rebuild repeatable.
  const spare = shuffledDeck(() => 0).filter((c) => !known.has(key(c)))
  const draws: Card[] = []
  const dealtIn = players.filter((_, i) => start[i] > 0)
  for (let round = 0; round < 2; round++) {
    for (const p of dealtIn) draws.push(p.hole[round] ?? spare.pop()!)
  }
  for (const c of hand.community) draws.push(c)
  // Anything the replayed hand draws past the real board (it should not) comes from spares.
  const deck = [...spare.slice(0, 10), ...draws.reverse()]

  let state: HandState
  try {
    state = startHand({
      seats: players.map((p, i) => ({ id: p.id, name: p.name, stack: start[i] })),
      buttonIndex: hand.buttonIndex,
      smallBlind: hand.smallBlind,
      bigBlind: hand.bigBlind,
      deck,
    })
  } catch {
    return null
  }
  const frames: HandState[] = [state]
  for (const a of hand.actions) {
    const toAct = state.players[state.toActIndex]
    if (!toAct || toAct.id !== a.playerId) return null
    const action: Action =
      a.type === 'bet' || a.type === 'raise' ? { type: a.type, amount: a.to } : { type: a.type }
    try {
      state = applyAction(state, action)
    } catch {
      return null
    }
    frames.push(state)
  }

  // It has to land where the real hand did: same board, same stacks.
  const last = frames.at(-1)!
  const sameBoard =
    last.community.length === hand.community.length &&
    last.community.every((c, i) => key(c) === key(hand.community[i]))
  const sameStacks = last.players.every((p, i) => p.stack === players[i].stack)
  if (!sameBoard || !sameStacks) return null
  return frames.map((f) => redactHand({ ...f, result: f.result && hand.result }, viewerId))
}

/**
 * Everything since you last watched, oldest first: the rest of any finished
 * hands, then the hand in play up to now. Empty when there is nothing new, or
 * nothing that can be shown faithfully.
 */
export function catchUpFrames(view: RoomView): CatchUpFrame[] {
  if (view.kind !== 'slow' || view.phase === 'lobby' || !view.hand) return []
  const seen = view.seen ?? { hand: 0, actions: 0 }
  const hands = [...view.history]
  // The hand on the table, unless it is the last finished one again.
  const current = { index: view.handIndex, hand: view.hand }
  if (!hands.some((h) => h.index === current.index)) hands.push(current)
  const out: CatchUpFrame[] = []
  for (const h of hands) {
    if (h.index < seen.hand) continue
    // From where you left a hand (the table as you last saw it); a newer hand from its deal.
    const from = h.index === seen.hand ? seen.actions : 0
    const frames = rebuild(h.hand, view.you)
    if (!frames) continue
    for (const hand of frames.slice(from)) out.push({ index: h.index, hand })
  }
  // One frame is only the table as you left it: nothing to play.
  return out.length > 1 ? out : []
}
