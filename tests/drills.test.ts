import { readFileSync, readdirSync } from 'node:fs'
import test from 'ava'
import { DRILL_KINDS, drillKind } from '@/config/drills'
import { MAX_ATTEMPTS, drillAt, gradeDrill, nextDrill } from '@/lib/drills'
import type { Drill, RejectReason } from '@/lib/drills/types'
import { cardToString } from '@/lib/poker/cards'
import { determineWinners, evaluateHand } from '@/lib/poker/handEval'

// A drill grades a stranger, in public, on a page that is free and unmetered.
// The engine settling it is exact, so anything wrong here is wrong in the layer
// above it: the spot that was dealt, the sentence under the answer, or the
// filter that decides which spots are worth asking. That is what this file is
// for. Fixed seeds in, fixed grades out, and the properties that have to hold
// across a large sample rather than on three hand-picked spots.

const KIND = 'which-hand-wins'

/** Every accepted spot in a range of seeds. */
function accepted(from: number, count: number): Drill[] {
  const drills: Drill[] = []
  for (let seed = from; seed < from + count; seed++) {
    const { drill } = drillAt(KIND, seed)
    if (drill) drills.push(drill)
  }
  return drills
}

const cards = (drill: Drill, id: string) => drill.choices.find((c) => c.id === id)?.cards ?? []

test('the same seed is the same spot, forever', (t) => {
  for (const seed of [1, 36, 1_000, 4_294_967_295]) {
    t.deepEqual(drillAt(KIND, seed), drillAt(KIND, seed), `seed ${seed}`)
  }
})

// The pinned spots. Not a golden file for its own sake: these are the four
// shapes the sentence has to get right (a category beating another, a card
// settling two of the same hand, a kicker settling two identical hands, and a
// split), and if the generator or the wording moves they say so here rather
// than on the page.
const PINNED: { seed: number; answer: string; explanation: string }[] = [
  {
    seed: 36,
    answer: 'b',
    explanation: 'Hand B takes it: three of a kind beats two pair.',
  },
  {
    seed: 7,
    answer: 'b',
    explanation: 'Hand B takes it: both make a pair, and the six outranks the four.',
  },
  {
    seed: 27,
    answer: 'a',
    explanation: 'Hand A takes it: both make a pair, and the king outkicks the nine.',
  },
  {
    seed: 39,
    answer: 'split',
    explanation: 'Both make two pair, and neither is higher, so the pot is split.',
  },
  {
    seed: 4,
    answer: 'a',
    explanation: 'Hand A takes it: neither hand makes a pair, and the ace outkicks the jack.',
  },
]

test('fixed seeds grade the same way every run', (t) => {
  for (const pin of PINNED) {
    const { drill } = drillAt(KIND, pin.seed)
    if (!drill) {
      t.fail(`seed ${pin.seed} no longer generates a spot`)
      continue
    }
    t.is(drill.answer, pin.answer, `seed ${pin.seed}: answer`)
    t.is(drill.explanation, pin.explanation, `seed ${pin.seed}: explanation`)
    t.true(gradeDrill(drill, pin.answer).correct, `seed ${pin.seed}: grade`)
  }
})

// The one that matters most. The grade is settled at generation time, so this
// re-runs the evaluator over the cards the drill actually dealt and checks the
// two agree. If they ever don't, a player is being marked wrong for being
// right, which is the failure this drill exists to be incapable of.
test('every answer agrees with the evaluator, recomputed from the dealt cards', (t) => {
  const drills = accepted(1, 3_000)
  t.true(drills.length > 2_000, 'sample too small to mean anything')
  for (const drill of drills) {
    const { winners } = determineWinners(
      [
        { id: 'a', hole: cards(drill, 'a') },
        { id: 'b', hole: cards(drill, 'b') },
      ],
      drill.board,
    )
    const expected = winners.length > 1 ? 'split' : winners[0]
    t.is(drill.answer, expected, `seed ${drill.seed}`)
  }
})

test('the grader accepts the answer and nothing else', (t) => {
  for (const drill of accepted(50_000, 500)) {
    for (const choice of drill.choices) {
      const grade = gradeDrill(drill, choice.id)
      t.is(grade.correct, choice.id === drill.answer, `seed ${drill.seed}: ${choice.id}`)
      t.is(grade.answer, drill.answer)
      t.is(grade.explanation, drill.explanation)
    }
  }
})

test('the reveal marks every winning hand, and a split marks all three', (t) => {
  for (const drill of accepted(1, 2_000)) {
    const winning = drill.choices.filter((choice) => choice.winning).map((choice) => choice.id)
    if (drill.answer === 'split') {
      t.deepEqual(winning.sort(), ['a', 'b', 'split'], `seed ${drill.seed}`)
    } else {
      t.deepEqual(winning, [drill.answer], `seed ${drill.seed}`)
    }
  }
})

test('every spot deals nine distinct cards and plays five of each seven', (t) => {
  for (const drill of accepted(1, 2_000)) {
    t.is(drill.board.length, 5, `seed ${drill.seed}: board`)
    const all = [...drill.board, ...cards(drill, 'a'), ...cards(drill, 'b')].map(cardToString)
    t.is(new Set(all).size, 9, `seed ${drill.seed}: a card is dealt twice`)
    for (const id of ['a', 'b']) {
      const choice = drill.choices.find((c) => c.id === id)
      const seven = new Set([...drill.board, ...cards(drill, id)].map(cardToString))
      t.is(choice?.cards.length, 2, `seed ${drill.seed}: ${id} hole`)
      t.is(choice?.plays?.length, 5, `seed ${drill.seed}: ${id} best five`)
      for (const card of choice?.plays ?? []) {
        t.true(seven.has(cardToString(card)), `seed ${drill.seed}: ${id} plays a card it lacks`)
      }
    }
  }
})

