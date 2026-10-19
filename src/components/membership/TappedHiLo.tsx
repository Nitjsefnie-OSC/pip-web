'use client'

// One Hi-Lo showdown, under the answer to a tap on The Split's padlock. The
// blurb above says every pot is cut in half and that each half is usually won
// with a different two cards; this is a hand where both happen. Read-only,
// like the Omaha showdown beside it: a look at the game, not a hand of it.
//
// Loaded on its own (`next/dynamic` in TappedFor), so the evaluators and the
// cast reach the browser only for somebody who tapped this padlock.

import { Board, Felt, Holding, TalkLine, cardKey } from '@/components/drills/felt'
import { rosterFor } from '@/config/cast'
import { HI_LO_TABLES } from '@/config/venues'
import { hiLoLine, hiLoSample } from '@/lib/membership/hiLoSample'
import type { Card } from '@/lib/poker/cards'

// Fixed, so the page is the same hand for everybody and a reviewer can check
// it. First of the cheapest room's regulars, in cast order.
const showdown = hiLoSample()
const opponent = rosterFor(HI_LO_TABLES[0])[0]

const ringed = (plays: readonly Card[]) => {
  const keys = new Set(plays.map(cardKey))
  return (card: Card) => keys.has(cardKey(card))
}

export function TappedHiLo() {
  const { board, hero, them } = showdown

  return (
    <figure className="mt-5 rounded-xl border border-foreground/10 bg-background/60 py-4">
      <figcaption className="px-4 text-sm text-muted-foreground">
        One showdown at The Split.
      </figcaption>
      <div className="mt-3 flex flex-col">
        <Felt
          across={
            <Holding
              label={opponent.name}
              avatar={opponent.avatar}
              detail={`high: ${them.highPhrase}`}
              cards={them.cards}
              glow={ringed(them.high)}
            />
          }
          board={
            <>
              <Board cards={board} />
              <TalkLine>{hiLoLine(showdown, opponent.name)}</TalkLine>
            </>
          }
          hero={
            <Holding
              label="You"
              detail={`low: ${hero.lowPhrase}`}
              cards={hero.cards}
              layout="below"
              glow={ringed(hero.low ?? [])}
            />
          }
        />
      </div>
      <p className="mt-3 px-4 text-sm text-muted-foreground">
        Ringed: the two from each hand that win its half.
      </p>
    </figure>
  )
}
