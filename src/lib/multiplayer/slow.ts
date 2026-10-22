// Slow games: the rules a daily-style table adds to a room.
//
// A slow table is a private room whose turns are measured in hours. Two things
// here are its own:
//
// - **The move clock skips your quiet hours.** Your clock does not run while you
//   are asleep, so a one-hour clock cannot time you out overnight. The hours are
//   yours, in your own timezone, and a turn's deadline is worked out by walking
//   forward from when it began, counting only the time outside them. DST is
//   handled by asking `Intl` what the wall clock says, never by adding a day.
// - **Endings.** A slow game has to finish, so besides last one standing the
//   host can end it after a number of hands, or at a date, with the chips
//   deciding the places.
//
// Pure, like the reducer it serves: time comes in as numbers.

/** A player's quiet hours: minutes after local midnight, and the timezone they are in. */
export interface Quiet {
  /** Start, in minutes after midnight (0–1439). */
  from: number
  /** End, in minutes after midnight. Before `from` means the hours run past midnight. */
  to: number
  /** An IANA timezone, e.g. "Europe/London". */
  tz: string
}

export const DEFAULT_QUIET: Omit<Quiet, 'tz'> = { from: 23 * 60, to: 8 * 60 }

export const MOVE_HOURS = [1, 4, 12, 24] as const
export type MoveHours = (typeof MOVE_HOURS)[number]
export const DEFAULT_MOVE_HOURS: MoveHours = 12

export const SLOW_SEATS = [2, 3, 4] as const
export const DEFAULT_SLOW_SEATS = 2
export const ENDING_HANDS = [20, 50, 100] as const

export type SlowEnding =
  | { kind: 'last-standing' }
  | { kind: 'hands'; hands: (typeof ENDING_HANDS)[number] }
  /** The hand in play when `at` arrives is finished, then the chips decide. */
  | { kind: 'date'; at: number }

export const DEFAULT_ENDING: SlowEnding = { kind: 'last-standing' }

/** Open slow games one person may be in at once. */
export const MAX_SLOW_GAMES = 10

const MINUTE = 60_000
const DAY_MINUTES = 24 * 60

const formats = new Map<string, Intl.DateTimeFormat>()

function format(tz: string): Intl.DateTimeFormat {
  let f = formats.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formats.set(tz, f)
  }
  return f
}

/** Whether `tz` is a timezone this runtime knows. */
export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false
  try {
    format(tz)
    return true
  } catch {
    return false
  }
}

/** The wall clock in `tz` at `t`, as minutes after midnight. */
export function localMinute(t: number, tz: string): number {
  let hour = 0
  let minute = 0
  for (const part of format(tz).formatToParts(t)) {
    if (part.type === 'hour') hour = Number(part.value)
    if (part.type === 'minute') minute = Number(part.value)
  }
  return (hour % 24) * 60 + minute
}

function quietActive(q: Quiet | null | undefined): q is Quiet {
  return Boolean(q && q.from !== q.to && validTimeZone(q.tz))
}

/** Whether a wall-clock minute falls inside the quiet hours. */
function within(minute: number, q: Quiet): boolean {
  return q.from < q.to ? minute >= q.from && minute < q.to : minute >= q.from || minute < q.to
}

/** Whether somebody with these quiet hours is in them at `t`. */
export function inQuiet(t: number, q: Quiet | null | undefined): boolean {
  if (!quietActive(q)) return false
  return within(localMinute(t, q.tz), q)
}

/**
 * The first instant after `t` (or `t` itself) at which the wall clock in `tz`
 * reads `target`. Guessed from the minutes between, then corrected by however
 * far a DST change moved the clock; a time the change skips (01:30 on a
 * spring-forward night) lands just after the gap.
 */
function nextLocal(t: number, target: number, tz: string): number {
  // Whole minutes only, so the arithmetic below is on the clock's own grid.
  const start = Math.floor(t / MINUTE) * MINUTE
  const now = localMinute(start, tz)
  let guess = start + ((target - now + DAY_MINUTES) % DAY_MINUTES) * MINUTE
  for (let i = 0; i < 2; i++) {
    const off = target - localMinute(guess, tz)
    if (off === 0) break
    // Only ever a DST shift (an hour, at most two): anything larger is the
    // target falling in a skipped gap, which the first correction settles.
    const shift = ((off + DAY_MINUTES + DAY_MINUTES / 2) % DAY_MINUTES) - DAY_MINUTES / 2
    if (Math.abs(shift) > 120) break
    guess += shift * MINUTE
  }
  return Math.max(guess, t)
}

/**
 * When a move clock of `moveMs` started at `from` runs out, counting only the
 * time outside the mover's quiet hours.
 *
 * Walks the windows: inside quiet hours, jump to their end; outside, either the
 * clock runs out before the next quiet hours begin, or it uses the time up to
 * them and the walk goes on from there.
 */
export function slowDeadline(
  from: number,
  moveMs: number,
  quiet: Quiet | null | undefined,
): number {
  if (!quietActive(quiet)) return from + moveMs
  let t = from
  let left = moveMs
  // Each pass crosses at least one quiet stretch, a day apart at most; the
  // longest clock is a day, so a handful of passes is the whole walk.
  for (let i = 0; i < 16; i++) {
    if (within(localMinute(t, quiet.tz), quiet)) {
      const end = nextLocal(t, quiet.to, quiet.tz)
      t = end > t ? end : t + MINUTE
      continue
    }
    let next = nextLocal(t, quiet.from, quiet.tz)
    if (next <= t) next = nextLocal(t + MINUTE, quiet.from, quiet.tz)
    if (t + left <= next) return t + left
    left -= next - t
    t = next
  }
  return t + left
}

/**
 * Where everybody finishes when a game ends on the chips: the bigger stack
 * higher, and level stacks sharing a place. Players already out keep theirs.
 */
export function placesByChips(
  players: readonly { id: string; stack: number; place: number | null }[],
): Map<string, number> {
  const live = players.filter((p) => p.place === null).sort((a, b) => b.stack - a.stack)
  const out = new Map<string, number>()
  live.forEach((p, i) => {
    const prev = live[i - 1]
    out.set(p.id, prev && prev.stack === p.stack ? out.get(prev.id)! : i + 1)
  })
  return out
}

/** Whether a game with this ending is over once the hand just played has settled. */
export function endingReached(ending: SlowEnding, handsPlayed: number, now: number): boolean {
  if (ending.kind === 'hands') return handsPlayed >= ending.hands
  if (ending.kind === 'date') return now >= ending.at
  return false
}

/** A move made ahead of your turn, for the street it was set on. */
export type PreKind = 'check-fold' | 'check' | 'call'

export interface PreAction {
  kind: PreKind
  /** The hand and street it was set for. It lapses on any other. */
  hand: number
  street: string
  /** For a call: the chips it would cost when it was set. A different bet drops it. */
  amount?: number
}
