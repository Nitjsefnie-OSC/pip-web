import { readFileSync } from 'node:fs'
import test from 'ava'
import { rosterFor } from '@/config/cast'
import { HI_LO_TABLES, membershipForVenue } from '@/config/venues'
import { hiLoLine, hiLoSample } from '@/lib/membership/hiLoSample'
import { type Card, cardToString } from '@/lib/poker/cards'

// The Hi-Lo showdown on `/membership?for=hilo`. The cards are typed, so this
// holds what the page says about them to the two evaluators that settle a pot
// at The Split: their high, your low, and the two halves won with different
// pairs of your cards. If the rules ever settled it another way, the page
// would be teaching the wrong game.
//
// What this cannot cover: how four cards a side sit on a phone's felt, and
// whether the rings read. That needs somebody to open the page.

const keys = (cards: readonly Card[]) => new Set(cards.map(cardToString))
const fromHole = (hole: readonly Card[], plays: readonly Card[]) => {
  const held = keys(hole)
  return plays.filter((card) => held.has(cardToString(card))).map(cardToString)
}

test('the pot is cut in half: their high, your low', (t) => {
  const s = hiLoSample()
  t.is(s.highWinner, 'them')
  t.is(s.lowWinner, 'hero')
  t.is(s.them.highPhrase, 'three of a kind')
  t.is(s.hero.highPhrase, 'a pair')
  t.is(s.hero.lowPhrase, '7-5-3-2-A')
  t.is(s.them.lowPhrase, '8-7-5-4-2')
})

test('your two halves use different cards from your hand', (t) => {
  const s = hiLoSample()
  t.deepEqual(fromHole(s.hero.cards, s.hero.high).sort(), ['Qc', 'Qd'])
  t.deepEqual(fromHole(s.hero.cards, s.hero.low ?? []).sort(), ['3h', 'As'])
})

test('every five that plays is two from the hand and three from the board', (t) => {
  const s = hiLoSample()
  const board = keys(s.board)
  for (const plays of [s.hero.high, s.hero.low ?? [], s.them.high, s.them.low ?? []]) {
    t.is(plays.length, 5)
    t.is(plays.filter((c) => board.has(cardToString(c))).length, 3)
  }
})

test('no card is dealt twice', (t) => {
  const s = hiLoSample()
  const all = [...s.board, ...s.hero.cards, ...s.them.cards].map(cardToString)
  t.is(new Set(all).size, 13)
})

test('the line says what the evaluators decided', (t) => {
  t.is(
    hiLoLine(hiLoSample(), 'Theo'),
    'Theo takes the high half with three of a kind. Your ace and three make 7-5-3-2-A, the best low, and take the other half. Your queens win nothing.',
  )
})

test('the opponent is a regular at The Split', (t) => {
  t.truthy(rosterFor(HI_LO_TABLES[0])[0]?.name)
})

test('every Hi-Lo padlock asks for this showdown', (t) => {
  for (const room of HI_LO_TABLES) t.regex(membershipForVenue(room) ?? '', /for=hilo\b/)
})

test('only a tap on Hi-Lo loads the showdown, and only on the client', (t) => {
  const source = readFileSync(
    new URL('../src/components/membership/TappedFor.tsx', import.meta.url),
    'utf-8',
  )
  t.regex(source, /feature\.id === 'hilo' && <TappedHiLo \/>/)
  t.regex(source, /import\('\.\/TappedHiLo'\)[\s\S]*?ssr: false/)
})
