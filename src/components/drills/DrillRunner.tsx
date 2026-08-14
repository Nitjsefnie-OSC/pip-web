'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { PlayingCard } from '@/components/PlayingCard'
import { gradeDrill, nextDrill } from '@/lib/drills'
import type { Drill, DrillChoice, DrillKindId } from '@/lib/drills/types'
import { type Card, cardName } from '@/lib/poker/cards'
import { cn } from '@/lib/utils'

/**
 * The drill runner: one spot, one decision, the arithmetic, another spot.
 *
 * Tutorial.tsx's shape rather than a quiz's. There is no counter, no score, no
 * "3 of 8", nothing kept between visits and nothing written to storage: this
 * kind is free and unmetered by ruling, and a tally is how that would quietly
 * stop being true. Getting one wrong gets you the explanation, not a verdict.
 *
 * The first spot is fixed (the kind's `firstSeed`) so the page prerenders a
 * real drill and hydration has nothing to disagree about. Every one after it
 * comes from a fresh random seed, and carries that seed with it.
 */
export function DrillRunner({ kind, firstSeed }: { kind: DrillKindId; firstSeed: number }) {
  const [drill, setDrill] = useState<Drill>(() => nextDrill(kind, firstSeed))
  const [picked, setPicked] = useState<string | null>(null)

  const grade = picked === null ? null : gradeDrill(drill, picked)
  const hands = drill.choices.filter((choice) => choice.cards.length > 0)
  const outcomes = drill.choices.filter((choice) => choice.cards.length === 0)

  const another = () => {
    setPicked(null)
    // Math.random, not the engine's rng: which spot comes next is not a thing
    // that has to be reproducible. The spot itself still is, from its seed.
    setDrill(nextDrill(kind, Math.floor(Math.random() * 2 ** 32)))
  }

  return (
    <section
      // Interactive, so it carries no meaning in the Markdown mirrors: the
      // cards would arrive as a column of loose glyphs. scripts/gen-llms.mjs
      // drops anything marked this way, and the prose below the widget says
      // what the drill is for.
      data-mirror="skip"
      className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-6"
    >
      <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        The board
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {drill.board.map((card) => (
          <PlayingCard key={cardKey(card)} card={card} size="sm" />
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {hands.map((choice) => (
          <HandChoice
            key={choice.id}
            choice={choice}
            revealed={grade !== null}
            won={choice.winning}
            chosen={picked === choice.id}
            onPick={() => setPicked((current) => current ?? choice.id)}
          />
        ))}
      </div>

      {outcomes.map((choice) => (
        <button
          key={choice.id}
          type="button"
          onClick={() => setPicked((current) => current ?? choice.id)}
          disabled={grade !== null}
          className={cn(
            'mt-3 w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition',
            grade !== null && choice.winning
              ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
              : 'border-foreground/10 text-muted-foreground',
            grade === null &&
              'hover:border-foreground/25 hover:text-foreground active:scale-[0.99]',
            grade !== null && !choice.winning && picked === choice.id && 'opacity-60',
          )}
        >
          {choice.label}
        </button>
      ))}

      {grade && (
        <div className="mt-5 border-t border-foreground/10 pt-4">
          <p className="text-sm font-medium">
            {grade.correct ? 'That’s it.' : 'Not this time.'}{' '}
            <span className="font-normal text-muted-foreground">{grade.explanation}</span>
          </p>
          <button
            type="button"
            onClick={another}
            className="mt-4 rounded-xl bg-foreground/[0.06] px-4 py-2 text-sm font-medium transition hover:bg-foreground/[0.12] active:scale-[0.98]"
          >
            Another one
          </button>
        </div>
      )}
    </section>
  )
}

function HandChoice({
  choice,
  revealed,
  won,
  chosen,
  onPick,
}: {
  choice: DrillChoice
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
        'rounded-xl border p-3 text-left transition',
        revealed && won ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-foreground/10',
        revealed && !won && 'opacity-60',
        !revealed && 'hover:border-foreground/25 active:scale-[0.99]',
      )}
    >
      <span className="flex items-center gap-3">
        <span className="flex gap-1.5">
          {choice.cards.map((card) => (
            <PlayingCard key={cardKey(card)} card={card} size="sm" />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="text-sm font-medium">{choice.label}</span>
          {revealed && won && <Check className="size-4 shrink-0 text-emerald-500" />}
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
