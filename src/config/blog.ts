// The blog's table of contents. Each post is a static page under
// src/app/blog/<slug>/ — this registry drives the index page, the sitemap, and
// per-post metadata, so a new post is one folder plus one entry here.

export interface BlogPost {
  /** URL segment — must match the post's folder under src/app/blog/. */
  slug: string
  title: string
  /** One-line summary, used on the index and as the meta description. */
  description: string
  /** ISO date, e.g. '2026-07-25'. */
  date: string
}

/** Newest first — the index renders this order as-is. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'pip-is-live',
    title: 'Pip is live, and it’s open source',
    description:
      'Single-player Texas Hold’em with no accounts, no ads, and no real money — now live at playpip.io, with the whole codebase in the open.',
    date: '2026-07-25',
  },
]

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** '2026-07-25' -> '25 July 2026'. Fixed format — no locale or timezone involved. */
export function formatPostDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}
