// The frame for a written guide under /learn/<slug>. Prose pages, so they use
// the same narrow marketing column as the blog and the legal pages rather than
// anything new — the only additions are a table that survives a phone, and the
// structured data that gets a rankings table pulled into a rich result.

import Link from 'next/link'
import { LegalPage } from '@/components/marketing/LegalPage'
import { guideBySlug, relatedGuides } from '@/config/learn'

const SITE = 'https://playpip.io'

/**
 * A guide's page chrome: the marketing column, the Article structured data,
 * and the sibling links at the foot. Siblings that haven't been written yet
 * are dropped by relatedGuides(), so the block simply gets shorter.
 */
export function GuidePage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const guide = guideBySlug(slug)
  if (!guide) throw new Error(`No registry entry for /learn/${slug} — add one to config/learn.ts`)
  const siblings = relatedGuides(slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.metaTitle,
    description: guide.description,
    datePublished: guide.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/learn/${guide.slug}` },
    author: { '@type': 'Organization', name: 'Pip', url: SITE },
    publisher: { '@type': 'Organization', name: 'Pip', url: SITE },
    isAccessibleForFree: true,
  }

  return (
    <LegalPage title={guide.title} back={{ href: '/learn', label: 'Learn poker' }}>
      {/* Stripped from the Markdown mirrors by gen-llms.mjs, which drops <script>. */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: a build-time constant, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {children}

      {siblings.length > 0 && (
        <section className="mt-12 border-t border-foreground/10 pt-6">
          <h2 className="text-sm font-medium text-foreground">Keep going</h2>
          <ul className="mt-3 space-y-2">
            {siblings.map((sibling) => (
              <li key={sibling.slug}>
                <Link
                  href={`/learn/${sibling.slug}`}
                  className="text-[15px] text-muted-foreground underline decoration-foreground/20 underline-offset-2 transition hover:text-foreground hover:decoration-foreground"
                >
                  {sibling.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </LegalPage>
  )
}

/**
 * The direct answer, before any preamble. Set a step up from body copy because
 * it is the part someone who opened the page mid-hand actually needs.
 */
export function Lead({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-base leading-relaxed text-foreground/90">{children}</div>
}

/**
 * A guide's table. Scrolls inside its own box rather than pushing the page
 * sideways, which is the whole difficulty on a phone. Cell styling is applied
 * from here so the pages stay plain markup.
 */
export function GuideTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 mt-5 overflow-x-auto px-6 md:mx-0 md:px-0">
      <table className="w-full min-w-md border-collapse text-left text-[15px] [&_td]:border-t [&_td]:border-foreground/10 [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:font-medium [&_th]:text-foreground">
        {children}
      </table>
    </div>
  )
}

/** The one "now go and try it" block. Once per page, quiet, and a real link. */
export function TryIt({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-12 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6">
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
      <Link
        href="/game"
        className="mt-5 inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
      >
        Play a hand
      </Link>
    </section>
  )
}
