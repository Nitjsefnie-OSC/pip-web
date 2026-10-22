'use client'

// "Your games" on Home: every slow game you are in, as a small table, your
// move first. A row you scroll sideways on a phone, a grid on a wider screen.
// Absent until you have one.

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { MiniTable } from '@/components/room/MiniTable'
import { devSignedIn, roomsConfigured } from '@/lib/multiplayer/client'
import { sound } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { useRoom } from '@/store/room'
import { useSlowGames, useSlowGamesLive } from '@/store/slowGames'
import { useSync } from '@/store/sync'

export function YourGames({ delay = 0, className }: { delay?: number; className?: string }) {
  const router = useRouter()
  const signedIn = useSync((s) => s.status === 'signed-in') || devSignedIn()
  const on = roomsConfigured() && signedIn
  useSlowGamesLive(on)
  const games = useSlowGames((s) => s.games)
  const dismiss = useSlowGames((s) => s.dismiss)
  if (!on || games.length === 0) return null
  const waiting = games.filter((g) => g.yourTurn).length

  const open = (code: string) => {
    sound.play('tap')
    // You are already sitting at it: straight to the table.
    useRoom.getState().enter(code)
    router.push(`/game/room?code=${code}`)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className={cn('flex flex-col gap-3', className)}
      aria-label="Your games"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Your games</h2>
        {waiting > 0 && (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {waiting === 1 ? '1 move to make' : `${waiting} moves to make`}
          </span>
        )}
      </div>
      <div className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-3 pt-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {games.map((g) => (
          <div
            key={g.code}
            className="relative w-[78vw] max-w-[19rem] shrink-0 md:w-auto md:max-w-none"
          >
            <MiniTable card={g} onOpen={() => open(g.code)} className="w-full" />
            {g.phase === 'finished' && (
              <button
                type="button"
                onClick={() => {
                  sound.play('tap')
                  dismiss(g.code)
                }}
                aria-label="Remove this game"
                className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-table-shade/80 text-muted-foreground ring-1 ring-foreground/10 transition hover:text-foreground active:scale-90"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  )
}
