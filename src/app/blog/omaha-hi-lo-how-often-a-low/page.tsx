import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, Src } from '@/components/marketing/LegalPage'
import { BLOG_POSTS, formatPostDate, postMetadata } from '@/config/blog'
import {
  ACE_DEUCE_DEALS,
  ACE_DEUCE_LOWS,
  BOARDS,
  LOW_BOARDS,
  ONE_HAND_DEALS,
  ONE_HAND_LOW_BOARD_DEALS,
  ONE_HAND_LOWS,
  TABLE_SAMPLE,
} from '@/config/hiLoCounts'
import { membershipFor } from '@/config/membership'

const post = BLOG_POSTS.find((p) => p.slug === 'omaha-hi-lo-how-often-a-low')!

export const metadata: Metadata = postMetadata(post)

const linkClass =
  'font-medium text-foreground underline decoration-foreground/25 underline-offset-2 transition hover:decoration-foreground'

const n = (count: number) => count.toLocaleString('en-GB')

const HANDS = ['One hand', 'Two', 'Three', 'Four', 'Five', 'Six']

export default function OmahaHiLoLowPost() {
  return (
    <LegalPage
      title={post.title}
      subtitle={formatPostDate(post.date)}
      back={{ href: '/blog', label: 'All posts' }}
    >
      <Section title="Half the pot, if there is a half">
        <p>
          In Omaha Hi-Lo every pot is cut in two. The best hand takes one half. The best low takes
          the other: five cards of different ranks, all eight or lower, the ace counting as one, and
          still exactly two from your hand with three from the board. If nobody makes a low, the
          high hand takes the lot.
        </p>
        <p>
          The description of The Split, Pip’s Hi-Lo table, says nobody makes one about half the
          time. That is the kind of sentence that gets written once and never checked, so we checked
          it.
        </p>
      </Section>

      <Section title="The board decides first">
        <p>
          You have to use three board cards for a low, and they have to be three different ranks
          from ace to eight. A board without them has no low on it for anybody, whatever they hold.
        </p>
        <p>
          Of the {n(BOARDS)} possible boards, {n(LOW_BOARDS)} have three. That is six boards in ten.
          On the other four, the low half of the game does not happen.
        </p>
      </Section>

      <Section title="One hand">
        <p>
          Then you need two cards of your own, eight or lower, that are not the same ranks as the
          three you use from the board. Deal one four-card hand and a board every way it can be
          dealt, {n(ONE_HAND_DEALS)} ways, and the hand makes a low in {n(ONE_HAND_LOWS)} of them. A
          little over one in three.
        </p>
        <p>
          Even on a board that allows a low, one hand gets there in {n(ONE_HAND_LOWS)} of{' '}
          {n(ONE_HAND_LOW_BOARD_DEALS)}. Not quite six in ten.
        </p>
      </Section>

      <Section title="Ace-deuce, and the deuce on the board">
        <p>
          Ace-deuce is the low every Hi-Lo player wants to be dealt. Hands holding an ace and a
          deuce make a low in {n(ACE_DEUCE_LOWS)} of {n(ACE_DEUCE_DEALS)} deals. A little under
          half.
        </p>
        <p>
          The board does most of that. It still needs three different low cards, and they have to be
          ranks you are not already using. You hold A♠ 2♠ K♦ K♣ and the board comes 2♥ 5♦ 7♣ J♥ Q♠.
          Three low ranks, so a low is possible. Not for you: your low cards are an ace and a deuce,
          the board’s are a deuce, a five and a seven, and five different ranks cannot be made from
          those. Players call that being counterfeited.
        </p>
        <p>Make the 2♥ a 3♥ and the same four cards make 7-5-3-2-A.</p>
      </Section>

      <Section title="More hands, more lows">
        <p>
          The question the table cares about is whether <em>anybody</em> makes one, and that depends
          on how many hands get to the end. We dealt {n(TABLE_SAMPLE.deals)} deals of six hands and
          a board, everybody staying to the river, and counted the deals where at least one of the
          first one, two, three hands and so on had a low:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {TABLE_SAMPLE.someoneLow.map((count, i) => (
            <li key={HANDS[i]}>
              {HANDS[i]}: {n(count)}
            </li>
          ))}
        </ul>
        <p>
          The first row is a sample of the exact one-in-three above, and lands close to it. Two
          hands make a low half the time, so “about half” is right heads-up. With six, somebody has
          one in six deals of ten, and the number cannot climb much further: it is already pressed
          against the boards that allow one at all. A real table sits somewhere in between, because
          people fold.
        </p>
      </Section>

      <Section title="How we counted">
        <p>
          A low only cares about which ranks from ace to eight are where, so the exact counts are
          worked out by rank rather than card by card, which takes under a second.{' '}
          <Src path="tests/hiLoCounts.test.ts" /> does it on every run and checks that shortcut
          against <Src path="src/lib/poker/hiLo.ts" />, the evaluator that settles the low half at
          The Split, on twenty thousand dealt hands.
        </p>
        <p>
          The six-hand rows are a sample, run through that same evaluator with seed{' '}
          {TABLE_SAMPLE.seed}. A million deals take two minutes, too long for the test suite, so
          they are typed into <Src path="src/config/hiLoCounts.ts" /> and not re-run.
        </p>
      </Section>

      <Section title="Where it is">
        <p>
          The Split is one of the side tables in the{' '}
          <Link href={`${membershipFor('hilo')}&from=blog`} className={linkClass}>
            membership
          </Link>
          , at two stakes. A tap on it there deals a showdown where three kings take the high half,
          an ace and a three take the low, and a pair of queens wins nothing. The ladder, the Rail,
          the Daily and the freeroll stay free. So did the counting.
        </p>
      </Section>
    </LegalPage>
  )
}
