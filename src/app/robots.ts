import type { MetadataRoute } from 'next'

// Required for the static export — rendered once at build into out/robots.txt.
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://playpip.io/sitemap.xml',
  }
}
