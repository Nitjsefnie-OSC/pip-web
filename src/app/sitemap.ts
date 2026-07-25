import type { MetadataRoute } from 'next'
import { BLOG_POSTS } from '@/config/blog'

// Generated at build time into out/sitemap.xml (the app is a static export).
// Only the pages worth a crawler's time — the game itself is app, not content.

// Required for the static export — rendered once at build into out/sitemap.xml.
export const dynamic = 'force-static'

const BASE = 'https://playpip.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    '',
    '/learn',
    '/blog',
    '/credits',
    '/privacy',
    '/terms',
  ].map((path) => ({ url: `${BASE}${path}` }))
  const posts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: post.date,
  }))
  return [...pages, ...posts]
}
