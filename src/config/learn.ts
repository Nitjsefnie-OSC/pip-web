// The written guides' table of contents. Each guide is a static page under
// src/app/learn/<slug>/ — this registry drives the index on /learn, the
// sitemap, the Markdown mirrors, and per-page metadata, so a new guide is one
// folder plus one entry here.
//
// These are prose pages, and a different thing from the interactive tour that
// /learn itself renders. The tour stays exactly as it is: free, unmetered, one
// URL. See ../components/learn/Tutorial.tsx.

export interface LearnGuide {
  /** URL segment — must match the guide's folder under src/app/learn/. */
  slug: string
  /** The page's H1 and its heading on the index. The query, near-verbatim. */
  title: string
  /** The <title> tag — carries the qualifier the H1 leaves off. */
  metaTitle: string
  /** Meta description, and the blurb under the heading on the index. */
  description: string
  /** ISO date, e.g. '2026-08-05'. Drives the sitemap's lastModified. */
  date: string
  /**
   * Sibling guides linked at the foot of the page. Slugs that aren't in this
   * registry yet are dropped rather than rendered, so a guide can name the
   * siblings it wants before they're written without shipping a dead link.
   */
  related: string[]
}

/**
 * Ranked, not dated — the index renders this order as-is. The ranking is by
 * query intent (see the marketing plan), and it is explicitly not settled:
 * once Search Console has a few months of real impressions, it should be
 * reordered from that rather than from reasoning.
 */
export const LEARN_GUIDES: LearnGuide[] = [
  {
    slug: 'hand-rankings',
    title: 'Poker hand rankings',
    metaTitle: 'Poker hand rankings: what beats what in Texas Hold’em',
    description:
      'All ten poker hands in order, strongest to weakest, with how ties are settled and how often each one actually turns up. No signup, and you can practise straight away.',
    date: '2026-08-05',
    related: ['how-to-play-texas-holdem', 'starting-hands', 'position'],
  },
]

export function guideBySlug(slug: string): LearnGuide | undefined {
  return LEARN_GUIDES.find((guide) => guide.slug === slug)
}

/**
 * The siblings a guide links to, filtered to the ones that actually exist.
 * Order follows the guide's own `related` list, not the registry's.
 */
export function relatedGuides(slug: string): LearnGuide[] {
  const guide = guideBySlug(slug)
  if (!guide) return []
  return guide.related
    .map(guideBySlug)
    .filter((sibling): sibling is LearnGuide => sibling !== undefined)
}
