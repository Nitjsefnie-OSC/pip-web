import type { DrillKindId } from '@/lib/drills/types'

// The drills' table of contents. Each kind is a screen in the app, under
// /game/drills/<id>, and this registry drives both the index and the route's
// static params, so a new kind is a generator and one entry here.
//
// **Drills are app, not content.** They sit inside the game next to the tables
// rather than on a page of the website: a drill is something you play, and the
// prose about poker lives in /learn on the other side of the wall. Nothing here
// carries meta titles or sitemap dates for that reason.
//
// Practice, not prose: a drill generates a spot, asks you to decide, and grades
// it out of the engine. That is the line the written guides stay on the other
// side of (see src/config/learnExamples.ts): a guide's widget illustrates what
// its page already says and never generates anything.
//
// **Nothing here is metered.** No counter of how many you have left, no
// interstitial, nothing written to storage. The one kind that exists is free
// forever by ruling, and progress that outlives the screen belongs to a later
// build.

export interface DrillKind {
  /** URL segment under /game/drills, and the kind's id in the engine. */
  id: DrillKindId
  /** The kind's name, on the index tile and at the top of its screen. */
  title: string
  /** One line under the title on the index. What you are about to do. */
  blurb: string
  /** The question itself, asked once per spot above the board. */
  question: string
  /** What settles the answer, said once in small print under the drill. */
  gradedBy: string
  /**
   * The seed behind the first spot of a run.
   *
   * Fixed rather than random so the prerendered screen and the hydrated screen
   * agree on the cards: the app is a static export, so the first spot is dealt
   * at build time. Every spot after it comes from a fresh seed.
   */
  firstSeed: number
}

export const DRILL_KINDS: DrillKind[] = [
  {
    id: 'which-hand-wins',
    title: 'Which hand wins?',
    blurb: 'Two hands, a finished board, one question. Free and unlimited.',
    question: 'Which hand takes it?',
    gradedBy: 'Settled by the same code that settles a showdown at the table, card by card.',
    firstSeed: 36,
  },
]

/**
 * A kind's entry, or a failure. Throwing rather than returning undefined
 * because the callers are a route's static params and a screen's title: a kind
 * with no entry would otherwise render an untitled screen, and nothing about
 * that fails loudly.
 */
export function drillKind(id: string): DrillKind {
  const kind = DRILL_KINDS.find((entry) => entry.id === id)
  if (!kind) throw new Error(`No registry entry for drill "${id}". Add one to config/drills.ts`)
  return kind
}
