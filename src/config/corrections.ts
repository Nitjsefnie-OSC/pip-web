// Every factual claim Pip has published and then got wrong.
//
// This is a registry rather than prose in a page for the same reason the
// starting-hand figures are: a list of our own errors that is maintained by
// hand is a list that stops being maintained, and a corrections list that
// stops being updated is worse than none, because it then implies we stopped
// making errors.
//
// The rule for adding a row: it goes here when a claim that *served to a
// visitor* turned out to be false. Not a typo, not a rewording, not something
// caught in review before it shipped. `liveFrom` is the day the false version
// first served and `fixedOn` is the day the correction served, both of which
// are merge dates, because on this repository a merge is the deploy. The gap
// between writing a fix and shipping it is part of what this page is admitting
// to, so neither date is the day somebody noticed.
//
// `gone` is the load-bearing field. It is a fragment of the false sentence
// chosen so that it appears nowhere on the site any more, and corrections.test.ts
// fails if it comes back. Pick it from the part that was actually wrong: the
// rarity claim, for instance, still contains "holds exactly, all the way down
// the list" in its corrected form, and what was wrong was saying it without
// "on five cards" in front.

export interface Correction {
  /** Stable handle. Used as the anchor and the test's failure message. */
  id: string
  /** Where it served, as paths on the site. */
  where: readonly string[]
  /** The claim, quoted. */
  said: string
  /** Why it was false, in one sentence. */
  wrong: string
  /** ISO date the false version first served. */
  liveFrom: string
  /** Set when `liveFrom` is an estimate rather than a merge we can point at. */
  liveFromNote?: string
  /** ISO date the correction served. Null while it is still wrong. */
  fixedOn: string | null
  /** How it was found. Never "a test", because no test has ever found one. */
  caught: string
  /**
   * A fragment of the false sentence that must not appear in the site's source
   * again. Null only while the claim is still live.
   */
  gone: string | null
  /** The test that fails if it comes back, as a path in this repository. */
  guard: string | null
}

/** Open first, then fixed, newest correction first. Pinned by the test. */
export const CORRECTIONS: readonly Correction[] = [
  {
    id: 'privacy-account-section',
    where: ['/privacy'],
    said: 'Sync is "off unless you turn it on, in Settings, under Account".',
    wrong:
      'The build serving playpip.io was made without its database configuration, so the app decides at load time that accounts are unavailable and removes every account surface from itself. There is no Account section in Settings to turn anything on with, and nobody can sign in.',
    liveFrom: '2026-08-03',
    liveFromNote:
      'We cannot date the start. The bundle currently served is from 23 August; whether earlier builds carried the configuration is not something we can see from outside. 3 August is the day accounts shipped, which is the worst case.',
    fixedOn: null,
    caught:
      'A check that downloads the JavaScript playpip.io actually serves and reads the configuration out of it. Every test passed and every build was green throughout: the fault is in the machine that builds the site, not in the code, so nothing in the repository disagreed with anything else in the repository.',
    gone: null,
    guard: null,
  },
  {
    id: 'data-never-leaves',
    where: ['/', '/terms', '/play-poker-free-no-signup'],
    said: 'Fully local. Install it, pull the plug, keep playing - your profile never leaves your device.',
    wrong:
      'Optional accounts shipped on 3 August. From that morning the sentence was true only of somebody who had never switched sync on, and it was written in the absolute on the same page that offers to back your progress up to every device, four sections further down.',
    liveFrom: '2026-08-03',
    fixedOn: '2026-08-23',
    caught: 'Reading the landing page from top to bottom against the product.',
    gone: 'your profile never leaves your',
    guard: 'tests/dataClaims.test.ts',
  },
  {
    id: 'blog-no-accounts',
    where: ['/blog/pip-is-live', '/blog/launch-week'],
    said: 'Both posts said Pip has no accounts and nothing behind them.',
    wrong:
      'True on 25 July and false from 3 August. A blog post is a dated record, so these were not rewritten: each now carries a correction note under the title saying what changed and when.',
    liveFrom: '2026-08-03',
    fixedOn: '2026-08-23',
    caught:
      'Sweeping the blog for the same fact after the three pages above were found. The sweep that found those had only looked at the pages, not the posts.',
    gone: null,
    guard: 'tests/blogClaims.test.ts',
  },
  {
    id: 'blog-markdown-mirror-count',
    where: ['/blog/agent-readable'],
    said: 'Six content pages serve a plain-text version, and the learn guides are among those that do not.',
    wrong:
      'Six was right on 26 July and wrong from 5 August, when the learn guides got mirrors of their own. By the time anyone read it the count was ten and the guides were the largest set of mirrors on the site, which is the opposite of what the sentence said.',
    liveFrom: '2026-08-05',
    fixedOn: '2026-08-23',
    caught: 'The same blog sweep. Counted the directory rather than trusting the sentence.',
    gone: null,
    guard: 'tests/blogClaims.test.ts',
  },
  {
    id: 'bet-sizing-columns',
    where: ['/learn/bet-sizing'],
    said: 'The two columns move in opposite directions and that is the whole trade.',
    wrong:
      'They climb together. Bet bigger and the price your opponent is getting gets worse and the equity they need goes up: both numbers rise. The trade is real, but it is about who each column costs, not about them pulling apart.',
    liveFrom: '2026-08-11',
    fixedOn: '2026-08-14',
    caught:
      'Reading the sentence against the table directly beneath it. Every number in that table was correct, and had been all along.',
    gone: 'move in opposite directions',
    guard: 'tests/guideClaims.test.ts',
  },
  {
    id: 'rarity-holds-all-the-way',
    where: ['/learn/hand-rankings'],
    said: 'Every hand beats the one below it because it is rarer than the one below it, and that holds exactly, all the way down the list.',
    wrong:
      'It holds on five cards. Deal seven and it breaks in exactly one place, at the bottom: across seven cards, missing every pair is harder than hitting one, so high card is rarer than one pair. The page had a table of seven-card frequencies showing exactly that, immediately below the sentence.',
    liveFrom: '2026-08-05',
    fixedOn: '2026-08-14',
    caught: 'Reading the sentence against the table directly beneath it.',
    gone: ', and that holds exactly',
    guard: 'tests/guideClaims.test.ts',
  },
  {
    id: 'suitedness-one-band',
    where: ['/learn/starting-hands'],
    said: 'Being suited is enough to move a hand one band on the chart, which is exactly what it does: KTs is playable from anywhere and KTo waits for the button.',
    wrong:
      'The example moved two bands, not one. On our own chart KTs opens from any seat and KTo is a late-position hand, with the middle band in between. ATs and ATo are the pair that move exactly one, and suitedness is usually rather than always worth a band.',
    liveFrom: '2026-08-09',
    fixedOn: '2026-08-10',
    caught: 'Checking the example against the chart on the same page.',
    gone: 'KTs is playable from anywhere',
    guard: 'tests/guideClaims.test.ts',
  },
]

/** Whole days a claim served, `null` while it is still serving. */
export function daysLive(correction: Correction): number | null {
  if (!correction.fixedOn) return null
  const from = Date.parse(`${correction.liveFrom}T00:00:00Z`)
  const to = Date.parse(`${correction.fixedOn}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}
