'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { PlayingCard } from '@/components/PlayingCard'
import type { DrillKind } from '@/config/drills'
import { gradeDrill, nextDrill } from '@/lib/drills'
import type { Drill, DrillChoice } from '@/lib/drills/types'
import { type Card, cardName } from '@/lib/poker/cards'
import { haptics } from '@/lib/haptics'
import { sound } from '@/lib/sound'
import { cn } from '@/lib/utils'

/**
 * A drill, played: one spot, one decision, the answer, the next spot.
 *
 * A screen in the app rather than a widget on a page of prose (Will, 14 Aug):
 * the same AppBar, the same card faces and the same sounds as the table, so
 * dropping into a drill from the menu feels like moving around one app and not
 * like leaving it. The rhythm is the point — answer, see why, next — so the
 * board is dealt at table size and the keyboard works: 1 / 2 pick a hand,
 * 3 says they split it, and space moves on.
 *
 * **The run counter is the only thing kept, and it is kept in React state.**
 * Nothing here writes to storage or reaches for the profile: this kind is free
 * and unmetered by ruling (technology#38), so there is no counter of how many
 * you have used, no interstitial, and nothing that survives a reload. Leaving
 * the screen loses the run, which is the point of it.
 *
 * The first spot comes from the kind's `firstSeed` so the prerendered screen
 * and the hydrated screen agree on the cards; every one after it comes from a
 * fresh random seed and carries that seed with it.
 */
export function DrillRunner({ kind }: { kind: DrillKind }) {
  const router = useRouter()
  const [drill, setDrill] = useState<Drill>(() => nextDrill(kind.id, kind.firstSeed))
  const [picked, setPicked] = useState<string | null>(null)
  const [run, setRun] = useState(0)

  const grade = picked === null ? null : gradeDrill(drill, picked)
  const hands = drill.choices.filter((choice) => choice.cards.length > 0)
  const outcomes = drill.choices.filter((choice) => choice.cards.length === 0)

  const pick = useCallback(
    (choiceId: string) => {
      if (picked !== null) return
      const result = gradeDrill(drill, choiceId)
      setPicked(choiceId)
      setRun((current) => (result.correct ? current + 1 : 0))
      sound.play(result.correct ? 'win' : 'fold')
      haptics.fire(result.correct ? 'win' : 'bust')
    },
    [drill, picked],
  )

  const another = useCallback(() => {
    setPicked(null)
    // Math.random, not the engine's rng: which spot comes next is not a thing
    // that has to be reproducible. The spot itself still is, from its seed.
    setDrill(nextDrill(kind.id, Math.floor(Math.random() * 2 ** 32)))
    sound.play('deal')
    haptics.fire('deal')
  }, [kind.id])

  // Desktop plays this with the keyboard or it does not have the rhythm: a
  // mouse round-trip to a button is what makes a drill feel like a form.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (picked !== null) {
        if (key === 'enter' || key === ' ') {
          event.preventDefault()
          another()
        }
        return
      }
      const answers = drill.choices.filter((choice) => choice.cards.length > 0)
      const split = drill.choices.find((choice) => choice.cards.length === 0)
      const index = key === '1' || key === 'a' ? 0 : key === '2' || key === 'b' ? 1 : -1
      if (index >= 0 && answers[index]) {
        event.preventDefault()
        pick(answers[index].id)
      } else if ((key === '3' || key === 's') && split) {
        event.preventDefault()
        pick(split.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drill, picked, pick, another])

  return (
    <PageShell leading="back" backLabel="Drills" onBack={() => router.push('/game/drills')}>
      <div className="flex flex-1 flex-col">
        <div className="mb-6 flex items-center justify-between gap-3 px-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{kind.title}</h1>
          {run > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 rounded-full bg-foreground/[0.06] px-3 py-1 text-sm font-medium tabular-nums text-muted-foreground"
            >
              {run} in a row
            </motion.span>
          )}
        </div>

        {/* The spot. Keyed by seed so a new one arrives rather than mutating
            the old one in place. */}
        <motion.div
          key={drill.seed}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <p className="text-center text-sm text-muted-foreground">{kind.question}</p>
          <div className="mt-3 flex items-center justify-center gap-1 sm:gap-2">
            {drill.board.map((card) => (
              <PlayingCard key={cardKey(card)} card={card} size="drill" />
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {hands.map((choice, index) => (
              <HandChoice
                key={choice.id}
                choice={choice}
                shortcut={String(index + 1)}
                revealed={grade !== null}
                won={choice.winning}
                chosen={picked === choice.id}
                onPick={() => pick(choice.id)}
              />
            ))}
          </div>

          {outcomes.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => pick(choice.id)}
              disabled={grade !== null}
              className={cn(
                'mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                grade !== null && choice.winning
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                  : 'border-foreground/10 text-muted-foreground',
                grade === null &&
                  'hover:border-foreground/25 hover:text-foreground active:scale-[0.99]',
                grade !== null && !choice.winning && picked === choice.id && 'opacity-60',
              )}
            >
              <span>{choice.label}</span>
              {grade !== null && choice.winning ? (
                <Check className="size-4 shrink-0 text-emerald-500" />
              ) : (
                grade === null && (
                  <span className="hidden size-6 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-xs font-medium sm:grid">
                    3
                  </span>
                )
              )}
            </button>
          ))}
        </motion.div>

        {grade && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
          >
            <p className="text-sm font-medium">
              {grade.correct ? 'That’s it.' : 'Not this time.'}{' '}
              <span className="font-normal text-muted-foreground">{grade.explanation}</span>
            </p>
            <button
              type="button"
              onClick={another}
              className="mt-4 w-full rounded-2xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Next hand
            </button>
          </motion.div>
        )}

        {/* Small print, at the foot of the screen where it belongs. Both halves
            are load-bearing: what settles the answer, and the fact that nothing
            about this is being kept. */}
        <p className="mt-auto pt-8 text-center text-xs text-muted-foreground/80">
          {kind.gradedBy} Nothing here is saved, and the run resets when you leave.
        </p>
      </div>
    </PageShell>
  )
}

