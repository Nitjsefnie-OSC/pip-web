'use client'

import { useEffect, useState } from 'react'
import { timeLeft } from '@/lib/multiplayer/slowCard'
import { cn } from '@/lib/utils'

const SIZE = 20
const STROKE = 2.5
const R = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R

/**
 * Your turn's clock: a small ring in the corner of your own panel that empties
 * as your time runs down, and turns red over the last few seconds. When it runs
 * out the server checks for you if that is free, and folds if it is not.
 *
 * In a corner rather than a row of its own, so the table is laid out exactly as
 * the ladder's and nothing moves when your turn starts or ends. The time is the
 * server's (`dueAt`, already moved onto this device's clock), so a fast or slow
 * phone clock does not shorten anybody's turn.
 *
 * At a slow game the clock is hours, so it moves every half minute and turns
 * red over its last tenth instead of its last seconds.
 */
export function TurnClock({
  dueAt,
  totalMs,
  slow = false,
}: {
  dueAt: number
  totalMs: number
  slow?: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), slow ? 30_000 : 200)
    return () => clearInterval(id)
  }, [slow])
  const left = Math.max(0, dueAt - now)
  const share = Math.min(1, left / totalMs)
  const seconds = Math.ceil(left / 1000)
  const late = slow ? share < 0.1 : seconds <= 5
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={slow ? `${timeLeft(left)} left` : `${seconds} seconds left`}
      className={cn('-rotate-90', !slow && seconds <= 3 && 'animate-pulse')}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-foreground/15"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - share)}
        className={cn(
          'transition-[stroke-dashoffset,stroke] duration-200 ease-linear',
          late ? 'stroke-suit-red' : 'stroke-foreground/70',
        )}
      />
    </svg>
  )
}
