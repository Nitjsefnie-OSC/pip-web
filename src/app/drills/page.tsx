import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LegalPage } from '@/components/marketing/LegalPage'
import { DRILL_KINDS } from '@/config/drills'
import { contentAlternates, contentSocial } from '@/config/site'

// The practice half of Learn. /learn is what a hand is; this is doing one.
//
// The index exists even with a single drill on it, because /drills is what
// somebody gets when they trim the URL and a 404 there is a worse answer than
// a short list. It also has one job the drill page cannot do: saying what a
// drill is, in prose a crawler can read, without interrupting the drill.

const DESCRIPTION =
  'Poker practice with a right answer. Spots dealt fresh every time and graded by the engine Pip’s game runs on. Free, unlimited, no signup.'

export const metadata: Metadata = {
  title: 'Poker drills · Pip',
  description: DESCRIPTION,
  alternates: contentAlternates('/drills'),
  ...contentSocial({
    path: '/drills',
    title: 'Poker drills',
    description: DESCRIPTION,
    type: 'website',
  }),
}

export default function DrillsPage() {
  return (
    <LegalPage
      title="Poker drills"
      subtitle="Reading about a hand and reading a hand are different skills. This is the second one."
    >
      <p className="text-md leading-relaxed text-muted-foreground">
        A drill deals you a spot, asks you one question about it, and then shows you the arithmetic.
        Nothing is scored, nothing is remembered, and there is no counter telling you how many you
        have left. Do one, do forty, close the tab.
      </p>

      <ul className="mt-8 space-y-3">
        {DRILL_KINDS.map((kind) => (
          <li key={kind.id}>
            <Link
              href={`/drills/${kind.id}`}
              className="group block rounded-2xl border border-foreground/10 p-5 transition hover:border-foreground/20 hover:bg-foreground/[0.02]"
            >
              <h2 className="flex items-center gap-1.5 text-[1.0625rem] font-semibold tracking-tight">
                {kind.title}
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </h2>
              <p className="mt-1.5 text-md leading-relaxed text-muted-foreground">
                {kind.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-md leading-relaxed text-muted-foreground">
        If you want the rules rather than the practice, the{' '}
        <Link
          href="/learn"
          className="font-medium text-foreground underline decoration-foreground/25 underline-offset-2 transition hover:decoration-foreground"
        >
          written guides
        </Link>{' '}
        are next door.
      </p>
    </LegalPage>
  )
}
