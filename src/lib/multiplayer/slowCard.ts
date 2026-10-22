// A slow game as one player's mini table: what Home draws, and what their
// notifications are decided from.
//
// Built from `viewFor`, never from the room itself, so it can only ever hold
// what that player may see: their own two cards, the board, the stacks. The
// room sends a fresh one to each player's own index (`rooms/src/player.ts`)
// whenever the table changes.

import type { AvatarSpec } from '@/lib/avatar'
import type { Card } from '@/lib/poker/cards'
import type { ActionType } from '@/lib/poker/engine'
import type { RoomPhase, RoomState } from './room'
import type { MoveHours, SlowEnding } from './slow'
import { viewFor } from './view'

export interface SlowCardSeat {
  id: string
  name: string
  avatar: AvatarSpec
  ring: string | null
  stack: number
  /** Chips in front of them this hand. */
  committed: number
  folded: boolean
  place: number | null
}

export interface SlowCard {
  code: string
  venueId: string
  /** `closed` tells the index to forget the game. */
  phase: RoomPhase
  /** Your seat, or null once you are no longer at the table. */
  you: string | null
  isHost: boolean
  seats: SlowCardSeat[]
  maxSeats: number
  /** Whose move it is, by seat. */
  toAct: string | null
  yourTurn: boolean
  /** Names this turn of yours, so one turn is one notification. */
  turnKey: string | null
  /** When the move to make runs out. */
  dueAt: number | null
  board: Card[]
  hole: Card[]
  pot: number
  handIndex: number
  /** The last move made, for the line under the table. */
  last: { seat: string; type: ActionType; to: number } | null
  moveHours: MoveHours
  ending: SlowEnding
  forRoll: boolean
  prize: number
  /** Your place once the game is over. */
  place: number | null
  /** Whether you have the table open right now. */
  watching: boolean
  /** Whether there is anything you have not seen yet. */
  unseen: boolean
  updatedAt: number
}

export function cardFor(
  state: RoomState,
  userId: string,
  opts: { watching: boolean; now: number },
): SlowCard {
  const view = viewFor(state, userId)
  const hand = view.hand
  const toActId = hand && hand.toActIndex >= 0 ? (hand.players[hand.toActIndex]?.id ?? null) : null
  const toAct = view.phase === 'playing' && state.dueKind !== 'next-hand' ? toActId : null
  const yourTurn = toAct !== null && toAct === view.you
  const me = view.players.find((p) => p.id === view.you)
  const last = hand?.actions.at(-1)
  const seen = view.seen
  const actions = hand?.actions.length ?? 0
  return {
    code: view.code,
    venueId: view.venueId,
    phase: view.phase,
    you: view.you,
    isHost: view.isHost,
    seats: view.players.map((p) => {
      const h = hand?.players.find((x) => x.id === p.id)
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        ring: p.ring,
        stack: h ? h.stack : p.stack,
        committed: h?.committedThisHand ?? 0,
        folded: h ? h.status === 'folded' || h.status === 'out' : false,
        place: p.place,
      }
    }),
    maxSeats: view.maxSeats,
    toAct,
    yourTurn,
    turnKey: yourTurn ? `${view.handIndex}:${actions}` : null,
    dueAt: yourTurn ? view.dueAt : null,
    board: hand?.community ?? [],
    hole: hand?.players.find((p) => p.id === view.you)?.hole ?? [],
    pot: hand ? hand.players.reduce((sum, p) => sum + p.committedThisHand, 0) : 0,
    handIndex: view.handIndex,
    last: last ? { seat: last.playerId, type: last.type, to: last.to } : null,
    moveHours: view.settings.moveHours ?? 12,
    ending: view.settings.ending ?? { kind: 'last-standing' },
    forRoll: view.settings.forRoll,
    prize: view.prize,
    place: me?.place ?? null,
    watching: opts.watching,
    unseen:
      view.phase !== 'lobby' &&
      (seen === null || seen.hand < view.handIndex || seen.actions < actions),
    updatedAt: opts.now,
  }
}

/** A card telling the index this player is no longer in the game. */
export function goneCard(code: string, now: number): SlowCard {
  return {
    code,
    venueId: '',
    phase: 'closed',
    you: null,
    isHost: false,
    seats: [],
    maxSeats: 0,
    toAct: null,
    yourTurn: false,
    turnKey: null,
    dueAt: null,
    board: [],
    hole: [],
    pot: 0,
    handIndex: 0,
    last: null,
    moveHours: 12,
    ending: { kind: 'last-standing' },
    forRoll: false,
    prize: 0,
    place: null,
    watching: false,
    unseen: false,
    updatedAt: now,
  }
}

/** The other people at the table, by name, for a notification's first line. */
export function opponents(card: SlowCard): string {
  const names = card.seats.filter((s) => s.id !== card.you).map((s) => s.name)
  if (names.length <= 1) return names[0] ?? 'your game'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/** Hours and minutes left, the way the table writes them: "3h", "40m", "11h 20m". */
export function timeLeft(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** What a notification says for this card, or null when there is nothing to say. */
export function noticeCopy(card: SlowCard, now: number): { title: string; body: string } | null {
  if (card.yourTurn) {
    const left = card.dueAt !== null ? ` · ${timeLeft(card.dueAt - now)} left` : ''
    return { title: `Your move vs ${opponents(card)}`, body: `Hand ${card.handIndex}${left}` }
  }
  if (card.phase === 'finished' && card.place !== null) {
    return {
      title: card.place === 1 ? 'You won' : `You finished ${ordinal(card.place)}`,
      body: `vs ${opponents(card)}`,
    }
  }
  return null
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}
