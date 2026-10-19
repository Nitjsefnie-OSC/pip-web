import test from 'ava'
import { BLOG_POSTS, buildRssXml } from '@/config/blog'
import { articleHtml, withFullText } from '../scripts/feed-full-text.mjs'

const SITE = 'https://playpip.io'

// The shape a built post has: back link, title, date, then the article.
const page = (body: string) =>
  `<html><body><header>nav</header><main class="x"><div class="max-w-2xl"><a class="mb-6" href="/blog"><svg viewBox="0 0 24 24"><path d="m12"></path></svg>All posts</a><h1 class="text-3xl">Title</h1><p class="mt-2">15 September 2026</p><div class="mt-10"><section class="mt-9">${body}</section></div></div></main><footer>foot</footer></body></html>`

test('the article keeps the prose and drops the chrome, styling and title', (t) => {
  const html = articleHtml(
    page(
      '<h2 class="text-lg">Heading</h2><p>A <a href="/learn" target="_blank" rel="noreferrer" class="u">link</a>,<!-- --> <code>x</code>.</p>',
    ),
    SITE,
  )
  t.is(html, `<h2>Heading</h2><p>A <a href="${SITE}/learn">link</a>, <code>x</code>.</p>`)
})

test('every item for a built post carries its full text, and the feed declares the namespace', (t) => {
  const xml = withFullText(buildRssXml(BLOG_POSTS), SITE, (slug) =>
    page(`<p>Body of ${slug} &amp; more</p>`),
  )
  t.true(xml.includes('xmlns:content="http://purl.org/rss/1.0/modules/content/"'))
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  t.is(items.length, BLOG_POSTS.length)
  for (const [i, item] of items.entries()) {
    const slug = BLOG_POSTS[i].slug
    t.true(
      item.includes(
        `<content:encoded><![CDATA[<p>Body of ${slug} &amp; more</p>]]></content:encoded>`,
      ),
      slug,
    )
    // The summary stays, for readers that only show that.
    t.true(item.includes('<description>'), slug)
  }
})

test('a post with no built page keeps its summary only, and running twice adds nothing', (t) => {
  const once = withFullText(buildRssXml(BLOG_POSTS), SITE, () => null)
  t.false(once.includes('<content:encoded>'))
  const full = withFullText(buildRssXml(BLOG_POSTS), SITE, () => page('<p>x</p>'))
  t.is(
    withFullText(full, SITE, () => page('<p>x</p>')),
    full,
  )
})

test('a post containing the CDATA terminator cannot close the section early', (t) => {
  const xml = withFullText(buildRssXml(BLOG_POSTS.slice(0, 1)), SITE, () => page('<p>a]]>b</p>'))
  t.true(xml.includes('<![CDATA[<p>a]]]]><![CDATA[>b</p>]]>'))
})
