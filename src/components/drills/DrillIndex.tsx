'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { SectionScreen } from '@/components/menu/SectionScreen'
import { DRILL_KINDS, type DrillKind } from '@/config/drills'
import { nextDrill } from '@/lib/drills'
import { PlayingCard } from '@/components/PlayingCard'
import { sound } from '@/lib/sound'

/**
 * The drills room: one tile per kind, the same shape as the venue browsers.
 *
 * It exists with one kind on it because it is where the kinds land, and because
 * "Drills" on the menu going straight into one kind would have to be rewired
 * the day there are two. Nothing here is counted, scored or remembered — see
 * the note in config/drills.ts.
 */
export function DrillIndex() {
  return (
    <SectionScreen
      title="Drills"
      subtitle="Short spots with a right answer. Play one, play forty, nothing is keeping score."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {DRILL_KINDS.map((kind, i) => (
          <DrillTile key={kind.id} kind={kind} delay={i * 0.05} />
        ))}
      </div>
    </SectionScreen>
  )
}

/**
 * A kind's tile, with a real spot from that kind drawn on it — the first seed,
 * the same one the drill itself opens on, so the tile is a window into the
 * thing rather than an illustration of it.
 */
function DrillTile({ kind, delay }: { kind: DrillKind; delay: number }) {
  const router = useRouter()
  const drill = nextDrill(kind.id, kind.firstSeed)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="w-full"
    >
      <button
        onClick={() => {
          sound.play('tap')
          router.push(`/game/drills/${kind.id}`)
        }}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.02] text-left transition hover:border-foreground/25 hover:bg-foreground/[0.05] active:scale-[0.99]"
      >
        <div className="relative flex w-full items-center justify-center gap-1.5 bg-foreground/[0.04] px-4 py-6">
          {drill.board.map((card) => (
            <PlayingCard key={`${card.rank}${card.suit}`} card={card} size="sm" />
          ))}
          <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-black/30 backdrop-blur-sm">
            <ChevronRight className="size-4 text-white/85 transition group-hover:translate-x-0.5" />
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-semibold">{kind.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{kind.blurb}</p>
        </div>
      </button>
    </motion.div>
  )
}
