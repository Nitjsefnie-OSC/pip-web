'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Your turn's clock: a bar that runs down, and the seconds once there are few
 * left. When it runs out the server checks for you if that is free, and folds
 * if it is not. The time is the server's (`dueAt`, already moved onto this
 * device's clock), so a fast or slow phone clock does not shorten anybody's turn.
 */
export function TurnClock({
  dueAt,
  totalMs,
  className,
}: {
  dueAt: number
  /** The whole turn, so the bar starts full whatever the table's turn time. */
  totalMs: number
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, dueAt - now)
  const share = Math.min(1, left / totalMs)
  const seconds = Math.ceil(left / 1000)
  return (
    <div className={cn('flex items-center gap-2', className)} aria-live="polite">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-linear',
            seconds <= 5 ? 'bg-suit-red' : 'bg-foreground/50',
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <span
        className={cn(
          'w-7 text-right text-2xs tabular-nums',
          seconds <= 5 ? 'text-suit-red' : 'text-muted-foreground',
        )}
      >
        {seconds <= 10 ? `${seconds}s` : ''}
      </span>
    </div>
  )
}