function HandChoice({
  choice,
  shortcut,
  revealed,
  won,
  chosen,
  onPick,
}: {
  choice: DrillChoice
  shortcut: string
  revealed: boolean
  won: boolean
  chosen: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={revealed}
      aria-pressed={chosen}
      // The cards are the control here, and "A♠" is read inconsistently or not
      // at all, so the button says what it holds.
      aria-label={`${choice.label}: ${choice.cards.map(cardName).join(' and ')}`}
      className={cn(
        'rounded-2xl border p-3 text-left transition',
        revealed && won ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-foreground/10',
        revealed && !won && 'opacity-60',
        !revealed && 'hover:border-foreground/25 active:scale-[0.99]',
      )}
    >
      <span className="flex items-center gap-3">
        <span className="flex gap-1.5">
          {choice.cards.map((card) => (
            <PlayingCard key={cardKey(card)} card={card} size="md" />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="text-sm font-medium">{choice.label}</span>
          {revealed && won ? (
            <Check className="size-4 shrink-0 text-emerald-500" />
          ) : (
            // The keyboard shortcut, shown rather than documented. Hidden on
            // touch, where there is nothing to press.
            !revealed && (
              <span className="hidden size-6 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-xs font-medium text-muted-foreground sm:grid">
                {shortcut}
              </span>
            )
          )}
        </span>
      </span>

      {/* Which five actually play, once the answer is out. The hand the
          evaluator read, rather than a claim about it. */}
      {revealed && choice.plays && (
        <span className="mt-3 block border-t border-foreground/10 pt-2.5">
          <span className="text-xs text-muted-foreground">{choice.detail}</span>
          <span className="mt-1.5 flex gap-1">
            {choice.plays.map((card) => (
              <PlayingCard key={cardKey(card)} card={card} size="xs" />
            ))}
          </span>
        </span>
      )}
    </button>
  )
}

const cardKey = (card: Card): string => `${card.rank}${card.suit}`