// The explanation is the part a reader is asked to trust, so it is checked
// against the grade rather than only for being non-empty.
test('no explanation names a hand other than the one that won', (t) => {
  for (const drill of accepted(1, 3_000)) {
    const { explanation, answer, seed } = drill
    t.true(explanation.endsWith('.'), `seed ${seed}: not a sentence`)
    if (answer === 'split') {
      t.true(explanation.includes('split'), `seed ${seed}: ${explanation}`)
      t.false(explanation.includes('takes it'), `seed ${seed}: ${explanation}`)
    } else {
      const winner = answer === 'a' ? 'Hand A' : 'Hand B'
      const loser = answer === 'a' ? 'Hand B' : 'Hand A'
      t.true(explanation.startsWith(`${winner} takes it:`), `seed ${seed}: ${explanation}`)
      t.false(explanation.includes(loser), `seed ${seed}: ${explanation}`)
    }
  }
})

// Generation is a filtered stream rather than a raw one. Both halves of that
// are worth holding: the filter has to actually reject, and the reason it
// rejects for has to stay the one we meant.
test('the filter throws away one-sided spots, and only those', (t) => {
  const counts: Record<RejectReason, number> = { 'one-sided': 0, unexplainable: 0 }
  let kept = 0
  for (let seed = 1; seed <= 5_000; seed++) {
    const { drill, rejected } = drillAt(KIND, seed)
    if (drill) kept++
    else if (rejected) counts[rejected]++
  }
  t.true(counts['one-sided'] > 100, `the filter is not biting: ${counts['one-sided']} rejected`)
  t.true(kept > counts['one-sided'], 'more spots are thrown away than kept')
  // Not a tuning knob. This fires when the sentence and the grade came from
  // different readings of the same hand, which would mean the drill had gone
  // quiet about spots it cannot explain instead of us hearing about it.
  t.is(counts.unexplainable, 0, 'a spot could not be explained from its own evaluation')
})

// What "one-sided" means, checked from the outside rather than from the
// constant that implements it: a flush against a pair is a look, not a
// question, and it should not survive the filter.
test('the accepted spots are within one hand category of each other', (t) => {
  for (const drill of accepted(1, 2_000)) {
    const [a, b] = ['a', 'b'].map((id) => evaluateHand(cards(drill, id), drill.board))
    t.true(
      Math.abs(a.categoryRank - b.categoryRank) <= 1,
      `seed ${drill.seed}: ${a.name} v ${b.name}`,
    )
    for (const id of ['a', 'b']) {
      t.true(
        (drill.choices.find((c) => c.id === id)?.detail ?? '').length > 0,
        `seed ${drill.seed}`,
      )
    }
  }
})

test('the stream always finds a spot, and quickly', (t) => {
  let worst = 0
  for (let seed = 1; seed <= 2_000; seed++) {
    let attempts = 1
    while (!drillAt(KIND, seed + attempts - 1).drill) attempts++
    worst = Math.max(worst, attempts)
    t.is(nextDrill(KIND, seed).seed, seed + attempts - 1)
  }
  // Far under MAX_ATTEMPTS, and stated as a number so that a generator which
  // starts rejecting nearly everything fails here rather than in a browser.
  t.true(worst < 25, `worst run of rejections was ${worst}`)
  t.true(MAX_ATTEMPTS > worst * 10)
})

test('every registered kind has a first spot that generates', (t) => {
  for (const kind of DRILL_KINDS) {
    t.is(drillKind(kind.id), kind)
    t.regex(kind.id, /^[a-z0-9-]+$/)
    t.true(kind.title.length > 0 && kind.blurb.length > 0 && kind.question.length > 0)
    t.true(kind.gradedBy.length > 0)
    // The spot the screen is prerendered with. It has to be there when the app
    // is built, and it has to be the seed the registry names rather than the
    // next one the filter happened to accept, or the prerendered cards and the
    // hydrated cards disagree.
    t.is(nextDrill(kind.id, kind.firstSeed).seed, kind.firstSeed)
  }
})

// The kinds are one route, /game/drills/[kind], enumerated from the registry
// rather than a folder each. So the thing worth holding is the other way round
// from the old one: the route exists, it is inside the app, and there is no
// drill left out on the website.
test('drills are app routes, and only app routes', (t) => {
  t.true(readdirSync(new URL('../src/app/game/drills', import.meta.url)).includes('[kind]'))
  t.throws(() => readdirSync(new URL('../src/app/drills', import.meta.url)), {
    code: 'ENOENT',
  })
})

// The free kind is free forever and unmetered by ruling (technology#38), and
// the way that erodes is not a decision, it is a counter added for a good
// reason. Nothing in the drill engine or its runner may read or write storage,
// or reach for the persisted profile.
test('nothing in the drills layer counts anything or remembers anything', (t) => {
  const sources = [
    ...readdirSync(new URL('../src/lib/drills', import.meta.url)).map((f) => `src/lib/drills/${f}`),
    ...readdirSync(new URL('../src/components/drills', import.meta.url)).map(
      (f) => `src/components/drills/${f}`,
    ),
  ]
  t.true(sources.length >= 4)
  for (const path of sources) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8')
    t.notRegex(source, /localStorage|sessionStorage|indexedDB/, `${path}: storage`)
    t.notRegex(source, /@\/store\//, `${path}: reaches for a store`)
  }
})
