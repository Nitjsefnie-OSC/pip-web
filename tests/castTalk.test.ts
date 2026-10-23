import test from 'ava'

// Install storage before importing the stores, as in ladderSeats.test.ts.
const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  },
})

const { useGame } = await import('@/store/game')
const { useProfile } = await import('@/store/profile')
const { characterById } = await import('@/config/cast')
const { DEFAULT_CUSTOM, customVenue } = await import('@/config/customTable')

test.serial('Jun’s added seat lines can reach the table after sitting down again', (t) => {
  const added = characterById('jun')!.lines.seat.slice(2)
  const venue = customVenue({ ...DEFAULT_CUSTOM, seats: 3, castIds: ['carlos', 'jun'] })
  const human = {
    name: 'Hero',
    avatar: { seed: 'hero', backgroundColor: 'b6e3f4' },
    member: true,
  }
  const random = Math.random
  const tableTalk = useProfile.getState().tableTalk
  try {
    useProfile.getState().setTableTalk(true)
    // The constant stream passes the 0.6 gate and selects index 2 of four lines.
    Math.random = () => 0.59
    // sitDown resets the four-hand cooldown, including any earlier test’s talk.
    for (let visit = 0; visit < 2; visit++) {
      useGame.getState().sitDown(venue, human)
      t.deepEqual(
        useGame
          .getState()
          .seats.filter((s) => !s.isHuman)
          .map((s) => s.characterId),
        ['carlos', 'jun'],
      )
      t.true(added.includes(useGame.getState().talk ?? ''), 'an added seat line was not emitted')
      useGame.getState().leave()
    }
  } finally {
    useGame.getState().leave()
    Math.random = random
    useProfile.getState().setTableTalk(tableTalk)
  }
})
