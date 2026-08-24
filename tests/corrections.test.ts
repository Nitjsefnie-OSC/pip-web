import { existsSync, readFileSync, readdirSync } from 'node:fs'
import test from 'ava'
import { BLOG_POSTS } from '@/config/blog'
import { CORRECTIONS, daysLive } from '@/config/corrections'
import { BAND_ORDER, HAND_BANDS } from '@/config/startingHands'

// The corrections list is the one page on the site whose subject is our own
// mistakes, which makes getting it wrong the single funniest failure available
// to us. So it gets more checking than anything it lists.
//
// The load-bearing test is the last one: a fixed row names a fragment of what it
// used to say, and that fragment must appear nowhere in the source but the
// registry and the post itself. That turns every row into a live guard rather
// than a memory of one.

const ISO = /^\d{4}-\d{2}-\d{2}$/

const repoFile = (path: string) => new URL(`../${path}`, import.meta.url)

test('every row is filled in', (t) => {
  t.true(CORRECTIONS.length > 0)
  for (const c of CORRECTIONS) {
    t.true(c.id.length > 0, 'id')
    t.true(c.where.length > 0, `${c.id}: where`)
    t.true(c.said.length > 0, `${c.id}: said`)
    t.true(c.wrong.length > 0, `${c.id}: wrong`)
    t.true(c.caught.length > 0, `${c.id}: caught`)
  }
})

test('ids are unique', (t) => {
  const ids = CORRECTIONS.map((c) => c.id)
  t.is(new Set(ids).size, ids.length)
})

test('dates are ISO, and a fix never precedes the claim', (t) => {
  for (const c of CORRECTIONS) {
    t.regex(c.liveFrom, ISO, `${c.id}: liveFrom`)
    if (c.fixedOn === null) continue
    t.regex(c.fixedOn, ISO, `${c.id}: fixedOn`)
    t.true(c.fixedOn >= c.liveFrom, `${c.id}: fixed before it was live`)
    t.true((daysLive(c) ?? -1) >= 0, `${c.id}: negative days`)
  }
})

/**
 * A post is a dated record of what was true that morning, so a wrong one is not
 * edited: it keeps its sentence and gains a correction note under the title.
 * That is why the blog rows carry no `gone` fragment. Their guard is that the
 * note exists, which blogClaims.test.ts enforces and which is checked below too.
 */
const isPost = (c: (typeof CORRECTIONS)[number]) => c.where.every((p) => p.startsWith('/blog/'))

test('an open row has no fix date and no guard, a fixed row has both', (t) => {
  for (const c of CORRECTIONS) {
    if (c.fixedOn === null) {
      t.is(c.guard, null, `${c.id}: open rows cannot claim a guard that has not shipped`)
      t.is(c.gone, null, `${c.id}: open rows are still saying it`)
      t.is(daysLive(c), null, `${c.id}: an open row has no duration`)
      continue
    }
    t.truthy(c.guard, `${c.id}: a fixed row names the test that stops it recurring`)
    if (isPost(c)) {
      t.is(c.gone, null, `${c.id}: a post keeps its sentence, so nothing is banned from the source`)
    } else {
      t.truthy(c.gone, `${c.id}: a fixed row names the words that must not come back`)
    }
  }
})

test('a corrected post carries its correction note', (t) => {
  for (const c of CORRECTIONS) {
    if (!isPost(c) || c.fixedOn === null) continue
    for (const path of c.where) {
      const source = readFileSync(repoFile(`src/app${path}/page.tsx`), 'utf-8')
      t.true(source.includes('<Correction'), `${c.id}: ${path} has no correction note`)
    }
  }
})

test('every guard names a test file that exists', (t) => {
  for (const c of CORRECTIONS) {
    if (!c.guard) continue
    t.true(existsSync(repoFile(c.guard)), `${c.id}: ${c.guard} is not in the repository`)
  }
})

test('every row points at a page that exists', (t) => {
  for (const c of CORRECTIONS) {
    for (const path of c.where) {
      const page = path === '/' ? 'src/app/page.tsx' : `src/app${path}/page.tsx`
      t.true(existsSync(repoFile(page)), `${c.id}: ${path} has no page at ${page}`)
    }
  }
})

test('open rows come first, then fixed rows newest first', (t) => {
  const fixed = CORRECTIONS.map((c) => c.fixedOn)
  const firstFixed = fixed.findIndex((d) => d !== null)
  t.true(
    fixed.slice(firstFixed).every((d) => d !== null),
    'an open row is buried below a fixed one',
  )
  const dates = fixed.slice(firstFixed) as string[]
  for (let i = 1; i < dates.length; i++) {
    t.true(dates[i] <= dates[i - 1], `out of order at ${CORRECTIONS[firstFixed + i].id}`)
  }
})

// The suitedness row explains itself with a claim about our own chart: that the
// old example spanned two bands where the rule it illustrated says one. That is
// exactly the kind of sentence this whole page exists because of, so it does not
// get to sit in prose unchecked.
test('the suitedness row: KT spans two bands and AT spans one', (t) => {
  const gap = (suited: string, offsuit: string) =>
    BAND_ORDER.indexOf(HAND_BANDS[offsuit]) - BAND_ORDER.indexOf(HAND_BANDS[suited])
  t.is(HAND_BANDS.KTs, 'any')
  t.is(HAND_BANDS.KTo, 'late')
  t.is(gap('KTs', 'KTo'), 2)
  t.is(HAND_BANDS.ATs, 'any')
  t.is(HAND_BANDS.ATo, 'middle')
  t.is(gap('ATs', 'ATo'), 1)
})

test('the post is registered on the blog', (t) => {
  t.truthy(BLOG_POSTS.find((p) => p.slug === 'what-we-got-wrong'))
})

// Everything below walks the source. The registry quotes the false sentences and
// the post prints them, so those two are the only places they are allowed to be.
const EXEMPT = new Set(['src/config/corrections.ts', 'src/app/blog/what-we-got-wrong/page.tsx'])

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(repoFile(dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) sources(path, out)
    else if (/\.tsx?$/.test(entry.name) && !EXEMPT.has(path)) out.push(path)
  }
  return out
}

test('nothing we corrected is still being said', (t) => {
  const files = sources('src').map((path) => [path, readFileSync(repoFile(path), 'utf-8')] as const)
  for (const c of CORRECTIONS) {
    if (!c.gone) continue
    for (const [path, source] of files) {
      t.false(source.includes(c.gone), `${c.id}: "${c.gone}" is back, in ${path}`)
    }
  }
})
