import { BLOG_POSTS, buildRssXml } from '@/config/blog'

// Generated at build time into out/rss.xml (the app is a static export).

// Required for the static export — rendered once at build into out/rss.xml.
export const dynamic = 'force-static'

export function GET(): Response {
  return new Response(buildRssXml(BLOG_POSTS), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
