import type { Metadata } from 'next'
import Link from 'next/link'
import { DrillRunner } from '@/components/drills/DrillRunner'
import { Lead } from '@/components/learn/Guide'
import { LegalPage, Section } from '@/components/marketing/LegalPage'
import { drillKind } from '@/config/drills'
import { contentAlternates, contentSocial } from '@/config/site'

// The free kind, and the one a stranger meets first.
//
// No structured data on purpose. The spot is generated per visit, so there is
// no fixed question for a Quiz block to describe, and marking up a question
// that is not the one on the page is the kind of claim we do not make.
//
// The shape follows /poker-odds-calculator: the thing itself first, then the
// prose that says why this one is worth doing. The widget opts out of the
// Markdown mirrors (its cards would arrive as loose glyphs); everything under
// it is content and belongs in them.

const KIND = 'which-hand-wins'
const PATH = `/drills/${KIND}`

const kind = drillKind(KIND)

export const metadata: Metadata = {
  title: `${kind.metaTitle} | Pip`,
  description: kind.description,
  alternates: contentAlternates(PATH),
  ...contentSocial({
    path: PATH,
    title: kind.title,
    description: kind.description,
    type: 'website',
  }),
}

const link =
  'font-medium text-foreground underline decoration-foreground/25 underline-offset-2 transition hover:decoration-foreground'

export default function WhichHandWinsPage() {
  return (
    <LegalPage title={kind.title} back={{ href: '/drills', label: 'Poker drills' }}>
      <Lead>
        <p>
          Two hands, five cards on the table, one question. Pick the hand that takes it, or say they
          split it.
        </p>
      </Lead>

      <DrillRunner kind={kind.id} firstSeed={kind.firstSeed} />

      <p className="mt-5 text-md leading-relaxed text-muted-foreground">
        Every spot is dealt from a fresh shuffle in your browser, and the answer is settled by the
        same code that settles a showdown in{' '}
        <Link href="/game" className={link}>
          Pip’s game
        </Link>
        : the two hands are compared card by card, not simulated. There is no counter on this, no
        score, and nothing here remembers you were on the page.
      </p>

      <Section title="What to look at first">
        <p>
          Find each hand’s best five cards out of the seven available to it, then compare those two
          fives. Most of the mistakes people make at a real table happen before that: they compare
          two hole cards to two hole cards, or they miss that the board has already made the hand
          for both players.
        </p>
        <p>
          When both hands land on the same thing, the next card decides it, and that is the quiet
          way most beginner pots are lost. A pair of kings with an ace beside it beats the same pair
          of kings with a nine, and nothing about the two hands looks different until you count.
        </p>
        <p>
          Splits are rarer than they feel, and they are worth waiting for. If the best five cards
          are all on the table, everybody still in the hand has exactly the same hand.{' '}
          <Link href="/learn/hand-rankings" className={link}>
            What beats what
          </Link>{' '}
          covers the order the hands come in, and{' '}
          <Link href="/learn/how-to-play-texas-holdem" className={link}>
            the rules
          </Link>{' '}
          cover how the five cards get there.
        </p>
      </Section>

      <Section title="How it is graded">
        <p>
          {kind.gradedBy} Two hands and a finished board have one right answer, so this works it out
          rather than estimating it. That is deliberate. A spot settled by a simulation is settled
          by a number with a margin of error on it, and on a bad day that marks a correct answer
          wrong. Something that grades you should not be able to do that.
        </p>
        <p>
          Pip is{' '}
          <a
            href="https://github.com/playpip/pip-web"
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            open source
          </a>
          , so the evaluator behind these answers is readable rather than something to take on
          trust. If you want a number rather than a winner, the{' '}
          <Link href="/poker-odds-calculator" className={link}>
            odds calculator
          </Link>{' '}
          works out how often a hand wins from where it stands.
        </p>
      </Section>
    </LegalPage>
  )
}
