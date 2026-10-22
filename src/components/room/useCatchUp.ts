'use client'

// Opening a slow game plays what you missed on the felt, a move at a time,
// before handing you the table (`lib/multiplayer/catchUp`). Decided once, when
// the table first opens: anything that happens while you watch arrives live.
//
// When it ends, or is skipped, the server is told you are up to date, and
// from then on anything new while the screen is open counts as seen.

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { catchUpFrames, type CatchUpFrame } from '@/lib/multiplayer/catchUp'
import type { RoomView } from '@/lib/multiplayer/view'
import { sound } from '@/lib/sound'
import { useRoom } from '@/store/room'

/** How long each move holds. A new hand and a hand's end linger. */
const BEAT_MS = 900
const LINGER_MS = 1600

export interface CatchUp {
  /** The frame on the felt while catching up, or null once it is the live table. */
  frame: CatchUpFrame | null
  /** How far through, for the line on the felt. */
  step: number
  total: number
  skip: () => void
}

export function useCatchUp(view: RoomView): CatchUp {
  const reduce = useReducedMotion() ?? false
  // Worked out from the first view this screen gets, and never again.
  const [frames] = useState<CatchUpFrame[]>(() => (reduce ? [] : catchUpFrames(view)))
  const [step, setStep] = useState(0)
  const done = step >= frames.length
  const markSeen = useRoom((s) => s.markSeen)

  useEffect(() => {
    if (done) return
    const frame = frames[step]
    const next = frames[step + 1]
    const linger = frame.hand.result !== null || (next && next.index !== frame.index)
    const t = setTimeout(
      () => {
        if (next) {
          const last = next.hand.actions.at(-1)
          if (next.index !== frame.index) sound.play('deal')
          else if (last) sound.play(last.type === 'draw' ? 'draw' : last.type)
        }
        setStep((s) => s + 1)
      },
      linger ? LINGER_MS : BEAT_MS,
    )
    return () => clearTimeout(t)
  }, [done, step, frames])

  // Up to date: whenever the live table is on screen and something is new.
  const seen = view.seen
  const behind =
    view.kind === 'slow' &&
    view.phase !== 'lobby' &&
    (seen === null || seen.hand < view.handIndex || seen.actions < (view.hand?.actions.length ?? 0))
  const sent = useRef<string | null>(null)
  useEffect(() => {
    if (!done || !behind) return
    // Once per position, so a slow answer is not asked again.
    const at = `${view.handIndex}:${view.hand?.actions.length ?? 0}`
    if (sent.current === at) return
    if (document.visibilityState !== 'visible') return
    sent.current = at
    markSeen()
  }, [done, behind, view.handIndex, view.hand, markSeen])

  return {
    frame: done ? null : frames[step],
    step,
    total: frames.length,
    skip: () => {
      sound.play('tap')
      setStep(frames.length)
    },
  }
}
