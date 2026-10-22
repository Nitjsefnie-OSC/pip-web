'use client'

// Your slow games, as Home and the multiplayer page show them: one mini table
// each, from your own index on the room server (`rooms/src/player.ts`).
//
// Kept on this device between visits, so Home draws your games straight away
// and then corrects itself, instead of opening on an empty row that fills in.
// The room server is still the truth; this is only the last thing it said.

import { useEffect } from 'react'
import { create } from 'zustand'
import { dismissSlowGame, fetchSlowGames, roomsConfigured } from '@/lib/multiplayer/client'
import type { SlowCard } from '@/lib/multiplayer/slowCard'

const KEY = 'pip.slowGames'
/** How often Home asks again while it is on screen. */
const REFRESH_MS = 60_000

interface SlowGamesStore {
  games: SlowCard[]
  /** Whether the server has answered since this page opened. */
  fresh: boolean
  refresh: () => Promise<void>
  dismiss: (code: string) => void
  /** Signed out: nothing to show. */
  clear: () => void
}

function read(): SlowCard[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SlowCard[]) : []
  } catch {
    return []
  }
}

function write(games: SlowCard[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(games))
  } catch {
    // Private mode: they are fetched again next time.
  }
}

const RANK: Record<string, number> = { playing: 0, lobby: 1, finished: 2 }

/**
 * Your move first, soonest to run out first; then the games waiting on
 * somebody else, the latest news first; then ones waiting for players; then
 * finished ones.
 */
export function sortGames(games: readonly SlowCard[]): SlowCard[] {
  return [...games].sort((a, b) => {
    if (a.yourTurn !== b.yourTurn) return a.yourTurn ? -1 : 1
    if (a.yourTurn) return (a.dueAt ?? 0) - (b.dueAt ?? 0)
    const r = (RANK[a.phase] ?? 3) - (RANK[b.phase] ?? 3)
    return r !== 0 ? r : b.updatedAt - a.updatedAt
  })
}

let inflight: Promise<void> | null = null

export const useSlowGames = create<SlowGamesStore>((set, get) => ({
  games: typeof window === 'undefined' ? [] : sortGames(read()),
  fresh: false,
  refresh: () => {
    if (!roomsConfigured()) return Promise.resolve()
    inflight ??= fetchSlowGames()
      .then((games) => {
        if (!games) return
        const sorted = sortGames(games.filter((g) => g.phase !== 'closed'))
        write(sorted)
        set({ games: sorted, fresh: true })
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  },
  dismiss: (code) => {
    const games = get().games.filter((g) => g.code !== code)
    write(games)
    set({ games })
    void dismissSlowGame(code)
  },
  clear: () => {
    write([])
    set({ games: [], fresh: true })
  },
}))

/**
 * Keep the list current while a screen that shows it is open: now, whenever
 * the page comes back into view, and every minute.
 */
export function useSlowGamesLive(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const refresh = () => {
      if (document.visibilityState === 'visible') void useSlowGames.getState().refresh()
    }
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [enabled])
}
