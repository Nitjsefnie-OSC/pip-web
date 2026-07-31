/**
 * Post-build script that emits LLM-friendly content alongside the static
 * export, following https://llmstxt.org/:
 *
 *   1. For each content page, write a raw Markdown mirror at the page's URL
 *      plus `.md` (e.g. /privacy -> /privacy.md), produced by extracting the
 *      built page's main content and converting it to Markdown. Blog posts are
 *      discovered automatically from out/blog/, so a new post needs no change
 *      here.
 *   2. Emit /llms.txt at the site root: the hand-written summary of what Pip
 *      is, then an index of every page linking to its raw Markdown.
 *
 * Runs after `next build` (see the build script in package.json) and writes
 * into the static `out/` export. The app pages (/play, /game, /stats, /learn)
 * are interactive, not content, so they get no mirror.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import TurndownService from 'turndown'

const SITE = 'https://playpip.io'
const OUT = join(process.cwd(), 'out')

// The hand-written head of llms.txt — what Pip is, in prose. The generated
// page index follows it.
const PREAMBLE = `# Pip

> Real single-player Texas Hold'em against AI — no account needed, no real money, open
> source. A calm, anti-casino poker web app: play money only, no ads, no pop-ups, no
> dark patterns. Play in the browser at https://playpip.io — no signup, nothing to
> install.

Pip is a front-end app (static export, no game server). Your profile lives in your
browser. The poker engine is a pure, deterministic, unit-tested TypeScript module, so
you can read exactly how every hand is shuffled and dealt rather than take our word for
it. An ordinary hand shuffles with Math.random; the Daily Deal passes a date-derived
seed, which is what makes one tournament a day identical for everyone in the world and
checkable against the source.

There is one optional account, and its only job is carrying your progress to a second
device. It is off unless you turn it on: with no account Pip makes no request to a
server, holds no identity and stores no row.

Privacy: no account needed, no cookies, no personal data. An account stores your email
and the same profile that was already on your device, and nothing else. The only
analytics are anonymous and cookieless (Umami); the privacy page lists exactly what is
counted.

Every link under Pages and Blog points to the page's raw Markdown mirror, so the content
can be fetched and parsed directly without HTML rendering.`

const FOOTER = `## Project

- [Source code](https://github.com/playpip/pip-web): The full open-source repo (MIT).
- [Roadmap](https://github.com/playpip/pip-web/blob/main/ROADMAP.md): Where Pip is going, in the open.
- [Contributing](https://github.com/playpip/pip-web/blob/main/CONTRIBUTING.md): How to get involved — code or not.

## What it is

- Single-player Texas Hold'em against a fixed cast of AI opponents with faces and personalities.
- A ladder of ten sit-and-go tournaments, from Friends' Garage to The Main Event, plus side formats.
- Play money only — nothing costs real money, ever. Cosmetics are style, never edge (no pay-to-win).
- Hand permalinks: share any hand as a URL that replays step by step, with no server or account.
- Ambient help: live win-% equity, hand strength, plain-English opponent reads.
- Learn poker in three minutes: an interactive tutorial at https://playpip.io/learn (app, not prose — no Markdown mirror).
- Installable PWA; light and dark themes; works offline once loaded.`

// Content pages with a Markdown mirror. Blog posts are appended automatically.
const PAGES = [
  { route: '/', file: 'index.html' },
  { route: '/blog', file: 'blog.html' },
  { route: '/credits', file: 'credits.html' },
  { route: '/privacy', file: 'privacy.html' },
  { route: '/terms', file: 'terms.html' },
]

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})
// Decorative/interactive-only elements carry no meaning in Markdown.
turndown.remove(['script', 'style', 'svg', 'noscript'])
// Icon-only links (their SVG stripped) would render as empty `[](url)` noise.
turndown.addRule('stripEmptyLinks', {
  filter: (node) => node.nodeName === 'A' && !node.textContent.trim(),
  replacement: () => '',
})

/** Decode the handful of HTML entities Next emits into meta content. */
function decodeEntities(text) {
  return text
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** The page's <title> without the site suffix, and its meta description. */
function readMeta(html) {
  const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
    .replace(/\s*[·—-]\s*Pip\s*$/u, '')
    .trim()
  const description = decodeEntities(
    html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '',
  )
  return { title: title || 'Pip', description }
}

/**
 * Isolate a page's readable content: prefer <main>, otherwise fall back to
 * <body>, and strip the shared header/footer chrome either way.
 */
function extractContentHtml(html) {
  const region =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html
  return region
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
}

/** Write `<route>.md` for a built page and return its index entry. */
function writeMirror(page) {
  const html = readFileSync(join(OUT, page.file), 'utf-8')
  const { title, description } = readMeta(html)
  const markdown = turndown
    .turndown(extractContentHtml(html))
    .replace(/\n{3,}/g, '\n\n')
    // Site-relative links work in a browser but not in a fetched .md file.
    .replace(/\]\(\//g, `](${SITE}/`)
    .trim()
    // A leading standalone link is chrome (e.g. a post's back-link), not content.
    .replace(/^\[[^\]]+\]\([^)]*\)\s*/, '')
  const relative = page.route === '/' ? 'index' : page.route.replace(/^\//, '')
  // Pages render their own <h1>; only add one when the content lacks it.
  const body = markdown.startsWith('# ') ? markdown : `# ${title}\n\n${markdown}`
  writeFileSync(join(OUT, `${relative}.md`), `${body}\n`)
  return { route: `/${relative}.md`, title, description }
}

/** Every built blog post, newest first (dated in the sitemap). */
function blogPages() {
  const lastmod = new Map()
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf-8')
  for (const m of sitemap.matchAll(
    /<loc>([^<]*\/blog\/[^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g,
  )) {
    lastmod.set(new URL(m[1]).pathname, m[2])
  }
  return readdirSync(join(OUT, 'blog'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ route: `/blog/${f.replace(/\.html$/, '')}`, file: `blog/${f}` }))
    .sort((a, b) => (lastmod.get(b.route) ?? '').localeCompare(lastmod.get(a.route) ?? ''))
}

const line = (e) => `- [${e.title}](${SITE}${e.route})${e.description ? `: ${e.description}` : ''}`

const pageEntries = PAGES.map(writeMirror)
const blogEntries = blogPages().map(writeMirror)

const sections = [PREAMBLE, '## Pages', pageEntries.map(line).join('\n')]
if (blogEntries.length > 0) sections.push('## Blog', blogEntries.map(line).join('\n'))
sections.push(FOOTER)

writeFileSync(join(OUT, 'llms.txt'), `${sections.join('\n\n')}\n`)
console.log(
  `gen-llms: wrote llms.txt + ${pageEntries.length + blogEntries.length} markdown mirror(s).`,
)
