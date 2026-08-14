import type { DrillKindId } from '@/lib/drills/types'

// The drills' table of contents. Each kind is a static page under
// src/app/drills/<id>/. This registry drives the index on /drills, the
// sitemap and each page's metadata, so a new kind is a generator, a folder and
// one entry here.
//
// Practice, not prose: a drill generates a spot, asks you to decide, and grades
// it out of the engine. That is the line the written guides stay on the other
// side of (see src/config/learnExamples.ts): a guide's widget illustrates what
// its page already says and never generates anything.
//
// **Nothing here is metered and nothing is counted.** Progress belongs to a
// later build, and the one kind that exists is free forever by ruling.

export interface DrillKind {
  /** URL segment under /drills, and the kind's id in the engine. */
  id: DrillKindId
  /** The page's H1 and its heading on the index. */
  title: string
  /** The <title> tag. Carries the qualifier the H1 leaves off. */
  metaTitle: string
  /** Meta description, and the blurb under the heading on the index. */
  description: string
  /** ISO date, e.g. '2026-08-14'. Drives the sitemap's lastModified. */
  date: string
  /** What settles the answer, said in one line on the page itself. */
  gradedBy: string
  /**
   * The seed behind the spot in the page's own HTML.
   *
   * The first spot is fixed rather than random so that the page a crawler (or a
   * reader with a cold cache) gets is a real drill rather than an empty frame,
   * and so the prerendered markup and the hydrated markup agree. Every spot
   * after it comes from a fresh seed.
   */
  firstSeed: number
}

export const DRILL_KINDS: DrillKind[] = [
  {
    id: 'which-hand-wins',
    title: 'Which hand wins?',
    metaTitle: 'Which hand wins? A Texas Hold’em showdown drill',
    description:
      'Two hands, one board, one question: who takes it. Dealt fresh every time and settled by the same engine Pip’s game uses. Free, unlimited, no signup.',
    date: '2026-08-14',
    gradedBy: 'Exact showdown resolution. The hands are compared, not simulated.',
    firstSeed: 36,
  },
]

/**
 * A kind's entry, or a build-time failure. Throwing rather than returning
 * undefined because the caller is a page's metadata: a route with no entry
 * would otherwise ship with a missing title and a missing canonical, and
 * nothing about that fails loudly.
 */
export function drillKind(id: DrillKindId): DrillKind {
  const kind = DRILL_KINDS.find((entry) => entry.id === id)
  if (!kind) throw new Error(`No registry entry for /drills/${id}. Add one to config/drills.ts`)
  return kind
}
