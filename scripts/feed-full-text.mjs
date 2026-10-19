/**
 * Puts each blog post's full text into the built RSS feed.
 *
 * `next build` bakes out/rss.xml from the registry, which only knows a post's
 * title and summary. Readers that import from a feed (Dev.to, Hashnode) take
 * whatever the item carries, so a summary-only feed imports as a summary-only
 * draft. gen-llms.mjs runs this after the build, when the posts exist as HTML,
 * and adds each post's article as <content:encoded>.
 */

const CONTENT_NS = 'xmlns:content="http://purl.org/rss/1.0/modules/content/"'

/**
 * A built post's article as plain HTML: no site chrome, no styling, no icons,
 * and every link absolute so it still works on someone else's site. The back
 * link, the <h1> and the date line go, because a feed item has its own title
 * and date.
 *
 * @param {string} pageHtml
 * @param {string} site
 * @returns {string}
 */
export function articleHtml(pageHtml, site) {
  const main = pageHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? ''
  return (
    main
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/^[\s\S]*?<\/h1>\s*(<p[^>]*>[^<]*<\/p>)?/i, '')
      .replace(/\s(class|style|target|rel|aria-[\w-]+|data-[\w-]+)="[^"]*"/g, '')
      .replace(/(href|src)="\//g, `$1="${site}/`)
      // Layout wrappers left empty-handed once their classes are gone.
      .replace(/<\/?(div|section)>/g, '')
      .trim()
  )
}

/** CDATA cannot contain its own terminator; split it across two sections. */
const cdata = (/** @type {string} */ text) =>
  `<![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`

/**
 * The feed with <content:encoded> added to every item whose post `readPost`
 * can find. `readPost(slug)` returns the built page's HTML, or null.
 *
 * @param {string} xml
 * @param {string} site
 * @param {(slug: string) => string | null} readPost
 * @returns {string}
 */
export function withFullText(xml, site, readPost) {
  const withNs = xml.includes(CONTENT_NS) ? xml : xml.replace('<rss ', `<rss ${CONTENT_NS} `)
  return withNs.replace(/<item>[\s\S]*?<\/item>/g, (item) => {
    const slug = item.match(/<link>[^<]*\/blog\/([^<]+)<\/link>/)?.[1]
    const page = slug ? readPost(slug) : null
    if (!page || item.includes('<content:encoded>')) return item
    const content = `      <content:encoded>${cdata(articleHtml(page, site))}</content:encoded>\n`
    return item.replace(/(\s*<pubDate>)/, `\n${content.trimEnd()}$1`)
  })
}
